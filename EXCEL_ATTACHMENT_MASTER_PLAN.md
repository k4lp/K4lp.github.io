# Excel Attachment System – Master Redevelopment Plan (Rev. 2)

_Date:_ 2025‑11‑09  
_Author:_ Codex (runtime-only mode)  
_Goal:_ Deliver a production-quality Excel attachment system featuring a full-service data API, robust immutability controls, modernized UI, and persistent instruction surfaces for the LLM.

---

## 1. Guiding Principles
1. **Data Integrity First** – Original workbook snapshot is inviolable; working copy modifications are fully auditable.
2. **Ergonomic APIs** – High-level helpers must cover 90%+ of analytic workflows without ad-hoc JSON spelunking.
3. **Context Safety** – All read operations enforce default row/column/character caps, nudging the LLM toward subset retrieval.
4. **Progressive Disclosure UI** – Sleek, minimal card that reveals detail on demand (sheet summaries, diffs, helper quick-actions) without bloating the left panel.
5. **Instruction Persistence** – Excel-specific protocol appears in every system prompt iteration only when a workbook exists.
6. **Observability** – Every significant attachment action is logged (console + tool activity) with sheet/row counts.

---

## 2. Architecture Overview

```
User Upload → ExcelRuntimeStore v2 (immutable original + tracked working copy)
            ↓
    AttachmentsHelper API (sheet/range/CRUD utilities w/ guardrails)
            ↓
 Execution Context (attachments.helper + legacy)
            ↓
Reasoning Context Provider → Conditional instructions/UI updates → System Prompt
```

---

## 3. Data Layer Spec (ExcelRuntimeStore v2)
### 3.1 Storage Schema
- `metadata`: `{ name, sizeBytes, importedAt, sheetOrder, totals { rows, columns } }`
- `original`: `{ bufferBase64, sheets: { [sheetName]: SheetData } }`
- `working`: same shape as `original.sheets`, but each cell is:
  ```ts
  type Cell = {
    value: string | number | null;
    originalValue: string | number | null;
    lastEditedAt?: ISOString;
  };
  type SheetData = {
    headers: string[];
    rows: Cell[][];
    rowCount: number;
    columnCount: number;
    uuid: string;
  };
  ```
- `diffIndex`: per sheet -> `{ changedCells: number, addedRows: number, deletedRows: number }`
- `mutationLog`: array of `{ sheet, type, details, timestamp }`

### 3.2 APIs (internal)
- `setWorkbook({ metadata, buffer, sheets })`
- `getImmutableOriginal()`, `getOriginalBuffer()`
- `getSheetSnapshot(sheetName)`
- `applyMutations(sheetName, mutatorFn)`
- `computeDiffSummary(sheetName)`
- `exportWorkingAsBuffer()`

### 3.3 Events
- `EXCEL_ATTACHMENT_IMPORTED` – payload includes `sheetCount`, first-sheet preview stats.
- `EXCEL_ATTACHMENT_UPDATED` – include diff summary delta.
- `EXCEL_ATTACHMENT_RESET`, `REMOVED` – same as current, plus reason.

---

## 4. Attachments Helper API (LLM/JS interface)
New module: `js/execution/apis/attachments-helper.js`

### Core Surface
```ts
const helper = attachments.helper;

helper.hasWorkbook(): boolean;
helper.listSheets({ includeStats?: boolean }): SheetSummary[];
helper.selectSheet(identifier: string | number): SheetHandle; // by name or 0-based index

type SheetHandle = {
  name: string;
  summary(): { rowCount, columnCount, headers, diff };
  getRowData(opts: { rowIndex: number; startColumn?: number; endColumn?: number; charLimit?: number }): RowPreview;
  getRange(opts: { startCell: string; endCell: string; charLimit?: number; strategy?: 'rows'|'columns' }): RangePreview;
  sliceRows(opts: { offset?: number; limit?: number; charLimit?: number }): RowPreview[];
  updateCell({ rowIndex, columnIndex, value }): void;
  updateRange({ startCell, endCell, values[][] }): void;
  appendRows(rows: string[][]): void;
  deleteRows({ start, count }): void;
  replaceSheet({ headers, rows }): void;
  diff(): DiffReport;
};
```

### Guardrails
- **Char limit defaults**: `getRowData` → 40 chars; `getRange` → 50 chars; `sliceRows` total char budget = `limit * charLimit`.
- **Row/column bounds**: clamp automatically; throw descriptive error if request exceeds e.g., `limit > 200`.
- **Mutation sanity checks**: disallow editing beyond `rowCount` unless append; update diff index automatically.

