/**
 * GDRS Reasoning Engine
 * Context building and goal validation
 */

import { Storage } from '../storage/storage.js';
import { VaultManager } from '../storage/vault-manager.js';
import { SYSTEM_PROMPT } from '../core/constants.js';

export const ReasoningEngine = {
  buildContextPrompt(query, iteration) {
    const tasks = Storage.loadTasks();
    const goals = Storage.loadGoals();
    const memory = Storage.loadMemory();
    const vaultSummary = VaultManager.getVaultSummary();
    const reasoningLog = Storage.loadReasoningLog();
    const executionLog = Storage.loadExecutionLog();
    const maxOutputTokens = Storage.loadMaxOutputTokens();

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

**Response Limits:**
Max Output Tokens: ${maxOutputTokens} (user-configured)

**Iteration:** ${iteration}/2000

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
