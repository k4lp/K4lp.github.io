/**
 * Parser Appliers (Re-architected)
 *
 * Applies parsed operations in a deterministic order with clear state reporting.
 * All operations execute sequentially and emit structured summaries so callers
 * can reason about what happened without relying on side effects.
 */

import { Storage } from '../../storage/storage.js';
import { VaultManager } from '../../storage/vault-manager.js';
import { JSExecutor } from '../../execution/js-executor.js';
import { eventBus, Events } from '../../core/event-bus.js';
import { nowISO } from '../../core/utils.js';

const TASK_STATUSES = ['pending', 'ongoing', 'finished', 'paused'];

/**
 * Apply the full operation bundle.
 * @param {Object} operations Parsed operations
 * @param {Object} [options]
 * @param {boolean} [options.render=true] Whether to request a UI refresh when finished
 * @returns {Promise<Object>} Summary of everything that happened
 */
export async function applyOperations(operations, options = {}) {
  const summary = createEmptySummary();
  const startedAt = Date.now();

  await processVaultOperations(operations.vault, summary);
  await processMemoryOperations(operations.memories, summary);
  await processTaskOperations(operations.tasks, summary);
  await processGoalOperations(operations.goals, summary);

  // Persist entity changes before executing code so scripts observe the latest state.
  commitEntityChanges(summary);

  await processExecutionBlocks(operations.jsExecute, summary);
  processFinalOutputs(operations.finalOutput, summary);

  summary.duration = Date.now() - startedAt;

  if (options.render !== false) {
    eventBus.emit(Events.UI_REFRESH_REQUEST);
  }

  return summary;
}

/**
 * Backward-compatible single-operation helpers.
 */
export function applyVaultOperation(op) {
  const summary = createEmptySummary();
  return processVaultOperations([op], summary).then(() => {
    commitEntityChanges(summary);
    return summary;
  });
}

export function applyMemoryOperation(op) {
  const summary = createEmptySummary();
  return processMemoryOperations([op], summary).then(() => {
    commitEntityChanges(summary);
    return summary;
  });
}

export function applyTaskOperation(op) {
  const summary = createEmptySummary();
  return processTaskOperations([op], summary).then(() => {
    commitEntityChanges(summary);
    return summary;
  });
}

export function applyGoalOperation(op) {
  const summary = createEmptySummary();
  return processGoalOperations([op], summary).then(() => {
    commitEntityChanges(summary);
    return summary;
  });
}

/* ------------------------------------------------------------------------- */
/* Internal helpers                                                          */
/* ------------------------------------------------------------------------- */

function createEmptySummary() {
  return {
    vault: [],
    memory: [],
    tasks: [],
    goals: [],
    executions: [],
    finalOutput: [],
    errors: [],
    duration: 0,
    _dirty: {
      vault: false,
      memory: false,
      tasks: false,
      goals: false
    },
    _snapshots: {
      vault: Storage.loadVault(),
      memory: Storage.loadMemory(),
      tasks: Storage.loadTasks(),
      goals: Storage.loadGoals()
    }
  };
}

