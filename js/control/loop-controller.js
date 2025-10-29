/**
 * GDRS Loop Controller
 * Session management, iteration control, error recovery
 */

import { Storage } from '../storage/storage.js';
import { KeyManager } from '../api/key-manager.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { ReasoningParser } from '../reasoning/reasoning-parser.js';
import { VaultManager } from '../storage/vault-manager.js';
import { Renderer } from '../ui/renderer.js';
import { qs } from '../core/utils.js';
import { encodeHTML } from '../core/utils.js';
import { 
  MAX_ITERATIONS, 
  ITERATION_DELAY, 
  MAX_RETRY_ATTEMPTS, 
  EMPTY_RESPONSE_RETRY_DELAY 
} from '../core/constants.js';

const MAX_CONSECUTIVE_ERRORS = 3;

let active = false;
let iterationCount = 0;
let loopTimer = null;
let consecutiveErrors = 0;

export const LoopController = {
  async startSession() {
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
    consecutiveErrors = 0;
    
    if (sessionPill) sessionPill.textContent = 'RUNNING';

    // Store the query
    Storage.saveCurrentQuery(rawQuery);

    // Start with clean slate - let LLM analyze first
    Storage.saveTasks([]);
    Storage.saveGoals([]);
    Storage.saveMemory([]);
    Storage.saveVault([]);
    Storage.saveReasoningLog([`=== SESSION START ===\nQuery: ${rawQuery}\nWaiting for intelligent analysis and strategic task/goal generation...`]);
    Storage.saveExecutionLog([]);
    Storage.saveToolActivityLog([]);
    Storage.saveLastExecutedCode('');
    Storage.saveFinalOutput(''); // Clear any previous final output
    Storage.clearFinalOutputVerification(); // ISSUE 1 FIX: Clear verified flag on new session

    // Initial render
    Renderer.renderAll();

    // Start the reasoning loop
    setTimeout(() => runIteration(), 1000);
  },

  stopSession() {
    active = false;
    consecutiveErrors = 0;
    
    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
    }
    
    const sessionPill = qs('#sessionStatus');
    if (sessionPill) sessionPill.textContent = 'IDLE';
    
    const runBtn = qs('#runQueryBtn');
    if (runBtn) runBtn.textContent = 'Run Analysis';
    
    console.log('\ud83c\udfc1 Session stopped');
  },

  isActive: () => active
};

