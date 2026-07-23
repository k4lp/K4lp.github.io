/**
 * Fetches and caches the Gemini v1beta model catalogue.
 * Filters to models that support generateContent.
 * @module core/model-catalogue
 */

import { FALLBACK_MODEL } from '../config/constants.js';
import { normalizeModelName } from './gemini-client.js';
import { storage } from './storage.js';

const CACHE_KEY = 'models.cache';
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 min

export class ModelCatalogue {
  /**
   * @param {import('./gemini-client.js').GeminiClient} client
   */
  constructor(client) {
    this.client = client;
    /** @type {object[]} */
    this.models = [];
    this.loadedAt = null;
    this.error = null;
  }

  /**
   * @param {{force?: boolean}} [opts]
   */
  async refresh(opts = {}) {
    if (!opts.force) {
      const cached = storage.get(CACHE_KEY, null);
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
        name: normalizeModelName(m.name),
        displayName: m.displayName || normalizeModelName(m.name),
        description: m.description || '',
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
        supportedGenerationMethods: m.supportedGenerationMethods || [],
        version: m.version,
      }))
      .filter((m) =>
        (m.supportedGenerationMethods || []).some(
          (x) => String(x).toLowerCase() === 'generatecontent'
        )
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    this.loadedAt = new Date().toISOString();
    this.error = null;
    storage.set(CACHE_KEY, { models: this.models, loadedAt: this.loadedAt });
    return this.models;
  }

  /** Prefer recent gemini chat models for pickers */
  chatModels() {
    const list = this.models.length
      ? this.models
      : [{ name: FALLBACK_MODEL, displayName: FALLBACK_MODEL }];
    // Rank: flash/pro first, exclude embedding/tts/image-only if possible
    return list
      .filter((m) => {
        const n = m.name.toLowerCase();
        if (n.includes('embedding')) return false;
        if (n.includes('tts')) return false;
        if (n.includes('image-generation')) return false;
        if (n.includes('aqa')) return false;
        return true;
      })
      .sort((a, b) => rankModel(b.name) - rankModel(a.name) || a.name.localeCompare(b.name));
  }

  getNames() {
    return this.chatModels().map((m) => m.name);
  }
}

function rankModel(name) {
  const n = name.toLowerCase();
  let score = 0;
  if (n.includes('gemini')) score += 10;
  if (n.includes('3.6')) score += 50;
  else if (n.includes('3.5')) score += 45;
  else if (n.includes('3.1')) score += 40;
  else if (n.includes('3-')) score += 35;
  else if (n.includes('2.5')) score += 30;
  else if (n.includes('2.0') || n.includes('2-')) score += 20;
  if (n.includes('flash')) score += 5;
  if (n.includes('pro')) score += 4;
  if (n.includes('lite')) score -= 2;
  if (n.includes('preview')) score += 1;
  return score;
}
