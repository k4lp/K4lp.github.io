# Excel Attachment Feature – Runtime-Only, No-Guardrail Implementation Plan

_Generated 2025‑11‑09 after reviewing:_
- `EXCEL_ATTACHMENT_PLAN.md`
- `EXCEL_ATTACHMENT_CONSOLIDATED_PLAN.md`
- Current code (`index.html`, `styles.css`, `js/main.js`, `js/core/boot.js`, `js/ui/events.js`, `js/ui/renderer/*`, `js/ui/handlers/*`, `js/execution/*`, `js/reasoning/*`, `js/core/event-bus.js`, `js/storage/storage.js`, etc.)

## 0. Constraints Enforced by This Plan
1. **No new behavioral guardrails** beyond a single **file-size limit** check performed at upload time.
2. **All workbook data stays in runtime memory** (a dedicated JS object), **never persisted to LocalStorage or Vault** unless the user explicitly exports it. This keeps the attachment state ephemeral but fully accessible to the LLM during the session.
3. **Immutable original** and **mutable working copy** still required, but both exist inside the in-memory store.
4. Plan must be **extremely granular**, covering every change down to the function level.

---

## 1. High-Level Architecture (Guardrail-Free)
```
User Upload
  ↓
handler-attachments.js (validates size only)
  ↓ (ArrayBuffer)
excel-runtime-store.js (new singleton JS object)
  ├─ originalSnapshot  (deep-frozen, never mutated)
  └─ workingState      (mutable clones per sheet)
      ↓
execution-context-api.js injects attachments API (reads/writes runtime store)
      ↓
reasoning provider + UI renderer consume runtime store snapshots
```

The runtime store will live in a new module (`js/state/excel-runtime-store.js`) that is imported wherever needed. Because the store is JS memory only, page refresh clears the attachment automatically.

---

## 2. Step-by-Step Implementation
Each step lists: **File**, **Action**, **Details**. Execute in order.

### 2.1 Runtime Store & Utilities

1. **File:** `js/state/excel-runtime-store.js` _(new)_  
   - Export a singleton object `ExcelRuntimeStore` with internal shape:
     ```js
     {
       metadata: null,
       original: null,        // deep-frozen parsed workbook
       working: null,         // mutable copy
       mutationLog: [],
       listeners: new Set()
     }
     ```
   - Methods:
     - `setWorkbook({ metadata, original, working })` – store snapshots, reset mutation log, notify listeners.
     - `clearWorkbook()` – null out everything, notify listeners.
     - `getMetadata()`, `getOriginal()`, `getWorkingCopy()` – getters returning clones/frozen data.
     - `mutateSheet(sheetName, mutatorFn)` – clones target sheet, runs mutator, updates working object, logs `{ sheetName, timestamp, description }`, notifies listeners.
     - `resetWorkingCopy()` – re-clone `original` into `working`, append log entry.
     - `subscribe(listener)` / `unsubscribe(listener)` – allow UI renderer to re-render when the store changes.
   - No LocalStorage access. All state is JS-only.

2. **File:** `js/utils/deep-utils.js` _(new)_  
   - Export helpers `deepClone(obj)`, `deepFreeze(obj)`, `arrayBufferToBase64(buffer)`.
   - Use structured cloning via `structuredClone` with fallback to JSON for environments lacking it.
   - These utilities will be shared by the runtime store, handler, and execution context builder.

### 2.2 XLSX Parsing Pipeline

3. **File:** `vendor/xlsx.full.min.js` _(new or CDN)_  
   - Add MIT-licensed SheetJS build to `/vendor`. Document checksum.
   - **File:** `index.html` – insert `<script src="vendor/xlsx.full.min.js"></script>` before `js/main.js` so `window.XLSX` is ready when handlers run.

4. **File:** `js/utils/excel-parser.js` _(new)_  
   - Export `parseWorkbook(arrayBuffer)` returning `{ metadata, sheets }`:
     - `metadata`: `{ name, sizeBytes, importedAt, sheetNames }` (size derived from file input, timestamp via `Date.toISOString()`).
     - `sheets`: `{ [sheetName]: { headers: [...], rows: [ {col:value} ] } }`.
   - Use `XLSX.read(new Uint8Array(buffer), { type: 'array' })`.
   - Ensure parsing remains synchronous to avoid execution guardrails; simply return data.

5. **File:** `js/utils/excel-exporter.js` _(new)_  
   - Functions for later buttons: `buildWorkbookBlob(sheetMap)` and `downloadWorkbook(blob, filename)` using SheetJS’s `XLSX.write`.
   - Even though storage is in-memory, these helpers let users download original/working copies.

### 2.3 UI: HTML & Styles

