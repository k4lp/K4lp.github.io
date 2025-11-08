# Excel Attachment Feature – Detailed Implementation Blueprint

_Status: Planning document generated 2025‑11‑08 from repo `c:\Users\kalp\Downloads\K4lp.github.io`._

This plan lays out every modification required to support uploading an Excel workbook, persisting an immutable “original” copy, exposing a mutable working copy inside the JS execution sandbox, and wiring the reasoning engine/UI so the agent can read/write spreadsheet data autonomously.

---

## 1. Architectural Baseline & Constraints (Scan Summary)

| Area | Current State (files) | Implications |
| ---- | --------------------- | ------------ |
| UI | `index.html`, `styles.css`, `js/ui/renderer/*`, `js/ui/handlers/*` | No file input controls exist (`rg` confirmed). Need new panel (left column) plus renderer pipeline with event-driven refresh. |
| Storage | `js/config/storage-config.js`, `js/storage/storage.js` | LocalStorage-backed, event bus notifications sent via `Storage.appendExecutionResult`, etc. Requires new `LS_KEYS.EXCEL_ATTACHMENTS` and serialization helpers. |
| Execution APIs | `js/execution/execution-context-api.js`, `js/execution/apis/*`, `execution-context-manager.js` | Provides `vault/memory/tasks/goals/utils`. Must inject `attachments` namespace and ensure snapshots roll back working copy during retries. |
| Execution Flow | `js/execution/execution-runner.js`, `execution-manager.js`, `strategies/*` | Runner wraps code in async IIFE; context builder is invoked per run. Need deterministic access to attachment data and context cleanup. |
| Reasoning Context | `js/config/app-config.js`, `js/reasoning/context/providers/*`, `REASONING_CONTEXT_SECTIONS` | No attachment provider; system prompt doesn’t mention data attachments. Need new provider & section. |
| Eventing | `js/core/event-bus.js`, `Events` enum | Lacks attachment-specific events; add for upload/update/reset. |
| Dependencies | No XLSX parser in repo. | Need to ship SheetJS (MIT) or lightweight parser in `vendor/` and lazy-load before parsing. |

---

## 2. Feature Goals (per requirement)
1. Allow user to attach an Excel/CSV file via UI.
2. Persist both immutable original copy and mutable working copy.
3. Expose attachment data inside JS execution (LLM code) via well-documented API.
4. Track mutations (per sheet) and make them available to reasoning context/logs.
5. Support download/export/reset of working copy; ensure retries roll back partial edits.
6. Maintain UX transparency (status pill, preview, instructions).

---

## 3. Implementation Plan (Granular Steps)

### 3.1 Storage & Config Foundations
1. **Extend storage keys**  
   - File: `js/config/storage-config.js` (~L11).  
   - Add `EXCEL_ATTACHMENTS: 'gdrs_excel_attachments'`.  
   - Update re-export list in `js/core/constants.js` to include the new key (so legacy imports work).

2. **Storage helpers**  
   - File: `js/storage/storage.js`.  
   - Add serialization helpers:
     - `loadExcelAttachments()` – parse JSON, default to `{}` (no workbook).  
     - `saveExcelAttachments(payload)` – persist normalized structure.  
     - `clearExcelAttachments()`, `updateExcelWorkingCopy(mutatorFn)` for atomic changes.  
   - Each mutator should call `eventBus.emit(Events.EXCEL_ATTACHMENT_UPDATED, payload)` to notify UI/reasoning.  
   - Normalize structure:  
     ```js
     {
       metadata: { id, name, sizeBytes, importedAt, sheetCount, sourceType },
       original: { type: 'base64', data: '...' },      // immutable snapshot
       working: { version: 1, sheets: { Sheet1: {...} } },
       stats: { lastMutationAt, mutationHistory: [] }
     }
     ```

3. **Deep-freeze helper**  
   - File: `js/core/utils.js`.  
   - Add `deepFreeze(obj)` utility used when exposing original copy to execution context.

### 3.2 Excel Attachment Service Layer
4. **New folder & service**  
   - File: `js/data/excel/excel-attachment-service.js` (new). Responsibilities:  
     - `importWorkbook(file)` – handles FileReader, converts to ArrayBuffer, feeds parser.  
     - `parseWorkbook(arrayBuffer, sourceName)` – uses SheetJS to return normalized JSON.  
     - `serializeOriginal(arrayBuffer)` – base64 encode using helper from `js/core/utils`.  
     - `createWorkingCopy(parsed)` – deep clone JSON for mutation.  
     - `applySheetPatch(workingCopy, sheetName, mutator)` – used by execution APIs and UI resets.  
     - Expose `downloadOriginal()`, `downloadWorking()` wrappers to trigger file save (use existing blob download helper if available or add `downloadBlob` util).

