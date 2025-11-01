/**
 * Key Stats
 * Get statistics about API keys
 */

import { Storage } from '../../storage/storage.js';
import { KeySelector } from './key-selector.js';

export const KeyStats = {
    getKeyStats() {
        const pool = Storage.loadKeypool();
        const now = Date.now();

        const stats = {
            total: pool.length,
            valid: 0,
            invalid: 0,
            rateLimited: 0,
            cooling: 0,
            ready: 0,
            totalUsage: 0,
            avgFailures: 0,
            oldestKey: null,
            newestKey: null
        };

        if (pool.length === 0) return stats;

        let totalFailures = 0;
        let oldestTime = Infinity;
        let newestTime = 0;

        pool.forEach(k => {
            if (k.valid) stats.valid++; else stats.invalid++;
            if (k.rateLimited) stats.rateLimited++;

            const cooldown = KeySelector.getCooldownRemainingSeconds(k);
            if (cooldown > 0) stats.cooling++;

            if (k.key && k.valid && !k.rateLimited && cooldown === 0) {
                stats.ready++;
            }

            stats.totalUsage += k.usage || 0;
            totalFailures += k.failureCount || 0;

            const keyTime = k.addedAt || now;
            if (keyTime < oldestTime) {
                oldestTime = keyTime;
                stats.oldestKey = k;
            }
            if (keyTime > newestTime) {
                newestTime = keyTime;
                stats.newestKey = k;
            }
        });

        stats.avgFailures = totalFailures / pool.length;

        return stats;
    }
};
