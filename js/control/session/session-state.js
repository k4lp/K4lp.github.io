/**
 * Session State
 * Centralized session state management
 */

export const SessionState = {
    active: false,
    iterationCount: 0,
    loopTimer: null,
    consecutiveErrors: 0,

    reset() {
        this.active = false;
        this.iterationCount = 0;
        this.loopTimer = null;
        this.consecutiveErrors = 0;
    },

    isActive() {
        return this.active;
    },

    setActive(value) {
        this.active = value;
    },

    incrementIteration() {
        this.iterationCount++;
        return this.iterationCount;
    },

    getIterationCount() {
        return this.iterationCount;
    },

    setLoopTimer(timer) {
        this.loopTimer = timer;
    },

    clearLoopTimer() {
        if (this.loopTimer) {
            clearTimeout(this.loopTimer);
            this.loopTimer = null;
        }
    },

    incrementErrors() {
        this.consecutiveErrors++;
        return this.consecutiveErrors;
    },

    resetErrors() {
        this.consecutiveErrors = 0;
    },

    getConsecutiveErrors() {
        return this.consecutiveErrors;
    }
};
