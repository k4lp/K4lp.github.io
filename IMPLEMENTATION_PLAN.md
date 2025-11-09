# 🎯 Comprehensive Implementation Plan
## UI/UX Improvements + Excel API Enhancement + System Instructions Update

**Date:** 2025-11-09
**Branch:** `claude/improve-ui-logs-excel-api-011CUx6qFQWagMVkY61Bou31`
**Status:** ✅ Verified Against Codebase - Ready for Approval

---

## 📋 EXECUTIVE SUMMARY

This plan addresses the following improvements:

1. **UI Enhancements:**
   - Add collapsible toggles for Reasoning Log and Code Execution sections
   - Improve attachment button icons (bigger, more self-explanatory)
   - Fix reasoning log display with proper borders and visual separation
   - Enhance code execution and output styling
   - Improve action/activity block appearance
   - Better task update separation

2. **Excel API Improvements:**
   - Update character limit defaults and documentation
   - Add explicit instructions for preview vs operation modes
   - Mandate beginning/end/middle scanning workflow
   - Clarify when to use `charLimit: Infinity` vs `50`

3. **System Instructions:**
   - Require DataVault reference names in Tasks and Goals
   - Add examples and enforcement in prompt

---

## 🔍 CODEBASE VERIFICATION RESULTS

### ✅ **Verified Components:**

1. **Collapse Toggle System:** ✅ Already exists
   - File: `/js/ui/handlers/handler-global.js:57-73`
   - Function: `bindCollapsibleSections()`
   - Works with: `data-target` attribute, `.collapse-toggle` class
   - CSS: `.collapsible`, `.collapsed` classes in styles.css

2. **Attachment Button Structure:** ✅ Confirmed
   - File: `/index.html:94-99`
   - Current icons: ⤓, ⤓*, ↺, ✕ (need replacement)

3. **Reasoning Block Renderer:** ✅ Located
   - File: `/js/ui/renderer/renderer-reasoning.js:15-74`
   - Dynamically generates blocks with classes: `.reasoning-block`, `.even`, `.odd`
   - Currently NO CSS styling for these classes (needs addition)

4. **Tool Activity Renderer:** ✅ Located
   - File: `/js/ui/renderer/renderer-helpers.js:98-148`
   - Generates activity blocks with type-specific classes
   - Currently NO CSS styling for type classes (needs addition)

5. **Excel API:** ✅ Confirmed
   - Default char limit: 50 (`/js/excel/core/excel-store.js:10`)
   - Supports `Infinity` for unlimited (`/js/excel/api/sheet-operations.js:13-19`)

6. **System Prompt:** ✅ Located
   - File: `/js/config/app-config.js:37-255`
   - Task/Goal sections: L141-149

### ⚠️ **Missing Styles (To Be Added):**
- Reasoning block styles (`.reasoning-block`, `.even`, `.odd`, type classes)
- Execution block color-coding (`[data-section="..."]`)
- Activity type styles (`.execution-type`, `.vault-type`, etc.)
- Button icon enlargement styles

---

## 📦 IMPLEMENTATION PHASES

---

### **PHASE 1: UI - Collapsible Sections** ⚡ Low Risk

#### **File: `/index.html`**

**Change 1.1:** Add collapse toggle to Reasoning Log (Lines 175-185)

**BEFORE:**
```html
<section class="block">
    <header class="block-header">
        <h2>Reasoning Log</h2>
        <p class="block-meta">Iteration <span id="iterationCount">0</span></p>
    </header>

    <div class="block-body">
        <div id="iterationLog" class="log">
            <div class="log-placeholder">Intelligent reasoning iterations will appear here</div>
        </div>
    </div>
</section>
```

**AFTER:**
```html
<section class="block collapsible">
    <header class="block-header">
        <div style="display: flex; align-items: center; gap: var(--space-sm); flex: 1;">
            <h2>Reasoning Log</h2>
            <p class="block-meta">Iteration <span id="iterationCount">0</span></p>
        </div>
        <button class="collapse-toggle" data-target="reasoningLogBody">−</button>
    </header>

    <div id="reasoningLogBody" class="block-body">
        <div id="iterationLog" class="log">
            <div class="log-placeholder">Intelligent reasoning iterations will appear here</div>
        </div>
    </div>
</section>
```

---

**Change 1.2:** Add collapse toggle to Code Execution (Lines 187-211)

**BEFORE:**
```html
<section class="block">
    <header class="block-header">
        <h2>Code Execution</h2>
        <span id="execStatus" class="pill">READY</span>
    </header>

    <div class="block-body">
        ...
    </div>
</section>
```

**AFTER:**
```html
<section class="block collapsible">
    <header class="block-header">
        <div style="display: flex; align-items: center; gap: var(--space-sm); flex: 1;">
            <h2>Code Execution</h2>
            <span id="execStatus" class="pill">READY</span>
        </div>
        <button class="collapse-toggle" data-target="codeExecutionBody">−</button>
    </header>

    <div id="codeExecutionBody" class="block-body">
        ...
    </div>
</section>
```

