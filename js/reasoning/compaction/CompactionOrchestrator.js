/**
 * COMPACTION ORCHESTRATOR
 *
 * Main orchestrator for context compaction.
 * Coordinates the entire compaction workflow.
 *
 * WORKFLOW:
 * 1. Check if compaction needed
 * 2. Gather data from iterations 1 to N-1
 * 3. Archive original logs (for rollback)
 * 4. Build prompt for Gemini
 * 5. Execute compaction with Gemini
 * 6. Replace logs with summary
 * 7. Emit completion event
 *
 * TRIGGER: Every 15 iterations
 */

import { CompactionDataGatherer } from './CompactionDataGatherer.js';
import { CompactionArchive } from './CompactionArchive.js';
import { CompactionPromptBuilder } from './CompactionPromptBuilder.js';
import { CompactionExecutor } from './CompactionExecutor.js';
import { CompactionLogReplacer } from './CompactionLogReplacer.js';
import { eventBus, Events } from '../../core/event-bus.js';
import { Storage } from '../../storage/storage.js';

export class CompactionOrchestrator {
  constructor() {
    this.dataGatherer = new CompactionDataGatherer();
    this.archive = new CompactionArchive();
    this.promptBuilder = new CompactionPromptBuilder();
    this.executor = new CompactionExecutor();
    this.logReplacer = new CompactionLogReplacer();

    this.isCompacting = false;
  }

  /**
   * Check if compaction should be triggered
   *
   * @param {number} currentIteration - Current iteration number
   * @returns {boolean} True if compaction needed
   */
  shouldCompact(currentIteration) {
    // Trigger every 15 iterations
    return currentIteration > 0 && currentIteration % 15 === 0;
  }

  /**
   * Execute compaction workflow
   *
   * @param {number} currentIteration - Current iteration number
   * @returns {Promise<Object>} Compaction result
   */
  async compact(currentIteration) {
    if (this.isCompacting) {
      console.warn('[CompactionOrchestrator] Compaction already in progress');
      return { success: false, error: 'Already compacting' };
    }

    this.isCompacting = true;

    console.log(`[CompactionOrchestrator] Starting compaction for iteration ${currentIteration}`);

    // Emit start event
    eventBus.emit(Events.COMPACTION_START, {
      iteration: currentIteration,
      timestamp: Date.now()
    });

    try {
      // Step 1: Gather data from iterations 1 to N-1
      console.log('[CompactionOrchestrator] Step 1: Gathering data...');
      const gatheredData = this.dataGatherer.gather(currentIteration);

      if (!gatheredData || gatheredData.targetIterations.length === 0) {
        throw new Error('No data to compact');
      }

      // Step 2: Archive original logs (for rollback)
      console.log('[CompactionOrchestrator] Step 2: Archiving original logs...');
      const archiveKey = this.archive.archive(gatheredData, 'auto_triggered');

      // Step 3: Build prompt for Gemini
      console.log('[CompactionOrchestrator] Step 3: Building prompt...');
      const prompt = this.promptBuilder.build(gatheredData);

      // Step 4: Execute compaction with Gemini
      console.log('[CompactionOrchestrator] Step 4: Executing with Gemini...');
      const compactedSummary = await this.executor.execute(prompt);

      // Step 5: Replace logs with summary
      console.log('[CompactionOrchestrator] Step 5: Replacing logs...');
      const replacementResult = this.logReplacer.replace(compactedSummary, currentIteration);

      // Build result
      const result = {
        success: true,
        iteration: currentIteration,
        archiveKey,
        targetIterations: gatheredData.targetIterations,
        oldLogSize: replacementResult.oldSize,
        newLogSize: replacementResult.newSize,
        reduction: replacementResult.reduction,
        reductionPercent: replacementResult.reductionPercent,
        timestamp: Date.now()
      };

      console.log('[CompactionOrchestrator] Compaction complete:', {
        iteration: result.iteration,
        reduction: `${result.reductionPercent}%`,
        archiveKey: result.archiveKey
      });

      // Emit completion event
      eventBus.emit(Events.COMPACTION_COMPLETE, result);

      this.isCompacting = false;

      return result;

    } catch (error) {
      console.error('[CompactionOrchestrator] Compaction failed:', error);

      // Emit error event
      eventBus.emit(Events.COMPACTION_ERROR, {
        iteration: currentIteration,
        error: error.message,
        timestamp: Date.now()
      });

      this.isCompacting = false;

      return {
        success: false,
        iteration: currentIteration,
        error: error.message
      };
    }
  }

  /**
   * Manually trigger compaction (from UI button)
   *
   * @returns {Promise<Object>} Compaction result
   */
  async manualCompact() {
    // Get current iteration from reasoning log
    const reasoningLog = Storage.loadReasoningLog() || [];
    const currentIteration = this._getCurrentIteration(reasoningLog);

    if (currentIteration < 2) {
      return {
        success: false,
        error: 'Not enough iterations to compact (need at least 2)'
      };
    }

    return await this.compact(currentIteration);
  }

  /**
   * Get current iteration number from reasoning log
   * @private
   */
  _getCurrentIteration(reasoningLog) {
    let maxIteration = 0;

    for (const line of reasoningLog) {
      const iterMatch = line.match(/^=== ITERATION (\d+) ===/);
      if (iterMatch) {
        const iterNum = parseInt(iterMatch[1]);
        if (iterNum > maxIteration) {
          maxIteration = iterNum;
        }
      }
    }

    return maxIteration;
  }

  /**
   * Check if compaction is currently in progress
   *
   * @returns {boolean} True if compacting
   */
  isInProgress() {
    return this.isCompacting;
  }
}

export default CompactionOrchestrator;
