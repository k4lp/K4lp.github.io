/**
 * Parser Extractors
 *
 * Extracts various blocks from LLM response text.
 * All patterns are now centralized in tool-registry-config.js.
 */

import { TOOL_DEFINITIONS } from '../../config/tool-registry-config.js';

/**
 * Generic block extraction using centralized patterns
 * @param {string} text - Full response text
 * @param {RegExp|string} pattern - Extraction pattern
 * @returns {string[]} Array of extracted blocks
 */
function extractBlocks(text, pattern) {
  const blocks = [];
  const regex = new RegExp(pattern);
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/**
 * Extract reasoning text blocks
 * @param {string} text - Full response text
 * @returns {string[]} Array of reasoning blocks
 */
export function extractReasoningBlocks(text) {
  return extractBlocks(text, TOOL_DEFINITIONS.REASONING_TEXT.patterns.block);
}

/**
 * Extract pure reasoning text (without any tool operations)
 * Uses centralized patterns from TOOL_DEFINITIONS
 * @param {string} text - Full response text
 * @returns {string} Clean reasoning text
 */
export function extractPureReasoningText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleanText = text;

  // Remove all tool operations using centralized patterns
  Object.values(TOOL_DEFINITIONS).forEach(tool => {
    if (tool.patterns.block) {
      cleanText = cleanText.replace(new RegExp(tool.patterns.block), '');
    }
    if (tool.patterns.selfClosing) {
      cleanText = cleanText.replace(new RegExp(tool.patterns.selfClosing), '');
    }
  });

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
  return extractBlocks(text, TOOL_DEFINITIONS.JS_EXECUTE.patterns.block);
}

/**
 * Extract final output blocks
 * @param {string} text - Full response text
 * @returns {string[]} Array of final output blocks
 */
export function extractFinalOutputBlocks(text) {
  return extractBlocks(text, TOOL_DEFINITIONS.FINAL_OUTPUT.patterns.block);
}

/**
 * NOTE: Individual tool extraction functions (extractMemoryOperations, extractTaskOperations, etc.)
 * have been removed as they're now handled by the centralized unified-tool-parser.js.
 *
 * Use extractToolOperations(text, toolId) from unified-tool-parser.js instead:
 *   extractToolOperations(text, 'memory')
 *   extractToolOperations(text, 'task')
 *   extractToolOperations(text, 'goal')
 *   extractToolOperations(text, 'datavault')
 */
