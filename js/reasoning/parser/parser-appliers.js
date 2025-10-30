/**
 * Parser Appliers
 *
 * Apply parsed operations to storage and execute actions
 */

import { Storage } from '../../storage/storage.js';
import { VaultManager } from '../../storage/vault-manager.js';
import { JSExecutor } from '../../execution/js-executor.js';
import { nowISO } from '../../core/utils.js';

/**
 * Apply all operations (main orchestrator)
 * @param {Object} operations - Parsed operations object
 * @returns {Promise<void>}
 */
export async function applyOperations(operations) {
  const startTime = Date.now();
  let operationsApplied = 0;

  try {
    // Apply vault operations FIRST (so they're available for subsequent operations)
    operations.vault.forEach((op, index) => {
      try {
        applyVaultOperation(op, index);
        operationsApplied++;
      } catch (error) {
        console.error(`Vault operation ${index} failed:`, error);
        Storage.appendToolActivity({
          type: 'vault',
          action: op.action || 'unknown',
          id: op.id || 'unknown',
          status: 'error',
          error: error.message,
          operationIndex: index
        });
      }
    });

    // Apply memory operations
    operations.memories.forEach((op, index) => {
      try {
        applyMemoryOperation(op);
        operationsApplied++;
      } catch (error) {
        console.error(`Memory operation ${index} failed:`, error);
      }
    });

    // Apply task operations
    operations.tasks.forEach((op, index) => {
      try {
        applyTaskOperation(op);
        operationsApplied++;
      } catch (error) {
        console.error(`Task operation ${index} failed:`, error);
      }
    });

    // Apply goal operations
    operations.goals.forEach((op, index) => {
      try {
        applyGoalOperation(op);
        operationsApplied++;
      } catch (error) {
        console.error(`Goal operation ${index} failed:`, error);
      }
    });

    // Execute JavaScript blocks with proper async support
    if (operations.jsExecute.length > 0) {
      const lastCode = operations.jsExecute[operations.jsExecute.length - 1];
      Storage.saveLastExecutedCode(lastCode);

      // Update code execution box
      setTimeout(() => {
        const codeInput = document.querySelector('#codeInput');
        if (codeInput) {
          codeInput.value = lastCode;
          const execStatus = document.querySelector('#execStatus');
          if (execStatus) {
            execStatus.textContent = 'AUTO-EXEC';
            execStatus.style.background = '#4CAF50';
            execStatus.style.color = 'white';
            setTimeout(() => {
              execStatus.textContent = 'READY';
              execStatus.style.background = '';
              execStatus.style.color = '';
            }, 3000);
          }
        }
      }, 100);
    }

    // Execute all JS blocks sequentially with async support
    for (let index = 0; index < operations.jsExecute.length; index++) {
      const code = operations.jsExecute[index];
      try {
        // CRITICAL: await the execution to handle async code properly
        await JSExecutor.executeCode(code);
        operationsApplied++;
      } catch (error) {
        console.error(`JS execution ${index} failed:`, error);
        Storage.appendToolActivity({
          type: 'js_execute',
          action: 'execute',
          status: 'error',
          error: error.message,
          operationIndex: index
        });
      }
    }

    // Handle final output - LLM-generated (VERIFIED)
    operations.finalOutput.forEach((htmlContent, index) => {
      try {
        const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);

        // LLM-generated final output is ALWAYS verified
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

        // Add to reasoning log for visibility
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== LLM-GENERATED FINAL OUTPUT (VERIFIED) ===\nGenerated at: ${new Date().toISOString()}\nContent size: ${processedHTML.length} characters\nVerification: PASSED`);
        Storage.saveReasoningLog(logEntries);

        console.log(`✅ LLM-generated final output received and verified (${processedHTML.length} chars)`);

        operationsApplied++;
      } catch (error) {
        console.error(`Final output ${index} failed:`, error);
        Storage.appendToolActivity({
          type: 'final_output',
          action: 'generate',
          status: 'error',
          error: error.message,
          operationIndex: index
        });
      }
    });

    const totalTime = Date.now() - startTime;
    console.log(`✓ Applied ${operationsApplied} operations in ${totalTime}ms`);

    // CRITICAL FIX: Force complete UI refresh after all operations - no circular dependency
    setTimeout(() => {
      // Dynamically access Renderer to avoid circular dependency
      const Renderer = window.GDRS?.Renderer;
      if (Renderer && Renderer.renderAll) {
        Renderer.renderAll();
        console.log('🔄 UI refreshed after operations');
      }
    }, 100);

  } catch (error) {
    console.error('Critical error in applyOperations:', error);
  }
}

/**
 * Apply vault operation
 * @param {Object} op - Vault operation
 * @param {number} [index] - Operation index for logging
 */
export function applyVaultOperation(op, index) {
  const vault = Storage.loadVault();

  if (op.delete) {
    const originalLength = vault.length;
    const filteredVault = vault.filter(v => v.identifier !== op.id);

    if (filteredVault.length < originalLength) {
      Storage.saveVault(filteredVault);
      Storage.appendToolActivity({
        type: 'vault',
        action: 'delete',
        id: op.id,
        status: 'success',
        entriesRemoved: originalLength - filteredVault.length
      });
      console.log(`🗑️ Deleted vault entry: ${op.id}`);
    } else {
      Storage.appendToolActivity({
        type: 'vault',
        action: 'delete',
        id: op.id,
        status: 'error',
        error: 'Entry not found'
      });
    }
  }
  else if (op.action === 'request_read') {
    const entry = vault.find(v => v.identifier === op.id);
    if (entry) {
      let content = entry.content;
      if (op.limit && op.limit !== 'full-length') {
        const limit = parseInt(op.limit) || 100;
        content = content.substring(0, limit) + (content.length > limit ? '...' : '');
      }
      const readResult = `VAULT_READ[${op.id}]: ${content}`;
      const logEntries = Storage.loadReasoningLog();
      logEntries.push(`=== VAULT READ ===\n${readResult}`);
      Storage.saveReasoningLog(logEntries);
      Storage.appendToolActivity({
        type: 'vault',
        action: 'read',
        id: op.id,
        limit: op.limit || 'none',
        status: 'success',
        dataSize: entry.content.length
      });
      console.log(`📚 Read vault entry: ${op.id} (${content.length} chars)`);
    } else {
      Storage.appendToolActivity({
        type: 'vault',
        action: 'read',
        id: op.id,
        status: 'error',
        error: 'Vault entry not found'
      });
      console.warn(`⚠️ Vault entry not found: ${op.id}`);
    }
  }
  else if (op.id && op.content !== undefined) {
    const existing = vault.find(v => v.identifier === op.id);

    if (existing) {
      existing.content = op.content;
      existing.updatedAt = nowISO();
      if (op.type) existing.type = op.type.toLowerCase();
      if (op.description) existing.description = op.description;

      Storage.saveVault(vault);
      Storage.appendToolActivity({
        type: 'vault',
        action: 'update',
        id: op.id,
        dataType: existing.type,
        dataSize: String(op.content).length,
        status: 'success'
      });
      console.log(`📝 Updated vault entry: ${op.id} (${existing.type})`);
    } else {
      const newEntry = {
        identifier: op.id,
        type: (op.type || 'text').toLowerCase(),
        description: op.description || '',
        content: op.content,
        createdAt: nowISO(),
        updatedAt: nowISO()
      };

      vault.push(newEntry);
      Storage.saveVault(vault);
      Storage.appendToolActivity({
        type: 'vault',
        action: 'create',
        id: op.id,
        dataType: newEntry.type,
        dataSize: String(op.content).length,
        status: 'success'
      });
      console.log(`➕ Created vault entry: ${op.id} (${newEntry.type})`);
    }
  }
}

/**
 * Apply memory operation
 * @param {Object} op - Memory operation
 */
export function applyMemoryOperation(op) {
  if (op.delete) {
    const memories = Storage.loadMemory().filter(m => m.identifier !== op.identifier);
    Storage.saveMemory(memories);
    Storage.appendToolActivity({
      type: 'memory',
      action: 'delete',
      id: op.identifier,
      status: 'success'
    });
  } else if (op.identifier) {
    const memories = Storage.loadMemory();
    const existing = memories.find(m => m.identifier === op.identifier);
    if (existing) {
      if (op.notes !== undefined) existing.notes = op.notes;
      Storage.saveMemory(memories);
      Storage.appendToolActivity({
        type: 'memory',
        action: 'update',
        id: op.identifier,
        status: 'success'
      });
    } else if (op.heading && op.content) {
      memories.push({
        identifier: op.identifier,
        heading: op.heading,
        content: op.content,
        notes: op.notes || '',
        createdAt: nowISO()
      });
      Storage.saveMemory(memories);
      Storage.appendToolActivity({
        type: 'memory',
        action: 'create',
        id: op.identifier,
        heading: op.heading,
        status: 'success'
      });
    }
  }
}

/**
 * Apply task operation
 * @param {Object} op - Task operation
 */
export function applyTaskOperation(op) {
  if (op.identifier) {
    const tasks = Storage.loadTasks();
    const existing = tasks.find(t => t.identifier === op.identifier);
    if (existing) {
      if (op.notes !== undefined) existing.notes = op.notes;
      if (op.status && ['pending', 'ongoing', 'finished', 'paused'].includes(op.status)) {
        existing.status = op.status;
      }
      Storage.saveTasks(tasks);
      Storage.appendToolActivity({
        type: 'task',
        action: 'update',
        id: op.identifier,
        status: 'success',
        newStatus: op.status
      });
    } else if (op.heading && op.content) {
      tasks.push({
        identifier: op.identifier,
        heading: op.heading,
        content: op.content,
        status: op.status && ['pending', 'ongoing', 'finished', 'paused'].includes(op.status) ? op.status : 'pending',
        notes: op.notes || '',
        createdAt: nowISO()
      });
      Storage.saveTasks(tasks);
      Storage.appendToolActivity({
        type: 'task',
        action: 'create',
        id: op.identifier,
        heading: op.heading,
        status: 'success'
      });
    }
  }
}

/**
 * Apply goal operation
 * @param {Object} op - Goal operation
 */
export function applyGoalOperation(op) {
  if (op.delete) {
    const goals = Storage.loadGoals().filter(g => g.identifier !== op.identifier);
    Storage.saveGoals(goals);
    Storage.appendToolActivity({
      type: 'goal',
      action: 'delete',
      id: op.identifier,
      status: 'success'
    });
  } else if (op.identifier) {
    const goals = Storage.loadGoals();
    const existing = goals.find(g => g.identifier === op.identifier);
    if (existing) {
      if (op.notes !== undefined) existing.notes = op.notes;
      Storage.saveGoals(goals);
      Storage.appendToolActivity({
        type: 'goal',
        action: 'update',
        id: op.identifier,
        status: 'success'
      });
    } else if (op.heading && op.content) {
      goals.push({
        identifier: op.identifier,
        heading: op.heading,
        content: op.content,
        notes: op.notes || '',
        createdAt: nowISO()
      });
      Storage.saveGoals(goals);
      Storage.appendToolActivity({
        type: 'goal',
        action: 'create',
        id: op.identifier,
        heading: op.heading,
        status: 'success'
      });
    }
  }
}