6. **File:** `index.html`  
   - Within the left column `<section class="left-panel">`, insert a new `config-section` after API Keys:
     ```html
     <div class="config-section" id="attachmentSection">
       <div class="section-header">
         <h2>DATA ATTACHMENT</h2>
         <span class="section-desc">Upload Excel/CSV (kept in memory only)</span>
       </div>
       <div class="attachment-dropzone" id="attachmentDropzone">
         <p>Drop .xlsx/.xls/.csv here or click to select</p>
         <input type="file" id="attachmentInput" accept=".xlsx,.xls,.csv" hidden>
       </div>
       <div class="attachment-status" id="attachmentStatus"></div>
       <div class="attachment-actions">
         <button id="attachmentDownloadOriginal">Download Original</button>
         <button id="attachmentDownloadWorking">Download Working</button>
         <button id="attachmentReset">Reset Working Copy</button>
         <button id="attachmentRemove" class="danger">Remove</button>
       </div>
       <div id="attachmentPreview"></div>
     </div>
     ```
   - Buttons should be disabled until a workbook is loaded.

7. **File:** `styles.css`  
   - Add styles for `.attachment-dropzone` (bordered box, hover highlight), `.attachment-status`, `.attachment-actions button`, `.attachment-preview-table`, `.attachment-badge` for mutated sheets indicators.
   - Ensure layout matches existing theme (Geist fonts, color palette).

### 2.4 UI Logic (Renderer + Handlers)

8. **File:** `js/ui/renderer/renderer-attachments.js` _(new)_  
   - Export `renderAttachmentPanel()`:
     - Pull state from `ExcelRuntimeStore.getMetadata()` / `.getWorkingCopy()`.
     - Update DOM nodes: status text, action button enabled states, preview tables (first N rows per sheet), mutation badges pulling from `mutationLog`.
     - Subscribe to runtime store updates: `ExcelRuntimeStore.subscribe(renderAttachmentPanel)` so UI updates automatically.
   - Called once during `RendererCore.renderAll()` after other sections.

9. **File:** `js/ui/renderer/renderer-core.js`  
   - Import `renderAttachmentPanel` and invoke it inside `renderAll()`.  
   - In `bindEventListeners()`, also listen for a custom event `Events.EXCEL_ATTACHMENT_UPDATED` emitted by the handler (described below) to force re-render when needed.

10. **File:** `js/ui/handlers/handler-attachments.js` _(new)_  
    - Responsibilities:
      1. Attach drag/drop + click handlers to `#attachmentDropzone` and hidden input.
      2. On file selection:
         - Enforce ONLY file-size limit (e.g., 8 MB) by checking `file.size`; reject larger files with a toast/alert. Do **not** add any other guardrails.
         - Read file via `FileReader.readAsArrayBuffer` (async). Onload => pass buffer to `parseWorkbook`.
         - Build `originalSnapshot = deepFreeze(parsed.sheets)` and `workingSnapshot = deepClone(parsed.sheets)`.
         - Call `ExcelRuntimeStore.setWorkbook({ metadata, original: originalSnapshot, working: workingSnapshot })`.
         - Emit `eventBus.emit(Events.EXCEL_ATTACHMENT_IMPORTED, metadata)`.
      3. Wire buttons:
         - Download Original → use `excel-exporter.js` to write `ExcelRuntimeStore.getOriginal()` to file.
         - Download Working → same but with `getWorkingCopy()`.
         - Reset → call `ExcelRuntimeStore.resetWorkingCopy()` and emit `Events.EXCEL_ATTACHMENT_RESET`.
         - Remove → call `ExcelRuntimeStore.clearWorkbook()` + emit `Events.EXCEL_ATTACHMENT_REMOVED`.
      4. Prevent default browser behavior on drag/drop.
    - Import and invoke from `js/ui/events.js` (see next step).

11. **File:** `js/ui/events.js`  
    - Import `bindAttachmentHandlers` from the new handler module.
    - Inside `bindEvents()`, after storage/config handlers, call `bindAttachmentHandlers()`. This ensures dropzone is ready once DOM loads.

12. **File:** `js/core/event-bus.js`  
    - Augment `Events` enum with: `EXCEL_ATTACHMENT_IMPORTED`, `EXCEL_ATTACHMENT_UPDATED`, `EXCEL_ATTACHMENT_RESET`, `EXCEL_ATTACHMENT_REMOVED`.  
    - `handler-attachments.js` triggers `EXCEL_ATTACHMENT_UPDATED` after every runtime store mutation (including `mutateSheet` described later).

### 2.5 Execution Context Wiring

