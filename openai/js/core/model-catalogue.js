/**
 * OpenAI /v1/models catalogue with chat-oriented filtering.
 * @module core/model-catalogue
 */

import { FALLBACK_MODEL, KNOWN_CHAT_MODELS, STORAGE_KEYS } from '../config/constants.js';
import { storage } from './storage.js';

const CACHE_TTL_MS = 1000 * 60 * 30;

export class ModelCatalogue {
  /** @param {import('./openai-client.js').OpenAIClient} client */
  constructor(client) {
    this.client = client;
    this.models = [];
    this.loadedAt = null;
    this.error = null;
  }

  async refresh({ force = false } = {}) {
    if (!force) {
      const cached = storage.get(STORAGE_KEYS.MODELS_CACHE, null);
      if (cached?.models?.length && cached.loadedAt) {
        const age = Date.now() - new Date(cached.loadedAt).getTime();
        if (age < CACHE_TTL_MS) {
          this.models = cached.models;
          this.loadedAt = cached.loadedAt;
          return this.models;
        }
      }
    }

    const { models } = await this.client.listModels();
    this.models = models
      .map((m) => ({
        id: m.id,
        created: m.created,
        ownedBy: m.owned_by,
        object: m.object,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    this.loadedAt = new Date().toISOString();
    this.error = null;
    storage.set(STORAGE_KEYS.MODELS_CACHE, {
      models: this.models,
      loadedAt: this.loadedAt,
    });
    return this.models;
  }

  /**
   * Prefer models useful for chat completions.
   */
  chatModels() {
    const fromApi = this.models
      .map((m) => m.id)
      .filter((id) => looksLikeChatModel(id));

    const known = KNOWN_CHAT_MODELS.slice();
    const merged = [];
    const seen = new Set();

    // Ranked: API chat-like first (sorted by rank), then known not in API
    const ranked = (fromApi.length ? fromApi : known)
      .slice()
      .sort((a, b) => rankModel(b) - rankModel(a) || a.localeCompare(b));

    for (const id of ranked) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(id);
    }
    for (const id of known) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(id);
    }
    if (!merged.length) merged.push(FALLBACK_MODEL);
    return merged;
  }

  getNames() {
    return this.chatModels();
  }
}

function looksLikeChatModel(id) {
  const n = id.toLowerCase();
  if (n.includes('embed')) return false;
  if (n.includes('whisper')) return false;
  if (n.includes('tts')) return false;
  if (n.includes('dall-e') || n.includes('davinci-') && n.includes('instruct')) return false;
  if (n.includes('moderation')) return false;
  if (n.includes('realtime')) return false;
  if (n.includes('transcribe')) return false;
  if (n.includes('image')) return false;
  // chat-ish
  if (n.includes('gpt') || n.startsWith('o1') || n.startsWith('o3') || n.startsWith('o4')) {
    return true;
  }
  if (n.includes('chatgpt')) return true;
  return false;
}

function rankModel(id) {
  const n = id.toLowerCase();
  let s = 0;
  if (n.includes('gpt-4.1')) s += 50;
  else if (n.includes('gpt-4o')) s += 45;
  else if (n.includes('o4')) s += 44;
  else if (n.includes('o3')) s += 42;
  else if (n.includes('o1')) s += 40;
  else if (n.includes('gpt-4')) s += 35;
  else if (n.includes('gpt-3.5')) s += 20;
  if (n.includes('mini')) s += 3;
  if (n.includes('nano')) s += 2;
  if (n.includes('latest')) s += 2;
  return s;
}
