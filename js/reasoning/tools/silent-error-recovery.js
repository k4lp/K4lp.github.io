/**
 * Silent Error Recovery System
 *
 * This module provides transparent error recovery for reference errors.
 * When the LLM references entities that don't exist, this system:
 * 1. Detects the error silently
 * 2. Retries with enhanced context (available entity references)
 * 3. Makes the recovery completely invisible to the user
 * 4. Logs everything to console for debugging
 *
 * The retry appears as if it was the original response - no traces in UI or reasoning log.
 */

class SilentErrorRecovery {
  constructor() {
    this.recoveryAttempts = [];
    this.enabled = true;
  }

  /**
   * Detect if reference errors occurred during operation processing
   * @param {Object} operationSummary - Summary from operation pipeline
   * @returns {Object|null} Error details or null if no errors
   */
  detectReferenceErrors(operationSummary) {
    const errors = [];

    // Check the centralized errors array in the summary
    if (operationSummary.errors && Array.isArray(operationSummary.errors)) {
      operationSummary.errors.forEach(error => {
        if (this.isReferenceError(error)) {
          errors.push({
            type: error.type || 'unknown',
            error: error,
            missingId: error.id || this.extractMissingId(error)
          });
        }
      });
    }

    if (errors.length > 0) {
      return {
        hasErrors: true,
        errors: errors,
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Check if an error is a reference error (entity not found)
   */
  isReferenceError(error) {
    if (!error) return false;

    const errorStr = typeof error === 'string' ? error : error.message || error.toString();

    // Patterns indicating reference errors
    const referencePatterns = [
      /not found/i,
      /does not exist/i,
      /missing/i,
      /not present/i,
      /cannot find/i,
      /no such/i,
      /unknown identifier/i
    ];

    return referencePatterns.some(pattern => pattern.test(errorStr));
  }

  /**
   * Extract the missing identifier from error message
   */
  extractMissingId(error) {
    const errorStr = typeof error === 'string' ? error : error.message || error.toString();

    // Try to extract identifier from common error message formats
    const patterns = [
      /"([^"]+)"/,           // "identifier"
      /'([^']+)'/,           // 'identifier'
      /id[:\s]+([^\s,]+)/i,  // id: identifier
      /\[([^\]]+)\]/         // [identifier]
    ];

    for (const pattern of patterns) {
      const match = errorStr.match(pattern);
      if (match) return match[1];
    }

    return 'unknown';
  }

  /**
   * Collect available entity references from storage
   * Returns just identifiers, not full content
   */
  collectAvailableReferences() {
    const Storage = window.Storage;

    const references = {
      memory: [],
      tasks: [],
      goals: [],
      vault: []
    };

    // Collect memory identifiers
    const memories = Storage.loadMemory() || [];
    references.memory = memories.map(m => ({
      id: m.identifier,
      heading: m.heading || 'No heading'
    }));

    // Collect task identifiers
    const tasks = Storage.loadTasks() || [];
    references.tasks = tasks.map(t => ({
      id: t.identifier,
      name: t.name || 'No name',
      status: t.status || 'unknown'
    }));

    // Collect goal identifiers
    const goals = Storage.loadGoals() || [];
    references.goals = goals.map(g => ({
      id: g.identifier,
      name: g.name || 'No name'
    }));

    // Collect vault identifiers
    const vault = Storage.loadVault() || [];
    references.vault = vault.map(v => ({
      id: v.id,
      type: v.type || 'unknown'
    }));

    return references;
  }

  /**
   * Build entity reference section for retry prompt
   * This is formatted to look natural, not like error correction
   */
  buildEntityReferenceSection(references) {
    const sections = [];

    // Memory entities
    if (references.memory.length > 0) {
      sections.push('**Available Memory Entities:**');
      references.memory.forEach(m => {
        sections.push(`- ${m.id}: ${m.heading}`);
      });
      sections.push('');
    } else {
      sections.push('**Available Memory Entities:** None');
      sections.push('');
    }

    // Task entities
    if (references.tasks.length > 0) {
      sections.push('**Available Task Entities:**');
      references.tasks.forEach(t => {
        sections.push(`- ${t.id}: ${t.name} [${t.status}]`);
      });
      sections.push('');
    } else {
      sections.push('**Available Task Entities:** None');
      sections.push('');
    }

    // Goal entities
    if (references.goals.length > 0) {
      sections.push('**Available Goal Entities:**');
      references.goals.forEach(g => {
        sections.push(`- ${g.id}: ${g.name}`);
      });
      sections.push('');
    } else {
      sections.push('**Available Goal Entities:** None');
      sections.push('');
    }

    // Vault entities
    if (references.vault.length > 0) {
      sections.push('**Available Vault Entities:**');
      references.vault.forEach(v => {
        sections.push(`- ${v.id} (${v.type})`);
      });
      sections.push('');
    } else {
      sections.push('**Available Vault Entities:** None');
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Build retry prompt with previous reasoning steps and entity references
   * This should look completely natural - no indication of error
   *
   * @param {string} originalPrompt - The original prompt from this iteration
   * @param {Array} previousReasoningSteps - Reasoning steps from iterations 0 to N-1
   * @param {Object} references - Available entity references
   * @returns {string} Enhanced prompt for retry
   */
  buildRetryPrompt(originalPrompt, previousReasoningSteps, references) {
    // Build the entity reference section
    const entitySection = this.buildEntityReferenceSection(references);

    // The retry prompt structure:
    // 1. Original context (already in originalPrompt)
    // 2. Previous reasoning steps (if any)
    // 3. Entity references (inserted naturally)
    // 4. Continue with current iteration

    let retryPrompt = originalPrompt;

    // Find a natural insertion point for entity references
    // We'll add it right after the context sections but before any existing reasoning

    // Look for common section markers in the prompt
    const sectionMarkers = [
      '## Current Tasks',
      '## Goals',
      '## Memory',
      '## Vault Index',
      '## Recent JavaScript Executions',
      '## Recent Reasoning'
    ];

    // Find the last section marker
    let lastSectionEnd = -1;
    for (const marker of sectionMarkers) {
      const index = retryPrompt.lastIndexOf(marker);
      if (index > lastSectionEnd) {
        // Find the end of this section (next ## or end of string)
        const nextSection = retryPrompt.indexOf('\n##', index + 1);
        lastSectionEnd = nextSection !== -1 ? nextSection : retryPrompt.length;
      }
    }

    // Insert entity references after the last context section
    if (lastSectionEnd > 0) {
      const beforeSection = retryPrompt.substring(0, lastSectionEnd);
      const afterSection = retryPrompt.substring(lastSectionEnd);

      retryPrompt = beforeSection + '\n\n## Entity Reference Index\n\n' + entitySection + '\n' + afterSection;
    } else {
      // Fallback: add at the beginning
      retryPrompt = '## Entity Reference Index\n\n' + entitySection + '\n\n' + retryPrompt;
    }

    // Add previous reasoning steps if available
    if (previousReasoningSteps && previousReasoningSteps.length > 0) {
      const reasoningSection = this.buildPreviousReasoningSection(previousReasoningSteps);

      // Insert before the entity references
      const entityRefIndex = retryPrompt.indexOf('## Entity Reference Index');
      if (entityRefIndex > 0) {
        const beforeReasoning = retryPrompt.substring(0, entityRefIndex);
        const afterReasoning = retryPrompt.substring(entityRefIndex);

        retryPrompt = beforeReasoning + reasoningSection + '\n\n' + afterReasoning;
      } else {
        retryPrompt = reasoningSection + '\n\n' + retryPrompt;
      }
    }

    return retryPrompt;
  }

  /**
   * Build section showing previous reasoning steps
   * Format: just the step number and brief summary, not full content
   */
  buildPreviousReasoningSection(steps) {
    if (!steps || steps.length === 0) return '';

    const lines = ['## Previous Reasoning Steps\n'];

    steps.forEach((step, index) => {
      // Extract just the first line or first 100 chars as summary
      const summary = this.extractStepSummary(step);
      lines.push(`${index + 1}. ${summary}`);
    });

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Extract brief summary from reasoning step
   */
  extractStepSummary(step) {
    if (!step) return 'No content';

    const text = typeof step === 'string' ? step : step.text || step.content || '';

    // Get first line or first 100 chars
    const firstLine = text.split('\n')[0];
    const summary = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;

    return summary || 'Reasoning step';
  }

  /**
   * Perform silent recovery
   * Returns the corrected response or null if recovery failed
   *
   * @param {Object} context - Recovery context
   * @returns {Object|null} Corrected response or null
   */
  async performSilentRecovery(context) {
    const {
      originalPrompt,
      previousReasoningSteps,
      errorDetails,
      modelId,
      iterationCount
    } = context;

    const startTime = Date.now();

    // Console logging (detailed but not visible to user)
    console.group(`[${new Date().toISOString()}] Silent Error Recovery: Iteration ${iterationCount}`);
    console.log('Error Details:', errorDetails);
    console.log('Missing References:', errorDetails.errors.map(e => e.missingId));

    try {
      // Collect available entity references
      const references = this.collectAvailableReferences();
      console.log('Available References:', {
        memory: references.memory.length,
        tasks: references.tasks.length,
        goals: references.goals.length,
        vault: references.vault.length
      });

      // Build retry prompt
      const retryPrompt = this.buildRetryPrompt(originalPrompt, previousReasoningSteps, references);
      console.log('Retry Prompt Length:', retryPrompt.length);
      console.log('Added Entity References Section: Yes');
      console.log('Added Previous Reasoning Steps:', previousReasoningSteps ? previousReasoningSteps.length : 0);

      // Make silent LLM call
      console.log('Calling LLM for silent retry...');
      const GeminiAPI = window.GeminiAPI;
      const response = await GeminiAPI.generateContent(modelId, retryPrompt);

      if (!response || !response.text) {
        console.error('Silent recovery failed: Empty response from LLM');
        console.groupEnd();
        return null;
      }

      const elapsed = Date.now() - startTime;
      console.log(`Silent recovery succeeded in ${elapsed}ms`);
      console.log('Response Length:', response.text.length);

      // Record recovery attempt
      this.recordRecovery({
        iterationCount,
        errorDetails,
        references,
        success: true,
        elapsed,
        timestamp: new Date().toISOString()
      });

      console.groupEnd();
      return response;

    } catch (error) {
      console.error('Silent recovery exception:', error);

      this.recordRecovery({
        iterationCount,
        errorDetails,
        success: false,
        error: error.message,
        elapsed: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });

      console.groupEnd();
      return null;
    }
  }

  /**
   * Record recovery attempt for debugging
   */
  recordRecovery(details) {
    this.recoveryAttempts.push(details);

    // Keep only last 50 attempts
    if (this.recoveryAttempts.length > 50) {
      this.recoveryAttempts.shift();
    }
  }

  /**
   * Get recovery statistics
   */
  getStats() {
    const total = this.recoveryAttempts.length;
    const successful = this.recoveryAttempts.filter(a => a.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total * 100).toFixed(1) + '%' : 'N/A',
      attempts: this.recoveryAttempts
    };
  }

  /**
   * Reset recovery history
   */
  reset() {
    this.recoveryAttempts = [];
  }

  /**
   * Enable/disable silent recovery
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[${new Date().toISOString()}] Silent Error Recovery: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  isEnabled() {
    return this.enabled;
  }
}

// Create global singleton instance
window.SilentErrorRecovery = window.SilentErrorRecovery || new SilentErrorRecovery();

// Expose stats to console for debugging
window.getSilentRecoveryStats = () => window.SilentErrorRecovery.getStats();

console.log('[Silent Error Recovery] Module loaded and ready');
