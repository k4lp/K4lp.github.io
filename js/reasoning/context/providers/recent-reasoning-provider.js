/**
 * Recent reasoning provider
 */

export const recentReasoningProvider = {
  id: 'recentReasoning',

  collect({ snapshot, limits }) {
    return snapshot.getRecentReasoning(limits.reasoningLogEntries);
  },

  format(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return '';
    }

    return entries.join('\n\n---\n\n');
  }
};

export default recentReasoningProvider;
