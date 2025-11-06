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

import { Storage } from '../../storage/storage.js';
import { apiAccessTracker } from '../../execution/apis/api-access-tracker.js';

export class SilentErrorRecovery {
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
   * Build retry prompt - includes previous reasoning, failed code, and error
   * USER REQUIREMENT: Send ALL data (code, reasoning, error) and ask model to REWRITE reasoning block
   * IMPORTANT: Appears natural - no mention of "fixing error"
   *
   * @param {string} originalPrompt - The original prompt from this iteration
   * @param {Array} previousReasoningSteps - Reasoning steps from iterations 0 to N-1
   * @param {Object} references - Available entity references
   * @param {Object} errorDetails - Error details (optional, for code execution errors)
   * @returns {string} Enhanced prompt for retry
   */
  buildRetryPrompt(originalPrompt, previousReasoningSteps, references, errorDetails = null) {
    // Build the entity reference section
    const entitySection = this.buildEntityReferenceSection(references);

    let retryPrompt = originalPrompt;

    // USER REQUIREMENT: If there's a code execution error, include it naturally
    if (errorDetails && errorDetails.category && (errorDetails.category === 'syntax' || errorDetails.category === 'runtime')) {
      // Extract the failed code and error information
      const failedCode = errorDetails.code || '';
      const errorMessage = errorDetails.error?.message || '';
      const errorStack = errorDetails.error?.stack || '';

      // Create a natural-sounding section that includes the error context
      // WITHOUT explicitly saying "fix this error"
      const errorContextSection = `## Previous Attempt Context

You started working on this step and explored the following approach:

**Code Explored:**
\`\`\`javascript
${failedCode}
\`\`\`

**Observation:**
${errorMessage}

${errorStack ? `**Technical Details:**\n${errorStack.split('\n').slice(0, 3).join('\n')}` : ''}

Please reconsider this step more carefully and provide a complete, well-reasoned analysis with corrected implementation.`;

      // Insert this section at the end, before any existing query/iteration info
      retryPrompt = retryPrompt + '\n\n' + errorContextSection;
    }

    // Find natural insertion point for entity references
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
      retryPrompt = '## Entity Reference Index\n\n' + entitySection + '\n\n' + retryPrompt;
    }

