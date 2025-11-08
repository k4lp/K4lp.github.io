# 📋 EXCEL FILE ATTACHMENT FEATURE - MASTER IMPLEMENTATION PLAN

## 🎯 FEATURE OVERVIEW

**Goal:** Enable users to upload Excel files that are:
- Parsed client-side into structured data
- Stored with an **immutable original copy** + a **mutable working copy**
- Accessible to the LLM agent throughout all reasoning iterations
- Available for read/write operations via programmatic APIs

**Storage Strategy:** Original Excel data → Frozen object in vault + Working copy in vault

---

## 📐 ARCHITECTURE DESIGN

### Data Flow Architecture
```
User Upload → FileReader API → SheetJS Parser →
  ├─→ Original Data (IMMUTABLE) → Vault Entry (frozen)
  └─→ Working Copy (MUTABLE) → Vault Entry (updatable)
      ↓
Context Provider → Adds to LLM prompt
      ↓
LLM Reasoning → Reads/Modifies via vault API
      ↓
JavaScript Execution → Processes Excel data
      ↓
Updated Working Copy → Vault
```

### Storage Structure
```javascript
// Vault Entries Created:
{
  identifier: "excel_original_{fileId}",
  type: "data",
  description: "Original Excel: filename.xlsx (IMMUTABLE)",
  content: JSON.stringify({
    fileName: "data.xlsx",
    fileSize: 123456,
    uploadedAt: "2025-01-15T10:30:00Z",
    sheets: {
      "Sheet1": [ {col1: "val1", col2: "val2"}, ... ],
      "Sheet2": [ ... ]
    },
    metadata: {
      sheetNames: ["Sheet1", "Sheet2"],
      totalRows: 1000,
      totalColumns: 15
    },
    immutable: true  // Flag for protection
  })
}

{
  identifier: "excel_working_{fileId}",
  type: "data",
  description: "Working copy: filename.xlsx (MUTABLE)",
  content: JSON.stringify({
    // Same structure as original
    // Can be modified by LLM
  })
}

// Memory Entry for Context:
{
  identifier: "attached_excel_files",
  heading: "Attached Excel Files",
  content: JSON.stringify([
    {
      fileId: "file_abc123",
      fileName: "sales_data.xlsx",
      uploadedAt: "2025-01-15T10:30:00Z",
      originalVaultId: "excel_original_file_abc123",
      workingVaultId: "excel_working_file_abc123",
      sheetCount: 3,
      totalRows: 5000
    }
  ])
}
```

---

## 📦 IMPLEMENTATION PHASES

---

### **PHASE 1: EXCEL LIBRARY INTEGRATION**

#### **1.1 Add SheetJS Library to index.html**
- **File:** `/home/user/K4lp.github.io/index.html`
- **Action:** Add CDN script tag **BEFORE** the `js/main.js` import
- **Location:** Line 350 (after marked.js, before main.js)

**Code to Add:**
```html
<!-- SheetJS (xlsx) Library for Excel file parsing -->
<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
```

**Why SheetJS?**
- Industry standard (10M+ weekly downloads)
- Supports .xlsx, .xls, .csv, .ods
- Client-side parsing (no server needed)
- ~500KB minified
- Works in all browsers

---

### **PHASE 2: FILE UPLOAD UI COMPONENT**

#### **2.1 Add File Upload Section to Left Panel**
- **File:** `/home/user/K4lp.github.io/index.html`
- **Location:** After API Keys section (line 51), before Session Configuration (line 54)

**HTML Structure to Add:**
```html
<!-- Excel File Attachment Section -->
<div class="config-section">
    <div class="section-header">
        <h2>EXCEL ATTACHMENTS</h2>
        <span class="section-desc">Upload spreadsheets for analysis</span>
    </div>

    <!-- File Input -->
    <div class="form-group">
        <label for="excelFileInput" class="file-input-label">
            <span class="file-input-icon">📎</span>
            <span class="file-input-text">Choose Excel File</span>
        </label>
        <input
            id="excelFileInput"
            type="file"
            class="file-input-hidden"
            accept=".xlsx,.xls,.csv,.ods"
            multiple
        />
    </div>

    <!-- Attached Files List -->
    <div id="attachedFilesList" class="attached-files-container">
        <div class="files-placeholder">No files attached</div>
    </div>

    <!-- Actions -->
    <div class="file-actions">
        <button id="clearAllFilesBtn" class="btn btn-danger btn-small">Clear All</button>
    </div>
</div>
```

