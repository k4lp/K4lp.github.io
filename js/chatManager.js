// chatManager.js - Main chat orchestration and reasoning engine

class ChatManager {
    constructor(apiManager, dataStructures, promptBuilder, responseParser, codeExecutor, canvasManager, uiManager) {
        this.api = apiManager;
        this.ds = dataStructures;
        this.promptBuilder = promptBuilder;
        this.parser = responseParser;
        this.codeExecutor = codeExecutor;
        this.canvas = canvasManager;
        this.ui = uiManager;

        this.currentIteration = 0;
        this.isProcessing = false;
        this.conversationHistory = [];

        this.initEventListeners();
    }

    // Initialize event listeners
    initEventListeners() {
        document.addEventListener('user-message-send', (e) => {
            this.handleUserMessage(e.detail.message);
        });

        document.addEventListener('code-execution-output', (e) => {
            this.ui.updateCodeExecutionOutput(JSON.stringify(e.detail.output, null, 2));
        });
    }

    // Handle user message
    async handleUserMessage(message) {
        if (this.isProcessing) {
            this.ui.showNotification('Please wait for current processing to complete', 'info');
            return;
        }

        // Check if API keys are configured
        if (!this.api.hasApiKeys()) {
            this.ui.showNotification('Please configure API keys in settings', 'error');
            this.ui.showSettings();
            return;
        }

        this.isProcessing = true;
        this.currentIteration = 0;

        try {
            // Add user message to UI
            this.ui.addUserMessage(message);

            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: message,
                timestamp: Date.now()
            });

