/**
 * arXiv API Helper
 *
 * Provides search and metadata extraction from arXiv.org
 * arXiv is a free distribution service for scholarly articles
 *
 * API Documentation: https://info.arxiv.org/help/api/index.html
 */

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';

/**
 * Parse arXiv Atom feed XML response
 * @param {string} xmlText - XML response from arXiv API
 * @returns {Array} Parsed entries
 */
function parseArxivXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const entries = xmlDoc.getElementsByTagName('entry');
  const results = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    const getTagText = (tagName) => {
      const el = entry.getElementsByTagName(tagName)[0];
      return el ? el.textContent.trim() : '';
    };

    const getAllTags = (tagName) => {
      const elements = entry.getElementsByTagName(tagName);
      const values = [];
      for (let j = 0; j < elements.length; j++) {
        values.push(elements[j].textContent.trim());
      }
      return values;
    };

    // Extract authors
    const authors = [];
    const authorElements = entry.getElementsByTagName('author');
    for (let j = 0; j < authorElements.length; j++) {
      const nameEl = authorElements[j].getElementsByTagName('name')[0];
      if (nameEl) {
        authors.push(nameEl.textContent.trim());
      }
    }

    // Extract ID and create arXiv ID
    const id = getTagText('id');
    const arxivId = id.split('/abs/')[1] || id;

    results.push({
      id: arxivId,
      title: getTagText('title'),
      summary: getTagText('summary'),
      authors,
      published: getTagText('published'),
      updated: getTagText('updated'),
      categories: getAllTags('category').map(cat => {
        // Extract term attribute if available
        const catElements = entry.getElementsByTagName('category');
        for (let k = 0; k < catElements.length; k++) {
          return catElements[k].getAttribute('term') || cat;
        }
        return cat;
      }).filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
      pdfUrl: `http://arxiv.org/pdf/${arxivId}.pdf`,
      absUrl: `http://arxiv.org/abs/${arxivId}`,
      comment: getTagText('arxiv:comment'),
      journalRef: getTagText('arxiv:journal_ref'),
      doi: getTagText('arxiv:doi')
    });
  }

  return results;
}

/**
 * Search arXiv papers
 * @param {string} query - Search query (supports arXiv query syntax)
 * @param {Object} options - Search options
 * @param {number} options.maxResults - Maximum number of results (default: 10, max: 100)
 * @param {string} options.sortBy - Sort by: 'relevance', 'lastUpdatedDate', 'submittedDate' (default: 'relevance')
 * @param {string} options.sortOrder - Sort order: 'ascending', 'descending' (default: 'descending')
 * @returns {Promise<Array>} Array of paper metadata
 */
export async function searchArxiv(query, options = {}) {
  const {
    maxResults = 10,
    sortBy = 'relevance',
    sortOrder = 'descending'
  } = options;

  const params = new URLSearchParams({
    search_query: query,
    max_results: Math.min(maxResults, 100).toString(),
    sortBy,
    sortOrder
  });

  try {
    const response = await fetch(`${ARXIV_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const results = parseArxivXML(xmlText);

    return results;
  } catch (error) {
    console.error('[arXiv] Search error:', error);
    throw error;
  }
}

/**
 * Get paper by arXiv ID
 * @param {string} arxivId - arXiv ID (e.g., '2301.12345' or 'cs/0601001')
 * @returns {Promise<Object>} Paper metadata
 */
export async function getArxivPaper(arxivId) {
  const params = new URLSearchParams({
    id_list: arxivId
  });

  try {
    const response = await fetch(`${ARXIV_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const results = parseArxivXML(xmlText);

    if (results.length === 0) {
      return {
        found: false,
        id: arxivId,
        error: 'Paper not found'
      };
    }

    return {
      found: true,
      ...results[0]
    };
  } catch (error) {
    console.error('[arXiv] Get paper error:', error);
    throw error;
  }
}

/**
 * Search by author
 * @param {string} authorName - Author name
 * @param {number} maxResults - Maximum results (default: 10)
 * @returns {Promise<Array>} Papers by author
 */
export async function searchByAuthor(authorName, maxResults = 10) {
  const query = `au:${authorName}`;
  return searchArxiv(query, { maxResults, sortBy: 'submittedDate' });
}

/**
 * Search by title
 * @param {string} title - Paper title or keywords
 * @param {number} maxResults - Maximum results (default: 10)
 * @returns {Promise<Array>} Papers matching title
 */
export async function searchByTitle(title, maxResults = 10) {
  const query = `ti:${title}`;
  return searchArxiv(query, { maxResults });
}

/**
 * Search by category
 * @param {string} category - arXiv category (e.g., 'cs.AI', 'math.NT', 'physics.optics')
 * @param {number} maxResults - Maximum results (default: 10)
 * @returns {Promise<Array>} Recent papers in category
 */
export async function searchByCategory(category, maxResults = 10) {
  const query = `cat:${category}`;
  return searchArxiv(query, { maxResults, sortBy: 'submittedDate' });
}

/**
 * Search recent papers (last week)
 * @param {string} category - Optional category filter
 * @param {number} maxResults - Maximum results (default: 20)
 * @returns {Promise<Array>} Recent papers
 */
export async function getRecentPapers(category = null, maxResults = 20) {
  const query = category ? `cat:${category}` : 'all';
  return searchArxiv(query, {
    maxResults,
    sortBy: 'submittedDate',
    sortOrder: 'descending'
  });
}

/**
 * Advanced search with multiple criteria
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.title - Title keywords
 * @param {string} criteria.author - Author name
 * @param {string} criteria.abstract - Abstract keywords
 * @param {string} criteria.category - Category
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Search results
 */
export async function advancedSearch(criteria, options = {}) {
  const queryParts = [];

  if (criteria.title) {
    queryParts.push(`ti:${criteria.title}`);
  }

  if (criteria.author) {
    queryParts.push(`au:${criteria.author}`);
  }

  if (criteria.abstract) {
    queryParts.push(`abs:${criteria.abstract}`);
  }

  if (criteria.category) {
    queryParts.push(`cat:${criteria.category}`);
  }

  if (queryParts.length === 0) {
    throw new Error('At least one search criterion is required');
  }

  const query = queryParts.join(' AND ');
  return searchArxiv(query, options);
}

export default {
  search: searchArxiv,
  getPaper: getArxivPaper,
  searchByAuthor,
  searchByTitle,
  searchByCategory,
  getRecent: getRecentPapers,
  advancedSearch
};
