/**
 * Authoritative structured transcript of a multi-candidate session.
 * Every turn stores visible text, reasoning, meta, and raw API slices.
 * @module core/transcript
 */

import { uid } from '../utils/id.js';
import { nowIso } from '../utils/time.js';
import { bus } from './event-bus.js';
import { EVENTS } from '../config/constants.js';

/**
 * @typedef {Object} TranscriptTurn
 * @property {string} id
 * @property {number} index           0-based turn index in session
 * @property {string} role            'moderator' | 'candidate' | 'system'
 * @property {string|null} candidateId
 * @property {string} speakerName
 * @property {string} text            public chat text
 * @property {string} reasoning       thought summaries (may be empty)
 * @property {string} at
 * @property {object} meta
 * @property {object|null} raw        optional raw response slice
 */

export class Transcript {
  constructor() {
    /** @type {TranscriptTurn[]} */
    this.turns = [];
    this.sessionId = uid('session');
    this.startedAt = nowIso();
    this.endedAt = null;
    /** Free-form session metadata */
    this.meta = {};
  }

  reset(meta = {}) {
    this.turns = [];
    this.sessionId = uid('session');
    this.startedAt = nowIso();
    this.endedAt = null;
    this.meta = { ...meta };
    bus.emit(EVENTS.SESSION_RESET, { sessionId: this.sessionId });
  }

  /**
   * @param {Partial<TranscriptTurn> & {text: string, speakerName: string}} partial
   * @returns {TranscriptTurn}
   */
  append(partial) {
    /** @type {TranscriptTurn} */
    const turn = {
      id: partial.id || uid('turn'),
      index: this.turns.length,
      role: partial.role || 'candidate',
      candidateId: partial.candidateId ?? null,
      speakerName: partial.speakerName,
      text: partial.text || '',
      reasoning: partial.reasoning || '',
      at: partial.at || nowIso(),
      meta: partial.meta || {},
      raw: partial.raw ?? null,
    };
    this.turns.push(turn);
    bus.emit(EVENTS.TRANSCRIPT_APPEND, { turn });
    return turn;
  }

  markEnded(extra = {}) {
    this.endedAt = nowIso();
    Object.assign(this.meta, extra);
  }

  getTurns() {
    return this.turns.slice();
  }

  /** Visible chat only (no reasoning) as plain text */
  toChatText() {
    return this.turns
      .map((t) => {
        const head = `[${t.speakerName}]`;
        return `${head}\n${t.text}`;
      })
      .join('\n\n');
  }

  /** Full dump including reasoning */
  toMarkdown() {
    const lines = [
      `# Gemini Multi-Talk Session`,
      ``,
      `- Session: \`${this.sessionId}\``,
      `- Started: ${this.startedAt}`,
      `- Ended: ${this.endedAt || '—'}`,
      ``,
      `---`,
      ``,
    ];
    for (const t of this.turns) {
      lines.push(`## Turn ${t.index + 1} — ${t.speakerName}`);
      lines.push(``);
      lines.push(`*Role:* ${t.role}  `);
      if (t.meta?.model) lines.push(`*Model:* \`${t.meta.model}\`  `);
      if (t.meta?.keyLabel) lines.push(`*Key:* ${t.meta.keyLabel}  `);
      if (t.meta?.durationMs != null) lines.push(`*Latency:* ${Math.round(t.meta.durationMs)}ms  `);
      lines.push(``);
      if (t.reasoning) {
        lines.push(`### Reasoning`);
        lines.push(``);
        lines.push('```');
        lines.push(t.reasoning);
        lines.push('```');
        lines.push(``);
      }
      lines.push(`### Message`);
      lines.push(``);
      lines.push(t.text || '_(empty)_');
      lines.push(``);
      lines.push(`---`);
      lines.push(``);
    }
    return lines.join('\n');
  }

  toJSON(includeRaw = true) {
    return {
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      meta: this.meta,
      turns: this.turns.map((t) => {
        const copy = { ...t };
        if (!includeRaw) delete copy.raw;
        return copy;
      }),
    };
  }
}
