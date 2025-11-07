/**
 * JSExecutor
 *
 * Unified facade over the execution manager that keeps the reasoning log and
 * manual execution UI in sync. Both manual and automatic code paths flow
 * through this API which guarantees serial execution and consistent results.
 */

import { executionManager } from './execution-manager.js';
import { Storage } from '../storage/storage.js';
import { eventBus, Events } from '../core/event-bus.js';
import { EXECUTION_STATUS_RESET_DELAY_MS } from '../config/execution-config.js';
import { getExecutionServices } from './services.js';

export const JSExecutor = {
  /**
   * Queue the supplied code for execution.
   * @param {string} rawCode - Code emitted by the LLM or manual editor.
   * @param {Object} options - Execution options
   * @param {string} [options.source='auto'] - Source label (auto|manual|other)
   * @param {Object} [options.context] - Arbitrary context metadata
  * @param {Object} [options.metadata] - Optional metadata for activity logs
   * @param {boolean} [options.updateUI=true] - Skip UI updates when false
   * @param {number} [options.timeoutMs] - Override execution timeout
   * @returns {Promise<Object>} Normalised execution result
   */
  async executeCode(rawCode, options = {}) {
    const request = {
      code: typeof rawCode === 'string' ? rawCode : '',
      source: options.source || 'auto',
      context: options.context || {},
      metadata: options.metadata || {},
      timeoutMs: options.timeoutMs
    };

    const result = await executionManager.enqueue(request);

    // MODULAR: Enhanced error handling with classification and recovery
    if (!result.success && result.error) {
      const { errorHandler } = getExecutionServices();

      if (errorHandler) {
        try {
          const recommendation = await errorHandler.getRecoveryRecommendation(
            result.error,
            result.context || {}
          );

          // Attach error handling metadata to result
          result.errorHandling = {
            recommendation,
            timestamp: new Date().toISOString()
          };

          // MODULAR: Emit event if reasoning chain needs to handle this error
          if (recommendation.shouldNotifyReasoning) {
            eventBus.emit('EXECUTION_ERROR_NEEDS_REASONING', {
              error: result.error,
              classification: recommendation,
              recommendation,
              executionId: result.id,
              code: result.code
            });
          }
        } catch (handlerError) {
          console.error('[JSExecutor] Error handler failed:', handlerError);
        }
      }
    }

    this._syncPendingExecutionErrorContext(result);

    // MODULAR: Only log if this isn't a retry attempt (shouldLog set by ResultHandler)
    if (result.shouldLog !== false) {
      this._recordReasoningLog(result);
    }

    if (options.updateUI !== false) {
      this._updateUI(result);
    }

    eventBus.emit(Events.JS_EXECUTION_COMPLETE, result);
    return result;
  },

  /**
   * Persist execution narrative for the reasoning log pane.
   * @private
   */
  _recordReasoningLog(result) {
    const entries = Storage.loadReasoningLog();

    if (result.success) {
      entries.push([
        '=== JAVASCRIPT EXECUTION ===',
        `ID: ${result.id}`,
        `SOURCE: ${result.source}`,
        `TIME: ${result.executionTime}ms`,
        `CODE:\n${result.code}`,
        `CONSOLE OUTPUT:\n${formatLogs(result.logs) || '(no output)'}`,
        `RETURN VALUE:\n${stringifyReturn(result.result)}`
      ].join('\n'));
    } else {
      const logEntry = [
        '=== JAVASCRIPT EXECUTION ERROR ===',
        `ID: ${result.id}`,
        `SOURCE: ${result.source}`,
        `CODE:\n${result.code}`,
        `ERROR: ${result.error?.message || 'Unknown error'}`,
        `STACK: ${result.error?.stack || 'No stack trace'}`
      ];

      // MODULAR: Include error classification if available
      if (result.errorHandling?.recommendation) {
        const rec = result.errorHandling.recommendation;
        logEntry.push(
          `\nERROR ANALYSIS:`,
          `- Severity: ${rec.severity || 'unknown'}`,
          `- Retryable: ${rec.shouldRetry ? 'Yes' : 'No'}`,
          `- Recovery: ${rec.message || 'No recommendation'}`
        );
      }

      entries.push(logEntry.join('\n'));
    }

    Storage.saveReasoningLog(entries);
  },

  /**
   * Update manual execution widgets to reflect the latest run.
   * @private
   */
  _updateUI(result) {
    const codeInput = document.querySelector('#codeInput');
    if (codeInput) {
      codeInput.value = result.code || '';
    }

    const execOutput = document.querySelector('#execOutput');
    if (execOutput) {
      execOutput.textContent = buildOutputSummary(result);
    }

    const execStatus = document.querySelector('#execStatus');
    if (!execStatus) return;

    if (result.success) {
      execStatus.textContent = result.source === 'manual' ? 'MANUAL' : 'AUTO';
      execStatus.style.background = '#4CAF50';
      execStatus.style.color = 'white';
      resetStatusLater(execStatus);
    } else {
      execStatus.textContent = 'ERROR';
      execStatus.style.background = '#f48771';
      execStatus.style.color = 'white';
    }
  },

  /**
   * Persist pending execution error context for auto runs so the next reasoning
   * iteration can inject the required instruction payload.
   * @private
   */
  _syncPendingExecutionErrorContext(result) {
    if (result.source !== 'auto') {
      return;
    }

    if (!result.success) {
      const references = Array.isArray(result.analysis?.vaultRefs)
        ? result.analysis.vaultRefs.filter(Boolean)
        : [];

      Storage.savePendingExecutionError({
        code: result.resolvedCode || result.code || '',
        errorMessage: result.error?.message || 'Unknown error',
        stack: result.error?.stack || '',
        source: result.source,
        references,
        timestamp: result.finishedAt || new Date().toISOString(),
        iteration: typeof window?.GDRS?.currentIteration === 'number'
          ? window.GDRS.currentIteration
          : null
      });
    }
  }
};

function buildOutputSummary(result) {
  if (!result.success) {
    const message = result.error?.message || 'Unknown error';
    const stack = result.error?.stack ? `\n${result.error.stack}` : '';
    return `[ERROR] ${message}${stack}`;
  }

  const lines = [];

  if (result.logs?.length) {
    result.logs.forEach((entry) => {
      lines.push(`[${entry.type.toUpperCase()}] ${entry.message}`);
    });
  }

  if (result.result !== undefined) {
    lines.push(`[RETURN] ${stringifyReturn(result.result)}`);
  }

  return lines.join('\n') || 'No output';
}

function formatLogs(logs) {
  return (logs || [])
    .map((entry) => `[${entry.type.toUpperCase()}] ${entry.message}`)
    .join('\n');
}

function stringifyReturn(value) {
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resetStatusLater(element) {
  setTimeout(() => {
    element.textContent = 'READY';
    element.style.background = '';
    element.style.color = '';
  }, EXECUTION_STATUS_RESET_DELAY_MS);
}
