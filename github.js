// github.js - GitHub Repository Integration Module

// Internal state for the currently loaded repository
const LAB_REPO = {
  owner: null,
  repo: null,
  branch: null,
  files: {} // path -> content
};

/**
 * Parses a GitHub URL to extract the owner and repository name.
 * @param {string} url - The GitHub repository URL (e.g., https://github.com/owner/repo).
 * @returns {{owner: string, repo: string}} An object containing the owner and repository name.
 * @throws {Error} If the URL is invalid or does not match the expected GitHub repository format.
 */
export function parseGitHubUrl(url) {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL format. Expected: https://github.com/{owner}/{repo}");
    }
    const owner = parts[0];
    const repo = parts[1];
    return { owner, repo };
  } catch (error) {
    throw new Error(`Failed to parse GitHub URL: ${error.message}`);
  }
}

/**
 * Fetches the Git tree for a given repository and branch.
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @param {string} [branch="main"] - The branch name.
 * @param {string} [token=null] - Optional GitHub Personal Access Token for authentication/rate limits.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of tree entries ({ path, type, sha, size, url }).
 * @throws {Error} If the API request fails.
 */
export async function getRepoTree(owner, repo, branch = "main", token = null) {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers = {
    "Accept": "application/vnd.github+json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(treeUrl, { headers });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`Failed to get repository tree for ${owner}/${repo}@${branch}: ${res.status} - ${errorData.message || res.statusText}`);
    }

    const data = await res.json();
    return data.tree; // array of { path, type, sha, size, url }
  } catch (error) {
    console.error("Error in getRepoTree:", error);
    throw error;
  }
}

/**
 * Fetches the raw content of a single file from GitHub.
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @param {string} path - The path to the file within the repository.
 * @param {string} [branch="main"] - The branch name.
 * @returns {Promise<string>} A promise that resolves to the raw content of the file.
 * @throws {Error} If the file cannot be fetched.
 */
export async function fetchRawFileContent(owner, repo, path, branch = "main") {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  try {
    const fileRes = await fetch(rawUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch file content for ${path}: ${fileRes.status} ${fileRes.statusText}`);
    }
    return await fileRes.text();
  } catch (error) {
    console.error(`Error fetching raw file content for ${owner}/${repo}/${path}:`, error);
    throw error;
  }
}

/**
 * Fetches the content of all files in a repository's tree.
 * This function uses `fetchRawFileContent` for individual file fetching.
 * @param {string} owner - The repository owner.
 * @param {string} repo - The repository name.
 * @param {string} [branch="main"] - The branch name.
 * @param {string} [token=null] - Optional GitHub Personal Access Token.
 * @returns {Promise<Object.<string, string>>} A promise that resolves to an object where keys are file paths and values are file contents.
 * @throws {Error} If fetching the tree or any file content fails.
 */
export async function fetchRepo(owner, repo, branch = "main", token = null) {
  const tree = await getRepoTree(owner, repo, branch, token);

  // Keep only files (blobs)
  const fileEntries = tree.filter(item => item.type === "blob");

  const repoData = {}; // { "path/to/file": "CONTENT" }
  const fetchPromises = fileEntries.map(async (entry) => {
    try {
      const content = await fetchRawFileContent(owner, repo, entry.path, branch);
      repoData[entry.path] = content;
    } catch (error) {
      // Log the error but try to continue with other files if possible
      console.warn(`Skipping file ${entry.path} due to error: ${error.message}`);
    }
  });

  // Wait for all file fetches to complete
  await Promise.all(fetchPromises);

  return repoData; // full mirror
}

/**
 * Scrapes a GitHub repository into the internal LAB_REPO state.
 * This is the primary function to call from the UI.
 * @param {string} url - The GitHub repository URL.
 * @param {string} [branch="main"] - The branch name.
 * @param {string} [token=null] - Optional GitHub Personal Access Token.
 * @returns {Promise<void>} A promise that resolves when the repository is scraped and LAB_REPO is updated.
 * @throws {Error} If any step in the scraping process fails.
 */
export async function scrapeIntoLab(url, branch = "main", token = null) {
  try {
    const { owner, repo } = parseGitHubUrl(url);
    const files = await fetchRepo(owner, repo, branch, token);

    LAB_REPO.owner = owner;
    LAB_REPO.repo = repo;
    LAB_REPO.branch = branch;
    LAB_REPO.files = files;

    console.log("LAB_REPO READY", LAB_REPO);
  } catch (error) {
    console.error("Error in scrapeIntoLab:", error);
    throw error;
  }
}

/**
 * Reads the content of a file from the currently loaded LAB_REPO.
 * @param {string} path - The path of the file to read.
 * @returns {string} The content of the file.
 * @throws {Error} If the file is not found in the loaded repository.
 */
export function readFile(path) {
  if (!(path in LAB_REPO.files)) {
    throw new Error("FILE NOT FOUND in loaded repository: " + path);
  }
  return LAB_REPO.files[path];
}

/**
 * Retrieves the list of file paths from the currently loaded LAB_REPO.
 * @returns {string[]} An array of file paths, sorted alphabetically.
 */
export function getLoadedFilePaths() {
  return Object.keys(LAB_REPO.files).sort();
}

/**
 * Retrieves a copy of the current LAB_REPO state.
 * @returns {Object} A deep copy of the LAB_REPO object to prevent external modification.
 */
export function getLabRepoState() {
  return JSON.parse(JSON.stringify(LAB_REPO));
}

/**
 * Clears the internal LAB_REPO state.
 */
export function clearLabRepoState() {
  LAB_REPO.owner = null;
  LAB_REPO.repo = null;
  LAB_REPO.branch = null;
  LAB_REPO.files = {};
  console.log("LAB_REPO state cleared.");
}
