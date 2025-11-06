# GDRS Modular Architecture Refine Plan

> Objective: replace ad-hoc global fallbacks with a deterministic ES-module architecture that keeps execution, reasoning, and policy subsystems composable and testable. The plan emphasises dependency clarity, single instantiation, and removal of redundant window bindings.

---

## 1. Baseline Verification & Scope Lock

- [ ] Confirm current console symptoms: `ExecutionManager` warning, modular init success, API tracker loaded. *(done via provided log; re-run after changes).*
- [ ] Inventory critical modules involved in modular bootstrap:
  - Core: `main.js`, `core/modular-system-init.js`, `core/provider-*`, `core/event-bus.js`.
  - Execution: `execution-manager.js`, strategies, error-handling, context manager, result handler, metrics collector.
  - Policies & config: `policy/execution-policy-manager.js`, `policy/retry-policy-manager.js`, `config/*`.
- [ ] Document pre-refactor dependency graph (see `notes/PIPELINE_TRACE.md`).

## 2. Service Container & Dependency Contracts

- [ ] Create new module `core/service-container.js` exporting:
  - `registerService(name, factory | instance)` and `resolveService(name)`.
  - Typed helpers: `registerExecutionServices`, `getExecutionServices`, etc.
- [ ] The container stores factories to avoid premature instantiation and provides `onReady` hooks for late consumers (ExecutionManager).
- [ ] Provide graceful no-op fallback for unregistered services to catch missing wiring in dev mode (throw descriptive errors).

## 3. Convert Policy & Config Modules to ES Modules

- [ ] Update files:
  - `config/execution-strategies-config.js`
  - `config/retry-policies-config.js`
  - `config/error-recovery-config.js`
  - `config/monitoring-config.js`
  - `policy/execution-policy-manager.js`
  - `policy/retry-policy-manager.js`
- [ ] For each:
  - Introduce explicit `export` statements (named exports preferred).
  - Replace global reads (e.g., `Storage`) with imports where practical; accept parameters otherwise.
  - Retain optional `window.*` bridging **only** at the bottom for backward compatibility (gated in dev, use console warn).
- [ ] Update dependent modules to import from these paths instead of referencing globals.

## 4. Modular System Initializer Rewrite

- [ ] Replace polling in `core/modular-system-init.js` with explicit imports from converted modules.
- [ ] Move singleton instantiation into deterministic function:
  ```js
  import { ExecutionPolicyManager } from '../policy/execution-policy-manager.js';
  import { createExecutionServices } from '../execution/services.js';
  ```
- [ ] Register constructed singletons into the service container.
- [ ] Publish initialization completion via container (e.g., `serviceContainer.resolve('modularReady')` or dedicated promise).
- [ ] Maintain `window.GDRS_ModularSystemInitialized` for compatibility but mark as deprecated.

## 5. Execution Manager Refactor

- [ ] Replace `_initializeModularComponents` with dependency acquisition from the service container:
  - On construction, request `container.whenReady(['executionPolicyManager', 'executionResultHandler', 'executionMetricsCollector'])`.
  - Keep a local fallback that throws if services are missing when first execution is requested (instead of silent console warning).
- [ ] Ensure ExecutionManager subscribes to service updates (if modular system reconfigures policies).
- [ ] Remove direct references to `window.*` and fallback instantiations.

## 6. Execution Service Module

- [ ] Create `execution/services.js` that exports factory functions for execution-related singletons (policy, retry, result handler, metrics, context manager, error handler, retry strategy manager).
- [ ] This module imports conversions from steps 3 & 4, ensuring consistent instantiation logic.
- [ ] Provide `export function buildExecutionServiceGraph({ storage, eventBus })` to support tests.

## 7. Index & Bootstrap Cleanup

- [ ] Reduce `index.html` script tags:
  - Keep vendor libs (e.g., `marked`).
  - Replace large group of `<script>` tags with a single `type="module"` that imports `main.js`.
- [ ] Remove reliance on implicit execution order.
- [ ] Ensure `main.js` (or new bootstrap) imports any modules that were previously loaded via script tags.

## 8. Backwards Compatibility Bridges

- [ ] Where legacy UI expects `window.GDRS_*`, expose read-only proxies pointing to service container instances.
- [ ] Log once when legacy access occurs to encourage migration.

## 9. Redundancy Removal & Dead Code Pass

- [ ] After services refactor, scan for:
  - Unused globals (`window.ExecutionPolicyManager`, etc.).
  - Duplicate singleton instantiations.
- [ ] Remove redundant exports or update to re-export from central module.

## 10. Verification & Regression Safety

- [ ] Manual smoke tests:
  - Load app, confirm no initialization warnings.
  - Trigger execution request to ensure ExecutionManager uses container-provided dependencies.
  - Verify provider registry still loads and renderer binds events.
- [ ] Update documentation:
  - Append summary to `FIXES_SUMMARY.md`.
  - Add migration notes if necessary.

## 11. Progress Tracking

- [ ] Maintain `docs/ARCHITECTURE_REFACTOR_PROGRESS.md` with checklist of above tasks (status, notes).
- [ ] Update tracker after completing each major step.

---

### Implementation Order (High-Level)
1. Build service container infrastructure (Section 2).
2. Convert configs/policies to ES modules (Section 3).
3. Implement execution service graph module (Section 6).
4. Rewrite modular initializer to use container + service graph (Section 4).
5. Refactor ExecutionManager to consume container (Section 5).
6. Tidy index/bootstrap and remove redundant globals (Sections 7–9).
7. Verify and document (Section 10).

Dependencies:
- Section 2 required before 4–6.
- Section 3 required before 4 & 6.
- Section 6 required before 5.

Risks & Mitigations:
- **Breakage due to import cycles**: keep container definitions lightweight; avoid circular dependencies by isolating factories.
- **Legacy code expecting globals**: provide compatibility proxies in Section 8.
- **Large diff surface**: stage work per section with tracker to avoid missed renames.

