# Gemini Multi-Talk

Static **HTML / JS / CSS** lab for running **multi-candidate Gemini conversations** with:

- Many **API keys** pasted in Settings → status-aware **rotation**
- **v1beta** endpoints for the **latest model catalogue** + `generateContent`
- **≥3 Gemini-only candidates** speaking **turn by turn**
- System prompts that frame every speaker as a **human** among humans
- Full **reasoning / thought** capture (when the model returns it)
- **Export** chat, reasoning, JSON session dumps, and observer event logs

Open `index.html` via any static server (or GitHub Pages at `/gemini/`).

```bash
# from this folder
python3 -m http.server 8765
# → http://localhost:8765/
```

## Quick start

1. Open **Settings**.
2. Paste one or more Gemini API keys (newline or comma separated) → **Apply keys**.
3. Click **Refresh model catalogue** (uses `GET /v1beta/models`).
4. Tune candidates (name, persona, model, temperature). Keep at least **3**.
5. Set a **seed topic** (moderator opening).
6. **Save settings** → **Start**.

Keys may be stored in `localStorage` if “Persist keys” is checked. Treat that as sensitive.

## What you can observe

| Surface | Purpose |
|--------|---------|
| **Conversation** tab | Public chat turns + expandable reasoning |
| **Observer log** tab | Live event bus (`turn:*`, `api:*`, `key:*`, …) |
| **Export JSON** | Full session + reasoning + events |
| **Export MD / Chat / Reasoning** | Human-readable dumps |
| `window.GMT` | Console handle: `engine`, `keyManager`, `bus`, … |

## Module map

```
gemini/
  index.html
  README.md
  docs/ARCHITECTURE.md
  css/          base, layout, chat, settings
  js/
    app.js                 bootstrap
    config/                constants, defaults
    core/
      event-bus.js         observability bus
      storage.js           localStorage
      key-manager.js       multi-key pool + rotation
      gemini-client.js     v1beta REST + retries
      model-catalogue.js   listModels cache
      transcript.js        structured turns
      conversation-engine.js  turn scheduler
      export.js
    agents/
      candidate.js         one Gemini “human”
      persona-prompt.js    system + contents builder
    ui/                    settings, chat, event log, toast
    utils/
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for data flow and invariants.

## API surface used

| Call | Path |
|------|------|
| List models | `GET https://generativelanguage.googleapis.com/v1beta/models` |
| Generate | `POST .../v1beta/models/{model}:generateContent` |

Thinking is requested via `generationConfig.thinkingConfig` (`includeThoughts`, optional `thinkingLevel` / `thinkingBudget`). Support varies by model; empty reasoning is OK.

## License / safety

Client-side only. You are responsible for key security and content. Designed for research / observation of multi-agent dialogue dynamics.
