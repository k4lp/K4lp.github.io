/**
 * Parser Core
 *
 * Main coordination module for parsing LLM responses.
 * Now uses the centralized unified-tool-parser for extraction and validation.
 */

import {
  extractReasoningBlocks,
  extractPureReasoningText,
  extractJSExecutionBlocks,
  extractFinalOutputBlocks
} from './parser-extractors.js';

import {
  extractAllToolOperations,
  parseToolOperations,
  extractToolOperations
} from './unified-tool-parser.js';

import { parseAttributes } from '../../config/tool-registry-config.js';

import {
  applyOperations,
  applyVaultOperation,
  applyMemoryOperation,
  applyTaskOperation,
  applyGoalOperation
} from './parser-appliers.js';

/**
 * ReasoningParser
 *
 * Main parser object that coordinates extraction, parsing, and application of operations.
 * Uses centralized unified-tool-parser for dynamic, registry-based parsing.
 */
export const ReasoningParser = {
  /**
   * Extract reasoning text blocks
   * @param {string} text - Full response text
   * @returns {string[]} Array of reasoning blocks
   */
  extractReasoningBlocks,

  /**
   * Extract pure reasoning text (without tool operations)
   * @param {string} text - Full response text
   * @returns {string} Clean reasoning text
   */
  extractPureReasoningText,

  /**
   * Extract JavaScript execution blocks
   * @param {string} text - Full response text
   * @returns {string[]} Array of JS code blocks
   */
  extractJSExecutionBlocks,

  /**
   * Extract final output blocks
   * @param {string} text - Full response text
   * @returns {string[]} Array of final output blocks
   */
  extractFinalOutputBlocks,

  /**
   * Parse all operations from block text
   * Uses centralized unified-tool-parser for dynamic extraction
   * @param {string} blockText - Text block containing operations
   * @returns {Object} Parsed operations object
   */
  parseOperations(blockText) {
    const operations = {
      memories: [],
      tasks: [],
      goals: [],
      vault: [],
      jsExecute: [],
      finalOutput: []
    };

    // Use centralized tool extraction for storage tools
    const memoryOps = extractToolOperations(blockText, 'memory');
    memoryOps.forEach(op => {
      if (op.attributes && (op.attributes.identifier || op.attributes.heading)) {
        operations.memories.push(op.attributes);
      }
    });

    const taskOps = extractToolOperations(blockText, 'task');
    taskOps.forEach(op => {
      if (op.attributes && (op.attributes.identifier || op.attributes.heading)) {
        operations.tasks.push(op.attributes);
      }
    });

    const goalOps = extractToolOperations(blockText, 'goal');
    goalOps.forEach(op => {
      if (op.attributes && (op.attributes.identifier || op.attributes.heading)) {
        operations.goals.push(op.attributes);
      }
    });

    const vaultOps = extractToolOperations(blockText, 'datavault');
    vaultOps.forEach(op => {
      if (op.attributes && op.attributes.id) {
        // Merge content if it's a block operation
        const attrs = { ...op.attributes };
        if (op.content) {
          attrs.content = op.content;
        }
        operations.vault.push(attrs);
      }
    });

    // Extract execution and output blocks
    operations.jsExecute = extractJSExecutionBlocks(blockText);
    operations.finalOutput = extractFinalOutputBlocks(blockText);

    return operations;
  },

  /**
   * Parse attributes from tag attribute string
   * Uses centralized parser from tool-registry-config
   * @param {string} attrString - Attribute string
   * @returns {Object} Parsed attributes
   */
  parseAttributes,

  /**
   * Apply all parsed operations (async)
   * @param {Object} operations - Parsed operations object
   * @returns {Promise<void>}
   */
  applyOperations,

  /**
   * Apply vault operation
   * @param {Object} op - Vault operation
   * @param {number} [index] - Operation index
   */
  applyVaultOperation,

  /**
   * Apply memory operation
   * @param {Object} op - Memory operation
   */
  applyMemoryOperation,

  /**
   * Apply task operation
   * @param {Object} op - Task operation
   */
  applyTaskOperation,

  /**
   * Apply goal operation
   * @param {Object} op - Goal operation
   */
  applyGoalOperation,

  /**
   * Advanced: Extract all tool operations using unified parser
   * @param {string} text - Text to parse
   * @param {Object} options - Extraction options
   * @returns {Object} Map of toolId -> operations array
   */
  extractAllToolOperations,

  /**
   * Advanced: Parse specific tool operations with validation
   * @param {string} text - Text to parse
   * @param {string} toolId - Tool ID from registry
   * @returns {Object} Parse result with validation
   */
  parseToolOperations
};

// Export individual functions for tree-shaking
export {
  extractReasoningBlocks,
  extractPureReasoningText,
  extractJSExecutionBlocks,
  extractFinalOutputBlocks,
  parseAttributes,
  applyOperations,
  applyVaultOperation,
  applyMemoryOperation,
  applyTaskOperation,
  applyGoalOperation,
  extractAllToolOperations,
  parseToolOperations
};
