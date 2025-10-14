// responseParser.js - Parses and processes model responses

class ResponseParser {
    constructor(dataStructures) {
        this.ds = dataStructures;
    }

    // Parse complete model response
    parseResponse(response) {
        const result = {
            hasTools: false,
            tools: [],
            isFinal: false,
            finalContent: null,
            reasoningText: '',
            rawResponse: response
        };

        // Extract tool calls
        result.tools = this.extractToolCalls(response);
        result.hasTools = result.tools.length > 0;

        // Check for final output
        result.isFinal = this.isFinalOutput(response);
        if (result.isFinal) {
            result.finalContent = this.extractFinalContent(response);
        }

        // Extract reasoning text (everything not in tool/final tags)
        result.reasoningText = this.extractReasoningText(response);

        return result;
    }

    // Extract tool calls from response
    extractToolCalls(text) {
        const tools = [];
        const toolRegex = /<TOOL>([\s\S]*?)<\/TOOL>([\s\S]*?)(?=<TOOL>|<FINAL>|$)/gi;
        let match;

        while ((match = toolRegex.exec(text)) !== null) {
            const toolName = match[1].trim().toLowerCase();
            const argsBlock = match[2];

            const args = this.extractArgs(argsBlock);

            tools.push({
                name: toolName,
                args: args,
                rawBlock: match[0]
            });
        }

        return tools;
    }

    // Extract arguments from arg block
    extractArgs(argsBlock) {
        const args = {};
        const argRegex = /<ARG>([^:]+?):(.*?)<\/ARG>/gs;
        let match;

        while ((match = argRegex.exec(argsBlock)) !== null) {
            const key = match[1].trim();
            const value = match[2].trim();
            args[key] = value;
        }

        return args;
    }

    // Check if response contains final output
    isFinalOutput(text) {
        return /<FINAL>/i.test(text);
    }

    // Extract final content
    extractFinalContent(text) {
        const match = text.match(/<FINAL>([\s\S]*?)<\/FINAL>/i);
        return match ? match[1].trim() : null;
    }

    // Extract reasoning text (remove tool and final tags)
    extractReasoningText(text) {
        let reasoning = text;

        // Remove tool blocks
        reasoning = reasoning.replace(/<TOOL>[\s\S]*?<\/TOOL>[\s\S]*?(?=<TOOL>|<FINAL>|$)/gi, '');

        // Remove final blocks
        reasoning = reasoning.replace(/<FINAL>[\s\S]*?<\/FINAL>/gi, '');

        // Remove arg blocks that might be left over
        reasoning = reasoning.replace(/<ARG>[\s\S]*?<\/ARG>/gi, '');

        return reasoning.trim();
    }

    // Validate tool call
    validateToolCall(tool) {
        const validTools = [
            'memory_store',
            'memory_fetch',
            'js_exec',
            'canvas_render',
            'goal_add',
            'goal_update',
            'checkpoint_save'
        ];

        if (!validTools.includes(tool.name)) {
            return {
                valid: false,
                error: `Unknown tool: ${tool.name}`
            };
        }

        // Validate required arguments for each tool
        switch (tool.name) {
            case 'memory_store':
                if (!tool.args.summary || !tool.args.details) {
                    return {
                        valid: false,
                        error: 'memory_store requires summary and details arguments'
                    };
                }
                break;

            case 'memory_fetch':
                if (!tool.args.index) {
                    return {
                        valid: false,
                        error: 'memory_fetch requires index argument'
                    };
                }
                break;

            case 'js_exec':
                if (!tool.args.code) {
                    return {
                        valid: false,
                        error: 'js_exec requires code argument'
                    };
                }
                break;

            case 'canvas_render':
                if (!tool.args.html) {
                    return {
                        valid: false,
                        error: 'canvas_render requires html argument'
                    };
                }
                break;

            case 'goal_add':
                if (!tool.args.goal) {
                    return {
                        valid: false,
                        error: 'goal_add requires goal argument'
                    };
                }
                break;

            case 'goal_update':
                if (!tool.args.index || !tool.args.status) {
                    return {
                        valid: false,
                        error: 'goal_update requires index and status arguments'
                    };
                }
                break;

            case 'checkpoint_save':
                if (!tool.args.name) {
                    return {
                        valid: false,
                        error: 'checkpoint_save requires name argument'
                    };
                }
                break;
        }

        return { valid: true };
    }

