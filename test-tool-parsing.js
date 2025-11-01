/**
 * Test script for refactored tool parsing system
 * Run with: node test-tool-parsing.js
 */

console.log('🔍 Testing Tool Parsing System Refactor...\n');

// Test 1: Import tool registry config
console.log('Test 1: Importing tool-registry-config.js...');
try {
  const registry = await import('./js/config/tool-registry-config.js');
  console.log('✅ Tool registry imported successfully');
  console.log(`   - Found ${Object.keys(registry.TOOL_DEFINITIONS).length} tool definitions`);
  console.log(`   - Tools: ${Object.keys(registry.TOOL_DEFINITIONS).join(', ')}`);
} catch (error) {
  console.error('❌ Failed to import tool registry:', error.message);
  process.exit(1);
}

// Test 2: Import vault reference resolver
console.log('\nTest 2: Importing vault-reference-resolver.js...');
try {
  const resolver = await import('./js/utils/vault-reference-resolver.js');
  console.log('✅ Vault reference resolver imported successfully');
  console.log(`   - Functions: resolveVaultReferences, expandVaultReferences, etc.`);
} catch (error) {
  console.error('❌ Failed to import vault resolver:', error.message);
  process.exit(1);
}

// Test 3: Import unified tool parser
console.log('\nTest 3: Importing unified-tool-parser.js...');
try {
  const parser = await import('./js/reasoning/parser/unified-tool-parser.js');
  console.log('✅ Unified tool parser imported successfully');
} catch (error) {
  console.error('❌ Failed to import unified parser:', error.message);
  process.exit(1);
}

// Test 4: Import updated parser-extractors
console.log('\nTest 4: Importing parser-extractors.js...');
try {
  const extractors = await import('./js/reasoning/parser/parser-extractors.js');
  console.log('✅ Parser extractors imported successfully');
} catch (error) {
  console.error('❌ Failed to import extractors:', error.message);
  process.exit(1);
}

// Test 5: Test basic functionality (validation now in tool-registry-config.js)
console.log('\nTest 5: Testing basic functionality...');
try {
  const { parseAttributes, isValidIdentifier } = await import('./js/config/tool-registry-config.js');

  // Test attribute parsing
  const attrs = parseAttributes('id="test123" type="text" delete');
  if (attrs.id === 'test123' && attrs.type === 'text' && attrs.delete === true) {
    console.log('✅ Attribute parsing works correctly');
  } else {
    throw new Error('Attribute parsing returned unexpected result');
  }

  // Test identifier validation
  if (isValidIdentifier('valid_id-123') && !isValidIdentifier('<invalid>')) {
    console.log('✅ Identifier validation works correctly');
  } else {
    throw new Error('Identifier validation failed');
  }

} catch (error) {
  console.error('❌ Functional test failed:', error.message);
  process.exit(1);
}

// Test 6: Test tool extraction
console.log('\nTest 6: Testing tool extraction...');
try {
  const { extractToolOperations } = await import('./js/reasoning/parser/unified-tool-parser.js');

  const testText = `
    {{<memory identifier="test1" heading="Test Memory" content="Test content" />}}
    {{<task identifier="task1" heading="Test Task" status="pending" />}}
  `;

  const memoryOps = extractToolOperations(testText, 'memory');
  const taskOps = extractToolOperations(testText, 'task');

  if (memoryOps.length === 1 && taskOps.length === 1) {
    console.log('✅ Tool extraction works correctly');
    console.log(`   - Extracted ${memoryOps.length} memory operations`);
    console.log(`   - Extracted ${taskOps.length} task operations`);
  } else {
    throw new Error(`Unexpected extraction count: memory=${memoryOps.length}, task=${taskOps.length}`);
  }

} catch (error) {
  console.error('❌ Tool extraction test failed:', error.message);
  process.exit(1);
}

// Test 7: Test vault reference utilities
console.log('\nTest 7: Testing vault reference utilities...');
try {
  const { extractVaultReferenceIds, countVaultReferences } = await import('./js/config/tool-registry-config.js');

  const testText = `
    Some text with {{<vaultref id="ref1" />}} and {{<vaultref id="ref2" />}}
  `;

  const ids = extractVaultReferenceIds(testText);
  const count = countVaultReferences(testText);

  if (ids.length === 2 && count === 2 && ids.includes('ref1') && ids.includes('ref2')) {
    console.log('✅ Vault reference utilities work correctly');
    console.log(`   - Found ${count} vault references`);
    console.log(`   - IDs: ${ids.join(', ')}`);
  } else {
    throw new Error(`Unexpected vault ref results: ids=${ids}, count=${count}`);
  }

} catch (error) {
  console.error('❌ Vault reference test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All tests passed! Tool parsing system refactor is working correctly.\n');
