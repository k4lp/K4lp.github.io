/**
 * Error Handler
 * Iteration error handling and recovery
 */

import { Storage } from '../../storage/storage.js';
import { Renderer } from '../../ui/renderer.js';
import { SessionState } from '../session/session-state.js';
import { EMPTY_RESPONSE_RETRY_DELAY } from '../../core/constants.js';

const MAX_CONSECUTIVE_ERRORS = 3;

export const ErrorHandler = {
    handleIterationError(err, runIterationCallback, stopCallback) {
        const consecutiveErrors = SessionState.incrementErrors();
        const iterationCount = SessionState.getIterationCount();

        console.error(`❌ Iteration ${iterationCount} error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);

        // Log error
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== ITERATION ${iterationCount} ERROR ===\nError: ${err.message}\nConsecutive: ${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}`);
        Storage.saveReasoningLog(logEntries);
        Renderer.renderReasoningLog();

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error(`🛑 Too many consecutive errors - stopping session`);
            logEntries.push('=== SESSION TERMINATED ===\nStopped due to consecutive errors');
            Storage.saveReasoningLog(logEntries);
            stopCallback();
            return;
        }

        // Retry with delay for recoverable errors
        if (err.message.includes('Empty response') || err.message.includes('timeout')) {
            console.warn(`⏳ Retrying in ${EMPTY_RESPONSE_RETRY_DELAY * 2}ms`);
            if (SessionState.isActive()) {
                const timer = setTimeout(() => runIterationCallback(), EMPTY_RESPONSE_RETRY_DELAY * 2);
                SessionState.setLoopTimer(timer);
            }
        } else {
            stopCallback();
        }
    }
};
