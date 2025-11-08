# Excel Attachment Feature – Consolidated & Code-Aware Delivery Plan

_Inputs reviewed:_
- `EXCEL_ATTACHMENT_PLAN.md` (repo-level blueprint created 2025‑11‑08)
- `EXCEL_ATTACHMENT_IMPLEMENTATION_PLAN.md` (UI-heavy plan built around Vault artifacts)
- Current code base (`index.html`, `styles.css`, `js/main.js`, `js/ui/*`, `js/storage/storage.js`, `js/execution/*`, `js/core/event-bus.js`, `js/config/*`, etc.)
- Guardrail scan artifacts (safe-mode strategy, 15 s execution timeout, retry/error-classifier rules).

This document reconciles both planning files with the actual code structure to produce an actionable, gap-free roadmap. Sections below highlight required changes, concrete file touchpoints, and guardrails we must respect (timeout limits, safe-mode filters, storage constraints).

---

## 1. Design Principles Anchored in Existing Code

1. **Single Upload Surface, Repo-Compatible UI Stack**  
   - Renderer is coordinated via `js/ui/renderer/renderer-core.js` and events bound in `js/ui/events.js`. New UI must plug into this pattern (not raw DOM manipulation inside `main.js`).

2. **Deterministic Storage / Snapshotting**  
   - LocalStorage helpers live in `js/storage/storage.js`; retries restore execution state through `js/execution/context/execution-context-manager.js`. Attachment data must integrate with these layers so retries can roll back working copies.

3. **Guardrail Compliance**  
   - `js/execution/strategies/safe-mode-execution-strategy.js` blocks dangerous patterns; `js/execution/execution-runner.js` enforces `EXECUTION_DEFAULT_TIMEOUT_MS` (15 s). Attachment APIs must avoid long-running `fetch` chains and `eval`-like constructs.

4. **Reasoning Context + Prompt Updates**  
   - Prompt sections are declared in `js/config/reasoning-config.js`; providers register through `js/reasoning/context/providers/index.js`. Attachment status must flow through this channel so the LLM “sees” workbook metadata every iteration.

---

## 2. Reconciled Architecture (Blending Both Plans)

| Concern | Previous Gap | Consolidated Approach |
| --- | --- | --- |
| **Data Persistence** | Plan B wrote directly to Vault entries; Plan A proposed a new storage key but didn’t reference Vault interplay. | Introduce `LS_KEYS.EXCEL_ATTACHMENT` for canonical state _plus_ optional Vault snapshots (so reasoning can cite them). Storage helper manages immutable original + mutable working copy; Vault entries are derived artifacts, not the source of truth. |
| **Service Layer** | Plan B scattered parsing across handler + utils; Plan A called for a centralized service but didn’t describe DI. | Create `js/data/excel/excel-attachment-service.js`, registered via `js/core/service-container.js` and re-exported by `js/execution/services.js`, enabling reuse by UI handlers and execution context builder. |
| **UI Integration** | Plan B injected HTML manually and referenced `/home/user/...`; Plan A lacked renderer wiring. | Add a new config section in `index.html`, render content through `js/ui/renderer/renderer-attachments.js`, and bind interactions via `js/ui/handlers/handler-attachments.js`, registered in `bindEvents()` alongside existing handlers. |
| **Execution Access** | Neither plan described how executed code actually receives workbook data. | Extend `buildExecutionContext()` to expose `attachments.*` helpers wrapping the service. ExecutionContextManager snapshots include working-copy state so retry logic preserves invariants. |
| **Reasoning Awareness** | Plan B proposed memory entries; Plan A added context provider but not prompt text. | Implement a dedicated context provider + prompt section and keep memory entries optional. |
| **Guardrail Awareness** | Plan A documented timeouts/safe-mode but didn’t wire mitigations; Plan B ignored them. | Make attachment API synchronous (no internal `fetch`), chunk parsing to stay within 15 s, and ensure safe-mode patterns (no inline `eval`) aren’t triggered. |

---

## 3. Step-by-Step Implementation (File-Scoped)

### 3.1 Storage & Serialization
1. `js/config/storage-config.js`  
   - Add `EXCEL_ATTACHMENT: 'gdrs_excel_attachment'`.  
   - Re-export via `js/core/constants.js` so legacy imports pick it up.