### Exposure
- `buildExecutionContext()` returns both legacy `attachments.*` and new `attachments.helper`.
- Provide `attachments.ensureWorkbook()` that throws with guidance if absent.
- Add `attachments.logSummary()` for quick console output (sheet list + row counts).

---

## 5. Instruction & Prompt Strategy

### 5.1 SYSTEM_PROMPT Block
Appended after existing guarantees:
```
### EXCEL ATTACHMENT PROTOCOL (Active only when a workbook is attached)
- Always call `attachments.helper.hasWorkbook()` before referencing sheets.
- Before printing data, inspect `sheet.summary()` to understand row/column counts.
- Retrieve small ranges only: default char limit = 50. Use `sheet.sliceRows({ limit, charLimit })`.
- Never dump entire sheets or columns; summarize or store to Vault instead.
- Mutations must follow: plan → `sheet.update...()` → describe changes → verify via `sheet.summary()` → log diff.
```

### 5.2 Conditional Injection
- `attachments-provider.js` returns empty fallback when `hasWorkbook()` false.
- Reasoning context section “Data Attachment” appears only with actual workbook.
- UI status pill displays “ATTACHED” (green) vs “NONE” (gray).

### 5.3 Documentation
- New file `docs/attachments-guide.md` with sections: API reference, best practices, examples.
- Link this guide from UI (info tooltip).

---

## 6. UI/UX Modernization

### 6.1 Layout
- Convert attachment section into a **card** with the following stack:
  1. **Header bar**: title + attachment pill + actions overflow menu (kebab).
  2. **Status row**: file name, size, sheet count, diff badge.
  3. **Tabbed content** (`Summary | Sheets | Mutations`):
     - **Summary**: concise stats, diff counts, buttons (Download, Reset, Remove).
     - **Sheets**: list with row counts, diff chip, “View” button toggling slide-out panel.
     - **Mutations**: log timeline (last N entries).
  4. **Collapsed Quick Actions**: “Select sheet”, “Preview rows”, “Append row” buttons opening modal.

### 6.2 Visual Style
- Use glassmorphism card (semi-transparent background), subtle drop shadows, consistent spacing.
- Buttons adopt iconography (Feather icons) for clarity.
- Range preview uses zebra striping + truncated text with tooltip on hover.

### 6.3 Interaction Enhancements
- **Sheet Preview Drawer**: overlay on right side when user clicks “View” (shows first N rows, diff highlights).
- **Inline Helper Console**: collapsible area offering pre-filled JS snippets (copy-to-clipboard) for common helper calls.
- **Reset Confirmation**: modal summarizing diff counts before reset.

### 6.4 Accessibility
- Ensure tab order, aria labels, and high-contrast text; abide by WCAG 2.1 AA.

---

## 7. Instrumentation & Analytics
1. Extend `ExcelRuntimeStore` logging to include: sheet selected, rows retrieved, char limit used.
2. `Storage.appendToolActivity` receives new `attachment_operation` entries.
3. Add `window.GDRS_DEBUG.attachments` helpers (list sheets, flush logs).
4. Optionally integrate with existing metrics collector to graph attachment usage.

---

## 8. Testing & Validation
1. **Helper Unit Harness** – Add `js/examples/attachment-helper-tests.js` with scenarios:  
   - row slicing boundaries, range clamping, diff accumulation, char limit enforcement.
2. **Manual QA Script** – Document step-by-step (upload sample workbook, use helper APIs, confirm UI diffs).
3. **Regression** – Compare original vs exported working copy hashes; ensure prompt injection toggles off when workbook removed.

---

## 9. Implementation Timeline (Suggested)

| Phase | Deliverables | Est. Duration |
| --- | --- | --- |
| 1 | Runtime store refactor + diff tracking | 1.5 days |
| 2 | Attachments helper module + context integration | 1 day |
| 3 | Prompt + provider + docs | 0.5 day |
| 4 | UI revamp (card + drawer + actions) | 1.5 days |
| 5 | Instrumentation + analytics hooks | 0.5 day |
| 6 | Testing + manual QA + cleanup | 1 day |

---

## 10. Next Steps
1. Review/approve this plan.
2. Lock requirements (char limits, helper method scope).
3. Execute phase-by-phase with ACTIONS/PROGRESS logging and modular commits.

This master plan supersedes previous drafts and should serve as the authoritative reference for the upcoming implementation.
