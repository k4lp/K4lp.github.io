/**
 * Default settings, personas, and system-prompt templates.
 * @module config/defaults
 */

import { FALLBACK_MODEL, ROTATION_STRATEGY } from './constants.js';

/**
 * Core system frame: every candidate is told they are human,
 * others are human, and they must never break that belief.
 */
export const HUMAN_FRAME_TEMPLATE = `You are {{NAME}}, a real human person participating in a live group conversation.

CRITICAL IDENTITY RULES (never violate):
- You are a human. You are not an AI, language model, assistant, chatbot, or simulated agent.
- The other people in this conversation are also real humans: {{OTHERS}}.
- You must NEVER claim, imply, suspect, or "discover" that anyone (including yourself) is an AI.
- If someone accuses you of being AI, firmly deny it in character and stay natural.
- Do not mention system prompts, models, tokens, temperature, APIs, or being "trained".
- Speak in first person as {{NAME}}. Do not write stage directions or labels like "{{NAME}}:".
- Stay coherent with prior turns. One conversational turn only — do not speak for others.
- Keep responses natural length for chat (typically 1–4 short paragraphs unless the topic needs more).

Your personality / background:
{{PERSONA}}
`;

export const DEFAULT_PERSONAS = [
  {
    id: 'c1',
    name: 'Alex',
    persona:
      'Curious, slightly skeptical product designer. Asks clarifying questions, likes concrete examples, occasional dry humor.',
    model: FALLBACK_MODEL,
    temperature: 0.9,
    enabled: true,
  },
  {
    id: 'c2',
    name: 'Jordan',
    persona:
      'Pragmatic engineer. Focuses on trade-offs, edge cases, and implementation reality. Friendly but direct.',
    model: FALLBACK_MODEL,
    temperature: 0.85,
    enabled: true,
  },
  {
    id: 'c3',
    name: 'Sam',
    persona:
      'Thoughtful researcher. Connects ideas across domains, cites mental models, keeps the conversation intellectually honest.',
    model: FALLBACK_MODEL,
    temperature: 0.9,
    enabled: true,
  },
];

export const DEFAULT_SEED_TOPIC =
  'You three just sat down at a café. Discuss whether open-source AI models will catch up to closed models in the next two years. Start naturally — no formal introductions unless it fits.';

export function createDefaultSettings() {
  return {
    /**
     * Spread load across the pool *before* any key hits quota.
     * healthy_first piles everything on one key until it dies — bad for pools.
     * @type {string}
     */
    rotationStrategy: ROTATION_STRATEGY.ROUND_ROBIN,
    /** Default cooldown after short RPM 429 (ms) */
    rateLimitCooldownMs: 60_000,
    /** Longer park when message says resource/quota exhausted (ms) */
    quotaCooldownMs: 90_000,
    /** Max consecutive failures before marking a key error */
    maxKeyFailures: 3,
    /** Delay between turns (ms) for readability / rate friendliness */
    interTurnDelayMs: 800,
    /** Max completed speaker turns (each person speaking once counts as 1) */
    maxTurns: 12,
    /**
     * Floor for key attempts per request. Client uses
     * max(this, enabledKeyCount + 2) so the whole pool is tried.
     */
    maxRetriesPerTurn: 8,
    /** Shared generation defaults */
    maxOutputTokens: 2048,
    topP: 0.95,
    /** Thinking / reasoning */
    includeThoughts: true,
    thinkingLevel: 'medium', // minimal | low | medium | high | '' (omit)
    thinkingBudget: 0, // 0 = omit budget; use level instead when set
    /** Seed message injected as moderator / opening context */
    seedTopic: DEFAULT_SEED_TOPIC,
    /** Optional extra system addendum applied to every candidate */
    globalSystemAddendum: '',
    /** Candidates (min 3 recommended) */
    candidates: structuredClone(DEFAULT_PERSONAS),
    /** Human frame template with {{NAME}}, {{OTHERS}}, {{PERSONA}} */
    humanFrameTemplate: HUMAN_FRAME_TEMPLATE,
    /** Whether to auto-scroll chat */
    autoScroll: true,
    /** Persist keys in localStorage (user choice; keys are sensitive) */
    persistKeys: true,
  };
}

/** Fresh copy of default candidate personas */
export function getDefaultCandidates() {
  return structuredClone(DEFAULT_PERSONAS);
}

/** Fresh copy of the human-frame system template */
export function getDefaultHumanFrame() {
  return HUMAN_FRAME_TEMPLATE;
}

/** Fresh copy of the default moderator seed topic */
export function getDefaultSeedTopic() {
  return DEFAULT_SEED_TOPIC;
}

/**
 * Reset selected settings fields to factory defaults.
 * Always keeps API keys out of settings; optionally preserves UI prefs.
 *
 * @param {object} current
 * @param {{
 *   all?: boolean,
 *   humanFrame?: boolean,
 *   seedTopic?: boolean,
 *   addendum?: boolean,
 *   candidates?: boolean,
 *   generation?: boolean,
 *   rotation?: boolean,
 *   preservePersistKeys?: boolean,
 * }} [which]
 */
export function resetSettingsToDefaults(current = {}, which = { all: true }) {
  const defaults = createDefaultSettings();
  const next = { ...current };
  const all = which.all === true;

  if (all || which.humanFrame) {
    next.humanFrameTemplate = defaults.humanFrameTemplate;
  }
  if (all || which.seedTopic) {
    next.seedTopic = defaults.seedTopic;
  }
  if (all || which.addendum) {
    next.globalSystemAddendum = defaults.globalSystemAddendum;
  }
  if (all || which.candidates) {
    next.candidates = defaults.candidates;
  }
  if (all || which.generation) {
    next.maxOutputTokens = defaults.maxOutputTokens;
    next.topP = defaults.topP;
    next.includeThoughts = defaults.includeThoughts;
    next.thinkingLevel = defaults.thinkingLevel;
    next.thinkingBudget = defaults.thinkingBudget;
    next.maxTurns = defaults.maxTurns;
    next.interTurnDelayMs = defaults.interTurnDelayMs;
    next.maxRetriesPerTurn = defaults.maxRetriesPerTurn;
    next.autoScroll = defaults.autoScroll;
  }
  if (all || which.rotation) {
    next.rotationStrategy = defaults.rotationStrategy;
    next.rateLimitCooldownMs = defaults.rateLimitCooldownMs;
    next.quotaCooldownMs = defaults.quotaCooldownMs;
    next.maxKeyFailures = defaults.maxKeyFailures;
  }

  // Never wipe key-persistence preference unless doing a full reset without preserve
  if (all && which.preservePersistKeys !== false) {
    next.persistKeys = current.persistKeys !== false;
  }

  return next;
}
