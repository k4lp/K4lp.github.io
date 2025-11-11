/**
 * COMPACTION ARCHIVE
 *
 * Manages archiving of original logs before compaction.
 * Provides rollback capability if compaction fails.
 *
 * SAFETY: Archives original data before ANY modifications
 */

import { Storage } from '../../storage/storage.js';
import { eventBus, Events } from '../../core/event-bus.js';

export class CompactionArchive {
  /**
   * Archive logs before compaction
   *
   * @param {Object} gatheredData - Data from CompactionDataGatherer
   * @param {string} reason - Reason for archiving ('user_triggered' | 'auto_triggered')
   * @returns {string} Archive key
   */
  archive(gatheredData, reason = 'user_triggered') {
    const timestamp = Date.now();
    const sessionId = gatheredData.metadata.sessionId;
    const archiveKey = `gdrs_compaction_archive_${timestamp}_${sessionId}`;

    console.log('[CompactionArchive] Creating archive:', archiveKey);

    const archive = {
      key: archiveKey,
      timestamp,
      sessionId,
      reason,
      iterations: gatheredData.targetIterations,
      currentIteration: gatheredData.currentIteration,
      data: {
        // Full logs before compaction
        reasoningLog: Storage.loadReasoningLog() || [],
        executionLog: Storage.loadExecutionLog() || [],
        toolActivityLog: Storage.loadToolActivityLog() || []
      },
      metadata: {
        tokensBefore: this._estimateTokens(gatheredData),
        entryCount: {
          reasoning: gatheredData.reasoningEntries.length,
          execution: gatheredData.executionEntries.length,
          toolActivity: gatheredData.toolActivityEntries.length
        },
        snapshot: gatheredData.metadata
      }
    };

    // Save archive
    Storage.saveCompactionArchive(archiveKey, archive);

    // Emit event
    eventBus.emit(Events.COMPACTION_ARCHIVED, {
      archiveKey,
      timestamp,
      sessionId,
      iterations: gatheredData.targetIterations
    });

    // Prune old archives
    this._pruneOldArchives();

    return archiveKey;
  }

  /**
   * Restore from archive (rollback)
   *
   * @param {string} archiveKey - Archive key
   * @returns {Object} Restored data
   */
  restore(archiveKey) {
    console.log('[CompactionArchive] Restoring from archive:', archiveKey);

    const archive = Storage.loadCompactionArchive(archiveKey);
    if (!archive) {
      throw new Error('Archive not found: ' + archiveKey);
    }

    // Restore original logs
    Storage.saveReasoningLog(archive.data.reasoningLog);
    Storage.saveExecutionLog(archive.data.executionLog);
    Storage.saveToolActivityLog(archive.data.toolActivityLog);

    console.log('[CompactionArchive] Restored successfully');

    return {
      success: true,
      archiveKey,
      timestamp: archive.timestamp,
      iterations: archive.iterations
    };
  }

  /**
   * List all archives
   *
   * @returns {Array<Object>} Archive list with metadata
   */
  list() {
    const archiveKeys = Storage.listCompactionArchives();

    return archiveKeys.map(key => {
      const archive = Storage.loadCompactionArchive(key);
      if (!archive) return null;

      return {
        key: archive.key,
        timestamp: archive.timestamp,
        timestampFormatted: new Date(archive.timestamp).toLocaleString(),
        sessionId: archive.sessionId,
        reason: archive.reason,
        iterations: archive.iterations,
        currentIteration: archive.currentIteration,
        tokensBefore: archive.metadata?.tokensBefore,
        entryCount: archive.metadata?.entryCount
      };
    }).filter(Boolean);
  }

  /**
   * Delete archive
   *
   * @param {string} archiveKey - Archive key
   */
  delete(archiveKey) {
    console.log('[CompactionArchive] Deleting archive:', archiveKey);
    Storage.deleteCompactionArchive(archiveKey);
  }

  /**
   * Prune old archives
   * Keeps only the last N archives
   * @private
   */
  _pruneOldArchives() {
    const maxArchives = 10;
    const archives = Storage.listCompactionArchives();

    if (archives.length > maxArchives) {
      const toDelete = archives.slice(maxArchives);

      console.log(`[CompactionArchive] Pruning ${toDelete.length} old archives`);

      toDelete.forEach(key => {
        Storage.deleteCompactionArchive(key);
      });
    }
  }

  /**
   * Prune archives older than N days
   *
   * @param {number} maxAge - Max age in days (default: 30)
   * @returns {number} Number of archives deleted
   */
  pruneByAge(maxAge = 30) {
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const archives = this.list();

    let deletedCount = 0;

    archives.forEach(archive => {
      const age = now - archive.timestamp;

      if (age > maxAgeMs) {
        console.log(`[CompactionArchive] Deleting old archive (${Math.floor(age / (24 * 60 * 60 * 1000))} days old):`, archive.key);
        this.delete(archive.key);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      console.log(`[CompactionArchive] Pruned ${deletedCount} archives older than ${maxAge} days`);
    }

    return deletedCount;
  }

  /**
   * Estimate tokens in gathered data
   * @private
   */
  _estimateTokens(gatheredData) {
    const reasoningText = gatheredData.reasoningEntries.map(e => e.content).join('\n');
    const executionText = JSON.stringify(gatheredData.executionEntries);
    const toolText = JSON.stringify(gatheredData.toolActivityEntries);

    const totalChars = reasoningText.length + executionText.length + toolText.length;

    return Math.ceil(totalChars / 4);
  }
}

export default CompactionArchive;
