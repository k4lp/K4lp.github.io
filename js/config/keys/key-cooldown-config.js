/**
 * Key Cooldown Configuration
 *
 * Settings for API key cooldown management
 */

/**
 * Default cooldown duration for rate limits (milliseconds)
 */
export const DEFAULT_COOLDOWN_DURATION = 30000; // 30 seconds

/**
 * Extended cooldown for repeated failures (milliseconds)
 */
export const REPEATED_FAILURE_COOLDOWN = 60000; // 1 minute

/**
 * Cooldown duration for validation failures (milliseconds)
 */
export const VALIDATION_FAILURE_COOLDOWN = 30000; // 30 seconds

/**
 * Cooldown increase factor for consecutive failures
 */
export const COOLDOWN_INCREASE_FACTOR = 1.5;

/**
 * Maximum cooldown duration (milliseconds)
 */
export const MAX_COOLDOWN_DURATION = 300000; // 5 minutes

/**
 * Minimum cooldown duration (milliseconds)
 */
export const MIN_COOLDOWN_DURATION = 10000; // 10 seconds

/**
 * Cooldown type categories
 */
export const COOLDOWN_TYPES = {
    RATE_LIMIT: 'rate_limit',
    FAILURE: 'failure',
    VALIDATION: 'validation',
    MANUAL: 'manual',
};

/**
 * Cooldown duration map by type
 */
export const COOLDOWN_DURATION_MAP = {
    [COOLDOWN_TYPES.RATE_LIMIT]: DEFAULT_COOLDOWN_DURATION,
    [COOLDOWN_TYPES.FAILURE]: REPEATED_FAILURE_COOLDOWN,
    [COOLDOWN_TYPES.VALIDATION]: VALIDATION_FAILURE_COOLDOWN,
    [COOLDOWN_TYPES.MANUAL]: DEFAULT_COOLDOWN_DURATION,
};

/**
 * Calculate cooldown duration based on failure count
 * @param {number} failureCount - Number of consecutive failures
 * @param {string} cooldownType - Type of cooldown
 * @returns {number} Cooldown duration in milliseconds
 */
export function calculateCooldownDuration(failureCount, cooldownType = COOLDOWN_TYPES.FAILURE) {
    const baseDuration = COOLDOWN_DURATION_MAP[cooldownType] || DEFAULT_COOLDOWN_DURATION;
    const multiplier = Math.pow(COOLDOWN_INCREASE_FACTOR, failureCount - 1);
    const calculatedDuration = baseDuration * multiplier;

    return Math.min(
        Math.max(calculatedDuration, MIN_COOLDOWN_DURATION),
        MAX_COOLDOWN_DURATION
    );
}

/**
 * Get cooldown remaining time in seconds
 * @param {number} cooldownUntil - Timestamp when cooldown ends
 * @returns {number} Remaining seconds (0 if no cooldown)
 */
export function getCooldownRemainingSeconds(cooldownUntil) {
    const now = Date.now();
    if (!cooldownUntil || cooldownUntil <= now) return 0;
    return Math.ceil((cooldownUntil - now) / 1000);
}

/**
 * Check if key is in cooldown
 * @param {number} cooldownUntil - Timestamp when cooldown ends
 * @returns {boolean} True if in cooldown
 */
export function isInCooldown(cooldownUntil) {
    return getCooldownRemainingSeconds(cooldownUntil) > 0;
}

export default {
    DEFAULT_COOLDOWN_DURATION,
    REPEATED_FAILURE_COOLDOWN,
    VALIDATION_FAILURE_COOLDOWN,
    COOLDOWN_INCREASE_FACTOR,
    MAX_COOLDOWN_DURATION,
    MIN_COOLDOWN_DURATION,
    COOLDOWN_TYPES,
    COOLDOWN_DURATION_MAP,
    calculateCooldownDuration,
    getCooldownRemainingSeconds,
    isInCooldown,
};
