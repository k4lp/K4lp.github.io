// Gemini API Integration
class GeminiAPI {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
        this.isConnected = false;
        this.requestCount = 0;
    }

    setApiKey(key) {
        this.apiKey = key;
        this.testConnection();
    }

    async testConnection() {
        try {
            const response = await this.makeRequest('Test connection', false);
            this.isConnected = true;
            document.getElementById('apiStatus').textContent = 'Connected';
            document.getElementById('apiStatus').className = 'status-connected';
            document.getElementById('keyStatus').textContent = '✓ API Key Valid';
            document.getElementById('keyStatus').style.color = 'var(--success-color)';
        } catch (error) {
            this.isConnected = false;
            document.getElementById('apiStatus').textContent = 'Error';
            document.getElementById('apiStatus').className = 'status-error';
            document.getElementById('keyStatus').textContent = '✗ Invalid API Key';
            document.getElementById('keyStatus').style.color = 'var(--error-color)';
        }
    }

    async makeRequest(message, includeContext = true) {
        if (!this.apiKey) {
            throw new Error('API key not set');
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
                maxOutputTokens: 2048
            }
        };

        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        this.requestCount++;

        return data.candidates[0].content.parts[0].text;
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

    // Iterative reasoning method
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
}

// Global instance
const geminiAPI = new GeminiAPI();
