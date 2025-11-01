/**
 * Vault Applier
 * Handles vault operations
 */

import { VaultManager } from '../../../storage/vault-manager.js';
import { nowISO } from '../../../core/utils.js';
import { appendActivity } from './applier-helpers.js';

export async function processVaultOperations(vaultOps, summary) {
    const vault = summary._snapshots.vault;

    for (const op of vaultOps) {
        const result = { id: op.id, action: op.action || detectVaultAction(op), status: 'success' };

        try {
            if (op.delete) {
                deleteVaultEntry(vault, op);
                summary._dirty.vault = true;
                appendActivity({
                    type: 'vault',
                    action: 'delete',
                    id: op.id,
                    status: 'success'
                });
            } else if (op.action === 'request_read') {
                handleVaultRead(op, vault, summary);
            } else if (op.id && op.content !== undefined) {
                upsertVaultEntry(vault, op);
                summary._dirty.vault = true;
            } else {
                throw new Error('Unsupported vault operation');
            }
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            summary.errors.push({
                type: 'vault',
                id: op.id || 'unknown',
                message: error.message
            });
        }

        summary.vault.push(result);
    }
}

function detectVaultAction(op) {
    if (op.delete) return 'delete';
    if (op.action === 'request_read') return 'request_read';
    return 'upsert';
}

function deleteVaultEntry(vault, op) {
    const idx = vault.findIndex((e) => e.id === op.id);
    if (idx !== -1) vault.splice(idx, 1);
}

function upsertVaultEntry(vault, op) {
    const existing = vault.find((e) => e.id === op.id);
    if (existing) {
        existing.content = op.content || '';
        existing.type = op.type || existing.type || 'text';
        if (op.description) existing.description = op.description;
        existing.updatedAt = nowISO();
        appendActivity({
            type: 'vault',
            action: 'update',
            id: op.id,
            status: 'success'
        });
    } else {
        vault.push({
            id: op.id,
            type: op.type || 'text',
            content: op.content || '',
            description: op.description || '',
            createdAt: nowISO(),
            updatedAt: nowISO()
        });
        appendActivity({
            type: 'vault',
            action: 'create',
            id: op.id,
            status: 'success'
        });
    }
}

function handleVaultRead(op, vaultSnapshot, summary) {
    const entry = vaultSnapshot.find((e) => e.id === op.id);
    if (entry) {
        const readResult = {
            id: op.id,
            content: entry.content,
            type: entry.type,
            description: entry.description
        };
        if (op.limit && typeof op.limit === 'number') {
            readResult.content = readResult.content.slice(0, op.limit);
        }
        summary.vault.push({
            id: op.id,
            action: 'request_read',
            status: 'success',
            data: readResult
        });
    } else {
        summary.vault.push({
            id: op.id,
            action: 'request_read',
            status: 'error',
            error: `Vault entry '${op.id}' not found`
        });
        summary.errors.push({
            type: 'vault',
            id: op.id,
            message: `Vault entry '${op.id}' not found`
        });
    }
}
