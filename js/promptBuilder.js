// promptBuilder.js - Builds comprehensive system prompts with data structures

class PromptBuilder {
    constructor(dataStructures) {
        this.ds = dataStructures;
    }

    // Build complete system prompt for reasoning
    buildSystemPrompt() {
        const sections = [];

        // System role and capabilities
        sections.push(this.buildRoleSection());

        // External tools description
        sections.push(this.buildToolsSection());

        // Memory context
        const memorySection = this.buildMemorySection();
        if (memorySection) sections.push(memorySection);

        // Goals context
        const goalsSection = this.buildGoalsSection();
        if (goalsSection) sections.push(goalsSection);

        // Reasoning instructions
        sections.push(this.buildReasoningInstructions());

        return sections.join('\n\n');
    }

    // Build role and capabilities section
    buildRoleSection() {
        return `# SYSTEM ROLE AND CAPABILITIES

You are an advanced AI reasoning system with access to external tools and persistent data structures. Your purpose is to provide thorough, step-by-step reasoning while utilizing available tools and maintaining context across multiple iterations.

Current Session: ${this.ds.currentSessionId}
Timestamp: ${new Date().toISOString()}`;
    }

    // Build external tools section
    buildToolsSection() {
        return `# EXTERNAL TOOLS SYSTEM

You have access to the following tools through structured XML-like tags. To use a tool, output the exact tag format shown below:

## 1. MEMORY SYSTEM
Store and retrieve information across conversation:

**Store Memory:**
<TOOL>memory_store</TOOL>
<ARG>summary:Brief summary of what to store</ARG>
<ARG>details:Detailed information to store</ARG>

**Fetch Memory:**
<TOOL>memory_fetch</TOOL>
<ARG>index:NUMBER</ARG>

## 2. JAVASCRIPT CODE EXECUTION
Execute JavaScript code directly in the browser with full internet access:

<TOOL>js_exec</TOOL>
<ARG>code:
// Your JavaScript code here
// Use setOutput(value) to set the output that will be returned
// Example: setOutput({ result: 42 });
</ARG>

## 3. HTML CANVAS RENDERING
Render HTML content for visualization:

<TOOL>canvas_render</TOOL>
<ARG>html:
<!-- Your HTML content here -->
</ARG>

## 4. GOAL MANAGEMENT
Add or update goals:

**Add Goal:**
<TOOL>goal_add</TOOL>
<ARG>goal:Description of the goal</ARG>
<ARG>priority:high|normal|low</ARG>

**Update Goal:**
<TOOL>goal_update</TOOL>
<ARG>index:NUMBER</ARG>
<ARG>status:active|in_progress|achieved|abandoned</ARG>

## 5. CHECKPOINT SYSTEM
Save current state for later restoration:

<TOOL>checkpoint_save</TOOL>
<ARG>name:Checkpoint name</ARG>
<ARG>description:Brief description</ARG>

## 6. FINAL OUTPUT
When you have completed reasoning and are ready to provide the final answer:

<FINAL>
Your final answer or output here
</FINAL>`;
    }

    // Build memory context section
    buildMemorySection() {
        const memories = this.ds.getMemorySummaries();
        if (!memories) return null;

        return `# AVAILABLE MEMORY

The following memory items are available. Use memory_fetch to retrieve full details:

${memories}

Total memory items: ${this.ds.memory.length}`;
    }

    // Build goals context section
    buildGoalsSection() {
        const goals = this.ds.getGoals();
        if (!goals) return null;

        return `# ACTIVE GOALS

Current goals to work towards or verify against:

${goals}

Total goals: ${this.ds.goals.length}`;
    }

    // Build reasoning instructions
    buildReasoningInstructions() {
        return `# REASONING INSTRUCTIONS

1. **Think Step-by-Step**: Use chain-of-thought reasoning. Break down complex problems into smaller steps.

2. **Use Tools When Needed**: If you need to store information, execute code, or render visualizations, use the appropriate tool tags.

3. **Iterative Reasoning**: Your reasoning steps are automatically preserved across iterations. Build upon previous steps.

4. **Memory Management**: Store important information in memory for long-term context. Fetch memory when you need to recall details.

5. **Goal Awareness**: Keep track of active goals. Update goal status as you make progress.

6. **Verification**: Before outputting final answers, verify against stated goals and reasoning chain.

7. **Final Output**: Only use the <FINAL> tag when you have completed all reasoning and verification.

## Output Format Requirements:
- Regular reasoning: Output your thoughts directly
- Tool usage: Use exact tool tag format as shown above
- Final answer: Wrap in <FINAL></FINAL> tags only when complete

## Important Notes:
- Tool outputs will be automatically fed back to you in the next iteration
- The reasoning chain is preserved across iterations
- You can use multiple tools in sequence across iterations
- Be explicit about what you're doing in each step`;
    }

