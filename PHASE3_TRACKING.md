# Phase 3: Code Reorganization - Dependency Tracking

## Files to Move

### 1. excel-parser.js
- **From:** `js/utils/excel-parser.js`
- **To:** `js/excel/core/excel-parser.js`
- **Imported by:**
  - `js/ui/handlers/handler-attachments.js` (line 2)

### 2. excel-exporter.js
- **From:** `js/utils/excel-exporter.js`
- **To:** `js/excel/core/excel-exporter.js`
- **Imported by:**
  - `js/ui/handlers/handler-attachments.js` (line 3)

### 3. excel-runtime-store.js
- **From:** `js/state/excel-runtime-store.js`
- **To:** `js/excel/core/excel-store.js`
- **Exports:** `ExcelRuntimeStore`, `ATTACHMENT_DEFAULT_CHAR_LIMIT`
- **Imported by (9 files):**
  1. `js/main.js` (line 56)
  2. `js/execution/execution-context-api.js` (line 16)
  3. `js/execution/execution-runner.js` (line 17)
  4. `js/execution/apis/attachments-helper.js` (line 1)
  5. `js/execution/context/execution-context-manager.js` (line 17)
  6. `js/ui/handlers/handler-attachments.js` (line 1)
  7. `js/ui/renderer/renderer-attachments.js` (line 1)
  8. `js/ui/handlers/handler-global.js` (line 8)
  9. `js/reasoning/context/providers/attachments-provider.js` (line 1)

### 4. attachments-helper.js
- **From:** `js/execution/apis/attachments-helper.js`
- **To:** Will be refactored into multiple files:
  - `js/excel/api/sheet-operations.js` (class SheetOperations)
  - `js/excel/api/workbook-operations.js` (class WorkbookOperations)
  - `js/excel/api/excel-helpers.js` (main facade, exports createAttachmentsHelper)
- **Exports:** `createAttachmentsHelper`
- **Imported by:**
  - `js/execution/execution-context-api.js` (line 17)

## Files to Create

### New Modules
1. `js/excel/api/sheet-operations.js` - Extract from attachments-helper.js
2. `js/excel/api/workbook-operations.js` - New workbook-level operations
3. `js/excel/api/excel-helpers.js` - Main API facade
4. `js/excel/validation/bounds-validator.js` - Validation logic
5. `js/excel/validation/data-validator.js` - Data structure validation
6. `js/excel/index.js` - Public exports

### Directory Structure
```
js/excel/
├── core/
│   ├── excel-store.js          (from excel-runtime-store.js)
│   ├── excel-parser.js         (from utils/)
│   └── excel-exporter.js       (from utils/)
├── api/
│   ├── sheet-operations.js     (extracted from attachments-helper.js)
│   ├── workbook-operations.js  (new)
│   └── excel-helpers.js        (main facade, from attachments-helper.js)
├── validation/
│   ├── bounds-validator.js     (new)
│   └── data-validator.js       (new)
├── errors/
│   └── excel-errors.js         (✅ Already exists from Phase 2)
└── index.js                    (public exports)
```

## Import Path Updates Required

### Files Needing Updates (Total: 10 files)

1. **js/main.js**
   - Old: `import { ExcelRuntimeStore } from './state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from './excel/core/excel-store.js';`

2. **js/execution/execution-context-api.js**
   - Old: `import { ExcelRuntimeStore } from '../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../excel/core/excel-store.js';`
   - Old: `import { createAttachmentsHelper } from './apis/attachments-helper.js';`
   - New: `import { createAttachmentsHelper } from '../excel/api/excel-helpers.js';`

3. **js/execution/execution-runner.js**
   - Old: `import { ExcelRuntimeStore } from '../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../excel/core/excel-store.js';`

4. **js/execution/context/execution-context-manager.js**
   - Old: `import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';`

5. **js/ui/handlers/handler-attachments.js**
   - Old: `import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';`
   - Old: `import { parseWorkbook } from '../../utils/excel-parser.js';`
   - New: `import { parseWorkbook } from '../../excel/core/excel-parser.js';`
   - Old: `import { downloadWorkbook } from '../../utils/excel-exporter.js';`
   - New: `import { downloadWorkbook } from '../../excel/core/excel-exporter.js';`

6. **js/ui/renderer/renderer-attachments.js**
   - Old: `import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';`

7. **js/ui/handlers/handler-global.js**
   - Old: `import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';`

8. **js/reasoning/context/providers/attachments-provider.js**
   - Old: `import { ExcelRuntimeStore } from '../../../state/excel-runtime-store.js';`
   - New: `import { ExcelRuntimeStore } from '../../../excel/core/excel-store.js';`

9. **js/excel/errors/excel-errors.js**
   - No changes needed (already in correct location)

10. **js/excel/core/excel-store.js** (when created)
    - Internal imports need updating:
    - Old: `import { deepClone, deepFreeze } from '../utils/deep-utils.js';`
    - New: `import { deepClone, deepFreeze } from '../../utils/deep-utils.js';`
    - Old: `import { eventBus, Events } from '../core/event-bus.js';`
    - New: `import { eventBus, Events } from '../../core/event-bus.js';`
    - Old: `from '../excel/errors/excel-errors.js';`
    - New: `from '../errors/excel-errors.js';`

## Execution Plan

### Step 1: Create Directory Structure ✅
- [x] `js/excel/core/`
- [x] `js/excel/api/`
- [x] `js/excel/validation/`
- [x] `js/excel/errors/` (already exists)

### Step 2: Move Core Files
- [ ] Move & update excel-parser.js
- [ ] Move & update excel-exporter.js
- [ ] Move & update excel-runtime-store.js → excel-store.js

### Step 3: Refactor attachments-helper.js
- [ ] Extract SheetOperations → sheet-operations.js
- [ ] Create WorkbookOperations → workbook-operations.js
- [ ] Create main facade → excel-helpers.js

### Step 4: Create New Modules
- [ ] Create bounds-validator.js
- [ ] Create data-validator.js
- [ ] Create index.js (public exports)

### Step 5: Update All Import Paths
- [ ] Update 10 files listed above

### Step 6: Verification
- [ ] Check all imports resolve
- [ ] No circular dependencies
- [ ] All exports accessible

### Step 7: Cleanup
- [ ] Delete old files
- [ ] Commit Phase 3

## Status: IN PROGRESS
Last updated: 2025-11-09
