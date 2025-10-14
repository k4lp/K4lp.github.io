// Corrected Gemini API Integration with Latest 2.5 Models and Rate Limiting
class GeminiAPI {
    constructor() {
        this.apiKey = null;
        // Use the latest Gemini 2.5 Flash as default (based on 2025 research)
        this.currentModel = 'gemini-2.5-flash';
        this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent`;
        this.isConnected = false;
        this.requestCount = 0;

        // Rate limiting tracking
        this.rateLimits = {
            requestsPerMinute: 5,  // Free tier: 5 RPM
            requestsPerDay: 25,    // Free tier: 25 RPD
            tokensPerMinute: 32000, // Free tier: 32K TPM
        };

        this.usage = {
            requestsThisMinute: 0,
            requestsToday: 0,
            tokensThisMinute: 0,
            lastRequestTime: 0,
            lastMinuteReset: Date.now(),
            lastDayReset: Date.now(),
        };

        // Available model options (updated with latest 2.5 models)
        this.availableModels = [
            'gemini-2.5-flash',      // Latest and fastest model (2025)
            'gemini-2.5-pro',        // Most capable model (2025)
            'gemini-2.5-flash-lite', // Cost-efficient model (2025)
            'gemini-2.0-flash',      // Previous generation
            'gemini-1.5-flash',      // Legacy model
            'gemini-1.5-pro',        // Legacy pro model
            'gemini-pro'             // Original model
        ];
    }

    setApiKey(key) {
        this.apiKey = key;
        this.testConnection();
    }

    async testConnection() {
        try {
            // Try with a simple test message
            const response = await this.makeRequest('Hi', false);
            this.isConnected = true;
            this.updateConnectionStatus(true, `Connected with ${this.currentModel}`);
            console.log('✓ API connection successful with model:', this.currentModel);
        } catch (error) {
            console.error('Connection test failed with', this.currentModel, ':', error);

            // Try alternative models if the current one fails
            if (error.message.includes('404') || error.message.includes('not found') || error.message.includes('Invalid model')) {
                await this.tryAlternativeModels();
            } else {
                this.isConnected = false;
                this.updateConnectionStatus(false, error.message);
            }
        }
    }

    async tryAlternativeModels() {
        console.log('Trying alternative models...');

        for (const model of this.availableModels) {
            if (model === this.currentModel) continue; // Skip current model

            try {
                console.log(`Testing model: ${model}`);
                this.currentModel = model;
                this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                await this.makeRequest('Test', false);

                this.isConnected = true;
                this.updateConnectionStatus(true, `Connected with ${model}`);
                console.log(`✓ Successfully connected using model: ${model}`);
                return true;
            } catch (error) {
                console.log(`✗ Model ${model} failed:`, error.message);
                continue;
            }
        }

        this.isConnected = false;
        this.updateConnectionStatus(false, 'All models failed. Check API key and network.');
        return false;
    }

    updateConnectionStatus(connected, message) {
        const statusElement = document.getElementById('apiStatus');
        const keyStatusElement = document.getElementById('keyStatus');

        if (connected) {
            statusElement.textContent = 'Connected';
            statusElement.className = 'status-connected';
            keyStatusElement.textContent = `✓ ${message}`;
            keyStatusElement.style.color = 'var(--success-color)';
        } else {
            statusElement.textContent = 'Error';
            statusElement.className = 'status-error';
            keyStatusElement.textContent = `✗ ${message}`;
            keyStatusElement.style.color = 'var(--error-color)';
        }
    }

    // Enhanced rate limiting
    checkRateLimit() {
        const now = Date.now();

        // Reset minute counter if needed
        if (now - this.usage.lastMinuteReset > 60000) {
            this.usage.requestsThisMinute = 0;
            this.usage.tokensThisMinute = 0;
            this.usage.lastMinuteReset = now;
        }

        // Reset daily counter if needed (reset at midnight PT - approximated)
        if (now - this.usage.lastDayReset > 86400000) {
            this.usage.requestsToday = 0;
            this.usage.lastDayReset = now;
        }

        // Check limits
        if (this.usage.requestsThisMinute >= this.rateLimits.requestsPerMinute) {
            throw new Error(`Rate limit exceeded: ${this.rateLimits.requestsPerMinute} requests per minute. Wait ${Math.ceil((60000 - (now - this.usage.lastMinuteReset)) / 1000)}s`);
        }

        if (this.usage.requestsToday >= this.rateLimits.requestsPerDay) {
            throw new Error(`Daily limit exceeded: ${this.rateLimits.requestsPerDay} requests per day`);
        }

        // Enforce minimum time between requests (12 seconds for free tier)
        const minInterval = 60000 / this.rateLimits.requestsPerMinute;
        const timeSinceLastRequest = now - this.usage.lastRequestTime;

        if (timeSinceLastRequest < minInterval && this.usage.lastRequestTime > 0) {
            const waitTime = Math.ceil((minInterval - timeSinceLastRequest) / 1000);
            throw new Error(`Rate limit: Please wait ${waitTime} seconds before next request`);
        }
    }

    async makeRequest(message, includeContext = true) {
        if (!this.apiKey) {
            throw new Error('API key not set. Please enter your Gemini API key.');
        }

        // Check rate limits
        try {
            this.checkRateLimit();
        } catch (error) {
            throw error;
        }

        let fullPrompt = message;

        if (includeContext) {
            const context = dataManager.buildContext();
            fullPrompt = this.buildFullPrompt(message, context);
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
                stopSequences: []
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        console.log('Making request to:', this.baseUrl);
        console.log('Using model:', this.currentModel);

        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'GeminiAdvancedInterface/1.0'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            // Update usage tracking
            this.usage.requestsThisMinute++;
            this.usage.requestsToday++;
            this.usage.lastRequestTime = Date.now();
            this.requestCount++;

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);

                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error) {
                        if (errorJson.error.message) {
                            errorMessage = errorJson.error.message;
                        }

                        // Handle specific error codes
                        if (response.status === 400) {
                            if (errorMessage.includes('API key')) {
                                errorMessage = 'Invalid API key. Please check your Gemini API key.';
                            } else if (errorMessage.includes('model')) {
                                errorMessage = `Model ${this.currentModel} not available. Trying alternatives...`;
                                // Try alternative models
                                setTimeout(() => this.tryAlternativeModels(), 1000);
                            } else if (errorMessage.includes('location')) {
                                errorMessage = 'Gemini API not available in your location. Try using a VPN or check supported regions.';
                            } else {
                                errorMessage = `Bad Request: ${errorMessage}`;
                            }
                        } else if (response.status === 403) {
                            errorMessage = 'API key invalid or billing not enabled. Check your Google AI Studio settings.';
                        } else if (response.status === 429) {
                            errorMessage = 'Rate limit exceeded by Google. Please wait before making another request.';
                        } else if (response.status === 404) {
                            errorMessage = `Model ${this.currentModel} not found. Trying alternative models...`;
                            setTimeout(() => this.tryAlternativeModels(), 1000);
                        }
                    }
                } catch (e) {
                    // If JSON parsing fails, use raw error text
                    errorMessage = errorText.substring(0, 200) + (errorText.length > 200 ? '...' : '');
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('✓ Request successful');

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                const responseText = data.candidates[0].content.parts[0].text;

                // Estimate token usage (rough approximation: 4 characters = 1 token)
                const estimatedTokens = Math.ceil((fullPrompt.length + responseText.length) / 4);
                this.usage.tokensThisMinute += estimatedTokens;

                return responseText;
            } else if (data.candidates && data.candidates.length > 0 && data.candidates[0].finishReason) {
                const reason = data.candidates[0].finishReason;
                if (reason === 'SAFETY') {
                    throw new Error('Response blocked by safety filters. Try rephrasing your request.');
                } else if (reason === 'RECITATION') {
                    throw new Error('Response blocked due to recitation concerns.');
                } else {
                    throw new Error(`Request blocked: ${reason}`);
                }
            } else {
                throw new Error('No valid response from API. Please try again.');
            }
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    buildFullPrompt(userMessage, context) {
        const systemPrompt = `You are an advanced AI assistant with sophisticated reasoning capabilities. You have access to persistent memory, goals tracking, and iterative reasoning chains.

CURRENT CONTEXT:
- Session ID: ${context.session.id}
- Messages in session: ${context.session.messageCount}
- Active memories: ${context.memories.length}
- Active goals: ${context.goals.length}
- Current reasoning steps: ${context.reasoningChain.length}

MEMORY BANK (Recent memories):
${context.memories.slice(0, 5).map(mem => `• ${mem.summary}: ${mem.detail.substring(0, 100)}...`).join('\n')}

ACTIVE GOALS:
${context.goals.map(goal => `• ${goal.content}`).join('\n')}

CURRENT REASONING CHAIN:
${context.reasoningChain.slice(-3).map(step => `${step.type}: ${step.step}`).join('\n')}

INSTRUCTIONS:
1. Use iterative reasoning - break down complex problems into steps
2. Store important information in memory for future reference
3. Reference active goals when providing responses
4. Build upon previous reasoning steps
5. Verify your final output against the stated goals
6. If executing code or displaying content, provide clear explanations

USER MESSAGE: ${userMessage}

Provide a comprehensive response that takes into account all context and follows the iterative reasoning approach.`;

        return systemPrompt;
    }

    // Iterative reasoning method with better error handling
    async iterativeReasoning(userMessage, maxIterations = 3) {
        try {
            let currentResponse = '';
            let iteration = 0;

            // Initial reasoning
            reasoningEngine.addStep('Initial Analysis', 'Starting iterative reasoning process');

            while (iteration < maxIterations) {
                iteration++;

                const prompt = iteration === 1 ? userMessage : 
                    `Continue reasoning on: "${userMessage}"\n\nPrevious analysis: ${currentResponse}\n\nProvide deeper analysis and next steps.`;

                reasoningEngine.addStep(`Iteration ${iteration}`, 'Processing with current context');

                const response = await this.makeRequest(prompt, true);
                currentResponse = response;

                // Store key insights in memory
                if (response.length > 100) {
                    const summary = response.substring(0, 50) + '...';
                    dataManager.addMemory(summary, response, 'reasoning');
                }

                // Check if we should continue iterating
                const shouldContinue = this.shouldContinueReasoning(response, iteration);
                if (!shouldContinue) break;
            }

            // Verification step
            if (document.getElementById('verificationMode').checked) {
                currentResponse = await this.verifyOutput(currentResponse);
            }

            return currentResponse;

        } catch (error) {
            console.error('Error in iterative reasoning:', error);
            throw error;
        }
    }

    shouldContinueReasoning(response, iteration) {
        // Simple heuristics to determine if we should continue
        const hasIncompleteThoughts = response.includes('further analysis needed') || 
                                    response.includes('need to explore') ||
                                    response.includes('requires deeper');

        const isComplexTopic = response.length > 500;
        const hasQuestions = response.includes('?');

        return iteration < 2 && (hasIncompleteThoughts || (isComplexTopic && hasQuestions));
    }

    async verifyOutput(output) {
        const goals = dataManager.getActiveGoals();
        if (goals.length === 0) return output;

        const verificationPrompt = `VERIFICATION TASK:
Please verify if the following output adequately addresses these goals:

GOALS:
${goals.map(g => `• ${g.content}`).join('\n')}

OUTPUT TO VERIFY:
${output}

Provide the verified and improved version, or confirm if the output is satisfactory.`;

        reasoningEngine.addStep('Verification', 'Checking output against goals');

        try {
            const verifiedOutput = await this.makeRequest(verificationPrompt, false);
            return verifiedOutput;
        } catch (error) {
            console.warn('Verification failed, using original output');
            return output;
        }
    }

    // Get usage statistics
    getUsageStats() {
        const now = Date.now();
        return {
            currentModel: this.currentModel,
            totalRequests: this.requestCount,
            requestsThisMinute: this.usage.requestsThisMinute,
            requestsToday: this.usage.requestsToday,
            tokensThisMinute: this.usage.tokensThisMinute,
            rateLimits: this.rateLimits,
            timeUntilMinuteReset: Math.max(0, Math.ceil((60000 - (now - this.usage.lastMinuteReset)) / 1000)),
            timeUntilDayReset: Math.max(0, Math.ceil((86400000 - (now - this.usage.lastDayReset)) / 1000))
        };
    }

    // Switch to a different model
    async switchModel(modelName) {
        if (!this.availableModels.includes(modelName)) {
            throw new Error(`Model ${modelName} not supported. Available: ${this.availableModels.join(', ')}`);
        }

        const oldModel = this.currentModel;
        this.currentModel = modelName;
        this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        try {
            // Test the new model
            await this.testConnection();
            console.log(`✓ Switched from ${oldModel} to ${modelName}`);
        } catch (error) {
            // Revert if failed
            this.currentModel = oldModel;
            this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${oldModel}:generateContent`;
            throw error;
        }
    }

    // Update rate limits based on tier (for when user upgrades)
    updateRateLimits(tier) {
        switch (tier) {
            case 'free':
                this.rateLimits = {
                    requestsPerMinute: 5,
                    requestsPerDay: 25,
                    tokensPerMinute: 32000
                };
                break;
            case 'tier1':
                this.rateLimits = {
                    requestsPerMinute: 300,
                    requestsPerDay: 1000,
                    tokensPerMinute: 1000000
                };
                break;
            case 'tier2':
                this.rateLimits = {
                    requestsPerMinute: 1000,
                    requestsPerDay: 10000,
                    tokensPerMinute: 2000000
                };
                break;
            case 'tier3':
                this.rateLimits = {
                    requestsPerMinute: 2000,
                    requestsPerDay: 50000,
                    tokensPerMinute: 5000000
                };
                break;
            default:
                console.warn('Unknown tier:', tier);
        }
        console.log('Updated rate limits for tier:', tier, this.rateLimits);
    }

    // Get available models
    getAvailableModels() {
        return this.availableModels.map(model => ({
            name: model,
            description: this.getModelDescription(model),
            isCurrent: model === this.currentModel
        }));
    }

    getModelDescription(model) {
        const descriptions = {
            'gemini-2.5-flash': 'Latest and fastest model (2025) - Best for most tasks',
            'gemini-2.5-pro': 'Most capable model (2025) - Best for complex reasoning',
            'gemini-2.5-flash-lite': 'Cost-efficient model (2025) - Best for simple tasks',
            'gemini-2.0-flash': 'Previous generation fast model',
            'gemini-1.5-flash': 'Legacy fast model',
            'gemini-1.5-pro': 'Legacy professional model',
            'gemini-pro': 'Original Gemini model'
        };
        return descriptions[model] || 'Standard Gemini model';
    }
}

// Global instance
const geminiAPI = new GeminiAPI();
