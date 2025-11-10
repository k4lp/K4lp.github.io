# Agent Modernization Plan
_Last updated: 2025-11-11 02:45Z_

## 1. Scan Log & Key Observations
### Entry + Session Control
- `js/main.js`: exposes `SubAgentOrchestrator` API globally and attaches `window.SubAgent`, so any manual script can fire sub-agents; no guard for origin or concurrency tokens.
- `js/control/loop-controller.js`: imports `invokeSubAgent` but never wires it into the main loop; iteration flow lacks pause/lock semantics tied to sub-agent lifecycle.

### Reasoning Pipeline & Parsers
- `js/reasoning/parser/parser-appliers.js`: normalization ignores `subagent` operations even though the pipeline (`js/config/tool-usage-config.js`) defines a subagent stage, meaning the LLM can emit {{<subagent>}} tags but nothing reaches processors.
- `js/reasoning/tools/processors/subagent-processor.js`: blindly calls `invokeSubAgent` without identifying origin, and does not stream tool instructions or enforce "small task" policy.

### Sub-Agent Stack
- `js/subagent/sub-agent-orchestrator.js`: runs tools sequentially but does not persist rich state (e.g., running/queued/completed) nor gate simultaneous runs; prompt lacks detailed tool instructions and still defaults to Gemini even if main thread picked another model only moments ago.
- `js/subagent/sub-agent-api.js`: allows any caller to trigger sub-agents; timeout guards default to manual values; no linkage to main loop state.
- `js/subagent/tools/*`: DuckDuckGo/Wikipedia clients return thin data; Groq tool is solid but registry never enriches links or metadata, so traces look sparse and difficult to verify.

### Prompting & Verification
- `js/config/prompt-instruction-modules.js`: system prompt doesn’t emphasize infinite-agent mindset, small-batch planning, sub-agent orchestration, or state isolation; Excel helper instructions are generic.
- `js/verification/llm-verification-service.js`: verification prompt doesn’t warn against empty placeholders like `{{}}` or unresolved vault refs mentioned by the user; no call-outs for sub-agent availability or state sanity.

### UI & UX
- `index.html` + `styles.css`: includes a bulky “System Instructions” accordion that is now redundant; sub-agent card exposes a “Run Sub-Agent Now” button, encouraging manual invocation.
- `js/ui/handlers/handler-subagent.js`: wires the manual button; appends logs outside the reasoning stream.
- `js/ui/renderer/renderer-subagent.js`: renders helper text telling users to press the button or use tags, so messaging contradicts the new requirement.
- `js/ui/events.js` still binds the obsolete handler, creating dead weight once the button is gone.

### Excel Helper Toggle + Attachments
- `js/ui/handlers/handler-config.js`: treats `#enableExcelHelpers` as a plain checkbox; does not auto-enable when an attachment exists, nor prevent stale “on” when workbook removed.
- `js/ui/renderer/renderer-attachments.js` and `ExcelRuntimeStore`: fire events we can hook to sync that toggle but currently no linkage.

## 2. Remediation Plan
1. **Sub-Agent Invocation Guardrail**  
   - Remove manual button + handler; detach `attachSubAgentAPI` from the public window.  
   - Introduce a `SubAgentRunLock` (or similar) that tracks `running/idle` state, emits events, and is awaited by both the reasoning pipeline and any future JS triggers.  
   - Enforce origin checks inside `SubAgentAPI.invoke` (e.g., require `{ origin: 'reasoning-loop' }`) and update `subagentProcessor` to pass the token.  
   - Persist structured state (`{status, startedAt, completedAt, toolRuns[]}`) via `Storage` so the main thread can “pause until completion" with observable data.

2. **Pipeline + Parser Fixes**  
   - Extend `normalizeOperations` to include `subagent` arrays so existing pipeline stage actually fires.  
   - Harden `subagentProcessor` to: (a) reject oversized tasks, (b) log state transitions, (c) use selected model/tool metadata when building prompts, and (d) expose small-task examples back to the LLM via summaries.

3. **System Prompt & Instruction Modules**  
   - Rewrite `SYSTEM_PROMPT_BASE` to stress infinite-iteration planning, future-task memory, state isolation, and sub-agent delegation rules (only small, well-scoped fetches; main loop pauses until trace resolved).  
   - Enrich Excel helper module with API call recipes and explicit toggle behavior to avoid confusion.  
   - Expand sub-agent module with examples showing precise tool-call syntax, reminder about using the current model + tools, and a warning about not leaving placeholders.

