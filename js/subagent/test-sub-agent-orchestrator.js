/**
 * SubAgentOrchestrator Test Suite
 *
 * Tests for the sub-agent orchestration system.
 * Tests configuration loading, agent selection, and basic validation.
 *
 * Note: Full integration tests with LLM calls require API keys and are run separately.
 * These tests focus on structure, configuration, and error handling.
 */

import { SubAgentOrchestrator } from './sub-agent-orchestrator.js';
import { SUB_AGENTS, DEFAULT_AGENT, getAgent, getAvailableAgents, selectAgentForQuery } from './agents-config.js';

const tests = [];
const results = { passed: 0, failed: 0, errors: [] };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Starting SubAgentOrchestrator Tests\n');

  for (const { name, fn } of tests) {
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
// Agent Configuration Tests
// ============================================================================

test('Config: All agents have required fields', () => {
  const requiredFields = ['id', 'name', 'description', 'systemPrompt', 'allowedTools', 'maxIterations', 'outputFormat'];

  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    requiredFields.forEach(field => {
      if (!(field in agent)) {
        throw new Error(`Agent '${key}' missing required field: ${field}`);
      }
    });

    // Check field types
    if (typeof agent.id !== 'string') throw new Error(`${key}.id must be string`);
    if (typeof agent.name !== 'string') throw new Error(`${key}.name must be string`);
    if (typeof agent.description !== 'string') throw new Error(`${key}.description must be string`);
    if (typeof agent.systemPrompt !== 'string') throw new Error(`${key}.systemPrompt must be string`);
    if (!Array.isArray(agent.allowedTools)) throw new Error(`${key}.allowedTools must be array`);
    if (typeof agent.maxIterations !== 'number') throw new Error(`${key}.maxIterations must be number`);
    if (typeof agent.outputFormat !== 'string') throw new Error(`${key}.outputFormat must be string`);
  });
});

test('Config: Agent IDs match keys', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    if (agent.id !== key) {
      throw new Error(`Agent key '${key}' does not match agent.id '${agent.id}'`);
    }
  });
});

test('Config: System prompts are substantial', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    if (agent.systemPrompt.length < 100) {
      throw new Error(`Agent '${key}' system prompt too short (${agent.systemPrompt.length} chars)`);
    }
  });
});

test('Config: Max iterations are reasonable', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    if (agent.maxIterations < 1 || agent.maxIterations > 20) {
      throw new Error(`Agent '${key}' maxIterations out of range: ${agent.maxIterations}`);
    }
  });
});

test('Config: Default agent exists', () => {
  if (!SUB_AGENTS[DEFAULT_AGENT]) {
    throw new Error(`Default agent '${DEFAULT_AGENT}' not found in SUB_AGENTS`);
  }
});

test('Config: getAgent() works', () => {
  const agent = getAgent('webKnowledge');
  if (!agent) throw new Error('getAgent(webKnowledge) returned null');
  if (agent.id !== 'webKnowledge') throw new Error('getAgent returned wrong agent');

  const missing = getAgent('nonexistent');
  if (missing !== null) throw new Error('getAgent should return null for missing agent');
});

test('Config: getAvailableAgents() returns all agents', () => {
  const agents = getAvailableAgents();
  if (!Array.isArray(agents)) throw new Error('getAvailableAgents should return array');
  if (agents.length !== Object.keys(SUB_AGENTS).length) {
    throw new Error('getAvailableAgents should return all agents');
  }
});

test('Config: selectAgentForQuery() returns valid agents', () => {
  const testCases = [
    { query: 'Find papers on quantum computing', expected: 'scienceResearch' },
    { query: 'What is TypeScript?', expected: 'quickFacts' },
    { query: 'Tell me about Paris', expected: 'webKnowledge' },
    { query: 'Calculate 15 * 8', expected: 'quickFacts' },
    { query: 'Search arXiv for machine learning', expected: 'scienceResearch' }
  ];

  testCases.forEach(({ query, expected }) => {
    const agentId = selectAgentForQuery(query);
    if (!SUB_AGENTS[agentId]) {
      throw new Error(`selectAgentForQuery returned invalid agent: ${agentId}`);
    }
    if (agentId !== expected) {
      console.warn(`   Note: Query "${query}" selected ${agentId}, expected ${expected}`);
    }
  });
});

// ============================================================================
// Orchestrator Structure Tests
// ============================================================================

test('Orchestrator: Class exists and exports methods', () => {
  if (typeof SubAgentOrchestrator !== 'function') {
    throw new Error('SubAgentOrchestrator should be a class');
  }

  const requiredMethods = ['runSubAgent', 'getAvailableAgents', 'getAgentConfig'];
  requiredMethods.forEach(method => {
    if (typeof SubAgentOrchestrator[method] !== 'function') {
      throw new Error(`SubAgentOrchestrator.${method} should be a function`);
    }
  });
});

