# OpenAI Chat Lab

Static, **extremely modular** OpenAI **Chat Completions** client under `/openai/`.

- **One-model chat** with full control surface OpenAI exposes on chat completions  
- **Realtime SSE streaming** with live token paint + stop/abort  
- **Multi-key pool** with rotation on 429 / auth / 5xx  
- **Live network status** (browser offline vs API down vs auth fail vs rate limit vs healthy)  
- Observer event bus + JSON/MD export  

## Quick start

1. Open `openai/index.html` (or https://k4lp.github.io/openai/).
2. **Settings** → paste `sk-…` keys → **Apply keys**.
3. **Refresh models** (optional) → pick a model.
4. Tune temperature / tokens / stream / system prompt → **Save**.
5. Chat. Toggle **Stream realtime** on the composer for SSE.

## Module map

```
openai/
  index.html
  README.md
  docs/ARCHITECTURE.md
  css/
  js/
    app.js                 bootstrap
    config/                constants, defaults
    core/
      event-bus.js
      storage.js
      key-manager.js       multi-key rotation
      openai-client.js     /chat/completions + /models
      stream-parser.js     SSE → deltas
      network-monitor.js   live health badge
      model-catalogue.js
      chat-session.js      single-model chat state machine
      export.js
    ui/                    chat, settings, network badge, toast
    utils/
```

## Controls exposed

| Area | Fields |
|------|--------|
| Endpoint | `apiBase`, `OpenAI-Organization`, `OpenAI-Project`, `model` |
| Sampling | `temperature`, `top_p`, `presence_penalty`, `frequency_penalty`, `n`, `seed`, `stop`, `user` |
| Limits | `max_completion_tokens` or legacy `max_tokens` |
| Format | `response_format` text / json_object |
| Stream | `stream`, `stream_options.include_usage` |
| Extra | `logit_bias`, `logprobs`, `top_logprobs`, `reasoning_effort` |
| System | system prompt (editable + reset) |

## Network badge states

| State | Meaning |
|-------|---------|
| API OK | Successful probe or chat |
| Offline | `navigator.onLine === false` |
| Network issue | fetch failed (DNS/TLS/CORS/etc.) |
| Auth fail | 401 / 403 |
| Rate limited | 429 |
| API down | 5xx |
| Probing… | Active `/models` check |

Probe runs on start, on interval, after key apply, and via **Probe** button. Real chat traffic also updates the badge.

## Console

`window.OAI` → `{ bus, keyManager, client, catalogue, network, session, getSettings }`

## Security

Keys never leave the browser except to your configured API base. Optional localStorage persistence is off-able.
