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
import { qs, nowISO } from '../core/utils.js';
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
    const sessionStartTime = nowISO();
    active = true;
    iterationCount = 0;
    consecutiveErrors = 0;

    console.log(`[${sessionStartTime}] 🚀 SESSION STARTING - Query: "${rawQuery}"`);

    if (sessionPill) sessionPill.textContent = 'RUNNING';

    // Clean slate initialization
    Storage.saveCurrentQuery(rawQuery);
    Storage.saveTasks([]);
    Storage.saveGoals([]);
    Storage.saveMemory([]);
    Storage.saveVault([]);
    Storage.saveReasoningLog([`=== SESSION START ===\nTimestamp: ${sessionStartTime}\nQuery: ${rawQuery}\nInitiating intelligent analysis...`]);
    Storage.saveExecutionLog([]);
    Storage.saveToolActivityLog([]);
    Storage.saveLastExecutedCode('');
    Storage.saveFinalOutput('');
    Storage.clearFinalOutputVerification();

    console.log(`[${nowISO()}] ✅ SESSION INITIALIZED - Storage cleared, starting iteration loop in 1000ms`);

    // Emit session start event
    eventBus.emit(Events.SESSION_START, { query: rawQuery });

    // Initial render and start loop
    Renderer.renderAll();
    setTimeout(() => runIteration(), 1000);
  },

  stopSession() {
    const stopTime = nowISO();
    console.log(`[${stopTime}] 🛑 STOPPING SESSION - Iteration count: ${iterationCount}`);

    active = false;
    consecutiveErrors = 0;

    if (loopTimer) {
      clearTimeout(loopTimer);
      loopTimer = null;
      console.log(`[${nowISO()}] ⏹️  Loop timer cleared`);
    }

    const sessionPill = qs('#sessionStatus');
    if (sessionPill) sessionPill.textContent = 'IDLE';

    const runBtn = qs('#runQueryBtn');
    if (runBtn) runBtn.textContent = 'Run Analysis';

    eventBus.emit(Events.SESSION_STOP);
    console.log(`[${nowISO()}] 🏁 Session stopped`);
  },

  isActive: () => active
};

/**
 * Main iteration function - streamlined for clarity
 */
