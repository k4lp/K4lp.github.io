/**
 * Parser Extractors
 *
 * Extracts various blocks from LLM response text
 */

/**
 * Extract reasoning text blocks
 * @param {string} text - Full response text
 * @returns {string[]} Array of reasoning blocks
 */
export function extractReasoningBlocks(text) {
  const blocks = [];
  const regex = /{{<reasoning_text>}}([\s\S]*?){{<\/reasoning_text>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/**
 * Extract pure reasoning text (without any tool operations)
 * @param {string} text - Full response text
 * @returns {string} Clean reasoning text
 */
export function extractPureReasoningText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleanText = text;

  // Remove all tool operations
  cleanText = cleanText.replace(/{{<js_execute>}}[\s\S]*?{{<\/js_execute>}}/g, '');
  cleanText = cleanText.replace(/{{<datavault[^>]*>}}[\s\S]*?{{<\/datavault>}}/g, '');
  cleanText = cleanText.replace(/{{<(?:memory|task|goal|datavault)[^>]*\/>}}/g, '');
  cleanText = cleanText.replace(/{{<final_output>}}[\s\S]*?{{<\/final_output>}}/g, '');
  cleanText = cleanText.replace(/{{<datavault[^>]*action=["']request_read["'][^>]*\/>}}/g, '');
  cleanText = cleanText.replace(/{{<vaultref[^>]*\/>}}/g, '');
  cleanText = cleanText.replace(/{{<[^>]*\/>}}/g, '');
  cleanText = cleanText.replace(/{{<[^>]*>}}[\s\S]*?{{<\/[^>]*>}}/g, '');

  // Clean up whitespace
  cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleanText = cleanText.replace(/^\s*\n+|\n+\s*$/g, '');
  cleanText = cleanText.trim();

  const lines = cleanText.split('\n');
  const filteredLines = lines.filter(line => line.trim().length > 0);

  return filteredLines.join('\n');
}

/**
 * Extract JavaScript execution blocks
 * @param {string} text - Full response text
 * @returns {string[]} Array of JS code blocks
 */
export function extractJSExecutionBlocks(text) {
  const blocks = [];
  const regex = /{{<js_execute>}}([\s\S]*?){{<\/js_execute>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/**
 * Extract final output blocks
 * @param {string} text - Full response text
 * @returns {string[]} Array of final output blocks
 */
export function extractFinalOutputBlocks(text) {
  const blocks = [];
  const regex = /{{<final_output>}}([\s\S]*?){{<\/final_output>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/**
 * Extract memory operation tags
 * @param {string} text - Block text
 * @returns {Array<Object>} Array of memory operations
 */
export function extractMemoryOperations(text) {
  const operations = [];
  const regex = /{{<memory\s+([^>]*)\s*\/>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    operations.push({
      raw: match[0],
      attributes: match[1]
    });
  }
  return operations;
}

/**
 * Extract task operation tags
 * @param {string} text - Block text
 * @returns {Array<Object>} Array of task operations
 */
export function extractTaskOperations(text) {
  const operations = [];
  const regex = /{{<task\s+([^>]*)\s*\/>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    operations.push({
      raw: match[0],
      attributes: match[1]
    });
  }
  return operations;
}

/**
 * Extract goal operation tags
 * @param {string} text - Block text
 * @returns {Array<Object>} Array of goal operations
 */
export function extractGoalOperations(text) {
  const operations = [];
  const regex = /{{<goal\s+([^>]*)\s*\/>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    operations.push({
      raw: match[0],
      attributes: match[1]
    });
  }
  return operations;
}

/**
 * Extract vault operation tags (self-closing)
 * @param {string} text - Block text
 * @returns {Array<Object>} Array of vault operations
 */
export function extractVaultSelfClosingOperations(text) {
  const operations = [];
  const regex = /{{<datavault\s+([^>]*)\s*\/>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    operations.push({
      raw: match[0],
      attributes: match[1],
      hasContent: false
    });
  }
  return operations;
}

/**
 * Extract vault operation blocks (with content)
 * @param {string} text - Block text
 * @returns {Array<Object>} Array of vault operations with content
 */
export function extractVaultBlockOperations(text) {
  const operations = [];
  const regex = /{{<datavault\s+([^>]*)>}}([\s\S]*?){{<\/datavault>}}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    operations.push({
      raw: match[0],
      attributes: match[1],
      content: match[2].trim(),
      hasContent: true
    });
  }
  return operations;
}
