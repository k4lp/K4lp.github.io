/**
 * Session Manager
 * Session lifecycle management (start, stop, validation)
 */

import { Storage } from '../../storage/storage.js';
import { KeyManager } from '../../api/key-manager.js';
import { Renderer } from '../../ui/renderer.js';
import { eventBus, Events } from '../../core/event-bus.js';
import { qs } from '../../core/utils.js';
import { SessionState } from './session-state.js';

export const SessionManager = {
    async startSession(runIterationCallback) {
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
        SessionState.reset();
        SessionState.setActive(true);

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
        setTimeout(() => runIterationCallback(), 1000);
    },

    stopSession() {
        SessionState.setActive(false);
        SessionState.resetErrors();
        SessionState.clearLoopTimer();

        const sessionPill = qs('#sessionStatus');
        if (sessionPill) sessionPill.textContent = 'IDLE';

        const runBtn = qs('#runQueryBtn');
        if (runBtn) runBtn.textContent = 'Run Analysis';

        eventBus.emit(Events.SESSION_STOP);
        console.log('🏁 Session stopped');
    }
};
