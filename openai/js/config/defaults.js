/**
 * Default settings — full Chat Completions control surface.
 * @module config/defaults
 */

import { FALLBACK_MODEL, ROTATION_STRATEGY } from './constants.js';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, precise assistant. Prefer clear structure and honest uncertainty when unsure.';

export function createDefaultSettings() {
  return {
    // ── Keys / pool ──
    rotationStrategy: ROTATION_STRATEGY.ROUND_ROBIN,
    rateLimitCooldownMs: 60_000,
    maxKeyFailures: 3,
    persistKeys: true,
    maxRetries: 4,

    // ── Endpoint ──
    apiBase: 'https://api.openai.com/v1',
    organization: '',
    project: '',

    // ── Model ──
    model: FALLBACK_MODEL,

    // ── Sampling (OpenAI Chat Completions) ──
    temperature: 0.7,
    topP: 1,
    /** Prefer max_completion_tokens for modern / reasoning models */
    useMaxCompletionTokens: true,
    maxCompletionTokens: 2048,
    maxTokens: 2048, // legacy alias when useMaxCompletionTokens=false
    presencePenalty: 0,
    frequencyPenalty: 0,
    n: 1,
    seed: null, // null = omit
    stop: '', // comma/newline separated → array
    user: '',
    logitBiasJson: '', // optional JSON object string
    logprobs: false,
    topLogprobs: 0,

    // ── Response format ──
    responseFormat: 'text', // text | json_object
    jsonSchemaJson: '', // optional when json_schema supported later

    // ── Streaming ──
    stream: true,
    streamIncludeUsage: true,

    // ── Reasoning models (when supported by the model) ──
    reasoningEffort: '', // '' | low | medium | high

    // ── System ──
    systemPrompt: DEFAULT_SYSTEM_PROMPT,

    // ── Network monitor ──
    netProbeIntervalMs: 30_000,
    netProbeOnIdle: true,
    requestTimeoutMs: 120_000,

    // ── UI ──
    autoScroll: true,
    showTokenMeta: true,
  };
}

export function getDefaultSystemPrompt() {
  return DEFAULT_SYSTEM_PROMPT;
}

export function resetSettingsToDefaults(current = {}, which = { all: true }) {
  const d = createDefaultSettings();
  const next = { ...current };
  const all = which.all === true;

  if (all || which.prompts) {
    next.systemPrompt = d.systemPrompt;
  }
  if (all || which.sampling) {
    next.temperature = d.temperature;
    next.topP = d.topP;
    next.maxCompletionTokens = d.maxCompletionTokens;
    next.maxTokens = d.maxTokens;
    next.useMaxCompletionTokens = d.useMaxCompletionTokens;
    next.presencePenalty = d.presencePenalty;
    next.frequencyPenalty = d.frequencyPenalty;
    next.n = d.n;
    next.seed = d.seed;
    next.stop = d.stop;
    next.responseFormat = d.responseFormat;
    next.stream = d.stream;
    next.streamIncludeUsage = d.streamIncludeUsage;
    next.reasoningEffort = d.reasoningEffort;
    next.logprobs = d.logprobs;
    next.topLogprobs = d.topLogprobs;
    next.logitBiasJson = d.logitBiasJson;
  }
  if (all || which.endpoint) {
    next.apiBase = d.apiBase;
    next.organization = d.organization;
    next.project = d.project;
    next.model = d.model;
  }
  if (all && which.preservePersistKeys !== false) {
    next.persistKeys = current.persistKeys !== false;
  }
  return next;
}
