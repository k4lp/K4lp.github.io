# Reasoning Error Handling Plan

## Objective
Prevent failed code executions from polluting the primary reasoning context while still surfacing the necessary diagnostics so the LLM can fix issues on subsequent iterations.

## Proposed Changes

1. **Introduce Dedicated Execution Diagnostics Log**
   - Add a new storage channel (e.g., `Storage.appendExecutionDiagnostics`) to capture metadata for failed executions only.
   - Ensure entries include the code snippet, truncated console output, and error details required for remediation.

2. **Refine Reasoning Log Writer**
   - Update `JSExecutor._recordReasoningLog` to record successful executions in the main reasoning log.
   - Redirect failures to the diagnostics log, keeping the core reasoning narrative free from noisy stack traces.

3. **Expose Diagnostics to the LLM Separately**
   - Create a new context provider (e.g., `executionDiagnosticsProvider`) registered in the reasoning context builder.
   - Inject a configurable section into the prompt that summarizes outstanding execution errors without intermixing them with primary reasoning text.

4. **Pipeline Awareness**
   - Extend the tool operation pipeline summary so failed execution metadata is forwarded to the diagnostics store.
   - Guarantee that only successful runs influence downstream summaries/tasks, while diagnostics stay isolated.

5. **Testing & Verification**
   - Manually trigger both successful and failing execution paths to confirm logging segregation.
   - Verify the reasoning prompt shows diagnostic sections only when failures exist and remains unchanged otherwise.

## Notes
- Keep configuration-driven toggles (e.g., diagnostic section heading, max entries) under `js/config/reasoning-config.js` for easy tuning.
- Ensure backward compatibility by defaulting to the existing behaviour when the diagnostics feature is disabled.
