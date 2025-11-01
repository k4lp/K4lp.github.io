/**
 * Session Helpers
 * Helper functions for session management
 */

import { Storage } from '../../storage/storage.js';
import { Renderer } from '../../ui/renderer.js';
import { qs } from '../../core/utils.js';
import { SessionState } from './session-state.js';

export const SessionHelpers = {
    finishSession(reason, stopCallback) {
        const logEntries = Storage.loadReasoningLog();
        logEntries.push(`=== SESSION COMPLETE ===\n${reason}\nIterations: ${SessionState.getIterationCount()}`);
        Storage.saveReasoningLog(logEntries);
        Renderer.renderReasoningLog();
        stopCallback();
    },

    updateIterationDisplay() {
        const iterCountEl = qs('#iterationCount');
        if (iterCountEl) iterCountEl.textContent = String(SessionState.getIterationCount());
    },

    recordOperationSummary(summary, iteration) {
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
};
