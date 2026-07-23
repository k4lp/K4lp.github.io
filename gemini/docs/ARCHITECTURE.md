# Architecture — Gemini Multi-Talk

## Goals

1. **Robust multi-key consumption** — paste many Gemini keys; rotate on health.
2. **Observable multi-party talk** — ≥3 Gemini candidates, strict turn-taking.
3. **Human frame** — system instructions insist speakers are humans and must never believe otherwise.
4. **Modular static bundle** — no build step; ES modules; clear seams for extension.

## Layer diagram

```
┌─────────────────────────────────────────────────────────┐
│  UI (settings-panel, chat-view, event-log-view, toast)  │
└───────────────────────────┬─────────────────────────────┘
                            │ events + DOM
┌───────────────────────────▼─────────────────────────────┐
│  ConversationEngine  ── owns ──► Transcript             │
│         │                                               │
│         ▼                                               │
│  Candidate.speak()  ── prompts ──► persona-prompt       │
│         │                                               │
│         ▼                                               │
│  GeminiClient  ── selects key ──► KeyManager            │
│         │                                               │
│         ▼                                               │
│  generativelanguage.googleapis.com / v1beta             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
                     EventBus (log + UI)
```

## Core components

### KeyManager (`js/core/key-manager.js`)

- Parses multi-key blobs (newlines, commas, spaces).
- Per-key record: status, success/fail counts, cooldown timestamp, last error.
- Statuses: `ready`, `busy`, `rate_limited`, `cooldown`, `invalid`, `error`, `disabled`.
- Strategies: `healthy_first` (default), `round_robin`, `least_used`.
- On **429** → cooldown (`rateLimitCooldownMs`, or `Retry-After`).
- On **401/403** → `invalid` (skipped until manual reset).
- Emits `keys:updated`, `key:selected`, `key:status`.

### GeminiClient (`js/core/gemini-client.js`)

- Base URL: `https://generativelanguage.googleapis.com/v1beta`.
- Every request: `selectKey` → mark busy → fetch → mark success/failure → retry with other keys.
- `listModels()` paginates `GET /models`.
- `generateContent()` posts to `/models/{id}:generateContent`.
- Parses `candidates[0].content.parts` separating `thought: true` parts from public text.

### ModelCatalogue (`js/core/model-catalogue.js`)

- Filters models that list `generateContent` in `supportedGenerationMethods`.
- Caches 30 minutes in localStorage; ranks recent flash/pro models for pickers.

### Transcript (`js/core/transcript.js`)

Authoritative session log. Each turn:

| Field | Meaning |
|-------|---------|
| `role` | `moderator` \| `candidate` \| `system` |
| `text` | Public message (fed back into later prompts) |
| `reasoning` | Thought summaries (exported; **not** fed to other candidates) |
| `meta` | model, key label, latency, usage, … |
| `raw` | Optional raw parts for forensics |

### ConversationEngine (`js/core/conversation-engine.js`)

1. Reset transcript; append **moderator seed**.
2. While `completedTurns < maxTurns` and not stopped:
   - Pick next **enabled** candidate (round-robin).
   - `TURN_START` → `candidate.speak` → append turn → `TURN_END`.
   - Optional inter-turn delay.
3. Pause/resume via promise gate; stop sets abort flag.

**Invariant:** only one speaker per turn; no parallel candidate calls.

### Candidate + persona prompts

`HUMAN_FRAME_TEMPLATE` (settings-editable) expands:

- `{{NAME}}` — this candidate  
- `{{OTHERS}}` — other enabled names  
- `{{PERSONA}}` — free-text backstory  

Contents builder maps:

- Own prior turns → Gemini `model` role  
- Others / moderator → `user` role as `[Name]: …`  
- Final user hint: “It is now your turn…”  
- Merges consecutive same roles (API alternation rule)

**Reasoning isolation:** only `text` re-enters the shared history. Thoughts stay on the turn for observers/export.

## Event bus topics

See `EVENTS` in `js/config/constants.js`. Important ones:

- `session:start|pause|resume|stop|complete|reset`
- `turn:start|end|error`
- `transcript:append`
- `api:request:start|end|error`
- `key:selected|status`, `keys:updated`
- `models:loading|loaded|error`

The Observer tab listens on `*`. Exports can dump `bus.getLog()`.

## Settings persistence

| Key | Content |
|-----|---------|
| `gmt.settings` | Non-secret settings + candidates |
| `gmt.apiKeys` | Key pool (optional) |
| `gmt.models.cache` | Catalogue cache |

## Extension points

1. **New rotation strategy** — branch in `KeyManager.selectKey`.
2. **Streaming** — add `streamGenerateContent` in client; emit token deltas on the bus.
3. **Moderator AI** — extra candidate with `role: moderator` scheduling.
4. **Graph view** — subscribe to `transcript:append` and render turn DAG.
5. **Interactions API** — alternate transport in `gemini-client.js` without touching the engine.

## Failure modes

| Situation | Behavior |
|-----------|----------|
| No keys | Start blocked; toast + open Settings |
| All keys rate-limited | Retries exhaust → turn error recorded as system note |
| Empty model text | Retry turn up to `maxRetriesPerTurn` |
| Catalogue fetch fails | Fallback model id remains selectable |
| Thinking unsupported | Response still works; `reasoning` empty |

## Security notes

- Pure browser client: API keys are visible to anyone with DevTools.
- Prefer short-lived keys and disable “Persist keys” on shared machines.
- No server proxy is included; CORS is allowed by Google’s Generative Language API for browser `key=` usage.
