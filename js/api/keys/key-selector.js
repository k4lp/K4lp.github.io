/**
 * Key Selector
 * Chooses the best available API key
 */

import { Storage } from '../../storage/storage.js';

export const KeySelector = {
    getCooldownRemainingSeconds(k) {
        const now = Date.now();
        if (!k.cooldownUntil || k.cooldownUntil <= now) return 0;
        return Math.ceil((k.cooldownUntil - now) / 1000);
    },

    chooseActiveKey() {
        const pool = Storage.loadKeypool();
        this.liftCooldowns();

        // First, try to find a key with no recent failures
        let usable = pool.find(k => {
            const cd = this.getCooldownRemainingSeconds(k);
            return k.key && k.valid && !k.rateLimited && cd === 0 && k.failureCount === 0;
        });

        // If no perfect key found, try keys with minimal failures
        if (!usable) {
            usable = pool.filter(k => {
                const cd = this.getCooldownRemainingSeconds(k);
                return k.key && k.valid && !k.rateLimited && cd === 0;
            }).sort((a, b) => (a.failureCount || 0) - (b.failureCount || 0))[0];
        }

        return usable || null;
    },

    getAllAvailableKeys() {
        const pool = Storage.loadKeypool();
        this.liftCooldowns();

        return pool.filter(k => {
            const cd = this.getCooldownRemainingSeconds(k);
            return k.key && k.valid && !k.rateLimited && cd === 0;
        }).sort((a, b) => (a.failureCount || 0) - (b.failureCount || 0));
    },

    liftCooldowns() {
        const pool = Storage.loadKeypool();
        let dirty = false;
        const now = Date.now();

        for (const k of pool) {
            if (k.cooldownUntil && k.cooldownUntil <= now) {
                if (k.rateLimited) dirty = true;
                k.rateLimited = false;
                k.cooldownUntil = 0;
            }
            // Reset failure count after 10 minutes of no failures
            if (k.lastFailure && (now - k.lastFailure) > 600000) { // 10 minutes
                if (k.failureCount > 0) {
                    k.failureCount = 0;
                    dirty = true;
                }
            }
        }

        if (dirty) Storage.saveKeypool(pool);
    }
};