**Testing:** Click toggles, verify collapse/expand, check `+` / `−` symbol change.

---

### **PHASE 2: UI - Attachment Button Icons** ⚡ Low Risk

#### **File: `/index.html` (Lines 94-100)**

**Change 2.1:** Update attachment action buttons

**BEFORE:**
```html
<div class="action-group">
    <span id="attachmentStatusPill" class="pill">NONE</span>
    <button id="attachmentDownloadOriginal" class="btn btn-sm" title="Download original" disabled>⤓</button>
    <button id="attachmentDownloadWorking" class="btn btn-sm" title="Download working" disabled>⤓*</button>
    <button id="attachmentReset" class="btn btn-sm" title="Reset" disabled>↺</button>
    <button id="attachmentRemove" class="btn btn-sm" title="Remove" disabled>✕</button>
</div>
```

**AFTER:**
```html
<div class="action-group attachment-actions">
    <span id="attachmentStatusPill" class="pill">NONE</span>
    <button id="attachmentDownloadOriginal" class="btn btn-sm btn-icon" title="Download original file" disabled>
        <span class="icon-large">📥</span>
    </button>
    <button id="attachmentDownloadWorking" class="btn btn-sm btn-icon" title="Save current changes" disabled>
        <span class="icon-large">💾</span>
    </button>
    <button id="attachmentReset" class="btn btn-sm btn-icon" title="Reset to original" disabled>
        <span class="icon-large">🔄</span>
    </button>
    <button id="attachmentRemove" class="btn btn-sm btn-icon" title="Remove attachment" disabled>
        <span class="icon-large">🗑️</span>
    </button>
</div>
```

#### **File: `/styles.css` (Add after line 600)**

**Change 2.2:** Add icon size styling

```css
/* Attachment Button Icons */
.btn-icon {
  min-width: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-large {
  font-size: 1.125rem; /* 18px */
  line-height: 1;
  display: inline-block;
}

.attachment-actions {
  gap: var(--space-xs);
}
```

**Testing:** Verify icons are larger and more visible.

---

### **PHASE 3: UI - Reasoning Log Display** ⚠️ Medium Risk

#### **File: `/styles.css` (Add after line 889, before "MARKDOWN RENDERING")**

**Change 3.1:** Add comprehensive reasoning block styles

```css
/* ============================================
   REASONING & ACTIVITY BLOCKS
   ============================================ */

/* Base Reasoning Block */
.reasoning-block {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--white);
  border: 2px solid var(--gray-300);
  border-left: 4px solid var(--gray-900);
  transition: all var(--transition-fast);
}

/* Alternating backgrounds for better readability */
.reasoning-block.even {
  background: var(--gray-50);
  border-left-color: var(--gray-700);
}

.reasoning-block.odd {
  background: var(--white);
  border-left-color: var(--gray-900);
}

/* Reasoning Content Block (main thought process) */
.reasoning-block.reasoning-type {
  border-left-color: #0066cc;
  background: linear-gradient(to right, rgba(0, 102, 204, 0.03), transparent);
}

/* Activity Type-Specific Styling */
.reasoning-block.execution-type {
  border-left-color: #00ff00;
  background: linear-gradient(to right, rgba(0, 255, 0, 0.04), transparent);
}

.reasoning-block.vault-type {
  border-left-color: #9933ff;
  background: linear-gradient(to right, rgba(153, 51, 255, 0.04), transparent);
}

.reasoning-block.memory-type {
  border-left-color: #0099ff;
  background: linear-gradient(to right, rgba(0, 153, 255, 0.04), transparent);
}

.reasoning-block.task-type {
  border-left-color: #00cc66;
  background: linear-gradient(to right, rgba(0, 204, 102, 0.04), transparent);
}

.reasoning-block.goal-type {
  border-left-color: #ff6600;
  background: linear-gradient(to right, rgba(255, 102, 0, 0.04), transparent);
}

.reasoning-block.output-type {
  border-left-color: #cc0099;
  background: linear-gradient(to right, rgba(204, 0, 153, 0.04), transparent);
}

/* Block Headers */
.reasoning-block .block-header {
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--gray-300);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reasoning-block .block-header.reasoning {
  border-bottom-color: var(--gray-400);
}

.reasoning-block .block-header.activity {
  border-bottom-color: var(--gray-300);
}

/* Header Layout */
.block-header .header-left {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
}

.block-header .header-right {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* Iteration Badge */
.iteration-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 24px;
  padding: 0 var(--space-xs);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 600;
  background: var(--gray-900);
  color: var(--white);
  border-radius: 2px;
}

/* Block Title and Meta */
.block-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-900);
}

.block-meta-compact {
  font-size: 0.625rem;
  font-family: var(--font-mono);
  color: var(--gray-600);
}

/* Activity Icon */
.activity-icon {
  font-size: 1.25rem;
  line-height: 1;
  filter: grayscale(0%);
}

/* Status Badge (Success/Error indicator) */
.status-badge-compact {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 50%;
  background: var(--gray-200);
  color: var(--gray-700);
}

.status-badge-compact.success {
  background: rgba(0, 204, 102, 0.2);
  color: #00804d;
}

.status-badge-compact.error {
  background: rgba(255, 51, 102, 0.2);
  color: #cc0000;
}

/* Reasoning Content */
.reasoning-content {
  padding: var(--space-sm) 0;
}

/* Activity Body */
.activity-body {
  padding: var(--space-sm) var(--space-md);
  background: rgba(0, 0, 0, 0.02);
  border-top: 1px solid var(--gray-200);
  margin-top: var(--space-sm);
}

/* Activity Error Display */
.activity-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(255, 51, 102, 0.1);
  border-left: 3px solid #ff3366;
  border-radius: 2px;
}

.error-icon {
  font-size: 1rem;
  color: #ff3366;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-message {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: #cc0000;
  line-height: 1.5;
  flex: 1;
}

/* Execution Block Styling (CODE, CONSOLE OUTPUT, etc.) */
.execution-block {
  margin: var(--space-sm) 0;
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.5;
  background: var(--gray-900);
  color: var(--gray-100);
  border-left: 4px solid #00ff00;
  overflow-x: auto;
  border-radius: 2px;
}

.execution-block[data-section="code"] {
  border-left-color: #0099ff;
  background: #1a1a1a;
}

.execution-block[data-section="console-output"] {
  border-left-color: #00ff00;
  background: #0d1117;
}

.execution-block[data-section="return-value"] {
  border-left-color: #9933ff;
  background: #1a1a1a;
}

.execution-block[data-section="error"] {
  border-left-color: #ff3366;
  background: #2a0a0a;
  color: #ffcccc;
}

.execution-block[data-section="stack"] {
  border-left-color: #ff9933;
  background: #1a1a1a;
  color: #ffddaa;
}

/* ============================================
```

