/**
 * Recent executions provider
 */

function formatResult(result) {
  if (!result) return '';
  try {
    if (typeof result === 'string') {
      return result;
    }
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

export const recentExecutionsProvider = {
  id: 'recentExecutions',

  collect({ snapshot, limits }) {
    return snapshot.getRecentExecutions(limits.executionLogEntries);
  },

  format(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      return '';
    }

    return entries.map((entry) => {
      const status = entry.success ? 'SUCCESS' : 'FAILURE';
      const meta = entry.success
        ? `RESULT: ${formatResult(entry.result)}`
        : `ERROR: ${entry.error?.message || entry.error || 'Unknown error'}`;
      return `[${entry.timestamp || 'unknown'}] ${status} (${entry.source || 'auto'}): ${meta}`;
    }).join('\n');
  }
};

export default recentExecutionsProvider;