5. **Vendor XLSX parser**  
   - Add `vendor/xlsx.full.min.js` (ES module build).  
   - Update `index.html` `<head>` to load it before app scripts (defer). Ensure license header kept.  
   - Alternatively, bundle via dynamic import: `const XLSX = await import('../vendor/xlsx.mjs');`.

6. **Service registration**  
   - File: `js/core/service-container.js` (check for existing pattern) and `js/execution/services.js`.  
   - Register singleton `excelAttachmentService` for DI; expose via `getExecutionServices()` so execution runner and UI handlers share logic.

### 3.3 Event Bus Extensions
7. **Define new events**  
   - File: `js/core/event-bus.js`.  
   - Add `EXCEL_ATTACHMENT_IMPORTED`, `EXCEL_ATTACHMENT_UPDATED`, `EXCEL_ATTACHMENT_RESET`, `EXCEL_ATTACHMENT_REMOVED`.  
   - Document them in comment block for discoverability.

### 3.4 UI & UX Changes
8. **HTML structure**  
   - File: `index.html`.  
   - Left column (`<section class="left-panel">`) add new `config-section` block titled “DATA ATTACHMENT”.  
   - Include:
     - Drag-drop area with `#attachmentDropzone`.  
     - Hidden `<input type="file" id="excelAttachmentInput" accept=".xlsx,.xls,.csv">`.  
     - Status pill `#attachmentStatusPill`.  
     - Action buttons: `Upload/Replace`, `Download Original`, `Download Working`, `Reset Working`, `Remove`.  
     - Sheet preview container `#attachmentSheetPreview`.

9. **Styles**  
   - File: `styles.css`.  
   - Add classes for dropzone, preview table, disabled button states, mutation indicator, etc.  
   - Ensure responsive behavior for narrow widths.

10. **UI handler**  
    - New file: `js/ui/handlers/handler-attachments.js`.  
    - Responsibilities:  
      - Bind drag/drop + file input events.  
      - Call service `importWorkbook` → `Storage.saveExcelAttachments`.  
      - Listen to `Events.EXCEL_ATTACHMENT_*` to trigger re-render.  
      - Wire action buttons to service functions (download/reset/remove).  
    - Register handler in `js/core/boot.js` (where other handlers are initialized).

11. **Renderer additions**  
    - New file: `js/ui/renderer/renderer-attachments.js`.  
    - Provide `renderAttachmentPanel(container, attachmentState)` returning DOM markup.  
    - Use in `js/ui/renderer/renderer-core.js` (where other sections render) by injecting into left panel slot.  
    - Display preview: first N rows per sheet, highlight mutated sheets (compare working vs original using diff metadata stored in `stats`).

12. **UI events hookup**  
    - Ensure `js/ui/events.js` exports helper to dispatch `UI_REFRESH_REQUEST` when attachments change; tie into `handler-global` if needed.

### 3.5 Execution Context Integration
13. **Context builder injection**  
    - File: `js/execution/execution-context-api.js`.  
    - Import `Storage.loadExcelAttachments` and `deepFreeze`.  
    - Extend returned object with:
      ```js
      attachments: {
        hasWorkbook: () => Boolean(state),
        getMetadata: () => ({ ... }),
        getOriginal: () => deepFreeze(clone(state.originalParsed)),
        getWorkingCopy: () => clone(state.working.sheets),
        updateSheet: (sheet, updater) => attachmentService.applySheetPatch(...),
        resetWorkingCopy: () => attachmentService.resetWorkingCopy(),
        toCSV: (sheet) => attachmentService.exportSheetToCsv(sheet)
      }
      ```
    - Ensure functions log descriptive errors if no workbook loaded.

14. **Execution context manager snapshots**  
    - File: `js/execution/context/execution-context-manager.js`.  
    - When `createSnapshot()` is called, persist current attachment working state (maybe via new helper `Storage.loadExcelAttachments().working`).  
    - `restoreSnapshot()` should revert working copy to snapshot when retries occur.  
    - `disposeContext()` should not clear global attachment state (persist across runs); only revert temporary snapshot map.

15. **Runner instrumentation**  
    - File: `js/execution/execution-runner.js`.  
    - After `buildExecutionContext()`, ensure attachments API is available before executing user code.  
    - If `attachments.updateSheet` triggers errors, propagate to result (maybe wrap with try/catch to attach metadata).

16. **Result metadata**  
    - File: `js/execution/results/execution-result-handler.js` or `Storage.appendExecutionResult`.  
    - Append `attachmentDelta` object summarizing mutated sheets (service can expose `getPendingMutations()` cleared after logging).  
    - `JSExecutor._recordReasoningLog()` should include the delta when present.

### 3.6 Reasoning Engine Integration
17. **Context provider**  
    - New file: `js/reasoning/context/providers/attachments-provider.js`.  
    - Provide summary: workbook name, sheet list, record counts, last mutation timestamp, outstanding diffs.  
    - Register in `providers/index.js` and add to `defaultContextProviderRegistry`.