#### **2.2 Add CSS Styles for File Upload UI**
- **File:** `/home/user/K4lp.github.io/styles.css`
- **Location:** End of file

**CSS to Add:**
```css
/* ========================================
   EXCEL FILE ATTACHMENT STYLES
   ======================================== */

/* File Input */
.file-input-hidden {
  display: none;
}

.file-input-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  padding: var(--gap-md);
  background-color: var(--bg-alt);
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  color: var(--text-secondary);
}

.file-input-label:hover {
  border-color: var(--accent);
  background-color: var(--bg);
  color: var(--accent);
}

.file-input-icon {
  font-size: 20px;
}

.file-input-text {
  font-size: 13px;
  font-weight: 600;
}

/* Attached Files Container */
.attached-files-container {
  margin-top: var(--gap-md);
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: var(--bg);
}

.files-placeholder {
  padding: var(--gap-lg);
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  font-style: italic;
}

/* Individual File Item */
.attached-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-sm) var(--gap-md);
  border-bottom: 1px solid var(--border);
  background-color: var(--bg);
  transition: background-color 0.2s ease;
}

.attached-file-item:last-child {
  border-bottom: none;
}

.attached-file-item:hover {
  background-color: var(--bg-alt);
}

.file-item-info {
  flex: 1;
  min-width: 0;
}

.file-item-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.file-item-meta {
  font-size: 10px;
  color: var(--text-muted);
  display: flex;
  gap: var(--gap-sm);
}

.file-item-actions {
  display: flex;
  gap: var(--gap-xs);
  margin-left: var(--gap-sm);
}

.file-item-btn {
  padding: 4px 8px;
  font-size: 10px;
  border: 1px solid var(--border);
  background-color: var(--bg);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-item-btn:hover {
  background-color: var(--bg-alt);
  border-color: var(--accent);
  color: var(--accent);
}

.file-item-btn.btn-remove {
  color: var(--error);
}

.file-item-btn.btn-remove:hover {
  border-color: var(--error);
  background-color: var(--error);
  color: white;
}

/* File Status Badge */
.file-status-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.file-status-badge.status-parsing {
  background-color: var(--warning);
  color: white;
}

.file-status-badge.status-ready {
  background-color: var(--success);
  color: white;
}

.file-status-badge.status-error {
  background-color: var(--error);
  color: white;
}

/* File Actions */
.file-actions {
  margin-top: var(--gap-md);
  display: flex;
  gap: var(--gap-sm);
  justify-content: flex-end;
}
```

---

### **PHASE 3: FILE HANDLER MODULE**

#### **3.1 Create File Upload Handler**
- **New File:** `/home/user/K4lp.github.io/js/ui/handlers/handler-file-upload.js`

**Complete Implementation:** See file in codebase (280 lines)

Key functions:
- `bindFileUploadHandlers()` - Main initialization
- `handleFileUpload(file)` - Process individual file
- `storeExcelData()` - Create vault entries (original + working)
- `addFileToRegistry()` - Update memory registry
- `removeExcelFile(fileId)` - Cleanup vault and memory
- `clearAllExcelFiles()` - Remove all attachments

---

### **PHASE 4: EXCEL PARSER MODULE**

#### **4.1 Create Excel Parser Utility**
- **New File:** `/home/user/K4lp.github.io/js/utils/excel-parser.js`

**Complete Implementation:** See file in codebase (150 lines)