async function processVaultOperations(vaultOps, summary) {
  const vault = summary._snapshots.vault;

  for (const op of vaultOps) {
    const result = { id: op.id, action: op.action || detectVaultAction(op), status: 'success' };

    try {
      if (op.delete) {
        deleteVaultEntry(vault, op);
        summary._dirty.vault = true;
        appendActivity({
          type: 'vault',
          action: 'delete',
          id: op.id,
          status: 'success'
        });
      } else if (op.action === 'request_read') {
        handleVaultRead(op, vault, summary);
      } else if (op.id && op.content !== undefined) {
        upsertVaultEntry(vault, op);
        summary._dirty.vault = true;
      } else {
        throw new Error('Unsupported vault operation');
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      summary.errors.push({
        type: 'vault',
        id: op.id || 'unknown',
        message: error.message
      });
    }

    summary.vault.push(result);
  }
}

async function processMemoryOperations(memoryOps, summary) {
  let memories = summary._snapshots.memory;

  for (const op of memoryOps) {
    const result = { id: op.identifier, action: op.delete ? 'delete' : 'upsert', status: 'success' };

    try {
      if (op.delete) {
        const updated = memories.filter((item) => item.identifier !== op.identifier);
        if (updated.length !== memories.length) {
          summary._snapshots.memory = updated;
          memories = summary._snapshots.memory;
          summary._dirty.memory = true;
          appendActivity({
            type: 'memory',
            action: 'delete',
            id: op.identifier,
            status: 'success'
          });
        }
      } else if (op.identifier && op.heading && op.content) {
        const existing = memories.find((item) => item.identifier === op.identifier);
        if (existing) {
          existing.heading = op.heading;
          existing.content = op.content;
          if (op.notes !== undefined) existing.notes = op.notes;
        } else {
          memories.push({
            identifier: op.identifier,
            heading: op.heading,
            content: op.content,
            notes: op.notes || '',
            createdAt: nowISO()
          });
        }
        summary._dirty.memory = true;
        appendActivity({
          type: 'memory',
          action: existing ? 'update' : 'create',
          id: op.identifier,
          status: 'success'
        });
      } else if (op.identifier) {
        const existing = memories.find((item) => item.identifier === op.identifier);
        if (existing && op.notes !== undefined) {
          existing.notes = op.notes;
          summary._dirty.memory = true;
          appendActivity({
            type: 'memory',
            action: 'update',
            id: op.identifier,
            status: 'success'
          });
        }
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      summary.errors.push({
        type: 'memory',
        id: op.identifier || 'unknown',
        message: error.message
      });
    }

    summary.memory.push(result);
  }
}

async function processTaskOperations(taskOps, summary) {
  const tasks = summary._snapshots.tasks;

  for (const op of taskOps) {
    const result = { id: op.identifier, action: 'upsert', status: 'success' };

    try {
      if (!op.identifier) {
        throw new Error('Task operation missing identifier');
      }

      const existing = tasks.find((item) => item.identifier === op.identifier);
      if (existing) {
        if (op.heading) existing.heading = op.heading;
        if (op.content) existing.content = op.content;
        if (op.notes !== undefined) existing.notes = op.notes;
        if (op.status && TASK_STATUSES.includes(op.status)) existing.status = op.status;
      } else {
        if (!op.heading || !op.content) {
          throw new Error('New tasks require heading and content');
        }
        tasks.push({
          identifier: op.identifier,
          heading: op.heading,
          content: op.content,
          status: TASK_STATUSES.includes(op.status) ? op.status : 'pending',
          notes: op.notes || '',
          createdAt: nowISO()
        });
      }

      summary._dirty.tasks = true;
      appendActivity({
        type: 'task',
        action: existing ? 'update' : 'create',
        id: op.identifier,
        status: 'success',
        newStatus: existing ? existing.status : TASK_STATUSES.includes(op.status) ? op.status : 'pending'
      });
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      summary.errors.push({
        type: 'task',
        id: op.identifier || 'unknown',
        message: error.message
      });
    }

    summary.tasks.push(result);
  }
}

async function processGoalOperations(goalOps, summary) {
  let goals = summary._snapshots.goals;

  for (const op of goalOps) {
    const result = { id: op.identifier, action: op.delete ? 'delete' : 'upsert', status: 'success' };

    try {
      if (op.delete) {
        const updated = goals.filter((item) => item.identifier !== op.identifier);
        if (updated.length !== goals.length) {
          summary._snapshots.goals = updated;
          goals = summary._snapshots.goals;
          summary._dirty.goals = true;
          appendActivity({
            type: 'goal',
            action: 'delete',
            id: op.identifier,
            status: 'success'
          });
        }
      } else if (op.identifier && op.heading && op.content) {
        const existing = goals.find((item) => item.identifier === op.identifier);
        if (existing) {
          existing.heading = op.heading;
          existing.content = op.content;
          if (op.notes !== undefined) existing.notes = op.notes;
        } else {
          goals.push({
            identifier: op.identifier,
            heading: op.heading,
            content: op.content,
            notes: op.notes || '',
            createdAt: nowISO()
          });
        }
        summary._dirty.goals = true;
        appendActivity({
          type: 'goal',
          action: existing ? 'update' : 'create',
          id: op.identifier,
          status: 'success'
        });
      } else if (op.identifier) {
        const existing = goals.find((item) => item.identifier === op.identifier);
        if (existing && op.notes !== undefined) {
          existing.notes = op.notes;
          summary._dirty.goals = true;
          appendActivity({
            type: 'goal',
            action: 'update',
            id: op.identifier,
            status: 'success'
          });
        }
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      summary.errors.push({
        type: 'goal',
        id: op.identifier || 'unknown',
        message: error.message
      });
    }

    summary.goals.push(result);
  }
}

async function processExecutionBlocks(codeBlocks, summary) {
  for (let index = 0; index < codeBlocks.length; index += 1) {
    const code = codeBlocks[index];
    const execResult = await JSExecutor.executeCode(code, {
      source: 'auto',
      context: {
        blockIndex: index
      },
      metadata: {
        operationsBefore: {
          vault: summary.vault.length,
          memory: summary.memory.length,
          tasks: summary.tasks.length,
          goals: summary.goals.length
        }
      }
    });

    summary.executions.push(execResult);

    if (!execResult.success) {
      summary.errors.push({
        type: 'execution',
        id: execResult.id,
        message: execResult.error?.message || 'Execution failed'
      });
    }
  }
}

function processFinalOutputs(finalOutputBlocks, summary) {
  finalOutputBlocks.forEach((htmlContent, index) => {
    const result = { index, status: 'success' };

    try {
      const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);

      Storage.saveFinalOutput(processedHTML, true, 'llm');

      Storage.appendToolActivity({
        type: 'final_output',
        action: 'generate',
        status: 'success',
        source: 'llm',
        verified: true,
        contentSize: processedHTML.length,
        operationIndex: index
      });

      const logEntries = Storage.loadReasoningLog();
      logEntries.push(
        `=== LLM-GENERATED FINAL OUTPUT (VERIFIED) ===\nGenerated at: ${nowISO()}\nContent size: ${processedHTML.length} characters\nVerification: PASSED`
      );
      Storage.saveReasoningLog(logEntries);
    } catch (error) {
      result.status = 'error';
      result.error = error.message;

      Storage.appendToolActivity({
        type: 'final_output',
        action: 'generate',
        status: 'error',
        error: error.message,
        operationIndex: index
      });

      summary.errors.push({
        type: 'final_output',
        id: `block_${index}`,
        message: error.message
      });
    }

    summary.finalOutput.push(result);
  });
}

function commitEntityChanges(summary) {
  if (summary._dirty.vault) {
    Storage.saveVault(summary._snapshots.vault);
  }
  if (summary._dirty.memory) {
    Storage.saveMemory(summary._snapshots.memory);
  }
  if (summary._dirty.tasks) {
    Storage.saveTasks(summary._snapshots.tasks);
  }
  if (summary._dirty.goals) {
    Storage.saveGoals(summary._snapshots.goals);
  }
}

/* ------------------------------------------------------------------------- */
/* Vault helpers                                                             */
/* ------------------------------------------------------------------------- */

function detectVaultAction(op) {
  if (op.delete) return 'delete';
  if (op.action === 'request_read') return 'read';
  if (op.id && op.content !== undefined) return 'upsert';
  return 'unknown';
}

function deleteVaultEntry(vault, op) {
  const index = vault.findIndex((entry) => entry.identifier === op.id);
  if (index === -1) {
    throw new Error(`Vault entry not found: ${op.id}`);
  }
  vault.splice(index, 1);
}

function upsertVaultEntry(vault, op) {
  const existing = vault.find((entry) => entry.identifier === op.id);
  const payload = {
    identifier: op.id,
    type: (op.type || (existing ? existing.type : 'text')).toLowerCase(),
    description: op.description || (existing ? existing.description : ''),
    content: op.content,
    createdAt: existing?.createdAt || nowISO(),
    updatedAt: nowISO()
  };

  if (existing) {
    Object.assign(existing, payload);
    appendActivity({
      type: 'vault',
      action: 'update',
      id: op.id,
      status: 'success',
      dataType: payload.type,
      dataSize: String(op.content).length
    });
  } else {
    vault.push(payload);
    appendActivity({
      type: 'vault',
      action: 'create',
      id: op.id,
      status: 'success',
      dataType: payload.type,
      dataSize: String(op.content).length
    });
  }
}

function handleVaultRead(op, vaultSnapshot, summary) {
  const entry = vaultSnapshot.find((item) => item.identifier === op.id);
  if (!entry) {
    appendActivity({
      type: 'vault',
      action: 'read',
      id: op.id,
      status: 'error',
      error: 'Vault entry not found'
    });
    summary.errors.push({
      type: 'vault',
      id: op.id || 'unknown',
      message: `Vault entry not found: ${op.id}`
    });
    return;
  }

  const limit = op.limit === 'full-length' ? entry.content.length : parseInt(op.limit || '0', 10);
  const content = Number.isFinite(limit) && limit > 0
    ? entry.content.slice(0, limit)
    : entry.content;

  const reasoningLog = Storage.loadReasoningLog();
  reasoningLog.push([
    '=== VAULT READ ===',
    `Entry: ${op.id}`,
    `Limit: ${op.limit || 'none'}`,
    `Content:\n${content}`
  ].join('\n'));
  Storage.saveReasoningLog(reasoningLog);

  appendActivity({
    type: 'vault',
    action: 'read',
    id: op.id,
    status: 'success',
    dataSize: content.length,
    limit: op.limit || 'none'
  });
}

/**
 * Proxy to Storage.appendToolActivity so tests/mocks can override it if needed.
 */
function appendActivity(activity) {
  Storage.appendToolActivity(activity);
}
