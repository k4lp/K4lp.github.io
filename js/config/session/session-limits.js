/**
 * Session Limits Configuration
 *
 * Settings for session management, iteration limits, and error handling
 */

/**
 * Maximum number of reasoning iterations per session
 */
export const MAX_ITERATIONS = 2000;

/**
 * Delay between iterations (milliseconds)
 */
export const ITERATION_DELAY = 200;

/**
 * Maximum consecutive errors before stopping session
 */
export const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * Maximum session duration (milliseconds)
 */
export const MAX_SESSION_DURATION = 3600000; // 1 hour

/**
 * Session warning thresholds
 */
export const SESSION_WARNINGS = {
    ITERATIONS_WARNING_THRESHOLD: 1800,  // Warn at 90% of max
    TIME_WARNING_THRESHOLD: 3300000,     // Warn at 55 minutes
    MEMORY_WARNING_THRESHOLD_MB: 80,     // Warn at 80MB usage
};

/**
 * Session states
 */
export const SESSION_STATES = {
    IDLE: 'idle',
    STARTING: 'starting',
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    ERROR: 'error',
    COMPLETED: 'completed',
};

/**
 * Session completion reasons
 */
export const COMPLETION_REASONS = {
    GOALS_COMPLETE: 'goals_complete',
    FINAL_OUTPUT_PROVIDED: 'final_output_provided',
    MAX_ITERATIONS_REACHED: 'max_iterations_reached',
    MAX_ERRORS_REACHED: 'max_errors_reached',
    USER_STOPPED: 'user_stopped',
    TIMEOUT: 'timeout',
    ERROR: 'error',
};

/**
 * Check if should warn about iterations
 * @param {number} currentIteration - Current iteration number
 * @returns {boolean} True if should warn
 */
export function shouldWarnIterations(currentIteration) {
    return currentIteration >= SESSION_WARNINGS.ITERATIONS_WARNING_THRESHOLD;
}

/**
 * Check if should warn about session time
 * @param {number} sessionStartTime - Session start timestamp
 * @returns {boolean} True if should warn
 */
export function shouldWarnSessionTime(sessionStartTime) {
    const elapsed = Date.now() - sessionStartTime;
    return elapsed >= SESSION_WARNINGS.TIME_WARNING_THRESHOLD;
}

/**
 * Calculate session progress percentage
 * @param {number} currentIteration - Current iteration number
 * @returns {number} Progress percentage (0-100)
 */
export function calculateSessionProgress(currentIteration) {
    return Math.min(100, (currentIteration / MAX_ITERATIONS) * 100);
}

export default {
    MAX_ITERATIONS,
    ITERATION_DELAY,
    MAX_CONSECUTIVE_ERRORS,
    MAX_SESSION_DURATION,
    SESSION_WARNINGS,
    SESSION_STATES,
    COMPLETION_REASONS,
    shouldWarnIterations,
    shouldWarnSessionTime,
    calculateSessionProgress,
};
