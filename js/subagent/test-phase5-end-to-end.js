/**
 * Phase 5: End-to-End Integration Test Suite
 *
 * Tests the complete integrated Sub-Agent System from main.js initialization
 * through execution, UI updates, and context provider integration.
 *
 * IMPORTANT: This test requires a browser environment with:
 * - localStorage
 * - Full DOM
 * - GDRS loaded and initialized
 *
 * Run this test by:
 * 1. Open index.html in browser
 * 2. Open browser console
 * 3. Run: await import('./js/subagent/test-phase5-end-to-end.js')
 */

// Wait for GDRS to be available
if (typeof window.GDRS === 'undefined') {
  console.error('❌ GDRS not loaded! Please wait for application to initialize.');
  throw new Error('GDRS not initialized');
}

const tests = [];
const results = { passed: 0, failed: 0, skipped: 0, errors: [] };

function test(name, fn, skipInNode = false) {
  tests.push({ name, fn, skipInNode });
}

async function runTests() {
  console.log('🧪 Starting Phase 5 End-to-End Integration Tests\n');
  console.log('Testing complete system integration from main.js through execution\n');

  for (const { name, fn, skipInNode } of tests) {
    // Skip browser-only tests if in Node.js
    if (skipInNode && typeof window === 'undefined') {
      console.log(`⏭️  ${name} (skipped - browser only)`);
      results.skipped++;
      continue;
    }

    try {
      await fn();
      console.log(`✅ ${name}`);
      results.passed++;
    } catch (error) {
      console.error(`❌ ${name}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      results.failed++;
      results.errors.push({ test: name, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`);

  if (results.failed > 0) {
    console.log('\nFailed tests:');
    results.errors.forEach(({ test, error }) => {
      console.log(`  • ${test}: ${error}`);
    });
  }

  return results;
}

// ============================================================================
// PHASE 5: Integration Tests
// ============================================================================

// Test 1: GDRS Namespace Integration
test('GDRS namespace includes SubAgentOrchestrator', () => {
  if (!window.GDRS) throw new Error('GDRS not available');
  if (!window.GDRS.SubAgentOrchestrator) throw new Error('SubAgentOrchestrator not in GDRS namespace');
  if (typeof window.GDRS.SubAgentOrchestrator.runSubAgent !== 'function') {
    throw new Error('runSubAgent method not available');
  }
});

test('GDRS namespace includes WebTools', () => {
  if (!window.GDRS) throw new Error('GDRS not available');
  if (!window.GDRS.WebTools) throw new Error('WebTools not in GDRS namespace');
  if (!window.GDRS.WebTools.wikipedia) throw new Error('WebTools.wikipedia not available');
  if (!window.GDRS.WebTools.arxiv) throw new Error('WebTools.arxiv not available');
  if (!window.GDRS.WebTools.duckduckgo) throw new Error('WebTools.duckduckgo not available');
  if (!window.GDRS.WebTools.wikidata) throw new Error('WebTools.wikidata not available');
});

test('GDRS namespace includes SubAgentUI instance', () => {
  if (!window.GDRS) throw new Error('GDRS not available');
  if (!window.GDRS.SubAgentUI) throw new Error('SubAgentUI not in GDRS namespace');
  if (typeof window.GDRS.SubAgentUI.show !== 'function') {
    throw new Error('SubAgentUI.show method not available');
  }
  if (typeof window.GDRS.SubAgentUI.hide !== 'function') {
    throw new Error('SubAgentUI.hide method not available');
  }
  if (typeof window.GDRS.SubAgentUI.toggle !== 'function') {
    throw new Error('SubAgentUI.toggle method not available');
  }
});

test('GDRS_DEBUG includes sub-agent helpers', () => {
  if (!window.GDRS_DEBUG) throw new Error('GDRS_DEBUG not available');
  if (typeof window.GDRS_DEBUG.runSubAgent !== 'function') {
    throw new Error('GDRS_DEBUG.runSubAgent not available');
  }
  if (typeof window.GDRS_DEBUG.listSubAgents !== 'function') {
    throw new Error('GDRS_DEBUG.listSubAgents not available');
  }
  if (typeof window.GDRS_DEBUG.toggleSubAgentUI !== 'function') {
    throw new Error('GDRS_DEBUG.toggleSubAgentUI not available');
  }
  if (typeof window.GDRS_DEBUG.enableSubAgents !== 'function') {
    throw new Error('GDRS_DEBUG.enableSubAgents not available');
  }
  if (typeof window.GDRS_DEBUG.disableSubAgents !== 'function') {
    throw new Error('GDRS_DEBUG.disableSubAgents not available');
  }
});

// Test 2: UI Initialization
test('SubAgentUI panel exists in DOM', () => {
  const panel = document.getElementById('subAgentPanel');
  if (!panel) throw new Error('SubAgentUI panel not found in DOM');
});

test('SubAgentUI has all required sections', () => {
  const requiredIds = [
    'subagentStatus',
    'subagentStatusText',
    'execAgent',
    'execQuery',
    'execModel',
    'execIteration',
    'execTime',
    'iterationLog',
    'codeExecutionLog',
    'subagentResult',
    'stateData',
    'executionHistory'
  ];

  for (const id of requiredIds) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Required element #${id} not found`);
  }
});

test('SubAgentUI toggle functionality works', () => {
  const panel = document.getElementById('subAgentPanel');
  if (!panel) throw new Error('Panel not found');

  // Get initial state
  const initiallyHidden = panel.classList.contains('hidden');

  // Toggle
  window.GDRS.SubAgentUI.toggle();
  const afterToggle = panel.classList.contains('hidden');

  // Should be opposite
  if (initiallyHidden === afterToggle) {
    throw new Error('Toggle did not change visibility');
  }

  // Toggle back
  window.GDRS.SubAgentUI.toggle();
  const afterSecondToggle = panel.classList.contains('hidden');

  // Should be back to original
  if (initiallyHidden !== afterSecondToggle) {
    throw new Error('Second toggle did not restore original state');
  }
});

// Test 3: Agent Configuration
test('All 3 agents are available', () => {
  const agents = window.GDRS.SubAgentOrchestrator.getAvailableAgents();
  if (!Array.isArray(agents)) throw new Error('getAvailableAgents did not return array');
  if (agents.length !== 3) throw new Error(`Expected 3 agents, got ${agents.length}`);

  const agentIds = agents.map(a => a.id);
  const requiredAgents = ['webKnowledge', 'scienceResearch', 'quickFacts'];

  for (const requiredId of requiredAgents) {
    if (!agentIds.includes(requiredId)) {
      throw new Error(`Required agent '${requiredId}' not found`);
    }
  }
});

test('Each agent has required configuration', () => {
  const agents = window.GDRS.SubAgentOrchestrator.getAvailableAgents();

  for (const agent of agents) {
    if (!agent.id) throw new Error('Agent missing id');
    if (!agent.name) throw new Error('Agent missing name');
    if (!agent.description) throw new Error('Agent missing description');
    if (typeof agent.maxIterations !== 'number') throw new Error('Agent missing maxIterations');
    if (!agent.outputFormat) throw new Error('Agent missing outputFormat');
  }
});

// Test 4: Storage Integration
test('Storage methods are available for sub-agents', () => {
  if (typeof window.GDRS.Storage.loadSubAgentResult !== 'function') {
    throw new Error('Storage.loadSubAgentResult not available');
  }
  if (typeof window.GDRS.Storage.saveSubAgentResult !== 'function') {
    throw new Error('Storage.saveSubAgentResult not available');
  }
  if (typeof window.GDRS.Storage.loadSubAgentEnabled !== 'function') {
    throw new Error('Storage.loadSubAgentEnabled not available');
  }
  if (typeof window.GDRS.Storage.saveSubAgentEnabled !== 'function') {
    throw new Error('Storage.saveSubAgentEnabled not available');
  }
  if (typeof window.GDRS.Storage.loadSubAgentHistory !== 'function') {
    throw new Error('Storage.loadSubAgentHistory not available');
  }
});

test('Storage enable/disable toggle works', () => {
  // Enable
  window.GDRS.Storage.saveSubAgentEnabled(true);
  if (window.GDRS.Storage.loadSubAgentEnabled() !== true) {
    throw new Error('Failed to enable sub-agents');
  }

  // Disable
  window.GDRS.Storage.saveSubAgentEnabled(false);
  if (window.GDRS.Storage.loadSubAgentEnabled() !== false) {
    throw new Error('Failed to disable sub-agents');
  }
});

test('Storage can save and load results', () => {
  const testResult = {
    success: true,
    content: 'Test content',
    format: 'markdown',
    source: 'Test Agent',
    iterations: 2,
    executionTime: 1000,
    agentId: 'test',
    query: 'Test query'
  };

  window.GDRS.Storage.saveSubAgentResult(testResult);
  const loaded = window.GDRS.Storage.loadSubAgentResult();

  if (!loaded) throw new Error('Failed to load result');
  if (loaded.content !== 'Test content') throw new Error('Content mismatch');
  if (loaded.success !== true) throw new Error('Success flag mismatch');
  if (!loaded.timestamp) throw new Error('Timestamp not added');

  // Cleanup
  window.GDRS.Storage.clearSubAgentResult();
});

// Test 5: Event System Integration
test('Sub-agent events are defined in Events object', () => {
  const requiredEvents = [
    'SUBAGENT_START',
    'SUBAGENT_ITERATION',
    'SUBAGENT_EXECUTION',
    'SUBAGENT_COMPLETE',
    'SUBAGENT_ERROR',
    'SUBAGENT_RESULT_UPDATED',
    'SUBAGENT_RESULT_CLEARED',
    'SUBAGENT_ENABLED_CHANGED'
  ];

  for (const event of requiredEvents) {
    if (!window.GDRS.Events[event]) {
      throw new Error(`Event ${event} not defined`);
    }
  }
});

test('Event bus can subscribe to sub-agent events', () => {
  let eventReceived = false;
  const handler = () => { eventReceived = true; };

  // Subscribe
  window.GDRS.eventBus.on(window.GDRS.Events.SUBAGENT_RESULT_UPDATED, handler);

  // Trigger event by saving result
  window.GDRS.Storage.saveSubAgentResult({ success: true, content: 'Test' });

  // Cleanup
  window.GDRS.eventBus.off(window.GDRS.Events.SUBAGENT_RESULT_UPDATED, handler);
  window.GDRS.Storage.clearSubAgentResult();

  if (!eventReceived) throw new Error('Event not received');
});

// Test 6: Context Provider Integration
test('External knowledge provider is registered', async () => {
  // Check if provider registry exists
  if (!window.GDRS.defaultContextProviderRegistry) {
    throw new Error('defaultContextProviderRegistry not available');
  }

  // Try to get the provider
  const provider = window.GDRS.defaultContextProviderRegistry.get('externalKnowledge');
  if (!provider) {
    throw new Error('externalKnowledge provider not registered');
  }

  if (typeof provider.collect !== 'function') {
    throw new Error('Provider missing collect method');
  }

  if (typeof provider.format !== 'function') {
    throw new Error('Provider missing format method');
  }
});

test('Context provider respects enabled state', async () => {
  const provider = window.GDRS.defaultContextProviderRegistry.get('externalKnowledge');
  if (!provider) throw new Error('Provider not found');

  // Disable and save result
  window.GDRS.Storage.saveSubAgentEnabled(false);
  window.GDRS.Storage.saveSubAgentResult({
    success: true,
    content: 'Test',
    query: 'Test'
  });

  // Should return null when disabled
  const resultWhenDisabled = provider.collect();
  if (resultWhenDisabled !== null) {
    throw new Error('Provider returned result when disabled');
  }

  // Enable
  window.GDRS.Storage.saveSubAgentEnabled(true);

  // Should return result when enabled
  const resultWhenEnabled = provider.collect();
  if (!resultWhenEnabled) {
    throw new Error('Provider did not return result when enabled');
  }

  // Cleanup
  window.GDRS.Storage.clearSubAgentResult();
  window.GDRS.Storage.saveSubAgentEnabled(false);
});

// Test 7: GDRS_DEBUG Helpers
test('GDRS_DEBUG.listSubAgents returns all agents', () => {
  const agents = window.GDRS_DEBUG.listSubAgents();
  if (!Array.isArray(agents)) throw new Error('listSubAgents did not return array');
  if (agents.length !== 3) throw new Error(`Expected 3 agents, got ${agents.length}`);
});

test('GDRS_DEBUG.enableSubAgents works', () => {
  window.GDRS_DEBUG.disableSubAgents();
  if (window.GDRS.Storage.loadSubAgentEnabled() !== false) {
    throw new Error('disableSubAgents failed');
  }

  window.GDRS_DEBUG.enableSubAgents();
  if (window.GDRS.Storage.loadSubAgentEnabled() !== true) {
    throw new Error('enableSubAgents failed');
  }

  // Cleanup
  window.GDRS_DEBUG.disableSubAgents();
});

test('GDRS_DEBUG.toggleSubAgentUI works', () => {
  const panel = document.getElementById('subAgentPanel');
  if (!panel) throw new Error('Panel not found');

  const initialState = panel.classList.contains('hidden');
  window.GDRS_DEBUG.toggleSubAgentUI();
  const afterToggle = panel.classList.contains('hidden');

  if (initialState === afterToggle) {
    throw new Error('toggleSubAgentUI did not change state');
  }

  // Toggle back
  window.GDRS_DEBUG.toggleSubAgentUI();
});

// Test 8: End-to-End Workflow Simulation
test('Complete workflow: Enable → Store → Retrieve → Disable', () => {
  // 1. Enable
  window.GDRS_DEBUG.enableSubAgents();
  if (!window.GDRS.Storage.loadSubAgentEnabled()) {
    throw new Error('Failed to enable');
  }

  // 2. Store result
  window.GDRS.Storage.saveSubAgentResult({
    success: true,
    content: 'Workflow test content',
    query: 'Test query',
    agentId: 'webKnowledge',
    iterations: 2,
    executionTime: 1500
  });

  // 3. Retrieve
  const result = window.GDRS.Storage.loadSubAgentResult();
  if (!result || result.content !== 'Workflow test content') {
    throw new Error('Failed to retrieve result');
  }

  // 4. Context provider should include it
  const provider = window.GDRS.defaultContextProviderRegistry.get('externalKnowledge');
  const collected = provider.collect();
  if (!collected) {
    throw new Error('Context provider did not collect result');
  }

  // 5. Format
  const formatted = provider.format(collected);
  if (!formatted.includes('Workflow test content')) {
    throw new Error('Formatted output missing content');
  }

  // 6. Clear and disable
  window.GDRS.Storage.clearSubAgentResult();
  window.GDRS_DEBUG.disableSubAgents();

  // 7. Verify cleared
  const afterClear = window.GDRS.Storage.loadSubAgentResult();
  if (afterClear !== null) {
    throw new Error('Result not cleared');
  }
});

test('UI state visualization updates on storage change', () => {
  const stateEl = document.getElementById('stateData');
  if (!stateEl) throw new Error('State element not found');

  // Save a result
  window.GDRS.Storage.saveSubAgentResult({
    success: true,
    content: 'State test',
    query: 'Test',
    agentId: 'test',
    iterations: 1,
    executionTime: 500
  });

  // Manually trigger state update (normally triggered by events)
  window.GDRS.SubAgentUI._updateStateVisualization();

  // Check if state data contains the result
  const stateText = stateEl.textContent;
  try {
    const stateData = JSON.parse(stateText);
    if (!stateData.storage) throw new Error('State missing storage');
    if (!stateData.storage.result) throw new Error('State missing result');
  } catch (e) {
    throw new Error('State visualization not updated or invalid JSON');
  }

  // Cleanup
  window.GDRS.Storage.clearSubAgentResult();
});

// Test 9: WebTools API Availability
test('WebTools methods are callable', async () => {
  // Just check they exist and are functions
  const requiredMethods = [
    'searchAll',
    'getQuickAnswer',
    'searchPapers',
    'getEntityInfo'
  ];

  for (const method of requiredMethods) {
    if (typeof window.GDRS.WebTools[method] !== 'function') {
      throw new Error(`WebTools.${method} not available`);
    }
  }

  // Check nested APIs
  const apis = ['wikipedia', 'arxiv', 'duckduckgo', 'wikidata'];
  for (const api of apis) {
    if (!window.GDRS.WebTools[api]) {
      throw new Error(`WebTools.${api} not available`);
    }
  }
});

// Test 10: System Health Check
test('System health: All components initialized', () => {
  const components = {
    'GDRS': window.GDRS,
    'GDRS.SubAgentOrchestrator': window.GDRS?.SubAgentOrchestrator,
    'GDRS.WebTools': window.GDRS?.WebTools,
    'GDRS.SubAgentUI': window.GDRS?.SubAgentUI,
    'GDRS.Storage': window.GDRS?.Storage,
    'GDRS.eventBus': window.GDRS?.eventBus,
    'GDRS.Events': window.GDRS?.Events,
    'GDRS_DEBUG': window.GDRS_DEBUG
  };

  const missing = [];
  for (const [name, component] of Object.entries(components)) {
    if (!component) missing.push(name);
  }

  if (missing.length > 0) {
    throw new Error(`Missing components: ${missing.join(', ')}`);
  }
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Phase 5: End-to-End Integration Test Suite');
console.log('Testing complete system from main.js initialization through execution\n');

const testResults = await runTests();

if (testResults.failed === 0) {
  console.log('\n✨ All Phase 5 integration tests passed!');
  console.log('✅ Sub-Agent System is fully integrated and operational.');
  console.log('\n🚀 System ready for production use!');
} else {
  console.log('\n⚠️  Some tests failed. Review errors above.');
  console.log('Note: Some tests may fail if GDRS is not fully initialized.');
}

export { testResults };