**Testing:**
- Load reasoning log with multiple iterations
- Verify borders, backgrounds, and separations
- Check execution blocks have correct colors
- Verify activity blocks show proper styling

---

### **PHASE 4: Excel API - Prompt Updates** ✅ Safe (Prompt Only)

#### **File: `/js/reasoning/context/providers/attachments-provider.js`**

**Change 4.1:** Update Excel API Quick Reference (Lines 34-46)

**BEFORE:**
```javascript
**CRITICAL RULES:**
1. ALWAYS call \`sheet.summary()\` first to check dimensions
2. NEVER dump entire sheets - use offset/limit (max 200 rows per call)
3. Character Limits:
   - **Default: 50 chars** per cell (use for initial scans)
   - **Medium: 100 chars** (when you need more context)
   - **Large: 200 chars** (for longer text fields)
   - **UNLIMITED: Infinity** (for copy-paste operations, full content extraction)
     - Use \`charLimit: Infinity\` to get complete cell content without truncation
     - Example: \`sheet.getColumnData({ columnIndex: 0, charLimit: Infinity })\`
4. Store large results in Vault, don't print to reasoning
5. All parameters use object format: \`{ paramName: value }\`
6. Errors include 💡 suggestions and 📝 examples
```

**AFTER:**
```javascript
**CRITICAL RULES:**
1. ALWAYS call \`sheet.summary()\` first to check dimensions
2. NEVER dump entire sheets - use offset/limit (max 200 rows per call)
3. **Character Limits - CRITICAL DISTINCTION:**
   - **50 chars (PREVIEW MODE)**: Use ONLY when you want to SEE/EXPLORE data structure
     - Purpose: Initial scan, understanding schema, checking data types
     - Example: "What's in this sheet?", "Show me column names"

   - **Infinity (OPERATION MODE)**: Use for ANY actual data work - THIS IS THE DEFAULT FOR OPERATIONS
     - Purpose: Extracting, calculating, processing, copying, analyzing
     - Example: "Get all product names", "Calculate totals", "Find duplicates"
     - Usage: \`sheet.getColumnData({ columnIndex: 0, charLimit: Infinity })\`

   - **100-200 chars (CONTEXTUAL PREVIEW)**: For moderate previews with more visibility
     - Use when long text fields need partial visibility

   **DECISION TREE:**
   - User wants to "see" or "show" data? → charLimit: 50
   - User wants to "extract", "calculate", "process", "find" data? → charLimit: Infinity
   - User wants to "copy", "export", "analyze" data? → charLimit: Infinity

4. **MANDATORY WORKFLOW: ALWAYS scan BEGINNING + END of sheet** (+ MIDDLE if large)
5. Store large results in Vault, don't print to reasoning
6. All parameters use object format: \`{ paramName: value }\`
7. Errors include 💡 suggestions and 📝 examples
```

---

