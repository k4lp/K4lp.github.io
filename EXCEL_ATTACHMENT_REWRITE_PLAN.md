# Excel Attachment Tooling – Remediation & Enhancement Plan (2025‑11‑09)

_Scope:_ Deliver a production‑ready attachment subsystem that (1) exposes a rich, ergonomic worksheet API to the LLM/JS sandbox, (2) protects originals, (3) conditionally injects attachment instructions, and (4) documents operational safeguards so every reasoning turn honors context‑window limits.

---

## 1. Current Findings (repo scan)

| Concern | Evidence |
| --- | --- |
| Attachments API is minimal | `js/execution/execution-context-api.js` only surfaces `getOriginal/getWorkingCopy/updateSheet/resetWorkingCopy/getMutationLog`, forcing raw object traversal. |
| No helper toolkit | There is **no** module for selecting sheets, slicing ranges, or row‑safe iteration. |
| Working/original indistinguishable | `ExcelRuntimeStore` clones but exposes plain objects; nothing prevents callers from overwriting the “original” data or tracking diffs per sheet. |
| Instructions always injected | `SYSTEM_PROMPT` (app-config) now references `attachments.*` unconditionally; reasoning providers always render the attachments section even when none exist. |
| Excel safety guidance absent | No canonical doc warns about row limits, column counts, or context blowups. |
| User-facing logging insufficient | Attachment load/mutate logs exist, but there’s no per-operation trace or UI indicator for sheet diffs vs original. |

---

## 2. Goals

1. **Ergonomic Sheet API** – Provide helper methods (e.g., `attachments.selectSheet(name/index)`, `.getRowRange(opts)`, `.getRange(rangeSpec)`, `.setRange`, `.appendRows`, `.deleteRows`, `.summarize()`, etc.) enforceable via runtime store with char limits & bounds checks.
2. **Immutable Originals / Auditable Working Copy** – Guarantee the “original” snapshot is deep-frozen and never mutated; maintain diff metadata (changed cells, added rows) to compare working vs original quickly.
3. **Conditional Prompt Injection** – Only include attachment instructions and the attachments context section when `ExcelRuntimeStore.hasWorkbook()` is true.
4. **Persistent Instruction Set** – Extend SYSTEM_PROMPT with an “Excel Attachment Protocol” block describing row/column counting, subset retrieval, char limits, etc., ensuring every reasoning iteration receives it.
5. **Documentation & UI Guidance** – Provide inline UI docs/tooltips plus a markdown guide for the LLM/devs.
6. **Instrumentation & Tests** – Add logging hooks and regression checks (unit-style where possible) verifying the helper API and conditional prompts.

---

## 3. Implementation Roadmap (granular)

### Phase 0 – Baseline Audit & Cleanup
1. **Snapshot Current Behavior** (docs/logs) – capture current `ExcelRuntimeStore` schema & sample console logs for reference.
2. **Add TODO Markers** – annotate old simple APIs (e.g., `getWorkingCopy`) to deprecate once new helper is stable (without removing compatibility yet).

### Phase 1 – Data Layer Enhancements
1. **Runtime Schema Revision**  
   - `js/state/excel-runtime-store.js`  
   - Store sheets as `{ meta, cells }`, where each cell retains `{ value, originalValue, lastEditedAt }`.  
   - Track sheet-level metadata (rowCount, columnCount, colNames).  
   - Maintain `diffIndex` (map of `sheet -> { changedCells, addedRows, deletedRows }`).
2. **Binary Retention**  
   - Retain serialized original workbook buffer (ArrayBuffer) for export parity.  
   - Provide `getOriginalBuffer()` for download/export features.
3. **Event Payloads**  
   - When emitting `EXCEL_ATTACHMENT_*`, include summary `{ sheets, rowCount, diffCounts }`.

### Phase 2 – Attachment Helper Toolkit
1. **New Module:** `js/execution/apis/attachments-helper.js`  
   - Expose `createAttachmentsHelper(store)` returning methods:  
     - `selectSheet(identifier)` supporting name or index; returns helper object with sheet-scoped operations.  
     - `listSheets({ includeCounts })`.  
     - `sheet.getRowData({ rowIndex, startColumn=0, endColumn, charLimit=40 })`.  
     - `sheet.getRange({ startCell, endCell, charLimit=50 })` with automatic row/col bounding.  
     - `sheet.forEachRow({ limit, offset, charLimit, onRow })` to stream rows safely.  
     - Mutation helpers (`updateCell`, `updateRange`, `appendRow`, `deleteRow`, `replaceSheet`) that update diff metadata and mutation log.  
     - `sheet.summary()` returning rowCount, columnCount, headers, diff stats.  
   - Enforce char limits inside helpers; throw descriptive errors if user tries to pull huge ranges.
