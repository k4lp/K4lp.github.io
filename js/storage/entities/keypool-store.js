/**
 * Keypool Store
 * Complex keypool management operations
 */

import { LS_KEYS, DEFAULT_KEYPOOL, createKeyFromText } from '../../core/constants.js';
import { safeJSONParse, isNonEmptyString } from '../../core/utils.js';

export const KeypoolStore = {
    load() {
        const raw = safeJSONParse(localStorage.getItem(LS_KEYS.KEYPOOL), null);
        if (!Array.isArray(raw)) {
            const seed = DEFAULT_KEYPOOL();
            localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(seed));
            return seed;
        }
        return this.normalize(raw);
    },

    save(pool) {
        localStorage.setItem(LS_KEYS.KEYPOOL, JSON.stringify(pool));
    },

    parseFromText(keysText) {
        if (!keysText || typeof keysText !== 'string') return [];
        return keysText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((keyText, index) => createKeyFromText(keyText, index));
    },

    formatToText(pool) {
        if (!Array.isArray(pool)) return '';
        return pool.map(k => k.key).join('\n');
    },

    updateFromText(keysText) {
        const oldPool = this.load();
        const newKeys = this.parseFromText(keysText);

        const updatedPool = newKeys.map(newKey => {
            const existing = oldPool.find(oldKey => oldKey.key === newKey.key);
            return existing ? { ...existing, slot: newKey.slot } : newKey;
        });

        this.save(updatedPool);
        return updatedPool;
    },

    normalize(arr) {
        return arr.map((k, index) => ({
            slot: index + 1,
            key: isNonEmptyString(k.key) ? k.key.trim() : '',
            usage: Number(k.usage || 0),
            cooldownUntil: Number(k.cooldownUntil || 0),
            rateLimited: !!k.rateLimited,
            valid: !!k.valid,
            failureCount: Number(k.failureCount || 0),
            lastFailure: Number(k.lastFailure || 0),
            addedAt: Number(k.addedAt || Date.now())
        }));
    }
};