**Change 4.2:** Update Exploration Guide - Add Mandatory Scanning Section (After line 136)

**INSERT AFTER LINE 136 (after "Scan Multiple Sheets" example):**

```javascript
**7. CRITICAL: MANDATORY BEGINNING + END SCANNING**
\`\`\`javascript
// ⚠️ THIS IS MANDATORY FOR ALL DATA EXPLORATION ⚠️
// Never skip this workflow - it's essential for understanding the data

const sheet = attachments.getSheet(0);
const summary = sheet.summary();

// STEP 1: ALWAYS scan BEGINNING (first 10-20 rows)
const beginning = sheet.getRowsAsObjects({
  offset: 0,
  limit: 15,
  charLimit: 50  // Preview mode - just looking
});
console.log('📍 BEGINNING (rows 0-14):', beginning);

// STEP 2: ALWAYS scan END (last 10-20 rows)
const endOffset = Math.max(0, summary.rowCount - 15);
const ending = sheet.getRowsAsObjects({
  offset: endOffset,
  limit: 15,
  charLimit: 50  // Preview mode - just looking
});
console.log(\`📍 END (rows \${endOffset}-\${summary.rowCount - 1}):\`, ending);

// STEP 3: For large datasets (>100 rows), scan MIDDLE too
if (summary.rowCount > 100) {
  const middleOffset = Math.floor(summary.rowCount / 2) - 10;
  const middle = sheet.getRowsAsObjects({
    offset: middleOffset,
    limit: 20,
    charLimit: 50  // Preview mode
  });
  console.log(\`📍 MIDDLE (rows \${middleOffset}-\${middleOffset + 19}):\`, middle);
}

// NOW you understand:
// ✅ Data range and structure
// ✅ Column types and formats
// ✅ Whether data is sorted
// ✅ Presence of headers/footers/summaries
// ✅ Data quality (nulls, empties, inconsistencies)

// STEP 4: Understand user query vs actual data contents
// Match user request to what you found in beginning/end/middle

// STEP 5: If user wants OPERATIONS (not just preview), use Infinity
const userWantsExtraction = true; // Based on query analysis
const userWantsCalculation = false;
const userWantsProcessing = true;

if (userWantsExtraction || userWantsCalculation || userWantsProcessing) {
  // Get COMPLETE data for actual work
  const fullData = sheet.getRowsAsObjects({
    offset: 0,
    limit: summary.rowCount,
    charLimit: Infinity  // ✅ OPERATION MODE - complete data
  });
  vault.set('complete_dataset', fullData);
  console.log(\`✅ Stored \${fullData.length} complete rows in vault:complete_dataset\`);
}
\`\`\`

**WHY THIS MATTERS:**
- Data might have headers in first row, summaries in last row
- Sorted data looks different at beginning vs end
- Large datasets might have different patterns in different sections
- You can't understand data by only looking at the first 10 rows

**FAILURE CASES (what happens if you skip END scanning):**
- ❌ "Find the latest date" → You only checked beginning, latest is at end
- ❌ "Get all unique values" → You missed values that only appear at end
- ❌ "Check if data is sorted" → You can't tell without seeing both ends
- ❌ "Find the total range" → You don't know where data actually ends
\`\`\`

```

---

**Change 4.3:** Update "CHARACTER LIMIT STRATEGY" (Replace lines 139-143)

**BEFORE:**
```javascript
**CHARACTER LIMIT STRATEGY:**
- **50 chars** (default): Initial exploration, understanding structure
- **100 chars**: When you need to see more content (product names, descriptions)
- **200 chars**: For longer text fields (notes, addresses, descriptions)
- **Infinity** (unlimited): For copy-paste, exact data extraction, full content access
```

**AFTER:**
```javascript
**CHARACTER LIMIT STRATEGY (UPDATED):**

**🔍 PREVIEW MODE (charLimit: 50)**
- **When:** You're EXPLORING or LOOKING AT data structure
- **Use for:** "What's in this file?", "Show me the data", "What are the columns?"
- **Purpose:** Understanding schema, checking data types, quick reconnaissance
- ❌ **NEVER use for:** Calculations, extraction, processing, operations

**⚙️ OPERATION MODE (charLimit: Infinity) ← DEFAULT FOR ACTUAL WORK**
- **When:** You're WORKING WITH data (extracting, calculating, processing)
- **Use for:** "Get all X", "Calculate Y", "Find Z", "Extract", "Process", "Analyze"
- **Purpose:** Any actual data operation that produces results
- ✅ **ALWAYS use for:** Real work with data

**📄 CONTEXTUAL PREVIEW (charLimit: 100-200)**
- **When:** Preview needs more context for long text fields
- **Use for:** Descriptions, notes, addresses that get cut off at 50 chars

**DECISION FLOWCHART:**
```
User Query Analysis
     ↓
Contains: "show", "see", "what is", "preview"
     ↓ YES → charLimit: 50 (PREVIEW)
     ↓ NO
     ↓
