# Redundant / Unused Code Tracker

Purpose: document legacy shims or code paths currently unused in the active modules so they can be safely removed later.

| Area | Evidence | Recommended Action |
|------|----------|--------------------|
| `js/state/excel-runtime-store.js` | Entire file is a deprecated compatibility shim that re-exports `ExcelRuntimeStore` from `js/excel/core/excel-store.js` (`lines 1-11`). A repo-wide search (`rg -n "state/excel-runtime-store"`) returns no imports, meaning nothing references this shim anymore. | Delete the shim after confirming no external tooling loads the old path. All in-repo imports already target `excel/core/excel-store.js`. |
| `js/execution/error-handling/retry-strategy-manager.js:217-221` | Contains a “Legacy bridge” that assigns `window.RetryStrategyManager = RetryStrategyManager`. No other file references `window.RetryStrategyManager` (`rg -n "window\.RetryStrategyManager"`). | Remove the browser global export to avoid leaking the class onto `window`. |
| `js/execution/strategies/standard-execution-strategy.js:86-89` | Another “Legacy bridge” writes `window.StandardExecutionStrategy = StandardExecutionStrategy`. There are no reads of that global (`rg -n "window\.StandardExecutionStrategy"`). | Drop the global assignment; the strategy is already imported where needed (`execution-manager`, `execution-strategies-config`). |
| `js/execution/strategies/retry-execution-strategy.js:256-259` | Same pattern: `window.RetryExecutionStrategy = RetryExecutionStrategy` under a deprecated bridge with no consumers (`rg -n "window\.RetryExecutionStrategy"`). | Remove the window assignment to shrink bundle size and reduce leakage. |

Add further entries here as additional redundancies are discovered.

