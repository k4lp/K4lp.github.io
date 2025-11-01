/**
 * Config Store
 * Configuration value operations
 */

import { LS_KEYS } from '../../core/constants.js';

export const ConfigStore = {
    loadMaxOutputTokens() {
        const stored = localStorage.getItem(LS_KEYS.MAX_OUTPUT_TOKENS);
        if (stored) {
            const value = parseInt(stored);
            if (value >= 512 && value <= 65536) return value;
        }
        return 4096;
    },

    saveMaxOutputTokens(tokens) {
        const value = parseInt(tokens);
        if (value >= 512 && value <= 65536) {
            localStorage.setItem(LS_KEYS.MAX_OUTPUT_TOKENS, String(value));
            return true;
        }
        return false;
    }
};
