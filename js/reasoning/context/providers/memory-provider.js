/**
 * Memory provider
 */

export const memoryProvider = {
  id: 'memory',

  collect({ snapshot }) {
    return snapshot.memory;
  },

  format(memory) {
    if (!Array.isArray(memory) || memory.length === 0) {
      return '';
    }

    return memory.map((item) => {
      const heading = item.heading || 'Memory';
      const content = item.content || '';
      const notes = item.notes ? ` | Notes: ${item.notes}` : '';
      return `- [${item.identifier}] ${heading}: ${content}${notes}`;
    }).join('\n');
  }
};

export default memoryProvider;
