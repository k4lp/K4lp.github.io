// Gemini API Integration
class GeminiAPI {
    constructor() {
        this.apiKeys = [];
        this.currentKeyIndex = 0;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'; // Updated to flash as per logs
        this.isConnected = false;
        this.requestCount = 0;
        this.keyStats = []; // {key: string, lastUsed: timestamp, requestsInMinute: number, errors: number, cooldownUntil: timestamp}
        this.loadApiKeys();
    }

    loadApiKeys() {
        const savedKeys = JSON.parse(localStorage.getItem('gemini_api_keys') || '[]');
        if (savedKeys.length > 0) {
            this.apiKeys = savedKeys;
            this.keyStats = savedKeys.map(key => ({key, lastUsed: 0, requestsInMinute: 0, errors: 0, cooldownUntil: 0}));
            this.testConnection();
        }
    }

    setApiKeys(keys) {
        this.apiKeys = keys.filter(k => k.trim());
        this.keyStats = this.apiKeys.map(key => ({key, lastUsed: 0, requestsInMinute: 0, errors: 0, cooldownUntil: 0}));
        localStorage.setItem('gemini_api_keys', JSON.stringify(this.apiKeys));
        this.testConnection();
    }

    async testConnection() {
        try {
            await this.makeRequest('Test connection', false);
            this.isConnected = true;
            document.getElementById('apiStatus').textContent = 'Connected';
            document.getElementById('apiStatus').className = 'status-connected';
            document.getElementById('keyStatus').textContent = '✓ API Keys Valid';
            document.getElementById('keyStatus').style.color = 'var(--success-color)';
        } catch (error) {
            this.isConnected = false;
            document.getElementById('apiStatus').textContent = 'Error';
            document.getElementById('apiStatus').className = 'status-error';
            document.getElementById('keyStatus').textContent = '✗ Invalid API Keys';
            document.getElementById('keyStatus').style.color = 'var(--error-color)';
        }
        this.updateKeyStatsUI();
    }

    async makeRequest(message, includeContext = true) {
        if (this.apiKeys.length === 0) {
            throw new Error('No API keys set');
        }

        let fullPrompt = message;
        if (includeContext) {
            const context = dataManager.buildContext();
            fullPrompt = this.buildFullPrompt(message, context);
        }

        const requestBody = {
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048 }
        };

        let attempts = 0;
        while (attempts < this.apiKeys.length) {
            const now = Date.now();
            const stat = this.keyStats[this.currentKeyIndex];
            if (now < stat.cooldownUntil) {
                this.rotateKey();
                attempts++;
                continue;
            }

            // Reset minute counter if needed
            if (now - stat.lastUsed >= 60000) {
                stat.requestsInMinute = 0;
            }

            try {
                const response = await fetch(`${this.baseUrl}?key=${this.apiKeys[this.currentKeyIndex]}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                stat.lastUsed = now;
                stat.requestsInMinute++;
                this.requestCount++;

                if (!response.ok) {
                    const errorData = await response.json();
                    stat.errors++;
                    if (response.status === 429 || response.status === 400) {
                        stat.cooldownUntil = now + (response.status === 429 ? 60000 : 10000); // 60s for 429, 10s for 400
                        this.rotateKey();
                        attempts++;
                        continue;
                    }
                    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
                }

                const data = await response.json();
                this.updateKeyStatsUI();
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                stat.errors++;
                this.rotateKey();
                attempts++;
                if (attempts >= this.apiKeys.length) throw error;
            }
        }
        throw new Error('All API keys exhausted or on cooldown');
    }

    rotateKey() {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
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

    async iterativeReasoning(userMessage, maxIterations = 3) {
        try {
            let currentResponse = '';
            let iteration = 0;

            reasoningEngine.addStep('Initial Analysis', 'Starting iterative reasoning process');

            while (iteration < maxIterations) {
                iteration++;

                const prompt = iteration === 1 ? userMessage : 
                    `Continue reasoning on: "${userMessage}"\n\nPrevious analysis: ${currentResponse}\n\nProvide deeper analysis and next steps.`;

                reasoningEngine.addStep(`Iteration ${iteration}`, 'Processing with current context');

                const response = await this.makeRequest(prompt, true);
                currentResponse = response;

                if (response.length > 100) {
                    const summary = response.substring(0, 50) + '...';
                    dataManager.addMemory(summary, response, 'reasoning');
                }

                const shouldContinue = this.shouldContinueReasoning(response, iteration);
                if (!shouldContinue) break;
            }

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

    updateKeyStatsUI() {
        const statsContainer = document.getElementById('keyStatsContainer');
        if (!statsContainer) return;

        statsContainer.innerHTML = this.keyStats.map((stat, idx) => `
            <div class="status-item">
                <span>Key ${idx + 1}:</span>
                <span>Req/Min: ${stat.requestsInMinute} | Errors: ${stat.errors} | Cooldown: ${stat.cooldownUntil > Date.now() ? Math.ceil((stat.cooldownUntil - Date.now()) / 1000) + 's' : 'None'}</span>
            </div>
        `).join('');
    }

    getKeyStats() {
        return this.keyStats;
    }
}

// Global instance
const geminiAPI = new GeminiAPI();
