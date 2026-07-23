# Architecture — OpenAI Chat Lab

## Goals

1. **Full Chat Completions surface** — build body from explicit settings; omit empty optionals.
2. **Realtime stream** — SSE parser → UI token paint; AbortController stop.
3. **Know why it fails** — network monitor separates offline / transport / auth / quota / 5xx.
4. **Modular seams** — swap client, session, or UI without rewriting the tree.

## Layer diagram

```
┌──────────────────────────────────────────────────────────┐
│  UI  chat-view · settings · network-status · toast       │
└────────────────────────────┬─────────────────────────────┘
                             │ EventBus
┌────────────────────────────▼─────────────────────────────┐
│  ChatSession   messages[], send(), abort()               │
│       │                                                  │
│       ▼                                                  │
│  OpenAIClient  key select → fetch → stream/complete      │
│       │                    │                             │
│       │                    ├──► StreamParser (SSE)       │
│       │                    └──► NetworkMonitor.observe   │
│       ▼                                                  │
│  KeyManager    rotate on 429 / auth / 5xx                │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
              api.openai.com/v1  (or custom base)
```

## Data pipeline (one chat turn)

```
composer text
    │
    ▼
ChatSession.send
    ├─ append user message  → CHAT_MESSAGE
    ├─ append assistant placeholder (streaming)
    ├─ build messages: [system?, …history]
    │
    ├─ settings.stream?
    │     yes → client.chatStream
    │            ├─ POST /chat/completions { stream:true }
    │            ├─ parseOpenAIChatSSE(res.body)
    │            ├─ each delta → STREAM_DELTA + CHAT_UPDATE
    │            └─ final usage / finish_reason
    │     no  → client.chatComplete → one CHAT_UPDATE
    │
    └─ busy=false · Stop clears AbortController
```

## Request body builder

`buildChatBody(settings, messages)` maps UI settings → OpenAI JSON:

- Always: `model`, `messages`, `stream`
- Optional: temperature, top_p, penalties, n, seed, user, stop
- Tokens: `max_completion_tokens` **or** `max_tokens`
- Stream: `stream_options.include_usage`
- Format: `response_format: { type: "json_object" }`
- Reasoning: `reasoning_effort` when set
- logit_bias from JSON textarea

## Network monitor

| Input | State |
|-------|--------|
| `navigator.offline` | OFFLINE |
| fetch throw | DEGRADED (network) |
| HTTP 401/403 | AUTH_FAIL |
| HTTP 429 | RATE_LIMITED |
| HTTP 5xx | API_DOWN |
| HTTP 2xx | ONLINE |

Active probe: `GET {base}/models` with a healthy key. Passive chat also calls `observeRequest`.

## Event topics

See `EVENTS` in `js/config/constants.js`: `stream:*`, `api:*`, `net:*`, `chat:*`, `key:*`, `models:*`.

## Extension points

1. **Responses API** — alternate client method; session stays the same.
2. **Tools / function calling** — extend body builder + stream parser for tool deltas.
3. **Vision** — multipart user content parts in `ChatSession.send`.
4. **Multi-model arena** — second `ChatSession` instance sharing `OpenAIClient`.

## Failure modes

| Situation | Behavior |
|-----------|----------|
| No keys | Toast + open Settings |
| Stream abort | Partial text kept, `_(stopped)_` |
| All keys cooling | Wait up to ~45s then retry |
| Invalid logit_bias JSON | Field omitted (no crash) |
