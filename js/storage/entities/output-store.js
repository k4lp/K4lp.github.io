/**
 * Output Store
 * Final output with verification tracking
 */

import { LS_KEYS } from '../../core/constants.js';
import { nowISO } from '../../core/utils.js';

export const OutputStore = {
    load() {
        return localStorage.getItem(LS_KEYS.FINAL_OUTPUT) || '';
    },

    save(htmlString, verified = false, source = 'auto') {
        localStorage.setItem(LS_KEYS.FINAL_OUTPUT, htmlString || '');

        if (verified) {
            localStorage.setItem(LS_KEYS.FINAL_OUTPUT_VERIFIED, JSON.stringify({
                verified: true,
                timestamp: nowISO(),
                source: source
            }));
        }
    },

    isVerified() {
        const verificationData = localStorage.getItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
        if (!verificationData) return false;

        try {
            const parsed = JSON.parse(verificationData);
            return parsed.verified === true;
        } catch {
            return false;
        }
    },

    markVerified() {
        localStorage.setItem(LS_KEYS.FINAL_OUTPUT_VERIFIED, JSON.stringify({
            verified: true,
            timestamp: nowISO(),
            source: 'manual'
        }));
    },

    clearVerification() {
        localStorage.removeItem(LS_KEYS.FINAL_OUTPUT_VERIFIED);
    }
};
