/**
 * Goals provider
 */

export const goalsProvider = {
  id: 'goals',

  collect({ snapshot }) {
    return snapshot.goals;
  },

  format(goals) {
    if (!Array.isArray(goals) || goals.length === 0) {
      return '';
    }

    return goals.map((goal) => {
      const heading = goal.heading || 'Goal';
      const content = goal.content || '';
      const notes = goal.notes ? ` | Notes: ${goal.notes}` : '';
      return `- [${goal.identifier}] ${heading}: ${content}${notes}`;
    }).join('\n');
  }
};

export default goalsProvider;
