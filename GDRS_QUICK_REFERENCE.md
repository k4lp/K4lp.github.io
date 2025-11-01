# GDRS Quick Reference Guide

## Key File Locations & Responsibilities

### Core Framework (5 files)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/core/extension-points.js` | Registry pattern, extension point definitions | `ExtensionPoints`, `Registry` |
| `/js/core/event-bus.js` | Central event system | `EventBus`, `Events`, `eventBus` instance |
| `/js/core/interfaces.js` | Interface contracts for all components | `IStorageProvider`, `IAPIProvider`, etc. |
| `/js/core/constants.js` | Re-export configuration (backward compat) | All config exports |
| `/js/core/utils.js` | Shared utilities | Various helper functions |

### Configuration Layer (6 files)
| File | Purpose | Key Constants |
|------|---------|---------------|
| `/js/config/app-config.js` | App metadata | `VERSION`, `MAX_ITERATIONS`, `SYSTEM_PROMPT` |
| `/js/config/storage-config.js` | Storage keys | `LS_KEYS`, `createKeyFromText()` |
| `/js/config/api-config.js` | API settings | `GEMINI_API_BASE_URL`, `GEMINI_MODELS` |
| `/js/config/ui-config.js` | UI constants | `STATUS_COLORS`, `TASK_STATUSES` |
| `/js/config/execution-config.js` | Execution settings | Execution timeouts, limits |
| `/js/config/tool-registry-config.js` | Tool definitions | Built-in tools registry |

### Storage Layer (4 files)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/storage/storage.js` | CRUD operations with event emissions | `Storage` (object with methods) |
| `/js/storage/vault-manager.js` | Vault operations & validation | `VaultManager` (object with methods) |
| `/js/storage/providers/localstorage-provider.js` | localStorage implementation | `LocalStorageProvider` class |
| `/js/storage/providers/storage-provider-manager.js` | Provider switching & management | `StorageProviderManager`, `storageProviderManager` instance |

**DUPLICATE ISSUE**: 
- localStorage registered in `storage-provider-manager.js` line 28-32 (during import)
- localStorage registered in `main.js` line 104 (during initialization)

### API Layer (3 files)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/api/gemini-client.js` | Gemini API HTTP client | `GeminiAPI` |
| `/js/api/key-manager.js` | API key management | `KeyManager` |
| `/js/api/providers/gemini-provider.js` | Gemini provider implementation | `GeminiProvider` class |

### Reasoning Layer (5 files)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/reasoning/reasoning-engine.js` | Main reasoning loop | `ReasoningEngine` |
| `/js/reasoning/reasoning-parser.js` | Response parsing facade | `ReasoningParser` |
| `/js/reasoning/parser/parser-core.js` | Core parsing logic | Parser utilities |
| `/js/reasoning/parser/parser-extractors.js` | Data extraction | Extraction functions |
| `/js/reasoning/parser/unified-tool-parser.js` | Tool parsing | Tool parsing logic |

### Execution Layer (6 files)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/execution/code-executor.js` | Main executor entry point | `CodeExecutor` |
| `/js/execution/js-executor.js` | JavaScript execution engine | `JSExecutor` |
| `/js/execution/execution-manager.js` | Execution flow management | `ExecutionManager` |
| `/js/execution/execution-runner.js` | Runs execution & captures output | `ExecutionRunner` |
| `/js/execution/console-capture.js` | Console redirection | `captureConsole()` |
| `/js/execution/execution-context-api.js` | Execution context | Context objects |

**Execution APIs (4 files)**:
- `apis/vault-api.js` - Vault access during execution
- `apis/memory-api.js` - Memory access during execution
- `apis/goals-api.js` - Goals access during execution
- `apis/tasks-api.js` - Tasks access during execution

### Control Layer (1 file)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/control/loop-controller.js` | Reasoning loop orchestration | `LoopController` |

