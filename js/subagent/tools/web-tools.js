/**
 * Web Tools Aggregator
 *
 * Central export point for all web API helper libraries
 * Provides unified interface for sub-agent external knowledge retrieval
 */

import * as Wikipedia from './apis/wikipedia.js';
import * as Arxiv from './apis/arxiv.js';
import * as DuckDuckGo from './apis/duckduckgo.js';
import * as Wikidata from './apis/wikidata.js';

/**
 * Web Tools API
 * All external knowledge sources aggregated in one namespace
 */
export const WebTools = {
  wikipedia: Wikipedia.default,
  arxiv: Arxiv.default,
  duckduckgo: DuckDuckGo.default,
  wikidata: Wikidata.default
};

/**
 * Convenience functions for common operations
 */

/**
 * Search across multiple sources
 * @param {string} query - Search query
 * @param {Array<string>} sources - Sources to search (default: all)
 * @returns {Promise<Object>} Aggregated results
 */
export async function searchAll(query, sources = ['wikipedia', 'duckduckgo']) {
  const results = {
    query,
    sources: {}
  };

  const promises = [];

  if (sources.includes('wikipedia')) {
    promises.push(
      Wikipedia.searchWikipedia(query, 3)
        .then(data => { results.sources.wikipedia = { success: true, data }; })
        .catch(error => { results.sources.wikipedia = { success: false, error: error.message }; })
    );
  }

  if (sources.includes('duckduckgo')) {
    promises.push(
      DuckDuckGo.quickSearch(query)
        .then(data => { results.sources.duckduckgo = { success: true, data }; })
        .catch(error => { results.sources.duckduckgo = { success: false, error: error.message }; })
    );
  }

  if (sources.includes('arxiv')) {
    promises.push(
      Arxiv.searchArxiv(query, { maxResults: 3 })
        .then(data => { results.sources.arxiv = { success: true, data }; })
        .catch(error => { results.sources.arxiv = { success: false, error: error.message }; })
    );
  }

  if (sources.includes('wikidata')) {
    promises.push(
      Wikidata.searchWikidata(query, 'en', 3)
        .then(data => { results.sources.wikidata = { success: true, data }; })
        .catch(error => { results.sources.wikidata = { success: false, error: error.message }; })
    );
  }

  await Promise.all(promises);

  return results;
}

/**
 * Get quick answer for a factual question
 * Tries multiple sources in order: DuckDuckGo → Wikipedia
 * @param {string} question - Factual question
 * @returns {Promise<Object>} Best answer found
 */
export async function getQuickAnswer(question) {
  // Try DuckDuckGo first (fastest, good for instant answers)
  try {
    const ddgResult = await DuckDuckGo.getInstantAnswer(question);
    if (ddgResult.found && ddgResult.answer) {
      return {
        found: true,
        source: 'duckduckgo',
        answer: ddgResult.answer,
        type: ddgResult.type,
        url: ddgResult.url
      };
    }
  } catch (error) {
    console.warn('[QuickAnswer] DuckDuckGo failed:', error.message);
  }

  // Fallback to Wikipedia
  try {
    const wikiResult = await Wikipedia.quickSearch(question);
    if (wikiResult.found && wikiResult.summary) {
      return {
        found: true,
        source: 'wikipedia',
        answer: wikiResult.summary,
        title: wikiResult.title,
        url: wikiResult.url
      };
    }
  } catch (error) {
    console.warn('[QuickAnswer] Wikipedia failed:', error.message);
  }

  return {
    found: false,
    question,
    error: 'No answer found from available sources'
  };
}

/**
 * Search for academic papers
 * @param {string} query - Research query
 * @param {number} maxResults - Maximum results (default: 5)
 * @returns {Promise<Array>} Papers from arXiv
 */
export async function searchPapers(query, maxResults = 5) {
  return Arxiv.searchArxiv(query, { maxResults });
}

/**
 * Get entity information with enriched data
 * Combines Wikidata + Wikipedia
 * @param {string} entityName - Entity name
 * @returns {Promise<Object>} Enriched entity data
 */
export async function getEntityInfo(entityName) {
  const result = {
    entity: entityName,
    found: false,
    wikidata: null,
    wikipedia: null
  };

  try {
    // Search Wikidata
    const wikidataSearch = await Wikidata.searchWikidata(entityName, 'en', 1);
    if (wikidataSearch.length > 0) {
      const entity = await Wikidata.getEntity(wikidataSearch[0].id);
      result.wikidata = entity;
      result.found = true;
    }
  } catch (error) {
    console.warn('[EntityInfo] Wikidata failed:', error.message);
  }

  try {
    // Get Wikipedia summary
    const wikiSummary = await Wikipedia.getWikipediaSummary(entityName, 5);
    if (wikiSummary.found) {
      result.wikipedia = wikiSummary;
      result.found = true;
    }
  } catch (error) {
    console.warn('[EntityInfo] Wikipedia failed:', error.message);
  }

  return result;
}

/**
 * Calculate or get mathematical result
 * @param {string} expression - Mathematical expression or question
 * @returns {Promise<Object>} Calculation result
 */
export async function calculate(expression) {
  return DuckDuckGo.calculate(expression);
}

/**
 * Get definition of a term
 * @param {string} term - Term to define
 * @returns {Promise<Object>} Definition
 */
export async function getDefinition(term) {
  return DuckDuckGo.getDefinition(term);
}

// Re-export individual APIs for direct access
export { Wikipedia, Arxiv, DuckDuckGo, Wikidata };

// Default export
export default {
  ...WebTools,
  searchAll,
  getQuickAnswer,
  searchPapers,
  getEntityInfo,
  calculate,
  getDefinition
};
