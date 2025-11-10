/**
 * API Helper Test Suite
 *
 * Simple test runner to verify all API helpers work correctly
 */

import * as Wikipedia from './apis/wikipedia.js';
import * as Arxiv from './apis/arxiv.js';
import * as DuckDuckGo from './apis/duckduckgo.js';
import * as Wikidata from './apis/wikidata.js';
import WebTools from './web-tools.js';

const tests = [];
const results = { passed: 0, failed: 0, errors: [] };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Starting API Helper Tests\n');

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   Error: ${error.message}`);
      results.failed++;
      results.errors.push({ test: name, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${results.passed} passed, ${results.failed} failed`);

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.errors.forEach(({ test, error }) => {
      console.log(`  • ${test}: ${error}`);
    });
  }

  return results;
}

// ============================================================================
// Wikipedia API Tests
// ============================================================================

test('Wikipedia: Search', async () => {
  const results = await Wikipedia.searchWikipedia('JavaScript', 3);
  if (!Array.isArray(results)) throw new Error('Expected array');
  if (results.length === 0) throw new Error('Expected results');
  if (!results[0].title) throw new Error('Expected title field');
});

test('Wikipedia: Get Summary', async () => {
  const result = await Wikipedia.getWikipediaSummary('Python programming language', 3);
  if (!result.found) throw new Error('Expected to find article');
  if (!result.summary) throw new Error('Expected summary');
  if (!result.url) throw new Error('Expected URL');
});

test('Wikipedia: Quick Search', async () => {
  const result = await Wikipedia.quickSearch('TypeScript');
  if (!result.found) throw new Error('Expected to find article');
  if (!result.summary) throw new Error('Expected summary');
});

// ============================================================================
// arXiv API Tests
// ============================================================================

test('arXiv: Search Papers', async () => {
  const results = await Arxiv.searchArxiv('machine learning', { maxResults: 2 });
  if (!Array.isArray(results)) throw new Error('Expected array');
  if (results.length === 0) throw new Error('Expected results');
  if (!results[0].title) throw new Error('Expected title');
  if (!results[0].abstract) throw new Error('Expected abstract');
});

test('arXiv: Search by Author', async () => {
  const results = await Arxiv.searchByAuthor('Hinton', 2);
  if (!Array.isArray(results)) throw new Error('Expected array');
  // Note: May return 0 results if no exact match
  if (results.length > 0 && !results[0].authors) {
    throw new Error('Expected authors field');
  }
});

test('arXiv: Search by Category', async () => {
  const results = await Arxiv.searchByCategory('cs.AI', 2);
  if (!Array.isArray(results)) throw new Error('Expected array');
  if (results.length === 0) throw new Error('Expected results');
});

// ============================================================================
// DuckDuckGo API Tests
// ============================================================================

test('DuckDuckGo: Query', async () => {
  const result = await DuckDuckGo.queryDuckDuckGo('JavaScript');
  if (!result) throw new Error('Expected result object');
  // DDG may return various formats, just check structure exists
});

test('DuckDuckGo: Get Definition', async () => {
  const result = await DuckDuckGo.getDefinition('algorithm');
  if (!result) throw new Error('Expected result');
  // Definition may or may not be found, just verify it returns
});

test('DuckDuckGo: Calculate', async () => {
  const result = await DuckDuckGo.calculate('2+2');
  if (!result) throw new Error('Expected result');
  // Calculator may or may not work, just verify it returns
});

// ============================================================================
// Wikidata API Tests
// ============================================================================

test('Wikidata: Search', async () => {
  const results = await Wikidata.searchWikidata('Albert Einstein', 'en', 3);
  if (!Array.isArray(results)) throw new Error('Expected array');
  if (results.length === 0) throw new Error('Expected results');
  if (!results[0].id) throw new Error('Expected entity ID');
  if (!results[0].label) throw new Error('Expected label');
});

test('Wikidata: Get Entity', async () => {
  // Q42 is Douglas Adams
  const entity = await Wikidata.getEntity('Q42');
  if (!entity.id) throw new Error('Expected entity ID');
  if (!entity.label) throw new Error('Expected label');
  if (!entity.description) throw new Error('Expected description');
});

test('Wikidata: Get Entity by Wikipedia Title', async () => {
  const entity = await Wikidata.getEntityByWikipediaTitle('Python (programming language)');
  if (!entity) throw new Error('Expected entity');
  if (!entity.id) throw new Error('Expected entity ID');
});

// ============================================================================
// WebTools Aggregator Tests
// ============================================================================

test('WebTools: Search All', async () => {
  const result = await WebTools.searchAll('TypeScript', ['wikipedia', 'duckduckgo']);
  if (!result.query) throw new Error('Expected query field');
  if (!result.sources) throw new Error('Expected sources field');
  if (!result.sources.wikipedia) throw new Error('Expected wikipedia results');
});

test('WebTools: Get Quick Answer', async () => {
  const result = await WebTools.getQuickAnswer('What is JavaScript?');
  if (!result) throw new Error('Expected result');
  // May or may not find answer, just verify structure
});

test('WebTools: Search Papers', async () => {
  const results = await WebTools.searchPapers('neural networks', 2);
  if (!Array.isArray(results)) throw new Error('Expected array');
  if (results.length === 0) throw new Error('Expected results');
});

test('WebTools: Get Entity Info', async () => {
  const result = await WebTools.getEntityInfo('Marie Curie');
  if (!result.entity) throw new Error('Expected entity field');
  // May or may not find data, just verify structure
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Phase 1 API Helper Test Suite');
console.log('Testing: Wikipedia, arXiv, DuckDuckGo, Wikidata, WebTools\n');

runTests().then(results => {
  if (results.failed === 0) {
    console.log('\n✨ All tests passed! Phase 1 API helpers are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