    // Add previous reasoning steps if available
    if (previousReasoningSteps && previousReasoningSteps.length > 0) {
      const reasoningSection = this.buildPreviousReasoningSection(previousReasoningSteps);
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

    // Handle different error structures (operation-level vs code execution)
    if (errorDetails.errors && Array.isArray(errorDetails.errors)) {
      // Operation-level errors
      console.log('Missing References:', errorDetails.errors.map(e => e.missingId));
    } else if (errorDetails.failedAccesses && Array.isArray(errorDetails.failedAccesses)) {
      // Code execution errors
      console.log('Failed Accesses:', errorDetails.failedAccesses.map(a => `${a.entityType}.${a.id}`));
    }

    try {
      // Collect available entity references
      const references = this.collectAvailableReferences();
      console.log('Available References:', {
        memory: references.memory.length,
        tasks: references.tasks.length,
        goals: references.goals.length,
        vault: references.vault.length
      });

      // Build retry prompt (pass errorDetails for code execution errors)
      const retryPrompt = this.buildRetryPrompt(originalPrompt, previousReasoningSteps, references, errorDetails);
      console.log('Retry Prompt Length:', retryPrompt.length);
      console.log('Added Entity References Section: Yes');
      console.log('Added Previous Reasoning Steps:', previousReasoningSteps ? previousReasoningSteps.length : 0);
      console.log('Added Error Context:', errorDetails && errorDetails.category ? 'Yes (' + errorDetails.category + ')' : 'No');

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

  /**
   * Detect if code execution failed due to reference errors
   * Uses the ApiAccessTracker to check for failed entity accesses
   *
   * @param {Object} executionResult - Result from code execution
   * @returns {Object|null} Error details or null if no reference errors
   */
  detectCodeExecutionReferenceErrors(executionResult) {
    // IMPORTANT: Only detect errors if execution actually failed
    // Don't trigger recovery just because code accessed non-existent entities
    // (it might have handled nulls gracefully)
    if (!executionResult || executionResult.success) {
      return null; // No error or execution succeeded (even if it accessed missing entities)
    }

    // Get access tracking data
    if (!apiAccessTracker) {
      return null; // Tracker not available
    }

    const errorReport = apiAccessTracker.getErrorReport();

    // If there were failed accesses, this is a reference error
    if (errorReport && errorReport.hasErrors) {
      console.log(
        `[${new Date().toISOString()}] Code execution reference errors detected:`,
        errorReport.failedAccesses
      );

      return {
        hasErrors: true,
        type: 'code_execution',
        executionResult: executionResult,
        failedAccesses: errorReport.failedAccesses,
        attemptedIds: errorReport.attemptedIds,
        timestamp: new Date().toISOString()
      };
    }

    // Also check if the error message itself indicates a reference error
    if (executionResult.error) {
      const errorMessage = executionResult.error.message || String(executionResult.error);

      // Check for common patterns indicating entity access issues
      const codeReferencePatterns = [
        /Cannot read propert(y|ies) .* of null/i,
        /Cannot read propert(y|ies) .* of undefined/i,
        /null is not an object/i,
        /undefined is not an object/i,
        /\.get\(\) returned null/i,
        /entity not found/i,
        /identifier .* does not exist/i
      ];

      const isCodeReferenceError = codeReferencePatterns.some(pattern =>
        pattern.test(errorMessage)
      );

      if (isCodeReferenceError) {
        console.log(
          `[${new Date().toISOString()}] Code execution error appears to be reference-related:`,
          errorMessage
        );

        return {
          hasErrors: true,
          type: 'code_execution',
          executionResult: executionResult,
          failedAccesses: [],
          attemptedIds: apiAccessTracker ? apiAccessTracker.getAttemptedIds() : {},
          errorMessage: errorMessage,
          timestamp: new Date().toISOString()
        };
      }
    }

    return null; // Not a reference error
  }

  /**
   * Detect RUNTIME and SYNTAX errors in code execution
   * ONLY handles these two error types as requested by user
   *
   * @param {Object} executionResult - Result from code execution
   * @returns {Object|null} Error details or null if no errors
   */
  detectCodeExecutionError(executionResult) {
    // If execution succeeded, no error to handle
    if (!executionResult || executionResult.success) {
      return null;
    }

    // If there's an error, check if it's syntax or runtime
    if (executionResult.error) {
      const error = executionResult.error;
      const errorMessage = error.message || String(error);
      const errorType = error.name || 'Error';

      // Categorize error type
      let category = null;
      let shouldRecover = false;

      // SYNTAX ERRORS
      if (errorType === 'SyntaxError' || errorMessage.match(/syntax/i)) {
        category = 'syntax';
        shouldRecover = true;
      }
      // RUNTIME ERRORS (generic runtime issues, not type/reference)
      else if (errorType === 'Error' ||
               errorMessage.match(/runtime/i) ||
               errorMessage.match(/unexpected/i) ||
               errorMessage.match(/invalid/i)) {
        category = 'runtime';
        shouldRecover = true;
      }

      // ONLY recover syntax and runtime errors
      if (!shouldRecover) {
        console.log(
          `[${new Date().toISOString()}] Code execution error detected but NOT handling (not syntax/runtime):`,
          `Type: ${errorType}, Message: ${errorMessage}`
        );
        return null; // Don't handle this error type
      }

      console.log(
        `[${new Date().toISOString()}] Code execution ${category} error detected - will attempt recovery:`,
        `Message: ${errorMessage}`
      );

      // Get attempted entity accesses if available
        const attemptedIds = apiAccessTracker ? apiAccessTracker.getAttemptedIds() : {};
        const failedAccesses = apiAccessTracker ? apiAccessTracker.getErrorReport()?.failedAccesses || [] : [];

      return {
        hasErrors: true,
        type: 'code_execution',
        category: category,
        executionResult: executionResult,
        error: {
          name: errorType,
          message: errorMessage,
          stack: error.stack || ''
        },
        code: executionResult.code || executionResult.resolvedCode || '',
        attemptedIds: attemptedIds,
        failedAccesses: failedAccesses,
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }
}

export const silentErrorRecovery = new SilentErrorRecovery();

if (typeof window !== 'undefined') {
  window.SilentErrorRecovery = silentErrorRecovery;
  window.getSilentRecoveryStats = () => silentErrorRecovery.getStats();
}

console.log('[Silent Error Recovery] Module loaded and ready');
