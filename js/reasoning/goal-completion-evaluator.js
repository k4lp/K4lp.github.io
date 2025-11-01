import { Storage } from '../storage/storage.js';
import { GOAL_COMPLETION_RULES } from '../config/reasoning-config.js';

export class GoalCompletionEvaluator {
  constructor({ storage = Storage, rules = GOAL_COMPLETION_RULES } = {}) {
    this.storage = storage;
    this.rules = { ...GOAL_COMPLETION_RULES, ...rules };
  }

  areGoalsComplete() {
    const goals = this.storage.loadGoals();
    const tasks = this.storage.loadTasks();

    if (this.rules.treatMissingGoalsAsIncomplete && goals.length === 0) {
      return false;
    }

    if (this.rules.requireNoActiveTasks) {
      const activeStatuses = Array.isArray(this.rules.activeTaskStatuses)
        ? this.rules.activeTaskStatuses
        : [];
      const hasActiveTasks = tasks.some((task) => activeStatuses.includes(task.status));
      if (hasActiveTasks) {
        return false;
      }
    }

    return goals.length > 0;
  }
}

export const goalCompletionEvaluator = new GoalCompletionEvaluator();

export default GoalCompletionEvaluator;