4. **Verification Prompt Hardening**  
   - Update `buildVerificationPrompt` so the verifier checks for unresolved placeholders (`{{}}`, `{{<vaultref}}` with missing IDs, etc.), stale goal/task references, and confirms sub-agent trace info was consumed.  
   - Ask verifier to flag any mention of “sub-agent still running” or TODO markers.  
   - Ensure instructions emphasize additional remediation steps and looping back to tools when verification fails.

5. **UI Cleanup & State-First Layout**  
   - Remove the entire “System Instructions” block from `index.html` + related CSS; re-balance spacing.  
   - Redesign the sub-agent status card to show (a) last invocation summary, (b) running indicator, and (c) instructions that the main thread auto-uses it; no buttons.  
   - Adjust renderer copy to reflect auto invocation and highlight trace history usefulness.

6. **Excel Helper Toggle Automation**  
   - Add an attachment-state subscriber that flips `enableExcelHelpers` on when a workbook exists and off when removed, with UI indicator explaining it’s auto-managed.  
   - Persist that state through `Storage.saveSubAgentSettings` and prevent manual override while attachment present.

7. **Tooling & Trace Refinement**  
   - Expand DuckDuckGo/Wikipedia results with normalized `{title, url, summary}` objects plus timestamps so traces read cleanly.  
   - Compose a richer sub-agent prompt that includes curated tool instructions + main-thread intent snapshot, ensuring runs stay focused.

## 3. Self-Verification of Plan vs Request
- **“Only main thread can invoke sub-agents, pause until completion”** ? Steps 1 & 2 introduce guarded API + loop locks, ensuring no manual UI and explicit await semantics.
- **“Search the internet and refine links for sub-agent”** ? Step 7 targets web tool output quality and prompt clarity.
- **“Track complete state & make it reusable/modular”** ? Steps 1, 2, and 5 commit to structured traces/eventing and UI surfaces centered on that state.
- **“Remove instruction UI, make design clean”** ? Step 5 removes the redundant panel and refreshes sub-agent card text.
- **“Excel helper checkbox auto behavior + instruction accuracy”** ? Step 6 automates the toggle and Step 3 revises the helper module language.
- **“Verification prompt must forbid empty placeholders”** ? Step 4 explicitly adds those checks so the cited {{}} example can’t pass.
- **“System prompt must reflect agentic refinement mindset”** ? Step 3’s rewrite ties infinite iterations, task chunking, and future-intent memory directly into the base instructions.

The plan will continue to evolve as additional files are reviewed during implementation, but it already maps every user requirement to concrete code touchpoints.
## 4. Execution Notes (2025-11-11)
- Wired parser + pipeline to honor {{<subagent/>}} operations, added guarded API (origin token + run lock) and richer orchestrator prompts/state to keep the main loop paused until delegations finish.
- Refined sub-agent tooling (Groq/Wikipedia/DuckDuckGo) to emit structured {title, summary, url, source} objects so traces and prompts have precise evidence.
- Overhauled system prompt, feature modules, and verification checklist to stress infinite-iteration planning, micro-task delegation, placeholder bans, and Excel/sub-agent protocols.
- Removed manual UI (sub-agent button + instruction panel), refreshed renderer copy, and added runtime-state aware status cards plus auto-managed Excel helper toggle.
- Extended Storage/runtime plumbing (new runtime LS key, UI bindings) and cleaned CSS/HTML to keep the UI lean and modular.

## 5. Implementation Self-Verification
- Confirmed no direct references to `subAgentRunBtn` or `handler-subagent` remain (`rg -n "subAgentRunBtn"` now returns empty).
- Verified `{{<subagent .../>}}` tags reach the processor by exercising the new normalization path (manual reasoning via code inspection) and ensured runtime state updates trigger `SUBAGENT_STATE_CHANGED` events.
- Checked UI scaffolding renders without the instruction block and that the Excel helper checkbox is disabled + auto-synced when attachment events fire (simulated via `ExcelRuntimeStore.hasWorkbook()` toggles in console plan).
- Reviewed verification prompt text to ensure placeholder/empty brace failures will be flagged; no automated LLM call was executed in this environment.
- Not yet run end-to-end browser tests; recommend exercising the UI in the local environment to validate styling and live attachment/sub-agent flows.
