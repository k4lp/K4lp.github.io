/**
 * SandboxExecutor Test Suite
 *
 * Tests for the isolated execution environment used by sub-agents.
 * Verifies:
 * - Basic code execution
 * - Console capture
 * - Error handling
 * - Timeout enforcement
 * - WebTools injection
 * - Isolation (no main session pollution)
 */

import { SandboxExecutor, executeSandboxed } from './sandbox-executor.js';
import WebTools from '../subagent/tools/web-tools.js';

const tests = [];
const results = { passed: 0, failed: 0, errors: [] };

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🧪 Starting SandboxExecutor Tests\n');

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
// Basic Execution Tests
// ============================================================================

test('Basic: Execute simple code', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute('return 42;');

  if (!result.success) throw new Error('Expected success');
  if (result.result !== 42) throw new Error(`Expected 42, got ${result.result}`);
  if (!result.executionTime) throw new Error('Expected executionTime');
});

test('Basic: Execute async code', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    await new Promise(resolve => setTimeout(resolve, 10));
    return 'async result';
  `);

  if (!result.success) throw new Error('Expected success');
  if (result.result !== 'async result') throw new Error(`Expected 'async result', got ${result.result}`);
});

test('Basic: Execute code with calculations', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    const sum = [1, 2, 3, 4, 5].reduce((a, b) => a + b, 0);
    return sum;
  `);

  if (!result.success) throw new Error('Expected success');
  if (result.result !== 15) throw new Error(`Expected 15, got ${result.result}`);
});

test('Basic: Convenience function executeSandboxed', async () => {
  const result = await executeSandboxed('return "convenience";');

  if (!result.success) throw new Error('Expected success');
  if (result.result !== 'convenience') throw new Error('Expected "convenience"');
});

// ============================================================================
// Console Capture Tests
// ============================================================================

test('Console: Capture console.log', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    console.log('Hello World');
    return 'done';
  `);

  if (!result.success) throw new Error('Expected success');
  if (!result.consoleOutput.includes('Hello World')) {
    throw new Error('Expected "Hello World" in console output');
  }
  if (result.logs.length === 0) throw new Error('Expected logs to be captured');
});

test('Console: Capture multiple log types', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    console.log('Log message');
    console.warn('Warning message');
    console.error('Error message');
    return 'done';
  `);

  if (!result.success) throw new Error('Expected success');
  if (!result.consoleOutput.includes('Log message')) {
    throw new Error('Expected log message');
  }
  if (!result.consoleOutput.includes('Warning message')) {
    throw new Error('Expected warning message');
  }
  if (!result.consoleOutput.includes('Error message')) {
    throw new Error('Expected error message');
  }
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test('Error: Handle runtime errors', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    throw new Error('Test error');
  `);

  if (result.success) throw new Error('Expected failure');
  if (!result.error) throw new Error('Expected error object');
  if (!result.error.message.includes('Test error')) {
    throw new Error('Expected error message');
  }
  if (!result.error.stack) throw new Error('Expected error stack');
});

test('Error: Handle syntax errors', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute('this is invalid syntax {{{');

  if (result.success) throw new Error('Expected failure');
  if (!result.error) throw new Error('Expected error object');
  if (!result.error.message.includes('Compilation failed')) {
    throw new Error('Expected compilation error');
  }
});

test('Error: Handle reference errors', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute('return undefinedVariable;');

  if (result.success) throw new Error('Expected failure');
  if (!result.error.message.includes('undefinedVariable')) {
    throw new Error('Expected reference error');
  }
});

// ============================================================================
// Timeout Tests
// ============================================================================

test('Timeout: Enforce execution timeout', async () => {
  const sandbox = new SandboxExecutor({ timeoutMs: 100 });
  const result = await sandbox.execute(`
    // Infinite loop
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  `);

  if (result.success) throw new Error('Expected timeout failure');
  if (!result.error.message.includes('timed out')) {
    throw new Error(`Expected timeout error, got: ${result.error.message}`);
  }
});

test('Timeout: Fast execution completes before timeout', async () => {
  const sandbox = new SandboxExecutor({ timeoutMs: 1000 });
  const result = await sandbox.execute('return "fast";');

  if (!result.success) throw new Error('Expected success (fast execution)');
  if (result.executionTime > 1000) throw new Error('Expected fast execution');
});

// ============================================================================
// Context Injection Tests
// ============================================================================

test('Context: Base APIs available (vault, memory, tasks, goals, utils)', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    const apis = {
      hasVault: typeof vault !== 'undefined',
      hasMemory: typeof memory !== 'undefined',
      hasTasks: typeof tasks !== 'undefined',
      hasGoals: typeof goals !== 'undefined',
      hasUtils: typeof utils !== 'undefined'
    };
    return apis;
  `);

  if (!result.success) throw new Error('Expected success');
  if (!result.result.hasVault) throw new Error('Expected vault API');
  if (!result.result.hasMemory) throw new Error('Expected memory API');
  if (!result.result.hasTasks) throw new Error('Expected tasks API');
  if (!result.result.hasGoals) throw new Error('Expected goals API');
  if (!result.result.hasUtils) throw new Error('Expected utils API');
});

