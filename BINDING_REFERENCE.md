# UI Binding Reference Document

## Critical Element IDs and Classes
**DO NOT MODIFY THESE IDs** - JavaScript depends on them

---

## Element IDs (Must Preserve)

### API Keys Section
- `#keysContainer` - Container for keys textarea and stats (dynamically populated)
- `#apiKeysTextarea` - Textarea for entering API keys (created dynamically)
- `#validateKeys` - Button to validate all keys
- `#clearKeys` - Button to clear all keys
- `#keyRotationPill` - Status pill showing next key rotation info
- `#keyRotationIndicator` - Key rotation indicator (hidden by default)
- `#rotatedKeySlot` - Span showing which key slot was rotated to

### Session Configuration
- `#modelSelect` - Dropdown for model selection
- `#maxOutputTokens` - Number input for max output tokens
- `#userQuery` - Textarea for research query input
- `#runQueryBtn` - Button to run/stop analysis
- `#sessionStatus` - Status pill showing IDLE/RUNNING
- `#iterationCount` - Span showing current iteration number

### Processing/Reasoning
- `#iterationLog` - Container for reasoning log entries
- `#codeInput` - Textarea for code input
- `#execBtn` - Button to execute code
- `#clearExec` - Button to clear code execution
- `#execOutput` - Pre element for execution console output
- `#execStatus` - Status pill for execution status
- `#finalOutput` - Container for final output rendering
- `#finalStatus` - Status pill for final output status
- `#exportTxt` - Button to export markdown

### Storage Systems
- `#tasksList` - Container for tasks list
- `#memoryList` - Container for memory entries
- `#goalsList` - Container for goals list
- `#vaultList` - Container for vault entries
- `#clearMemory` - Button to clear all memories
- `#clearGoals` - Button to clear all goals
- `#clearVault` - Button to clear all vault entries
- `#vaultType` - Select for vault entry type
- `#vaultDesc` - Input for vault entry description

### Vault Modal
- `#vaultModal` - Modal container
- `#vaultModalClose` - Close button for modal
- `#vaultModalId` - Span showing vault entry ID
- `#vaultModalType` - Span showing vault entry type
- `#vaultModalDesc` - Paragraph showing vault entry description
- `#vaultModalContent` - Pre element showing vault entry content

---

## Dynamic Classes (Used in Renderers)

### Generic Structural Classes
- `.li` - List item wrapper (used for tasks, memories, goals, vault entries)
- `.mono` - Monospace text styling
- `.pm` - Paragraph/content text
- `.status` - Status badge for tasks
- `.id` - ID badge for memories/goals

### Key Stats Classes
- `.keys-stats-section` - Container for key statistics (queried for updates)
- `.stat-badge` - Badge for statistics
- `.stat-total`, `.stat-ready`, `.stat-cooling`, `.stat-invalid` - Specific stat badges
- `.stat-row` - Row in stats details
- `.stat-label`, `.stat-value` - Label and value in stats

### Placeholder Classes
- `.log-placeholder` - Placeholder for empty reasoning log
- `.output-placeholder` - Placeholder for empty final output
- `.storage-placeholder` - Placeholder for empty storage lists
- `.no-keys-message` - Message when no keys are added

### Tool Activity Classes (from renderer-helpers.js)
- `.tool-activity` - Container for tool activities
- `.activity-header` - Header showing tool name and timestamp
- `.activity-result` - Result display (success/error)

### Markdown Rendering
- `.markdown-body` - Container for markdown-rendered content

---

## Data Attributes (Used Dynamically)

- `data-vault-id` - Vault entry ID (click handler for modal)

---

## CSS Variables (Referenced in JS)

### Color Variables
- `var(--success)` - Success state color
- `var(--warning)` - Warning state color
- `var(--error)` - Error state color (used in validation)

---

## Event Bindings Summary

### Click Events
- `#validateKeys` → Validate all API keys
- `#clearKeys` → Clear all keys with confirmation
- `#runQueryBtn` → Start/stop session
- `#execBtn` → Execute code manually
- `#clearExec` → Clear code execution area
- `#exportTxt` → Export final output as markdown
- `#clearMemory` → Clear all memories with confirmation
- `#clearGoals` → Clear all goals with confirmation
- `#clearVault` → Clear all vault entries with confirmation
- `#vaultModalClose` → Close vault modal
- `#vaultModal` → Close on outside click
- `[data-vault-id]` → Open vault modal for entry

### Input Events
- `#apiKeysTextarea` → Update keys from textarea
- `#maxOutputTokens` (input) → Visual validation feedback
- `#maxOutputTokens` (change) → Save validated value

### Focus Events
- `#modelSelect` → Fetch models on first focus

---

## Rendering Flow

### Initial Render (Renderer.renderAll)
1. renderKeys() → Populates #keysContainer with textarea and stats
2. renderTasks() → Populates #tasksList
3. renderMemories() → Populates #memoryList
4. renderGoals() → Populates #goalsList
5. renderVault() → Populates #vaultList with click handlers
6. renderReasoningLog() → Populates #iterationLog
7. renderFinalOutput() → Populates #finalOutput with markdown
8. CodeExecutor.restoreLastExecutedCode() → Restores #codeInput

### Event-Driven Updates (via eventBus)
- `Events.MEMORY_UPDATED` → renderMemories()
- `Events.TASKS_UPDATED` → renderTasks()
- `Events.GOALS_UPDATED` → renderGoals()
- `Events.VAULT_UPDATED` → renderVault()
- `Events.FINAL_OUTPUT_UPDATED` → renderFinalOutput()
- `Events.UI_REFRESH_REQUEST` → renderAll()

---

## Critical Structural Requirements

### 1. Container Elements Must Exist
All container IDs must be present in HTML, even if empty. Renderers will populate them.

### 2. Modal Must Be Outside Main Flow
`#vaultModal` should be at document root level (not nested in main content).

### 3. Form Elements Need Valid Attributes
- `#maxOutputTokens`: type="number", min="512", max="65536"
- `#modelSelect`: Must have at least one default option
- Textareas: Can have placeholders but not required

### 4. Dynamic Content Containers
These are fully replaced by renderers (structure inside doesn't matter):
- `#keysContainer`
- `#tasksList`
- `#memoryList`
- `#goalsList`
- `#vaultList`
- `#iterationLog`
- `#finalOutput`

---

## Safe to Modify

### Parent Container Classes
Any wrapping divs, sections, or layout containers can be restructured as long as the IDs above remain accessible via querySelector.

### Typography and Spacing Classes
Can add new utility classes for Swiss design system.

### Layout Structure
Can change grid, flexbox, or positioning as long as elements with required IDs remain in DOM.

---

## Design System Constraints for Redesign

1. **Keep all IDs exactly as listed**
2. **Preserve data attributes** (`data-vault-id`)
3. **Maintain CSS variable names** referenced in JS
4. **Keep `.li`, `.mono`, `.pm`, `.status`, `.id` classes** for dynamic content
5. **Ensure `.markdown-body` class** exists for markdown rendering
6. **Preserve modal structure** (modal, modal-content, modal-body hierarchy can change but IDs must stay)

---

## New Design Can Safely:
- Restructure HTML hierarchy
- Add new wrapper elements
- Change CSS completely
- Add new utility classes
- Reorganize layout system
- Change fonts, colors, spacing
- Add animations and transitions
- Make responsive for mobile

## New Design Must Not:
- Remove or rename any ID from the list above
- Remove `.li`, `.mono`, `.pm`, `.status`, `.id` classes
- Remove `data-vault-id` attributes
- Change CSS variable names used in JS
- Break querySelector selectors for any listed ID
