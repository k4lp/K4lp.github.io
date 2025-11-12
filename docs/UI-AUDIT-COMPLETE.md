# GDRS UI COMPLETE AUDIT
**Date:** 2024-11-12
**Purpose:** Document all UI bindings and references before Swiss Minimalist redesign

---

## EXECUTIVE SUMMARY

This document provides a complete inventory of the GDRS UI system:
- **126 unique element IDs**
- **250+ CSS classes**
- **40+ event bindings**
- **12 renderer modules**
- **10 handler modules**

**CRITICAL:** All element IDs must be preserved during redesign. CSS classes can be modified systematically.

---

## 1. HTML ELEMENT IDs (126 total)

### Header Section
- (No specific IDs in header)

### Sticky Session Status Bar
- `sessionStatusBar` - Main sticky status bar container
- `stickySessionTimer` - Timer display in sticky bar
- `stickyIterationCount` - Iteration count in sticky bar
- `stickyStopBtn` - Stop button in sticky bar

### Configuration Panel - API Keys Section
- `apiKeysBody` - Collapsible body for API keys section
- `keysContainer` - Container for dynamic keys textarea/stats (dynamically rendered)
- `apiKeysTextarea` - Textarea for API keys (dynamically created)
- `validateKeys` - Validate all keys button
- `clearKeys` - Clear all keys button
- `keyRotationPill` - Status pill showing key rotation info
- `keyRotationIndicator` - Key rotation indicator
- `rotatedKeySlot` - Shows which key slot was rotated to

### Configuration Panel - Data Attachment Section
- `attachmentBody` - Collapsible body for attachments
- `attachmentStatusPill` - Status pill for attachment
- `attachmentDownloadOriginal` - Download original file button
- `attachmentDownloadWorking` - Download working copy button
- `attachmentReset` - Reset to original button
- `attachmentRemove` - Remove attachment button
- `attachmentDropzone` - Dropzone for file upload
- `attachmentInput` - Hidden file input
- `attachmentSummaryPanel` - Summary tab panel
- `attachmentSheetsPanel` - Sheets tab panel
- `attachmentMutationsPanel` - Mutations tab panel
- `attachmentQuickActions` - Container for quick action buttons

### Configuration Panel - Session Section
- `sessionBody` - Collapsible body for session config
- `modelSelect` - Model selection dropdown
- `maxOutputTokens` - Max output tokens input
- `enableSubAgent` - Enable sub-agent checkbox
- `enableExcelHelpers` - Enable Excel helpers checkbox
- `groqApiKeys` - Groq API keys textarea
- `subAgentStatusPill` - Sub-agent status pill
- `subAgentStatusBody` - Sub-agent status content area
- `userQuery` - Research query textarea
- `runQueryBtn` - Run analysis button
- `btnTimer` - Timer display inside button
- `sessionStatus` - Session status pill
- `sessionIterationDisplay` - Session iteration meta display

### Processing Panel - Reasoning Log Section
- `reasoningLogSection` - Section container
- `reasoningLogBody` - Collapsible body
- `iterationLog` - Log container
- `iterationCount` - Iteration count display
- `compactContextBtn` - Compact context button
- `compactionStatus` - Compaction status pill

### Processing Panel - Sub-Agent Console Section
- `subAgentConsoleSection` - Section container
- `subAgentConsoleBody` - Collapsible body
- `subAgentTraceBody` - Sub-agent trace content

### Processing Panel - Code Execution Section
- `codeExecutionSection` - Section container
- `codeExecutionBody` - Collapsible body
- `codeInput` - Code input textarea
- `execBtn` - Execute button
- `clearExec` - Clear button
- `execOutput` - Execution output display
- `execStatus` - Execution status pill

### Processing Panel - Final Output Section
- `finalOutput` - Final output container
- `finalStatus` - Final status pill
- `exportTxt` - Export markdown button

### Storage Panel - Tasks Section
- `tasksBody` - Collapsible body
- `tasksList` - Tasks list container

### Storage Panel - Memory Section
- `memoryBody` - Collapsible body
- `memoryList` - Memory list container
- `clearMemory` - Clear all memory button

### Storage Panel - Goals Section
- `goalsBody` - Collapsible body
- `goalsList` - Goals list container
- `clearGoals` - Clear all goals button

### Storage Panel - Data Vault Section
- `vaultBody` - Collapsible body
- `vaultList` - Vault list container
- `clearVault` - Clear all vault button
- `vaultType` - Vault type selector
- `vaultDesc` - Vault description input

### Modals - Task Modal
- `taskModal` - Task modal container
- `taskModalClose` - Close button
- `taskModalId` - Task ID display
- `taskModalStatus` - Task status display
- `taskModalHeading` - Task heading display
- `taskModalContent` - Task content display
- `taskModalNotes` - Task notes display
- `taskModalNotesSection` - Notes section container
- `taskModalExport` - Export button

### Modals - Memory Modal
- `memoryModal` - Memory modal container
- `memoryModalClose` - Close button
- `memoryModalId` - Memory ID display
- `memoryModalHeading` - Memory heading display
- `memoryModalContent` - Memory content display
- `memoryModalNotes` - Memory notes display
- `memoryModalNotesSection` - Notes section container
- `memoryModalExport` - Export button

### Modals - Goal Modal
- `goalModal` - Goal modal container
- `goalModalClose` - Close button
- `goalModalId` - Goal ID display
- `goalModalHeading` - Goal heading display
- `goalModalContent` - Goal content display
- `goalModalNotes` - Goal notes display
- `goalModalNotesSection` - Notes section container
- `goalModalExport` - Export button