2. **Integrate Into Execution Context**  
   - Update `buildExecutionContext()` to inject `attachments.helper` alongside legacy primitives for back-compat.  
   - Provide small wrappers for common tasks (`attachments.ensureWorkbook()` -> throws if none).  

### Phase 3 – Conditional Prompt & Documentation
1. **SYSTEM_PROMPT Update** (`js/config/app-config.js`)  
   - Add `### Excel Attachment Protocol` block:  
     - Verify workbook presence before referencing it.  
     - Always check `sheet.summary()` before dumping data.  
     - Use helper methods for limited ranges; never print entire sheets; default char limit = 50.  
     - Outline CRUD flow (read -> plan -> mutate -> verify -> log).  
   - Ensure this block is appended **every iteration** (since SYSTEM_PROMPT already surfaces each cycle).
2. **Reasoning Context Provider**  
   - Modify `attachments-provider.js` to short-circuit (return minimal text) if `!hasWorkbook`.  
   - Include diff summary + instructions pointer when workbook exists.
3. **UI Tooltips & Docs**  
   - Add inline tooltip near attachment panel linking to new doc (`docs/attachments-guide.md`).  
   - Document helper APIs, char limit defaults, best practices.

### Phase 4 – UI & UX Upgrades
1. **Diff Visualization** – In `renderer-attachments.js`, show changed rows/cells counts, “reset to original” per sheet.  
2. **Manual Helper Console** – Provide quick commands in the UI so users can preview ranges (makes verification easier).

### Phase 5 – Instrumentation & Logging
1. **Console Hooks** – Extend runtime store logging to include helper method usage (sheet, rows retrieved, char limit used).  
2. **Analytics** – Append entries to `Storage.appendToolActivity` for attachment operations (sheet reads/writes).  
3. **Error Surface** – When helper throws (e.g., user requests >allowed rows), propagate descriptive errors into reasoning log.

### Phase 6 – Tests & Verification
1. **Unit-esque Harness** – Add `js/examples/attachment-helper-tests.js` to simulate store + helper operations (row slicing, range bounding, diff updates).  
2. **Manual QA Script** – Document manual flow: upload workbook, call helper methods via console, verify diff tracking, confirm instructions appear only when workbook loaded.  
3. **Regression Checklist** – Include steps ensuring original data remains untouched (checksum comparison).

### Phase 7 – Deprecation & Cleanup
1. **Update Legacy Calls** – Search for direct `attachments.getWorkingCopy()` usage inside `js/` and refactor to helper methods (where practical).  
2. **Remove Dead Code** – Once helper adoption is complete, strip redundant utilities or mark as deprecated with warnings.

---

## 4. Deliverables & Files to Touch
- `js/state/excel-runtime-store.js` (major overhaul)  
- `js/execution/apis/attachments-helper.js` (new)  
- `js/execution/execution-context-api.js` (inject helper)  
- `js/config/app-config.js` & `docs/attachments-guide.md` (instructions)  
- `js/reasoning/context/providers/attachments-provider.js` (conditional summary)  
- `js/ui/renderer/renderer-attachments.js` & related styles (diff UI)  
- `js/utils/*` if new parsing/export helpers required  
- `js/examples/attachment-helper-tests.js` (manual tests)

---

## 5. Timeline & Phasing
1. **Phase 1–2 (Core data + helper)** – highest priority; unblock functionality.  
2. **Phase 3 (Prompt/docs)** – immediately after helper to ensure LLM guidance.  
3. **Phase 4–5 (UX/logging)** – once helper verified.  
4. **Phase 6 (Testing)** – finalize before wide use.  
5. **Phase 7 (Cleanup)** – ongoing after adoption.

---

## 6. Risks & Mitigations
- **Context blowups** – mitigated by char limits baked into helper methods + prompt instructions.  
- **Original data corruption** – solved by immutable snapshots + diff tracking.  
- **LLM forgetting instructions** – instructions become part of SYSTEM_PROMPT + conditional context.  
- **Developer confusion** – address via `docs/attachments-guide.md` and inline tooltips.

This plan should be reviewed/approved before implementation. Once signed off, each phase can be tracked via ACTIONS/PROGRESS logs with commits per milestone.
