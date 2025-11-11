/**
 * COMPACTION BUTTON UI
 *
 * Handles the "Compact Context" button and displays compaction status.
 */

import { CompactionOrchestrator } from '../../reasoning/compaction/CompactionOrchestrator.js';
import { eventBus, Events } from '../../core/event-bus.js';

export class CompactionButton {
  constructor() {
    this.orchestrator = new CompactionOrchestrator();
    this.button = null;
    this.statusPill = null;
  }

  /**
   * Initialize button and event listeners
   */
  init() {
    this.button = document.getElementById('compactContextBtn');
    this.statusPill = document.getElementById('compactionStatus');

    if (!this.button) {
      console.warn('[CompactionButton] Button not found in DOM');
      return;
    }

    // Click handler
    this.button.addEventListener('click', () => this.handleClick());

    // Listen to compaction events
    this._setupEventListeners();

    console.log('[CompactionButton] Initialized');
  }

  /**
   * Handle button click
   */
  async handleClick() {
    if (this.orchestrator.isInProgress()) {
      console.log('[CompactionButton] Compaction already in progress');
      return;
    }

    this.setStatus('compacting', 'COMPACTING...');
    this.button.disabled = true;

    try {
      const result = await this.orchestrator.manualCompact();

      if (result.success) {
        this.setStatus('success', 'COMPLETE');
        this.showSuccess(result);

        // Reset status after 3 seconds
        setTimeout(() => {
          this.setStatus('idle', 'IDLE');
        }, 3000);
      } else {
        this.setStatus('error', 'FAILED');
        this.showError(result.error);

        // Reset status after 5 seconds
        setTimeout(() => {
          this.setStatus('idle', 'IDLE');
        }, 5000);
      }
    } catch (error) {
      console.error('[CompactionButton] Error:', error);
      this.setStatus('error', 'ERROR');
      this.showError(error.message);

      // Reset status after 5 seconds
      setTimeout(() => {
        this.setStatus('idle', 'IDLE');
      }, 5000);
    } finally {
      this.button.disabled = false;
    }
  }

  /**
   * Set status pill
   */
  setStatus(type, text) {
    if (!this.statusPill) return;

    this.statusPill.textContent = text;
    this.statusPill.className = 'pill';

    if (type === 'compacting') {
      this.statusPill.classList.add('pill-primary');
    } else if (type === 'success') {
      this.statusPill.classList.add('pill-success');
    } else if (type === 'error') {
      this.statusPill.classList.add('pill-danger');
    } else {
      this.statusPill.classList.add('pill-muted');
    }

    this.statusPill.classList.remove('hidden');
  }

  /**
   * Show success message
   */
  showSuccess(result) {
    console.log('[CompactionButton] Success:', result);

    // Show toast/notification
    const message = `Context compacted successfully! Reduced by ${result.reductionPercent}% (${result.oldLogSize} → ${result.newLogSize} lines)`;

    this._showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(errorMessage) {
    console.error('[CompactionButton] Error:', errorMessage);

    this._showNotification(`Compaction failed: ${errorMessage}`, 'error');
  }

  /**
   * Show notification (simple console log for now)
   * @private
   */
  _showNotification(message, type) {
    // For now, just log to console
    // In the future, can add a toast notification UI
    if (type === 'success') {
      console.log(`✅ ${message}`);
    } else {
      console.error(`❌ ${message}`);
    }
  }

  /**
   * Setup event listeners for compaction events
   * @private
   */
  _setupEventListeners() {
    eventBus.on(Events.COMPACTION_START, (data) => {
      console.log('[CompactionButton] Compaction started:', data);
      this.setStatus('compacting', 'COMPACTING...');
    });

    eventBus.on(Events.COMPACTION_COMPLETE, (data) => {
      console.log('[CompactionButton] Compaction complete:', data);
      this.setStatus('success', 'COMPLETE');
    });

    eventBus.on(Events.COMPACTION_ERROR, (data) => {
      console.error('[CompactionButton] Compaction error:', data);
      this.setStatus('error', 'FAILED');
    });
  }
}

export default CompactionButton;