Contains: "get", "extract", "calculate", "find", "process", "analyze"
     ↓ YES → charLimit: Infinity (OPERATION)
     ↓ NO
     ↓
Default → charLimit: Infinity (when in doubt, get complete data)
```

**EXAMPLES:**
```javascript
// ❌ WRONG - Preview mode used for calculation
const prices = sheet.getColumnData({ columnIndex: 2, charLimit: 50 });
const total = prices.reduce((sum, p) => sum + Number(p), 0); // BROKEN - truncated data!

// ✅ CORRECT - Operation mode for calculation
const prices = sheet.getColumnData({ columnIndex: 2, charLimit: Infinity });
const total = prices.reduce((sum, p) => sum + Number(p || 0), 0); // WORKS

// ✅ CORRECT - Preview first, then operation
const preview = sheet.sliceRows({ limit: 5, charLimit: 50 });
console.log('Preview:', preview); // Quick look

const fullData = sheet.sliceRows({ limit: summary.rowCount, charLimit: Infinity });
vault.set('data', fullData); // Actual work
```
```

---

**Change 4.4:** Update "WHEN TO USE UNLIMITED" (Replace lines 145-166)

**REPLACE ENTIRE SECTION WITH:**

```javascript
**WHEN TO USE charLimit: Infinity - THE COMPLETE GUIDE**

**✅ ALWAYS USE Infinity FOR THESE USER REQUESTS:**

1. **Extraction Requests:**
   - "Get all product names"
   - "Extract email addresses from column B"
   - "Pull out all unique categories"
   - "Retrieve customer IDs"

2. **Calculation Requests:**
   - "Calculate total sales"
   - "Find the average price"
   - "Sum all quantities"
   - "Count unique values"
   - "Get min/max values"

3. **Processing Requests:**
   - "Filter rows where status = 'Active'"
   - "Sort by date"
   - "Group by category"
   - "Remove duplicates"
   - "Find rows containing X"

4. **Comparison Requests:**
   - "Compare Sheet1 vs Sheet2"
   - "Find differences between columns"
   - "Match records with external data"

5. **Export/Copy Requests:**
   - "Generate CSV output"
   - "Create report"
   - "Copy data to vault"
   - "Export filtered results"

6. **Search/Find Requests:**
   - "Find all rows where..."
   - "Search for pattern X"
   - "Locate records matching Y"

**❌ ONLY USE 50 chars FOR THESE CASES:**

1. **Reconnaissance:**
   - "What's in this workbook?"
   - "Show me the structure"
   - "What are the column names?"

2. **Schema Exploration:**
   - "What data types are in column C?"
   - "Are there any null values?" (initial check)
   - "How is the data formatted?"

3. **Quick Preview:**
   - "Show me a few rows"
   - "Give me an example of the data"
   - "What does this sheet look like?"

**REAL-WORLD EXAMPLES:**

\`\`\`javascript
// ❌ WRONG EXAMPLE 1: Using preview for calculations
// User: "What's the total revenue?"
const revenue = sheet.getColumnData({ columnIndex: 5, charLimit: 50 }); // ❌ WRONG
const total = revenue.reduce((a, b) => a + parseFloat(b), 0); // ❌ BROKEN - incomplete data

// ✅ CORRECT EXAMPLE 1: Using operation mode
// User: "What's the total revenue?"
const revenue = sheet.getColumnData({ columnIndex: 5, charLimit: Infinity }); // ✅ CORRECT
const total = revenue.reduce((a, b) => a + parseFloat(b || 0), 0); // ✅ WORKS
console.log(\`Total revenue: $\${total.toFixed(2)}\`);

// ❌ WRONG EXAMPLE 2: Using preview for extraction
// User: "Get all customer emails"
const emails = sheet.getColumnData({ columnIndex: 3, charLimit: 50 }); // ❌ TRUNCATED
vault.set('emails', emails); // ❌ WRONG - emails are cut off!

// ✅ CORRECT EXAMPLE 2: Using operation mode
// User: "Get all customer emails"
const emails = sheet.getColumnData({ columnIndex: 3, charLimit: Infinity }); // ✅ COMPLETE
vault.set('emails', emails); // ✅ CORRECT - full emails
console.log(\`Extracted \${emails.filter(e => e).length} emails\`);

// ✅ CORRECT EXAMPLE 3: Preview THEN operation
// User: "Extract product codes from the data"

// STEP 1: Preview to understand structure (50 chars)
const preview = sheet.getRowsAsObjects({ limit: 10, charLimit: 50 });
console.log('Preview:', preview);
// Determine that column 2 has product codes

// STEP 2: Extract complete data (Infinity)
const productCodes = sheet.getColumnData({
  columnIndex: 2,
  charLimit: Infinity  // ✅ Get complete codes
});
vault.set('product_codes', productCodes);

// ✅ CORRECT EXAMPLE 4: Beginning/End scan + Full read
// User: "Analyze the sales data"

// STEP 1: Scan structure (preview mode)
const beginning = sheet.sliceRows({ offset: 0, limit: 10, charLimit: 50 });
const ending = sheet.sliceRows({
  offset: Math.max(0, summary.rowCount - 10),
  limit: 10,
  charLimit: 50
});
console.log('Data range:', beginning[0], 'to', ending[ending.length - 1]);

// STEP 2: Read complete data for analysis (operation mode)
const fullData = sheet.getRowsAsObjects({
  offset: 0,
  limit: summary.rowCount,
  charLimit: Infinity  // ✅ Complete data for analysis
});
vault.set('sales_data', fullData);
console.log(\`Loaded \${fullData.length} complete records for analysis\`);
\`\`\`

**MEMORY AID:**
```
👀 Peeking at data? → charLimit: 50
⚙️ Working with data? → charLimit: Infinity
❓ Not sure? → charLimit: Infinity (better to have complete data)
```
```