13. **File:** `js/execution/execution-context-api.js`  
    - Import `ExcelRuntimeStore`, `deepFreeze`, `deepClone`.
    - In `buildExecutionContext()`, extend the returned object with:
      ```js
      attachments: {
        hasWorkbook: () => ExcelRuntimeStore.getMetadata() !== null,
        getMetadata: () => ExcelRuntimeStore.getMetadata(),
        getOriginal: () => ExcelRuntimeStore.getOriginal(),     // already frozen
        getWorkingCopy: () => deepClone(ExcelRuntimeStore.getWorkingCopy()),
        updateSheet: (sheetName, mutator) => ExcelRuntimeStore.mutateSheet(sheetName, mutator),
        resetWorkingCopy: () => ExcelRuntimeStore.resetWorkingCopy(),
        getMutationLog: () => ExcelRuntimeStore.getMutationLog()
      }
      ```
    - Because the store is JS-only, no async/await needed. The only guardrail is the size limit already enforced at upload.

14. **File:** `js/execution/context/execution-context-manager.js`  
    - When creating snapshots for retries, capture the current working copy by invoking `ExcelRuntimeStore.snapshotWorking()`. Store it alongside existing Storage snapshots.
    - When restoring, call `ExcelRuntimeStore.restoreWorking(snapshot)` so a failed execution doesn’t leave partially mutated sheets. This maintains deterministic behavior even without LocalStorage.

15. **File:** `js/execution/execution-runner.js` (optional logging)  
    - After execution completes, attach `attachmentVersion` (e.g., runtime store mutation count) to the result’s `analysis` so reasoning log shows whether spreadsheets changed.

### 2.6 JS Execution Helpers

16. **File:** `js/execution/apis` (new helper)  
    - Optionally add `js/execution/apis/attachments-api.js` that wraps runtime store operations with small utilities like `selectRows(sheetName, predicate)` or `writeRows(sheetName, rows)`. Inject this helper in `execution-context-api.js` for convenience.
    - Keep implementation simple; no guardrails or filtering beyond user-supplied logic.

### 2.7 Reasoning Context & Prompt

17. **File:** `js/reasoning/context/providers/attachments-provider.js` _(new)_  
    - Provide `id = 'attachments'`. `build()` should read from `ExcelRuntimeStore` and return markdown summary (file name, sheet list, row counts, pending mutations). If no workbook, return fallback text.

18. **File:** `js/reasoning/context/providers/index.js`  
    - Import and register the new provider in `defaultContextProviderRegistry` (after `pendingErrorProvider` but before tasks).

19. **File:** `js/config/reasoning-config.js`  
    - Insert section in `REASONING_CONTEXT_SECTIONS`:
      ```js
      {
        id: 'attachments',
        providerId: 'attachments',
        heading: '**Data Attachment:**',
        fallback: 'No workbook attached.',
        includeWhenEmpty: true
      }
      ```

20. **File:** `js/config/app-config.js` (`SYSTEM_PROMPT`)  
    - Under “Operating Guarantees”, add explicit instruction: “`attachments.*` APIs expose the in-memory workbook. Original is read-only; use `attachments.updateSheet` to mutate the working copy. No guardrails besides upload size limit are enforced.”

### 2.8 Activity Hooks (Optional, No Guardrails)

21. **File:** `js/ui/renderer/renderer-output.js` or new mini-panel  
    - Optionally list last few `mutationLog` entries for visibility. This is informational only; no restrictions applied.

22. **File:** `js/main.js` / `window.GDRS` namespace  
    - Expose `ExcelRuntimeStore` under `window.GDRS.attachments` so power users can inspect state via DevTools.

### 2.9 Testing & Verification Checklist
1. Load site, ensure attachment section renders.
2. Upload a <8 MB `.xlsx`; confirm status updates instantly (no page reload, no LocalStorage usage).
3. Run a manual JS execution that calls `attachments.getWorkingCopy()` and `attachments.updateSheet()`; verify UI preview + mutation badges update.
4. Trigger `reset` and `remove`; ensure runtime store and UI clear immediately.
5. Refresh page to confirm attachment disappears (as expected for runtime-only storage).

---

## 3. Notes on Guardrails & Storage
- The **only enforced constraint** is the size limit inside `handler-attachments.js`. Reject oversize files with a user-facing alert; do nothing else.
- No safe-mode adjustments, no sanitization layers, no network blockers are added by this feature. Existing platform guardrails (timeouts, etc.) remain untouched.
- Because everything lives in JS memory, there is zero read/write to LocalStorage for attachments. This satisfies the “store it in the JS object” requirement.

---

Once these steps are implemented, the application will support Excel attachments fully in-memory, exposing them to the LLM without introducing new guardrails beyond size enforcement. The plan above can be followed sequentially to implement the feature end-to-end.