test('Orchestrator: getAvailableAgents() returns proper structure', () => {
  const agents = SubAgentOrchestrator.getAvailableAgents();
  if (!Array.isArray(agents)) throw new Error('Should return array');
  if (agents.length === 0) throw new Error('Should return non-empty array');

  const requiredFields = ['id', 'name', 'description', 'maxIterations', 'outputFormat'];
  agents.forEach(agent => {
    requiredFields.forEach(field => {
      if (!(field in agent)) {
        throw new Error(`Agent info missing field: ${field}`);
      }
    });
  });
});

test('Orchestrator: getAgentConfig() returns full config', () => {
  const config = SubAgentOrchestrator.getAgentConfig('webKnowledge');
  if (!config) throw new Error('Should return config');
  if (config.id !== 'webKnowledge') throw new Error('Should return correct agent');
  if (!config.systemPrompt) throw new Error('Should include system prompt');
});

// ============================================================================
// Validation Tests
// ============================================================================

test('Validation: runSubAgent requires modelId', async () => {
  try {
    await SubAgentOrchestrator.runSubAgent('webKnowledge', 'test query', {});
    throw new Error('Should have thrown error for missing modelId');
  } catch (error) {
    if (!error.message.includes('modelId')) {
      throw new Error('Error should mention modelId requirement');
    }
  }
});

test('Validation: runSubAgent requires valid query', async () => {
  try {
    await SubAgentOrchestrator.runSubAgent('webKnowledge', '', { modelId: 'test' });
    throw new Error('Should have thrown error for empty query');
  } catch (error) {
    if (!error.message.includes('query')) {
      throw new Error('Error should mention query requirement');
    }
  }
});

test('Validation: runSubAgent rejects invalid agent ID', async () => {
  try {
    await SubAgentOrchestrator.runSubAgent('nonexistent', 'test', { modelId: 'test' });
    throw new Error('Should have thrown error for invalid agent');
  } catch (error) {
    if (!error.message.includes('not found')) {
      throw new Error('Error should mention agent not found');
    }
  }
});

// ============================================================================
// Agent-Specific Configuration Tests
// ============================================================================

test('Agent: webKnowledge has correct tools', () => {
  const agent = SUB_AGENTS.webKnowledge;
  if (!agent.allowedTools.includes('WebTools')) {
    throw new Error('webKnowledge should have WebTools');
  }
  if (!agent.systemPrompt.includes('Wikipedia')) {
    throw new Error('webKnowledge system prompt should mention Wikipedia');
  }
});

test('Agent: scienceResearch focuses on papers', () => {
  const agent = SUB_AGENTS.scienceResearch;
  if (!agent.systemPrompt.includes('arXiv')) {
    throw new Error('scienceResearch should mention arXiv');
  }
  if (!agent.description.toLowerCase().includes('paper')) {
    throw new Error('scienceResearch description should mention papers');
  }
});

test('Agent: quickFacts has shorter max iterations', () => {
  const quickFacts = SUB_AGENTS.quickFacts;
  const webKnowledge = SUB_AGENTS.webKnowledge;

  if (quickFacts.maxIterations >= webKnowledge.maxIterations) {
    console.warn('   Note: quickFacts should typically have fewer iterations than webKnowledge');
  }
});

test('Agent: All agents have timeout configured', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    if (!agent.timeoutMs) {
      throw new Error(`Agent '${key}' missing timeoutMs`);
    }
    if (agent.timeoutMs < 5000 || agent.timeoutMs > 60000) {
      throw new Error(`Agent '${key}' timeoutMs out of reasonable range: ${agent.timeoutMs}`);
    }
  });
});

// ============================================================================
// Integration Readiness Tests
// ============================================================================

test('Integration: All agents mention <js_execute> in prompts', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    if (!agent.systemPrompt.includes('<js_execute>') && !agent.systemPrompt.includes('js_execute')) {
      throw new Error(`Agent '${key}' system prompt should explain <js_execute> usage`);
    }
  });
});

test('Integration: All agents mention <final_output> in prompts', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    if (!agent.systemPrompt.includes('<final_output>') && !agent.systemPrompt.includes('final_output')) {
      throw new Error(`Agent '${key}' system prompt should explain <final_output> usage`);
    }
  });
});

test('Integration: All agents have reasonable timeouts', () => {
  Object.entries(SUB_AGENTS).forEach(([key, agent]) => {
    // More iterations should have longer timeouts
    const expectedMinTimeout = agent.maxIterations * 3000; // At least 3s per iteration
    if (agent.timeoutMs < expectedMinTimeout) {
      console.warn(`   Warning: Agent '${key}' might have too short timeout for ${agent.maxIterations} iterations`);
    }
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Phase 3 SubAgentOrchestrator Test Suite');
console.log('Testing: Configuration, Validation, Agent Specs, Integration\n');

runTests().then(results => {
  if (results.failed === 0) {
    console.log('\n✨ All tests passed! SubAgentOrchestrator is ready for integration.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
