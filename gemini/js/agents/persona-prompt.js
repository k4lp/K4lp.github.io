/**
 * Builds per-candidate system instructions that insist the speaker is human.
 * @module agents/persona-prompt
 */

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.persona
 * @param {string[]} opts.otherNames
 * @param {string} opts.template  uses {{NAME}}, {{OTHERS}}, {{PERSONA}}
 * @param {string} [opts.addendum]
 */
export function buildSystemInstruction({ name, persona, otherNames, template, addendum }) {
  const others =
    otherNames.filter((n) => n && n !== name).join(', ') || 'the other participants';
  let text = String(template || '')
    .replaceAll('{{NAME}}', name)
    .replaceAll('{{OTHERS}}', others)
    .replaceAll('{{PERSONA}}', persona || 'A thoughtful conversationalist.');

  if (addendum?.trim()) {
    text += `\n\nAdditional context for this session:\n${addendum.trim()}`;
  }

  // Content for systemInstruction — parts only (role optional / ignored)
  return {
    parts: [{ text }],
  };
}

/**
 * Build Gemini `contents` for a candidate from the shared transcript.
 *
 * Strategy:
 * - Own past messages → role `model`
 * - Others / moderator → role `user` with "[Name]: text"
 * - Consecutive same-role messages are merged (API requires alternation)
 *
 * @param {object} opts
 * @param {string} opts.candidateId
 * @param {string} opts.candidateName
 * @param {import('../core/transcript.js').TranscriptTurn[]} opts.turns
 * @param {string} [opts.turnHint]  appended as final user nudge
 */
export function buildContentsForCandidate({ candidateId, candidateName, turns, turnHint }) {
  /** @type {{role: string, parts: {text: string}[]}[]} */
  const raw = [];

  for (const t of turns) {
    // Do not feed reasoning to other models — only public text
    const body = (t.text || '').trim();
    if (!body && t.role !== 'moderator') continue;

    const isSelf =
      t.role === 'candidate' &&
      (t.candidateId === candidateId || t.speakerName === candidateName);

    if (isSelf) {
      raw.push({ role: 'model', parts: [{ text: body }] });
    } else {
      const label = t.speakerName || 'Someone';
      raw.push({ role: 'user', parts: [{ text: `[${label}]: ${body}` }] });
    }
  }

  if (turnHint) {
    raw.push({
      role: 'user',
      parts: [
        {
          text: turnHint,
        },
      ],
    });
  }

  // Ensure conversation starts with user
  if (!raw.length) {
    raw.push({
      role: 'user',
      parts: [{ text: '[Moderator]: Please begin the conversation naturally.' }],
    });
  } else if (raw[0].role === 'model') {
    raw.unshift({
      role: 'user',
      parts: [{ text: '[Moderator]: Continue from here.' }],
    });
  }

  return mergeAlternating(raw);
}

/**
 * Gemini requires strict user/model alternation.
 * @param {{role: string, parts: {text: string}[]}[]} messages
 */
function mergeAlternating(messages) {
  if (!messages.length) return messages;
  const out = [];
  for (const msg of messages) {
    const last = out[out.length - 1];
    if (last && last.role === msg.role) {
      const prev = last.parts.map((p) => p.text).join('\n');
      const next = msg.parts.map((p) => p.text).join('\n');
      last.parts = [{ text: `${prev}\n\n${next}` }];
    } else {
      out.push({
        role: msg.role,
        parts: msg.parts.map((p) => ({ text: p.text })),
      });
    }
  }
  // If last is model, that's ok when we're about to generate;
  // but generateContent needs the last content to be user for a new reply.
  // Caller should append turnHint as user — already done.
  return out;
}

/**
 * Default turn hint when it's someone's turn.
 */
export function defaultTurnHint(name, others) {
  return (
    `It is now your turn to speak as ${name}. ` +
    `Respond naturally to the conversation with ${others.join(', ') || 'the group'}. ` +
    `Write only your spoken words — no name prefix, no meta commentary.`
  );
}