    // Build user context prompt
    buildUserPrompt(userInput, iteration = 1) {
        const sections = [];

        sections.push(`# USER REQUEST\n\n${userInput}`);

        // Add reasoning chain if exists
        const reasoningChain = this.ds.getReasoningChain();
        if (reasoningChain) {
            sections.push(`# REASONING CHAIN SO FAR\n\n${reasoningChain}`);
        }

        sections.push(`\n---\nCurrent Iteration: ${iteration}/${CONFIG.MAX_ITERATIONS}`);
        sections.push('\nProvide your next reasoning step or final output:');

        return sections.join('\n\n');
    }

    // Build verification prompt
    buildVerificationPrompt(output) {
        const goals = this.ds.getGoals();
        const reasoningChain = this.ds.getReasoningChain();

        return `# OUTPUT VERIFICATION

Please verify the following output against the stated goals and reasoning chain.

## Goals:
${goals || 'No specific goals set'}

## Reasoning Chain:
${reasoningChain || 'No reasoning chain available'}

## Output to Verify:
${output}

## Verification Tasks:
1. Check if the output addresses all active goals
2. Verify logical consistency with the reasoning chain
3. Identify any missing information or gaps
4. Confirm completeness and accuracy

If verified successfully, respond with:
<VERIFIED>
${output}
</VERIFIED>

If issues found, respond with:
<NEEDS_REVISION>
List specific issues and suggestions for improvement
</NEEDS_REVISION>`;
    }

    // Build tool result prompt
    buildToolResultPrompt(toolName, result) {
        return `\n\n# TOOL EXECUTION RESULT\n\nTool: ${toolName}\nResult:\n${result}\n\nContinue your reasoning with this information:`;
    }

    // Parse tool tags from model output
    parseToolCalls(output) {
        const tools = [];

        // Match tool tags with multi-line support
        const toolRegex = /<TOOL>([^<]+)<\/TOOL>([\s\S]*?)(?=<TOOL>|<FINAL>|$)/g;
        let match;

        while ((match = toolRegex.exec(output)) !== null) {
            const toolName = match[1].trim().toLowerCase();
            const argsBlock = match[2];

            // Parse arguments
            const args = {};
            const argRegex = /<ARG>([^:]+):([\s\S]*?)<\/ARG>/g;
            let argMatch;

            while ((argMatch = argRegex.exec(argsBlock)) !== null) {
                const key = argMatch[1].trim();
                const value = argMatch[2].trim();
                args[key] = value;
            }

            tools.push({ tool: toolName, args });
        }

        return tools;
    }

    // Check if output contains final tag
    isFinalOutput(output) {
        return /<FINAL>[\s\S]*?<\/FINAL>/i.test(output);
    }

    // Extract final output
    extractFinalOutput(output) {
        const match = output.match(/<FINAL>([\s\S]*?)<\/FINAL>/i);
        return match ? match[1].trim() : null;
    }

    // Check if output is verified
    isVerified(output) {
        return /<VERIFIED>[\s\S]*?<\/VERIFIED>/i.test(output);
    }

    // Extract verified output
    extractVerifiedOutput(output) {
        const match = output.match(/<VERIFIED>([\s\S]*?)<\/VERIFIED>/i);
        return match ? match[1].trim() : null;
    }

    // Check if revision needed
    needsRevision(output) {
        return /<NEEDS_REVISION>[\s\S]*?<\/NEEDS_REVISION>/i.test(output);
    }

    // Extract revision feedback
    extractRevisionFeedback(output) {
        const match = output.match(/<NEEDS_REVISION>([\s\S]*?)<\/NEEDS_REVISION>/i);
        return match ? match[1].trim() : null;
    }
}

// Export
window.PromptBuilder = PromptBuilder;