2. `js/storage/storage.js`  
   - Implement helpers: `loadExcelAttachment()`, `saveExcelAttachment(payload)`, `clearExcelAttachment()`, `updateExcelAttachment(mutator)`.  
   - Normalize structure:  
     ```js
     {
       metadata: { id, name, sizeBytes, importedAt, sheetNames, sheetCount },
       original: { blobBase64, checksum, sheetSummaries },
       working: { version, sheets, lastMutationAt, mutationLog: [] }
     }
     ```  
   - Emit `Events.EXCEL_ATTACHMENT_IMPORTED/UPDATED/RESET/REMOVED` after each mutation (requires event additions below).  
   - Optional Vault sync: add helper that mirrors original + working copies into vault entries (`excel_original_{id}`, `excel_working_{id}`) when user toggles “publish to vault”. This keeps Plan B’s reasoning references while Plan A’s Storage key remains canonical.

3. `js/core/utils.js`  
   - Add `deepFreeze`, `deepClone`, and `bufferToBase64` utilities (reused by service + execution context). Ensure they are tree-shake friendly.

### 3.2 Event Bus Extensions
4. `js/core/event-bus.js`  
   - Extend `Events` with the four attachment-related constants.  
   - Ensure `RendererCore.bindEventListeners()` listens for `Events.EXCEL_ATTACHMENT_UPDATED` to trigger attachment re-render (see §3.4).

### 3.3 Excel Attachment Service
5. `js/data/excel/excel-attachment-service.js` (new)  
   - Dependencies: SheetJS (`XLSX`), `Storage`, new utils.  
   - Public API:  
     - `importFile(file)` → parses to normalized JSON, computes checksums, persists via `Storage.saveExcelAttachment`.  
     - `getState()` → returns hydrated state with lazy parsing of base64.  
     - `getWorkingCopy()` / `getOriginal()` (`deepFreeze`).  
     - `mutateSheet(sheetName, mutator)` (records diff metadata + version bump).  
     - `resetWorkingCopy()`, `removeAttachment()`.  
     - `exportOriginal()` / `exportWorking()` returning Blob for download.  
   - Guard against 15 s timeout by chunking parsing (yielding control with `await Promise.resolve()` between sheets if workbook > N rows).  
   - Track `mutationLog` entries (sheet, op, ts, actor) for reasoning context.

6. Vendor library  
   - Add `vendor/xlsx.full.min.js` (MIT) or pin CDN in `index.html` `<head>` before bundle scripts. Document size impact in README.

7. Dependency registration  
   - If using DI pattern, register the service in `js/core/service-container.js` and expose getters in `js/execution/services.js` to keep parity with existing execution subsystems.

### 3.4 UI / UX
8. `index.html` + `styles.css`  
   - Insert a new `.config-section` (“DATA ATTACHMENT”) under the left panel. Provide drag/drop zone, file input, status pill, quick stats, and action buttons (download original, download working, reset, remove).  
   - Keep markup minimal; actual sheet preview rendered dynamically.

9. `js/ui/renderer/renderer-attachments.js` (new)  
   - Functions: `renderAttachmentPanel()` and `renderSheetPreview()` reading from `Storage.loadExcelAttachment()`.  
   - Called from `RendererCore.renderAll()` and on `Events.EXCEL_ATTACHMENT_UPDATED`.  
   - Show: workbook name, size, sheet count, last mutation, diff badges per sheet (if `mutationLog` indicates pending changes).

10. `js/ui/handlers/handler-attachments.js` (new)  
    - Bind dropzone + file input change events, hooking into service methods.  
    - Provide action button handlers (download/reset/remove).  
    - Register inside `bindEvents()` (import and call alongside other handlers).

11. `js/ui/events.js` & `js/main.js`  
    - Ensure new handler is imported and invoked. No other bootstrap changes needed beyond optional toast notifications.

### 3.5 Execution Context & Guardrails
12. `js/execution/execution-context-api.js`  
    - Inject `attachments` namespace referencing the service:  
      ```js
      attachments: {
        hasWorkbook: () => Boolean(state),
        getMetadata: () => ({ ...state.metadata }),
        getOriginal: () => deepFreeze(state.originalParsed),
        getWorkingCopy: () => deepClone(state.working.sheets),
        updateSheet: (sheet, mutator) => ExcelAttachmentService.mutateSheet(sheet, mutator),
        resetWorkingCopy: () => ExcelAttachmentService.resetWorkingCopy(),
        exportSheetToCSV: (sheet) => ExcelAttachmentService.exportSheetToCSV(sheet)
      }
      ```  
    - Throw descriptive errors if no attachment is loaded to help reasoning loop.

13. `js/execution/context/execution-context-manager.js`  
    - Extend `createSnapshot()` to capture current working copy (`Storage.loadExcelAttachment()?.working`).  
    - `restoreSnapshot()` should reinstate working copy when retries occur (mirrors existing Vault/Memory restoration).  
    - `cleanContext()` stays the same; attachment resets happen via the snapshot.

