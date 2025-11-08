import { deepClone, deepFreeze } from '../utils/deep-utils.js';
import { eventBus, Events } from '../core/event-bus.js';

/**
 * In-memory Excel runtime store.
 * Keeps attachment data inside JS only (no LocalStorage persistence).
 */
class ExcelRuntimeStoreClass {
  constructor() {
    this._state = {
      metadata: null,
      original: null,
      working: null,
      mutationLog: [],
      version: 0
    };

    this._listeners = new Set();
  }

  _notify(reason) {
    const snapshot = this.getPublicState();
    eventBus.emit(Events.EXCEL_ATTACHMENT_UPDATED, { reason, state: snapshot });
    this._listeners.forEach((listener) => {
      try {
        listener(snapshot, reason);
      } catch (error) {
        console.error('[ExcelRuntimeStore] Listener error', error);
      }
    });
  }

  getPublicState() {
    return {
      metadata: this.getMetadata(),
      working: this.getWorkingCopy(),
      mutationLog: this.getMutationLog(),
      version: this._state.version
    };
  }

  setWorkbook({ metadata, original, working }) {
    this._state.metadata = metadata ? { ...metadata } : null;
    const frozenOriginal = original ? deepFreeze(deepClone(original)) : null;
    this._state.original = frozenOriginal;
    this._state.working = working ? deepClone(working) : null;
    this._state.mutationLog = [];
    this._state.version = 0;
    console.log('[ExcelRuntimeStore] Workbook imported:', {
      name: metadata?.name,
      sheets: metadata?.sheetNames?.length || 0
    });

    this._notify('import');
  }

  clearWorkbook() {
    this._state = {
      metadata: null,
      original: null,
      working: null,
      mutationLog: [],
      version: 0
    };
    console.log('[ExcelRuntimeStore] Workbook cleared from memory');

    this._notify('remove');
  }

  hasWorkbook() {
    return !!this._state.metadata;
  }

  getMetadata() {
    return this._state.metadata ? { ...this._state.metadata } : null;
  }

  getOriginal() {
    return this._state.original;
  }

  getWorkingCopy() {
    return this._state.working ? deepClone(this._state.working) : null;
  }

  getMutationLog() {
    return [...this._state.mutationLog];
  }

  mutateSheet(sheetName, mutator) {
    if (!this._state.working) {
      throw new Error('No workbook loaded.');
    }

    if (!this._state.working[sheetName]) {
      throw new Error(`Sheet "${sheetName}" not found.`);
    }

    const draft = deepClone(this._state.working[sheetName]);
    const result = mutator(draft);
    this._state.working[sheetName] = result === undefined ? draft : result;

    this._state.version += 1;
    this._state.mutationLog.push({
      sheet: sheetName,
      action: 'update',
      timestamp: new Date().toISOString(),
      version: this._state.version
    });
    console.log('[ExcelRuntimeStore] Sheet mutated:', sheetName, 'version', this._state.version);

    this._notify('update');
  }

  resetWorkingCopy() {
    if (!this._state.original) {
      this._state.working = null;
      console.warn('[ExcelRuntimeStore] resetWorkingCopy() called without original data');
      return;
    }

    this._state.working = deepClone(this._state.original);
    this._state.version += 1;
    this._state.mutationLog.push({
      action: 'reset',
      timestamp: new Date().toISOString(),
      version: this._state.version
    });
    console.log('[ExcelRuntimeStore] Working copy reset to original snapshot');

    this._notify('reset');
  }

  snapshotWorking() {
    return this._state.working ? deepClone(this._state.working) : null;
  }

  restoreWorking(snapshot) {
    this._state.working = snapshot ? deepClone(snapshot) : null;
    console.log('[ExcelRuntimeStore] Working copy restored from snapshot');
    this._notify('restore');
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this._listeners.add(listener);
    }
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener) {
    if (listener) {
      this._listeners.delete(listener);
    }
  }
}

export const ExcelRuntimeStore = new ExcelRuntimeStoreClass();
