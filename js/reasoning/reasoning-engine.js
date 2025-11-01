/**
 * GDRS Reasoning Engine
 * Orchestrates prompt construction and goal completion evaluation using
 * modular, configurable components.
 */

import {
  MAX_ITERATIONS,
  SYSTEM_PROMPT,
  REASONING_STRATEGIC_INSTRUCTION
} from '../core/constants.js';
import { ReasoningContextBuilder } from './context/context-builder.js';
import { goalCompletionEvaluator as defaultGoalEvaluator } from './goal-completion-evaluator.js';

let contextBuilder = new ReasoningContextBuilder();
let goalEvaluator = defaultGoalEvaluator;

export const ReasoningEngine = {
  /**
   * Override internal dependencies for advanced customisation.
   * @param {Object} options
   * @param {ReasoningContextBuilder} [options.contextBuilder]
   * @param {GoalCompletionEvaluator} [options.goalEvaluator]
   */
  configure(options = {}) {
    if (options.contextBuilder) {
      contextBuilder = options.contextBuilder;
    }
    if (options.goalEvaluator) {
      goalEvaluator = options.goalEvaluator;
    }
  },

  /**
   * Build the full reasoning prompt using the configured context builder.
   * @param {string} query
   * @param {number} iteration
   * @returns {Promise<string>}
   */
  async buildContextPrompt(query, iteration) {
    return contextBuilder.buildPrompt({
      query,
      iteration,
      maxIterations: MAX_ITERATIONS,
      systemPrompt: SYSTEM_PROMPT,
      instructions: REASONING_STRATEGIC_INSTRUCTION
    });
  },

  /**
   * Evaluate whether goals are complete according to configured rules.
   * @returns {boolean}
   */
  checkGoalsComplete() {
    return goalEvaluator.areGoalsComplete();
  },

  /**
   * Expose internal collaborators for advanced integration scenarios.
   */
  getContextBuilder() {
    return contextBuilder;
  },

  getGoalEvaluator() {
    return goalEvaluator;
  }
};

export default ReasoningEngine;
