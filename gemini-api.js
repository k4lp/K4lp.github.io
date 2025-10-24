// gemini-api.js - Gemini API Integration with Rate Limiting & Key Management

import { storageManager } from './storage.js';

class GeminiAPI {
    constructor() {
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        this.rawKeys = [];
        this.activeKeyEntries = [];
        this.apiKeys = [];
        this.modelCache = [];
        this.keyStatus = storageManager.getKeyStatus();
        this.normalizeKeyStatus();
    }

    createDefaultStatus() {
        return {
            rateLimited: false,
            limitedAt: null,
            invalid: false,
            invalidMessage: '',
            usageCount: 0,
            lastUsedAt: null,
            cooldownMs: null,
            lastError: '',
            lastErrorAt: null,
            willRetry: true
        };
    }

    initialize() {
        const storedKeys = storageManager.getApiKeys();
        this.setApiKeys(storedKeys);
    }

    setApiKeys(keys) {
        const sanitizedKeys = Array.isArray(keys)
            ? keys.map(key => (key || '').trim())
            : [];

        const previousKeys = this.rawKeys || [];
        this.rawKeys = sanitizedKeys;

        this.activeKeyEntries = sanitizedKeys
            .map((key, slotIndex) => ({ key, slotIndex }))
            .filter(entry => entry.key !== '');

        this.apiKeys = this.activeKeyEntries.map(entry => entry.key);
        this.normalizeKeyStatus(previousKeys);
    }

    normalizeKeyStatus(previousKeys = []) {
        if (!this.keyStatus || !Array.isArray(this.keyStatus.statuses)) {
            this.keyStatus = {
                currentIndex: 0,
                statuses: Array(5).fill().map(() => this.createDefaultStatus())
            };
        }

        const statuses = Array(5).fill().map((_, slotIndex) => {
            const currentKey = this.rawKeys[slotIndex] || '';
            const previousKey = previousKeys[slotIndex] || '';
            const keyChanged = currentKey !== previousKey;

            if (!currentKey || keyChanged) {
                return this.createDefaultStatus();
            }

            const existing = (this.keyStatus.statuses && this.keyStatus.statuses[slotIndex]) || {};
            const base = this.createDefaultStatus();

            return {
                ...base,
                ...existing,
                rateLimited: !!existing.rateLimited,
                limitedAt: typeof existing.limitedAt === 'number' ? existing.limitedAt : base.limitedAt,
                invalid: !!existing.invalid,
                invalidMessage: existing.invalidMessage || '',
                usageCount: Number.isFinite(existing.usageCount) ? existing.usageCount : base.usageCount,
                lastUsedAt: typeof existing.lastUsedAt === 'number' ? existing.lastUsedAt : base.lastUsedAt,
                cooldownMs: Number.isFinite(existing.cooldownMs) ? existing.cooldownMs : base.cooldownMs,
                lastError: existing.lastError || '',
                lastErrorAt: typeof existing.lastErrorAt === 'number' ? existing.lastErrorAt : base.lastErrorAt,
                willRetry: existing.willRetry === false ? false : true
            };
        });

        this.keyStatus.statuses = statuses;

        if (!Number.isInteger(this.keyStatus.currentIndex)) {
            this.keyStatus.currentIndex = 0;
        }

        if (this.activeKeyEntries.length === 0) {
            this.keyStatus.currentIndex = 0;
        } else if (this.keyStatus.currentIndex >= this.activeKeyEntries.length) {
            this.keyStatus.currentIndex = 0;
        }

        storageManager.saveKeyStatus(this.keyStatus);
    }

    updateApiKeys(keys) {
        const sanitizedKeys = Array.isArray(keys)
            ? keys.map(key => (key || '').trim())
            : [];

        storageManager.saveApiKeys(sanitizedKeys);
        this.modelCache = [];
        this.setApiKeys(sanitizedKeys);
        storageManager.saveKeyStatus(this.keyStatus);
    }