Key functions:
- `parseFile(file)` - Main async parser using FileReader
- `parseWorkbook(workbook)` - Convert XLSX workbook to JSON
- `arrayToObjects(arrayData)` - Transform arrays to row objects
- `sanitizeHeaders(headers)` - Clean column names
- `getSheetPreview(data, limit)` - Get first N rows
- `getSheetStats(data)` - Calculate statistics

---

### **PHASE 5: FILE RENDERER MODULE**

#### **5.1 Create File Renderer**
- **New File:** `/home/user/K4lp.github.io/js/ui/renderer/renderer-files.js`

**Complete Implementation:** See file in codebase (80 lines)

Key functions:
- `renderAttachedFiles()` - Main render function
- `renderFileItem(file)` - Individual file HTML
- `formatFileSize(bytes)` - Human-readable sizes

---

### **PHASE 6: CONTEXT PROVIDER FOR LLM**

#### **6.1 Create Excel Files Context Provider**
- **New File:** `/home/user/K4lp.github.io/js/reasoning/context/providers/excel-files-provider.js`

**Complete Implementation:**
```javascript
/**
 * Excel Files Context Provider
 * Provides information about attached Excel files to the LLM
 */

export const excelFilesProvider = {
  id: 'excelFiles',

  collect({ snapshot }) {
    const memory = snapshot.memory || [];
    const registryEntry = memory.find(m => m.identifier === 'attached_excel_files');

    if (!registryEntry) {
      return null;
    }

    try {
      const files = JSON.parse(registryEntry.content);
      return files;
    } catch {
      return null;
    }
  },

  format(files, context) {
    if (!files || files.length === 0) {
      return '';
    }

    const lines = ['## ATTACHED EXCEL FILES\n'];

    files.forEach((file, index) => {
      lines.push(`### File ${index + 1}: ${file.fileName}`);
      lines.push(`- **File ID**: ${file.fileId}`);
      lines.push(`- **Uploaded**: ${new Date(file.uploadedAt).toLocaleString()}`);
      lines.push(`- **Sheets**: ${file.sheetCount} (${file.totalRows.toLocaleString()} total rows)`);
      lines.push(`- **Original Data Vault ID**: \`${file.originalVaultId}\``);
      lines.push(`- **Working Copy Vault ID**: \`${file.workingVaultId}\``);
      lines.push('');
      lines.push('**Access Instructions:**');
      lines.push('- Use `vault.get("' + file.workingVaultId + '")` to read/modify data');
      lines.push('- Use `vault.get("' + file.originalVaultId + '")` to access immutable original');
      lines.push('- Working copy can be updated with `vault.set(...)`');
      lines.push('');
    });

    return lines.join('\n');
  }
};

export default excelFilesProvider;
```

#### **6.2 Register Provider in Index**
- **File:** `/home/user/K4lp.github.io/js/reasoning/context/providers/index.js`
- **Action:** Import and register the new provider

**Code to Add:**
```javascript
import { excelFilesProvider } from './excel-files-provider.js';

// In createDefaultContextProviders():
providers.set('excelFiles', excelFilesProvider);
```

#### **6.3 Add Section to Reasoning Config**
- **File:** `/home/user/K4lp.github.io/js/config/reasoning-config.js`
- **Action:** Add excelFiles section to REASONING_CONTEXT_SECTIONS

**Code to Add:**
```javascript
{
  providerId: 'excelFiles',
  heading: '## ATTACHED EXCEL FILES',
  includeWhenEmpty: false
}
```

---

### **PHASE 7: SYSTEM PROMPT UPDATES**

#### **7.1 Update System Prompt**
- **File:** `/home/user/K4lp.github.io/js/config/app-config.js`
- **Location:** Line 197 (end of SYSTEM_PROMPT, before final paragraph)

**Content to Add:**
```javascript
## EXCEL FILE ATTACHMENTS

The user can attach Excel files (.xlsx, .xls, .csv, .ods) to the session. When files are attached:

### Storage Structure
- **Original Copy** (IMMUTABLE): Stored as `excel_original_{fileId}` - Never modify this!
- **Working Copy** (MUTABLE): Stored as `excel_working_{fileId}` - You can read and modify this