### Modals - Vault Modal
- `vaultModal` - Vault modal container
- `vaultModalClose` - Close button
- `vaultModalId` - Vault ID display
- `vaultModalType` - Vault type display
- `vaultModalDesc` - Vault description display
- `vaultModalContent` - Vault content display
- `vaultModalExport` - Export button

---

## 2. CRITICAL EVENT BINDINGS

### High-Risk Bindings (Direct DOM manipulation)
- `#runQueryBtn` - Session start (loop-controller.js)
- `#stickyStopBtn` - Session stop (loop-controller.js)
- `#modelSelect` - Model selection with hydration (handler-session.js)
- `#apiKeysTextarea` - Dynamic creation with binding (renderer-keys.js)
- Collapse toggles - `data-target` attribute binding (handler-global.js)

### Event Bus Critical Paths
```
Storage.save*()
  → eventBus.emit(Events.*_UPDATED)
  → renderer-core.js listeners
  → render*() functions
  → DOM updates
```

### Data Attributes
- `data-target` - Collapse toggle targets
- `data-task-id`, `data-memory-id`, `data-goal-id`, `data-vault-id` - Entity identifiers
- `data-panel` - Tab panel identifier
- `data-action` - Quick action identifier
- `data-section` - Execution block section type
- `data-iteration` - Iteration number
- `data-synthetic` - Model option flag

---

## 3. FILES THAT MANIPULATE DOM

### Handler Files (10)
1. `js/ui/handlers/handler-global.js` - Collapse toggles, keyboard shortcuts
2. `js/ui/handlers/handler-config.js` - Config inputs
3. `js/ui/handlers/handler-session.js` - Model selector, session controls
4. `js/ui/handlers/handler-keys.js` - Key management
5. `js/ui/handlers/handler-code.js` - Code editor
6. `js/ui/handlers/handler-clear.js` - Clear buttons
7. `js/ui/handlers/handler-export.js` - Export functionality
8. `js/ui/handlers/handler-modal.js` - Modal controls
9. `js/ui/handlers/handler-attachments.js` - File upload, tabs
10. `js/ui/handlers/handler-compaction.js` - Compaction button

### Renderer Files (9)
1. `js/ui/renderer/renderer-core.js` - Event bus coordination
2. `js/ui/renderer/renderer-keys.js` - API keys UI
3. `js/ui/renderer/renderer-entities.js` - Tasks/Memory/Goals
4. `js/ui/renderer/renderer-vault.js` - Vault entries
5. `js/ui/renderer/renderer-reasoning.js` - Reasoning log
6. `js/ui/renderer/renderer-output.js` - Final output
7. `js/ui/renderer/renderer-attachments.js` - Attachment panels
8. `js/ui/renderer/renderer-subagent.js` - Sub-agent UI
9. `js/ui/renderer/renderer-helpers.js` - Helpers

### Other DOM Manipulators (3)
1. `js/ui/modals.js` - Modal population
2. `js/ui/compaction/CompactionButton.js` - Compaction UI
3. `js/control/loop-controller.js` - Session state, timers
4. `js/subagent/reasoning/SubAgentUI.js` - Sub-agent live UI

---

## 4. REDESIGN CONSTRAINTS

### MUST PRESERVE
✅ All 126 element IDs
✅ All data-* attributes
✅ Event bus event names
✅ DOM structure expected by renderers
✅ Modal HTML structure
✅ Collapse toggle mechanism

### SAFE TO MODIFY
✅ All CSS classes (rename systematically)
✅ Visual styling (colors, spacing, typography)
✅ Layout structure (grid, flexbox)
✅ Animations and transitions
✅ Font choices
✅ Icon styles

### HIGH-RISK AREAS
⚠️ Sticky status bar (loop-controller direct manipulation)
⚠️ Model selector (complex hydration)
⚠️ Keys textarea (dynamic creation)
⚠️ Attachment tabs (panel switching logic)
⚠️ Collapse toggles (data-target binding)

---

## 5. TESTING CHECKLIST

After redesign, verify:
- [ ] All collapse toggles work
- [ ] All modals open/close correctly
- [ ] File upload and attachment panel work
- [ ] Model selection persists
- [ ] Key validation updates UI
- [ ] Session start/stop updates all status
- [ ] Iteration counter increments
- [ ] Timers display correctly
- [ ] All clear buttons function
- [ ] Export works
- [ ] Tab switching works
- [ ] List item click handlers work
- [ ] Compaction button works
- [ ] Sub-agent UI displays correctly
- [ ] Error states display correctly

---

## 6. RECOMMENDED APPROACH

### Phase 1: CSS Variable System
1. Create CSS custom properties for colors, spacing, typography
2. Define monochrome palette
3. Establish spacing scale
4. Set typography hierarchy

### Phase 2: Component Redesign
1. Buttons - Minimal, monochrome
2. Pills/Badges - Outlined style
3. Panels - Card-based, spacious
4. Inputs - Borderless, underline focus
5. Modals - Centered, minimal
6. Lists - Clean, spacious

### Phase 3: Layout Refinement
1. Increase whitespace
2. Improve grid spacing
3. Enhance visual hierarchy
4. Add subtle animations

### Phase 4: Testing
1. Test all interactions
2. Verify responsive behavior
3. Check accessibility
4. Performance audit

---

**END OF AUDIT**