    ensureStatus(slotIndex) {
        const existing = this.keyStatus.statuses[slotIndex];
        if (!existing) {
            this.keyStatus.statuses[slotIndex] = this.createDefaultStatus();
            return this.keyStatus.statuses[slotIndex];
        }

        const base = this.createDefaultStatus();
        const merged = {
            ...base,
            ...existing
        };

        if (!Number.isFinite(merged.usageCount)) merged.usageCount = base.usageCount;
        if (typeof merged.limitedAt !== 'number') merged.limitedAt = base.limitedAt;
        if (!Number.isFinite(merged.cooldownMs)) merged.cooldownMs = base.cooldownMs;
        if (typeof merged.lastUsedAt !== 'number') merged.lastUsedAt = base.lastUsedAt;
        if (typeof merged.lastErrorAt !== 'number') merged.lastErrorAt = base.lastErrorAt;
        merged.invalidMessage = merged.invalidMessage || '';
        merged.lastError = merged.lastError || '';
        merged.rateLimited = !!merged.rateLimited;
        merged.invalid = !!merged.invalid;
        merged.willRetry = merged.willRetry === false ? false : true;

        this.keyStatus.statuses[slotIndex] = merged;
        return merged;
    }

    saveKeyStatus() {
        storageManager.saveKeyStatus(this.keyStatus);
    }

    recordKeyUsage(slotIndex) {
        const status = this.ensureStatus(slotIndex);
        status.usageCount = (status.usageCount || 0) + 1;
        status.lastUsedAt = Date.now();
        if (!status.rateLimited && !status.invalid) {
            status.lastError = '';
            status.lastErrorAt = null;
        }
        status.willRetry = true;
        this.saveKeyStatus();
    }

    recordKeyError(slotIndex, message, willRetry = true) {
        const status = this.ensureStatus(slotIndex);
        status.lastError = message;
        status.lastErrorAt = Date.now();
        status.willRetry = willRetry;
        this.saveKeyStatus();
    }

    advanceCurrentIndex() {
        if (this.activeKeyEntries.length === 0) {
            this.keyStatus.currentIndex = 0;
        } else {
            this.keyStatus.currentIndex = (this.keyStatus.currentIndex + 1) % this.activeKeyEntries.length;
        }
    }

    getCurrentApiKey() {
        if (this.activeKeyEntries.length === 0) {
            return null;
        }
        const entry = this.activeKeyEntries[this.keyStatus.currentIndex];
        return entry ? entry.key : null;
    }

    getNextAvailableKey() {
        if (this.activeKeyEntries.length === 0) {
            return null;
        }

        const now = Date.now();
        const total = this.activeKeyEntries.length;
        let attempts = 0;

        while (attempts < total) {
            if (this.keyStatus.currentIndex >= this.activeKeyEntries.length) {
                this.keyStatus.currentIndex = 0;
            }

            const entry = this.activeKeyEntries[this.keyStatus.currentIndex];
            const status = this.ensureStatus(entry.slotIndex);

            if (status.invalid) {
                attempts++;
                this.keyStatus.currentIndex = (this.keyStatus.currentIndex + 1) % total;
                continue;
            }

            if (status.rateLimited && status.limitedAt && now < status.limitedAt) {
                attempts++;
                this.keyStatus.currentIndex = (this.keyStatus.currentIndex + 1) % total;
                continue;
            }

            if (status.rateLimited && status.limitedAt && now >= status.limitedAt) {
                status.rateLimited = false;
                status.limitedAt = null;
                status.cooldownMs = null;
                if (!status.invalid) {
                    status.lastError = '';
                    status.lastErrorAt = null;
                    status.willRetry = true;
                }
                this.saveKeyStatus();
            }

            this.saveKeyStatus();
            return { apiKey: entry.key, slotIndex: entry.slotIndex };
        }

        return null;
    }

    markKeyRateLimited(slotIndex, waitTimeMs = null) {
        const status = this.ensureStatus(slotIndex);
        
        // FIX: Implement exponential backoff based on previous attempts
        const previousCooldown = status.cooldownMs || 0;
        const baseWait = 60000; // 1 minute
        const calculatedWait = waitTimeMs !== null 
            ? waitTimeMs 
            : (previousCooldown > 0 
                ? Math.min(previousCooldown * 2, 900000) // Double up to 15min max
                : baseWait);
        
        status.rateLimited = true;
        status.limitedAt = Date.now() + calculatedWait;
        status.cooldownMs = calculatedWait;
        status.invalid = false;
        status.invalidMessage = '';
        const seconds = Math.max(1, Math.ceil(calculatedWait / 1000));
        status.lastError = `Rate limited by API. Waiting ~${seconds}s before retry.`;
        status.lastErrorAt = Date.now();
        status.willRetry = true;
    
        this.advanceCurrentIndex();
        this.saveKeyStatus();
    }

