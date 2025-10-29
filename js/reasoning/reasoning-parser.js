/**
 * GDRS Reasoning Parser
 * Parse LLM responses and apply operations
 */

import { Storage } from '../storage/storage.js';
import { VaultManager } from '../storage/vault-manager.js';
import { JSExecutor } from '../execution/js-executor.js';
import { nowISO } from '../core/utils.js';

export const ReasoningParser = {
  extractReasoningBlocks(text) {
    const blocks = [];
    const regex = /{{<reasoning_text>}}([\s\S]*?){{<\/reasoning_text>}}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  },

  extractPureReasoningText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let cleanText = text;
    
    // Remove all tool operations
    cleanText = cleanText.replace(/{{<js_execute>}}[\s\S]*?{{<\/js_execute>}}/g, '');
    cleanText = cleanText.replace(/{{<datavault[^>]*>}}[\s\S]*?{{<\/datavault>}}/g, '');
    cleanText = cleanText.replace(/{{<(?:memory|task|goal|datavault)[^>]*\/>}}/g, '');
    cleanText = cleanText.replace(/{{<final_output>}}[\s\S]*?{{<\/final_output>}}/g, '');
    cleanText = cleanText.replace(/{{<datavault[^>]*action=["']request_read["'][^>]*\/>}}/g, '');
    cleanText = cleanText.replace(/{{<vaultref[^>]*\/>}}/g, '');
    cleanText = cleanText.replace(/{{<[^>]*\/>}}/g, '');
    cleanText = cleanText.replace(/{{<[^>]*>}}[\s\S]*?{{<\/[^>]*>}}/g, '');
    
    // Clean up whitespace
    cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanText = cleanText.replace(/^\s*\n+|\n+\s*$/g, '');
    cleanText = cleanText.trim();
    
    const lines = cleanText.split('\n');
    const filteredLines = lines.filter(line => line.trim().length > 0);
    
    return filteredLines.join('\n');
  },

  extractJSExecutionBlocks(text) {
    const blocks = [];
    const regex = /{{<js_execute>}}([\s\S]*?){{<\/js_execute>}}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  },

  extractFinalOutputBlocks(text) {
    const blocks = [];
    const regex = /{{<final_output>}}([\s\S]*?){{<\/final_output>}}/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push(match[1].trim());
    }
    return blocks;
  },

  parseOperations(blockText) {
    const operations = {
      memories: [],
      tasks: [],
      goals: [],
      vault: [],
      jsExecute: [],
      finalOutput: []
    };

    // Parse memory operations
    const memoryRegex = /{{<memory\s+([^>]*)\s*\/>}}/g;
    let match;
    while ((match = memoryRegex.exec(blockText)) !== null) {
      const attrs = this.parseAttributes(match[1]);
      if (attrs && (attrs.identifier || attrs.heading)) {
        operations.memories.push(attrs);
      }
    }

    // Parse task operations  
    const taskRegex = /{{<task\s+([^>]*)\s*\/>}}/g;
    while ((match = taskRegex.exec(blockText)) !== null) {
      const attrs = this.parseAttributes(match[1]);
      if (attrs && (attrs.identifier || attrs.heading)) {
        operations.tasks.push(attrs);
      }
    }

    // Parse goal operations
    const goalRegex = /{{<goal\s+([^>]*)\s*\/>}}/g;
    while ((match = goalRegex.exec(blockText)) !== null) {
      const attrs = this.parseAttributes(match[1]);
      if (attrs && (attrs.identifier || attrs.heading)) {
        operations.goals.push(attrs);
      }
    }

    // Parse vault operations
    const vaultSelfRegex = /{{<datavault\s+([^>]*)\s*\/>}}/g;
    while ((match = vaultSelfRegex.exec(blockText)) !== null) {
      const attrs = this.parseAttributes(match[1]);
      if (attrs && attrs.id) {
        operations.vault.push(attrs);
      }
    }

    const vaultBlockRegex = /{{<datavault\s+([^>]*)>}}([\s\S]*?){{<\/datavault>}}/g;
    while ((match = vaultBlockRegex.exec(blockText)) !== null) {
      const attrs = this.parseAttributes(match[1]);
      if (attrs && attrs.id) {
        attrs.content = match[2].trim();
        operations.vault.push(attrs);
      }
    }

    // Parse JavaScript execution blocks
    const jsExecuteBlocks = this.extractJSExecutionBlocks(blockText);
    operations.jsExecute = jsExecuteBlocks;

    // Parse final output blocks
    const finalOutputBlocks = this.extractFinalOutputBlocks(blockText);
    operations.finalOutput = finalOutputBlocks;

    return operations;
  },

  parseAttributes(attrString) {
    const attrs = {};
    if (!attrString) return attrs;
    
    const regex = /(\w+)=["']([^"']*)["']|\b(\w+)(?=\s|$)/g;
    let match;
    while ((match = regex.exec(attrString)) !== null) {
      if (match[1] && match[2] !== undefined) {
        attrs[match[1]] = match[2];
      } else if (match[3]) {
        attrs[match[3]] = true;
      }
    }
    return attrs;
  },

  applyOperations(operations) {
    const startTime = Date.now();
    let operationsApplied = 0;
    
    try {
      // Apply vault operations FIRST
      operations.vault.forEach((op, index) => {
        try {
          this.applyVaultOperation(op, index);
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
          this.applyMemoryOperation(op);
          operationsApplied++;
        } catch (error) {
          console.error(`Memory operation ${index} failed:`, error);
        }
      });

      // Apply task operations
      operations.tasks.forEach((op, index) => {
        try {
          this.applyTaskOperation(op);
          operationsApplied++;
        } catch (error) {
          console.error(`Task operation ${index} failed:`, error);
        }
      });

      // Apply goal operations
      operations.goals.forEach((op, index) => {
        try {
          this.applyGoalOperation(op);
          operationsApplied++;
        } catch (error) {
          console.error(`Goal operation ${index} failed:`, error);
        }
      });

      // Execute JavaScript blocks AFTER vault operations
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
      
      operations.jsExecute.forEach((code, index) => {
        try {
          JSExecutor.executeCode(code);
          operationsApplied++;
        } catch (error) {
          console.error(`JS execution ${index} failed:`, error);
        }
      });

      // Handle final output
      operations.finalOutput.forEach((htmlContent, index) => {
        try {
          const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);
          Storage.saveFinalOutput(processedHTML);
          Storage.appendToolActivity({
            type: 'final_output',
            action: 'generate',
            status: 'success',
            contentSize: processedHTML.length,
            operationIndex: index
          });
          operationsApplied++;
        } catch (error) {
          console.error(`Final output ${index} failed:`, error);
        }
      });
      
      const totalTime = Date.now() - startTime;
      console.log(`✓ Applied ${operationsApplied} operations in ${totalTime}ms`);
      
    } catch (error) {
      console.error('Critical error in applyOperations:', error);
    }
  },

  applyVaultOperation(op) {
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
        console.log(`📖 Read vault entry: ${op.id} (${content.length} chars)`);
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
  },

  applyMemoryOperation(op) {
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
  },

  applyTaskOperation(op) {
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
  },

  applyGoalOperation(op) {
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
};