async function runIteration() {
  const iterationStartTime = nowISO();

  if (!active) {
    console.log(`[${iterationStartTime}] ⚠️  Iteration skipped - session not active`);
    return;
  }

  const modelId = qs('#modelSelect')?.value;
  const currentQuery = Storage.loadCurrentQuery();

  if (!modelId || !currentQuery) {
    console.error(`[${iterationStartTime}] ❌ Missing model or query`);
    LoopController.stopSession();
    return;
  }

  iterationCount++;
  window.GDRS.currentIteration = iterationCount;
  updateIterationDisplay();

  console.log(`[${iterationStartTime}] 🔄 ========== ITERATION ${iterationCount} START ==========`);

  try {
    // STREAMLINED: Simple verification check
    const preCheckTime = nowISO();
    const isVerified = Storage.isFinalOutputVerified();
    console.log(`[${preCheckTime}] 🔍 PRE-ITERATION VERIFICATION CHECK - Result: ${isVerified}`);

    if (isVerified) {
      console.log(`[${nowISO()}] ✅ LLM provided verified final output - session complete`);
      finishSession('LLM provided verified final output');
      return;
    }

    // Generate LLM response
    const promptStartTime = nowISO();
    console.log(`[${promptStartTime}] 📝 Building context prompt...`);
    const prompt = await ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
    const promptEndTime = nowISO();
    console.log(`[${promptEndTime}] ✅ Prompt built - ${prompt.length} chars`);

    const apiCallStartTime = nowISO();
    console.log(`[${apiCallStartTime}] 🌐 Calling Gemini API with model: ${modelId}...`);
    const response = await GeminiAPI.generateContent(modelId, prompt);
    const apiCallEndTime = nowISO();
    console.log(`[${apiCallEndTime}] ✅ API call completed`);

    const extractStartTime = nowISO();
    const responseText = GeminiAPI.extractResponseText(response);

    if (!responseText?.trim()) {
      throw new Error('Empty response from model');
    }

    console.log(`[${nowISO()}] ✅ Response extracted: ${responseText.length} chars`);
    consecutiveErrors = 0; // Reset on success

    // --- MODULAR FIX: Parse entire response, not just reasoning blocks ---

    // Step 1: Extract reasoning text (from reasoning blocks) for logging only
    const reasoningExtractStartTime = nowISO();
    console.log(`[${reasoningExtractStartTime}] 🧠 Extracting reasoning blocks...`);
    const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
    const pureReasoningTexts = reasoningBlocks
      .map(block => ReasoningParser.extractPureReasoningText(block))
      .filter(text => text.length > 0);

    if (pureReasoningTexts.length > 0) {
      const logEntries = Storage.loadReasoningLog();
      logEntries.push(`=== ITERATION ${iterationCount} ===\n${pureReasoningTexts.join('\n\n')}`);
      Storage.saveReasoningLog(logEntries);
      Renderer.renderReasoningLog(); // Re-render UI to show new reasoning blocks
      console.log(`[${nowISO()}] ✅ Saved ${pureReasoningTexts.length} reasoning block(s)`);
    }

    // Step 2: Parse ALL operations from the ENTIRE response text.
    // This uses the fixed, modular parser that finds ALL tools including
    // <final_output> even if it's placed outside <reasoning_text> blocks.
    const parseStartTime = nowISO();
    console.log(`[${parseStartTime}] 🔧 Parsing operations from entire response...`);
    const allOperations = ReasoningParser.parseOperations(responseText);
    const parseEndTime = nowISO();
    console.log(`[${parseEndTime}] ✅ Operations parsed - jsExecute: ${allOperations.jsExecute?.length || 0}, finalOutput: ${allOperations.finalOutput?.length || 0}, vault: ${allOperations.vault?.length || 0}, tasks: ${allOperations.tasks?.length || 0}, goals: ${allOperations.goals?.length || 0}, memories: ${allOperations.memories?.length || 0}`);

    // Step 3: Apply all found operations
    const applyStartTime = nowISO();
    console.log(`[${applyStartTime}] ⚙️  Applying operations...`);
    const operationSummary = await ReasoningParser.applyOperations(allOperations);
    const applyEndTime = nowISO();
    console.log(`[${applyEndTime}] ✅ Operations applied - Duration: ${operationSummary.duration}ms`);
    recordOperationSummary(operationSummary, iterationCount);

    // Emit iteration complete event
    const totalOps = (allOperations.jsExecute?.length || 0) +
                     (allOperations.finalOutput?.length || 0) +
                     (allOperations.memories?.length || 0) +
                     (allOperations.tasks?.length || 0) +
                     (allOperations.goals?.length || 0) +
                     (allOperations.vault?.length || 0);

    eventBus.emit(Events.ITERATION_COMPLETE, {
      iteration: iterationCount,
      operations: totalOps
    });

    // Check completion conditions
    const postCheckTime = nowISO();
    const isVerifiedAfterOps = Storage.isFinalOutputVerified();
    console.log(`[${postCheckTime}] 🔍 POST-ITERATION VERIFICATION CHECK - Result: ${isVerifiedAfterOps}`);

    if (isVerifiedAfterOps) {
      console.log(`[${nowISO()}] ✅ Final output generated during iteration`);
      finishSession('Final output received from LLM');
      return;
    }

    const goalsCheckTime = nowISO();
    const goalsComplete = ReasoningEngine.checkGoalsComplete();
    console.log(`[${goalsCheckTime}] 🎯 Goals completion check - Result: ${goalsComplete}`);

    if (goalsComplete) {
      console.log(`[${nowISO()}] 🎯 Goals completed - expecting final output from LLM`);
      // Continue iterations to let LLM provide final output
    }

    // SIMPLIFIED: Hard limit - LLM MUST provide final output
    if (iterationCount >= MAX_ITERATIONS) {
      console.error(`[${nowISO()}] ❌ Max iterations reached - LLM did not provide final output`);
      finishSession('Maximum iterations reached without final output');
      return;
    }

    // Schedule next iteration
    const iterationEndTime = nowISO();
    console.log(`[${iterationEndTime}] 🔄 ========== ITERATION ${iterationCount} END ==========`);
    console.log(`[${nowISO()}] ⏰ Scheduling next iteration in ${ITERATION_DELAY}ms...`);

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
  const finishTime = nowISO();
  console.log(`[${finishTime}] 🏁 FINISHING SESSION - Reason: ${reason}`);

  const logEntries = Storage.loadReasoningLog();
  logEntries.push(`=== SESSION COMPLETE ===\nTimestamp: ${finishTime}\n${reason}\nIterations: ${iterationCount}`);
  Storage.saveReasoningLog(logEntries);
  Renderer.renderReasoningLog();

  console.log(`[${nowISO()}] ✅ Session finished successfully`);
  LoopController.stopSession();
}

/**
 * Update iteration counter in UI
 */
function updateIterationDisplay() {
  const iterCountEl = qs('#iterationCount');
  if (iterCountEl) iterCountEl.textContent = String(iterationCount);
}

/**
 * Persist operation summary metadata for diagnostics.
 */
function recordOperationSummary(summary, iteration) {
  if (!summary || !Array.isArray(summary.errors) || summary.errors.length === 0) {
    return;
  }

  const logEntries = Storage.loadReasoningLog();
  const errorSnippets = summary.errors
    .map((err) => `- [${err.type}] ${err.id}: ${err.message}`)
    .join('\n');

  logEntries.push(
    [
      `=== ITERATION ${iteration} OPERATION WARNINGS ===`,
      errorSnippets,
      `Operation bundle duration: ${summary.duration}ms`
    ].join('\n')
  );

  Storage.saveReasoningLog(logEntries);
  Renderer.renderReasoningLog();
}