test('Context: Utils API functions work', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    const id = utils.generateId('test');
    const timestamp = utils.now();
    await utils.sleep(5);
    return { id, timestamp, idValid: id.startsWith('test_') };
  `);

  if (!result.success) throw new Error('Expected success');
  if (!result.result.idValid) throw new Error('Expected valid ID from utils.generateId');
  if (!result.result.timestamp) throw new Error('Expected timestamp from utils.now');
});

test('Context: Inject WebTools into sandbox', async () => {
  const sandbox = new SandboxExecutor({
    isolatedContext: { WebTools }
  });

  const result = await sandbox.execute(`
    const hasWebTools = typeof WebTools !== 'undefined';
    const hasSearchAll = typeof WebTools.searchAll === 'function';
    const hasWikipedia = typeof WebTools.wikipedia !== 'undefined';
    return { hasWebTools, hasSearchAll, hasWikipedia };
  `);

  if (!result.success) throw new Error('Expected success');
  if (!result.result.hasWebTools) throw new Error('Expected WebTools in context');
  if (!result.result.hasSearchAll) throw new Error('Expected WebTools.searchAll');
  if (!result.result.hasWikipedia) throw new Error('Expected WebTools.wikipedia');
});

test('Context: Multiple custom contexts can be injected', async () => {
  const customAPI = {
    greet: (name) => `Hello, ${name}!`,
    add: (a, b) => a + b
  };

  const sandbox = new SandboxExecutor({
    isolatedContext: {
      CustomAPI: customAPI,
      customValue: 42
    }
  });

  const result = await sandbox.execute(`
    const greeting = CustomAPI.greet('World');
    const sum = CustomAPI.add(10, 20);
    return { greeting, sum, customValue };
  `);

  if (!result.success) throw new Error('Expected success');
  if (result.result.greeting !== 'Hello, World!') {
    throw new Error('Expected custom API to work');
  }
  if (result.result.sum !== 30) throw new Error('Expected custom function to work');
  if (result.result.customValue !== 42) throw new Error('Expected custom value');
});

// ============================================================================
// Isolation Tests
// ============================================================================

test('Isolation: Instrumented flag defaults to false', async () => {
  const sandbox = new SandboxExecutor();
  if (sandbox.instrumented !== false) {
    throw new Error('Expected instrumented to default to false');
  }
});

test('Isolation: Can be explicitly set to instrumented mode', async () => {
  const sandbox = new SandboxExecutor({ instrumented: true });
  if (sandbox.instrumented !== true) {
    throw new Error('Expected instrumented to be true');
  }
});

test('Isolation: Result structure is consistent', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute('return "test";');

  // Check required fields
  const requiredFields = [
    'success', 'result', 'logs', 'consoleOutput',
    'executionTime', 'startedAt', 'finishedAt', 'code', 'analysis'
  ];

  requiredFields.forEach(field => {
    if (!(field in result)) {
      throw new Error(`Expected field '${field}' in result`);
    }
  });

  // Check analysis structure
  if (!result.analysis.charCount && result.analysis.charCount !== 0) {
    throw new Error('Expected charCount in analysis');
  }
  if (!result.analysis.lineCount && result.analysis.lineCount !== 0) {
    throw new Error('Expected lineCount in analysis');
  }
});

// ============================================================================
// Integration Tests
// ============================================================================

test('Integration: Execute complex multi-step code', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    // Step 1: Create some data
    const data = [1, 2, 3, 4, 5];
    console.log('Data created:', data);

    // Step 2: Process data
    const doubled = data.map(x => x * 2);
    console.log('Doubled:', doubled);

    // Step 3: Calculate result
    const sum = doubled.reduce((a, b) => a + b, 0);
    console.log('Sum:', sum);

    // Step 4: Return structured result
    return {
      original: data,
      processed: doubled,
      result: sum,
      timestamp: utils.now()
    };
  `);

  if (!result.success) throw new Error('Expected success');
  if (result.result.result !== 30) throw new Error('Expected sum of 30');
  if (!result.result.timestamp) throw new Error('Expected timestamp');
  if (!result.consoleOutput.includes('Sum:')) {
    throw new Error('Expected console output');
  }
});

test('Integration: Async operations with error recovery', async () => {
  const sandbox = new SandboxExecutor();
  const result = await sandbox.execute(`
    let results = [];

    // Try multiple operations
    try {
      await utils.sleep(5);
      results.push('step1');
    } catch (e) {
      results.push('error1');
    }

    try {
      const value = 10 + 20;
      results.push(value);
    } catch (e) {
      results.push('error2');
    }

    return results;
  `);

  if (!result.success) throw new Error('Expected success');
  if (!Array.isArray(result.result)) throw new Error('Expected array result');
  if (result.result[0] !== 'step1') throw new Error('Expected step1');
  if (result.result[1] !== 30) throw new Error('Expected 30');
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('Phase 2 SandboxExecutor Test Suite');
console.log('Testing: Execution, Console, Errors, Timeout, Context, Isolation\n');

runTests().then(results => {
  if (results.failed === 0) {
    console.log('\n✨ All tests passed! SandboxExecutor is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Review errors above.');
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});
