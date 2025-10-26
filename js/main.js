/**
 * GEMINI DEEP RESEARCH SYSTEM - MAIN APPLICATION (FIXED)
 * Fixed: Smart task generation, improved reasoning quality, clean reasoning logs
 */

(function() {
  'use strict';

  const VERSION = '1.0.1';
  const MAX_ITERATIONS = 20;
  const ITERATION_DELAY = 2000;
  
  const LS_KEYS = {
    META: 'gdrs_meta',
    KEYPOOL: 'gdrs_keypool', 
    GOALS: 'gdrs_goals',
    MEMORY: 'gdrs_memory',
    TASKS: 'gdrs_tasks',
    VAULT: 'gdrs_vault',
    FINAL_OUTPUT: 'gdrs_final_output',
    REASONING_LOG: 'gdrs_reasoning_log',
    CURRENT_QUERY: 'gdrs_current_query',
    EXECUTION_LOG: 'gdrs_execution_log',
    TOOL_ACTIVITY_LOG: 'gdrs_tool_activity_log'
  };

  const DEFAULT_KEYPOOL = () => {
    const pool = [];
    for (let i = 1; i <= 5; i++) {
      pool.push({
        slot: i,
        key: '',
        usage: 0,
        cooldownUntil: 0,
        rateLimited: false,
        valid: false
      });
    }
    return pool;
  };

  /**
   * ENHANCED SYSTEM PROMPT - More strict about task/goal generation
   */
  const SYSTEM_PROMPT = `# GEMINI DEEP RESEARCH SYSTEM - LLM INTERFACE

You are the core reasoning engine of the Gemini Deep Research System (GDRS), a browser-based research assistant with iterative reasoning, unlimited code execution, and persistent storage management.

## CRITICAL RULES

1. **ALL STORAGE OPERATIONS MUST BE WRAPPED IN REASONING BLOCKS**:
   All memory, task, goal, vault, and JavaScript execution operations MUST occur within:
   
   {{<reasoning_text>}}
   ... your operations here ...
   {{</reasoning_text>}}

2. **INTELLIGENT TASK & GOAL GENERATION**:
   - **NEVER** mechanically split queries by newlines or periods
   - **ANALYZE FIRST**: Understand the query's intent, context, and requirements
   - **TASKS**: Create meaningful, actionable work items that advance toward the goal
   - **GOALS**: Define clear success criteria that can be verified
   - For MCQs: Store complete option information with labels (e.g., "Option A: answer text")
   - For analysis: Create tasks that represent logical workflow steps
   - Each task should have a clear purpose and success condition

3. **REASONING TEXT PURITY**:
   - Your reasoning text should contain ONLY your thought process
   - Tool operations ({{<task>}}, {{<memory>}}, etc.) are separate from reasoning
   - Structure: First think, then act
   - Example:
     {{<reasoning_text>}}
     I need to analyze this MCQ. The question asks about X, and there are 4 options.
     I should store the options for verification, then analyze each one systematically.
     
     {{<goal identifier="goal_verify" heading="Answer within given options" content="Ensure final answer matches one of: A) text1, B) text2, C) text3, D) text4" />}}
     {{<task identifier="task_analyze" heading="Analyze each option" content="Evaluate correctness of each option against the question" />}}
     {{</reasoning_text>}}

4. **IMMUTABILITY RULES**:
   - Task/Memory/Goal: heading and content are IMMUTABLE after creation
   - Only 'notes' and 'status' (tasks only) can be updated
   - Tasks CANNOT be deleted (by design)

## AVAILABLE OPERATIONS

### Memory Operations
\`\`\`
{{<reasoning_text>}}
My reasoning about what to remember...

{{<memory identifier="unique_id" heading="Memory Title" content="Detailed content" notes="" />}}
{{<memory identifier="existing_id" notes="Additional context" />}}
{{<memory identifier="existing_id" delete />}}
{{</reasoning_text>}}
\`\`\`

### Task Operations
\`\`\`
{{<reasoning_text>}}
My reasoning about the work to be done...

{{<task identifier="unique_id" heading="Task Title" content="Detailed task description" notes="" />}}
{{<task identifier="existing_id" notes="Progress update" status="ongoing" />}}
{{</reasoning_text>}}
\`\`\`
Valid statuses: "pending" | "ongoing" | "finished" | "paused"

### Goal Operations
\`\`\`
{{<reasoning_text>}}
My reasoning about success criteria...

{{<goal identifier="unique_id" heading="Goal Title" content="Detailed goal and verification criteria" notes="" />}}
{{<goal identifier="existing_id" notes="Additional context" />}}
{{<goal identifier="existing_id" delete />}}
{{</reasoning_text>}}
\`\`\`

### Data Vault Operations
\`\`\`
{{<reasoning_text>}}
My reasoning about what data to store...

{{<datavault id="dv_unique_id" type="code" description="Brief description">}}
function processData(input) {
  return result;
}
{{</datavault>}}
{{</reasoning_text>}}
\`\`\`

### JavaScript Execution
\`\`\`
{{<reasoning_text>}}
My reasoning about what computation to perform...

{{<js_execute>}}
// Your JavaScript code here
console.log("Processing...");
return { success: true };
{{</js_execute>}}
{{</reasoning_text>}}
\`\`\`

## REASONING WORKFLOW

1. **Query Analysis**: 
   - DON'T just split by newlines/periods
   - UNDERSTAND the query type (question, analysis request, MCQ, etc.)
   - IDENTIFY the actual goal (answer a question, analyze data, etc.)

2. **Smart Task & Goal Generation**:
   - For MCQs: 
     * Goal: "Answer must be one of the provided options"
     * Tasks: "Analyze question requirements", "Evaluate each option", "Select best answer"
   - For analysis:
     * Goal: "Provide comprehensive analysis addressing all aspects"
     * Tasks: Break into logical analysis phases
   - For calculations:
     * Goal: "Compute accurate result"
     * Tasks: "Extract data", "Perform calculation", "Verify result"

3. **Context Building**: 
   - Store MEANINGFUL information in memory
   - Store COMPLETE context (e.g., full option text, not just numbers)
   - Store data that will be USEFUL for verification

4. **Iterative Processing**: 
   - Work through tasks systematically
   - Use JavaScript execution for accuracy
   - Update task notes with concrete progress
   - Store findings in memory

5. **Goal Verification**: 
   - Check that goals are actually met
   - Don't just mark complete without verification

6. **Final Output**: 
   - Provide comprehensive, well-structured results

**CRITICAL**: Think intelligently. Don't be mechanical. Understand intent before creating tasks/goals.

## FINAL OUTPUT GENERATION

When all goals are complete:
\`\`\`
{{<reasoning_text>}}
All goals have been verified and met. Generating final output.

{{<final_output>}}
<h1>Analysis Results</h1>
<p>Your comprehensive findings here...</p>
{{</final_output>}}
{{</reasoning_text>}}
\`\`\``;

  /**
   * STORAGE LAYER
   */
  const Storage = {
    loadKeypool() {
      const raw = safeJSONParse(localStorage.getItem(LS_KEYS.KEYPOOL), null);
      if (!Array.isArray(raw)) {
        const seed = DEFAULT_KEYPOOL();
        localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(seed));
        return seed;
      }
      return this.normalizeKeypool(raw);
    },

    saveKeypool(pool) {
      localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(pool));
    },

    normalizeKeypool(arr) {
      const out = [];
      for (let i = 1; i <= 5; i++) {
        const found = arr.find(k => k && k.slot === i);
        if (found) {
          out.push({
            slot: i,
            key: isNonEmptyString(found.key) ? found.key.trim() : '',
            usage: Number(found.usage || 0),
            cooldownUntil: Number(found.cooldownUntil || 0),
            rateLimited: !!found.rateLimited,
            valid: !!found.valid
          });
        } else {
          out.push({
            slot: i,
            key: '',
            usage: 0,
            cooldownUntil: 0,
            rateLimited: false,
            valid: false
          });
        }
      }
      return out;
    },

    loadGoals() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.GOALS), []) || [];
    },
    saveGoals(goals) {
      localStorage.setItem(LS_KEYS.GOALS, JSON.stringify(goals));
    },

    loadMemory() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.MEMORY), []) || [];
    },
    saveMemory(memory) {
      localStorage.setItem(LS_KEYS.MEMORY, JSON.stringify(memory));
    },

    loadTasks() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.TASKS), []) || [];
    },
    saveTasks(tasks) {
      localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasks));
    },

    loadVault() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.VAULT), []) || [];
    },
    saveVault(vault) {
      localStorage.setItem(LS_KEYS.VAULT, JSON.stringify(vault));
    },

    loadFinalOutput() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.FINAL_OUTPUT), {
        timestamp: '—',
        html: '<p>Report will render here after goal validation.</p>'
      });
    },
    saveFinalOutput(htmlString) {
      const outObj = {
        timestamp: nowISO(),
        html: htmlString || ''
      };
      localStorage.setItem(LS_KEYS.FINAL_OUTPUT, JSON.stringify(outObj));
    },

    loadReasoningLog() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.REASONING_LOG), []) || [];
    },
    saveReasoningLog(log) {
      localStorage.setItem(LS_KEYS.REASONING_LOG, JSON.stringify(log));
    },

    loadCurrentQuery() {
      return localStorage.getItem(LS_KEYS.CURRENT_QUERY) || '';
    },
    saveCurrentQuery(query) {
      localStorage.setItem(LS_KEYS.CURRENT_QUERY, query || '');
    },

    loadExecutionLog() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.EXECUTION_LOG), []) || [];
    },
    saveExecutionLog(log) {
      localStorage.setItem(LS_KEYS.EXECUTION_LOG, JSON.stringify(log));
    },
    
    appendExecutionResult(result) {
      const log = this.loadExecutionLog();
      log.push({
        timestamp: nowISO(),
        ...result
      });
      this.saveExecutionLog(log);
    },

    loadToolActivityLog() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.TOOL_ACTIVITY_LOG), []) || [];
    },
    saveToolActivityLog(log) {
      localStorage.setItem(LS_KEYS.TOOL_ACTIVITY_LOG, JSON.stringify(log));
    },
    appendToolActivity(activity) {
      const log = this.loadToolActivityLog();
      log.push({
        timestamp: nowISO(),
        iteration: window.GDRS?.currentIteration || 0,
        ...activity
      });
      if (log.length > 200) log.splice(0, log.length - 200);
      this.saveToolActivityLog(log);
    }
  };

  /**
   * KEY MANAGER
   */
  const KeyManager = {
    getCooldownRemainingSeconds(k) {
      const now = Date.now();
      if (!k.cooldownUntil || k.cooldownUntil <= now) return 0;
      return Math.ceil((k.cooldownUntil - now) / 1000);
    },

    liftCooldowns() {
      const pool = Storage.loadKeypool();
      let dirty = false;
      const now = Date.now();
      
      for (const k of pool) {
        if (k.cooldownUntil && k.cooldownUntil <= now) {
          if (k.rateLimited) dirty = true;
          k.rateLimited = false;
          k.cooldownUntil = 0;
        }
      }
      
      if (dirty) Storage.saveKeypool(pool);
    },

    markRateLimit(slot, cooldownSeconds = 30) {
      const pool = Storage.loadKeypool();
      const rec = pool.find(k => k.slot === slot);
      if (!rec) return;
      
      const now = Date.now();
      rec.rateLimited = true;
      rec.cooldownUntil = now + cooldownSeconds * 1000;
      Storage.saveKeypool(pool);
    },

    chooseActiveKey() {
      const pool = Storage.loadKeypool();
      this.liftCooldowns();
      
      const usable = pool.find(k => {
        const cd = this.getCooldownRemainingSeconds(k);
        return k.key && k.valid && !k.rateLimited && cd === 0;
      });
      
      return usable || null;
    },

    setKey(slot, newKey) {
      const pool = Storage.loadKeypool();
      const rec = pool.find(k => k.slot === slot);
      if (!rec) return;
      
      rec.key = newKey.trim();
      rec.valid = false;
      Storage.saveKeypool(pool);
    },

    markValid(slot, isValid) {
      const pool = Storage.loadKeypool();
      const rec = pool.find(k => k.slot === slot);
      if (!rec) return;
      
      rec.valid = !!isValid;
      Storage.saveKeypool(pool);
    },

    bumpUsage(slot) {
      const pool = Storage.loadKeypool();
      const rec = pool.find(k => k.slot === slot);
      if (!rec) return;
      
      rec.usage = Number(rec.usage || 0) + 1;
      Storage.saveKeypool(pool);
    },

    clearAll() {
      Storage.saveKeypool(DEFAULT_KEYPOOL());
    },

    async validateAllKeys() {
      const pool = Storage.loadKeypool();
      for (const k of pool) {
        if (!k.key) {
          k.valid = false;
          continue;
        }
        
        try {
          const resp = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models?key=' +
            encodeURIComponent(k.key)
          );
          
          if (resp.status === 429) {
            k.valid = true;
            k.rateLimited = true;
            k.cooldownUntil = Date.now() + 30 * 1000;
          } else if (resp.ok) {
            k.valid = true;
          } else if (resp.status === 401 || resp.status === 403) {
            k.valid = false;
          } else {
            k.valid = false;
          }
        } catch (err) {
          k.valid = false;
          console.error('Key validation error:', err);
        }
      }
      Storage.saveKeypool(pool);
    }
  };

  /**
   * FIXED REASONING TEXT PARSER - Extracts only pure reasoning
   */
  const ReasoningParser = {
    extractReasoningBlocks(text) {
      const blocks = [];
      const regex = /{{<reasoning_text>}}([\s\S]*?){{<\/reasoning_text>}}/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        blocks.push(match[1].trim());
      }
      return blocks;
    },

    /**
     * FIXED: Extract ONLY pure reasoning text, completely removing tool operations
     */
    extractPureReasoningText(text) {
      let cleanText = text;
      
      // Remove JS execute blocks (including content)
      cleanText = cleanText.replace(/{{<js_execute>}}[\s\S]*?{{<\/js_execute>}}/g, '');
      
      // Remove datavault blocks (including content)
      cleanText = cleanText.replace(/{{<datavault[^>]*>}}[\s\S]*?{{<\/datavault>}}/g, '');
      
      // Remove final output blocks (including content)
      cleanText = cleanText.replace(/{{<final_output>}}[\s\S]*?{{<\/final_output>}}/g, '');
      
      // Remove all self-closing tool operations
      cleanText = cleanText.replace(/{{<(?:memory|task|goal|datavault)[^>]*\/?>}}/g, '');
      
      // Remove any remaining {{< >}} syntax
      cleanText = cleanText.replace(/{{<[^>]*>}}/g, '');
      cleanText = cleanText.replace(/{{<\/[^>]*>}}/g, '');
      
      // Clean up extra whitespace and empty lines
      cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
      
      return cleanText;
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
        operations.memories.push(attrs);
      }

      // Parse task operations  
      const taskRegex = /{{<task\s+([^>]*)\s*\/>}}/g;
      while ((match = taskRegex.exec(blockText)) !== null) {
        const attrs = this.parseAttributes(match[1]);
        operations.tasks.push(attrs);
      }

      // Parse goal operations
      const goalRegex = /{{<goal\s+([^>]*)\s*\/>}}/g;
      while ((match = goalRegex.exec(blockText)) !== null) {
        const attrs = this.parseAttributes(match[1]);
        operations.goals.push(attrs);
      }

      // Parse vault operations
      const vaultSelfRegex = /{{<datavault\s+([^>]*)\s*\/>}}/g;
      while ((match = vaultSelfRegex.exec(blockText)) !== null) {
        const attrs = this.parseAttributes(match[1]);
        operations.vault.push(attrs);
      }

      const vaultBlockRegex = /{{<datavault\s+([^>]*)>}}([\s\S]*?){{<\/datavault>}}/g;
      while ((match = vaultBlockRegex.exec(blockText)) !== null) {
        const attrs = this.parseAttributes(match[1]);
        attrs.content = match[2].trim();
        operations.vault.push(attrs);
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
      const regex = /(\w+)=\"([^\"]*)\"|(\w+)(?=\s|$)/g;
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
      // Apply vault operations FIRST
      operations.vault.forEach(op => {
        if (op.delete) {
          const vault = Storage.loadVault().filter(v => v.identifier !== op.id);
          Storage.saveVault(vault);
          Storage.appendToolActivity({
            type: 'vault',
            action: 'delete',
            id: op.id,
            status: 'success'
          });
        } else if (op.action === 'request_read') {
          const vault = Storage.loadVault();
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
          } else {
            Storage.appendToolActivity({
              type: 'vault',
              action: 'read',
              id: op.id,
              status: 'error',
              error: 'Vault entry not found'
            });
          }
        } else if (op.id && op.content !== undefined) {
          const vault = Storage.loadVault();
          const existing = vault.find(v => v.identifier === op.id);
          if (existing) {
            existing.content = op.content;
            if (op.type) existing.type = op.type;
            if (op.description) existing.description = op.description;
            Storage.appendToolActivity({
              type: 'vault',
              action: 'update',
              id: op.id,
              dataType: op.type || existing.type,
              dataSize: op.content.length,
              status: 'success'
            });
          } else {
            vault.push({
              identifier: op.id,
              type: op.type || 'text',
              description: op.description || '',
              content: op.content,
              createdAt: nowISO()
            });
            Storage.appendToolActivity({
              type: 'vault',
              action: 'create',
              id: op.id,
              dataType: op.type || 'text',
              dataSize: op.content.length,
              status: 'success'
            });
          }
          Storage.saveVault(vault);
        }
      });

      // Apply memory operations
      operations.memories.forEach(op => {
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
            Storage.appendToolActivity({
              type: 'memory',
              action: 'create',
              id: op.identifier,
              heading: op.heading,
              status: 'success'
            });
          }
          Storage.saveMemory(memories);
        }
      });

      // Apply task operations
      operations.tasks.forEach(op => {
        if (op.identifier) {
          const tasks = Storage.loadTasks();
          const existing = tasks.find(t => t.identifier === op.identifier);
          if (existing) {
            if (op.notes !== undefined) existing.notes = op.notes;
            if (op.status && ['pending', 'ongoing', 'finished', 'paused'].includes(op.status)) {
              existing.status = op.status;
            }
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
            Storage.appendToolActivity({
              type: 'task',
              action: 'create',
              id: op.identifier,
              heading: op.heading,
              status: 'success'
            });
          }
          Storage.saveTasks(tasks);
        }
      });

      // Apply goal operations
      operations.goals.forEach(op => {
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
            Storage.appendToolActivity({
              type: 'goal',
              action: 'create',
              id: op.identifier,
              heading: op.heading,
              status: 'success'
            });
          }
          Storage.saveGoals(goals);
        }
      });

      // Execute JavaScript blocks
      operations.jsExecute.forEach(code => {
        JSExecutor.executeCode(code);
      });

      // Handle final output
      operations.finalOutput.forEach(htmlContent => {
        const processedHTML = VaultManager.resolveVaultRefsInText(htmlContent);
        Storage.saveFinalOutput(processedHTML);
        Storage.appendToolActivity({
          type: 'final_output',
          action: 'generate',
          status: 'success',
          contentSize: processedHTML.length
        });
      });
    }
  };

  /**
   * VAULT MANAGER
   */
  const VaultManager = {
    resolveVaultRefsInText(inputText) {
      if (!isNonEmptyString(inputText)) return inputText;
      const regex = /{{<vaultref\s+id=\"([^\"]+)\"\s*\/>}}/g;
      const vault = Storage.loadVault();

      return inputText.replace(regex, (match, vaultId) => {
        const entry = vault.find(v => v.identifier === vaultId);
        if (!entry) {
          return `/* [MISSING_VAULT:${vaultId}] */`;
        }
        return entry.content || '';
      });
    },

    getVaultSummary() {
      const vault = Storage.loadVault();
      return vault.map(v => `- [${v.identifier}] ${v.type}: ${v.description}`).join('\n');
    },

    getVaultEntry(id, limit = null) {
      const vault = Storage.loadVault();
      const entry = vault.find(v => v.identifier === id);
      if (!entry) return null;
      
      let content = entry.content;
      if (limit && limit !== 'full-length') {
        const limitNum = parseInt(limit) || 100;
        content = content.substring(0, limitNum) + (content.length > limitNum ? '...' : '');
      }
      
      return { ...entry, content };
    }
  };

  /**
   * JAVASCRIPT EXECUTOR
   */
  const JSExecutor = {
    executeCode(rawCode) {
      const startTime = Date.now();
      const executionId = generateId('exec');
      
      try {
        const expandedCode = VaultManager.resolveVaultRefsInText(rawCode);
        
        const vaultRefsUsed = [];
        const vaultRefRegex = /{{<vaultref\s+id=\"([^\"]+)\"\s*\/>}}/g;
        let vaultMatch;
        while ((vaultMatch = vaultRefRegex.exec(rawCode)) !== null) {
          vaultRefsUsed.push(vaultMatch[1]);
        }
        
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.log = (...args) => {
          const message = args.map(arg => {
            if (typeof arg === 'object') {
              try { return JSON.stringify(arg, null, 2); } catch { return String(arg); }
            }
            return String(arg);
          }).join(' ');
          logs.push({ type: 'log', message });
          originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
          const message = args.map(arg => String(arg)).join(' ');
          logs.push({ type: 'error', message });
          originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
          const message = args.map(arg => String(arg)).join(' ');
          logs.push({ type: 'warn', message });
          originalWarn.apply(console, args);
        };

        const fn = new Function(expandedCode);
        const result = fn();
        const executionTime = Date.now() - startTime;
        
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        
        const executionResult = {
          id: executionId,
          success: true,
          code: rawCode,
          expandedCode: expandedCode,
          result: result,
          logs: logs,
          executionTime: executionTime,
          vaultRefsUsed: vaultRefsUsed,
          timestamp: nowISO()
        };
        
        Storage.appendExecutionResult(executionResult);
        Storage.appendToolActivity({
          type: 'js_execute',
          action: 'execute',
          id: executionId,
          status: 'success',
          executionTime: executionTime,
          codeSize: rawCode.length,
          vaultRefsUsed: vaultRefsUsed.length,
          logsCount: logs.length
        });
        
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== JAVASCRIPT EXECUTION RESULT ===\nSUCCESS: true\nCONSOLE OUTPUT:\n${logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n')}\nRETURN VALUE:\n${result ? JSON.stringify(result, null, 2) : 'undefined'}`);
        Storage.saveReasoningLog(logEntries);
        
        console.log(`✓ JavaScript execution completed successfully (${executionTime}ms)`);
        return executionResult;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        console.log = console.log;
        console.error = console.error;
        console.warn = console.warn;
        
        const executionResult = {
          id: executionId,
          success: false,
          code: rawCode,
          error: error.message,
          stack: error.stack,
          executionTime: executionTime,
          timestamp: nowISO()
        };
        
        Storage.appendExecutionResult(executionResult);
        Storage.appendToolActivity({
          type: 'js_execute',
          action: 'execute',
          id: executionId,
          status: 'error',
          error: error.message,
          executionTime: executionTime,
          codeSize: rawCode.length
        });
        
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== JAVASCRIPT EXECUTION RESULT ===\nSUCCESS: false\nERROR: ${error.message}\nSTACK: ${error.stack}`);
        Storage.saveReasoningLog(logEntries);
        
        console.error('✗ JavaScript execution failed:', error);
        return executionResult;
      }
    }
  };

  /**
   * GEMINI CLIENT INTEGRATION
   */
  const GeminiAPI = {
    async fetchModelList() {
      KeyManager.liftCooldowns();
      const picked = KeyManager.chooseActiveKey();
      if (!picked) {
        console.error('No valid API key for model list');
        return;
      }

      const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' +
        encodeURIComponent(picked.key);

      try {
        const resp = await fetch(url);
        if (resp.status === 429) {
          KeyManager.markRateLimit(picked.slot, 30);
          return;
        }
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            KeyManager.markValid(picked.slot, false);
          }
          console.error('fetchModelList() non-OK', `status ${resp.status}`);
          return;
        }

        const data = await resp.json();
        if (!data || !Array.isArray(data.models)) return;

        Renderer.populateModelDropdown(data.models);
        KeyManager.markValid(picked.slot, true);
      } catch (err) {
        console.error('fetchModelList() exception', err);
      }
    },

    async generateContent(modelId, prompt) {
      KeyManager.liftCooldowns();
      let picked = KeyManager.chooseActiveKey();
      if (!picked) throw new Error('No usable key');

      const cleanModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelId}:generateContent?key=${encodeURIComponent(picked.key)}`;
      
      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8192
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      console.log('Making request to:', url);

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (resp.status === 429) {
          KeyManager.markRateLimit(picked.slot, 30);
          picked = KeyManager.chooseActiveKey();
          if (!picked) throw new Error('Rate limited. No backup key.');
          
          const cleanModelId2 = picked.modelId?.startsWith('models/') ? picked.modelId : `models/${picked.modelId || modelId}`;
          const url2 = `https://generativelanguage.googleapis.com/v1beta/${cleanModelId2}:generateContent?key=${encodeURIComponent(picked.key)}`;
          const resp2 = await fetch(url2, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (!resp2.ok) {
            const errorText = await resp2.text();
            throw new Error(`Gemini request failed: ${resp2.status} - ${errorText}`);
          }
          KeyManager.bumpUsage(picked.slot);
          return resp2.json();
        }

        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            KeyManager.markValid(picked.slot, false);
          }
          const errorText = await resp.text();
          throw new Error(`Gemini request failed: ${resp.status} - ${errorText}`);
        }

        KeyManager.bumpUsage(picked.slot);
        return resp.json();
      } catch (err) {
        console.error('generateContent error:', err);
        throw err;
      }
    },

    extractResponseText(response) {
      if (!response || !response.candidates || !response.candidates[0]) {
        return '';
      }
      const parts = response.candidates[0].content?.parts || [];
      return parts.map(p => p.text || '').join('\n').trim();
    }
  };

  /**
   * REASONING ENGINE
   */
  const ReasoningEngine = {
    buildContextPrompt(query, iteration) {
      const tasks = Storage.loadTasks();
      const goals = Storage.loadGoals();
      const memory = Storage.loadMemory();
      const vaultSummary = VaultManager.getVaultSummary();
      const reasoningLog = Storage.loadReasoningLog();
      const executionLog = Storage.loadExecutionLog();

      const tasksText = tasks.map(t => 
        `- [${t.identifier}] ${t.heading} (${t.status}): ${t.content}${t.notes ? ` | Notes: ${t.notes}` : ''}`
      ).join('\n');
      
      const goalsText = goals.map(g => 
        `- [${g.identifier}] ${g.heading}: ${g.content}${g.notes ? ` | Notes: ${g.notes}` : ''}`
      ).join('\n');
      
      const memoryText = memory.map(m => 
        `- [${m.identifier}] ${m.heading}: ${m.content}${m.notes ? ` | Notes: ${m.notes}` : ''}`
      ).join('\n');

      const recentLog = reasoningLog.slice(-3).join('\n\n---\n\n');
      
      const recentExecutions = executionLog.slice(-2).map(exec => 
        `[${exec.timestamp}] SUCCESS: ${exec.success}, ${exec.success ? 'RESULT: ' + JSON.stringify(exec.result) : 'ERROR: ' + exec.error}`
      ).join('\n');

      return `${SYSTEM_PROMPT}

## CURRENT SESSION CONTEXT

**User Query:** ${query}

**Current Tasks:**
${tasksText || 'None yet'}

**Goals:**
${goalsText || 'None yet'}

**Memory:**
${memoryText || 'None yet'}

**Vault Index:**
${vaultSummary || 'Empty'}

**Recent JavaScript Executions:**
${recentExecutions || 'None yet'}

**Recent Reasoning Log:**
${recentLog || 'None yet'}

**Iteration:** ${iteration}/${MAX_ITERATIONS}

---

Analyze the current state intelligently. Think about what needs to be done, then create meaningful tasks/goals that advance toward completion. Use JavaScript execution for accuracy. Make measurable progress this iteration.`;
    },

    checkGoalsComplete() {
      const goals = Storage.loadGoals();
      const tasks = Storage.loadTasks();
      
      if (goals.length === 0) return false;
      
      const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'ongoing');
      return activeTasks.length === 0;
    }
  };

  /**
   * CODE EXECUTOR (Manual UI)
   */
  const CodeExecutor = {
    run() {
      const editorEl = qs('#codeInput');
      const outputEl = qs('#execOutput');
      const pill = qs('#execStatus');

      if (!editorEl || !outputEl || !pill) return;

      const rawCode = editorEl.value || '';
      const expanded = VaultManager.resolveVaultRefsInText(rawCode);

      const logs = [];
      const origLog = console.log;
      console.log = (...args) => {
        const line = args.map(a => {
          try {
            if (typeof a === 'string') return a;
            return JSON.stringify(a, null, 2);
          } catch {
            return String(a);
          }
        }).join(' ');
        logs.push(line);
        origLog.apply(console, args);
      };

      pill.textContent = 'RUNNING';

      try {
        const fn = new Function(expanded);
        const ret = fn();
        if (ret !== undefined) {
          logs.push('[RETURN] ' + JSON.stringify(ret, null, 2));
        }
        pill.textContent = 'OK';
      } catch (err) {
        logs.push('[ERROR] ' + (err.stack || err.message || String(err)));
        pill.textContent = 'ERROR';
      } finally {
        console.log = origLog;
      }

      outputEl.textContent = logs.length ? logs.join('\n') : 'No output';
    },

    clear() {
      const editorEl = qs('#codeInput');
      const outputEl = qs('#execOutput');
      const pill = qs('#execStatus');

      if (editorEl) editorEl.value = '// Use {{<vaultref id="example" />}} to inline vault content\nconsole.log("Hello GDRS");\nreturn { status: "ready", timestamp: new Date() };';
      if (outputEl) outputEl.textContent = 'Execution output will appear here...';
      if (pill) pill.textContent = 'READY';
    }
  };

  /**
   * FIXED LOOP CONTROLLER - No premature task generation
   */
  const LoopController = (() => {
    let active = false;
    let iterationCount = 0;
    let loopTimer = null;

    async function runIteration() {
      if (!active) return;

      const modelSelect = qs('#modelSelect');
      const modelId = modelSelect ? modelSelect.value : '';
      
      if (!modelId || modelId === '') {
        console.error('No model selected');
        return;
      }

      const currentQuery = Storage.loadCurrentQuery();
      if (!currentQuery) {
        console.error('No current query');
        return;
      }

      iterationCount++;
      window.GDRS.currentIteration = iterationCount;
      updateIterationDisplay();

      try {
        const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
        const response = await GeminiAPI.generateContent(modelId, prompt);
        const responseText = GeminiAPI.extractResponseText(response);

        if (!responseText) {
          throw new Error('Empty response from model');
        }

        const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
        const pureReasoningTexts = reasoningBlocks.map(block => 
          ReasoningParser.extractPureReasoningText(block)
        ).filter(text => text.length > 0);
        
        if (pureReasoningTexts.length > 0) {
          const logEntries = Storage.loadReasoningLog();
          logEntries.push(`=== ITERATION ${iterationCount} - REASONING ===\n${pureReasoningTexts.join('\n\n')}`);
          Storage.saveReasoningLog(logEntries);
        }

        reasoningBlocks.forEach(block => {
          const operations = ReasoningParser.parseOperations(block);
          ReasoningParser.applyOperations(operations);
        });

        Renderer.renderAll();

        if (ReasoningEngine.checkGoalsComplete()) {
          await finalizeFinalOutput(currentQuery);
          stopSession();
          return;
        }

        if (iterationCount >= MAX_ITERATIONS) {
          await finalizeFinalOutput(currentQuery);
          stopSession();
          return;
        }

        if (active) {
          loopTimer = setTimeout(() => runIteration(), ITERATION_DELAY);
        }
      } catch (err) {
        console.error('Iteration error:', err);
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== ITERATION ${iterationCount} - ERROR ===\n${err.message}\n${err.stack || ''}`);
        Storage.saveReasoningLog(logEntries);
        Renderer.renderReasoningLog();
        stopSession();
      }
    }

    async function finalizeFinalOutput(query) {
      const tasks = Storage.loadTasks();
      const goals = Storage.loadGoals();
      const memory = Storage.loadMemory();
      const vault = Storage.loadVault();

      const currentOutput = Storage.loadFinalOutput();
      if (currentOutput.html && currentOutput.html !== '<p>Report will render here after goal validation.</p>') {
        return;
      }

      const completedTasks = tasks.filter(t => t.status === 'finished');
      const goalsSummary = goals.map(g => `**${g.heading}**: ${g.content}`).join('\n');
      const keyFindings = memory.map(m => `**${m.heading}**: ${m.content} ${m.notes ? `(${m.notes})` : ''}`).join('\n');
      
      let finalHtml = `
        <div style="font-family: var(--fs); line-height: 1.5;">
          <h2>Research Analysis Complete</h2>
          <p><strong>Query:</strong> ${encodeHTML(query)}</p>
          <p><strong>Iterations:</strong> ${iterationCount}</p>
          <p><strong>Status:</strong> ${ReasoningEngine.checkGoalsComplete() ? 'Goals Achieved' : 'Max Iterations Reached'}</p>
          
          <h3>Goals</h3>
          <div style="margin: 12px 0;">${goalsSummary || 'No goals defined'}</div>
          
          <h3>Completed Tasks</h3>
          <ul>
      `;
      
      completedTasks.forEach(task => {
        finalHtml += `<li><strong>${encodeHTML(task.heading)}</strong>: ${encodeHTML(task.content)}</li>`;
      });
      
      finalHtml += `
          </ul>
          
          <h3>Key Findings</h3>
          <div style="margin: 12px 0;">${keyFindings || 'No key findings recorded'}</div>
      `;
      
      const resultVault = vault.filter(v => v.description.toLowerCase().includes('result') || v.description.toLowerCase().includes('final'));
      if (resultVault.length > 0) {
        finalHtml += `<h3>Generated Content</h3>`;
        resultVault.forEach(v => {
          finalHtml += `<div style="margin: 12px 0;"><strong>${encodeHTML(v.description)}</strong>:<br/><pre style="background: var(--bg-alt); padding: 12px; border-radius: 6px; overflow-x: auto;">${encodeHTML(v.content)}</pre></div>`;
        });
      }
      
      finalHtml += `</div>`;
      
      finalHtml = VaultManager.resolveVaultRefsInText(finalHtml);
      
      Storage.saveFinalOutput(finalHtml);
      Renderer.renderFinalOutput();
    }

    function updateIterationDisplay() {
      const iterCountEl = qs('#iterationCount');
      if (iterCountEl) iterCountEl.textContent = String(iterationCount);
    }

    async function startSession() {
      const queryEl = qs('#userQuery');
      const sessionPill = qs('#sessionStatus');

      if (!queryEl) return;

      const rawQuery = queryEl.value.trim();
      if (!rawQuery) {
        alert('Please enter a research query');
        return;
      }

      const activeKey = KeyManager.chooseActiveKey();
      if (!activeKey) {
        alert('Please add and validate at least one API key');
        return;
      }

      const modelSelect = qs('#modelSelect');
      if (!modelSelect || !modelSelect.value) {
        alert('Please select a model from the dropdown');
        return;
      }

      active = true;
      iterationCount = 0;
      
      if (sessionPill) sessionPill.textContent = 'RUNNING';

      Storage.saveCurrentQuery(rawQuery);

      // FIXED: Don't create any tasks/goals upfront - let LLM analyze first
      Storage.saveTasks([]);
      Storage.saveGoals([]);
      Storage.saveReasoningLog([`=== SESSION START ===\nQuery: ${rawQuery}\nWaiting for LLM analysis...`]);
      Storage.saveExecutionLog([]);
      Storage.saveToolActivityLog([]);

      Storage.saveFinalOutput('');

      Renderer.renderAll();

      setTimeout(() => runIteration(), 1000);
    }

    function stopSession() {
      active = false;
      if (loopTimer) {
        clearTimeout(loopTimer);
        loopTimer = null;
      }
      
      const sessionPill = qs('#sessionStatus');
      if (sessionPill) sessionPill.textContent = 'IDLE';
      
      const runBtn = qs('#runQueryBtn');
      if (runBtn) runBtn.textContent = 'Run Analysis';
    }

    return {
      startSession,
      stopSession,
      isActive: () => active
    };
  })();