---

**Change 4.5:** Update "BEST PRACTICES" (Replace lines 168-181)

**BEFORE:**
```javascript
**BEST PRACTICES:**
✅ ALWAYS read summary first
✅ ALWAYS sample beginning AND end of sheet
✅ Start with charLimit=50, increase only if needed
✅ Use charLimit: Infinity for copy-paste and exact extraction
✅ Store large results in Vault (use \`vault.set()\`)
✅ Use offset/limit to avoid loading entire sheets
✅ For large datasets (1000+ rows), sample beginning/middle/end

❌ NEVER dump entire sheets to console
❌ NEVER use limit > 200 rows per call
❌ NEVER skip checking the END of the sheet
❌ NEVER assume data is clean - always filter nulls/empties
```

**AFTER:**
```javascript
**BEST PRACTICES (UPDATED & COMPREHENSIVE):**

**✅ DO THIS - CRITICAL WORKFLOW:**
1. **ALWAYS call \`sheet.summary()\` first** - Know dimensions before reading
2. **ALWAYS scan BEGINNING + END** - Mandatory for understanding data structure
   - First 10-20 rows: \`sheet.getRowsAsObjects({ offset: 0, limit: 15, charLimit: 50 })\`
   - Last 10-20 rows: \`sheet.getRowsAsObjects({ offset: rowCount - 15, limit: 15, charLimit: 50 })\`
3. **For large sheets (>100 rows), scan MIDDLE** too - Get complete picture
4. **Use charLimit: 50 ONLY for preview/exploration** - When you're just looking
5. **Use charLimit: Infinity for ANY operation** - Extract, calculate, process, analyze
6. **Store large results in Vault** - Use \`vault.set('name', data)\` instead of console
7. **Use offset/limit pagination** - Max 200 rows per read call
8. **Analyze user query vs data contents** - Match request to what you found in scans

**❌ NEVER DO THIS - CRITICAL MISTAKES:**
1. ❌ **NEVER skip scanning the END** - Data might be sorted, have footers, or summaries
2. ❌ **NEVER use charLimit: 50 for calculations** - Results will be wrong due to truncation
3. ❌ **NEVER use charLimit: 50 for extraction** - You'll get incomplete data
4. ❌ **NEVER dump entire sheets to console** - Use vault storage
5. ❌ **NEVER use limit > 200 rows per call** - Respect API limits
6. ❌ **NEVER assume data is clean** - Always filter nulls, empties, invalid values
7. ❌ **NEVER guess data structure** - Always check beginning AND end
8. ❌ **NEVER skip \`summary()\` call** - You need dimensions first

**🎯 GOLDEN RULES:**
- **Rule 1:** If user wants to SEE data → charLimit: 50
- **Rule 2:** If user wants to WORK WITH data → charLimit: Infinity
- **Rule 3:** ALWAYS scan beginning + end (+ middle if large)
- **Rule 4:** When in doubt, use charLimit: Infinity (complete data is safer)

**📊 WORKFLOW TEMPLATE:**
\`\`\`javascript
// 1. Get dimensions
const sheet = attachments.getSheet(0);
const summary = sheet.summary();

// 2. Scan structure (MANDATORY)
const start = sheet.getRowsAsObjects({ offset: 0, limit: 15, charLimit: 50 });
const end = sheet.getRowsAsObjects({
  offset: Math.max(0, summary.rowCount - 15),
  limit: 15,
  charLimit: 50
});

// 3. Understand data
console.log('Data structure:', { start, end, summary });

// 4. If user needs operations (not just preview), get complete data
if (needsOperation) {
  const fullData = sheet.getRowsAsObjects({
    offset: 0,
    limit: summary.rowCount,
    charLimit: Infinity  // ✅ Complete data
  });
  vault.set('dataset', fullData);
}
\`\`\`
```

---

### **PHASE 5: System Instructions - DataVault References** ✅ Safe (Prompt Only)

#### **File: `/js/config/app-config.js`**

