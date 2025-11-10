const SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

export async function wikipediaSearch(query, { limit = 5 } = {}) {
  if (!query) return [];

  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srprop', 'snippet');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', String(Math.min(limit, 10)));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Wikipedia search failed (${response.status})`);
  }

  const data = await response.json();
  const results = data?.query?.search || [];
  return results.map((item) => ({
    id: item.pageid,
    title: item.title,
    snippet: sanitizeSnippet(item.snippet),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
  }));
}

export async function wikipediaSummary(title) {
  if (!title) return null;
  const response = await fetch(`${SUMMARY_ENDPOINT}${encodeURIComponent(title)}`);
  if (!response.ok) {
    throw new Error(`Wikipedia summary failed (${response.status})`);
  }
  const data = await response.json();
  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls?.desktop?.page
  };
}

function sanitizeSnippet(snippet = '') {
  return snippet
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/<\/?b>/gi, '')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}