### Accessing Excel Data

**Read Excel Data:**
\`\`\`javascript
{{<js_execute>}}
// Get the working copy
const excelData = vault.get('excel_working_file_abc123');

// Structure:
// {
//   fileName: "data.xlsx",
//   fileSize: 123456,
//   uploadedAt: "2025-01-15T...",
//   sheets: {
//     "Sheet1": [ {col1: "val", col2: "val"}, ... ],
//     "Sheet2": [ ... ]
//   },
//   metadata: { sheetNames, totalRows, totalColumns }
// }

// Access specific sheet
const sheet1Data = excelData.sheets["Sheet1"];

// Process rows
sheet1Data.forEach(row => {
  console.log(row.columnName);
});
{{</js_execute>}}
\`\`\`

**Modify Excel Data:**
\`\`\`javascript
{{<js_execute>}}
// Read working copy
const excelData = vault.get('excel_working_file_abc123');

// Modify data
excelData.sheets["Sheet1"].forEach(row => {
  row.calculatedField = row.price * row.quantity;
});

// Save back to working copy
vault.set('excel_working_file_abc123', excelData, {
  type: 'data',
  description: 'Updated working copy with calculations'
});
{{</js_execute>}}
\`\`\`

**Reset to Original:**
\`\`\`javascript
{{<js_execute>}}
// Copy original back to working
const original = vault.get('excel_original_file_abc123');
vault.set('excel_working_file_abc123', original);
{{</js_execute>}}
\`\`\`

### Best Practices
1. NEVER modify `excel_original_*` entries - they are immutable references
2. Always work with `excel_working_*` entries
3. Store analysis results in separate vault entries
4. Use Memory to track analysis progress across sheets
5. Create tasks for processing each sheet if dataset is large
```

---

### **PHASE 8: EVENT BUS INTEGRATION**

#### **8.1 Add New Event Type**
- **File:** `/home/user/K4lp.github.io/js/core/event-bus.js`
- **Action:** Add EXCEL_FILES_UPDATED event

**Code to Add:**
```javascript
export const Events = {
  // ... existing events ...
  EXCEL_FILES_UPDATED: 'excel:files:updated'
};
```

---

### **PHASE 9: UTILITY FUNCTIONS**

#### **9.1 Add File ID Generator**
- **File:** `/home/user/K4lp.github.io/js/core/utils.js`
- **Action:** Add generateFileId and formatFileSize functions

**Code to Add:**
```javascript
/**
 * Generate unique file ID
 */
export function generateFileId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `file_${timestamp}_${random}`;
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
```

---

### **PHASE 10: MAIN.JS INTEGRATION**

#### **10.1 Import and Initialize File Handler**
- **File:** `/home/user/K4lp.github.io/js/main.js`
- **Action:** Import handler and call bind function

**Code to Add:**
```javascript
import { bindFileUploadHandlers } from './ui/handlers/handler-file-upload.js';

// In initialization section:
bindFileUploadHandlers();
```

---

### **PHASE 11: VAULT API ENHANCEMENTS**

#### **11.1 Add Immutability Protection**
- **File:** `/home/user/K4lp.github.io/js/execution/apis/vault-api.js`
- **Action:** Add immutability check in `set()` method (after line 89)

**Code to Add:**
```javascript
set(id, content, options = {}) {
  if (!id || !isValidIdentifier(id)) {
    throw new Error(`Invalid vault ID: ${id}`);
  }

  // NEW: Check for immutability protection
  const vaultData = Storage.loadVault() || [];
  const existing = vaultData.find(v => v.identifier === id);

  if (existing) {
    try {
      const existingContent = JSON.parse(existing.content);
      if (existingContent.immutable === true) {
        throw new Error(
          `Vault entry "${id}" is marked as IMMUTABLE and cannot be modified. ` +
          `This is the original Excel file. Use the working copy instead ` +
          `(replace "excel_original_" with "excel_working_" in the ID).`
        );
      }
    } catch (parseError) {
      // If not JSON or no immutable flag, allow modification
    }
  }

  // ... rest of existing code ...
}
```

