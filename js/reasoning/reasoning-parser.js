/**
 * GDRS Reasoning Parser
 * Parse LLM responses and apply operations
 *
 * REFACTORED: This file now serves as a compatibility layer
 * All functionality has been split into focused modules:
 * - parser/parser-extractors.js - Extract blocks from text
 * - parser/parser-validators.js - Validate and parse attributes
 * - parser/parser-appliers.js - Apply operations to storage
 * - parser/parser-core.js - Coordinate all parsing
 *
 * Import from this file for backward compatibility,
 * or import directly from parser/parser-core.js
 */

// Re-export everything from parser-core for backward compatibility
export { ReasoningParser } from './parser/parser-core.js';

// Re-export individual functions for direct use
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
} from './parser/parser-core.js';
