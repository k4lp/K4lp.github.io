/**
 * Tasks provider
 */

export const tasksProvider = {
  id: 'tasks',

  collect({ snapshot }) {
    return snapshot.tasks;
  },

  format(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return '';
    }

    return tasks.map((task) => {
      const heading = task.heading || 'Untitled Task';
      const content = task.content || '';
      const status = task.status || 'pending';
      const notes = task.notes ? ` | Notes: ${task.notes}` : '';
      return `- [${task.identifier}] ${heading} (${status}): ${content}${notes}`;
    }).join('\n');
  }
};

export default tasksProvider;