18. **Prompt section**  
    - File: `js/config/reasoning-config.js`.  
    - Insert new entry in `REASONING_CONTEXT_SECTIONS` e.g. `{ id: 'attachments', providerId: 'attachments', heading: '**Data Attachment:**', fallback: 'No workbook attached.' }`.  
    - Update `SYSTEM_PROMPT` (in `app-config.js`) to mention `attachments.*` APIs within the “Operating Guarantees” / “Tooling Protocol” portion so the LLM knows to leverage them.

19. **Reasoning services**  
    - File: `js/reasoning/services.js` (if it collates data).  
    - Expose `attachmentsService` or at least provide `Storage.loadExcelAttachments()` helper for prompts.

### 3.7 Observability & Controls
20. **Activity log**  
    - File: `Storage.appendToolActivity`.  
    - Whenever attachments change, append entry (`type: 'attachment'`, `action: 'import/update/reset'`, include sheet counts/reference).  
    - Emitted in handler/service functions.

21. **Error classification**  
    - File: `js/execution/error-handling/error-classifier.js`.  
    - Add rule for attachment errors (e.g., `AttachmentError`, message containing `attachment:`). Set `requiresReasoning: true`, `cleanContext: false`.

22. **Retry context cleaning**  
    - File: `js/execution/error-handling/error-context-cleaner.js`.  
    - Ensure `clean()` doesn’t wipe attachments inadvertently; optionally add branch for `ATTACHMENT_ERROR` to restore snapshot via service.

### 3.8 Export/Download Utilities
23. **Download helper**  
    - File: `js/utils/download.js` (create if absent). Provide `downloadBlob(buffer, filename, mime)`.  
    - Service uses it for export buttons.

24. **CSV fallback**  
    - In service, allow `exportSheetToCsv(sheetName)` so executed code or UI can quickly fetch data without XLSX dependency.

### 3.9 Documentation & DX
25. **Developer docs**  
    - Update `README.md` or create `docs/attachments.md` summarizing API usage, storage format, size limits, and manual testing instructions.

26. **System prompt note**  
    - After editing `SYSTEM_PROMPT`, mention new instructions in `gm.md` or release notes.

### 3.10 Testing & Verification
27. **Manual flow checklist**  
    - Document in `docs/attachments.md`: upload sample workbook → confirm status pill → run JS snippet (reads/writes) → verify reasoning context picks up summary → download working copy matches edits → reset to original.

28. **Automated smoke tests**  
    - If test harness exists (none observed), add `js/examples/test-attachments.js` for quick sanity (simulate service operations).  
    - Optionally add `npm` script hooking to headless browser tests (future).

29. **Performance considerations**  
    - Enforce max file size (e.g., 5 MB) inside handler; show toast if exceeded.  
    - When storing to localStorage (5 MB limit), compress JSON (maybe optional). Document this constraint; consider streaming attachments to IndexedDB later if needed.

---

## 4. Dependencies & Open Questions
- **SheetJS license**: MIT, allowed. Need to include LICENSE snippet in `vendor/`.
- **Storage limits**: LocalStorage (~5 MB). Evaluate binary base64 overhead; may need to warn user of size limit. (Maybe degrade to CSV ingestion for >5 MB.)
- **Security**: Ensure we don’t eval workbook contents. All parsing stays client-side. Provide guard rails to prevent formula execution (SheetJS by default doesn’t evaluate formulas).
- **Multiple attachments**: Scope states “an Excel file” (single). Plan assumes one active attachment; future enhancements can store `attachments[]`.

---

## 5. Rollout Phases
1. **Phase 1 – Storage/Service**: implement keys, storage helpers, attachment service, vendor import. (Files: `storage-config.js`, `storage.js`, `core/utils.js`, `vendor/`, new service.)
2. **Phase 2 – UI**: build panel, handler, renderer updates, styling, events.
3. **Phase 3 – Execution Context**: inject APIs, snapshot integration, result metadata.
4. **Phase 4 – Reasoning & Prompt**: new provider, config updates, docs.
5. **Phase 5 – Observability/QA**: activity logs, exports, manual test checklist.

Each phase should be committed separately for easier review.

---

## 6. Success Criteria
- Uploading `.xlsx` populates UI panel with workbook metadata and sheet preview.
- `attachments.getWorkingCopy()` is accessible within JS execution; modifications persist and are reflected in UI + reasoning context.
- `attachments.resetWorkingCopy()` restores original data without re-uploading.
- Immutable original is downloadable and never mutated during execution (verified by comparing checksums).
- Reasoning prompt always lists workbook status so LLM can decide when to reference it.
- Activity log captures import/update/reset events for transparency.

Once these are met, the agent can “read/process everything on its own” using the stored Excel data.

