/**
 * External Knowledge Provider
 *
 * Injects sub-agent results into the main reasoning context.
 * Only includes results when:
 * 1. Sub-agent feature is enabled
 * 2. A result is available from storage
 * 3. The result was successful
 *
 * This follows the context pollution prevention pattern:
 * - Only include if enabled AND has data
 * - Clear, formatted presentation
 * - Source attribution
 */

import { Storage } from '../../../storage/storage.js';

export const externalKnowledgeProvider = {
  id: 'externalKnowledge',

  /**
   * Collect sub-agent result from storage
   * @param {Object} context - Context object (contains snapshot)
   * @returns {Object|null} Sub-agent result or null if not available
   */
  collect() {
    // Check if sub-agent feature is enabled
    const isEnabled = Storage.loadSubAgentEnabled();
    if (!isEnabled) {
      return null; // Feature disabled, don't include in context
    }

    // Load sub-agent result from storage
    const result = Storage.loadSubAgentResult();

    // Only include if result exists and was successful
    if (!result || !result.success) {
      return null;
    }

    return result;
  },

  /**
   * Format sub-agent result for inclusion in main prompt
   * @param {Object} result - Sub-agent result
   * @returns {string} Formatted text for prompt
   */
  format(result) {
    if (!result || !result.content) {
      return '';
    }

    // Calculate time ago
    const timeAgo = result.timestamp
      ? this._formatTimeAgo(result.timestamp)
      : 'recently';

    return `## EXTERNAL KNOWLEDGE

The following information was retrieved by the **${result.source}** sub-agent ${timeAgo}:

**Query:** ${result.query || '(query not recorded)'}

**Findings:**
${result.content}

**Metadata:**
- Agent: ${result.agentId || 'unknown'}
- Iterations: ${result.iterations || 0}
- Execution Time: ${result.executionTime || 0}ms
- Format: ${result.format || 'text'}

*You can use this information to inform your analysis and provide more comprehensive answers to the user.*`;
  },

  /**
   * Format timestamp as relative time
   * @private
   */
  _formatTimeAgo(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) return 'just now';
      if (diffMinutes === 1) return '1 minute ago';
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch (error) {
      return 'recently';
    }
  }
};

export default externalKnowledgeProvider;
