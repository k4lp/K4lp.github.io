/**
 * COMPACTION LOG REPLACER
 *
 * Replaces old reasoning logs (iterations 1 to N-1) with compacted summary.
 * Keeps iteration N intact.
 *
 * CORE COMPACTION LOGIC:
 * 1. Load full reasoning log
 * 2. Extract iteration N (current iteration)
 * 3. Replace iterations 1 to N-1 with compacted summary
 * 4. Save new log = [compacted summary, iteration N]
 */

import { Storage } from '../../storage/storage.js';

export class CompactionLogReplacer {
  /**
   * Replace old logs with compacted summary
   *
   * @param {string} compactedSummary - Summary from Gemini
   * @param {number} currentIteration - Current iteration number
   * @returns {Object} Result with success status
   */
  replace(compactedSummary, currentIteration) {
    console.log(`[CompactionLogReplacer] Replacing iterations 1-${currentIteration - 1} with summary`);

    try {
      // Load full reasoning log
      const fullLog = Storage.loadReasoningLog() || [];

      if (fullLog.length === 0) {
        throw new Error('Reasoning log is empty');
      }

      // Extract iteration N (current iteration)
      const iterationN = this._extractIterationN(fullLog, currentIteration);

      if (!iterationN || iterationN.length === 0) {
        throw new Error(`Iteration ${currentIteration} not found in log`);
      }

      // Build new log: [compacted summary, iteration N]
      const newLog = [
        compactedSummary,
        ...iterationN
      ];

      // Save new log
      Storage.saveReasoningLog(newLog);

      console.log(`[CompactionLogReplacer] Success - New log size: ${newLog.length} lines`);

      return {
        success: true,
        oldSize: fullLog.length,
        newSize: newLog.length,
        reduction: fullLog.length - newLog.length,
        reductionPercent: ((1 - newLog.length / fullLog.length) * 100).toFixed(1)
      };

    } catch (error) {
      console.error('[CompactionLogReplacer] Error:', error);
      throw error;
    }
  }

  /**
   * Extract iteration N from full log
   * @private
   */
  _extractIterationN(fullLog, targetIteration) {
    const lines = [];
    let currentIterationNum = null;
    let capturing = false;

    for (let i = 0; i < fullLog.length; i++) {
      const line = fullLog[i];
      const iterMatch = line.match(/^=== ITERATION (\d+) ===/);

      if (iterMatch) {
        const iterNum = parseInt(iterMatch[1]);

        if (iterNum === targetIteration) {
          // Start capturing iteration N
          capturing = true;
          currentIterationNum = iterNum;
          lines.push(line);
        } else if (capturing) {
          // Reached next iteration, stop capturing
          break;
        }
      } else if (capturing) {
        // Capture lines of iteration N
        lines.push(line);
      }
    }

    return lines;
  }
}

export default CompactionLogReplacer;
