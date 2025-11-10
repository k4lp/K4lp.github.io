/**
 * Tool operation appliers
 *
 * Delegates all reasoning tool execution to the configurable pipeline
 * architecture so new behaviours can be introduced without touching callers.
 */

import { ToolOperationPipeline } from '../tools/tool-operation-pipeline.js';
import { nowISO } from '../../core/utils.js';

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
    subagent: toArray(operations.subagent),
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
  const applyStartTime = nowISO();
  console.log(`[${applyStartTime}] applyOperations() called`);

  const normalized = normalizeOperations(operations);
  const totalOps = normalized.vault.length + normalized.memories.length +
                   normalized.tasks.length + normalized.goals.length +
                   normalized.jsExecute.length + normalized.finalOutput.length;

  console.log(`[${nowISO()}] Operations normalized - Total: ${totalOps} (vault: ${normalized.vault.length}, memories: ${normalized.memories.length}, tasks: ${normalized.tasks.length}, goals: ${normalized.goals.length}, jsExecute: ${normalized.jsExecute.length}, finalOutput: ${normalized.finalOutput.length})`);

  const result = await activePipeline.run(normalized, options);

  console.log(`[${nowISO()}] applyOperations() completed`);
  return result;
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
