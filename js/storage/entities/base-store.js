/**
 * Base Store
 * Generic CRUD operations for simple entities
 */

import { safeJSONParse } from '../../core/utils.js';

export function createSimpleStore(storageKey, defaultValue = []) {
    return {
        load() {
            return safeJSONParse(localStorage.getItem(storageKey), defaultValue);
        },

        save(data) {
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
    };
}
