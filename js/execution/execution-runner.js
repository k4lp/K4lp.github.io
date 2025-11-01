/**
 * ExecutionRunner
 *
 * Responsible for preparing code (vault resolution, metrics), capturing console
 * output, running the code in an async wrapper with timeout protection, and
 * returning a structured execution outcome.
 */

import { ConsoleCapture } from './console-capture.js';
import { Storage } from '../storage/storage.js';
import { nowISO } from '../core/utils.js';
import {
  EXECUTION_DEFAULT_TIMEOUT_MS,
  EXECUTION_VAULT_REF_PATTERN
} from '../config/execution-config.js';

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
    const capture = new ConsoleCapture();
    const analysis = analyseCode(request.code || '');
    const { resolvedCode, vaultRefs } = expandVaultReferences(request.code || '');

    const startedAt = Date.now();
    capture.start();

    try {
      const value = await this._executeWithTimeout(resolvedCode);
      const duration = Date.now() - startedAt;

      return {
        success: true,
        value,
        logs: capture.entries(),
        resolvedCode,
        analysis: { ...analysis, vaultRefs },
        duration,
        finishedAt: nowISO(),
        startedAt: new Date(startedAt).toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startedAt;
      return {
        success: false,
        error,
        logs: capture.entries(),
        resolvedCode,
        analysis: { ...analysis, vaultRefs },
        duration,
        finishedAt: nowISO(),
        startedAt: new Date(startedAt).toISOString()
      };
    } finally {
      capture.stop();
    }
  }

  /**
   * Execute code inside an async IIFE with timeout protection.
   * @private
   */
  async _executeWithTimeout(resolvedCode) {
    let runner;

    try {
      runner = new Function(
        '"use strict";\n' +
        'return (async () => {\n' +
        '  return await (async () => {\n' +
        `${resolvedCode}\n` +
        '  })();\n' +
        '})();'
      );
    } catch (error) {
      error.message = `Compilation failed: ${error.message}`;
      throw error;
    }

    const promise = runner();
    return this.timeoutMs
      ? await runWithTimeout(promise, this.timeoutMs)
      : promise;
  }
}

/**
 * Replace vault references with stored content and collect metadata.
 */
function expandVaultReferences(rawCode) {
  const vaultRefs = [];
  if (!rawCode) {
    return { resolvedCode: '', vaultRefs };
  }

  const vault = Storage.loadVault();
  const vaultRefRegex = new RegExp(EXECUTION_VAULT_REF_PATTERN.source, EXECUTION_VAULT_REF_PATTERN.flags);
  const resolvedCode = rawCode.replace(vaultRefRegex, (match, vaultId) => {
    vaultRefs.push(vaultId);
    const entry = vault.find((item) => item.identifier === vaultId);
    if (!entry) {
      console.warn(`⚠️ Missing vault reference: ${vaultId}`);
      return `/* [MISSING_VAULT:${vaultId}] */`;
    }
    return entry.content || '';
  });

  return { resolvedCode, vaultRefs };
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
