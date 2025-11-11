/**
 * TOKEN ESTIMATOR UTILITY
 *
 * Provides token estimation for context usage calculation.
 * Uses GPT-4 tokenizer approximation: ~4 characters = 1 token
 *
 * Used by:
 * - CompactionOrchestrator (trigger logic)
 * - CompactionButton (display usage)
 * - CompactionMetrics (savings calculation)
 */

import { Storage } from '../storage/storage.js';

/**
 * Estimate tokens from text
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokens(text) {
  if (!text) return 0;
  // GPT tokenizer approximation: ~4 chars = 1 token
  return Math.ceil(text.length / 4);
}

/**
 * Estimate current context window usage
 * @returns {Object} { tokens, percentage, breakdown }
 */
export function estimateContextUsage() {
  const CONTEXT_LIMIT = 32000; // Gemini 1.5 Flash

  // Get reasoning log
  const reasoningLog = Storage.loadReasoningLog() || [];
  const reasoningText = Array.isArray(reasoningLog) ? reasoningLog.join('\n') : '';
  const reasoningTokens = estimateTokens(reasoningText);

  // Get execution log
  const executionLog = Storage.loadExecutionLog() || [];
  const executionText = JSON.stringify(executionLog);
  const executionTokens = estimateTokens(executionText);

  // Get tool activity log
  const toolActivityLog = Storage.loadToolActivityLog() || [];
  const toolActivityText = JSON.stringify(toolActivityLog);
  const toolActivityTokens = estimateTokens(toolActivityText);

  // Fixed overhead (system prompt, query, state, etc.)
  const fixedTokens = 8000;

  // Total
  const totalTokens = reasoningTokens + executionTokens + toolActivityTokens + fixedTokens;
  const percentage = totalTokens / CONTEXT_LIMIT;

  return {
    tokens: totalTokens,
    percentage: percentage,
    percentageFormatted: `${(percentage * 100).toFixed(1)}%`,
    breakdown: {
      reasoning: reasoningTokens,
      execution: executionTokens,
      toolActivity: toolActivityTokens,
      fixed: fixedTokens
    },
    limit: CONTEXT_LIMIT,
    available: CONTEXT_LIMIT - totalTokens
  };
}

/**
 * Estimate tokens in specific log entries
 * @param {Array} entries - Log entries
 * @returns {number} Estimated token count
 */
export function estimateLogTokens(entries) {
  if (!Array.isArray(entries)) return 0;

  const text = entries.join('\n');
  return estimateTokens(text);
}

/**
 * Estimate compression savings
 * @param {number} before - Tokens before
 * @param {number} after - Tokens after
 * @returns {Object} Savings info
 */
export function calculateCompressionSavings(before, after) {
  const saved = before - after;
  const ratio = after / before;
  const reductionPercentage = (1 - ratio) * 100;

  return {
    tokensBefore: before,
    tokensAfter: after,
    tokensSaved: saved,
    compressionRatio: ratio,
    reductionPercentage: reductionPercentage,
    reductionFormatted: `${reductionPercentage.toFixed(1)}%`
  };
}

/**
 * Check if compaction should be triggered
 * @param {number} threshold - Threshold (0.0 to 1.0)
 * @returns {boolean} Should compact
 */
export function shouldTriggerCompaction(threshold = 0.85) {
  const usage = estimateContextUsage();
  return usage.percentage >= threshold;
}

/**
 * Get status based on context usage
 * @returns {string} 'healthy' | 'acceptable' | 'critical' | 'overflow'
 */
export function getContextStatus() {
  const usage = estimateContextUsage();
  const pct = usage.percentage;

  if (pct < 0.60) return 'healthy';
  if (pct < 0.80) return 'acceptable';
  if (pct < 1.00) return 'critical';
  return 'overflow';
}

/**
 * Get human-readable context status
 * @returns {Object} Status info
 */
export function getContextStatusInfo() {
  const status = getContextStatus();
  const usage = estimateContextUsage();

  const statusInfo = {
    healthy: {
      icon: '✅',
      label: 'Healthy',
      color: '#27ae60',
      message: 'Context usage is optimal'
    },
    acceptable: {
      icon: '🟡',
      label: 'Acceptable',
      color: '#f39c12',
      message: 'Context usage is moderate - consider compacting soon'
    },
    critical: {
      icon: '🔴',
      label: 'Critical',
      color: '#e74c3c',
      message: 'Context usage is critical - compaction recommended'
    },
    overflow: {
      icon: '⚠️',
      label: 'Overflow',
      color: '#c0392b',
      message: 'Context has overflowed - immediate compaction needed'
    }
  };

  return {
    status,
    ...statusInfo[status],
    usage: usage.percentageFormatted,
    tokens: usage.tokens,
    available: usage.available
  };
}

export default {
  estimateTokens,
  estimateContextUsage,
  estimateLogTokens,
  calculateCompressionSavings,
  shouldTriggerCompaction,
  getContextStatus,
  getContextStatusInfo
};
