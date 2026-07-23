/**
 * Export session transcripts and event logs.
 * @module core/export
 */

import { downloadText } from '../utils/dom.js';
import { APP_NAME, APP_VERSION } from '../config/constants.js';

/**
 * @param {import('./transcript.js').Transcript} transcript
 * @param {object} [extra]
 */
export function exportSessionJSON(transcript, extra = {}) {
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    ...extra,
    session: transcript.toJSON(true),
  };
  const name = `gemini-session-${transcript.sessionId}.json`;
  downloadText(name, JSON.stringify(payload, null, 2), 'application/json');
  return payload;
}

/**
 * @param {import('./transcript.js').Transcript} transcript
 */
export function exportSessionMarkdown(transcript) {
  const md = transcript.toMarkdown();
  const name = `gemini-session-${transcript.sessionId}.md`;
  downloadText(name, md, 'text/markdown');
  return md;
}

/**
 * Chat-only plain text (no reasoning).
 * @param {import('./transcript.js').Transcript} transcript
 */
export function exportChatOnly(transcript) {
  const text = transcript.toChatText();
  const name = `gemini-chat-${transcript.sessionId}.txt`;
  downloadText(name, text, 'text/plain');
  return text;
}

/**
 * Reasoning-focused dump.
 * @param {import('./transcript.js').Transcript} transcript
 */
export function exportReasoning(transcript) {
  const lines = [`# Reasoning dump — ${transcript.sessionId}`, ''];
  for (const t of transcript.turns) {
    if (!t.reasoning) continue;
    lines.push(`## ${t.speakerName} (turn ${t.index + 1})`);
    lines.push('');
    lines.push(t.reasoning);
    lines.push('');
  }
  if (lines.length === 2) lines.push('_No reasoning captured in this session._');
  const body = lines.join('\n');
  downloadText(`gemini-reasoning-${transcript.sessionId}.md`, body, 'text/markdown');
  return body;
}

/**
 * @param {object[]} eventLog
 */
export function exportEventLog(eventLog) {
  const name = `gemini-events-${Date.now()}.json`;
  downloadText(name, JSON.stringify(eventLog, null, 2), 'application/json');
}
