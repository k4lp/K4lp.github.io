# UI REDESIGN PLAN
## GDRS - Swiss Design Minimalist Monochrome Redesign

**Created:** 2025-11-10
**Status:** IN PROGRESS
**Design Principles:** Swiss Design, Minimalist, Monochrome, Proper Hierarchy, Geist/Geist Mono fonts only

---

## 1. PROJECT STRUCTURE ANALYSIS

### Files Identified
- **HTML:** `/index.html` (543 lines)
- **CSS:** `/styles.css` (2171 lines)
- **JS UI Components:** 21 files in `/js/ui/`

---

## 2. CRITICAL DOM ELEMENT REFERENCES

### ⚠️ MUST PRESERVE - JavaScript Dependencies

#### **API Keys Section**
- `#keysContainer` - Container for key input/stats
- `#apiKeysTextarea` - Textarea for API key input
- `#validateKeys` - Validate all keys button
- `#clearKeys` - Clear all keys button
- `#keyRotationPill` - Status pill showing key rotation
- `#keyRotationIndicator` - Rotation indicator with slot number
- `#rotatedKeySlot` - Span showing rotated key slot

#### **Data Attachment Section**
- `#attachmentBody` - Main attachment container
- `#attachmentDropzone` - Drag/drop zone for files
- `#attachmentInput` - Hidden file input
- `#attachmentStatusPill` - Status pill (NONE/LOADED/etc)
- `#attachmentDownloadOriginal` - Download original file button
- `#attachmentDownloadWorking` - Download working copy button
- `#attachmentReset` - Reset to original button
- `#attachmentRemove` - Remove attachment button
- `.attachment-tab` - Tab buttons (class selector)
- `.attachment-tab[data-panel]` - Tab buttons with data attribute
- `#attachmentSummaryPanel` - Summary tab panel
- `#attachmentSheetsPanel` - Sheets tab panel
- `#attachmentMutationsPanel` - Mutations tab panel
- `#attachmentQuickActions` - Quick actions container
- `button[data-action]` - Quick action buttons

#### **Session Configuration**
- `#sessionBody` - Session configuration body
- `#modelSelect` - Model dropdown selector
- `#maxOutputTokens` - Max output tokens input
- `#enableSubAgent` - Enable sub-agent checkbox
- `#enableExcelHelpers` - Enable Excel helpers checkbox
- `#groqApiKeys` - Groq API keys textarea
- `#subAgentStatusPill` - Sub-agent status pill
- `#subAgentStatusBody` - Sub-agent status body
- `#userQuery` - Research query textarea
- `#runQueryBtn` - Run analysis button
- `#btnTimer` - Button timer display
- `#sessionStatus` - Session status pill (IDLE/RUNNING)
- `#sessionIterationDisplay` - Iteration display

#### **Sticky Session Status Bar**
- `#sessionStatusBar` - Sticky status bar container
- `#stickySessionTimer` - Timer in sticky bar
- `#stickyIterationCount` - Iteration count in sticky bar
- `#stickyStopBtn` - Stop button in sticky bar

#### **Reasoning Log**
- `#reasoningLogSection` - Reasoning log section
- `#reasoningLogBody` - Reasoning log body
- `#iterationLog` - Iteration log container
- `#iterationCount` - Iteration count display

#### **Sub-Agent Console**
- `#subAgentConsoleSection` - Sub-agent console section
- `#subAgentConsoleBody` - Sub-agent console body
- `#subAgentTraceBody` - Sub-agent trace container

#### **Code Execution**
- `#codeExecutionSection` - Code execution section
- `#codeExecutionBody` - Code execution body
- `#codeInput` - Code textarea
- `#lineNumbers` - Line numbers display (if exists)
- `#execBtn` - Execute button
- `#clearExec` - Clear execution button
- `#execStatus` - Execution status pill
- `#execOutput` - Console output pre element

#### **Final Output**
- `#finalOutput` - Final output container
- `#finalStatus` - Final output status pill
- `#exportTxt` - Export markdown button