async function runIteration() {
  if (!active) return;

  const modelSelect = qs('#modelSelect');
  const modelId = modelSelect ? modelSelect.value : '';
  
  if (!modelId || modelId === '') {
    console.error('No model selected');
    LoopController.stopSession();
    return;
  }

  const currentQuery = Storage.loadCurrentQuery();
  if (!currentQuery) {
    console.error('No current query');
    LoopController.stopSession();
    return;
  }

  iterationCount++;
  window.GDRS.currentIteration = iterationCount;
  updateIterationDisplay();

  try {
    // ISSUE 1 FIX: Check if LLM has already provided verified final output
    if (Storage.isFinalOutputVerified()) {
      console.log('\u2705 LLM has provided verified final output, stopping session');
      const logEntries = Storage.loadReasoningLog();
      logEntries.push('=== SESSION COMPLETE ===\nVerified final output received from LLM\nGoals achieved and validated');
      Storage.saveReasoningLog(logEntries);
      Renderer.renderReasoningLog();
      LoopController.stopSession();
      return;
    }

    const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
    console.log(`\ud83e\udde0 Starting iteration ${iterationCount} with ${prompt.length} chars prompt`);
    
    const response = await GeminiAPI.generateContent(modelId, prompt);
    const responseText = GeminiAPI.extractResponseText(response);

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from model - no content generated');
    }

    console.log(`\u2705 Received response: ${responseText.length} chars`);
    
    // Reset consecutive errors on success
    consecutiveErrors = 0;

    // Parse reasoning blocks and extract pure reasoning text
    const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
    const pureReasoningTexts = reasoningBlocks.map(block => 
      ReasoningParser.extractPureReasoningText(block)
    ).filter(text => text.length > 0);
    
    // Log only pure reasoning
    if (pureReasoningTexts.length > 0) {
      const logEntries = Storage.loadReasoningLog();
      logEntries.push(`=== ITERATION ${iterationCount} - REASONING ===\n${pureReasoningTexts.join('\n\n')}`);
      Storage.saveReasoningLog(logEntries);
    }

    // ISSUE 3 FIX: Apply operations from all reasoning blocks - WITH ASYNC SUPPORT
    for (const block of reasoningBlocks) {
      const operations = ReasoningParser.parseOperations(block);
      await ReasoningParser.applyOperations(operations); // CRITICAL: await async operations
    }

    // Re-render everything
    setTimeout(() => Renderer.renderAll(), 100);

    // Check if LLM provided verified output (takes priority)
    if (Storage.isFinalOutputVerified()) {
      console.log('\u2705 LLM provided verified final output, session complete');
      const logEntries = Storage.loadReasoningLog();
      logEntries.push('=== SESSION COMPLETE ===\nVerified final output received from LLM during iteration');
      Storage.saveReasoningLog(logEntries);
      Renderer.renderReasoningLog();
      LoopController.stopSession();
      return;
    }

    // Check if goals are complete (fallback to auto-generation)
    if (ReasoningEngine.checkGoalsComplete()) {
      console.log('\ud83c\udfaf Goals completed, ensuring final output exists');
      await ensureFinalOutputExists(currentQuery);
      LoopController.stopSession();
      return;
    }

    // Check iteration limit
    if (iterationCount >= MAX_ITERATIONS) {
      console.log('\ud83d\udd04 Max iterations reached, ensuring final output exists');
      await ensureFinalOutputExists(currentQuery);
      LoopController.stopSession();
      return;
    }

    // Schedule next iteration
    if (active) {
      loopTimer = setTimeout(() => runIteration(), ITERATION_DELAY);
    }
    
  } catch (err) {
    consecutiveErrors++;
    
    console.error(`\u274c Iteration ${iterationCount} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);
    
    // Log the error
    const logEntries = Storage.loadReasoningLog();
    const errorMessage = `=== ITERATION ${iterationCount} - ERROR ===\nError: ${err.message}\nConsecutive errors: ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}\nStack: ${err.stack || 'No stack trace'}`;
    logEntries.push(errorMessage);
    Storage.saveReasoningLog(logEntries);
    Renderer.renderReasoningLog();
    
    // Handle consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`\ud83d\uded1 Too many consecutive errors (${consecutiveErrors}), stopping session`);
      
      logEntries.push(`=== SESSION TERMINATED ===\nSession stopped due to ${consecutiveErrors} consecutive errors.\nLast error: ${err.message}\n\nSuggestions:\n- Check your API keys\n- Verify network connection\n- Try a different model\n- Review the query complexity`);
      Storage.saveReasoningLog(logEntries);
      Renderer.renderReasoningLog();
      
      LoopController.stopSession();
      return;
    }
    
    // For recoverable errors, retry with delay
    if (err.message.includes('Empty response') || err.message.includes('failed after')) {
      console.warn(`\u23f3 Recoverable error, retrying iteration ${iterationCount} in ${EMPTY_RESPONSE_RETRY_DELAY * 2}ms`);
      
      if (active) {
        loopTimer = setTimeout(() => runIteration(), EMPTY_RESPONSE_RETRY_DELAY * 2);
      }
    } else {
      console.error('\ud83d\uded1 Non-recoverable error, stopping session');
      LoopController.stopSession();
    }
  }
}

// ISSUE 1 FIX: Simplified final output handling - LLM-first approach
async function ensureFinalOutputExists(query) {
  const currentOutput = Storage.loadFinalOutput();
  
  // If LLM has already provided verified output, we're done
  if (currentOutput.verified && currentOutput.source === 'llm') {
    console.log('\u2705 Using LLM-verified final output');
    return;
  }
  
  // Check if there's already a meaningful final output from LLM
  if (currentOutput.html && 
      currentOutput.html !== '<p>Report will render here after goal validation.</p>' && 
      currentOutput.html.length > 100) {
    console.log('\u2705 LLM final output already exists');
    return;
  }

  // Last resort: Generate minimal auto-fallback (only if absolutely nothing exists)
  console.log('\ud83e\udd16 Generating minimal auto-fallback final output...');
  await generateAutoFallbackOutput(query);
}

async function generateAutoFallbackOutput(query) {
  const tasks = Storage.loadTasks();
  const goals = Storage.loadGoals();
  const memory = Storage.loadMemory();
  const vault = Storage.loadVault();

  // Build minimal auto-generated output
  const completedTasks = tasks.filter(t => t.status === 'finished');
  const goalsSummary = goals.map(g => `**${g.heading}**: ${g.content}`).join('\n\n');
  const keyFindings = memory.map(m => `**${m.heading}**: ${m.content} ${m.notes ? `(${m.notes})` : ''}`).join('\n\n');
  
  let finalHtml = `
    <div style="font-family: var(--fs); line-height: 1.6;">
      <h2>\ud83d\udd2c Research Analysis Complete</h2>
      <div style="background: var(--bg-alt); padding: 12px; border-left: 3px solid var(--accent); margin: 16px 0;">
        <strong>Query:</strong> ${encodeHTML(query)}<br/>
        <strong>Iterations:</strong> ${iterationCount}<br/>
        <strong>Status:</strong> ${ReasoningEngine.checkGoalsComplete() ? '\u2705 Goals Achieved' : consecutiveErrors >= MAX_CONSECUTIVE_ERRORS ? '\u274c Stopped due to errors' : '\u23f1\ufe0f Max Iterations Reached'}<br/>
        <strong>Output Type:</strong> \u26a0\ufe0f Auto-generated (LLM did not provide final output)
      </div>
      
      <h3>\ud83d\udccb Goals</h3>
      <div style="margin: 12px 0; padding: 12px; background: var(--bg-alt); border-radius: 6px;">
        ${goalsSummary || '<em>No goals defined</em>'}
      </div>
      
      <h3>\u2705 Completed Tasks (${completedTasks.length}/${tasks.length})</h3>
      <ul style="margin: 12px 0;">
  `;
  
  if (completedTasks.length === 0) {
    finalHtml += '<li><em>No tasks completed</em></li>';
  } else {
    completedTasks.forEach(task => {
      finalHtml += `<li><strong>${encodeHTML(task.heading)}</strong>: ${encodeHTML(task.content)}</li>`;
    });
  }
  
  finalHtml += `
      </ul>
      
      <h3>\ud83d\udca1 Key Findings</h3>
      <div style="margin: 12px 0; padding: 12px; background: var(--bg-alt); border-radius: 6px;">
        ${keyFindings || '<em>No key findings recorded</em>'}
      </div>
  `;
  
  // Add vault content if any contains final results
  const resultVault = vault.filter(v => 
    v.description.toLowerCase().includes('result') || 
    v.description.toLowerCase().includes('final') ||
    v.description.toLowerCase().includes('output')
  );
  
  if (resultVault.length > 0) {
    finalHtml += `<h3>\ud83d\udce6 Generated Content</h3>`;
    resultVault.forEach(v => {
      finalHtml += `
        <div style="margin: 12px 0;">
          <strong>${encodeHTML(v.description)}</strong>:
          <pre style="background: var(--bg-alt); padding: 12px; border-radius: 6px; overflow-x: auto; margin-top: 8px;">${encodeHTML(v.content)}</pre>
        </div>
      `;
    });
  }
  
  finalHtml += `
      <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--border);"/>
      <p style="font-size: 11px; color: var(--text-muted); text-align: center;">
        <em>This is an auto-generated summary. For best results, ensure the LLM generates {{&lt;final_output&gt;}} blocks.</em>
      </p>
    </div>
  `;
  
  // Apply vault substitutions
  finalHtml = VaultManager.resolveVaultRefsInText(finalHtml);
  
  // Save as UNVERIFIED auto-generated output
  Storage.saveFinalOutput(finalHtml, false, 'auto');
  
  // Log the auto-generation
  const logEntries = Storage.loadReasoningLog();
  logEntries.push('=== AUTO-GENERATED FINAL OUTPUT (UNVERIFIED) ===\nGenerated automatically due to goal completion or iteration limit\nThis is a fallback - LLM should provide verified output');
  Storage.saveReasoningLog(logEntries);
  
  Renderer.renderFinalOutput();
  console.log('\ud83e\udd16 Auto-generated final output created (unverified)');
}

function updateIterationDisplay() {
  const iterCountEl = qs('#iterationCount');
  if (iterCountEl) iterCountEl.textContent = String(iterationCount);
}