**Change 5.1:** Update Task & Goal Lifecycle (Replace lines 124-130)

**BEFORE:**
```javascript
## TASK & GOAL LIFECYCLE

- Create tasks as soon as you identify discrete workstreams; include heading, purpose, and completion criteria. Status must progress \`pending -> ongoing -> finished\` (or \`paused\` when blocked).
- Only run one task at a time. If new work appears, enqueue it as a new task instead of context-switching silently.
- Goals capture strategic success criteria and validation checkpoints. Update them when requirements evolve and reference them when verifying completion.
- Use Memory for durable context (insights, assumptions, constraints) and the DataVault for bulky artefacts (datasets, code, transcripts) so tasks/goals stay lean.
```

**AFTER:**
```javascript
## TASK & GOAL LIFECYCLE

- Create tasks as soon as you identify discrete workstreams; include heading, purpose, and completion criteria. Status must progress \`pending -> ongoing -> finished\` (or \`paused\` when blocked).
- **CRITICAL: When creating Tasks or Goals that use DataVault data, ALWAYS include vault reference names in the heading or notes.**
  - Format: \`heading="Analyze sales data [vault:q4_sales]"\` or \`notes="Using vault:customer_list for processing"\`
  - This prevents you from forgetting which vault entries are relevant to each task/goal
  - Include ALL relevant vault references, especially for complex multi-step tasks
  - Example: \`heading="Compare datasets [vault:2024_data, vault:2023_data]"\`
- Only run one task at a time. If new work appears, enqueue it as a new task instead of context-switching silently.
- Goals capture strategic success criteria and validation checkpoints. Update them when requirements evolve and reference them when verifying completion.
- **When referencing data in Tasks/Goals, cite vault entries:** "Extract top 10 products from [vault:sales_data]" or "Validate pricing using [vault:price_matrix]"
- Use Memory for durable context (insights, assumptions, constraints) and the DataVault for bulky artefacts (datasets, code, transcripts) so tasks/goals stay lean.
```

---

**Change 5.2:** Update Task Tool Documentation (Update lines 141-144)

**BEFORE:**
```javascript
### Task Tool
- **Format**: \`{{<task identifier="task_id" heading="Title" content="Work description" status="pending|ongoing|finished|paused" notes="Progress" />}}\`
- **Operations**: Create/update via the same identifier; include status transitions and progress notes; add \`delete\` only when archiving.
- **Requirement**: Reflect the active task's status each iteration so progress is transparent.
```

**AFTER:**
```javascript
### Task Tool
- **Format**: \`{{<task identifier="task_id" heading="Title" content="Work description" status="pending|ongoing|finished|paused" notes="Progress" />}}\`
- **Operations**: Create/update via the same identifier; include status transitions and progress notes; add \`delete\` only when archiving.
- **Requirement**: Reflect the active task's status each iteration so progress is transparent.
- **DataVault Reference Requirement (CRITICAL):**
  - If task uses vault data, **MUST include vault reference** in heading or notes
  - Format: \`heading="Process customer data [vault:customers]"\` or \`notes="Using vault:sales_q4 for analysis"\`
  - For multiple vault items: \`heading="Merge datasets [vault:data1, vault:data2]"\`
  - This ensures you remember which vault entries are relevant when resuming work
  - **Include the MOST IMPORTANT vault references** - not all, just the critical ones
```

---

**Change 5.3:** Update Goal Tool Documentation (Update lines 146-149)

**BEFORE:**
```javascript
### Goal Tool
- **Format**: \`{{<goal identifier="goal_id" heading="Success Criteria" content="Objectives" notes="Validation plan" />}}\`
- **Operations**: Create/update via the same identifier; add \`delete\` when retiring a goal.
- **Use Cases**: Describe measurable end states and how they will be validated.
```

**AFTER:**
```javascript
### Goal Tool
- **Format**: \`{{<goal identifier="goal_id" heading="Success Criteria" content="Objectives" notes="Validation plan" />}}\`
- **Operations**: Create/update via the same identifier; add \`delete\` when retiring a goal.
- **Use Cases**: Describe measurable end states and how they will be validated.
- **DataVault Reference Requirement (CRITICAL):**
  - If goal validation requires vault data, **MUST cite vault entries**
  - Format: \`content="Validate model using [vault:test_data]"\` or \`notes="Baseline in vault:benchmark"\`
  - For complex goals: \`content="Accuracy >95% on [vault:test_set], F1 >0.9 vs [vault:baseline]"\`
  - This ensures validation criteria reference the correct data sources
  - **Include the MOST IMPORTANT vault references** that define success metrics
```

---

## ✅ VERIFICATION CHECKLIST

After implementation, verify each phase:

