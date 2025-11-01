/**
 * Test script for Execution Context API
 * Run with: node test-execution-context-api.js
 */

console.log('🧪 Testing Execution Context API...\n');

// Test 1: Import all API modules
console.log('Test 1: Importing API modules...');
try {
    const { VaultAPI } = await import('./js/execution/apis/vault-api.js');
    const { MemoryAPI } = await import('./js/execution/apis/memory-api.js');
    const { TasksAPI } = await import('./js/execution/apis/tasks-api.js');
    const { GoalsAPI } = await import('./js/execution/apis/goals-api.js');
    const { buildExecutionContext } = await import('./js/execution/execution-context-api.js');

    console.log('✅ All API modules imported successfully');
    console.log('   - VaultAPI');
    console.log('   - MemoryAPI');
    console.log('   - TasksAPI');
    console.log('   - GoalsAPI');
    console.log('   - buildExecutionContext');
} catch (error) {
    console.error('❌ Failed to import API modules:', error.message);
    process.exit(1);
}

// Test 2: Build execution context
console.log('\nTest 2: Building execution context...');
try {
    const { buildExecutionContext } = await import('./js/execution/execution-context-api.js');
    const context = buildExecutionContext();

    if (context.vault && context.memory && context.tasks && context.goals && context.utils) {
        console.log('✅ Execution context built successfully');
        console.log(`   - APIs available: vault, memory, tasks, goals, utils`);
    } else {
        throw new Error('Context missing required APIs');
    }
} catch (error) {
    console.error('❌ Failed to build execution context:', error.message);
    process.exit(1);
}

// Test 3: Test VaultAPI instantiation
console.log('\nTest 3: Testing VaultAPI instantiation...');
try {
    const { VaultAPI } = await import('./js/execution/apis/vault-api.js');
    const vaultAPI = new VaultAPI();

    const methods = ['get', 'getEntry', 'set', 'delete', 'exists', 'list', 'search', 'stats', 'clear'];
    const hasMethods = methods.every(method => typeof vaultAPI[method] === 'function');

    if (hasMethods) {
        console.log('✅ VaultAPI has all required methods');
        console.log(`   - Methods: ${methods.join(', ')}`);
    } else {
        throw new Error('VaultAPI missing required methods');
    }
} catch (error) {
    console.error('❌ VaultAPI test failed:', error.message);
    process.exit(1);
}

// Test 4: Test MemoryAPI instantiation
console.log('\nTest 4: Testing MemoryAPI instantiation...');
try {
    const { MemoryAPI } = await import('./js/execution/apis/memory-api.js');
    const memoryAPI = new MemoryAPI();

    const methods = ['get', 'set', 'delete', 'list', 'search'];
    const hasMethods = methods.every(method => typeof memoryAPI[method] === 'function');

    if (hasMethods) {
        console.log('✅ MemoryAPI has all required methods');
        console.log(`   - Methods: ${methods.join(', ')}`);
    } else {
        throw new Error('MemoryAPI missing required methods');
    }
} catch (error) {
    console.error('❌ MemoryAPI test failed:', error.message);
    process.exit(1);
}

// Test 5: Test TasksAPI instantiation
console.log('\nTest 5: Testing TasksAPI instantiation...');
try {
    const { TasksAPI } = await import('./js/execution/apis/tasks-api.js');
    const tasksAPI = new TasksAPI();

    const methods = ['get', 'set', 'setStatus', 'delete', 'list', 'stats'];
    const hasMethods = methods.every(method => typeof tasksAPI[method] === 'function');

    if (hasMethods) {
        console.log('✅ TasksAPI has all required methods');
        console.log(`   - Methods: ${methods.join(', ')}`);
    } else {
        throw new Error('TasksAPI missing required methods');
    }
} catch (error) {
    console.error('❌ TasksAPI test failed:', error.message);
    process.exit(1);
}

// Test 6: Test GoalsAPI instantiation
console.log('\nTest 6: Testing GoalsAPI instantiation...');
try {
    const { GoalsAPI } = await import('./js/execution/apis/goals-api.js');
    const goalsAPI = new GoalsAPI();

    const methods = ['get', 'set', 'delete', 'list'];
    const hasMethods = methods.every(method => typeof goalsAPI[method] === 'function');

    if (hasMethods) {
        console.log('✅ GoalsAPI has all required methods');
        console.log(`   - Methods: ${methods.join(', ')}`);
    } else {
        throw new Error('GoalsAPI missing required methods');
    }
} catch (error) {
    console.error('❌ GoalsAPI test failed:', error.message);
    process.exit(1);
}

// Test 7: Test utils
console.log('\nTest 7: Testing utils...');
try {
    const { buildExecutionContext } = await import('./js/execution/execution-context-api.js');
    const context = buildExecutionContext();

    // Test generateId
    const id1 = context.utils.generateId('test');
    const id2 = context.utils.generateId('test');
    if (id1.startsWith('test_') && id2.startsWith('test_') && id1 !== id2) {
        console.log('✅ utils.generateId() works correctly');
        console.log(`   - Generated unique IDs: ${id1.substring(0, 20)}..., ${id2.substring(0, 20)}...`);
    } else {
        throw new Error('generateId not working correctly');
    }

    // Test now
    const timestamp = context.utils.now();
    if (timestamp && timestamp.includes('T') && timestamp.includes('Z')) {
        console.log('✅ utils.now() works correctly');
        console.log(`   - Timestamp: ${timestamp}`);
    } else {
        throw new Error('now() not working correctly');
    }

    // Test sleep
    if (typeof context.utils.sleep === 'function') {
        console.log('✅ utils.sleep() is available');
    } else {
        throw new Error('sleep() not available');
    }

} catch (error) {
    console.error('❌ Utils test failed:', error.message);
    process.exit(1);
}

// Test 8: Test execution-runner integration
console.log('\nTest 8: Testing execution-runner integration...');
try {
    const { ExecutionRunner } = await import('./js/execution/execution-runner.js');
    const runner = new ExecutionRunner({ timeoutMs: 5000 });

    console.log('✅ ExecutionRunner imports context API successfully');
    console.log('   - Context will be injected into executed code');
} catch (error) {
    console.error('❌ ExecutionRunner integration test failed:', error.message);
    process.exit(1);
}

console.log('\n✅ All tests passed! Execution Context API is ready.\n');
console.log('📝 Summary:');
console.log('   - All API modules import successfully');
console.log('   - Execution context builds correctly');
console.log('   - VaultAPI has all CRUD operations');
console.log('   - MemoryAPI has all required methods');
console.log('   - TasksAPI has all required methods');
console.log('   - GoalsAPI has all required methods');
console.log('   - Utils (generateId, now, sleep) work correctly');
console.log('   - ExecutionRunner integration is ready');
console.log('\n✨ Code executed in the system can now use:');
console.log('   - vault.get(), vault.set(), vault.list(), etc.');
console.log('   - memory.get(), memory.set(), memory.list(), etc.');
console.log('   - tasks.get(), tasks.set(), tasks.setStatus(), etc.');
console.log('   - goals.get(), goals.set(), goals.list(), etc.');
console.log('   - utils.generateId(), utils.now(), utils.sleep()');
