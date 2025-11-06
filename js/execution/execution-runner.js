/**
 * ExecutionRunner
 *
 * Responsible for preparing code (vault resolution, metrics), capturing console
 * output, running the code in an async wrapper with timeout protection, and
 * returning a structured execution outcome.
 *
 * Injects runtime APIs (vault, memory, tasks, goals, utils) into the execution context.
 */

import { ConsoleCapture } from './console-capture.js';
import { nowISO } from '../core/utils.js';
import { EXECUTION_DEFAULT_TIMEOUT_MS } from '../config/execution-config.js';
import { expandVaultReferences } from '../utils/vault-reference-resolver.js';
import { buildExecutionContext } from './execution-context-api.js';
import { ExecutionStateMachine } from './core/execution-state-machine.js';

export class ExecutionRunner {
  constructor(options = {}) {
    this.timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : EXECUTION_DEFAULT_TIMEOUT_MS;
  }

  /**
   * Execute the provided code and return an outcome object.
   * @param {Object} request - Execution request payload
   * @param {string} request.id - Execution id
   * @param {string} request.code - Raw code (with vault refs)
   * @returns {Promise<Object>} Structured execution outcome
   */
  async run(request) {
    // MODULAR: Initialize state machine for formal state tracking
    const stateMachine = new ExecutionStateMachine(request.id);
    stateMachine.transition('preparing');

    const capture = new ConsoleCapture();
    const analysis = analyseCode(request.code || '');

    // Use centralized vault reference expansion
    const expansion = expandVaultReferences(request.code || '');
    const resolvedCode = expansion.resolvedCode;
    const vaultRefs = expansion.vaultRefs;

    const startedAt = Date.now();
    capture.start();

    // MODULAR: Transition to executing state
    if (stateMachine) {
      stateMachine.transition('executing');
    }

    try {
      const value = await this._executeWithTimeout(resolvedCode);
      const duration = Date.now() - startedAt;

      // MODULAR: Transition to completed state
      if (stateMachine) {
        stateMachine.transition('completed');
      }

      return {
        success: true,
        value,
        logs: capture.entries(),
        resolvedCode,
        analysis: { ...analysis, vaultRefs },
        duration,
        finishedAt: nowISO(),
        startedAt: new Date(startedAt).toISOString(),
        // MODULAR: Include state information
        state: stateMachine ? stateMachine.getCurrentState() : 'completed'
      };
    } catch (error) {
      const duration = Date.now() - startedAt;

      // MODULAR: Transition to failed state with error details
      if (stateMachine) {
        stateMachine.transition('failed', { error: error.message });
      }

      return {
        success: false,
        error,
        logs: capture.entries(),
        resolvedCode,
        analysis: { ...analysis, vaultRefs },
        duration,
        finishedAt: nowISO(),
        startedAt: new Date(startedAt).toISOString(),
        // MODULAR: Include state information
        state: stateMachine ? stateMachine.getCurrentState() : 'failed'
      };
    } finally {
      capture.stop();
    }
  }

  /**
   * Execute code inside an async IIFE with timeout protection.
   * Injects vault, memory, tasks, goals, and utils APIs into the execution context.
   * @private
   */
  async _executeWithTimeout(resolvedCode) {
    let runner;

    // Build the execution context with all APIs
    const context = buildExecutionContext();

    // Normalize the code to handle both raw scripts and async IIFEs
    let codeToRun = resolvedCode.trim();
    const isAsyncIIFE = codeToRun.startsWith('(async ()') && codeToRun.endsWith('})();');

    // If it's NOT an IIFE, wrap it in one so it can be awaited.
    // If it IS an IIFE, we'll just await it directly.
    if (!isAsyncIIFE) {
      codeToRun = '(async () => {\n' +
                  `  ${codeToRun}\n` +
                  '})()';
    }

    try {
      // Create function with injected context parameters
      // The executed code can access: vault, memory, tasks, goals, utils
      runner = new Function(
        'vault', 'memory', 'tasks', 'goals', 'utils',
        '"use strict";\n' +
        'return (async () => {\n' +
        `  return await ${codeToRun};\n` +
        '})();'
      );
    } catch (error) {
      error.message = `Compilation failed: ${error.message}`;
      throw error;
    }

    // Execute with context APIs injected
    const promise = runner(
      context.vault,
      context.memory,
      context.tasks,
      context.goals,
      context.utils
    );

    return this.timeoutMs
      ? await runWithTimeout(promise, this.timeoutMs)
      : promise;
  }
}

/**
 * Produce static metrics about the code snippet.
 */
function analyseCode(rawCode) {
  const normalized = typeof rawCode === 'string' ? rawCode : '';
  const trimmed = normalized.trim();
  const lineCount = trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length;

  return {
    charCount: normalized.length,
    lineCount
  };
}

/**
 * Run a promise with timeout enforcement.
 */
function runWithTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    const clear = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Execution timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    }

    promise.then(
      (value) => {
        if (!settled) {
          settled = true;
          clear();
          resolve(value);
        }
      },
      (error) => {
        if (!settled) {
          settled = true;
          clear();
          reject(error);
        }
      }
    );
  });
}
