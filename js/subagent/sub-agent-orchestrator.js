/**
 * SubAgentOrchestrator
 *
 * Manages sub-agent lifecycle and execution:
 * - Loads agent configurations
 * - Creates isolated execution context
 * - Runs reasoning loop with LLM
 * - Executes code in sandbox
 * - Returns structured results
 *
 * Sub-agents are isolated from the main session:
 * - No main session storage pollution
 * - No UI updates
 * - Separate execution context
 * - Independent reasoning loop
 */

import { SUB_AGENTS, DEFAULT_AGENT, getAgent } from './agents-config.js';
import { ReasoningParser } from '../reasoning/parser/parser-core.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { SandboxExecutor } from '../execution/sandbox-executor.js';
import WebTools from './tools/web-tools.js';
import { nowISO } from '../core/utils.js';

export class SubAgentOrchestrator {

  /**
   * Run a sub-agent with a given query
   * @param {string} agentId - Agent identifier from SUB_AGENTS
   * @param {string} query - User query to process
   * @param {object} options - Additional options
   * @param {string} options.modelId - Model ID to use (required)
   * @param {number} options.maxIterations - Override max iterations
   * @param {boolean} options.verbose - Enable verbose logging (default: true)
   * @returns {Promise<object>} Structured result from sub-agent
   *
   * Result structure:
   * {
   *   success: boolean,
   *   content: string,           // Final output from agent
   *   format: string,            // Output format (markdown-bullets, etc.)
   *   source: string,            // Agent name
   *   iterations: number,        // Iterations used
   *   executionTime: number,     // Total time in ms
   *   error: string              // Error message if failed
   * }
   */
  static async runSubAgent(agentId = DEFAULT_AGENT, query, options = {}) {
    const startTime = Date.now();
    const { modelId, maxIterations: overrideMaxIterations, verbose = true } = options;

    // Validate inputs
    if (!modelId) {
      throw new Error('SubAgentOrchestrator requires modelId in options');
    }

    if (!query || typeof query !== 'string') {
      throw new Error('SubAgentOrchestrator requires valid query string');
    }

    // Load agent configuration
    const agent = getAgent(agentId);
    if (!agent) {
      throw new Error(`Sub-agent '${agentId}' not found. Available: ${Object.keys(SUB_AGENTS).join(', ')}`);
    }

    const maxIterations = overrideMaxIterations || agent.maxIterations;

    if (verbose) {
      console.log(`🤖 [SubAgent] Starting ${agent.name}`);
      console.log(`📝 [SubAgent] Query: ${query}`);
      console.log(`🎯 [SubAgent] Model: ${modelId}`);
      console.log(`🔄 [SubAgent] Max iterations: ${maxIterations}`);
    }

    try {
      // Build initial prompt
      const initialPrompt = this._buildInitialPrompt(agent, query);

      // Reasoning loop
      let iteration = 0;
      let conversationHistory = [
        { role: 'user', content: initialPrompt }
      ];
      let finalResult = null;

      while (iteration < maxIterations) {
        iteration++;
        if (verbose) {
          console.log(`🔄 [SubAgent] Iteration ${iteration}/${maxIterations}`);
        }

        // Call LLM
        const llmStartTime = Date.now();
        const response = await this._callLLM(conversationHistory, modelId);
        const llmDuration = Date.now() - llmStartTime;

        if (verbose) {
          console.log(`💬 [SubAgent] LLM response received (${llmDuration}ms)`);
          console.log(`📄 [SubAgent] Response length: ${response.length} chars`);
        }

        // Parse operations from response
        const operations = ReasoningParser.parseOperations(response);

        if (verbose) {
          console.log(`🔍 [SubAgent] Parsed operations:`, {
            jsExecute: operations.jsExecute?.length || 0,
            finalOutput: operations.finalOutput?.length || 0
          });
        }

        // Check for final output
        if (operations.finalOutput && operations.finalOutput.length > 0) {
          finalResult = {
            success: true,
            content: operations.finalOutput.join('\n\n'),
            format: agent.outputFormat,
            source: agent.name,
            iterations: iteration,
            executionTime: Date.now() - startTime
          };
          if (verbose) {
            console.log(`✅ [SubAgent] Final output received`);
          }
          break;
        }

        // Execute code operations
        let executionOutput = '';
        if (operations.jsExecute && operations.jsExecute.length > 0) {
          if (verbose) {
            console.log(`⚙️  [SubAgent] Executing ${operations.jsExecute.length} code block(s)`);
          }

          for (let i = 0; i < operations.jsExecute.length; i++) {
            const code = operations.jsExecute[i];
            if (verbose) {
              console.log(`   📦 Executing block ${i + 1}/${operations.jsExecute.length} (${code.length} chars)`);
            }

            const execStartTime = Date.now();
            const result = await this._executeInSandbox(code, agent);
            const execDuration = Date.now() - execStartTime;

            if (verbose) {
              console.log(`   ${result.success ? '✅' : '❌'} Execution ${result.success ? 'succeeded' : 'failed'} (${execDuration}ms)`);
            }

            executionOutput += this._formatExecutionResult(result, i + 1);
          }
        }

        // If no operations and no final output, treat response as final
        if (!operations.jsExecute || operations.jsExecute.length === 0) {
          if (!operations.finalOutput || operations.finalOutput.length === 0) {
            // No operations at all - treat as implicit final output
            finalResult = {
              success: true,
              content: response,
              format: agent.outputFormat,
              source: agent.name,
              iterations: iteration,
              executionTime: Date.now() - startTime
            };
            if (verbose) {
              console.log(`✅ [SubAgent] Implicit final output (no operations)`);
            }
            break;
          }
        }

        // Add assistant response to history
        conversationHistory.push({ role: 'assistant', content: response });

        // Add execution results if any
        if (executionOutput) {
          conversationHistory.push({
            role: 'user',
            content: `**Tool Execution Results:**\n\n${executionOutput}\n\n` +
                     `Continue reasoning or provide your final answer using <final_output> tag.`
          });
        } else {
          // No execution output but also no final output - prompt for continuation
          conversationHistory.push({
            role: 'user',
            content: `Please continue your analysis or provide your final answer using <final_output> tag.`
          });
        }
      }

      // Check if we got a result
      if (!finalResult) {
        console.warn(`⚠️  [SubAgent] Max iterations (${maxIterations}) reached without final output`);
        finalResult = {
          success: false,
          content: `Sub-agent exceeded maximum iterations (${maxIterations}) without producing final answer. ` +
                   `Try simplifying the query or increasing maxIterations.`,
          format: 'error',
          source: agent.name,
          iterations: iteration,
          executionTime: Date.now() - startTime,
          error: 'MAX_ITERATIONS_EXCEEDED'
        };
      }

      if (verbose) {
        console.log(`🏁 [SubAgent] Completed in ${iteration} iteration(s), ${finalResult.executionTime}ms total`);
      }

      return finalResult;

    } catch (error) {
      console.error(`❌ [SubAgent] Fatal error:`, error);
      return {
        success: false,
        content: `Sub-agent encountered an error: ${error.message}`,
        format: 'error',
        source: agent.name,
        iterations: 0,
        executionTime: Date.now() - startTime,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Build initial prompt for sub-agent
   * @private
   */
  static _buildInitialPrompt(agent, query) {
    return `${agent.systemPrompt}

---

**USER QUERY:**
${query}

**YOUR TASK:**
Process this query using your available tools. Execute searches, gather information, and provide a final structured answer following your output format.

**IMPORTANT REMINDERS:**
1. Use <js_execute> blocks to call tools (they will be executed)
2. Use <final_output> tag for your final answer
3. Tools are available via the WebTools API as described above
4. You can iterate multiple times - gather info first, then synthesize

Begin your analysis now.`;
  }

  /**
   * Call LLM API
   * @private
   */
  static async _callLLM(conversationHistory, modelId) {
    // Convert conversation history to single prompt
    // (Gemini API supports multi-turn, but we'll use simple concatenation)
    const prompt = conversationHistory
      .map(msg => {
        if (msg.role === 'user') {
          return `**USER:**\n${msg.content}`;
        } else {
          return `**ASSISTANT:**\n${msg.content}`;
        }
      })
      .join('\n\n---\n\n');

    // Call Gemini API
    const response = await GeminiAPI.generateContent(modelId, prompt);

    // Extract response text
    const responseText = GeminiAPI.extractResponseText(response);

    return responseText;
  }

  /**
   * Execute code in sandbox
   * @private
   */
  static async _executeInSandbox(code, agent) {
    try {
      // Create sandbox executor with WebTools and agent timeout
      const sandbox = new SandboxExecutor({
        isolatedContext: { WebTools },
        timeoutMs: agent.timeoutMs || 15000,
        instrumented: false, // Don't track in main session
        barebone: false // Include base APIs (vault, memory, etc.)
      });

      const result = await sandbox.execute(code);
      return result;

    } catch (error) {
      return {
        success: false,
        error: {
          name: error.name || 'Error',
          message: error.message || String(error),
          stack: error.stack || null
        },
        logs: [],
        consoleOutput: '',
        executionTime: 0,
        code
      };
    }
  }

  /**
   * Format execution result for LLM feedback
   * @private
   */
  static _formatExecutionResult(result, blockNumber) {
    let output = `**Execution Block #${blockNumber}:**\n\n`;

    if (result.success) {
      // Show console output if any
      if (result.consoleOutput && result.consoleOutput.trim()) {
        output += `**Console Output:**\n\`\`\`\n${result.consoleOutput}\n\`\`\`\n\n`;
      }

      // Show return value if any
      if (result.result !== undefined) {
        const resultStr = typeof result.result === 'string'
          ? result.result
          : JSON.stringify(result.result, null, 2);
        output += `**Return Value:**\n\`\`\`\n${resultStr}\n\`\`\`\n\n`;
      }

      if (!result.consoleOutput && result.result === undefined) {
        output += `**Status:** Executed successfully (no output)\n\n`;
      }
    } else {
      // Show error
      output += `**Error:**\n\`\`\`\n${result.error.message || 'Unknown error'}\n\`\`\`\n\n`;

      if (result.error.stack) {
        output += `**Stack Trace:**\n\`\`\`\n${result.error.stack}\n\`\`\`\n\n`;
      }

      // Show any console output before error
      if (result.consoleOutput && result.consoleOutput.trim()) {
        output += `**Console Output (before error):**\n\`\`\`\n${result.consoleOutput}\n\`\`\`\n\n`;
      }
    }

    output += `**Execution Time:** ${result.executionTime || 0}ms\n\n`;
    output += '---\n\n';

    return output;
  }

  /**
   * Get list of available agents
   * @returns {object[]} Array of agent info
   */
  static getAvailableAgents() {
    return Object.values(SUB_AGENTS).map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      maxIterations: agent.maxIterations,
      outputFormat: agent.outputFormat
    }));
  }

  /**
   * Get agent configuration
   * @param {string} agentId - Agent ID
   * @returns {object|null} Agent configuration or null
   */
  static getAgentConfig(agentId) {
    return getAgent(agentId);
  }
}

export default SubAgentOrchestrator;