#### **Storage Sections**
- `#tasksBody` - Tasks section body
- `#tasksList` - Tasks list container
- `[data-task-id]` - Task list items with data attribute
- `#memoryBody` - Memory section body
- `#memoryList` - Memory list container
- `[data-memory-id]` - Memory list items with data attribute
- `#clearMemory` - Clear memory button
- `#goalsBody` - Goals section body
- `#goalsList` - Goals list container
- `[data-goal-id]` - Goal list items with data attribute
- `#clearGoals` - Clear goals button
- `#vaultBody` - Vault section body
- `#vaultList` - Vault list container
- `[data-vault-id]` - Vault list items with data attribute
- `#clearVault` - Clear vault button
- `#vaultType` - Vault type selector
- `#vaultDesc` - Vault description input

#### **Modals**
- `#taskModal` - Task modal container
- `#taskModalClose` - Task modal close button
- `#taskModalId`, `#taskModalStatus`, `#taskModalHeading`, `#taskModalContent`, `#taskModalNotes`, `#taskModalExport` - Task modal elements
- `#taskModalNotesSection` - Task modal notes section
- `#memoryModal` - Memory modal container
- `#memoryModalClose` - Memory modal close button
- `#memoryModalId`, `#memoryModalHeading`, `#memoryModalContent`, `#memoryModalNotes`, `#memoryModalExport` - Memory modal elements
- `#memoryModalNotesSection` - Memory modal notes section
- `#goalModal` - Goal modal container
- `#goalModalClose` - Goal modal close button
- `#goalModalId`, `#goalModalHeading`, `#goalModalContent`, `#goalModalNotes`, `#goalModalExport` - Goal modal elements
- `#goalModalNotesSection` - Goal modal notes section
- `#vaultModal` - Vault modal container
- `#vaultModalClose` - Vault modal close button
- `#vaultModalId`, `#vaultModalType`, `#vaultModalDesc`, `#vaultModalContent`, `#vaultModalExport` - Vault modal elements

#### **Global Elements**
- `#app` - Main app container
- `.collapse-toggle` - All collapse toggle buttons (class selector)
- `[data-target]` - Elements with collapse targets
- `.modal-overlay` - Modal overlay elements
- `body.session-active` - Body class when session is active

---

## 3. CSS CLASS ANALYSIS

### Current Class Structure
- `.container-header`, `.container-main` - Layout containers
- `.panel`, `.panel-config`, `.panel-process`, `.panel-storage` - Main panels
- `.block`, `.block-header`, `.block-body`, `.block-meta` - Section blocks
- `.collapsible`, `.collapsed` - Collapsible sections
- `.field`, `.field-with-suffix`, `.field-hint` - Form fields
- `.checkbox-field`, `.checkbox-label` - Checkboxes
- `.btn`, `.btn-primary`, `.btn-lg`, `.btn-sm`, `.btn-danger`, `.btn-icon`, `.btn-with-timer`, `.btn-timer` - Buttons
- `.pill`, `.pill-muted`, `.pill-success`, `.pill-warning` - Status pills
- `.status`, `.status-badge-compact` - Status badges
- `.list`, `.li` - List items
- `.log`, `.log-placeholder` - Logs
- `.output`, `.output-placeholder` - Output displays
- `.storage-placeholder` - Storage placeholders
- `.code-editor`, `.console`, `.console-label` - Code execution
- `.reasoning-block`, `.reasoning-entry`, `.reasoning-text`, `.reasoning-content` - Reasoning displays
- `.tool-activity`, `.activity-header`, `.activity-result`, `.activity-body`, `.activity-error` - Tool activities
- `.execution-block` - Execution blocks with data-section attributes
- `.markdown-body` - Markdown rendering
- `.modal`, `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-close` - Modals
- `.session-status-bar`, `.status-bar-content`, `.status-indicator`, `.status-timer` - Sticky status bar
- Attachment classes: `.attachment-dropzone`, `.attachment-tabs`, `.attachment-tab`, `.attachment-panel`, `.attachment-quick-actions`, `.stats-grid`, `.stat-card`, `.sheet-card`, `.mutations-list`, `.mutation-item`

---

## 4. DESIGN SYSTEM SPECIFICATION