    markKeyInvalid(slotIndex, message = 'Invalid API key.') {
        const status = this.ensureStatus(slotIndex);
        status.invalid = true;
        status.invalidMessage = message;
        status.rateLimited = false;
        status.limitedAt = null;
        status.cooldownMs = null;
        status.lastError = message;
        status.lastErrorAt = Date.now();
        status.willRetry = false;

        this.advanceCurrentIndex();
        this.saveKeyStatus();
    }

    async *streamGenerateContent(prompt, systemPrompt, model) {
        const requestBody = {
            contents: [{
                parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
            }],
            generationConfig: {
                temperature: 1,
                maxOutputTokens: 8192
            }
        };

        const totalKeys = this.activeKeyEntries.length;
        if (totalKeys === 0) {
            throw new Error('No valid Gemini API keys available. Please update your API keys.');
        }

        let lastError = null;

        while (this.activeKeyEntries.length > 0) {
            const attemptedSlots = new Set();

            while (attemptedSlots.size < this.activeKeyEntries.length) {
                const keyInfo = this.getNextAvailableKey();

                if (!keyInfo) {
                    break;
                }

                const { apiKey, slotIndex } = keyInfo;

                if (attemptedSlots.has(slotIndex)) {
                    this.advanceCurrentIndex();
                    this.saveKeyStatus();
                    continue;
                }

                attemptedSlots.add(slotIndex);

                const url = `${this.baseUrl}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

                try {
                    this.recordKeyUsage(slotIndex);

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (response.status === 429) {
                        const message = `API key in slot ${slotIndex + 1} is rate limited. Rotating to next key.`;
                        console.warn(message);
                        this.markKeyRateLimited(slotIndex, 60000);
                        lastError = new Error(message);
                        continue;
                    }

                    if (!response.ok) {
                        const errorInfo = await this.extractErrorInfo(response);

                        if (this.isInvalidKeyError(errorInfo)) {
                            const message = `API key in slot ${slotIndex + 1} is invalid. ${errorInfo.message || ''}`.trim();
                            console.warn(message);
                            this.markKeyInvalid(slotIndex, errorInfo.message || 'API key not valid. Please provide a new key.');
                            lastError = new Error(message || 'Invalid API key.');
                            continue;
                        }

                        const formattedError = this.formatErrorMessage(response.status, errorInfo);
                        this.recordKeyError(slotIndex, formattedError, true);
                        this.advanceCurrentIndex();
                        this.saveKeyStatus();
                        lastError = new Error(formattedError);
                        continue;
                    }

                    if (!response.body || typeof response.body.getReader !== 'function') {
                        const text = await response.text();
                        if (text) {
                            yield text;
                        }
                        return;
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            return;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) {
                                continue;
                            }

                            const payload = line.slice(6).trim();
                            if (!payload || payload === '[DONE]') {
                                continue;
                            }

                            try {
                                const data = JSON.parse(payload);
                                const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (chunk) {
                                    yield chunk;
                                }
                            } catch {
                                // Ignore malformed SSE chunks
                            }
                        }
                    }

                } catch (error) {
                    const message = error?.message || String(error);
                    console.error('Error in Gemini API call:', message);
                    this.recordKeyError(slotIndex, message, true);
                    this.advanceCurrentIndex();
                    this.saveKeyStatus();
                    lastError = new Error(message);
                    continue;
                }
            }

            if (lastError) {
                throw lastError;
            }

            break;
        }

        throw new Error('No available Gemini API keys succeeded. Please update your API keys.');
    }

    async generateContent(prompt, systemPrompt, model) {
        let fullText = '';

        for await (const chunk of this.streamGenerateContent(prompt, systemPrompt, model)) {
            fullText += chunk;
        }

        return fullText;
    }

    async extractErrorInfo(response) {
        let raw = '';
        try {
            raw = await response.text();
        } catch {
            raw = '';
        }

        let parsed = null;
        try {
            parsed = raw ? JSON.parse(raw) : null;
        } catch {
            parsed = null;
        }

        const error = parsed?.error;
        const message = error?.message || response.statusText || raw;
        const details = Array.isArray(error?.details) ? error.details : [];
        const reasonFromDetails = details
            .map(detail => (detail.reason || detail?.metadata?.reason || '').toUpperCase())
            .find(Boolean);

        return {
            message,
            raw,
            parsed,
            details,
            reason: (reasonFromDetails || error?.status || '').toUpperCase()
        };
    }

    isInvalidKeyError(errorInfo) {
        if (!errorInfo) {
            return false;
        }

        const reason = (errorInfo.reason || '').toUpperCase();
        if (reason === 'API_KEY_INVALID') {
            return true;
        }

        const message = (errorInfo.message || errorInfo.raw || '').toLowerCase();
        if (message.includes('api key not valid')) {
            return true;
        }

        return (errorInfo.details || []).some(detail => {
            const detailReason = (detail.reason || detail?.metadata?.reason || '').toUpperCase();
            return detailReason === 'API_KEY_INVALID';
        });
    }

    formatErrorMessage(status, errorInfo) {
        if (errorInfo?.message) {
            return `API Error ${status}: ${errorInfo.message}`;
        }
        if (errorInfo?.raw) {
            return `API Error ${status}: ${errorInfo.raw}`;
        }
        return `API Error ${status}`;
    }

    async fetchModels(forceRefresh = false) {
        if (!forceRefresh && this.modelCache.length > 0) {
            return this.modelCache;
        }

        if (this.activeKeyEntries.length === 0) {
            return [];
        }

        const attemptedSlots = new Set();

        while (attemptedSlots.size < this.activeKeyEntries.length) {
            const keyInfo = this.getNextAvailableKey();

            if (!keyInfo) {
                break;
            }

            const { apiKey, slotIndex } = keyInfo;

            if (attemptedSlots.has(slotIndex)) {
                this.advanceCurrentIndex();
                this.saveKeyStatus();
                continue;
            }

            attemptedSlots.add(slotIndex);

            try {
                this.recordKeyUsage(slotIndex);

                const response = await fetch(`${this.baseUrl}?key=${apiKey}`);

                if (response.status === 429) {
                    this.markKeyRateLimited(slotIndex, 60000);
                    continue;
                }

                if (!response.ok) {
                    const errorInfo = await this.extractErrorInfo(response);

                    if (this.isInvalidKeyError(errorInfo)) {
                        this.markKeyInvalid(slotIndex, errorInfo.message || 'API key not valid. Please provide a new key.');
                        continue;
                    }

                    const formattedError = this.formatErrorMessage(response.status, errorInfo);
                    this.recordKeyError(slotIndex, formattedError, true);
                    throw new Error(formattedError);
                }

                const payload = await response.json();
                const models = Array.isArray(payload.models)
                    ? payload.models
                        .map(model => (model.name || '').split('/').pop())
                        .filter(Boolean)
                    : [];

                if (models.length > 0) {
                    this.modelCache = models;
                    return models;
                }

            } catch (error) {
                console.error('Failed to fetch Gemini model list:', error);
                this.recordKeyError(slotIndex, error?.message || String(error), true);
                this.advanceCurrentIndex();
                this.saveKeyStatus();
            }
        }

        return [];
    }

    getKeyStatusForUI() {
        const now = Date.now();
        return Array.from({ length: 5 }, (_, slotIndex) => {
            const status = this.ensureStatus(slotIndex);
            const hasKey = !!(this.rawKeys[slotIndex]);
            const activeEntry = this.activeKeyEntries[this.keyStatus.currentIndex];
            const activeSlot = activeEntry ? activeEntry.slotIndex : null;
            const remainingMs = status.rateLimited && status.limitedAt
                ? Math.max(0, status.limitedAt - now)
                : 0;

            return {
                index: slotIndex,
                active: hasKey && slotIndex === activeSlot,
                rateLimited: hasKey && !!status.rateLimited,
                limitedAt: hasKey ? status.limitedAt : null,
                cooldownRemainingMs: hasKey ? remainingMs : 0,
                cooldownTotalMs: hasKey ? (status.cooldownMs || 0) : 0,
                invalid: hasKey && !!status.invalid,
                invalidMessage: hasKey ? (status.invalidMessage || '') : '',
                usageCount: hasKey ? (status.usageCount || 0) : 0,
                lastUsedAt: hasKey ? (status.lastUsedAt || null) : null,
                lastError: hasKey ? (status.lastError || '') : '',
                lastErrorAt: hasKey ? (status.lastErrorAt || null) : null,
                willRetry: hasKey ? status.willRetry !== false : false,
                hasKey
            };
        });
    }

    getRateLimitWaitTime() {
        const rateLimitedStatuses = this.activeKeyEntries
            .map(entry => this.ensureStatus(entry.slotIndex))
            .filter(status => status.rateLimited && status.limitedAt);

        if (rateLimitedStatuses.length === 0) {
            return 0;
        }

        const nextAvailableTime = Math.min(...rateLimitedStatuses.map(status => status.limitedAt));
        return Math.max(0, nextAvailableTime - Date.now());
    }
}

export const geminiAPI = new GeminiAPI();
