/**
 * SUBAGENT ISOLATED REASONING LOOP
 *
 * Provides autonomous multi-iteration reasoning capability for subagents.
 * Unlike the one-shot execution in sub-agent-orchestrator.js, this enables
 * subagents to reason iteratively, make decisions, and use tools multiple times.
 *
 * KEY FEATURES:
 * - Multi-iteration reasoning (configurable max iterations)
 * - Autonomous tool selection and execution
 * - Isolated state (no interference with main thread)
 * - Convergence detection (stops when goal achieved)
 * - Full reasoning trace for transparency
 *
 * ISOLATION GUARANTEES:
 * - Separate execution context
 * - No shared state with main thread
 * - Independent tool registry
 * - Isolated storage/cache
 */

import { GeminiAPI } from '../../api/gemini-client.js';
import { SubAgentExecutionContext } from './SubAgentExecutionContext.js';
import { SubAgentToolRegistry } from './SubAgentToolRegistry.js';

export class SubAgentReasoningLoop {
    constructor(config = {}) {
        // Configuration
        this.maxIterations = config.maxIterations || 10;
        this.convergenceThreshold = config.convergenceThreshold || 0.95;
        this.modelId = config.modelId || 'gemini-2.0-flash-exp';
        this.temperature = config.temperature || 0.7;

        // Dependencies (injectable for testing)
        this.aiProvider = config.aiProvider || GeminiAPI;
        this.toolRegistry = config.toolRegistry || new SubAgentToolRegistry();

        // State tracking
        this.isRunning = false;
        this.currentIteration = 0;
        this.reasoningTrace = [];
        this.executionContext = null;
    }

