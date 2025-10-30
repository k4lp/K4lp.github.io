/**
 * Parser Core
 *
 * Main coordination module for parsing LLM responses
 * This module provides the same API as the original reasoning-parser.js
 */

import {
  extractReasoningBlocks,
  extractPureReasoningText,
  extractJSExecutionBlocks,
  extractFinalOutputBlocks,
  extractMemoryOperations,
  extractTaskOperations,
  extractGoalOperations,
  extractVaultSelfClosingOperations,
  extractVaultBlockOperations
} from './parser-extractors.js';

import {
  parseAttributes,
  validateMemoryOperation,
  validateTaskOperation,
  validateGoalOperation,
  validateVaultOperation
} from './parser-validators.js';

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
 * Main parser object that coordinates extraction, parsing, and application of operations
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

    // Parse memory operations
    const memoryOps = extractMemoryOperations(blockText);
    memoryOps.forEach(op => {
      const attrs = parseAttributes(op.attributes);
      if (attrs && (attrs.identifier || attrs.heading)) {
        operations.memories.push(attrs);
      }
    });

    // Parse task operations
    const taskOps = extractTaskOperations(blockText);
    taskOps.forEach(op => {
      const attrs = parseAttributes(op.attributes);
      if (attrs && (attrs.identifier || attrs.heading)) {
        operations.tasks.push(attrs);
      }
    });

    // Parse goal operations
    const goalOps = extractGoalOperations(blockText);
    goalOps.forEach(op => {
      const attrs = parseAttributes(op.attributes);
      if (attrs && (attrs.identifier || attrs.heading)) {
        operations.goals.push(attrs);
      }
    });

    // Parse vault self-closing operations
    const vaultSelfOps = extractVaultSelfClosingOperations(blockText);
    vaultSelfOps.forEach(op => {
      const attrs = parseAttributes(op.attributes);
      if (attrs && attrs.id) {
        operations.vault.push(attrs);
      }
    });

    // Parse vault block operations (with content)
    const vaultBlockOps = extractVaultBlockOperations(blockText);
    vaultBlockOps.forEach(op => {
      const attrs = parseAttributes(op.attributes);
      if (attrs && attrs.id) {
        attrs.content = op.content;
        operations.vault.push(attrs);
      }
    });

    // Parse JavaScript execution blocks
    const jsExecuteBlocks = extractJSExecutionBlocks(blockText);
    operations.jsExecute = jsExecuteBlocks;

    // Parse final output blocks
    const finalOutputBlocks = extractFinalOutputBlocks(blockText);
    operations.finalOutput = finalOutputBlocks;

    return operations;
  },

  /**
   * Parse attributes from tag attribute string
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
  applyGoalOperation
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
  applyGoalOperation
};