14. `js/execution/execution-runner.js`  
    - No structural change beyond ensuring `buildExecutionContext()` includes attachments (already handled).  
    - Optionally, log pre/post attachment version numbers in the result’s `analysis` block for diff reporting.

15. `js/execution/error-handling/error-classifier.js` + `error-context-cleaner.js`  
    - Add `ATTACHMENT_ERROR` classification (e.g., when `mutateSheet` throws). Mark `retryable: true`, `cleanContext: false`.  
    - Cleaner can optionally reset working copy to last good state for this classification if snapshot restore fails.

### 3.6 Reasoning & Prompt Integration
16. `js/reasoning/context/providers/attachments-provider.js` (new)  
    - Summarize workbook metadata, outstanding mutations, and available helper methods.  
    - Register in `providers/index.js` and add to `defaultContextProviderRegistry` order (before Vault summary so attachments appear near storage info).

17. `js/config/reasoning-config.js`  
    - Insert new section definition:  
      ```js
      {
        id: 'attachments',
        providerId: 'attachments',
        heading: '**Data Attachment:**',
        fallback: 'No workbook attached.',
        includeWhenEmpty: true
      }
      ```

18. `js/config/app-config.js` (`SYSTEM_PROMPT`)  
    - Augment “Operating Guarantees” to mention `attachments.*` APIs and remind the LLM that originals are immutable while working copy is mutable.  
    - Mention 15 s timeout so reasoning steps limit long-running data transforms.

### 3.7 Observability & Tooling
19. `Storage.appendToolActivity()`  
    - Log attachment imports/resets/updates with metadata (sheet counts, mutation counts).  
    - Enables audit trail and future analytics.

20. Optional: `js/ui/renderer/renderer-output.js` or dedicated panel can list the most recent attachment operations for the user.

### 3.8 Testing & Docs
21. Manual QA script (add to `docs/attachments.md` or README section):  
    - Upload sample workbook (<1 MB).  
    - Verify UI stats + preview.  
    - Run JS execution snippet that reads and mutates sheet; confirm version increments and diff badges update.  
    - Trigger reset and removal flows.

22. `gm.md` / release notes  
    - Document new capability, guardrails (localStorage limits, 5 MB recommended max), and usage hints.

---

## 4. Guardrail Considerations (per Environment Scan)

1. **Timeouts**: Execution runner aborts after 15 s (`js/execution/execution-runner.js:20`). Keep attachment API synchronous and avoid large re-serializations inside execution code; encourage chunked processing (documented in prompt).  
2. **Safe-Mode Filters**: `safe-mode-execution-strategy.js` blocks `eval`, `Function`, DOM writes. Attachment APIs must not rely on such constructs.  
3. **Network Restrictions**: Guardrail audit confirmed `fetch` is unrestricted but network failures are retried. Attachment flow should not depend on network access; all parsing stays client-side.  
4. **Storage Limits**: LocalStorage (~5 MB) is shared with Vault/Memories. Plan includes file-size validation in handler (reject files > size threshold and prompt user to pre-trim).  
5. **Retry Semantics**: Execution retries should restore working copy from snapshot to avoid partial edits being double-applied.

---

## 5. Delivery Phasing (Recommended)
1. **Phase A – Persistence Backbone**: storage key, utils, event constants, attachment service skeleton, vendor import.  
2. **Phase B – UI/UX**: HTML, styles, renderer + handler, event wiring, file validation.  
3. **Phase C – Execution & Reasoning Integration**: context API, snapshot extensions, provider + prompt updates.  
4. **Phase D – Observability & Docs**: activity logging, README/docs, manual QA checklist.  
5. **Phase E – Optional Vault Publishing**: toggle to mirror attachments into Vault for historical reference.

Each phase should conclude with manual verification (upload, mutate, reset) before layering the next.

---

## 6. Success Criteria Checklist
- UI clearly shows attachment status, sheet previews, and diff badges.  
- Original copy is immutable (verified via checksum comparisons); working copy persists across reasoning iterations.  
- `attachments.*` API available to JS execution and behaves deterministically with retries.  
- Reasoning prompt includes attachment summary and LLM instructions for safe use.  
- Activity log captures import/update/reset events.  
- All flows operate within guardrails (no safe-mode trip, no timeout due to attachment overhead).

Once all boxes are checked, the agent can autonomously read/modify the uploaded Excel data while preserving traceability and safety.
