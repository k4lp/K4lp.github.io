/**
 * SUBAGENT UI - LIVE REASONING DISPLAY
 *
 * Real-time visualization of autonomous subagent reasoning process.
 * Shows iterations, tool usage, thinking process, and convergence.
 *
 * FEATURES:
 * - Live iteration updates
 * - Tool execution visualization
 * - Reasoning trace display
 * - Progress indicators
 * - Collapsible iteration details
 * - Final result highlighting
 *
 * DESIGN:
 * - Clean, modern interface
 * - Color-coded states
 * - Smooth animations
 * - Mobile-responsive
 */

export class SubAgentUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container not found: ${containerId}`);
        }

        this.currentSessionElement = null;
        this.iterationElements = new Map();
        this.startTime = null;
    }

    /**
     * Initialize a new subagent session
     * @param {Object} config - Session configuration
     * @param {string} config.agentId - Agent identifier
     * @param {string} config.query - User query
     * @param {number} config.maxIterations - Maximum iterations
     */
    initSession(config) {
        this.startTime = Date.now();

        const sessionEl = document.createElement('div');
        sessionEl.className = 'subagent-session';
        sessionEl.innerHTML = `
            <div class="subagent-session-header">
                <div class="subagent-icon">🤖</div>
                <div class="subagent-info">
                    <div class="subagent-agent-id">${this._escapeHtml(config.agentId)}</div>
                    <div class="subagent-query">${this._escapeHtml(config.query)}</div>
                </div>
                <div class="subagent-status">
                    <div class="subagent-progress">
                        <span class="subagent-progress-text">Initializing...</span>
                        <div class="subagent-progress-bar">
                            <div class="subagent-progress-fill" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="subagent-iterations"></div>
            <div class="subagent-final-result" style="display: none;"></div>
        `;

        this.container.appendChild(sessionEl);
        this.currentSessionElement = sessionEl;

        return sessionEl;
    }

    /**
     * Update iteration display
     * @param {Object} iteration - Iteration data
     * @param {number} current - Current iteration number
     * @param {number} max - Maximum iterations
     */
    updateIteration(iteration, current, max) {
        if (!this.currentSessionElement) {
            console.warn('[SubAgentUI] No active session');
            return;
        }

        // Update progress
        const progress = (current / max) * 100;
        this._updateProgress(progress, current, max);

        // Add/update iteration display
        const iterationsContainer = this.currentSessionElement.querySelector('.subagent-iterations');

        let iterationEl = this.iterationElements.get(iteration.number);

        if (!iterationEl) {
            iterationEl = this._createIterationElement(iteration, current, max);
            iterationsContainer.appendChild(iterationEl);
            this.iterationElements.set(iteration.number, iterationEl);

            // Smooth scroll to new iteration
            setTimeout(() => {
                iterationEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        } else {
            this._updateIterationElement(iterationEl, iteration);
        }
    }

    /**
     * Show final result
     * @param {Object} result - Final result
     */
    showFinalResult(result) {
        if (!this.currentSessionElement) {
            console.warn('[SubAgentUI] No active session');
            return;
        }

        const duration = Date.now() - this.startTime;
        const durationText = this._formatDuration(duration);

        const finalResultEl = this.currentSessionElement.querySelector('.subagent-final-result');
        finalResultEl.style.display = 'block';
        finalResultEl.innerHTML = `
            <div class="subagent-final-header">
                <div class="subagent-final-icon">${result.success ? '✅' : '❌'}</div>
                <div class="subagent-final-title">
                    ${result.success ? 'Mission Accomplished' : 'Mission Incomplete'}
                </div>
                <div class="subagent-final-meta">
                    ${result.iterations} iteration${result.iterations !== 1 ? 's' : ''} • ${durationText}
                </div>
            </div>
            <div class="subagent-final-response">
                ${this._escapeHtml(result.finalResponse) || '<em>No response generated</em>'}
            </div>
        `;

        // Update progress to complete
        this._updateProgress(100, result.iterations, result.maxIterations, true);

        // Scroll to result
        setTimeout(() => {
            finalResultEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }

    /**
     * Show error
     * @param {Error} error - Error object
     */
    showError(error) {
        if (!this.currentSessionElement) {
            console.warn('[SubAgentUI] No active session');
            return;
        }

        const errorEl = document.createElement('div');
        errorEl.className = 'subagent-error';
        errorEl.innerHTML = `
            <div class="subagent-error-icon">⚠️</div>
            <div class="subagent-error-message">${this._escapeHtml(error.message)}</div>
        `;

        this.currentSessionElement.appendChild(errorEl);

        // Update progress to error state
        const progressText = this.currentSessionElement.querySelector('.subagent-progress-text');
        if (progressText) {
            progressText.textContent = 'Error occurred';
            progressText.style.color = '#e74c3c';
        }
    }

    /**
     * Clear UI
     */
    clear() {
        this.container.innerHTML = '';
        this.currentSessionElement = null;
        this.iterationElements.clear();
        this.startTime = null;
    }

    // ==========================================================================
    // PRIVATE METHODS
    // ==========================================================================

    /**
     * Create iteration element
     * @private
     */
    _createIterationElement(iteration, current, max) {
        const el = document.createElement('div');
        el.className = 'subagent-iteration';
        el.setAttribute('data-iteration', iteration.number);

        const statusIcon = iteration.converged ? '🎯' :
                          iteration.error ? '❌' :
                          '🔄';

        const statusText = iteration.converged ? 'Converged' :
                          iteration.error ? 'Error' :
                          'Processing';

        const hasTools = iteration.toolCalls && iteration.toolCalls.length > 0;

        el.innerHTML = `
            <div class="subagent-iteration-header">
                <div class="subagent-iteration-number">Iteration ${iteration.number}/${max}</div>
                <div class="subagent-iteration-status">
                    <span class="subagent-status-icon">${statusIcon}</span>
                    <span class="subagent-status-text">${statusText}</span>
                </div>
                <button class="subagent-iteration-toggle" aria-label="Toggle details">▼</button>
            </div>
            <div class="subagent-iteration-body">
                ${this._renderThinking(iteration.thinking)}
                ${hasTools ? this._renderTools(iteration.toolCalls, iteration.toolResults) : ''}
                ${iteration.error ? this._renderError(iteration.error) : ''}
            </div>
        `;

        // Add toggle functionality
        const toggle = el.querySelector('.subagent-iteration-toggle');
        const body = el.querySelector('.subagent-iteration-body');

        toggle.addEventListener('click', () => {
            const isCollapsed = body.style.display === 'none';
            body.style.display = isCollapsed ? 'block' : 'none';
            toggle.textContent = isCollapsed ? '▼' : '▶';
            toggle.setAttribute('aria-expanded', isCollapsed);
        });

        return el;
    }

    /**
     * Update iteration element
     * @private
     */
    _updateIterationElement(el, iteration) {
        // Update status
        const statusIcon = el.querySelector('.subagent-status-icon');
        const statusText = el.querySelector('.subagent-status-text');

        if (iteration.converged) {
            statusIcon.textContent = '🎯';
            statusText.textContent = 'Converged';
        } else if (iteration.error) {
            statusIcon.textContent = '❌';
            statusText.textContent = 'Error';
        }

        // Update body if needed
        const body = el.querySelector('.subagent-iteration-body');
        body.innerHTML = `
            ${this._renderThinking(iteration.thinking)}
            ${iteration.toolCalls ? this._renderTools(iteration.toolCalls, iteration.toolResults) : ''}
            ${iteration.error ? this._renderError(iteration.error) : ''}
        `;
    }

    /**
     * Render thinking section
     * @private
     */
    _renderThinking(thinking) {
        if (!thinking) return '';

        const truncated = thinking.length > 500 ? thinking.substring(0, 500) + '...' : thinking;

        return `
            <div class="subagent-thinking">
                <div class="subagent-section-title">💭 Reasoning</div>
                <div class="subagent-thinking-text">${this._escapeHtml(truncated)}</div>
                ${thinking.length > 500 ? '<button class="subagent-expand">Show full reasoning</button>' : ''}
            </div>
        `;
    }

    /**
     * Render tools section
     * @private
     */
    _renderTools(toolCalls, toolResults) {
        if (!toolCalls || toolCalls.length === 0) return '';

        const toolsHtml = toolCalls.map((call, index) => {
            const result = toolResults && toolResults[index];
            const statusIcon = result?.success ? '✅' : result?.success === false ? '❌' : '⏳';

            return `
                <div class="subagent-tool">
                    <div class="subagent-tool-header">
                        <span class="subagent-tool-icon">${statusIcon}</span>
                        <span class="subagent-tool-name">${this._escapeHtml(call.toolName)}</span>
                    </div>
                    <div class="subagent-tool-query">${this._escapeHtml(call.query)}</div>
                    ${result ? this._renderToolResult(result) : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="subagent-tools">
                <div class="subagent-section-title">🔧 Tools Used</div>
                ${toolsHtml}
            </div>
        `;
    }

    /**
     * Render tool result
     * @private
     */
    _renderToolResult(result) {
        if (!result.success) {
            return `<div class="subagent-tool-error">Error: ${this._escapeHtml(result.error)}</div>`;
        }

        const resultText = typeof result.result === 'object'
            ? JSON.stringify(result.result, null, 2)
            : String(result.result);

        const truncated = resultText.length > 200
            ? resultText.substring(0, 200) + '...'
            : resultText;

        return `<div class="subagent-tool-result">${this._escapeHtml(truncated)}</div>`;
    }

    /**
     * Render error section
     * @private
     */
    _renderError(error) {
        return `
            <div class="subagent-error-section">
                <div class="subagent-section-title">⚠️ Error</div>
                <div class="subagent-error-text">${this._escapeHtml(error.message)}</div>
            </div>
        `;
    }

    /**
     * Update progress indicator
     * @private
     */
    _updateProgress(percentage, current, max, complete = false) {
        if (!this.currentSessionElement) return;

        const progressFill = this.currentSessionElement.querySelector('.subagent-progress-fill');
        const progressText = this.currentSessionElement.querySelector('.subagent-progress-text');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            if (complete) {
                progressFill.style.backgroundColor = '#27ae60';
            }
        }

        if (progressText) {
            if (complete) {
                progressText.textContent = 'Complete';
            } else {
                progressText.textContent = `Processing... (${current}/${max})`;
            }
        }
    }

    /**
     * Format duration
     * @private
     */
    _formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default SubAgentUI;
