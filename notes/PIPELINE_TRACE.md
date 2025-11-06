# Pipeline Trace — GDRS Modular Load

## Entry & Boot Flow
- `index.html` currently injects 20+ scripts in three batches. Mixed `type="module"` and classic tags.
- `js/main.js` is the primary ES module. It imports boot, storage, API, reasoning, execution, control, and UI layers.
- Legacy modules (e.g., `ExecutionPolicyManager`, `RetryPolicyManager`) are still classic scripts registered via globals. They are executed before `main.js` because of script order.
- `main.js` constructs the `window.GDRS` namespace and kicks off `Renderer.init()`, `bindEvents()`, and `boot()` immediately when DOM ready.

## Execution Subsystem
- `js/execution/execution-manager.js` is an ES module. It imports storage, utils, and runner. It creates a singleton `executionManager` on load.
- During its constructor, it calls `_initializeModularComponents()`, which looks for `window.GDRS_ModularSystemInitialized`.
  - If `true`, it reads `window.GDRS_*` singletons (ExecutionPolicyManager, ExecutionResultHandler, ExecutionMetricsCollector).
  - Otherwise, it instantiates fallback classes via globals (`ExecutionPolicyManager`, `ExecutionResultHandler`, `ExecutionMetricsCollector`), assuming they exist globally.
  - This leads to race conditions when modular system initialization hasn’t stamped the globals yet.

## Modular System Initializer
- `js/core/modular-system-init.js` self-invokes, waits for DOM ready, then polls every 25 ms for constructors listed in `REQUIRED_GLOBALS`.
- Once available, it instantiates singletons and stores them on `window.GDRS_*`. Marks `window.GDRS_ModularSystemInitialized = true` and emits `gdrs:modular-system-initialized`.
- Dependencies it expects (`ExecutionPolicyManager`, etc.) are defined in classic scripts without ES exports.

## Config & Policy Modules
- Files like `js/config/execution-strategies-config.js` and `js/policy/execution-policy-manager.js` are class/function definitions without ES exports. They rely on `<script>` execution to register globals.
- Several modules reference other globals (e.g., `Storage`, `EXECUTION_STRATEGIES_CONFIG`) rather than importing.

## Observed Symptoms
- Browser console logs `[ExecutionManager] Modular system not initialized` because singleton instantiation fires before `modular-system-init` finishes polling.
- ExecutionManager keeps using fallback local instances; it never rebinds to the global singletons, causing divergence from the intended modular architecture.
- Widespread duplication: modules attach themselves to `window.*` even though ES modules already import dependencies (`Storage`, `eventBus`, etc.).

## Key Root Causes
1. Mixed module systems (ESM + legacy globals) leading to race conditions and fragile dependency ordering.
2. Lack of dependency inversion: ExecutionManager constructs dependencies opportunistically instead of receiving them from a registry.
3. Config/policy modules not expressed as ES modules, forcing consumers to rely on globals.
4. Index bootstrap loads many scripts directly, bypassing ESM dependency graphs.

## Targets for Refactor
- Establish a Service Container (or Module Registry) exported from ES module(s).
- Convert policy/config/error-handling modules to proper ES exports, with optional global bridges for backwards compatibility.
- Let `modular-system-init` import modules directly and register them with the container instead of polling for globals.
- Update ExecutionManager to consume the container or explicit imports, removing fallback/new instantiations.
- Simplify `index.html` script list once modules are self-contained, ideally down to a single `type="module"` entry.

