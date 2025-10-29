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
    Storage.saveFinalOutput('');

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
    
    console.log('🏁 Session stopped');
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
    const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
    console.log(`🧠 Starting iteration ${iterationCount} with ${prompt.length} chars prompt`);
    
    const response = await GeminiAPI.generateContent(modelId, prompt);
    const responseText = GeminiAPI.extractResponseText(response);

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from model - no content generated');
    }

    console.log(`✅ Received response: ${responseText.length} chars`);
    
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

    // Apply operations from all reasoning blocks
    reasoningBlocks.forEach(block => {
      const operations = ReasoningParser.parseOperations(block);
      ReasoningParser.applyOperations(operations);
    });

    // Re-render everything
    setTimeout(() => Renderer.renderAll(), 100);

    // Check if goals are complete
    if (ReasoningEngine.checkGoalsComplete()) {
      console.log('🎯 Goals completed, finalizing output');
      await finalizeFinalOutput(currentQuery);
      LoopController.stopSession();
      return;
    }

    // Check iteration limit
    if (iterationCount >= MAX_ITERATIONS) {
      console.log('🔄 Max iterations reached, finalizing output');
      await finalizeFinalOutput(currentQuery);
      LoopController.stopSession();
      return;
    }

    // Schedule next iteration
    if (active) {
      loopTimer = setTimeout(() => runIteration(), ITERATION_DELAY);
    }
    
  } catch (err) {
    consecutiveErrors++;
    
    console.error(`❌ Iteration ${iterationCount} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);
    
    // Log the error
    const logEntries = Storage.loadReasoningLog();
    const errorMessage = `=== ITERATION ${iterationCount} - ERROR ===\nError: ${err.message}\nConsecutive errors: ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}\nStack: ${err.stack || 'No stack trace'}`;
    logEntries.push(errorMessage);
    Storage.saveReasoningLog(logEntries);
    Renderer.renderReasoningLog();
    
    // Handle consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`🛑 Too many consecutive errors (${consecutiveErrors}), stopping session`);
      
      logEntries.push(`=== SESSION TERMINATED ===\nSession stopped due to ${consecutiveErrors} consecutive errors.\nLast error: ${err.message}\n\nSuggestions:\n- Check your API keys\n- Verify network connection\n- Try a different model\n- Review the query complexity`);
      Storage.saveReasoningLog(logEntries);
      Renderer.renderReasoningLog();
      
      LoopController.stopSession();
      return;
    }
    
    // For recoverable errors, retry with delay
    if (err.message.includes('Empty response') || err.message.includes('failed after')) {
      console.warn(`⏳ Recoverable error, retrying iteration ${iterationCount} in ${EMPTY_RESPONSE_RETRY_DELAY * 2}ms`);
      
      if (active) {
        loopTimer = setTimeout(() => runIteration(), EMPTY_RESPONSE_RETRY_DELAY * 2);
      }
    } else {
      console.error('🛑 Non-recoverable error, stopping session');
      LoopController.stopSession();
    }
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
      <p><strong>Status:</strong> ${ReasoningEngine.checkGoalsComplete() ? 'Goals Achieved' : consecutiveErrors >= MAX_CONSECUTIVE_ERRORS ? 'Stopped due to errors' : 'Max Iterations Reached'}</p>
      
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
