# COMPREHENSIVE IMPORT/EXPORT BINDING TRACKER

## Purpose
Track ALL imports, exports, and file dependencies to prevent 404 errors and broken bindings.

---

## CORE EXCEL FILES - Current Locations

### js/excel/core/excel-store.js
**Exports:**
- `ExcelRuntimeStore` (singleton instance)
- `ATTACHMENT_DEFAULT_CHAR_LIMIT` (constant)

**Imported by (MUST ALL USE: `'../../excel/core/excel-store.js'` or adjust for depth):**
1. ✅ js/main.js → `'./excel/core/excel-store.js'`
2. ✅ js/execution/execution-context-api.js → `'../excel/core/excel-store.js'`
3. ✅ js/execution/execution-runner.js → `'../excel/core/excel-store.js'` **FIXED**
4. ✅ js/execution/context/execution-context-manager.js → `'../../excel/core/excel-store.js'`
5. ✅ js/ui/handlers/handler-attachments.js → `'../../excel/core/excel-store.js'`
6. ✅ js/ui/renderer/renderer-attachments.js → `'../../excel/core/excel-store.js'`
7. ✅ js/ui/handlers/handler-global.js → `'../../excel/core/excel-store.js'` **FIXED**
8. ✅ js/reasoning/context/providers/attachments-provider.js → `'../../../excel/core/excel-store.js'`
9. ✅ js/excel/api/sheet-operations.js → `'../core/excel-store.js'`
10. ✅ js/excel/api/workbook-operations.js → `'../core/excel-store.js'`
11. ✅ js/excel/api/excel-helpers.js → `'../core/excel-store.js'`

**Status:** 11/11 CORRECT ✅ ALL FIXED!

---

### js/excel/core/excel-parser.js
**Exports:**
- `parseWorkbook` (function)

**Imported by:**
1. ✅ js/ui/handlers/handler-attachments.js → `'../../excel/core/excel-parser.js'`

**Status:** 1/1 CORRECT ✅

---

### js/excel/core/excel-exporter.js
**Exports:**
- `buildWorkbookBlob` (function)
- `downloadWorkbook` (function)

**Imported by:**
1. ✅ js/ui/handlers/handler-attachments.js → `'../../excel/core/excel-exporter.js'`

**Status:** 1/1 CORRECT ✅

---

### js/excel/api/excel-helpers.js
**Exports:**
- `createAttachmentsHelper` (function)

**Imported by:**
1. ✅ js/execution/execution-context-api.js → `'../excel/api/excel-helpers.js'`

**Status:** 1/1 CORRECT ✅

---

### js/excel/errors/excel-errors.js
**Exports:**
- `ExcelError`
- `SheetNotFoundError`
- `SheetAlreadyExistsError`
- `CannotCreateSheetError`
- `WorkbookNotLoadedError`
- `ColumnOutOfBoundsError`
- `RowOutOfBoundsError`
- `InvalidMutatorError`
- `InvalidRangeError`
- `InvalidSheetDataError`
- `CannotDeleteAllRowsError`

**Imported by:**
1. ✅ js/excel/core/excel-store.js → `'../errors/excel-errors.js'`
2. ✅ js/excel/api/sheet-operations.js → `'../errors/excel-errors.js'`
3. ✅ js/excel/api/workbook-operations.js → `'../errors/excel-errors.js'`
4. ✅ js/excel/api/excel-helpers.js → `'../errors/excel-errors.js'`
5. ✅ js/execution/execution-context-api.js → `'../excel/errors/excel-errors.js'`

**Status:** 5/5 CORRECT ✅

---

## ✅ BROKEN IMPORTS - NOW FIXED

### ✅ FIXED: js/execution/execution-runner.js:17
**Was (BROKEN):**
```javascript
import { ExcelRuntimeStore } from '../state/excel-runtime-store.js';
```

**Now (FIXED):**
```javascript
import { ExcelRuntimeStore } from '../excel/core/excel-store.js';
```

**Impact:** Was causing 404 error - NOW RESOLVED

---

### ✅ FIXED: js/ui/handlers/handler-global.js:8
**Was (BROKEN):**
```javascript
import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';
```

**Now (FIXED):**
```javascript
import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';
```

**Impact:** Was causing 404 error - NOW RESOLVED

---

## FILE MOVEMENT HISTORY (Phase 3)

### Moved Files:
1. `js/state/excel-runtime-store.js` → `js/excel/core/excel-store.js` ✅
2. `js/utils/excel-parser.js` → `js/excel/core/excel-parser.js` ✅
3. `js/utils/excel-exporter.js` → `js/excel/core/excel-exporter.js` ✅
4. `js/execution/apis/attachments-helper.js` → DELETED (split into 3 files) ✅

### Deleted Files:
- `js/execution/apis/attachments-helper.js` (replaced by excel-helpers.js)

### Created Files:
- `js/excel/api/sheet-operations.js` ✅
- `js/excel/api/workbook-operations.js` ✅
- `js/excel/api/excel-helpers.js` ✅
- `js/excel/validation/bounds-validator.js` ✅
- `js/excel/validation/data-validator.js` ✅
- `js/excel/index.js` ✅

---

## SEARCH PATTERNS TO CHECK

### Old paths that MUST NOT exist:
```bash
grep -r "state/excel-runtime-store" js/
grep -r "utils/excel-parser" js/
grep -r "utils/excel-exporter" js/
grep -r "apis/attachments-helper" js/
```

### New paths that MUST be used:
- `excel/core/excel-store.js`
- `excel/core/excel-parser.js`
- `excel/core/excel-exporter.js`
- `excel/api/excel-helpers.js`

---

## VERIFICATION CHECKLIST

- [ ] Fix execution-runner.js import
- [ ] Fix handler-global.js import
- [ ] Verify no other old paths exist
- [ ] Test site loads without 404 errors
- [ ] Verify all Excel functionality works
- [ ] Commit fixes
- [ ] Push to remote

---

**Priority:** CRITICAL - Site is completely broken until fixed
**Status:** IN PROGRESS
