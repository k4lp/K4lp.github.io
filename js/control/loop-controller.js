/**
 * GDRS Loop Controller - Streamlined Session Management
 * Clean iteration control with mandatory LLM final output
 */

import { Storage } from '../storage/storage.js';
import { KeyManager } from '../api/key-manager.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { ReasoningParser } from '../reasoning/reasoning-parser.js';
import { Renderer } from '../ui/renderer.js';
import { eventBus, Events } from '../core/event-bus.js';
import { qs } from '../core/utils.js';
import { 
  MAX_ITERATIONS, 
  ITERATION_DELAY, 
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

    // Validation checks
    const activeKey = KeyManager.chooseActiveKey();
    if (!activeKey) {
      alert('Please add and validate at least one API key');
      return;
    }

    const modelSelect = qs('#modelSelect');
    if (!modelSelect?.value) {
      alert('Please select a model from the dropdown');
      return;
    }

    // Initialize session
    active = true;
    iterationCount = 0;
    consecutiveErrors = 0;
    
    if (sessionPill) sessionPill.textContent = 'RUNNING';

    // Clean slate initialization
    Storage.saveCurrentQuery(rawQuery);
    Storage.saveTasks([]);
    Storage.saveGoals([]);
    Storage.saveMemory([]);
    Storage.saveVault([]);
    Storage.saveReasoningLog([`=== SESSION START ===\nQuery: ${rawQuery}\nInitiating intelligent analysis...`]);
    Storage.saveExecutionLog([]);
    Storage.saveToolActivityLog([]);
    Storage.saveLastExecutedCode('');
    Storage.saveFinalOutput('');
    Storage.clearFinalOutputVerification();

    // Emit session start event
    eventBus.emit(Events.SESSION_START, { query: rawQuery });
    
    // Initial render and start loop
    Renderer.renderAll();
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
    
    eventBus.emit(Events.SESSION_STOP);
    console.log('\ud83c\udfc1 Session stopped');
  },

  isActive: () => active
};

/**
 * Main iteration function - streamlined for clarity
 */
async function runIteration() {
  if (!active) return;

  const modelId = qs('#modelSelect')?.value;
  const currentQuery = Storage.loadCurrentQuery();
  
  if (!modelId || !currentQuery) {
    console.error('Missing model or query');
    LoopController.stopSession();
    return;
  }

  iterationCount++;
  window.GDRS.currentIteration = iterationCount;
  updateIterationDisplay();

  try {
    // STREAMLINED: Simple verification check
    if (Storage.isFinalOutputVerified()) {
      console.log('\u2705 LLM provided verified final output - session complete');
      finishSession('LLM provided verified final output');
      return;
    }

    // Generate LLM response
    const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
    console.log(`\ud83e\udde0 Iteration ${iterationCount} - Prompt: ${prompt.length} chars`);
    
    const response = await GeminiAPI.generateContent(modelId, prompt);
    const responseText = GeminiAPI.extractResponseText(response);

    if (!responseText?.trim()) {
      throw new Error('Empty response from model');
    }

    console.log(`\u2705 Response received: ${responseText.length} chars`);
    consecutiveErrors = 0; // Reset on success

    // Process reasoning blocks
    const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
    const pureReasoningTexts = reasoningBlocks
      .map(block => ReasoningParser.extractPureReasoningText(block))
      .filter(text => text.length > 0);
    
    // Log reasoning
    if (pureReasoningTexts.length > 0) {
      const logEntries = Storage.loadReasoningLog();
      logEntries.push(`=== ITERATION ${iterationCount} ===\n${pureReasoningTexts.join('\n\n')}`);
      Storage.saveReasoningLog(logEntries);
    }

    // Apply operations with proper async support
    for (const block of reasoningBlocks) {
      const operations = ReasoningParser.parseOperations(block);
      await ReasoningParser.applyOperations(operations);
    }

    // Emit iteration complete event
    eventBus.emit(Events.ITERATION_COMPLETE, { 
      iteration: iterationCount, 
      operations: reasoningBlocks.length 
    });
    
    // Re-render after operations
    setTimeout(() => Renderer.renderAll(), 50);

    // Check completion conditions
    if (Storage.isFinalOutputVerified()) {
      console.log('\u2705 Final output generated during iteration');
      finishSession('Final output received from LLM');
      return;
    }

    if (ReasoningEngine.checkGoalsComplete()) {
      console.log('\ud83c\udfaf Goals completed - expecting final output from LLM');
      // Continue iterations to let LLM provide final output
    }

    // SIMPLIFIED: Hard limit - LLM MUST provide final output
    if (iterationCount >= MAX_ITERATIONS) {
      console.error('\u274c Max iterations reached - LLM did not provide final output');
      finishSession('Maximum iterations reached without final output');
      return;
    }

    // Schedule next iteration
    if (active) {
      loopTimer = setTimeout(() => runIteration(), ITERATION_DELAY);
    }
    
  } catch (err) {
    handleIterationError(err);
  }
}

/**
 * Handle iteration errors with retry logic
 */
function handleIterationError(err) {
  consecutiveErrors++;
  console.error(`\u274c Iteration ${iterationCount} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);
  
  // Log error
  const logEntries = Storage.loadReasoningLog();
  logEntries.push(`=== ITERATION ${iterationCount} ERROR ===\nError: ${err.message}\nConsecutive: ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}`);
  Storage.saveReasoningLog(logEntries);
  Renderer.renderReasoningLog();
  
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    console.error(`\ud83d\uded1 Too many consecutive errors - stopping session`);
    logEntries.push('=== SESSION TERMINATED ===\nStopped due to consecutive errors');
    Storage.saveReasoningLog(logEntries);
    LoopController.stopSession();
    return;
  }
  
  // Retry with delay for recoverable errors
  if (err.message.includes('Empty response') || err.message.includes('timeout')) {
    console.warn(`\u23f3 Retrying in ${EMPTY_RESPONSE_RETRY_DELAY * 2}ms`);
    if (active) {
      loopTimer = setTimeout(() => runIteration(), EMPTY_RESPONSE_RETRY_DELAY * 2);
    }
  } else {
    LoopController.stopSession();
  }
}

/**
 * Finish session with message
 */
function finishSession(reason) {
  const logEntries = Storage.loadReasoningLog();
  logEntries.push(`=== SESSION COMPLETE ===\n${reason}\nIterations: ${iterationCount}`);
  Storage.saveReasoningLog(logEntries);
  Renderer.renderReasoningLog();
  LoopController.stopSession();
}

/**
 * Update iteration counter in UI
 */
function updateIterationDisplay() {
  const iterCountEl = qs('#iterationCount');
  if (iterCountEl) iterCountEl.textContent = String(iterationCount);
}
