/**
 * ReasoningStateSnapshot
 *
 * Captures a consistent view of storage-backed entities so context providers
 * can operate on in-memory data without triggering additional storage calls.
 */

import { Storage } from '../../storage/storage.js';
import { VaultManager } from '../../storage/vault-manager.js';

export class ReasoningStateSnapshot {
  constructor({ storage = Storage, vaultManager = VaultManager } = {}) {
    this.storage = storage;
    this.vaultManager = vaultManager;
    this._captured = false;
  }

  /**
     * Capture the latest state from storage.
     */
  capture() {
    this._tasks = cloneArray(this.storage.loadTasks());
    this._goals = cloneArray(this.storage.loadGoals());
    this._memory = cloneArray(this.storage.loadMemory());
    this._reasoningLog = cloneArray(this.storage.loadReasoningLog());
    this._executionLog = cloneArray(this.storage.loadExecutionLog());
    this._maxOutputTokens = this.storage.loadMaxOutputTokens();
    this._vaultSummary = this.vaultManager.getVaultSummary();
    this._captured = true;
    return this;
  }

  ensureCaptured() {
    if (!this._captured) {
      this.capture();
    }
  }

  get tasks() {
    this.ensureCaptured();
    return this._tasks;
  }

  get goals() {
    this.ensureCaptured();
    return this._goals;
  }

  get memory() {
    this.ensureCaptured();
    return this._memory;
  }

  get reasoningLog() {
    this.ensureCaptured();
    return this._reasoningLog;
  }

  get executionLog() {
    this.ensureCaptured();
    return this._executionLog;
  }

  get maxOutputTokens() {
    this.ensureCaptured();
    return this._maxOutputTokens;
  }

  get vaultSummary() {
    this.ensureCaptured();
    return this._vaultSummary;
  }

  getRecentReasoning(limit) {
    const entries = this.reasoningLog;
    if (!Number.isFinite(limit) || limit <= 0) return entries;
    return entries.slice(-limit);
  }

  getRecentExecutions(limit) {
    const entries = this.executionLog;
    if (!Number.isFinite(limit) || limit <= 0) return entries;
    return entries.slice(-limit);
  }
}

function cloneArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === 'object' && item !== null ? { ...item } : item));
}

export default ReasoningStateSnapshot;
