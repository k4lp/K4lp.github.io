/**
 * A single conversation candidate (always Gemini-backed).
 * @module agents/candidate
 */

import { uid } from '../utils/id.js';
import { FALLBACK_MODEL, CANDIDATE_COLORS } from '../config/constants.js';
import {
  buildSystemInstruction,
  buildContentsForCandidate,
  defaultTurnHint,
} from './persona-prompt.js';

export class Candidate {
  /**
   * @param {object} cfg
   * @param {string} [cfg.id]
   * @param {string} cfg.name
   * @param {string} [cfg.persona]
   * @param {string} [cfg.model]
   * @param {number} [cfg.temperature]
   * @param {boolean} [cfg.enabled]
   * @param {number} [cfg.colorIndex]
   */
  constructor(cfg) {
    this.id = cfg.id || uid('cand');
    this.name = cfg.name || 'Speaker';
    this.persona = cfg.persona || '';
    this.model = cfg.model || FALLBACK_MODEL;
    this.temperature = cfg.temperature ?? 0.9;
    this.enabled = cfg.enabled !== false;
    this.colorIndex = cfg.colorIndex ?? 0;
  }

  get color() {
    return CANDIDATE_COLORS[this.colorIndex % CANDIDATE_COLORS.length];
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      persona: this.persona,
      model: this.model,
      temperature: this.temperature,
      enabled: this.enabled,
      colorIndex: this.colorIndex,
    };
  }

  static fromJSON(obj, colorIndex = 0) {
    return new Candidate({ ...obj, colorIndex: obj.colorIndex ?? colorIndex });
  }

  /**
   * @param {import('../core/gemini-client.js').GeminiClient} client
   * @param {object} ctx
   * @param {import('../core/transcript.js').TranscriptTurn[]} ctx.turns
   * @param {Candidate[]} ctx.allCandidates
   * @param {object} ctx.settings
   */
  async speak(client, ctx) {
    const others = ctx.allCandidates
      .filter((c) => c.id !== this.id && c.enabled)
      .map((c) => c.name);

    const systemInstruction = buildSystemInstruction({
      name: this.name,
      persona: this.persona,
      otherNames: others,
      template: ctx.settings.humanFrameTemplate,
      addendum: ctx.settings.globalSystemAddendum,
    });

    const turnHint = defaultTurnHint(this.name, others);
    const contents = buildContentsForCandidate({
      candidateId: this.id,
      candidateName: this.name,
      turns: ctx.turns,
      turnHint,
    });

    const generationConfig = {
      temperature: this.temperature,
      maxOutputTokens: ctx.settings.maxOutputTokens ?? 2048,
      topP: ctx.settings.topP ?? 0.95,
    };

    // Thinking / reasoning controls (v1beta generateContent)
    if (ctx.settings.includeThoughts) {
      generationConfig.thinkingConfig = {
        includeThoughts: true,
      };
      if (ctx.settings.thinkingBudget > 0) {
        generationConfig.thinkingConfig.thinkingBudget = ctx.settings.thinkingBudget;
      }
    }
    // Newer models accept thinkingLevel on thinkingConfig (lowercase enum).
    if (ctx.settings.thinkingLevel) {
      generationConfig.thinkingConfig = {
        ...(generationConfig.thinkingConfig || {}),
        thinkingLevel: String(ctx.settings.thinkingLevel).toLowerCase(),
      };
    }

    const result = await client.generateContent({
      model: this.model,
      contents,
      systemInstruction,
      generationConfig,
    });

    return {
      text: result.text,
      reasoning: result.thoughts,
      model: result.model,
      keyId: result.keyId,
      keyLabel: result.keyLabel,
      requestId: result.requestId,
      durationMs: result.durationMs,
      usage: result.usage,
      finishReason: result.finishReason,
      raw: {
        parts: result.rawParts,
        usage: result.usage,
        finishReason: result.finishReason,
      },
    };
  }
}
