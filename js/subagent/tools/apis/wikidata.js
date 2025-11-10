/**
 * Wikidata API Helper
 *
 * Provides access to structured data from Wikidata
 * Wikidata is a free knowledge base with millions of entities
 *
 * API Documentation: https://www.wikidata.org/wiki/Wikidata:Data_access
 */

const WIKIDATA_API_BASE = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

/**
 * Search for Wikidata entities
 * @param {string} query - Search query
 * @param {string} language - Language code (default: 'en')
 * @param {number} limit - Maximum results (default: 10)
 * @returns {Promise<Array>} Array of entities
 */
export async function searchWikidata(query, language = 'en', limit = 10) {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    search: query,
    language,
    limit: limit.toString(),
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIDATA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const results = (data.search || []).map(item => ({
      id: item.id,
      label: item.label || '',
      description: item.description || '',
      url: item.concepturi || `https://www.wikidata.org/wiki/${item.id}`,
      aliases: item.aliases || []
    }));

    return results;
  } catch (error) {
    console.error('[Wikidata] Search error:', error);
    throw error;
  }
}

/**
 * Get entity data by ID
 * @param {string} entityId - Wikidata entity ID (e.g., 'Q42' for Douglas Adams)
 * @param {string} language - Language code (default: 'en')
 * @returns {Promise<Object>} Entity data
 */
export async function getEntity(entityId, language = 'en') {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: entityId,
    languages: language,
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIDATA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const entity = data.entities[entityId];

    if (!entity || entity.missing !== undefined) {
      return {
        found: false,
        id: entityId,
        error: 'Entity not found'
      };
    }

    // Extract labels, descriptions, and claims
    const labels = entity.labels || {};
    const descriptions = entity.descriptions || {};
    const claims = entity.claims || {};

    return {
      found: true,
      id: entity.id,
      label: labels[language]?.value || '',
      description: descriptions[language]?.value || '',
      aliases: entity.aliases?.[language]?.map(a => a.value) || [],
      url: `https://www.wikidata.org/wiki/${entity.id}`,
      claims: parseClaims(claims, language),
      sitelinks: entity.sitelinks || {}
    };
  } catch (error) {
    console.error('[Wikidata] Get entity error:', error);
    throw error;
  }
}

/**
 * Parse Wikidata claims into readable format
 * @param {Object} claims - Raw claims object
 * @param {string} language - Language code
 * @returns {Object} Parsed claims
 */
function parseClaims(claims, language = 'en') {
  const parsed = {};

  for (const [property, values] of Object.entries(claims)) {
    parsed[property] = values.map(claim => {
      const mainsnak = claim.mainsnak;

      if (!mainsnak || !mainsnak.datavalue) {
        return null;
      }

      const datatype = mainsnak.datatype;
      const value = mainsnak.datavalue.value;

      // Handle different datatypes
      switch (datatype) {
        case 'wikibase-item':
          return {
            type: 'entity',
            id: value.id,
            label: value.label || value.id
          };

        case 'string':
        case 'external-id':
          return {
            type: 'string',
            value: value
          };

        case 'time':
          return {
            type: 'time',
            value: value.time,
            precision: value.precision
          };

        case 'quantity':
          return {
            type: 'quantity',
            amount: value.amount,
            unit: value.unit
          };

        case 'globe-coordinate':
          return {
            type: 'coordinate',
            latitude: value.latitude,
            longitude: value.longitude
          };

        case 'monolingualtext':
          return {
            type: 'text',
            text: value.text,
            language: value.language
          };

        case 'url':
          return {
            type: 'url',
            value: value
          };

        default:
          return {
            type: datatype,
            value: value
          };
      }
    }).filter(v => v !== null);
  }

  return parsed;
}

/**
 * Execute SPARQL query on Wikidata
 * @param {string} sparqlQuery - SPARQL query string
 * @returns {Promise<Array>} Query results
 */
export async function sparqlQuery(sparqlQuery) {
  const params = new URLSearchParams({
    query: sparqlQuery,
    format: 'json'
  });

  try {
    const response = await fetch(`${WIKIDATA_SPARQL_ENDPOINT}?${params}`, {
      headers: {
        'Accept': 'application/sparql-results+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Wikidata SPARQL error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Parse SPARQL results
    const bindings = data.results?.bindings || [];
    const results = bindings.map(binding => {
      const row = {};
      for (const [key, value] of Object.entries(binding)) {
        row[key] = value.value;
      }
      return row;
    });

    return results;
  } catch (error) {
    console.error('[Wikidata] SPARQL query error:', error);
    throw error;
  }
}

/**
 * Get properties of an entity (simplified)
 * @param {string} entityId - Wikidata entity ID
 * @param {Array<string>} propertyIds - Property IDs to retrieve (e.g., ['P31', 'P279'])
 * @returns {Promise<Object>} Property values
 */
export async function getProperties(entityId, propertyIds) {
  const entity = await getEntity(entityId);

  if (!entity.found) {
    return {
      found: false,
      id: entityId,
      error: 'Entity not found'
    };
  }

  const properties = {};
  for (const propId of propertyIds) {
    properties[propId] = entity.claims[propId] || [];
  }

  return {
    found: true,
    id: entityId,
    label: entity.label,
    properties
  };
}

/**
 * Find entities by Wikipedia title
 * @param {string} title - Wikipedia article title
 * @param {string} site - Wikipedia site (default: 'enwiki')
 * @returns {Promise<Object>} Wikidata entity
 */
export async function getEntityByWikipediaTitle(title, site = 'enwiki') {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    sites: site,
    titles: title,
    format: 'json',
    origin: '*'
  });

  try {
    const response = await fetch(`${WIKIDATA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikidata API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const entities = data.entities || {};
    const entityId = Object.keys(entities)[0];

    if (!entityId || entityId === '-1') {
      return {
        found: false,
        title,
        error: 'No Wikidata entity found for this Wikipedia article'
      };
    }

    return getEntity(entityId);
  } catch (error) {
    console.error('[Wikidata] Get entity by Wikipedia title error:', error);
    throw error;
  }
}

/**
 * Get instances of a class (e.g., all programming languages)
 * @param {string} classId - Wikidata class ID (e.g., 'Q9143' for programming language)
 * @param {number} limit - Maximum results (default: 100)
 * @returns {Promise<Array>} List of instances
 */
export async function getInstancesOf(classId, limit = 100) {
  const query = `
    SELECT ?item ?itemLabel WHERE {
      ?item wdt:P31 wd:${classId}.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT ${limit}
  `;

  const results = await sparqlQuery(query);
  return results.map(row => ({
    id: row.item.split('/').pop(),
    label: row.itemLabel,
    url: row.item
  }));
}

export default {
  search: searchWikidata,
  getEntity,
  getProperties,
  sparqlQuery,
  getByWikipediaTitle: getEntityByWikipediaTitle,
  getInstancesOf
};
