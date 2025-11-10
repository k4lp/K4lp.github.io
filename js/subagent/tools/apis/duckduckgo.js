/**
 * DuckDuckGo Instant Answer API Helper
 *
 * Provides instant answers, definitions, and quick facts from DuckDuckGo
 * No authentication required
 *
 * API Documentation: https://duckduckgo.com/api
 */

const DDG_API_BASE = 'https://api.duckduckgo.com/';

/**
 * Query DuckDuckGo Instant Answer API
 * @param {string} query - Search query
 * @param {Object} options - Query options
 * @param {boolean} options.skipDisambiguation - Skip disambiguation (default: false)
 * @param {boolean} options.skipHTML - Return text only (default: true)
 * @returns {Promise<Object>} Instant answer result
 */
export async function queryDuckDuckGo(query, options = {}) {
  const {
    skipDisambiguation = false,
    skipHTML = true
  } = options;

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    no_redirect: '1',
    no_html: skipHTML ? '1' : '0',
    skip_disambig: skipDisambiguation ? '1' : '0'
  });

  try {
    const response = await fetch(`${DDG_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`DuckDuckGo API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse response
    const result = {
      query,
      found: false,
      type: null,
      answer: null,
      abstract: null,
      definition: null,
      relatedTopics: [],
      image: null,
      infobox: null
    };

    // Check for instant answer
    if (data.Answer) {
      result.found = true;
      result.type = 'answer';
      result.answer = data.Answer;
      result.answerType = data.AnswerType || 'unknown';
    }

    // Check for abstract (summary)
    if (data.Abstract) {
      result.found = true;
      result.type = result.type || 'abstract';
      result.abstract = {
        text: data.Abstract,
        source: data.AbstractSource || '',
        url: data.AbstractURL || ''
      };
    }

    // Check for definition
    if (data.Definition) {
      result.found = true;
      result.type = result.type || 'definition';
      result.definition = {
        text: data.Definition,
        source: data.DefinitionSource || '',
        url: data.DefinitionURL || ''
      };
    }

    // Extract image
    if (data.Image) {
      result.image = data.Image.startsWith('//')
        ? `https:${data.Image}`
        : data.Image;
    }

    // Extract related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      result.relatedTopics = data.RelatedTopics
        .filter(topic => topic.Text) // Filter out topic groups
        .map(topic => ({
          text: topic.Text,
          url: topic.FirstURL || '',
          icon: topic.Icon?.URL ? `https://duckduckgo.com${topic.Icon.URL}` : null
        }))
        .slice(0, 10); // Limit to 10 related topics
    }

    // Extract infobox if available
    if (data.Infobox) {
      result.infobox = {
        content: data.Infobox.content || [],
        meta: data.Infobox.meta || []
      };
    }

    // Extract heading (title)
    if (data.Heading) {
      result.heading = data.Heading;
    }

    // Entity type
    if (data.Entity) {
      result.entity = data.Entity;
    }

    return result;
  } catch (error) {
    console.error('[DuckDuckGo] Query error:', error);
    throw error;
  }
}

/**
 * Get quick definition for a term
 * @param {string} term - Term to define
 * @returns {Promise<Object>} Definition result
 */
export async function getDefinition(term) {
  const result = await queryDuckDuckGo(`define ${term}`);

  if (result.definition) {
    return {
      found: true,
      term,
      definition: result.definition.text,
      source: result.definition.source,
      url: result.definition.url
    };
  }

  if (result.abstract) {
    return {
      found: true,
      term,
      definition: result.abstract.text,
      source: result.abstract.source,
      url: result.abstract.url,
      type: 'abstract'
    };
  }

  return {
    found: false,
    term,
    error: 'No definition found'
  };
}

/**
 * Get instant answer for a question
 * @param {string} question - Question to answer
 * @returns {Promise<Object>} Answer result
 */
export async function getInstantAnswer(question) {
  const result = await queryDuckDuckGo(question);

  if (result.answer) {
    return {
      found: true,
      question,
      answer: result.answer,
      type: result.answerType
    };
  }

  if (result.abstract) {
    return {
      found: true,
      question,
      answer: result.abstract.text,
      source: result.abstract.source,
      url: result.abstract.url,
      type: 'abstract'
    };
  }

  return {
    found: false,
    question,
    error: 'No instant answer found',
    relatedTopics: result.relatedTopics
  };
}

/**
 * Get information about an entity (person, place, thing)
 * @param {string} entity - Entity name
 * @returns {Promise<Object>} Entity information
 */
export async function getEntityInfo(entity) {
  const result = await queryDuckDuckGo(entity);

  if (!result.found) {
    return {
      found: false,
      entity,
      error: 'No information found'
    };
  }

  return {
    found: true,
    entity: result.entity || entity,
    heading: result.heading,
    abstract: result.abstract,
    infobox: result.infobox,
    image: result.image,
    relatedTopics: result.relatedTopics
  };
}

/**
 * Perform calculation
 * @param {string} expression - Mathematical expression
 * @returns {Promise<Object>} Calculation result
 */
export async function calculate(expression) {
  const result = await queryDuckDuckGo(expression);

  if (result.answer) {
    return {
      found: true,
      expression,
      result: result.answer,
      type: 'calculation'
    };
  }

  return {
    found: false,
    expression,
    error: 'Could not calculate expression'
  };
}

/**
 * Quick search with summary
 * @param {string} query - Search query
 * @returns {Promise<Object>} Concise result
 */
export async function quickSearch(query) {
  const result = await queryDuckDuckGo(query);

  // Build concise response
  const response = {
    query,
    found: result.found
  };

  if (result.answer) {
    response.answer = result.answer;
    response.type = 'instant_answer';
  } else if (result.definition) {
    response.answer = result.definition.text;
    response.type = 'definition';
    response.source = result.definition.source;
  } else if (result.abstract) {
    response.answer = result.abstract.text;
    response.type = 'abstract';
    response.source = result.abstract.source;
    response.url = result.abstract.url;
  }

  if (result.image) {
    response.image = result.image;
  }

  if (result.relatedTopics && result.relatedTopics.length > 0) {
    response.relatedTopics = result.relatedTopics.slice(0, 3);
  }

  return response;
}

export default {
  query: queryDuckDuckGo,
  getDefinition,
  getInstantAnswer,
  getEntityInfo,
  calculate,
  quickSearch
};
