/**
 * COMPACTION DATA GATHERER
 *
 * Extracts and filters reasoning logs for compaction.
 * Only includes iterations 1 through (current - 1).
 *
 * DOES NOT MODIFY EXISTING DATA - only reads and filters
 */

import { Storage } from '../../storage/storage.js';

export class CompactionDataGatherer {
  constructor() {
    this.currentIteration = null;
    this.targetIterations = [];
  }

  /**
   * Gather all data needed for compaction
   *
   * @param {number} currentIteration - Current iteration number
   * @returns {Object} Gathered data
   */
  gather(currentIteration) {
    this.currentIteration = currentIteration;
    this.targetIterations = this._getTargetIterations();

    console.log(`[CompactionGatherer] Gathering data for iterations 1-${currentIteration - 1}`);

    const data = {
      currentIteration,
      targetIterations: this.targetIterations,
      reasoningEntries: this._gatherReasoningLog(),
      executionEntries: this._gatherExecutionLog(),
      toolActivityEntries: this._gatherToolActivityLog(),
      metadata: this._gatherMetadata()
    };

    console.log(`[CompactionGatherer] Gathered:`, {
      reasoningEntries: data.reasoningEntries.length,
      executionEntries: data.executionEntries.length,
      toolActivityEntries: data.toolActivityEntries.length
    });

    return data;
  }

  /**
   * Get target iteration numbers (1 to N-1)
   * @private
   */
  _getTargetIterations() {
    const iterations = [];
    for (let i = 1; i < this.currentIteration; i++) {
      iterations.push(i);
    }
    return iterations;
  }

  /**
   * Gather reasoning log entries
   * Extracts entries for target iterations only
   * @private
   */
  _gatherReasoningLog() {
    const fullLog = Storage.loadReasoningLog() || [];
    if (!Array.isArray(fullLog)) return [];

    const entries = [];
    let currentIterationNum = null;
    let currentBlock = [];

    fullLog.forEach(line => {
      // Check if this is an iteration marker
      const iterMatch = line.match(/^=== ITERATION (\d+) ===/);

      if (iterMatch) {
        // Save previous block if it was in target range
        if (currentIterationNum && this.targetIterations.includes(currentIterationNum)) {
          entries.push({
            iteration: currentIterationNum,
            content: currentBlock.join('\n'),
            timestamp: this._extractTimestamp(currentBlock)
          });
        }

        // Start new block
        currentIterationNum = parseInt(iterMatch[1]);
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    });

    // Handle last block (but only if it's in target range)
    if (currentIterationNum && this.targetIterations.includes(currentIterationNum)) {
      entries.push({
        iteration: currentIterationNum,
        content: currentBlock.join('\n'),
        timestamp: this._extractTimestamp(currentBlock)
      });
    }

    return entries;
  }

  /**
   * Gather execution log entries
   * Filters entries that belong to target iterations
   * @private
   */
  _gatherExecutionLog() {
    const fullLog = Storage.loadExecutionLog() || [];
    if (!Array.isArray(fullLog)) return [];

    // Since execution logs don't have iteration numbers,
    // we'll take the first (N-1) * 2 entries
    // Assuming ~2 executions per iteration on average
    const estimatedCount = (this.currentIteration - 1) * 2;

    return fullLog.slice(0, estimatedCount);
  }

  /**
   * Gather tool activity log entries
   * @private
   */
  _gatherToolActivityLog() {
    const fullLog = Storage.loadToolActivityLog() || [];
    if (!Array.isArray(fullLog)) return [];

    // Filter by iteration field if available
    const entries = fullLog.filter(entry => {
      return entry.iteration && this.targetIterations.includes(entry.iteration);
    });

    return entries;
  }

  /**
   * Gather metadata about the session
   * @private
   */
  _gatherMetadata() {
    return {
      sessionId: Storage.loadCurrentSessionId?.() || 'unknown',
      timestamp: new Date().toISOString(),
      tasksSnapshot: this._snapshotTasks(),
      goalsSnapshot: this._snapshotGoals(),
      memorySnapshot: this._snapshotMemory(),
      vaultSummary: this._snapshotVault()
    };
  }

  /**
   * Snapshot tasks (for metadata only)
   * @private
   */
  _snapshotTasks() {
    const tasks = Storage.loadTasks?.() || [];
    return tasks.map(task => ({
      heading: task.heading,
      status: task.status
    }));
  }

  /**
   * Snapshot goals (for metadata only)
   * @private
   */
  _snapshotGoals() {
    const goals = Storage.loadGoals?.() || [];
    return goals.map(goal => ({
      heading: goal.heading
    }));
  }

  /**
   * Snapshot memory (for metadata only)
   * @private
   */
  _snapshotMemory() {
    const memory = Storage.loadMemory?.() || [];
    return memory.map(m => ({
      heading: m.heading
    }));
  }

  /**
   * Snapshot vault (for metadata only)
   * @private
   */
  _snapshotVault() {
    const vault = Storage.loadVault?.() || [];
    return vault.map(v => ({
      identifier: v.identifier,
      type: v.type,
      description: v.description
    }));
  }

  /**
   * Extract timestamp from log block
   * @private
   */
  _extractTimestamp(block) {
    // Try to find a timestamp in the block
    const timestampMatch = block.join('\n').match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    return timestampMatch ? timestampMatch[0] : new Date().toISOString();
  }

  /**
   * Estimate token count of gathered data
   *
   * @returns {number} Estimated tokens
   */
  estimateTokenCount() {
    const reasoningText = this.reasoningEntries?.map(e => e.content).join('\n') || '';
    const executionText = JSON.stringify(this.executionEntries || []);
    const toolText = JSON.stringify(this.toolActivityEntries || []);

    const totalChars = reasoningText.length + executionText.length + toolText.length;

    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
  }
}

export default CompactionDataGatherer;