    /**
     * Execute autonomous reasoning loop
     *
     * @param {Object} request - Reasoning request
     * @param {string} request.agentId - Agent identifier
     * @param {string} request.query - User query to fulfill
     * @param {Object} request.agentConfig - Agent configuration
     * @param {Array} request.availableTools - Tools the agent can use
     * @param {Function} request.onIteration - Callback for each iteration
     * @returns {Object} Final reasoning result
     */
    async execute(request) {
        // Validation
        this._validateRequest(request);

        // Initialize isolated context
        this.executionContext = new SubAgentExecutionContext({
            agentId: request.agentId,
            query: request.query,
            availableTools: request.availableTools
        });

        // Reset state
        this.isRunning = true;
        this.currentIteration = 0;
        this.reasoningTrace = [];

        try {
            // Main reasoning loop
            while (this.currentIteration < this.maxIterations && this.isRunning) {
                this.currentIteration++;

                const iteration = await this._executeIteration(request);

                // Record iteration in trace
                this.reasoningTrace.push(iteration);

                // Notify observer (for UI updates)
                if (request.onIteration) {
                    await request.onIteration(iteration, this.currentIteration, this.maxIterations);
                }

                // Check convergence
                if (iteration.converged || iteration.goalAchieved) {
                    console.log(`[SubAgentReasoningLoop] Converged at iteration ${this.currentIteration}`);
                    break;
                }

                // Update context for next iteration
                this.executionContext.addIterationResult(iteration);
            }

            // Build final result
            const result = this._buildFinalResult(request);

            return result;

        } catch (error) {
            console.error('[SubAgentReasoningLoop] Error during execution:', error);
            throw new Error(`SubAgent reasoning failed: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Execute a single reasoning iteration
     * @private
     */
    async _executeIteration(request) {
        const iterationStart = Date.now();

        const iteration = {
            number: this.currentIteration,
            timestamp: new Date().toISOString(),
            thinking: '',
            toolCalls: [],
            toolResults: [],
            response: '',
            converged: false,
            goalAchieved: false,
            error: null
        };

        try {
            // 1. Build prompt with current context
            const prompt = this._buildIterationPrompt(request);

            // 2. Call AI provider for reasoning
            const aiResponse = await this.aiProvider.generateContent(
                this.modelId,
                prompt,
                {
                    temperature: this.temperature,
                    maxOutputTokens: 2048
                }
            );

            iteration.thinking = aiResponse.text || '';

            // 3. Parse tool calls from response
            const parsedTools = this._parseToolCalls(aiResponse.text);
            iteration.toolCalls = parsedTools;

            // 4. Execute tools if any
            if (parsedTools.length > 0) {
                iteration.toolResults = await this._executeTools(parsedTools);
            }

            // 5. Determine convergence
            iteration.converged = this._checkConvergence(iteration);
            iteration.goalAchieved = this._checkGoalAchievement(iteration, request);

            // 6. Extract final response if converged
            if (iteration.converged || iteration.goalAchieved) {
                iteration.response = this._extractFinalResponse(iteration);
            }

        } catch (error) {
            iteration.error = {
                message: error.message,
                stack: error.stack
            };
            console.error(`[SubAgentReasoningLoop] Iteration ${this.currentIteration} failed:`, error);
        }

        iteration.duration = Date.now() - iterationStart;

        return iteration;
    }

    /**
     * Build prompt for current iteration
     * @private
     */
    _buildIterationPrompt(request) {
        const { agentConfig, query } = request;

        // System prompt defines agent's role
        const systemPrompt = agentConfig.systemPrompt || this._getDefaultSystemPrompt(request.agentId);

        // Available tools documentation
        const toolsDocs = this._buildToolsDocumentation(request.availableTools);

        // Context from previous iterations
        const contextSummary = this.executionContext.getSummary();

        // Build full prompt
        const parts = [];

        parts.push('# SYSTEM');
        parts.push(systemPrompt);
        parts.push('');

        parts.push('# YOUR MISSION');
        parts.push(query);
        parts.push('');

        if (toolsDocs) {
            parts.push('# AVAILABLE TOOLS');
            parts.push(toolsDocs);
            parts.push('');
        }

        if (contextSummary) {
            parts.push('# CONTEXT FROM PREVIOUS ITERATIONS');
            parts.push(contextSummary);
            parts.push('');
        }

        parts.push(`# CURRENT ITERATION: ${this.currentIteration}/${this.maxIterations}`);
        parts.push('');

        parts.push('# INSTRUCTIONS');
        parts.push('1. Think step-by-step about how to fulfill the mission');
        parts.push('2. If you need information, use available tools by writing: {{<tool name="toolName" query="what you need" />}}');
        parts.push('3. When you have enough information to answer, write: {{<conclude>}}YOUR FINAL ANSWER{{</conclude>}}');
        parts.push('4. Be concise and focused on the mission');

        return parts.join('\n');
    }

    /**
     * Parse tool calls from AI response
     * @private
     */
    _parseToolCalls(text) {
        if (!text) return [];

        const toolCalls = [];

        // Pattern: {{<tool name="toolName" query="query text" />}}
        const toolPattern = /\{\{<tool\s+name="([^"]+)"(?:\s+query="([^"]*)")?\s*\/>\}\}/g;

        let match;
        while ((match = toolPattern.exec(text)) !== null) {
            toolCalls.push({
                toolName: match[1],
                query: match[2] || '',
                raw: match[0]
            });
        }

        return toolCalls;
    }

    /**
     * Execute tools in sequence
     * @private
     */
    async _executeTools(toolCalls) {
        const results = [];

        for (const call of toolCalls) {
            try {
                const result = await this.toolRegistry.executeTool(
                    call.toolName,
                    call.query,
                    this.executionContext
                );

                results.push({
                    toolName: call.toolName,
                    query: call.query,
                    success: true,
                    result: result
                });
            } catch (error) {
                results.push({
                    toolName: call.toolName,
                    query: call.query,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Check if reasoning has converged
     * @private
     */
    _checkConvergence(iteration) {
        // Check for conclude tag
        const concludePattern = /\{\{<conclude>\}\}([\s\S]*?)\{\{<\/conclude>\}\}/;
        return concludePattern.test(iteration.thinking);
    }

    /**
     * Check if goal has been achieved
     * @private
     */
    _checkGoalAchievement(iteration, request) {
        // For now, convergence = goal achieved
        // Can be enhanced with more sophisticated checks
        return iteration.converged;
    }

    /**
     * Extract final response from iteration
     * @private
     */
    _extractFinalResponse(iteration) {
        const concludePattern = /\{\{<conclude>\}\}([\s\S]*?)\{\{<\/conclude>\}\}/;
        const match = iteration.thinking.match(concludePattern);

        if (match) {
            return match[1].trim();
        }

        return iteration.thinking;
    }

    /**
     * Build final result object
     * @private
     */
    _buildFinalResult(request) {
        const lastIteration = this.reasoningTrace[this.reasoningTrace.length - 1];

        return {
            success: lastIteration && (lastIteration.converged || lastIteration.goalAchieved),
            agentId: request.agentId,
            query: request.query,
            iterations: this.currentIteration,
            maxIterations: this.maxIterations,
            finalResponse: lastIteration?.response || '',
            reasoningTrace: this.reasoningTrace,
            executionSummary: this.executionContext.getSummary(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Build tools documentation for prompt
     * @private
     */
    _buildToolsDocumentation(availableTools) {
        if (!availableTools || availableTools.length === 0) {
            return null;
        }

        const docs = availableTools.map(tool => {
            return `- **${tool.name}**: ${tool.description || 'No description'}`;
        });

        return docs.join('\n');
    }

    /**
     * Get default system prompt
     * @private
     */
    _getDefaultSystemPrompt(agentId) {
        return `You are an autonomous sub-agent (${agentId}) with the ability to reason iteratively and use tools.

Your goal is to fulfill the mission given to you by making decisions, gathering information using available tools, and synthesizing a comprehensive answer.

Remember:
- You can iterate multiple times to gather all needed information
- Use tools whenever you need external data
- Think step-by-step and be methodical
- When you have a complete answer, use the {{<conclude>}} tag`;
    }

    /**
     * Validate request
     * @private
     */
    _validateRequest(request) {
        if (!request.agentId) {
            throw new Error('agentId is required');
        }
        if (!request.query) {
            throw new Error('query is required');
        }
        if (!request.agentConfig) {
            throw new Error('agentConfig is required');
        }
    }

    /**
     * Stop the reasoning loop
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            currentIteration: this.currentIteration,
            maxIterations: this.maxIterations,
            traceLength: this.reasoningTrace.length
        };
    }
}

export default SubAgentReasoningLoop;