### Color Palette (Already Defined in CSS)
```css
--black: #000000
--gray-900 to --gray-50: Monochrome scale
--white: #ffffff
Subtle state colors: info, success, warning, error (very subtle backgrounds)
```

### Typography (Already Using Geist)
```css
--font-sans: 'Geist'
--font-mono: 'Geist Mono'
```

### Spacing Scale (Already Defined)
```css
--space-xs: 4px
--space-sm: 8px
--space-md: 16px
--space-lg: 24px
--space-xl: 32px
--space-2xl: 48px
--space-3xl: 64px
```

### Border System
```css
--border-width: 1px
--border-radius: 0 (Swiss minimalism = no border radius)
```

---

## 5. CURRENT ISSUES IDENTIFIED

### Layout Issues
1. ❌ Header height fixed at 64px - could be more compact
2. ❌ Panel widths at 340px may not be optimal for Swiss design grid
3. ❌ Sticky status bar uses bright green (#00ff00) - too vibrant for monochrome
4. ❌ Mixed use of borders (1px, 2px, 3px, 4px) - needs consistency
5. ❌ Some rounded corners in specific elements (border-radius used in pills, modals)
6. ❌ Inconsistent spacing between sections

### Typography Issues
1. ✅ Fonts already correct (Geist/Geist Mono)
2. ❌ Font sizes could follow more systematic scale
3. ❌ Line heights need review for optimal readability
4. ❌ Letter spacing inconsistent across elements

### Color Issues
1. ❌ Bright accent colors used (green #00ff00, bright blues, oranges) - not monochrome
2. ❌ Gradient backgrounds in reasoning blocks - not minimal
3. ❌ Colored borders by type - should be monochrome with subtle highlights
4. ❌ Console uses bright green border-left

### Hierarchy Issues
1. ❌ Visual hierarchy not always clear
2. ❌ Similar visual weight for different importance levels
3. ❌ Collapse toggles could be more minimal
4. ❌ Section headers need better distinction

---

## 6. REDESIGN STRATEGY

### Phase 1: Color System Refinement
- [ ] Replace all bright accent colors with monochrome alternatives
- [ ] Use gray-scale for all borders (gray-200, gray-300, gray-900)
- [ ] Replace status bar green with white/gray
- [ ] Remove gradient backgrounds
- [ ] Keep ONLY subtle gray-based state colors where absolutely necessary
- [ ] Console output: replace green with gray-100 or white

### Phase 2: Spacing & Layout Optimization
- [ ] Reduce header height to 56px for more compact design
- [ ] Standardize ALL borders to 1px (except emphasis borders which stay 2px)
- [ ] Review panel widths for better grid alignment
- [ ] Ensure consistent vertical rhythm using spacing scale
- [ ] Remove all border-radius to maintain Swiss minimalism

### Phase 3: Typography Hierarchy
- [ ] Establish clear type scale (5-6 levels max)
- [ ] H1: 24px (brand only)
- [ ] H2: 11px uppercase (section headers)
- [ ] H3: 14px (modal headers)
- [ ] H4: 11px uppercase (subsections)
- [ ] Body: 13px
- [ ] Small: 10-11px (meta, hints)
- [ ] Mono: 11px (code, data)
- [ ] Review and fix line-heights for optimal reading
- [ ] Standardize letter-spacing

### Phase 4: Component Refinement
- [ ] Buttons: simplify hover states, remove bright colors
- [ ] Pills: ensure monochrome, use borders for distinction
- [ ] Status indicators: gray-scale states only
- [ ] Lists: enhance borders for clarity
- [ ] Modals: ensure proper hierarchy
- [ ] Collapse toggles: make more minimal

### Phase 5: Visual Hierarchy Enhancement
- [ ] Emphasize primary actions with heavier borders
- [ ] Use whitespace to create breathing room
- [ ] Section separators: consistent 1px gray-200 lines
- [ ] Ensure panel backgrounds create subtle depth (white vs gray-50)

---

## 7. IMPLEMENTATION CHECKLIST

### CSS Updates Required
- [x] Review root variables
- [x] Update color usage throughout
- [x] Standardize border widths
- [x] Remove all border-radius
- [x] Fix typography scale
- [x] Refine button styles
- [x] Update pill/status styles
- [x] Fix console/execution block colors
- [x] Remove gradients from reasoning blocks
- [x] Update modal styles
- [x] Fix sticky status bar colors
- [x] Refine responsive breakpoints

### CSS Changes Completed (2025-11-10)
✅ Replaced all bright accent colors (#00ff00, #ff4444, etc.) with monochrome
✅ Changed state colors (info, success, warning, error) to gray-scale
✅ Updated sticky status bar from bright green to white/gray
✅ Removed all box-shadows except minimal modal shadow
✅ Removed text-shadow from status timer
✅ Changed status indicator from circle to square
✅ Standardized all 3px/4px borders to 2px (--border-emphasis)
✅ Removed all border-radius (kept at 0 for Swiss minimalism)
✅ Replaced gradients in reasoning blocks with solid backgrounds
✅ Updated execution block colors to monochrome
✅ Fixed error/warning text colors to gray-scale
✅ Updated all button styles to use monochrome hover states
✅ Simplified button animations (removed scale transforms)
✅ Updated attachment dropzone dragover state to monochrome
✅ Fixed stat-card highlight colors
✅ Updated select dropdown arrow to use black stroke
✅ Removed running pulse glow effect, replaced with opacity animation

### HTML Updates Required
- [ ] Review semantic structure
- [ ] Ensure proper heading hierarchy
- [ ] Check for unnecessary wrapper divs
- [ ] Verify accessibility attributes
- [ ] **CRITICAL:** Do NOT change any IDs or critical classes used by JS

### Testing Requirements
- [ ] Verify all buttons work
- [ ] Test collapsible sections
- [ ] Check modal open/close
- [ ] Verify file attachment upload
- [ ] Test code execution
- [ ] Check session start/stop
- [ ] Verify data storage (tasks, memory, goals, vault)
- [ ] Test responsive layout
- [ ] Check all keyboard shortcuts
- [ ] Verify sub-agent panel
- [ ] Test attachment tabs switching

---

## 8. DISCOVERY LOG (Living Document)

### 2025-11-10 - Initial Scan
- ✅ Identified all HTML structure
- ✅ Located all CSS rules
- ✅ Mapped all JS UI handlers
- ✅ Documented critical DOM dependencies
- 📝 Found 100+ element IDs used by JavaScript
- 📝 CSS already has solid Swiss design foundation
- 📝 Main issues: bright colors, inconsistent borders, subtle hierarchy problems

### New Discoveries (To be updated as found)
- 📝 Found additional selectors in loop-controller.js: `.btn-text`, `.btn-timer` (querySelector usage)
- 📝 Confirmed sticky timer elements: `#stickySessionTimer`, `#btnTimer`, `#stickyIterationCount`
- 📝 Body class manipulation: `body.session-active` added/removed dynamically
- 📝 All critical DOM references documented (100+ elements)
- 📝 No blocking issues found - safe to proceed with CSS redesign

---

## 9. CRITICAL SAFETY RULES

### ⚠️ ABSOLUTE MUST-PRESERVE
1. **NEVER** change element IDs - JS depends on them
2. **NEVER** remove classes that JS queries (.collapse-toggle, .attachment-tab, .li, etc.)
3. **NEVER** change data-attributes (data-target, data-panel, data-task-id, data-memory-id, data-goal-id, data-vault-id, data-action, data-section)
4. **NEVER** change input/textarea/select/button IDs
5. **NEVER** restructure modal HTML significantly
6. **PRESERVE** all event-critical elements

### ✅ SAFE TO MODIFY
1. Visual styling (colors, spacing, borders, fonts)
2. CSS classes for appearance only
3. Non-functional wrapper divs (after verification)
4. Typography (sizes, weights, line-heights)
5. Layout (flexbox, grid properties)
6. Transitions and animations

---

## 10. NEXT STEPS

1. Complete JS reference audit (remaining files)
2. Create refined CSS with all changes
3. Make minimal HTML adjustments if needed
4. Test thoroughly
5. Commit and push to branch

---

**End of Plan - Will be updated as discoveries are made**