            // Start reasoning process
            await this.startReasoningProcess(message);

        } catch (error) {
            console.error('Error processing message:', error);
            this.ui.showNotification('Error: ' + error.message, 'error');
            this.ui.appendToCurrentMessage('\n\nError: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.ui.hideReasoningIndicator();
            this.ui.enableInput();
        }
    }

    // Start reasoning process
    async startReasoningProcess(userMessage) {
        this.ui.disableInput();
        this.ui.showReasoningIndicator('Starting reasoning...');
        this.ui.addAssistantMessage('');

        let finalOutput = null;
        let accumulatedResponse = '';

        while (this.currentIteration < CONFIG.MAX_ITERATIONS) {
            this.currentIteration++;
            this.ui.updateReasoningStatus(`Reasoning step ${this.currentIteration}/${CONFIG.MAX_ITERATIONS}...`);

            // Build prompt
            const systemPrompt = this.promptBuilder.buildSystemPrompt();
            const userPrompt = this.promptBuilder.buildUserPrompt(userMessage, this.currentIteration);
            const fullPrompt = systemPrompt + '\n\n' + userPrompt;

            // Get model response with streaming
            let response = '';
            try {
                const stream = this.api.streamGenerateContent(fullPrompt, {
                    temperature: 0.7,
                    maxTokens: CONFIG.DEFAULT_MAX_TOKENS
                });

                for await (const chunk of stream) {
                    response += chunk;
                    this.ui.setCurrentMessageContent(accumulatedResponse + response);
                }

            } catch (error) {
                throw new Error('API call failed: ' + error.message);
            }

            // Add to reasoning chain
            this.ds.addReasoningStep(response);

            // Parse response
            const parsed = this.parser.parseResponse(response);

            // Handle reasoning text
            if (parsed.reasoningText) {
                accumulatedResponse += parsed.reasoningText + '\n\n';
            }

            // Handle tool calls
            if (parsed.hasTools) {
                for (const tool of parsed.tools) {
                    const toolResult = await this.executeTool(tool);
                    accumulatedResponse += `\n[Tool: ${tool.name}]\n${toolResult}\n\n`;
                    this.ui.setCurrentMessageContent(accumulatedResponse);
                }
                // Continue to next iteration after tool execution
                continue;
            }

            // Check for final output
            if (parsed.isFinal && parsed.finalContent) {
                this.ui.updateReasoningStatus('Verifying output...');
                finalOutput = await this.verifyOutput(parsed.finalContent);
                break;
            }

            // If no tools and no final, continue reasoning
            if (!parsed.hasTools && !parsed.isFinal) {
                // Check if we should continue or conclude
                if (this.shouldConclude(response)) {
                    finalOutput = response;
                    break;
                }
            }
        }

        // Set final output
        if (finalOutput) {
            this.ui.setCurrentMessageContent(finalOutput);
        } else {
            this.ui.appendToCurrentMessage('\n\n[Max iterations reached]');
        }

        // Clear reasoning chain for next interaction
        this.ds.clearReasoningChain();

        // Add to conversation history
        this.conversationHistory.push({
            role: 'assistant',
            content: finalOutput || accumulatedResponse,
            timestamp: Date.now()
        });
    }

    // Execute tool
    async executeTool(tool) {
        const validation = this.parser.validateToolCall(tool);
        if (!validation.valid) {
            return `Tool validation error: ${validation.error}`;
        }

        this.ui.updateReasoningStatus(`Executing tool: ${tool.name}...`);

        try {
            switch (tool.name) {
                case 'memory_store':
                    return await this.toolMemoryStore(tool.args);

                case 'memory_fetch':
                    return await this.toolMemoryFetch(tool.args);

                case 'js_exec':
                    return await this.toolJsExec(tool.args);

                case 'canvas_render':
                    return await this.toolCanvasRender(tool.args);

                case 'goal_add':
                    return await this.toolGoalAdd(tool.args);

                case 'goal_update':
                    return await this.toolGoalUpdate(tool.args);

                case 'checkpoint_save':
                    return await this.toolCheckpointSave(tool.args);

                default:
                    return `Unknown tool: ${tool.name}`;
            }
        } catch (error) {
            return `Tool execution error: ${error.message}`;
        }
    }

    // Tool: Memory Store
    async toolMemoryStore(args) {
        const index = this.ds.addMemory(args.summary, args.details);
        return `Memory stored at index ${index}`;
    }

    // Tool: Memory Fetch
    async toolMemoryFetch(args) {
        const memory = this.ds.getMemory(args.index);
        if (!memory) {
            return `Memory not found at index ${args.index}`;
        }
        return `Memory [${memory.index}]: ${memory.summary}\n\nDetails:\n${memory.details}`;
    }

    // Tool: JavaScript Execution
    async toolJsExec(args) {
        this.ui.showCodeExecution(args.code, 'Executing...');
        const result = await this.codeExecutor.execute(args.code);
        this.ui.updateCodeExecutionOutput(result);
        return `Code executed. Output:\n${result}`;
    }

    // Tool: Canvas Render
    async toolCanvasRender(args) {
        const result = await this.canvas.render(args.html);
        if (result.success) {
            return `HTML rendered successfully in canvas`;
        } else {
            return `Canvas render error: ${result.error}`;
        }
    }

    // Tool: Goal Add
    async toolGoalAdd(args) {
        const priority = args.priority || 'normal';
        const index = this.ds.addGoal(args.goal, priority);
        return `Goal added at index ${index}`;
    }

    // Tool: Goal Update
    async toolGoalUpdate(args) {
        const success = this.ds.updateGoalStatus(args.index, args.status);
        if (success) {
            return `Goal ${args.index} updated to status: ${args.status}`;
        } else {
            return `Goal ${args.index} not found`;
        }
    }

    // Tool: Checkpoint Save
    async toolCheckpointSave(args) {
        const description = args.description || '';
        const index = this.ds.saveCheckpoint(args.name, description);
        return `Checkpoint saved at index ${index}: ${args.name}`;
    }

    // Verify output against goals
    async verifyOutput(output) {
        // If no goals set, return output as-is
        if (this.ds.goals.length === 0) {
            return output;
        }

        const verificationPrompt = this.promptBuilder.buildVerificationPrompt(output);

        try {
            const verificationResponse = await this.api.generateContent(verificationPrompt, {
                temperature: 0.3,
                maxTokens: 2048
            });

            const verification = this.parser.parseVerificationResponse(verificationResponse);

            if (verification.verified) {
                return verification.content || output;
            } else if (verification.needsRevision) {
                // Add revision feedback to reasoning chain
                this.ds.addReasoningStep('Revision needed: ' + verification.feedback);
                // Return original output with note
                return output + '\n\n[Note: Verification suggests revisions]';
            }

            return output;

        } catch (error) {
            console.warn('Verification failed:', error);
            return output;
        }
    }

    // Check if reasoning should conclude
    shouldConclude(response) {
        const conclusionIndicators = [
            'in conclusion',
            'to summarize',
            'final answer',
            'therefore',
            'thus we can conclude'
        ];

        const lowerResponse = response.toLowerCase();
        return conclusionIndicators.some(indicator => lowerResponse.includes(indicator));
    }

    // Clear conversation
    clearConversation() {
        this.conversationHistory = [];
        this.ds.clearSession();

        if (this.ui.messagesContainer) {
            this.ui.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to Gemini Advanced Reasoning Interface</h2>
                    <p>Conversation cleared. Ready for new interactions.</p>
                </div>
            `;
        }
    }

    // Get conversation history
    getHistory() {
        return this.conversationHistory;
    }
}

// Export
window.ChatManager = ChatManager;
