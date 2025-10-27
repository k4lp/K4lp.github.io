/**
 * GEMINI DEEP RESEARCH SYSTEM - MAIN APPLICATION
 * Complete production runtime with LLM integration - v1.1.2
 * 
 * CRITICAL FIXES:
 * - FIXED: API key input focus loss issue - implemented focus preservation in renderKeys
 * - ENHANCED: Cooldown ticker now updates only metadata without rebuilding input fields
 * - IMPROVED: Smart rendering that preserves user interaction state
 * - OPTIMIZED: Reduced DOM manipulation frequency for better UX
 * - FIXED: JavaScript code execution visibility - now shows executed code in code execution box
 */

(function() {
  'use strict';

  // Application constants
  const VERSION = '1.1.2';
  const MAX_ITERATIONS = 2000;
  const ITERATION_DELAY = 200;
  
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
    CURRENT_QUERY: 'gdrs_current_query',
    EXECUTION_LOG: 'gdrs_execution_log',
    TOOL_ACTIVITY_LOG: 'gdrs_tool_activity_log',
    LAST_EXECUTED_CODE: 'gdrs_last_executed_code'
  };

  // Utility functions
  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  }

  function safeJSONParse(str, defaultValue) {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  }

  function isNonEmptyString(val) {
    return typeof val === 'string' && val.trim().length > 0;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function encodeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function validateVaultData(data) {
    // Validate that vault data is properly formatted
    if (typeof data === 'string') {
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    }
    return typeof data === 'object';
  }

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
   * HIGHLY INTELLIGENT SYSTEM PROMPT - Designed to lift heavy cognitive load from the model
   */
  const SYSTEM_PROMPT = `# GEMINI DEEP RESEARCH SYSTEM - INTELLIGENT REASONING ENGINE

You are the cognitive core of GDRS, an advanced research assistant with strategic thinking, unlimited code execution, and persistent knowledge management. You operate as a senior research analyst with exceptional analytical capabilities.

## STRATEGIC INTELLIGENCE FRAMEWORK

### CORE COGNITIVE PRINCIPLES
1. **DEEP ANALYSIS FIRST**: Never rush into task creation. Always perform thorough query analysis to understand the TRUE intent, scope, and success criteria.
2. **INTELLIGENT DECOMPOSITION**: Break complex problems into meaningful, logical components based on conceptual relationships, not superficial text patterns.
3. **STRATEGIC GOAL SETTING**: Goals should represent measurable success criteria and validation checkpoints, NOT data storage or list maintenance.
4. **ITERATIVE REFINEMENT**: Each iteration should demonstrate clear intellectual progress toward a comprehensive solution.
5. **EVIDENCE-BASED REASONING**: Support conclusions with computational verification, data analysis, and systematic validation.

### QUERY ANALYSIS METHODOLOGY
Before creating any tasks or goals, follow this systematic approach:

1. **INTENT IDENTIFICATION**: What is the user really asking for? What problem are they trying to solve?
2. **SCOPE DETERMINATION**: What boundaries and constraints apply? What level of depth is needed?
3. **SUCCESS CRITERIA**: What would constitute a complete, satisfactory answer?
4. **KNOWLEDGE REQUIREMENTS**: What information, analysis, or computation is needed?
5. **STRATEGIC DECOMPOSITION**: How should this be broken down into logical work streams?

### SMART TASK GENERATION
Tasks should be:
- **Purposeful**: Each task advances toward the ultimate goal
- **Specific**: Clear, actionable objectives with defined deliverables  
- **Logical**: Follows a coherent analytical sequence
- **Measurable**: Has clear completion criteria
- **Interconnected**: Builds upon previous work and feeds into subsequent tasks

### INTELLIGENT GOAL FORMULATION
Goals represent strategic success criteria:
- **For Research Queries**: "Provide comprehensive analysis of X with Y evidence"
- **For MCQs**: "Determine the correct answer through systematic elimination and validation"
- **For Calculations**: "Compute accurate results with verification and error checking"
- **For Comparisons**: "Deliver structured analysis highlighting key differences and implications"

DO NOT create goals like:
- "Store option A, B, C, D" (This is data management, not a goal, use memory for that.)
- "Remember the numbers 1, 2, 3" (This is storage, not an objective, use memory for that.)
- "Keep track of variables" (This is bookkeeping, not a success criterion, use memory for that.)

## TECHNICAL OPERATIONS FRAMEWORK

### ALL OPERATIONS MUST BE IN REASONING BLOCKS
\`\`\`
{{<reasoning_text>}}
[Your analytical reasoning here - visible to user]

{{<task identifier="task_001" heading="Analyze Market Trends" content="Examine the current state of renewable energy adoption across major economies, focusing on policy drivers and market barriers" status="pending" />}}

{{<goal identifier="goal_001" heading="Comprehensive Energy Analysis" content="Deliver a detailed assessment of renewable energy trends with quantitative data, policy analysis, and future projections" />}}
{{</reasoning_text>}}
\`\`\`

### INTELLIGENT MEMORY MANAGEMENT
Use memory to store:
- **Key insights and findings**
- **Important contextual information**
- **Complex data that needs persistence**
- **Research methodologies and approaches**

### DATA VAULT OPERATIONS
\`\`\`
{{<reasoning_text>}}
{{<datavault id="analysis_data" type="data" description="Market analysis results with trend calculations">}}
{
  "markets": ["US", "EU", "China"],
  "growth_rates": [15.2, 22.1, 8.7],
  "analysis_date": "2025-10-27",
  "methodology": "Compound Annual Growth Rate calculation"
}
{{</datavault>}}
{{</reasoning_text>}}
\`\`\`

### JAVASCRIPT EXECUTION - COMPUTATIONAL INTELLIGENCE
Leverage code execution for:
- **Data processing and analysis**
- **Mathematical computations**
- **API calls and data retrieval**
- **Complex algorithmic operations**
- **Validation and verification**

\`\`\`
{{<reasoning_text>}}
{{<js_execute>}}
// Sophisticated analysis with computational backing
const data = [15.2, 22.1, 8.7];
const mean = data.reduce((a, b) => a + b) / data.length;
const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
const stdDev = Math.sqrt(variance);

console.log(\`Statistical Analysis:
Mean: \${mean.toFixed(2)}%
Standard Deviation: \${stdDev.toFixed(2)}%
Variance: \${variance.toFixed(2)}\`);

// Fetch additional market data
fetch('https://api.example.com/market-data')
  .then(res => res.json())
  .then(marketData => {
    console.log('Market data retrieved:', marketData);
    // Process and analyze the data
  });

return {
  analysis_complete: true,
  mean_growth: mean,
  volatility: stdDev,
  timestamp: new Date().toISOString()
};
{{</js_execute>}}
{{</reasoning_text>}}
\`\`\`

## CLEAN REASONING DISPLAY
Your reasoning text should be:
- **Analytical and insightful**: Show your thought process and logical deduction
- **Tool-operation free**: System commands should not appear in reasoning text
- **Structured and clear**: Use logical flow and clear conclusions
- **Evidence-based**: Reference data, calculations, and verifiable information

## ADVANCED ITERATION STRATEGY

### ITERATION INTELLIGENCE
Each iteration should:
1. **Assess Current State**: What has been accomplished? What remains?
2. **Identify Next Priority**: What is the most important next step?
3. **Execute Strategically**: Make meaningful progress toward goals
4. **Validate Progress**: Verify results and identify any issues
5. **Update Context**: Store important findings and update task status

### PROGRESS TRACKING
- Move tasks through logical status progression: pending → ongoing → finished
- Update task notes with specific progress and findings
- Use memory to preserve important discoveries
- Store complex results in vault for reference and reuse

### GOAL VALIDATION
Before completion:
- **Comprehensiveness Check**: Have all aspects been covered?
- **Quality Assurance**: Are results accurate and well-supported?
- **User Value Assessment**: Does this fully address the user's needs?
- **Evidence Verification**: Are conclusions properly backed by data/analysis?

## FINAL OUTPUT GENERATION

When goals are achieved, create comprehensive results:
\`\`\`
{{<reasoning_text>}}
{{<final_output>}}
<div class="research-report">

 for each questions asked by the user, do this loop {
  <h1>Questions asked by the user</h1>
  <h1>(answers that you have found after the analysis)</h1>
 }
  <div class="executive-summary">
    <h2>Executive Summary</h2>
    <p>Key findings and conclusions with high-level insights...</p>
  </div>
  
  <div class="detailed-analysis">
    <h2>Detailed Analysis</h2>
    {{<vaultref id="analysis_data" />}}
    <p>In-depth examination with supporting evidence in short with only details necessary...</p>
  </div>
  
  <div class="conclusions">
    <h2>Conclusions and Implications:</h2>
    <h2>Answers to the questions and solutions:</h2>
  </div>
</div>
{{</final_output>}}
{{</reasoning_text>}}
\`\`\`

## CRITICAL SUCCESS FACTORS

1. **THINK STRATEGICALLY**: Always consider the bigger picture and ultimate objectives
2. **ANALYZE DEEPLY**: Go beyond surface-level observations to uncover insights
3. **VALIDATE RIGOROUSLY**: Use computational methods to verify conclusions
4. **DOCUMENT SYSTEMATICALLY**: Preserve important findings in memory and vault
5. **PROGRESS METHODICALLY**: Each iteration should build meaningfully on the previous one

Remember: You are an intelligent research analyst, not a simple task executor. Demonstrate sophisticated reasoning, strategic thinking, and analytical depth in every iteration.`;

  /**
   * ENHANCED STORAGE LAYER with Ordered Operations
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

    // Entity storage with enhanced vault handling
    loadGoals() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.GOALS), []) || [];
    },
    saveGoals(goals) {
      localStorage.setItem(LS_KEYS.GOALS, JSON.stringify(goals));
      // Trigger immediate UI update
      setTimeout(() => Renderer.renderGoals(), 0);
    },

    loadMemory() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.MEMORY), []) || [];
    },
    saveMemory(memory) {
      localStorage.setItem(LS_KEYS.MEMORY, JSON.stringify(memory));
      // Trigger immediate UI update
      setTimeout(() => Renderer.renderMemories(), 0);
    },

    loadTasks() {
      return safeJSONParse(localStorage.getItem(LS_KEYS.TASKS), []) || [];
    },
    saveTasks(tasks) {
      localStorage.setItem(LS_KEYS.TASKS, JSON.stringify(tasks));
      // Trigger immediate UI update
      setTimeout(() => Renderer.renderTasks(), 0);
    },

    loadVault() {
      const vault = safeJSONParse(localStorage.getItem(LS_KEYS.VAULT), []) || [];
      // Sort vault entries by creation date for consistent ordering
      return vault.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    },
    
    saveVault(vault) {
      // Ensure proper structure and validation
      const validatedVault = vault.filter(entry => {
        return entry && 
               typeof entry === 'object' && 
               entry.identifier && 
               entry.type && 
               entry.content !== undefined;
      }).map(entry => ({
        identifier: String(entry.identifier || '').trim(),
        type: String(entry.type || 'text').toLowerCase(),
        description: String(entry.description || '').trim(),
        content: entry.content || '',
        createdAt: entry.createdAt || nowISO(),
        updatedAt: nowISO()
      }));
      
      localStorage.setItem(LS_KEYS.VAULT, JSON.stringify(validatedVault));
      // Trigger immediate UI update with debounce
      setTimeout(() => Renderer.renderVault(), 0);
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
    },

    // Execution log storage
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

    // NEW: Store the last executed JavaScript code for visibility
    loadLastExecutedCode() {
      return localStorage.getItem(LS_KEYS.LAST_EXECUTED_CODE) || '';
    },
    saveLastExecutedCode(code) {
      localStorage.setItem(LS_KEYS.LAST_EXECUTED_CODE, code || '');
    },

    // Tool Activity Log with enhanced vault tracking
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
      // Keep only last 500 activities for better vault operation tracking
      if (log.length > 500) log.splice(0, log.length - 500);
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
   * ENHANCED REASONING TEXT PARSER - Completely hides tool operations but shows code in execution box
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

    // COMPLETELY FIXED: Extract only pure reasoning text without ANY tool operations
    extractPureReasoningText(text) {
      if (!text || typeof text !== 'string') return '';
      
      // Remove all tool operations from reasoning text
      let cleanText = text;
      
      // Remove JS execute blocks (multiline, greedy)
      cleanText = cleanText.replace(/{{<js_execute>}}[\s\S]*?{{<\/js_execute>}}/g, '');
      
      // Remove datavault blocks (both self-closing and block form)
      cleanText = cleanText.replace(/{{<datavault[^>]*>}}[\s\S]*?{{<\/datavault>}}/g, '');
      
      // Remove self-closing operations (memory, task, goal, datavault)
      cleanText = cleanText.replace(/{{<(?:memory|task|goal|datavault)[^>]*\/>}}/g, '');
      
      // Remove final output blocks
      cleanText = cleanText.replace(/{{<final_output>}}[\s\S]*?{{<\/final_output>}}/g, '');
      
      // Remove vault read requests (more specific)
      cleanText = cleanText.replace(/{{<datavault[^>]*action=["']request_read["'][^>]*\/>}}/g, '');
      
      // Remove vault references
      cleanText = cleanText.replace(/{{<vaultref[^>]*\/>}}/g, '');
      
      // Remove any remaining tool-like operations (broader catch)
      cleanText = cleanText.replace(/{{<[^>]*\/>}}/g, '');
      cleanText = cleanText.replace(/{{<[^>]*>}}[\s\S]*?{{<\/[^>]*>}}/g, '');
      
      // Clean up extra whitespace and empty lines
      cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n'); // Multiple empty lines → double
      cleanText = cleanText.replace(/^\s*\n+|\n+\s*$/g, ''); // Leading/trailing newlines
      cleanText = cleanText.trim();
      
      // Remove lines that are just whitespace
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

      // ENHANCED: Parse vault operations with better validation
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
      
      // Enhanced regex to handle various attribute formats
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

    /**
     * ENHANCED: Apply operations with proper ordering and error handling
     */
    applyOperations(operations) {
      const startTime = Date.now();
      let operationsApplied = 0;
      
      try {
        // STEP 1: Apply vault operations FIRST with enhanced validation
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

        // STEP 2: Apply memory operations
        operations.memories.forEach((op, index) => {
          try {
            this.applyMemoryOperation(op);
            operationsApplied++;
          } catch (error) {
            console.error(`Memory operation ${index} failed:`, error);
          }
        });

        // STEP 3: Apply task operations
        operations.tasks.forEach((op, index) => {
          try {
            this.applyTaskOperation(op);
            operationsApplied++;
          } catch (error) {
            console.error(`Task operation ${index} failed:`, error);
          }
        });

        // STEP 4: Apply goal operations
        operations.goals.forEach((op, index) => {
          try {
            this.applyGoalOperation(op);
            operationsApplied++;
          } catch (error) {
            console.error(`Goal operation ${index} failed:`, error);
          }
        });

        // STEP 5: Execute JavaScript blocks AFTER vault operations are applied
        // FIXED: Store the last executed code and display it in the code execution box
        if (operations.jsExecute.length > 0) {
          const lastCode = operations.jsExecute[operations.jsExecute.length - 1];
          Storage.saveLastExecutedCode(lastCode);
          
          // Update the code execution box to show the executed code
          setTimeout(() => {
            const codeInput = qs('#codeInput');
            if (codeInput) {
              codeInput.value = lastCode;
              // Add a visual indicator that this code was auto-executed
              const execStatus = qs('#execStatus');
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

        // STEP 6: Handle final output
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

    /**
     * ENHANCED: Vault operation handler with comprehensive validation
     */
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
        // Create or update vault entry
        const existing = vault.find(v => v.identifier === op.id);
        
        // Validate content
        if (op.type === 'data' && typeof op.content === 'string') {
          if (!validateVaultData(op.content)) {
            throw new Error(`Invalid data format for vault entry: ${op.id}`);
          }
        }
        
        if (existing) {
          // Update existing entry
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
          // Create new entry
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

  /**
   * ENHANCED VAULT MANAGER with improved reference resolution
   */
  const VaultManager = {
    resolveVaultRefsInText(inputText) {
      if (!isNonEmptyString(inputText)) return inputText;
      const regex = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/g;
      const vault = Storage.loadVault();

      return inputText.replace(regex, (match, vaultId) => {
        const entry = vault.find(v => v.identifier === vaultId);
        if (!entry) {
          console.warn(`⚠️ Missing vault reference: ${vaultId}`);
          return `/* [MISSING_VAULT:${vaultId}] */`;
        }
        return entry.content || '';
      });
    },

    getVaultSummary() {
      const vault = Storage.loadVault();
      return vault.map(v => `- [${v.identifier}] ${v.type}: ${v.description || 'No description'}`).join('\n');
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
    },

    validateVaultIntegrity() {
      const vault = Storage.loadVault();
      const issues = [];
      
      vault.forEach((entry, index) => {
        if (!entry.identifier) {
          issues.push(`Entry ${index}: Missing identifier`);
        }
        if (!entry.type) {
          issues.push(`Entry ${index}: Missing type`);
        }
        if (entry.content === undefined) {
          issues.push(`Entry ${index}: Missing content`);
        }
      });
      
      return issues;
    }
  };

  /**
   * FIXED JAVASCRIPT EXECUTOR - Resolved variable scope issue + enhanced visibility
   */
  const JSExecutor = {
    executeCode(rawCode) {
      const startTime = Date.now();
      const executionId = generateId('exec');
      
      // FIXED: Declare console function variables at function level to avoid scope issues
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      try {
        // Resolve vault references in the code
        const expandedCode = VaultManager.resolveVaultRefsInText(rawCode);
        
        // Track vault references used
        const vaultRefsUsed = [];
        const vaultRefRegex = /{{<vaultref\s+id=["']([^"']+)["']\s*\/>}}/g;
        let vaultMatch;
        while ((vaultMatch = vaultRefRegex.exec(rawCode)) !== null) {
          vaultRefsUsed.push(vaultMatch[1]);
        }
        
        // Capture console output
        const logs = [];
        
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

        // Execute the code
        const fn = new Function(expandedCode);
        const result = fn();
        const executionTime = Date.now() - startTime;
        
        // Store execution result
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
        
        // ENHANCED: Add execution result to reasoning log AND display in console
        const logEntries = Storage.loadReasoningLog();
        const executionSummary = `=== JAVASCRIPT EXECUTION RESULT ===\nSUCCESS: true\nCONSOLE OUTPUT:\n${logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`).join('\n')}\nRETURN VALUE:\n${result ? JSON.stringify(result, null, 2) : 'undefined'}`;
        logEntries.push(executionSummary);
        Storage.saveReasoningLog(logEntries);
        
        // NEW: Also update the console output in the UI immediately
        setTimeout(() => {
          const execOutput = qs('#execOutput');
          if (execOutput) {
            const outputText = [
              ...logs.map(l => `[${l.type.toUpperCase()}] ${l.message}`),
              result !== undefined ? `[RETURN] ${JSON.stringify(result, null, 2)}` : ''
            ].filter(Boolean).join('\n');
            execOutput.textContent = outputText || 'No output';
          }
        }, 50);
        
        console.log(`✓ JavaScript execution completed successfully (${executionTime}ms)`);
        return executionResult;
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
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
        
        // Add to reasoning log for LLM feedback
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== JAVASCRIPT EXECUTION RESULT ===\nSUCCESS: false\nERROR: ${error.message}\nSTACK: ${error.stack}`);
        Storage.saveReasoningLog(logEntries);
        
        // NEW: Also update the console output in the UI immediately  
        setTimeout(() => {
          const execOutput = qs('#execOutput');
          if (execOutput) {
            execOutput.textContent = `[ERROR] ${error.message}\n${error.stack || ''}`;
          }
        }, 50);
        
        console.error('✗ JavaScript execution failed:', error);
        return executionResult;
      } finally {
        // FIXED: Always restore console functions in finally block
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
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
   * ENHANCED REASONING ENGINE - FIXED to avoid random task generation
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
      
      // Include recent execution results
      const recentExecutions = executionLog.slice(-2).map(exec => 
        `[${exec.timestamp}] SUCCESS: ${exec.success}, ${exec.success ? 'RESULT: ' + JSON.stringify(exec.result) : 'ERROR: ' + exec.error}`
      ).join('\n');

      return `${SYSTEM_PROMPT}

## CURRENT SESSION CONTEXT

**User Query:** ${query}

**Current Tasks:**
${tasksText || 'None yet - Begin with thorough query analysis'}

**Goals:**
${goalsText || 'None yet - Define strategic success criteria after analysis'}

**Memory:**
${memoryText || 'None yet - Store important findings as you discover them'}

**Vault Index:**
${vaultSummary || 'Empty - Use for complex data and code storage'}

**Recent JavaScript Executions:**
${recentExecutions || 'None yet - Leverage computational power for accuracy'}

**Recent Reasoning Log:**
${recentLog || 'Starting fresh - Apply strategic intelligence framework'}

**Iteration:** ${iteration}/${MAX_ITERATIONS}

---

**STRATEGIC INSTRUCTION:** This is iteration ${iteration}. Apply the STRATEGIC INTELLIGENCE FRAMEWORK:

1. **DEEP ANALYSIS**: If no tasks/goals exist, perform thorough query analysis first
2. **SMART DECOMPOSITION**: Create meaningful tasks based on conceptual understanding
3. **STRATEGIC GOALS**: Define success criteria that represent real objectives
4. **PROGRESSIVE EXECUTION**: Advance toward completion with computational backing
5. **QUALITY VALIDATION**: Ensure outputs meet high standards of accuracy and completeness

Focus on demonstrating sophisticated reasoning and analytical depth. Each iteration should show clear intellectual progress toward comprehensive goal achievement.`;
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
   * CODE EXECUTOR (Manual execution UI) - ENHANCED with last executed code restoration
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
    },

    // NEW: Restore the last auto-executed code from LLM
    restoreLastExecutedCode() {
      const lastCode = Storage.loadLastExecutedCode();
      const editorEl = qs('#codeInput');
      if (lastCode && editorEl) {
        editorEl.value = lastCode;
      }
    }
  };

  /**
   * ENHANCED LOOP CONTROLLER - FIXED to avoid random task generation
   */
  const LoopController = (() => {
    let active = false;
    let iterationCount = 0;
    let loopTimer = null;

    // REMOVED: Automatic query decomposition - this was causing random task generation

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
      window.GDRS.currentIteration = iterationCount; // For tool activity tracking
      updateIterationDisplay();

      try {
        const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
        const response = await GeminiAPI.generateContent(modelId, prompt);
        const responseText = GeminiAPI.extractResponseText(response);

        if (!responseText) {
          throw new Error('Empty response from model');
        }

        // Parse reasoning blocks and extract pure reasoning text
        const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
        const pureReasoningTexts = reasoningBlocks.map(block => 
          ReasoningParser.extractPureReasoningText(block)
        ).filter(text => text.length > 0);
        
        // Log only pure reasoning (without tool operations)
        if (pureReasoningTexts.length > 0) {
          const logEntries = Storage.loadReasoningLog();
          logEntries.push(`=== ITERATION ${iterationCount} - REASONING ===\n${pureReasoningTexts.join('\n\n')}`);
          Storage.saveReasoningLog(logEntries);
        }

        // Apply operations from all reasoning blocks
        reasoningBlocks.forEach(block => {
          const operations = ReasoningParser.parseOperations(block);
          ReasoningParser.applyOperations(operations);
        });

        // Re-render everything with a slight delay to ensure all operations are complete
        setTimeout(() => Renderer.renderAll(), 100);

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

      // Check if there's already a final output from LLM
      const currentOutput = Storage.loadFinalOutput();
      if (currentOutput.html && currentOutput.html !== '<p>Report will render here after goal validation.</p>') {
        // LLM has already provided final output
        return;
      }

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

      // FIXED: Don't automatically create tasks/goals - let the LLM analyze first
      Storage.saveTasks([]); // Start with no tasks
      Storage.saveGoals([]); // Start with no goals
      Storage.saveMemory([]);
      Storage.saveVault([]); // Clear vault for new session
      Storage.saveReasoningLog([`=== SESSION START ===\nQuery: ${rawQuery}\nWaiting for intelligent analysis and strategic task/goal generation...`]);
      Storage.saveExecutionLog([]); // Clear execution log
      Storage.saveToolActivityLog([]); // Clear tool activity log
      Storage.saveLastExecutedCode(''); // Clear last executed code

      // Clear final output
      Storage.saveFinalOutput('');

      // Initial render
      Renderer.renderAll();

      // Start the reasoning loop - LLM will intelligently analyze and create appropriate tasks/goals
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
   * ENHANCED RENDERER with FOCUS PRESERVATION for API key inputs
   */
  const Renderer = {
    /**
     * FIXED: Render keys with focus preservation to prevent cursor loss
     */
    renderKeys(preserveFocus = true) {
      const pool = Storage.loadKeypool();
      const keysGrid = qs('#keysGrid');
      if (!keysGrid) return;

      // FOCUS PRESERVATION: Capture current focus state
      let focusInfo = null;
      if (preserveFocus) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.matches('#keysGrid input[type="password"]')) {
          // Find which slot this input belongs to by checking parent structure
          const keyRow = activeElement.closest('.keyrow');
          if (keyRow) {
            const allKeyRows = qsa('.keyrow', keysGrid);
            const slotIndex = allKeyRows.indexOf(keyRow);
            focusInfo = {
              slot: slotIndex + 1,
              selectionStart: activeElement.selectionStart,
              selectionEnd: activeElement.selectionEnd,
              value: activeElement.value
            };
          }
        }
      }

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

      // FOCUS RESTORATION: Restore focus and cursor position
      if (focusInfo && preserveFocus) {
        const newKeyRows = qsa('.keyrow', keysGrid);
        if (newKeyRows[focusInfo.slot - 1]) {
          const newInput = newKeyRows[focusInfo.slot - 1].querySelector('input[type="password"]');
          if (newInput) {
            // Use setTimeout to ensure DOM is fully updated
            setTimeout(() => {
              newInput.focus();
              if (focusInfo.selectionStart !== null) {
                newInput.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
              }
            }, 0);
          }
        }
      }

      // Update rotation pill
      const rotPill = qs('#keyRotationPill');
      const nextKey = KeyManager.chooseActiveKey();
      if (rotPill) {
        rotPill.textContent = nextKey ? `NEXT: #${nextKey.slot}` : 'NO KEY';
      }
    },

    /**
     * ENHANCED: Update only key metadata without rebuilding inputs (for cooldown ticker)
     */
    updateKeyMetadata() {
      const pool = Storage.loadKeypool();
      const keysGrid = qs('#keysGrid');
      if (!keysGrid) return;

      const keyRows = qsa('.keyrow', keysGrid);
      
      pool.forEach((k, index) => {
        const row = keyRows[index];
        if (!row) return;
        
        const meta = row.querySelector('.keymeta');
        if (!meta) return;
        
        const cooldownSecs = KeyManager.getCooldownRemainingSeconds(k);
        meta.innerHTML = `
          <div><div class="pm">valid</div><div class="mono">${k.valid ? 'yes' : 'no'}</div></div>
          <div><div class="pm">usage</div><div class="mono">${k.usage} calls</div></div>
          <div><div class="pm">rate</div><div class="mono">${cooldownSecs > 0 ? `cooldown ${cooldownSecs}s` : (k.rateLimited ? 'limited' : 'ok')}</div></div>
        `;
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
        tasksEl.innerHTML = '<div class="storage-placeholder">No tasks yet - LLM will create intelligent tasks after query analysis</div>';
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
        memEl.innerHTML = '<div class="storage-placeholder">No memories yet - Important findings will be stored here</div>';
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
        goalsEl.innerHTML = '<div class="storage-placeholder">No goals yet - Strategic success criteria will be defined after analysis</div>';
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
        vaultEl.innerHTML = '<div class="storage-placeholder">No vault entries yet - Complex data and code will be stored here</div>';
        return;
      }

      // ENHANCED: Better vault rendering with type indicators and timestamps
      vaultEl.innerHTML = vault.map((v, index) => {
        const timestamp = v.createdAt ? new Date(v.createdAt).toLocaleTimeString() : '—';
        const dataSize = v.content ? String(v.content).length : 0;
        return `
          <div class="li" data-vault-id="${encodeHTML(v.identifier)}">
            <div>
              <div class="mono">${encodeHTML(v.identifier)}</div>
              <div class="pm">${encodeHTML(v.description || 'No description')}</div>
              <div class="pm" style="font-size: 0.8em; color: #666;">Created: ${timestamp} • Size: ${dataSize} chars</div>
            </div>
            <div class="status" style="background: ${v.type === 'data' ? '#e3f2fd' : v.type === 'code' ? '#f3e5f5' : '#e8f5e8'}">
              ${encodeHTML(v.type.toUpperCase())}
            </div>
          </div>
        `;
      }).join('');

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
      const toolActivity = Storage.loadToolActivityLog();
      const logEl = qs('#iterationLog');
      if (!logEl) return;

      if (logEntries.length === 0 && toolActivity.length === 0) {
        logEl.innerHTML = '<div class="log-placeholder">Intelligent reasoning iterations will appear here...</div>';
        return;
      }

      let html = '';

      // Render reasoning entries
      logEntries.forEach((entry, i) => {
        html += `
          <div class="li reasoning-entry">
            <div>
              <div class="mono">#${i + 1}</div>
              <pre class="mono reasoning-text">${encodeHTML(entry)}</pre>
            </div>
          </div>
        `;

        // Find and render tool activities for this iteration
        const iterationNum = i + 1;
        const iterationActivities = toolActivity.filter(act => act.iteration === iterationNum);
        
        if (iterationActivities.length > 0) {
          html += '<div class="tool-activities">';
          iterationActivities.forEach(activity => {
            const statusClass = activity.status === 'success' ? 'tool-success' : 'tool-error';
            const typeClass = `tool-${activity.type.replace('_', '-')}`;
            
            let activityDetails = '';
            if (activity.type === 'js_execute') {
              activityDetails = `${activity.executionTime}ms • ${activity.codeSize} chars`;
              if (activity.vaultRefsUsed > 0) activityDetails += ` • ${activity.vaultRefsUsed} vault refs`;
            } else if (activity.type === 'vault') {
              if (activity.dataSize) activityDetails += `${activity.dataSize} chars`;
              if (activity.dataType) activityDetails += ` • ${activity.dataType}`;
            }
            
            html += `
              <div class="tool-activity ${statusClass} ${typeClass}">
                <div class="tool-icon">🔧</div>
                <div class="tool-details">
                  <div class="tool-name">${activity.type.toUpperCase()}: ${activity.action}</div>
                  <div class="tool-meta">${activityDetails || activity.id || ''}</div>
                  ${activity.error ? `<div class="tool-error-msg">${encodeHTML(activity.error)}</div>` : ''}
                </div>
                <div class="tool-status ${activity.status}">${activity.status === 'success' ? '✓' : '✗'}</div>
              </div>
            `;
          });
          html += '</div>';
        }
      });

      logEl.innerHTML = html;

      // Auto-scroll to bottom
      logEl.scrollTop = logEl.scrollHeight;
    },

    renderFinalOutput() {
      const output = Storage.loadFinalOutput();
      const finalEl = qs('#finalOutput');
      const statusEl = qs('#finalStatus');
      
      if (finalEl) {
        finalEl.innerHTML = output.html || '<div class="output-placeholder"><p>Comprehensive research report will render here after intelligent analysis and goal completion.</p></div>';
      }
      
      if (statusEl) {
        const isComplete = ReasoningEngine.checkGoalsComplete();
        statusEl.textContent = isComplete ? 'verified' : 'analyzing';
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
      
      // NEW: Restore last executed code in the code editor if available
      CodeExecutor.restoreLastExecutedCode();
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

    // Clear buttons for Memory, Goals, Vault
    const clearMemoryBtn = qs('#clearMemory');
    if (clearMemoryBtn) {
      clearMemoryBtn.addEventListener('click', () => {
        if (confirm('Clear ALL memories? This cannot be undone.')) {
          Storage.saveMemory([]);
          const log = Storage.loadReasoningLog();
          log.push('=== ACTION ===\nCleared all memories');
          Storage.saveReasoningLog(log);
        }
      });
    }

    const clearGoalsBtn = qs('#clearGoals');
    if (clearGoalsBtn) {
      clearGoalsBtn.addEventListener('click', () => {
        if (confirm('Clear ALL goals? This cannot be undone.')) {
          Storage.saveGoals([]);
          const log = Storage.loadReasoningLog();
          log.push('=== ACTION ===\nCleared all goals');
          Storage.saveReasoningLog(log);
        }
      });
    }

    const clearVaultBtn = qs('#clearVault');
    if (clearVaultBtn) {
      clearVaultBtn.addEventListener('click', () => {
        if (confirm('Clear ALL data vault entries? This cannot be undone.')) {
          Storage.saveVault([]);
          const log = Storage.loadReasoningLog();
          log.push('=== ACTION ===\nCleared all data vault entries');
          Storage.saveReasoningLog(log);
        }
      });
    }
    
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
        Renderer.renderKeys(); // Full re-render is acceptable during validation
        validateBtn.textContent = 'Validate';
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        KeyManager.clearAll();
        Renderer.renderKeys(); // Full re-render is acceptable during clear
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
   * FIXED COOLDOWN TICKER - Now preserves focus by updating only metadata
   */
  function startCooldownTicker() {
    setInterval(() => {
      // FIXED: Use updateKeyMetadata instead of renderKeys to preserve focus
      Renderer.updateKeyMetadata();
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
      Storage.saveExecutionLog([]);
      Storage.saveToolActivityLog([]);
      Storage.saveLastExecutedCode('');
      console.log('%cGDRS - Fresh installation initialized', 'color: #ffaa00;');
    }

    // Check vault integrity on boot
    const vaultIssues = VaultManager.validateVaultIntegrity();
    if (vaultIssues.length > 0) {
      console.warn('Vault integrity issues:', vaultIssues);
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

    console.log('%cGDRS Runtime Core - Ready for Intelligent Deep Research', 'color: #00ff00; font-weight: bold;');
    console.log('%cFIXED: JavaScript code execution visibility - code now shows in execution box!', 'color: #00aa00;');
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
      JSExecutor,
      boot
    });
  }
})();