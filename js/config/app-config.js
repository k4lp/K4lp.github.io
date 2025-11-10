import { SYSTEM_PROMPT_BASE } from './prompt-instruction-modules.js';

/**
 * Application Configuration
 *
 * Core application settings, limits, and the system prompt
 */

/**
 * Application version
 */
export const VERSION = '1.1.4';

/**
 * Maximum number of reasoning iterations per session
 */
export const MAX_ITERATIONS = 2000;

/**
 * Delay between iterations in milliseconds
 */
export const ITERATION_DELAY = 200;

/**
 * Maximum retry attempts for failed API calls
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay before retrying after empty response (milliseconds)
 */
export const EMPTY_RESPONSE_RETRY_DELAY = 1000;

/**
 * INTELLIGENT SYSTEM PROMPT - STREAMLINED
 *
 * Defines the behavior, capabilities, and tool usage for the GDRS reasoning engine.
 */
export const SYSTEM_PROMPT = SYSTEM_PROMPT_BASE;

