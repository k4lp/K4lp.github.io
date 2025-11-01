/**
 * Iteration Runner
 * Single iteration execution logic
 */

import { Storage } from '../../storage/storage.js';
import { GeminiAPI } from '../../api/gemini-client.js';
import { ReasoningEngine } from '../../reasoning/reasoning-engine.js';
import { ReasoningParser } from '../../reasoning/reasoning-parser.js';
import { Renderer } from '../../ui/renderer.js';
import { eventBus, Events } from '../../core/event-bus.js';
import { qs } from '../../core/utils.js';
import { SessionState } from '../session/session-state.js';
import { SessionHelpers } from '../session/session-helpers.js';
import { ErrorHandler } from './error-handler.js';
import { MAX_ITERATIONS, ITERATION_DELAY } from '../../core/constants.js';

export const IterationRunner = {
    async runIteration(stopCallback) {
        if (!SessionState.isActive()) return;

        const modelId = qs('#modelSelect')?.value;
        const currentQuery = Storage.loadCurrentQuery();

        if (!modelId || !currentQuery) {
            console.error('Missing model or query');
            stopCallback();
            return;
        }

        const iterationCount = SessionState.incrementIteration();
        window.GDRS.currentIteration = iterationCount;
        SessionHelpers.updateIterationDisplay();

        try {
            // Check if already complete
            if (Storage.isFinalOutputVerified()) {
                console.log('✅ LLM provided verified final output - session complete');
                SessionHelpers.finishSession('LLM provided verified final output', stopCallback);
                return;
            }

            // Generate LLM response
            const prompt = ReasoningEngine.buildContextPrompt(currentQuery, iterationCount);
            console.log(`🧠 Iteration ${iterationCount} - Prompt: ${prompt.length} chars`);

            const response = await GeminiAPI.generateContent(modelId, prompt);
            const responseText = GeminiAPI.extractResponseText(response);

            if (!responseText?.trim()) {
                throw new Error('Empty response from model');
            }

            console.log(`✅ Response received: ${responseText.length} chars`);
            SessionState.resetErrors(); // Reset on success

            // Extract reasoning text for logging
            const reasoningBlocks = ReasoningParser.extractReasoningBlocks(responseText);
            const pureReasoningTexts = reasoningBlocks
                .map(block => ReasoningParser.extractPureReasoningText(block))
                .filter(text => text.length > 0);

            if (pureReasoningTexts.length > 0) {
                const logEntries = Storage.loadReasoningLog();
                logEntries.push(`=== ITERATION ${iterationCount} ===\n${pureReasoningTexts.join('\n\n')}`);
                Storage.saveReasoningLog(logEntries);
                Renderer.renderReasoningLog();
            }

            // Parse ALL operations from ENTIRE response
            const allOperations = ReasoningParser.parseOperations(responseText);

            // Apply all found operations
            const operationSummary = await ReasoningParser.applyOperations(allOperations);
            SessionHelpers.recordOperationSummary(operationSummary, iterationCount);

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
            if (Storage.isFinalOutputVerified()) {
                console.log('✅ Final output generated during iteration');
                SessionHelpers.finishSession('Final output received from LLM', stopCallback);
                return;
            }

            if (ReasoningEngine.checkGoalsComplete()) {
                console.log('🎯 Goals completed - expecting final output from LLM');
                // Continue iterations to let LLM provide final output
            }

            // Hard limit - LLM MUST provide final output
            if (iterationCount >= MAX_ITERATIONS) {
                console.error('❌ Max iterations reached - LLM did not provide final output');
                SessionHelpers.finishSession('Maximum iterations reached without final output', stopCallback);
                return;
            }

            // Schedule next iteration
            if (SessionState.isActive()) {
                const timer = setTimeout(() => this.runIteration(stopCallback), ITERATION_DELAY);
                SessionState.setLoopTimer(timer);
            }

        } catch (err) {
            ErrorHandler.handleIterationError(err, () => this.runIteration(stopCallback), stopCallback);
        }
    }
};
