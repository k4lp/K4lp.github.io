/**
 * Orchestrates turn-by-turn multi-candidate Gemini conversations.
 *
 * Architecture:
 *  - Transcript is the single source of truth for public chat + reasoning.
 *  - Candidates speak strictly in sequence (round-robin among enabled).
 *  - Event bus emits turn/session lifecycle for UI + observability.
 *
 * @module core/conversation-engine
 */

import { EVENTS } from '../config/constants.js';
import { bus } from './event-bus.js';
import { Transcript } from './transcript.js';
import { Candidate } from '../agents/candidate.js';
import { sleep } from '../utils/time.js';

export class ConversationEngine {
  /**
   * @param {object} deps
   * @param {import('./gemini-client.js').GeminiClient} deps.client
   * @param {() => object} deps.getSettings  live settings getter
   */
  constructor({ client, getSettings }) {
    this.client = client;
    this.getSettings = getSettings;
    this.transcript = new Transcript();
    /** @type {Candidate[]} */
    this.candidates = [];
    this.state = 'idle'; // idle | running | paused | stopped | complete | error
    this._abort = false;
    this._pauseWait = null;
    this._pauseResolve = null;
    this.turnCursor = 0; // index into enabled candidates rotation
    this.completedTurns = 0;
  }

  /**
   * Load candidates from settings (min 3 enforced for UX, not hard-fail).
   * @param {object[]} list
   */
  setCandidates(list) {
    this.candidates = (list || []).map((c, i) => Candidate.fromJSON(c, i));
  }

  enabledCandidates() {
    return this.candidates.filter((c) => c.enabled);
  }

  /**
   * Start a new session: seed moderator message, then run turns until max or stop.
   */
  async start() {
    if (this.state === 'running') return;
    const settings = this.getSettings();
    this.setCandidates(settings.candidates);
    const enabled = this.enabledCandidates();
    if (enabled.length < 1) {
      throw new Error('Enable at least one candidate.');
    }
    if (enabled.length < 3) {
      bus.log('Fewer than 3 candidates enabled — continuing anyway.', 'warn');
    }

    this._abort = false;
    this.completedTurns = 0;
    this.turnCursor = 0;
    this.transcript.reset({
      maxTurns: settings.maxTurns,
      seedTopic: settings.seedTopic,
      candidates: enabled.map((c) => c.toJSON()),
    });

    // Moderator seed — visible to all as human context
    if (settings.seedTopic?.trim()) {
      this.transcript.append({
        role: 'moderator',
        speakerName: 'Moderator',
        text: settings.seedTopic.trim(),
        reasoning: '',
        meta: { kind: 'seed' },
      });
    }

    this.state = 'running';
    bus.emit(EVENTS.SESSION_START, {
      sessionId: this.transcript.sessionId,
      candidates: enabled.map((c) => c.name),
    });

    try {
      await this._loop();
    } catch (err) {
      this.state = 'error';
      bus.emit(EVENTS.TURN_ERROR, { message: err.message, fatal: true });
      throw err;
    }
  }

  async _loop() {
    const settings = () => this.getSettings();

    while (!this._abort) {
      await this._waitIfPaused();
      if (this._abort) break;

      const s = settings();
      if (this.completedTurns >= (s.maxTurns || 12)) {
        this.state = 'complete';
        this.transcript.markEnded({ reason: 'max_turns' });
        bus.emit(EVENTS.SESSION_COMPLETE, {
          sessionId: this.transcript.sessionId,
          turns: this.completedTurns,
        });
        return;
      }

      const enabled = this.enabledCandidates();
      if (!enabled.length) {
        throw new Error('No enabled candidates left.');
      }

      const candidate = enabled[this.turnCursor % enabled.length];
      this.turnCursor = (this.turnCursor + 1) % enabled.length;

      await this._runTurn(candidate);

      this.completedTurns += 1;
      const delay = s.interTurnDelayMs ?? 400;
      if (delay > 0 && !this._abort) await sleep(delay);
    }

    if (this._abort) {
      this.state = 'stopped';
      this.transcript.markEnded({ reason: 'stopped' });
      bus.emit(EVENTS.SESSION_STOP, { sessionId: this.transcript.sessionId });
    }
  }

  /**
   * @param {Candidate} candidate
   */
  async _runTurn(candidate) {
    const settings = this.getSettings();
    const turnIndex = this.transcript.turns.length;

    bus.emit(EVENTS.TURN_START, {
      turnIndex,
      candidateId: candidate.id,
      name: candidate.name,
      model: candidate.model,
    });

    const maxRetries = settings.maxRetriesPerTurn ?? 4;
    // temporarily lower client retries? Client already rotates keys.
    // We wrap once with surface-level error handling.
    let lastErr = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await candidate.speak(this.client, {
          turns: this.transcript.getTurns(),
          allCandidates: this.candidates,
          settings,
        });

        const text = (result.text || '').trim();
        if (!text) {
          lastErr = new Error('Empty model response');
          bus.log(`Empty response from ${candidate.name}, retry ${attempt + 1}`, 'warn');
          continue;
        }

        const turn = this.transcript.append({
          role: 'candidate',
          candidateId: candidate.id,
          speakerName: candidate.name,
          text,
          reasoning: result.reasoning || '',
          meta: {
            model: result.model,
            keyId: result.keyId,
            keyLabel: result.keyLabel,
            requestId: result.requestId,
            durationMs: result.durationMs,
            usage: result.usage,
            finishReason: result.finishReason,
            attempt,
            color: candidate.color,
          },
          raw: result.raw,
        });

        bus.emit(EVENTS.TURN_END, { turn });
        return turn;
      } catch (err) {
        lastErr = err;
        bus.emit(EVENTS.TURN_ERROR, {
          candidateId: candidate.id,
          name: candidate.name,
          message: err.message,
          attempt,
        });
        if (err.code === 'NO_KEYS') break;
      }
    }

    // Record failure as system note so observers see the gap, then continue session
    this.transcript.append({
      role: 'system',
      speakerName: 'System',
      text: `Turn failed for ${candidate.name}: ${lastErr?.message || 'unknown error'}`,
      reasoning: '',
      meta: { error: true, candidateId: candidate.id },
    });
    bus.log(
      `Turn failed for ${candidate.name}: ${lastErr?.message || 'unknown'} — continuing`,
      'error'
    );
    // Fatal only when no keys remain
    if (lastErr?.code === 'NO_KEYS') throw lastErr;
    return null;
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this._pauseWait = new Promise((resolve) => {
      this._pauseResolve = resolve;
    });
    bus.emit(EVENTS.SESSION_PAUSE, {});
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    if (this._pauseResolve) {
      this._pauseResolve();
      this._pauseResolve = null;
      this._pauseWait = null;
    }
    bus.emit(EVENTS.SESSION_RESUME, {});
  }

  stop() {
    this._abort = true;
    if (this.state === 'paused' && this._pauseResolve) {
      this._pauseResolve();
      this._pauseResolve = null;
      this._pauseWait = null;
    }
    // state set in loop
    if (this.state === 'idle') {
      this.state = 'stopped';
      bus.emit(EVENTS.SESSION_STOP, {});
    }
  }

  async _waitIfPaused() {
    while (this.state === 'paused' && this._pauseWait) {
      await this._pauseWait;
    }
  }

  getSnapshot() {
    return {
      state: this.state,
      completedTurns: this.completedTurns,
      sessionId: this.transcript.sessionId,
      transcript: this.transcript.toJSON(true),
      candidates: this.candidates.map((c) => c.toJSON()),
    };
  }
}
