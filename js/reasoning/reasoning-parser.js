/**
 * GDRS Reasoning Parser
 * Parse LLM responses and apply operations
 *
 * REFACTORED: This file serves as a compatibility layer
 * All functionality uses centralized, registry-based architecture:
 * - config/tool-registry-config.js - Central tool definitions, patterns, validation
 * - parser/unified-tool-parser.js - Registry-based tool extraction & validation
 * - parser/parser-extractors.js - Extract reasoning/JS/output blocks
 * - parser/parser-appliers.js - Apply operations to storage
 * - parser/parser-core.js - Coordinate all parsing (uses unified parser)
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
