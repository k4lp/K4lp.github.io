/**
 * Key UI
 * UI-related key operations
 */

import { Storage } from '../../storage/storage.js';
import { qs } from '../../core/utils.js';

const KEY_ROTATION_DISPLAY_DURATION = 5000;

export const KeyUI = {
    showKeyRotationIndicator(fromSlot, toSlot, reason = '') {
        const indicator = qs('#keyRotationIndicator');
        const slotSpan = qs('#rotatedKeySlot');

        if (indicator && slotSpan) {
            slotSpan.textContent = toSlot;
            indicator.classList.remove('hidden');

            console.log(`🔄 Key rotation: #${fromSlot} → #${toSlot} ${reason ? `(${reason})` : ''}`);

            setTimeout(() => {
                indicator.classList.add('hidden');
            }, KEY_ROTATION_DISPLAY_DURATION);
        }
    },

    updateKeysFromTextarea() {
        const textarea = qs('#apiKeysTextarea');
        if (!textarea) return;

        const keysText = textarea.value;
        Storage.updateKeysFromText(keysText);
    },

    clearAll() {
        Storage.saveKeypool([]);
        const textarea = qs('#apiKeysTextarea');
        if (textarea) textarea.value = '';
    }
};
