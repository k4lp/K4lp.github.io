/**
 * GDRS Loop Controller
 * Streamlined session management with modular architecture
 */

import { SessionState } from './session/session-state.js';
import { SessionManager } from './session/session-manager.js';
import { IterationRunner } from './iteration/iteration-runner.js';

export const LoopController = {
    async startSession() {
        await SessionManager.startSession(() => IterationRunner.runIteration(() => this.stopSession()));
    },

    stopSession() {
        SessionManager.stopSession();
    },

    isActive: () => SessionState.isActive()
};
