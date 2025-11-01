/**
 * Parser Core
 *
 * Main coordination module for parsing LLM responses.
 * Now uses the centralized unified-tool-parser for extraction and validation.
 */

import {
  extractReasoningBlocks,
  extractPureReasoningText
} from './parser-extractors.js';

import {
  extractAllToolOperations,
  parseToolOperations
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
   * Parse all operations from block text
   * Uses centralized unified-tool-parser for dynamic extraction
   * @param {string} blockText - Text block containing operations
   * @returns {Object} Parsed operations object
   */
  parseOperations(blockText) {
    // Use the unified parser to find ALL tools dynamically
    const allOps = extractAllToolOperations(blockText);

    // Translate the unified format to the format applyOperations expects
    const operations = {
      memories: (allOps.memory || []).map(op => op.attributes),
      tasks: (allOps.task || []).map(op => op.attributes),
      goals: (allOps.goal || []).map(op => op.attributes),
      vault: (allOps.datavault || []).map(op => {
        // Merge content if it's a block operation
        const attrs = { ...op.attributes };
        if (op.content) {
          attrs.content = op.content;
        }
        return attrs;
      }),
      jsExecute: (allOps.js_execute || []).map(op => op.content),
      finalOutput: (allOps.final_output || []).map(op => op.content)
    };

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
  parseAttributes,
  applyOperations,
  applyVaultOperation,
  applyMemoryOperation,
  applyTaskOperation,
  applyGoalOperation,
  extractAllToolOperations,
  parseToolOperations
};
