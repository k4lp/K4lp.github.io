/**
 * Parse OpenAI Chat Completions SSE stream (data: {...}\n\n / [DONE]).
 * @module core/stream-parser
 */

/**
 * @typedef {Object} StreamChunk
 * @property {string} [content]  assistant content delta
 * @property {string} [role]
 * @property {string} [finishReason]
 * @property {object} [usage]
 * @property {object} [raw]
 * @property {boolean} [done]
 */

/**
 * Read a fetch Response body as SSE and yield parsed chat deltas.
 * @param {ReadableStream} body
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {AsyncGenerator<StreamChunk>}
 */
export async function* parseOpenAIChatSSE(body, opts = {}) {
  if (!body) throw new Error('Empty response body (stream unavailable)');

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let done = false;

  const onAbort = () => {
    try {
      reader.cancel();
    } catch {
      /* ignore */
    }
  };
  if (opts.signal) {
    if (opts.signal.aborted) onAbort();
    else opts.signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events separated by blank line
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split(/\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue; // comment / keep-alive
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            yield { done: true };
            done = true;
            break;
          }
          try {
            const json = JSON.parse(data);
            const choice = json.choices?.[0];
            const delta = choice?.delta || {};
            yield {
              content: delta.content || '',
              role: delta.role,
              finishReason: choice?.finish_reason ?? null,
              usage: json.usage || null,
              model: json.model,
              id: json.id,
              raw: json,
              done: false,
            };
          } catch (err) {
            // non-JSON data line — skip
            console.warn('[SSE] parse skip', data.slice(0, 80));
          }
        }
        if (done) break;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
    if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
  }
}

/**
 * Collect full text from a stream generator.
 * @param {AsyncGenerator<StreamChunk>} gen
 * @param {(chunk: StreamChunk) => void} [onDelta]
 */
export async function collectStream(gen, onDelta) {
  let text = '';
  let usage = null;
  let finishReason = null;
  let model = null;
  let id = null;

  for await (const chunk of gen) {
    if (chunk.done) break;
    if (chunk.content) {
      text += chunk.content;
      onDelta?.(chunk);
    }
    if (chunk.usage) usage = chunk.usage;
    if (chunk.finishReason) finishReason = chunk.finishReason;
    if (chunk.model) model = chunk.model;
    if (chunk.id) id = chunk.id;
  }

  return { text, usage, finishReason, model, id };
}