---

### **PHASE 12: ENHANCED EXCEL OPERATIONS API**

#### **12.1 Create Excel Helper API for JS Execution**
- **New File:** `/home/user/K4lp.github.io/js/execution/apis/excel-api.js`

**Complete Implementation:** See file in codebase (200 lines)

Key methods:
- `getSheet(fileId, sheetName)` - Get sheet data
- `listSheets(fileId)` - List all sheets
- `filterRows(fileId, sheetName, filterFn)` - Filter rows
- `mapRows(fileId, sheetName, mapFn)` - Transform rows
- `updateSheet(fileId, sheetName, data)` - Update sheet
- `resetToOriginal(fileId)` - Restore from immutable copy
- `getMetadata(fileId)` - Get file info
- `getColumns(fileId, sheetName)` - Get column names
- `addColumn(fileId, sheetName, name, fn)` - Add calculated column

#### **12.2 Inject Excel API into JS Execution Environment**
- **File:** `/home/user/K4lp.github.io/js/execution/apis/instrumented-api-factory.js`
- **Action:** Add excel API to the injected APIs

**Code to Add:**
```javascript
import { ExcelAPI } from './excel-api.js';

// In createInstrumentedAPIs():
const excelAPI = new ExcelAPI();
excelAPI.vault = vaultAPI;  // Inject vault dependency

return {
  // ... existing apis ...
  excel: excelAPI
};
```

---

### **PHASE 13: TESTING CHECKLIST**

#### **Manual Testing Steps:**

**13.1 File Upload Testing**
- [ ] Upload .xlsx file (should work)
- [ ] Upload .xls file (should work)
- [ ] Upload .csv file (should work)
- [ ] Upload .txt file (should reject)
- [ ] Upload file > 10MB (should reject)
- [ ] Upload multiple files (should all appear)
- [ ] Upload same file twice (should create separate entries)

**13.2 File Display Testing**
- [ ] Verify file appears in attached files list
- [ ] Verify file metadata displays correctly (name, size, sheets, rows)
- [ ] Verify "READY" status badge shows
- [ ] Hover over long filename (should show full name in tooltip)

**13.3 File Removal Testing**
- [ ] Click remove button (should prompt confirmation)
- [ ] Confirm removal (file should disappear)
- [ ] Cancel removal (file should stay)
- [ ] Clear all files (all should be removed)

**13.4 Vault Storage Testing**
- [ ] Check Data Vault section (should show 2 entries per file)
- [ ] Verify original entry has "(IMMUTABLE)" in description
- [ ] Verify working entry has "(MUTABLE)" in description
- [ ] View vault entry content (should be valid JSON)

**13.5 Context Provider Testing**
- [ ] Start analysis with attached file
- [ ] Check reasoning log (should mention attached file)
- [ ] Verify LLM receives vault IDs in context

**13.6 LLM Access Testing**
- [ ] Ask LLM to read Excel file
- [ ] Verify LLM uses correct vault.get() call
- [ ] Ask LLM to modify working copy
- [ ] Verify modifications persist
- [ ] Ask LLM to reset to original
- [ ] Verify reset works

**13.7 Immutability Testing**
- [ ] Try to modify excel_original_* via JS (should error)
- [ ] Verify error message is clear
- [ ] Modify excel_working_* (should succeed)

**13.8 Error Handling Testing**
- [ ] Upload corrupted Excel file (should show error)
- [ ] Try to access non-existent file ID (should error)
- [ ] Try to access non-existent sheet name (should error)
- [ ] Try to use excel API before file upload (should error)

---

### **PHASE 14: DOCUMENTATION & POLISH**

#### **14.1 Add User Instructions**
- Add tooltip to file input explaining supported formats
- Add help icon with instructions modal

#### **14.2 Loading States**
- Add spinner during file parsing
- Show progress bar for large files

#### **14.3 Error Messages**
- Standardize error message format
- Add retry button for failed uploads

