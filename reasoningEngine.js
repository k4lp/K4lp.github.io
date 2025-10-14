// Advanced Reasoning Engine
class ReasoningEngine {
    constructor() {
        this.reasoningTypes = {
            ANALYSIS: 'analysis',
            SYNTHESIS: 'synthesis',
            EVALUATION: 'evaluation',
            PROBLEM_SOLVING: 'problem_solving',
            VERIFICATION: 'verification',
            EXPLORATION: 'exploration'
        };

        this.currentChain = [];
        this.reasoningPrompts = this.initializePrompts();
    }

    initializePrompts() {
        return {
            [this.reasoningTypes.ANALYSIS]: `ANALYSIS PHASE:
Break down the problem into core components. Identify key elements, relationships, and patterns.
Consider: What are the fundamental aspects? What data is available? What constraints exist?`,

            [this.reasoningTypes.SYNTHESIS]: `SYNTHESIS PHASE:
Combine insights from analysis to form coherent understanding.
Consider: How do the pieces fit together? What patterns emerge? What hypotheses can be formed?`,

            [this.reasoningTypes.EVALUATION]: `EVALUATION PHASE:
Critically assess the synthesized information and proposed solutions.
Consider: What are the strengths and weaknesses? What evidence supports or contradicts? What alternatives exist?`,

            [this.reasoningTypes.PROBLEM_SOLVING]: `PROBLEM-SOLVING PHASE:
Apply structured approaches to generate solutions.
Consider: What methods can be applied? What steps are needed? What resources are required?`,

            [this.reasoningTypes.VERIFICATION]: `VERIFICATION PHASE:
Validate solutions against requirements and constraints.
Consider: Does this meet the goals? Are there edge cases? What could go wrong?`,

            [this.reasoningTypes.EXPLORATION]: `EXPLORATION PHASE:
Investigate new angles and creative possibilities.
Consider: What haven't we considered? Are there alternative approaches? What innovative solutions exist?`
        };
    }

    async processWithChainOfThought(userMessage, customChain = null) {
        try {
            const chain = customChain || this.getDefaultChain(userMessage);
            let results = [];
            let cumulativeContext = userMessage;

            for (let i = 0; i < chain.length; i++) {
                const phaseType = chain[i];
                const phasePrompt = this.reasoningPrompts[phaseType];

                this.addStep(`${phaseType.toUpperCase()} Phase`, 'Processing...');

                const fullPrompt = `${phasePrompt}

CONTEXT: ${cumulativeContext}

USER REQUEST: ${userMessage}

Previous reasoning steps:
${results.map((r, idx) => `${idx + 1}. ${r.type}: ${r.result.substring(0, 200)}...`).join('\n')}

Provide detailed reasoning for this phase:`;

                const response = await geminiAPI.makeRequest(fullPrompt, true);

                const result = {
                    type: phaseType,
                    prompt: phasePrompt,
                    result: response,
                    timestamp: new Date()
                };

                results.push(result);
                cumulativeContext += `\n\n${phaseType} RESULT: ${response}`;

                this.addStep(`${phaseType.toUpperCase()} Complete`, response.substring(0, 100) + '...');

                // Store significant insights
                if (response.length > 150) {
                    dataManager.addMemory(
                        `${phaseType} insight`,
                        response,
                        'reasoning'
                    );
                }
            }

            return this.synthesizeFinalResponse(results, userMessage);

        } catch (error) {
            console.error('Error in chain of thought processing:', error);
            throw error;
        }
    }

    getDefaultChain(message) {
        // Analyze message complexity to determine appropriate reasoning chain
        const isComplex = message.length > 100 || 
                         message.includes('analyze') || 
                         message.includes('compare') ||
                         message.includes('solve') ||
                         message.includes('create');

        const isProblemSolving = message.includes('how to') || 
                               message.includes('solution') ||
                               message.includes('implement') ||
                               message.includes('build');

        const isEvaluative = message.includes('evaluate') ||
                           message.includes('assess') ||
                           message.includes('review') ||
                           message.includes('judge');

        if (isProblemSolving) {
            return [
                this.reasoningTypes.ANALYSIS,
                this.reasoningTypes.PROBLEM_SOLVING,
                this.reasoningTypes.VERIFICATION
            ];
        } else if (isEvaluative) {
            return [
                this.reasoningTypes.ANALYSIS,
                this.reasoningTypes.EVALUATION,
                this.reasoningTypes.SYNTHESIS
            ];
        } else if (isComplex) {
            return [
                this.reasoningTypes.ANALYSIS,
                this.reasoningTypes.SYNTHESIS,
                this.reasoningTypes.EVALUATION
            ];
        } else {
            return [this.reasoningTypes.ANALYSIS];
        }
    }

    async synthesizeFinalResponse(results, originalMessage) {
        const synthesisPrompt = `FINAL SYNTHESIS:
Based on the following reasoning chain, provide a comprehensive final response to the user.

ORIGINAL REQUEST: ${originalMessage}

REASONING CHAIN:
${results.map((r, idx) => `
${idx + 1}. ${r.type.toUpperCase()}:
${r.result}
`).join('\n')}

ACTIVE GOALS:
${dataManager.getActiveGoals().map(g => g.content).join('\n')}

Provide a final, actionable response that:
1. Directly addresses the user's request
2. Incorporates insights from all reasoning phases
3. Is practical and implementable
4. Aligns with stated goals
5. Includes next steps if applicable`;

        this.addStep('Final Synthesis', 'Generating comprehensive response');

        const finalResponse = await geminiAPI.makeRequest(synthesisPrompt, false);

        // Store the final response as important memory
        dataManager.addMemory(
            `Response: ${originalMessage.substring(0, 50)}...`,
            finalResponse,
            'final_response'
        );

        return finalResponse;
    }

    addStep(title, content) {
        dataManager.addReasoningStep(`${title}: ${content}`, title.toLowerCase());

        // Update UI immediately
        const reasoningChain = document.getElementById('reasoningChain');
        const newStep = document.createElement('div');
        newStep.className = 'reasoning-step';
        newStep.innerHTML = `
            <div class="step-title">${title}</div>
            <div class="step-content">${content}</div>
        `;
        reasoningChain.appendChild(newStep);
        reasoningChain.scrollTop = reasoningChain.scrollHeight;
    }

    // Custom reasoning chains for specific tasks
    async processCodeGeneration(request) {
        return await this.processWithChainOfThought(request, [
            this.reasoningTypes.ANALYSIS,
            this.reasoningTypes.PROBLEM_SOLVING,
            this.reasoningTypes.VERIFICATION
        ]);
    }

    async processAnalyticalTask(request) {
        return await this.processWithChainOfThought(request, [
            this.reasoningTypes.ANALYSIS,
            this.reasoningTypes.SYNTHESIS,
            this.reasoningTypes.EVALUATION,
            this.reasoningTypes.VERIFICATION
        ]);
    }

    async processCreativeTask(request) {
        return await this.processWithChainOfThought(request, [
            this.reasoningTypes.EXPLORATION,
            this.reasoningTypes.SYNTHESIS,
            this.reasoningTypes.EVALUATION
        ]);
    }

    // Get reasoning statistics
    getReasoningStats() {
        const chain = dataManager.getReasoningChain();
        const typeCount = {};

        chain.forEach(step => {
            typeCount[step.type] = (typeCount[step.type] || 0) + 1;
        });

        return {
            totalSteps: chain.length,
            typeDistribution: typeCount,
            averageStepsPerSession: chain.length / (dataManager.currentSession.messageCount || 1)
        };
    }
}

// Global instance
const reasoningEngine = new ReasoningEngine();