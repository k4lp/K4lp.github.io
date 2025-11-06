# Architecture Refactor Progress Tracker

| Section | Task | Status | Notes |
|---------|------|--------|-------|
| 1 | Baseline verification snapshot | Completed | Logged in plan + notes/PIPELINE_TRACE.md |
| 2 | Service container module scaffolding | Completed | `js/core/service-container.js` created |
| 3a | Convert execution-strategies config to ESM | Completed | Named exports added |
| 3b | Convert retry policies config to ESM | Completed | Named exports added |
| 3c | Convert error recovery config to ESM | Completed | Added helper getter |
| 3d | Convert monitoring config to ESM | Completed | Added accessor helper |
| 3e | Convert execution policy manager to ESM | Completed | Rewrote with exports |
| 3f | Convert retry policy manager to ESM | Completed | Rewrote with exports |
| 4 | Rewrite modular-system-init to use container | Completed | Deterministic init with service container |
| 5 | Refactor execution-manager to consume container | Completed | Depends on service promises |
| 6 | Implement execution service graph module | Completed | `js/execution/services.js` added |
| 7 | Index/bootstrap cleanup | Completed | Reduced to marked + main |
| 8 | Compatibility proxy wiring | Completed | Legacy window.* bridged via service container |
| 9 | Redundancy sweep | Pending |  |
| 10 | Verification & smoke tests | Pending |  |
| 11 | Documentation updates | Pending |  |

> Update this table as milestones land. Keep notes concise (<= 1 sentence).