---

## 📊 FILE STRUCTURE SUMMARY

### New Files Created (8 files):
```
/js/ui/handlers/handler-file-upload.js                      (280 lines)
/js/ui/renderer/renderer-files.js                           (80 lines)
/js/utils/excel-parser.js                                   (150 lines)
/js/reasoning/context/providers/excel-files-provider.js     (50 lines)
/js/execution/apis/excel-api.js                             (200 lines)
```

### Files Modified (9 files):
```
/index.html                                     (+40 lines)
/styles.css                                     (+180 lines)
/js/main.js                                     (+5 lines)
/js/core/utils.js                               (+20 lines)
/js/core/event-bus.js                           (+2 lines)
/js/config/app-config.js                        (+80 lines)
/js/config/reasoning-config.js                  (+5 lines)
/js/reasoning/context/providers/index.js        (+5 lines)
/js/execution/apis/vault-api.js                 (+15 lines)
```

**Total Lines of Code:** ~1,100 lines

---

## 🎯 IMPLEMENTATION PRIORITY ORDER

### Priority 1 (Core Functionality):
1. ✅ Phase 1: Excel library integration
2. ✅ Phase 2: File upload UI
3. ✅ Phase 3: File handler module
4. ✅ Phase 4: Excel parser module
5. ✅ Phase 5: File renderer

### Priority 2 (LLM Integration):
6. ✅ Phase 6: Context provider
7. ✅ Phase 7: System prompt updates
8. ✅ Phase 11: Vault API immutability

### Priority 3 (Enhanced Features):
9. ✅ Phase 12: Excel helper API
10. ✅ Phase 8: Event bus integration
11. ✅ Phase 9: Utility functions
12. ✅ Phase 10: Main.js integration

### Priority 4 (Testing & Polish):
13. ✅ Phase 13: Testing
14. ✅ Phase 14: Documentation

---

## 🚀 ESTIMATED IMPLEMENTATION TIME

- **Phase 1-5** (Core Upload): 3-4 hours
- **Phase 6-7** (LLM Integration): 2-3 hours
- **Phase 8-12** (Enhanced Features): 2-3 hours
- **Phase 13-14** (Testing & Polish): 2-3 hours

**Total:** 9-13 hours for complete implementation

---

## 🔒 SECURITY & PERFORMANCE CONSIDERATIONS

### Security:
- ✅ File type validation (whitelist only)
- ✅ File size limits (10MB max)
- ✅ Client-side only (no server uploads)
- ✅ Immutability enforcement for original data
- ✅ Input sanitization for headers

### Performance:
- ✅ Async file parsing (non-blocking)
- ✅ Lazy loading of sheet data
- ✅ LocalStorage size monitoring
- ✅ Memory cleanup on file removal

### Browser Compatibility:
- ✅ FileReader API (IE10+)
- ✅ ArrayBuffer support (all modern browsers)
- ✅ LocalStorage (all browsers)
- ✅ SheetJS compatibility (IE11+)

---

## ✨ FUTURE ENHANCEMENTS (Post-MVP)

1. **Export Modified Data**
   - Allow LLM to export modified Excel back to download

2. **Sheet Preview Modal**
   - View first 20 rows in UI modal
   - Column sorting/filtering

3. **File Diff Viewer**
   - Compare original vs modified
   - Highlight changed cells

4. **Large File Optimization**
   - Chunked parsing for files > 5MB
   - Virtual scrolling for preview

5. **Multiple Format Export**
   - CSV, JSON, SQL exports
   - Chart generation from data

---

## 📝 NOTES

- All file operations are **client-side only** - no server required
- Original Excel data is **completely immutable** via vault protection
- Working copy can be **freely modified** by LLM reasoning steps
- Data persists in **browser LocalStorage** (same as other GDRS data)
- File parsing is **asynchronous** to prevent UI blocking
- SheetJS library adds ~500KB to page load (one-time, cached)

---

**END OF IMPLEMENTATION PLAN**