### UI Layer (11 files)
| File | Purpose | Key Exports |
|------|---------|------------|
| `/js/ui/renderer.js` | Main renderer facade | `Renderer` |
| `/js/ui/events.js` | Event binding | `bindEvents()` |
| `handlers/handler-keys.js` | Key management UI handlers | Handler functions |
| `handlers/handler-session.js` | Session control handlers | Handler functions |
| `handlers/handler-code.js` | Code execution UI handlers | Handler functions |
| `handlers/handler-export.js` | Export/import handlers | Handler functions |
| `handlers/handler-config.js` | Configuration handlers | Handler functions |
| `handlers/handler-modal.js` | Modal dialog handlers | Handler functions |
| `handlers/handler-clear.js` | Data clearing handlers | Handler functions |
| `handlers/handler-global.js` | Global handlers | Handler functions |
| `handlers/handler-storage.js` | Storage UI handlers | Handler functions |

**Renderer Sub-modules (4 files)**:
- `renderer/renderer-output.js` - Final output rendering
- `renderer/renderer-vault.js` - Vault panel rendering
- `renderer/renderer-keys.js` - Keys panel rendering
- `renderer/renderer-helpers.js` - Helper functions

---

## Core Concepts

### 1. Extension Points (8 available)
```javascript
// Use these to register custom implementations
ExtensionPoints.API_PROVIDERS       // LLM APIs
ExtensionPoints.STORAGE_PROVIDERS   // Storage backends
ExtensionPoints.EXECUTION_ENGINES   // Code execution contexts
ExtensionPoints.PARSERS             // Response format parsers
ExtensionPoints.RENDERERS           // UI renderers
ExtensionPoints.MIDDLEWARE          // Data interceptors
ExtensionPoints.VALIDATORS          // Validation logic
ExtensionPoints.TRANSFORMERS        // Data transformers
```

### 2. Storage Keys (LS_KEYS)
```javascript
// All stored with 'gdrs_' prefix
LS_KEYS.META                 // App metadata
LS_KEYS.KEYPOOL              // API keys
LS_KEYS.GOALS                // Research goals
LS_KEYS.MEMORY               // Long-term memory
LS_KEYS.TASKS                // Current tasks
LS_KEYS.VAULT                // Data vault
LS_KEYS.FINAL_OUTPUT         // LLM output
LS_KEYS.REASONING_LOG        // Iteration log
LS_KEYS.CURRENT_QUERY        // Current query
LS_KEYS.EXECUTION_LOG        // Code execution history
LS_KEYS.TOOL_ACTIVITY_LOG    // Tool usage log
LS_KEYS.LAST_EXECUTED_CODE   // Last code snippet
LS_KEYS.MAX_OUTPUT_TOKENS    // Token limit setting
```

### 3. Events (13 available)
```javascript
// Storage events
Events.MEMORY_UPDATED
Events.TASKS_UPDATED
Events.GOALS_UPDATED
Events.VAULT_UPDATED
Events.FINAL_OUTPUT_UPDATED

// Execution events
Events.JS_EXECUTION_START
Events.JS_EXECUTION_COMPLETE
Events.JS_EXECUTION_ERROR
Events.JS_EXECUTION_QUEUE_CHANGED

// Session events
Events.SESSION_START
Events.SESSION_STOP
Events.ITERATION_COMPLETE

// UI events
Events.UI_REFRESH_REQUEST
Events.UI_REFRESH_COMPLETE
```

### 4. Global Namespace (window.GDRS)
After initialization, 14 core modules are exposed:
```javascript
window.GDRS = {
  // Framework
  VERSION, eventBus, Events, ExtensionPoints, Registry, Interfaces,
  
  // Storage
  Storage, VaultManager, LocalStorageProvider, storageProviderManager,
  
  // API
  KeyManager, GeminiAPI, GeminiProvider,
  
  // Logic
  ReasoningParser, ReasoningEngine,
  
  // Execution
  JSExecutor, CodeExecutor,
  
  // Control
  LoopController,
  
  // UI
  Renderer, bindEvents,
  
  // Boot
  boot,
  
  // State
  currentIteration: 0
}
```

