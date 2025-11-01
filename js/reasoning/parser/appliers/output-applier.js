/**
 * Output Applier
 * Handles final output processing
 */

import { Storage } from '../../../storage/storage.js';
import { VaultManager } from '../../../storage/vault-manager.js';
import { appendActivity } from './applier-helpers.js';

export function processFinalOutputs(finalOutputBlocks, summary) {
    if (finalOutputBlocks.length === 0) return;

    const resolved = VaultManager.resolveVaultRefsInText(finalOutputBlocks[finalOutputBlocks.length - 1]);
    Storage.saveFinalOutput(resolved);
    Storage.markFinalOutputVerified();

    summary.finalOutput.push({
        status: 'success',
        length: resolved.length
    });

    appendActivity({
        type: 'final_output',
        action: 'set',
        id: 'final_output',
        status: 'success'
    });
}
