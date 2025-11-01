/**
 * Tool operation appliers
 *
 * Delegates all reasoning tool execution to the configurable pipeline
 * architecture so new behaviours can be introduced without touching callers.
 */

import { ToolOperationPipeline } from '../tools/tool-operation-pipeline.js';

let activePipeline = new ToolOperationPipeline();

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeOperations(operations = {}) {
  return {
    vault: toArray(operations.vault),
    memories: toArray(operations.memories),
    tasks: toArray(operations.tasks),
    goals: toArray(operations.goals),
    jsExecute: toArray(operations.jsExecute),
    finalOutput: toArray(operations.finalOutput)
  };
}

/**
 * Allow callers to inject a custom pipeline or configuration.
 * @param {ToolOperationPipeline|Object} options
 * @returns {ToolOperationPipeline}
 */
export function configureToolPipeline(options = {}) {
  if (options instanceof ToolOperationPipeline) {
    activePipeline = options;
  } else {
    activePipeline = new ToolOperationPipeline(options);
  }
  return activePipeline;
}

export function getToolPipeline() {
  return activePipeline;
}

export async function applyOperations(operations, options = {}) {
  return activePipeline.run(normalizeOperations(operations), options);
}

export function applyVaultOperation(op) {
  return activePipeline.run(
    normalizeOperations({ vault: op }),
    { render: false }
  );
}

export function applyMemoryOperation(op) {
  return activePipeline.run(
    normalizeOperations({ memories: op }),
    { render: false }
  );
}

export function applyTaskOperation(op) {
  return activePipeline.run(
    normalizeOperations({ tasks: op }),
    { render: false }
  );
}

export function applyGoalOperation(op) {
  return activePipeline.run(
    normalizeOperations({ goals: op }),
    { render: false }
  );
}

export default {
  applyOperations,
  applyVaultOperation,
  applyMemoryOperation,
  applyTaskOperation,
  applyGoalOperation,
  configureToolPipeline,
  getToolPipeline
};
