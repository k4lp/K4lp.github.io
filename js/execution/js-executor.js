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
    this._recordReasoningLog(result);

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
      entries.push([
        '=== JAVASCRIPT EXECUTION ERROR ===',
        `ID: ${result.id}`,
        `SOURCE: ${result.source}`,
        `CODE:\n${result.code}`,
        `ERROR: ${result.error?.message || 'Unknown error'}`,
        `STACK: ${result.error?.stack || 'No stack trace'}`
      ].join('\n'));
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
  }, 2500);
}

