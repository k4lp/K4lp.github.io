/**
 * Key Failure Tracker
 * Tracks key failures and marks keys as rate limited or invalid
 */

import { Storage } from '../../storage/storage.js';

export const KeyFailureTracker = {
    markRateLimit(slot, cooldownSeconds = 30) {
        const pool = Storage.loadKeypool();
        const rec = pool.find(k => k.slot === slot);
        if (!rec) return;

        const now = Date.now();
        rec.rateLimited = true;
        rec.cooldownUntil = now + cooldownSeconds * 1000;
        rec.failureCount = (rec.failureCount || 0) + 1;
        rec.lastFailure = now;
        Storage.saveKeypool(pool);
        console.warn(`🔑 Key #${slot} rate limited for ${cooldownSeconds}s (failure count: ${rec.failureCount})`);
    },

    markFailure(slot, reason = 'unknown') {
        const pool = Storage.loadKeypool();
        const rec = pool.find(k => k.slot === slot);
        if (!rec) return;

        const now = Date.now();
        rec.failureCount = (rec.failureCount || 0) + 1;
        rec.lastFailure = now;

        // If too many consecutive failures, temporarily mark as invalid
        if (rec.failureCount >= 3) {
            rec.rateLimited = true;
            rec.cooldownUntil = now + 60000; // 1 minute cooldown for repeated failures
            console.warn(`🔑 Key #${slot} temporarily disabled due to ${rec.failureCount} consecutive failures (${reason})`);
        }

        Storage.saveKeypool(pool);
    },

    markValid(slot, isValid) {
        const pool = Storage.loadKeypool();
        const rec = pool.find(k => k.slot === slot);
        if (!rec) return;

        rec.valid = !!isValid;
        if (isValid) {
            rec.failureCount = 0;
            rec.lastFailure = 0;
        }
        Storage.saveKeypool(pool);
    },

    bumpUsage(slot) {
        const pool = Storage.loadKeypool();
        const rec = pool.find(k => k.slot === slot);
        if (!rec) return;

        rec.usage = Number(rec.usage || 0) + 1;
        Storage.saveKeypool(pool);
    }
};
