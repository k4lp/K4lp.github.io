/**
 * GEMINI DEEP RESEARCH SYSTEM - MAIN APPLICATION
 * Complete production runtime with LLM integration
 */

(function() {
  'use strict';

  // Application constants
  const VERSION = '1.0.0';
  const MAX_ITERATIONS = 20;
  const ITERATION_DELAY = 2000;
  
  // Local storage keys
  const LS_KEYS = {
    META: 'gdrs_meta',
    KEYPOOL: 'gdrs_keypool', 
    GOALS: 'gdrs_goals',
    MEMORY: 'gdrs_memory',
    TASKS: 'gdrs_tasks',
    VAULT: 'gdrs_vault',
    FINAL_OUTPUT: 'gdrs_final_output',
    REASONING_LOG: 'gdrs_reasoning_log',
    CURRENT_QUERY: 'gdrs_current_query'
  };

  // Default data structures
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
   * SYSTEM PROMPT - Enhanced for better LLM interaction
   */
  const SYSTEM_PROMPT = `# GEMINI DEEP RESEARCH SYSTEM - LLM INTERFACE

You are the core reasoning engine of the Gemini Deep Research System (GDRS), a browser-based research assistant with iterative reasoning, unlimited code execution, and persistent storage management.

## CRITICAL RULES

1. **ALL STORAGE OPERATIONS MUST BE WRAPPED IN REASONING BLOCKS**:
   All memory, task, goal, and vault operations MUST occur within:
   
   {{<reasoning_text>}}
   ... your operations here ...
   {{</reasoning_text>}}

2. **IMMUTABILITY RULES**:
   - Task/Memory/Goal: heading and content are IMMUTABLE after creation
   - Only 'notes' and 'status' (tasks only) can be updated
   - Tasks CANNOT be deleted (by design)

3. **ITERATION CONTROL**:
   - Continue reasoning until all goals are satisfied
   - Each iteration should make concrete progress
   - Use tasks to track workflow steps
   - Use memory for important context that should persist

## AVAILABLE OPERATIONS

### Memory Operations
\`\`\`
{{<reasoning_text>}}
{{<memory identifier="unique_id" heading="Memory Title" content="Detailed content" notes="" />}}
{{<memory identifier="existing_id" notes="Additional context" />}}
{{<memory identifier="existing_id" delete />}}
{{</reasoning_text>}}
\`\`\`

### Task Operations
\`\`\`
{{<reasoning_text>}}
{{<task identifier="unique_id" heading="Task Title" content="Detailed task" notes="" />}}
{{<task identifier="existing_id" notes="Progress update" status="ongoing" />}}
{{</reasoning_text>}}
\`\`\`
Valid statuses: "pending" | "ongoing" | "finished" | "paused"

### Goal Operations
\`\`\`
{{<reasoning_text>}}
{{<goal identifier="unique_id" heading="Goal Title" content="Detailed goal" notes="" />}}
{{<goal identifier="existing_id" notes="Additional context" />}}
{{<goal identifier="existing_id" delete />}}
{{</reasoning_text>}}
\`\`\`

### Data Vault Operations
\`\`\`
{{<reasoning_text>}}
{{<datavault id="dv_unique_id" type="code" description="Brief description">}}
function processData(input) {
  // your code here
  return result;
}
{{</datavault>}}

{{<datavault id="existing_id" delete />}}
{{<datavault id="existing_id" action="request_read" limit="100" />}}
{{</reasoning_text>}}
\`\`\`
Types: "code" | "text" | "data"
For limit: use number for character limit or "full-length" for complete content

### Vault References (Use anywhere)
\`\`\`
{{<vaultref id="dv_unique_id" />}}
\`\`\`
This gets substituted with actual vault content during code execution and final output.

## REASONING WORKFLOW

1. **Query Analysis**: Break down the user query into atomic subtasks
2. **Task Generation**: Create specific, actionable tasks with clear success criteria
3. **Context Building**: Establish memories for important information and goals for success criteria
4. **Iterative Processing**: 
   - Work through tasks systematically
   - Update task status and notes as you progress
   - Store important findings in memory
   - Use vault for large code/data that needs to be reused
5. **Goal Verification**: Ensure all goals are met before completion
6. **Final Output**: Provide comprehensive results using vault references as needed

Always make concrete progress each iteration. Focus on moving tasks from "pending" to "ongoing" to "finished" while building toward goal completion.`;

  /**
   * STORAGE LAYER
   */
  const Storage = {
    // Keypool management
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

    // Entity storage
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

    // Output and logs
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
   * REASONING TEXT PARSER
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

    parseOperations(blockText) {
      const operations = {
        memories: [],
        tasks: [],
        goals: [],
        vault: []
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

      // Parse vault operations (both self-closing and block form)
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
      // Apply memory operations
      operations.memories.forEach(op => {
        if (op.delete) {
          const memories = Storage.loadMemory().filter(m => m.identifier !== op.identifier);
          Storage.saveMemory(memories);
        } else if (op.identifier) {
          const memories = Storage.loadMemory();
          const existing = memories.find(m => m.identifier === op.identifier);
          if (existing) {
            if (op.notes !== undefined) existing.notes = op.notes;
          } else if (op.heading && op.content) {
            memories.push({
              identifier: op.identifier,
              heading: op.heading,
              content: op.content,
              notes: op.notes || '',
              createdAt: nowISO()
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
          } else if (op.heading && op.content) {
            tasks.push({
              identifier: op.identifier,
              heading: op.heading,
              content: op.content,
              status: op.status && ['pending', 'ongoing', 'finished', 'paused'].includes(op.status) ? op.status : 'pending',
              notes: op.notes || '',
              createdAt: nowISO()
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
        } else if (op.identifier) {
          const goals = Storage.loadGoals();
          const existing = goals.find(g => g.identifier === op.identifier);
          if (existing) {
            if (op.notes !== undefined) existing.notes = op.notes;
          } else if (op.heading && op.content) {
            goals.push({
              identifier: op.identifier,
              heading: op.heading,
              content: op.content,
              notes: op.notes || '',
              createdAt: nowISO()
            });
          }
          Storage.saveGoals(goals);
        }
      });

      // Apply vault operations
      operations.vault.forEach(op => {
        if (op.delete) {
          const vault = Storage.loadVault().filter(v => v.identifier !== op.id);
          Storage.saveVault(vault);
        } else if (op.id && op.content !== undefined) {
          const vault = Storage.loadVault();
          const existing = vault.find(v => v.identifier === op.id);
          if (existing) {
            existing.content = op.content;
            if (op.type) existing.type = op.type;
            if (op.description) existing.description = op.description;
          } else {
            vault.push({
              identifier: op.id,
              type: op.type || 'text',
              description: op.description || '',
              content: op.content,
              createdAt: nowISO()
            });
          }
          Storage.saveVault(vault);
        }
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

      // Ensure modelId doesn't have duplicate "models/" prefix
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

**Recent Reasoning Log:**
${recentLog || 'None yet'}

**Iteration:** ${iteration}/${MAX_ITERATIONS}

---

Analyze the current state and take concrete action to advance toward goal completion. Use the reasoning block format for all storage operations. Focus on making measurable progress this iteration.`;
    },

    checkGoalsComplete() {
      const goals = Storage.loadGoals();
      const tasks = Storage.loadTasks();
      
      if (goals.length === 0) return false;
      
      // Simple heuristic: goals are complete if no tasks are pending/ongoing
      const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'ongoing');
      return activeTasks.length === 0;
    }
  };

  /**
   * CODE EXECUTOR
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
   * LOOP CONTROLLER
   */
  const LoopController = (() => {
    let active = false;
    let iterationCount = 0;
    let loopTimer = null;

    function decomposeQuery(queryStr) {
      const parts = queryStr.split(/[.?!\n]+/g)
        .map(s => s.trim())
        .filter(Boolean);
      return parts.length ? parts : [queryStr.trim()];
    }

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
      updateIterationDisplay();

      try {
        const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
        const response = await GeminiAPI.generateContent(modelId, prompt);
        const responseText = GeminiAPI.extractResponseText(response);

        if (!responseText) {
          throw new Error('Empty response from model');
        }

        // Log the full response
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== ITERATION ${iterationCount} ===\n${responseText}`);
        Storage.saveReasoningLog(logEntries);

        // Parse and apply reasoning operations
        const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
        reasoningBlocks.forEach(block => {
          const operations = ReasoningParser.parseOperations(block);
          ReasoningParser.applyOperations(operations);
        });

        // Re-render everything
        Renderer.renderAll();

        // Check if goals are complete
        if (ReasoningEngine.checkGoalsComplete()) {
          await finalizeFinalOutput(currentQuery);
          stopSession();
          return;
        }

        // Check iteration limit
        if (iterationCount >= MAX_ITERATIONS) {
          await finalizeFinalOutput(currentQuery);
          stopSession();
          return;
        }

        // Schedule next iteration
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

      // Build comprehensive final output
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
      
      // Add vault content if any contains final results
      const resultVault = vault.filter(v => v.description.toLowerCase().includes('result') || v.description.toLowerCase().includes('final'));
      if (resultVault.length > 0) {
        finalHtml += `<h3>Generated Content</h3>`;
        resultVault.forEach(v => {
          finalHtml += `<div style="margin: 12px 0;"><strong>${encodeHTML(v.description)}</strong>:<br/><pre style="background: var(--bg-alt); padding: 12px; border-radius: 6px; overflow-x: auto;">${encodeHTML(v.content)}</pre></div>`;
        });
      }
      
      finalHtml += `</div>`;
      
      // Apply vault substitutions
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

      // Check if we have a valid key
      const activeKey = KeyManager.chooseActiveKey();
      if (!activeKey) {
        alert('Please add and validate at least one API key');
        return;
      }

      // Check if model is selected
      const modelSelect = qs('#modelSelect');
      if (!modelSelect || !modelSelect.value) {
        alert('Please select a model from the dropdown');
        return;
      }

      active = true;
      iterationCount = 0;
      
      if (sessionPill) sessionPill.textContent = 'RUNNING';

      // Store the query
      Storage.saveCurrentQuery(rawQuery);

      // Initialize with basic setup
      const subtasks = decomposeQuery(rawQuery);
      const initialTasks = subtasks.map((task, i) => ({
        identifier: generateId('task'),
        heading: task.slice(0, 60) + (task.length > 60 ? '...' : ''),
        content: task,
        status: 'pending',
        notes: '',
        createdAt: nowISO()
      }));

      const initialGoal = {
        identifier: generateId('goal'),
        heading: 'Complete Research Analysis',
        content: rawQuery,
        notes: '',
        createdAt: nowISO()
      };

      Storage.saveTasks(initialTasks);
      Storage.saveGoals([initialGoal]);
      Storage.saveReasoningLog([`=== SESSION START ===\nQuery: ${rawQuery}\nDecomposed into ${subtasks.length} tasks`]);

      // Clear final output
      Storage.saveFinalOutput('');

      // Initial render
      Renderer.renderAll();

      // Start the reasoning loop
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

  /**
   * RENDERER
   */
  const Renderer = {
    renderKeys() {
      const pool = Storage.loadKeypool();
      const keysGrid = qs('#keysGrid');
      if (!keysGrid) return;

      keysGrid.innerHTML = '';

      pool.forEach((k) => {
        const row = document.createElement('div');
        row.className = 'keyrow';
        
        const field = document.createElement('input');
        field.type = 'password';
        field.placeholder = `API Key #${k.slot}`;
        field.value = k.key;
        field.autocomplete = 'off';
        field.spellcheck = false;
        field.addEventListener('input', (e) => {
          KeyManager.setKey(k.slot, e.target.value);
        });

        const meta = document.createElement('div');
        meta.className = 'keymeta';
        const cooldownSecs = KeyManager.getCooldownRemainingSeconds(k);
        meta.innerHTML = `
          <div><div class="pm">valid</div><div class="mono">${k.valid ? 'yes' : 'no'}</div></div>
          <div><div class="pm">usage</div><div class="mono">${k.usage} calls</div></div>
          <div><div class="pm">rate</div><div class="mono">${cooldownSecs > 0 ? `cooldown ${cooldownSecs}s` : (k.rateLimited ? 'limited' : 'ok')}</div></div>
        `;

        row.appendChild(field);
        row.appendChild(meta);
        keysGrid.appendChild(row);
      });

      // Update rotation pill
      const rotPill = qs('#keyRotationPill');
      const nextKey = KeyManager.chooseActiveKey();
      if (rotPill) {
        rotPill.textContent = nextKey ? `NEXT: #${nextKey.slot}` : 'NO KEY';
      }
    },

    populateModelDropdown(modelsArray) {
      const modelSelect = qs('#modelSelect');
      if (!modelSelect) return;

      const currentValue = modelSelect.value;
      
      modelSelect.innerHTML = `<option value="">-- select model --</option>`;

      modelsArray.forEach((m) => {
        const fullName = m.name || '';
        const label = fullName.replace(/^models\//, '');
        const opt = document.createElement('option');
        opt.value = fullName;
        opt.textContent = label;
        modelSelect.appendChild(opt);
      });

      if (currentValue && modelsArray.some(m => m.name === currentValue)) {
        modelSelect.value = currentValue;
      } else if (modelsArray.length > 0) {
        // Auto-select a good default model
        const preferred = modelsArray.find(m => m.name.includes('gemini-1.5-pro')) || modelsArray[0];
        modelSelect.value = preferred.name;
      }
    },

    renderTasks() {
      const tasks = Storage.loadTasks();
      const tasksEl = qs('#tasksList');
      if (!tasksEl) return;

      if (tasks.length === 0) {
        tasksEl.innerHTML = '<div class="storage-placeholder">No tasks yet</div>';
        return;
      }

      tasksEl.innerHTML = tasks.map(t => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(t.heading)}</div>
            <div class="pm">${encodeHTML(t.content)}</div>
            ${t.notes ? `<div class="pm">Notes: ${encodeHTML(t.notes)}</div>` : ''}
          </div>
          <div class="status">${encodeHTML(t.status.toUpperCase())}</div>
        </div>
      `).join('');
    },

    renderMemories() {
      const memory = Storage.loadMemory();
      const memEl = qs('#memoryList');
      if (!memEl) return;

      if (memory.length === 0) {
        memEl.innerHTML = '<div class="storage-placeholder">No memories yet</div>';
        return;
      }

      memEl.innerHTML = memory.map(m => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(m.heading)}</div>
            <div class="pm">${encodeHTML(m.content)}</div>
            ${m.notes ? `<div class="pm">Notes: ${encodeHTML(m.notes)}</div>` : ''}
          </div>
          <div class="id">${encodeHTML(m.identifier)}</div>
        </div>
      `).join('');
    },

    renderGoals() {
      const goals = Storage.loadGoals();
      const goalsEl = qs('#goalsList');
      if (!goalsEl) return;

      if (goals.length === 0) {
        goalsEl.innerHTML = '<div class="storage-placeholder">No goals yet</div>';
        return;
      }

      goalsEl.innerHTML = goals.map(g => `
        <div class="li">
          <div>
            <div class="mono">${encodeHTML(g.heading)}</div>
            <div class="pm">${encodeHTML(g.content)}</div>
            ${g.notes ? `<div class="pm">Notes: ${encodeHTML(g.notes)}</div>` : ''}
          </div>
          <div class="id">${encodeHTML(g.identifier)}</div>
        </div>
      `).join('');
    },

    renderVault() {
      const vault = Storage.loadVault();
      const vaultEl = qs('#vaultList');
      if (!vaultEl) return;

      if (vault.length === 0) {
        vaultEl.innerHTML = '<div class="storage-placeholder">No vault entries yet</div>';
        return;
      }

      vaultEl.innerHTML = vault.map(v => `
        <div class="li" data-vault-id="${encodeHTML(v.identifier)}">
          <div>
            <div class="mono">${encodeHTML(v.identifier)}</div>
            <div class="pm">${encodeHTML(v.description)}</div>
          </div>
          <div class="status">${encodeHTML(v.type.toUpperCase())}</div>
        </div>
      `).join('');

      // Add click handlers for vault modal
      qsa('[data-vault-id]', vaultEl).forEach(el => {
        el.addEventListener('click', () => {
          const id = el.getAttribute('data-vault-id');
          openVaultModal(id);
        });
      });
    },

    renderReasoningLog() {
      const logEntries = Storage.loadReasoningLog();
      const logEl = qs('#iterationLog');
      if (!logEl) return;

      if (logEntries.length === 0) {
        logEl.innerHTML = '<div class="log-placeholder">Reasoning iterations will appear here...</div>';
        return;
      }

      logEl.innerHTML = logEntries.map((entry, i) => `
        <div class="li">
          <div>
            <div class="mono">#${i + 1}</div>
            <pre class="mono" style="white-space:pre-wrap; font-size: 10px; line-height: 1.3;">${encodeHTML(entry)}</pre>
          </div>
        </div>
      `).join('');

      // Auto-scroll to bottom
      logEl.scrollTop = logEl.scrollHeight;
    },

    renderFinalOutput() {
      const output = Storage.loadFinalOutput();
      const finalEl = qs('#finalOutput');
      const statusEl = qs('#finalStatus');
      
      if (finalEl) {
        finalEl.innerHTML = output.html || '<div class="output-placeholder"><p>Research report will render here after analysis completion.</p></div>';
      }
      
      if (statusEl) {
        const isComplete = ReasoningEngine.checkGoalsComplete();
        statusEl.textContent = isComplete ? 'verified' : 'running';
      }
    },

    renderAll() {
      this.renderKeys();
      this.renderTasks();
      this.renderMemories();
      this.renderGoals();
      this.renderVault();
      this.renderReasoningLog();
      this.renderFinalOutput();
    }
  };

  /**
   * VAULT MODAL
   */
  function openVaultModal(vaultId) {
    const vault = Storage.loadVault();
    const entry = vault.find(v => v.identifier === vaultId);
    if (!entry) return;

    const modal = qs('#vaultModal');
    const idEl = qs('#vaultModalId');
    const typeEl = qs('#vaultModalType');
    const descEl = qs('#vaultModalDesc');
    const contentEl = qs('#vaultModalContent');

    if (idEl) idEl.textContent = entry.identifier;
    if (typeEl) typeEl.textContent = entry.type.toUpperCase();
    if (descEl) descEl.textContent = entry.description || '— no description —';
    if (contentEl) contentEl.textContent = entry.content;
    if (modal) modal.style.display = 'flex';
  }

  function closeVaultModal() {
    const modal = qs('#vaultModal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * EVENT BINDING
   */
  function bindEvents() {
    // Run buttons
    const runBtn = qs('#runQueryBtn');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        if (LoopController.isActive()) {
          LoopController.stopSession();
        } else {
          LoopController.startSession();
        }
      });
    }

    // Key management
    const validateBtn = qs('#validateKeys');
    const clearBtn = qs('#clearKeys');
    if (validateBtn) {
      validateBtn.addEventListener('click', async () => {
        validateBtn.textContent = 'validating...';
        await KeyManager.validateAllKeys();
        await GeminiAPI.fetchModelList();
        Renderer.renderKeys();
        validateBtn.textContent = 'Validate';
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        KeyManager.clearAll();
        Renderer.renderKeys();
      });
    }

    // Model selector
    const modelSelect = qs('#modelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('focus', () => {
        if (modelSelect.options.length <= 1) {
          GeminiAPI.fetchModelList();
        }
      });
    }

    // Code execution
    const execBtn = qs('#execBtn');
    const clearExecBtn = qs('#clearExec');
    if (execBtn) execBtn.addEventListener('click', () => CodeExecutor.run());
    if (clearExecBtn) clearExecBtn.addEventListener('click', () => CodeExecutor.clear());

    // Export
    const exportBtn = qs('#exportTxt');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const output = Storage.loadFinalOutput();
        const text = output.html
          .replace(/<[^>]+>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"');
        
        const blob = new Blob([`GDRS Analysis Report\n${'='.repeat(50)}\n\n${text}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gdrs-analysis-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Vault modal
    const closeModalBtn = qs('#vaultModalClose');
    const modal = qs('#vaultModal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeVaultModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeVaultModal();
      });
    }

    // Clear all data (for testing)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        if (confirm('Clear all GDRS data? This cannot be undone.')) {
          Object.values(LS_KEYS).forEach(key => localStorage.removeItem(key));
          location.reload();
        }
      }
    });
  }

  /**
   * COOLDOWN TICKER
   */
  function startCooldownTicker() {
    setInterval(() => {
      Renderer.renderKeys();
    }, 1000);
  }

  /**
   * BOOT SEQUENCE
   */
  function boot() {
    console.log('%cGDRS Runtime Core v' + VERSION + ' - Booting...', 'color: #00ff00; font-weight: bold;');

    // Initialize storage if needed
    if (!localStorage.getItem(LS_KEYS.META)) {
      localStorage.setItem(LS_KEYS.META, JSON.stringify({ version: VERSION }));
      Storage.saveKeypool(DEFAULT_KEYPOOL());
      Storage.saveGoals([]);
      Storage.saveMemory([]);
      Storage.saveTasks([]);
      Storage.saveVault([]);
      Storage.saveFinalOutput('');
      Storage.saveReasoningLog([]);
      Storage.saveCurrentQuery('');
      console.log('%cGDRS - Fresh installation initialized', 'color: #ffaa00;');
    }

    // Initial render
    Renderer.renderAll();

    // Bind events
    bindEvents();

    // Start tickers
    startCooldownTicker();

    // Auto-fetch models if we have keys
    setTimeout(() => {
      const activeKey = KeyManager.chooseActiveKey();
      if (activeKey) {
        GeminiAPI.fetchModelList();
      }
    }, 1000);

    console.log('%cGDRS Runtime Core - Ready for Deep Research', 'color: #00ff00; font-weight: bold;');
    console.log('%cAdd API keys, select a model, and enter your research query to begin.', 'color: #aaaaaa;');
  }

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Export to global scope for debugging
  if (typeof window !== 'undefined') {
    window.GDRS = window.GDRS || {};
    Object.assign(window.GDRS, {
      VERSION,
      Storage,
      KeyManager,
      ReasoningParser,
      VaultManager,
      GeminiAPI,
      ReasoningEngine,
      CodeExecutor,
      LoopController,
      Renderer,
      boot
    });
  }
})();