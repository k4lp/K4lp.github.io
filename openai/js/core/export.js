/** @module core/export */
import { downloadText } from '../utils/dom.js';
import { APP_NAME, APP_VERSION } from '../config/constants.js';
import { bus } from './event-bus.js';

export function exportChatJSON(session, extra = {}) {
  const payload = {
    app: APP_NAME,
    version: APP_VERSION,
    ...extra,
    session: session.toJSON(),
  };
  downloadText(
    `openai-chat-${session.sessionId}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
}

export function exportChatMarkdown(session) {
  downloadText(
    `openai-chat-${session.sessionId}.md`,
    session.toMarkdown(),
    'text/markdown'
  );
}

export function exportEventLog() {
  downloadText(
    `openai-events-${Date.now()}.json`,
    JSON.stringify(bus.getLog(), null, 2),
    'application/json'
  );
}