### **Phase 1: Collapsible Sections**
- [ ] Reasoning Log section has collapse toggle button in header
- [ ] Code Execution section has collapse toggle button in header
- [ ] Clicking toggle collapses/expands section smoothly
- [ ] Toggle button shows `−` when expanded, `+` when collapsed
- [ ] `.collapsed` class is applied to parent `.block` element
- [ ] Block body (`#reasoningLogBody`, `#codeExecutionBody`) hides when collapsed

### **Phase 2: Attachment Icons**
- [ ] Download Original button shows 📥 icon
- [ ] Download Working button shows 💾 icon
- [ ] Reset button shows 🔄 icon
- [ ] Remove button shows 🗑️ icon
- [ ] All icons are larger than before (1.125rem / 18px)
- [ ] Icon spacing and alignment looks clean
- [ ] Tooltips are updated and descriptive

### **Phase 3: Reasoning Display**
- [ ] Reasoning blocks have clear borders and left accent
- [ ] Even/odd iterations have different backgrounds
- [ ] Reasoning blocks (blue), execution (green), vault (purple) have correct colors
- [ ] Iteration badges are visible and styled correctly
- [ ] Code execution blocks have color-coded borders (CODE=blue, OUTPUT=green, ERROR=red)
- [ ] Activity icons are 1.25rem and clearly visible
- [ ] Status badges (✓/✗) are styled correctly
- [ ] Error messages have proper red styling and layout
- [ ] No visual overlap or merged blocks

### **Phase 4: Excel Prompts**
- [ ] API Reference mentions "PREVIEW MODE" vs "OPERATION MODE"
- [ ] Character limit decision tree is present
- [ ] Exploration Guide includes mandatory beginning/end scanning section
- [ ] Examples show correct `charLimit: Infinity` usage
- [ ] "WHEN TO USE" section has comprehensive examples
- [ ] Best practices clearly distinguish 50 vs Infinity
- [ ] Warning about calculation errors with truncated data

### **Phase 5: System Instructions**
- [ ] Task & Goal Lifecycle section mentions vault reference requirement
- [ ] Task Tool documentation includes vault reference format and examples
- [ ] Goal Tool documentation includes vault reference format and examples
- [ ] Examples show proper citation format: `[vault:name]`

---

## 📊 IMPLEMENTATION SUMMARY

### **Files Modified:** 3
1. `/index.html` - UI structure (collapsible sections, button icons)
2. `/styles.css` - Visual styling (reasoning blocks, execution blocks, icons)
3. `/js/reasoning/context/providers/attachments-provider.js` - Excel API prompts
4. `/js/config/app-config.js` - System instructions (vault references)

### **Lines of Code:**
- HTML: ~20 lines modified
- CSS: ~350 lines added
- JS (Prompts): ~400 lines modified/added
- Total: ~770 lines changed

### **Risk Assessment:**
- ✅ **Low Risk:** Collapsible sections (existing system)
- ✅ **Low Risk:** Button icon changes (cosmetic)
- ⚠️ **Medium Risk:** CSS styling (new classes, test thoroughly)
- ✅ **Safe:** Prompt updates (no code changes, only documentation)

### **Breaking Changes:**
- ❌ **None** - All changes are additive or clarifications

### **Testing Strategy:**
1. **Manual Visual Testing:** Load app, verify all styling changes
2. **Interaction Testing:** Click toggles, verify collapse/expand
3. **Excel API Testing:** Test with real workbook, verify `charLimit` behavior
4. **Prompt Verification:** Review generated context, check vault references in tasks/goals

---

## 🎯 EXPECTED OUTCOMES

### **User Experience:**
1. **Better Organization:** Collapsible sections reduce visual clutter
2. **Clearer UI:** Self-explanatory icons reduce confusion
3. **Better Readability:** Proper borders and styling make reasoning logs easy to follow
4. **Visual Hierarchy:** Color-coded blocks help distinguish different activities

### **LLM Behavior:**
1. **Correct Excel Usage:** LLM will use `charLimit: Infinity` for operations
2. **Better Data Understanding:** Mandatory beginning/end scanning workflow
3. **Fewer Errors:** Clear distinction between preview and operation modes
4. **Better Context:** Vault references in tasks/goals prevent forgetting data sources

---

## 📝 APPROVAL REQUIRED

**Please review this plan and confirm approval before implementation begins.**

**Review Areas:**
1. ✅ UI changes align with design goals
2. ✅ Excel API documentation is clear and correct
3. ✅ System instruction updates are appropriate
4. ✅ No breaking changes or risky modifications
5. ✅ All requested features are addressed

**Sign-off:** _________________________
**Date:** _________________________

---

## 🚀 POST-IMPLEMENTATION

After approval and implementation:
1. Test all collapsible sections
2. Verify visual styling in browser
3. Test Excel API with sample workbook
4. Monitor LLM behavior for correct `charLimit` usage
5. Check that tasks/goals include vault references
6. Commit changes with descriptive message
7. Push to branch: `claude/improve-ui-logs-excel-api-011CUx6qFQWagMVkY61Bou31`

---

**END OF IMPLEMENTATION PLAN**