    // Format tool result for display
    formatToolResult(toolName, result, success = true) {
        const timestamp = new Date().toLocaleTimeString();

        return {
            toolName: toolName,
            timestamp: timestamp,
            success: success,
            result: result,
            formatted: `[${timestamp}] ${toolName}: ${success ? 'Success' : 'Error'}\n${result}`
        };
    }

    // Parse verification response
    parseVerificationResponse(response) {
        const result = {
            verified: false,
            needsRevision: false,
            content: null,
            feedback: null
        };

        // Check for verified tag
        const verifiedMatch = response.match(/<VERIFIED>([\s\S]*?)<\/VERIFIED>/i);
        if (verifiedMatch) {
            result.verified = true;
            result.content = verifiedMatch[1].trim();
            return result;
        }

        // Check for needs revision tag
        const revisionMatch = response.match(/<NEEDS_REVISION>([\s\S]*?)<\/NEEDS_REVISION>/i);
        if (revisionMatch) {
            result.needsRevision = true;
            result.feedback = revisionMatch[1].trim();
            return result;
        }

        // No verification tags found - treat as verification passed
        result.verified = true;
        result.content = response;
        return result;
    }

    // Clean response for display (remove all tags)
    cleanForDisplay(text) {
        let cleaned = text;

        // Remove all tool tags
        cleaned = cleaned.replace(/<TOOL>[\s\S]*?<\/TOOL>/gi, '');
        cleaned = cleaned.replace(/<ARG>[\s\S]*?<\/ARG>/gi, '');
        cleaned = cleaned.replace(/<FINAL>[\s\S]*?<\/FINAL>/gi, '');
        cleaned = cleaned.replace(/<VERIFIED>[\s\S]*?<\/VERIFIED>/gi, '');
        cleaned = cleaned.replace(/<NEEDS_REVISION>[\s\S]*?<\/NEEDS_REVISION>/gi, '');

        // Clean up excessive whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.trim();

        return cleaned;
    }

    // Extract markdown code blocks
    extractCodeBlocks(text) {
        const codeBlocks = [];
        const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;

        while ((match = codeRegex.exec(text)) !== null) {
            codeBlocks.push({
                language: match[1] || 'plaintext',
                code: match[2].trim()
            });
        }

        return codeBlocks;
    }

    // Check if response indicates completion
    isCompletionSignal(text) {
        const completionPhrases = [
            'task complete',
            'finished',
            'done',
            'completed successfully',
            'all goals achieved'
        ];

        const lowerText = text.toLowerCase();
        return completionPhrases.some(phrase => lowerText.includes(phrase));
    }

    // Extract JSON from response
    extractJSON(text) {
        try {
            // Try to find JSON in code blocks first
            const jsonBlockMatch = text.match(/```json\n([\s\S]*?)```/);
            if (jsonBlockMatch) {
                return JSON.parse(jsonBlockMatch[1]);
            }

            // Try to find raw JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return null;
        } catch (e) {
            console.warn('Failed to extract JSON:', e);
            return null;
        }
    }

    // Sanitize HTML for safe rendering
    sanitizeHTML(html) {
        // Basic sanitization - remove script tags and event handlers
        let sanitized = html;

        // Remove script tags
        sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');

        // Remove event handlers (onclick, onload, etc.)
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

        return sanitized;
    }
}

// Export
window.ResponseParser = ResponseParser;
