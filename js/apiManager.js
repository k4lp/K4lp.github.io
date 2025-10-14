// apiManager.js - Manages Gemini API calls with key rotation and rate limiting

class ApiManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.apiKeys = this.loadApiKeys();
        this.currentKeyIndex = 0;
        this.model = CONFIG.DEFAULT_MODEL;
        this.baseUrl = CONFIG.API_BASE_URL;
        this.keyStatus = new Array(5).fill({ available: true, lastError: null });
    }

    // Load API keys from storage
    loadApiKeys() {
        return this.storage.get(CONFIG.STORAGE_KEYS.API_KEYS, []);
    }

    // Save API keys to storage
    saveApiKeys(keys) {
        const validKeys = keys.filter(k => k && k.trim().length > 0).slice(0, 5);
        this.apiKeys = validKeys;
        this.storage.set(CONFIG.STORAGE_KEYS.API_KEYS, validKeys);
        this.currentKeyIndex = 0;
        return validKeys.length;
    }

    // Get current API key
    getCurrentKey() {
        if (this.apiKeys.length === 0) return null;
        return this.apiKeys[this.currentKeyIndex];
    }

    // Rotate to next available key
    rotateKey() {
        if (this.apiKeys.length <= 1) return false;

        const startIndex = this.currentKeyIndex;
        do {
            this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
            if (this.currentKeyIndex === startIndex) {
                // Cycled through all keys
                return false;
            }
        } while (!this.keyStatus[this.currentKeyIndex].available);

        console.log(`Rotated to API key index: ${this.currentKeyIndex}`);
        this.notifyKeyRotation();
        return true;
    }

    // Mark key as unavailable
    markKeyUnavailable(index, error) {
        if (index >= 0 && index < this.keyStatus.length) {
            this.keyStatus[index] = {
                available: false,
                lastError: error,
                timestamp: Date.now()
            };
        }
    }

    // Reset key availability after timeout
    resetKeyAvailability(index) {
        if (index >= 0 && index < this.keyStatus.length) {
            this.keyStatus[index] = {
                available: true,
                lastError: null
            };
        }
    }

    // Set model
    setModel(modelName) {
        this.model = modelName;
        this.storage.set(CONFIG.STORAGE_KEYS.MODEL_CONFIG, { model: modelName });
    }

    // Build request endpoint
    buildEndpoint(streaming = false) {
        const key = this.getCurrentKey();
        if (!key) throw new Error('No API key available');

        const method = streaming ? 'streamGenerateContent' : 'generateContent';
        return `${this.baseUrl}/${this.model}:${method}?key=${key}`;
    }

    // Build request body
    buildRequestBody(prompt, options = {}) {
        return {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: options.temperature ?? CONFIG.DEFAULT_TEMPERATURE,
                topP: options.topP ?? 0.95,
                topK: options.topK ?? 40,
                maxOutputTokens: options.maxTokens ?? CONFIG.DEFAULT_MAX_TOKENS,
                stopSequences: options.stopSequences || []
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_NONE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_NONE"
                }
            ]
        };
    }

    // Generate content (non-streaming)
    async generateContent(prompt, options = {}) {
        if (!this.getCurrentKey()) {
            throw new Error(CONFIG.MESSAGES.NO_API_KEYS);
        }

        const endpoint = this.buildEndpoint(false);
        const requestBody = this.buildRequestBody(prompt, options);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (response.status === 429) {
                // Rate limit hit
                this.markKeyUnavailable(this.currentKeyIndex, 'Rate limit');
                if (this.rotateKey()) {
                    // Retry with next key
                    return await this.generateContent(prompt, options);
                } else {
                    throw new Error('All API keys have reached rate limits');
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            return this.parseResponse(data);

        } catch (error) {
            if (error.message.includes('fetch')) {
                throw new Error(CONFIG.MESSAGES.NETWORK_ERROR + ': ' + error.message);
            }
            throw error;
        }
    }

    // Generate content with streaming
    async *streamGenerateContent(prompt, options = {}) {
        if (!this.getCurrentKey()) {
            throw new Error(CONFIG.MESSAGES.NO_API_KEYS);
        }

        const endpoint = this.buildEndpoint(true);
        const requestBody = this.buildRequestBody(prompt, options);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (response.status === 429) {
                this.markKeyUnavailable(this.currentKeyIndex, 'Rate limit');
                if (this.rotateKey()) {
                    yield* this.streamGenerateContent(prompt, options);
                    return;
                } else {
                    throw new Error('All API keys have reached rate limits');
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error ${response.status}: ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.slice(6);
                            if (jsonStr === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(jsonStr);
                                const text = this.parseStreamChunk(parsed);
                                if (text) yield text;
                            } catch (e) {
                                console.warn('Failed to parse stream chunk:', e);
                            }
                        }
                    }
                }

                // Process remaining buffer
                if (buffer.trim()) {
                    try {
                        const parsed = JSON.parse(buffer);
                        const text = this.parseStreamChunk(parsed);
                        if (text) yield text;
                    } catch (e) {
                        console.warn('Failed to parse final buffer:', e);
                    }
                }
            } finally {
                reader.releaseLock();
            }

        } catch (error) {
            if (error.message.includes('fetch')) {
                throw new Error(CONFIG.MESSAGES.NETWORK_ERROR + ': ' + error.message);
            }
            throw error;
        }
    }

    // Parse non-streaming response
    parseResponse(data) {
        if (!data || !data.candidates || data.candidates.length === 0) {
            return '';
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            return '';
        }

        return candidate.content.parts[0].text || '';
    }

    // Parse streaming chunk
    parseStreamChunk(data) {
        if (!data || !data.candidates || data.candidates.length === 0) {
            return null;
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            return null;
        }

        return candidate.content.parts[0].text || null;
    }

    // Notify key rotation
    notifyKeyRotation() {
        document.dispatchEvent(new CustomEvent('api-key-rotated', {
            detail: {
                newIndex: this.currentKeyIndex,
                totalKeys: this.apiKeys.length
            }
        }));
    }

    // Check if API keys are configured
    hasApiKeys() {
        return this.apiKeys.length > 0;
    }

    // Get key status
    getKeyStatus() {
        return this.apiKeys.map((key, index) => ({
            index: index,
            masked: this.maskKey(key),
            active: index === this.currentKeyIndex,
            status: this.keyStatus[index]
        }));
    }

    // Mask API key for display
    maskKey(key) {
        if (!key || key.length < 8) return '****';
        return key.substring(0, 4) + '...' + key.substring(key.length - 4);
    }
}

// Export
window.ApiManager = ApiManager;
