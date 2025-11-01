/**
 * Key Validator
 * Validates API keys against Gemini API
 */

import { Storage } from '../../storage/storage.js';

export const KeyValidator = {
    async validateAllKeys() {
        const pool = Storage.loadKeypool();

        console.log(`🔑 Validating ${pool.length} API keys...`);

        for (const k of pool) {
            if (!k.key) {
                k.valid = false;
                continue;
            }

            try {
                const resp = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/models?key=' +
                    encodeURIComponent(k.key)
                );

                if (resp.status === 429) {
                    k.valid = true;
                    k.rateLimited = true;
                    k.cooldownUntil = Date.now() + 30 * 1000;
                } else if (resp.ok) {
                    k.valid = true;
                    k.failureCount = 0;
                    k.lastFailure = 0;
                } else if (resp.status === 401 || resp.status === 403) {
                    k.valid = false;
                } else {
                    k.valid = false;
                }
            } catch (err) {
                k.valid = false;
                console.error(`Key #${k.slot} validation error:`, err);
            }
        }

        Storage.saveKeypool(pool);
        console.log(`✅ Key validation complete`);
    }
};