---

## Initialization Sequence

### 1. Module Loading Phase (Synchronous)
```
HTML loads main.js
  → Storage provider manager imported
    → StorageProviderManager singleton created
      → localStorage registered [FIRST TIME]
  → All other modules imported
  → main.js IIFE starts, waits for DOM
```

### 2. DOM Ready Phase (After page loads)
```
DOMContentLoaded fires
  → initializeGDRS() called
    → window.GDRS namespace created
    → localStorage registered [SECOND TIME] ⚠️ WARNING
    → Gemini provider registered
    → Renderer.init() called
    → boot() called
      → Storage initialized
      → Vault validated
      → UI rendered
      → Events bound
      → Model list fetched
    → Application ready
```

---

## How to Extend GDRS

### Adding a Custom Storage Provider

1. **Create a provider class**:
```javascript
// js/providers/my-storage-provider.js
export class MyStorageProvider {
  async load(key) { /* ... */ }
  async save(key, value) { /* ... */ }
  async delete(key) { /* ... */ }
  async clear() { /* ... */ }
  async isAvailable() { /* ... */ }
}
```

2. **Register it**:
```javascript
Registry.register(
  ExtensionPoints.STORAGE_PROVIDERS,
  'my-storage',
  MyStorageProvider
);
```

3. **Use it**:
```javascript
storageProviderManager.setProvider('my-storage');
```

### Adding a Custom API Provider

1. **Create provider class**:
```javascript
// js/api/providers/my-api-provider.js
export class MyAPIProvider {
  async generateContent(prompt, options) { /* ... */ }
  async validateKey(key) { /* ... */ }
  async listModels() { /* ... */ }
  async getRateLimits() { /* ... */ }
}
```

2. **Register it**:
```javascript
Registry.register(
  ExtensionPoints.API_PROVIDERS,
  'my-api',
  MyAPIProvider
);
```

3. **Switch providers**:
```javascript
// Implementation depends on usage pattern
```

---

## Debugging Tools

### Available in Console

```javascript
// Registry debugging
window.Registry.debug()                    // Show all registered implementations
window.Registry.getStats()                // Get statistics
window.Registry.list(ExtensionPoints.STORAGE_PROVIDERS)  // List providers

// Event bus debugging
window.GDRS.eventBus.setDebugMode(true)   // Enable event logging
window.GDRS.eventBus.getRegisteredEvents() // List event listeners

// Storage debugging
window.GDRS.Storage.loadGoals()            // Inspect data
localStorage.getItem('gdrs_goals')         // Raw localStorage access

// Provider debugging
window.GDRS.storageProviderManager.listProviders()  // Available providers
window.GDRS.storageProviderManager.getProviderName() // Current provider
```

### Development Helpers

```javascript
// Enable event debugging
window.GDRS_DEBUG.enableEventDebug()

// Disable event debugging
window.GDRS_DEBUG.disableEventDebug()

// List registered events
window.GDRS_DEBUG.listEvents()

// Clear all GDRS data
window.GDRS_DEBUG.clearAllData()
```

---

## File Count Summary

| Category | Count |
|----------|-------|
| **Core Framework** | 5 |
| **Configuration** | 6 |
| **Storage** | 4 |
| **API** | 3 |
| **Reasoning** | 5 |
| **Execution** | 6+ APIs |
| **Control** | 1 |
| **UI** | 11+ |
| **Examples** | 2 |
| **Utilities** | 8+ |
| **TOTAL** | **59** |

---

## Architecture Layers (Top to Bottom)

```
UI Layer (11 files)
  ↓
Application Logic (ReasoningEngine, LoopController)
  ↓
Execution Layer (Code execution, console capture)
  ↓
API Layer (Gemini, Key Management)
  ↓
Storage Layer (CRUD, vault, provider management)
  ↓
Core Framework (Registry, EventBus, Interfaces)
  ↓
Configuration (App, storage, API, UI configs)
```

