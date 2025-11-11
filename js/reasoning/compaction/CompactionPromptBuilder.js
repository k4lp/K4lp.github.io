/**
 * COMPACTION PROMPT BUILDER
 *
 * Builds the prompt for the LLM compaction agent.
 * Instructs Gemini to create a truth-only summary.
 */

export class CompactionPromptBuilder {
  /**
   * Build compaction prompt
   *
   * @param {Object} gatheredData - Data from CompactionDataGatherer
   * @returns {string} Prompt for Gemini
   */
  build(gatheredData) {
    const { reasoningEntries, executionEntries, currentIteration } = gatheredData;

    const prompt = this._buildPrompt(reasoningEntries, executionEntries, currentIteration);

    console.log(`[CompactionPromptBuilder] Built prompt for iterations 1-${currentIteration - 1}`);

    return prompt;
  }

  /**
   * Build the actual prompt
   * @private
   */
  _buildPrompt(reasoningEntries, executionEntries, currentIteration) {
    const reasoningText = this._formatReasoningEntries(reasoningEntries);
    const executionText = this._formatExecutionEntries(executionEntries);

    return `You are a Context Compaction Agent.

Your task is to create a CONCISE SUMMARY of the reasoning history provided below.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ INCLUDE:
- All TRUE, VERIFIED information
- Successful solutions and their results
- Critical insights and discoveries
- All important details, even minute ones
- Key decisions that led to progress

❌ EXCLUDE:
- Failed code attempts
- Wrong reasoning paths
- Debugging outputs that led nowhere
- Execution errors that were later fixed
- Incorrect approaches that were abandoned

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your output MUST follow this EXACT format:

=== COMPACTED SUMMARY (Iterations 1-${currentIteration - 1}) ===

### 🎯 OBJECTIVE ACHIEVED
[What was accomplished in these iterations]

### 📊 KEY DISCOVERIES
- [Discovery 1]
- [Discovery 2]
- [etc.]

### ✅ VERIFIED SOLUTIONS
- [Solution 1]
- [Solution 2]
- [etc.]

### 💡 CRITICAL INSIGHTS
- [Insight 1]
- [Insight 2]
- [etc.]

---
📌 NOTE FOR NEXT REASONING STEP:

In your next reasoning iteration, you will have access to:
   - All current Tasks (fresh from storage)
   - All current Goals (fresh from storage)
   - All current Memory items (fresh from storage)
   - Complete Vault reference list (fresh from storage)

This compacted summary focuses on PAST reasoning history.
Your current state context will be provided separately.
---

=== END COMPACTED SUMMARY ===

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REASONING HISTORY TO COMPACT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${reasoningText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODE EXECUTION HISTORY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${executionText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now, create the compacted summary following the EXACT format specified above.
Include ONLY verified truth and successful outcomes.
Be concise but preserve all critical details.`;
  }

  /**
   * Format reasoning entries
   * @private
   */
  _formatReasoningEntries(entries) {
    if (!entries || entries.length === 0) {
      return '[No reasoning entries]';
    }

    return entries
      .map(entry => {
        return `=== ITERATION ${entry.iteration} ===\n${entry.content}`;
      })
      .join('\n\n');
  }

  /**
   * Format execution entries
   * @private
   */
  _formatExecutionEntries(entries) {
    if (!entries || entries.length === 0) {
      return '[No execution entries]';
    }

    return entries
      .map((entry, index) => {
        const parts = [`--- Execution ${index + 1} (Iteration ${entry.iteration}) ---`];

        if (entry.code) {
          parts.push(`CODE:\n${entry.code}`);
        }

        if (entry.result !== undefined) {
          parts.push(`RESULT:\n${JSON.stringify(entry.result, null, 2)}`);
        }

        if (entry.error) {
          parts.push(`ERROR:\n${entry.error}`);
        }

        return parts.join('\n\n');
      })
      .join('\n\n');
  }
}

export default CompactionPromptBuilder;
