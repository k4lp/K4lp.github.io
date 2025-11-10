/**
 * Wikipedia API Helper
 *
 * Provides search and article extraction from Wikipedia
 * Uses the MediaWiki API (no authentication required)
 *
 * API Documentation: https://www.mediawiki.org/wiki/API:Main_page
 */

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';

/**
 * Search Wikipedia articles
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results (default: 5)
 * @returns {Promise<Array>} Array of search results
 */
export async function searchWikipedia(query, limit = 5) {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: limit.toString(),
    namespace: '0',
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // OpenSearch format: [query, [titles], [descriptions], [urls]]
    const [searchQuery, titles, descriptions, urls] = data;

    const results = titles.map((title, index) => ({
      title,
      description: descriptions[index] || '',
      url: urls[index] || '',
    }));

    return results;
  } catch (error) {
    console.error('[Wikipedia] Search error:', error);
    throw error;
  }
}

/**
 * Get Wikipedia article summary
 * @param {string} title - Article title
 * @param {number} sentences - Number of sentences in summary (default: 3)
 * @returns {Promise<Object>} Article summary
 */
export async function getWikipediaSummary(title, sentences = 3) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'extracts',
    exintro: 'true',
    explaintext: 'true',
    exsentences: sentences.toString(),
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1') {
      return {
        found: false,
        title,
        error: 'Article not found'
      };
    }

    return {
      found: true,
      title: page.title,
      pageId: page.pageid,
      summary: page.extract || '',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`
    };
  } catch (error) {
    console.error('[Wikipedia] Summary error:', error);
    throw error;
  }
}

/**
 * Get full Wikipedia article content
 * @param {string} title - Article title
 * @returns {Promise<Object>} Full article content
 */
export async function getWikipediaArticle(title) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'extracts|info',
    explaintext: 'true',
    inprop: 'url',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1') {
      return {
        found: false,
        title,
        error: 'Article not found'
      };
    }

    return {
      found: true,
      title: page.title,
      pageId: page.pageid,
      content: page.extract || '',
      url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
      lastModified: page.touched
    };
  } catch (error) {
    console.error('[Wikipedia] Article error:', error);
    throw error;
  }
}

/**
 * Search and get summary in one call (convenience method)
 * @param {string} query - Search query
 * @returns {Promise<Object>} First result with summary
 */
export async function quickSearch(query) {
  const searchResults = await searchWikipedia(query, 1);

  if (searchResults.length === 0) {
    return {
      found: false,
      query,
      error: 'No results found'
    };
  }

  const firstResult = searchResults[0];
  const summary = await getWikipediaSummary(firstResult.title, 5);

  return {
    found: true,
    query,
    ...firstResult,
    summary: summary.summary
  };
}

/**
 * Get Wikipedia article in specific language
 * @param {string} title - Article title
 * @param {string} lang - Language code (e.g., 'es', 'fr', 'de')
 * @param {number} sentences - Number of sentences in summary
 * @returns {Promise<Object>} Article summary in specified language
 */
export async function getWikipediaSummaryInLanguage(title, lang = 'en', sentences = 3) {
  const baseUrl = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: title,
    prop: 'extracts',
    exintro: 'true',
    explaintext: 'true',
    exsentences: sentences.toString(),
    origin: '*'
  });

  try {
    const response = await fetch(`${baseUrl}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    if (pageId === '-1') {
      return {
        found: false,
        title,
        lang,
        error: 'Article not found in this language'
      };
    }

    return {
      found: true,
      title: page.title,
      lang,
      pageId: page.pageid,
      summary: page.extract || '',
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`
    };
  } catch (error) {
    console.error(`[Wikipedia] Summary error (${lang}):`, error);
    throw error;
  }
}

export default {
  search: searchWikipedia,
  getSummary: getWikipediaSummary,
  getArticle: getWikipediaArticle,
  quickSearch,
  getSummaryInLanguage: getWikipediaSummaryInLanguage
};
