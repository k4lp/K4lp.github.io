// codeExecutor.js - Executes JavaScript code directly in browser with internet access

class CodeExecutor {
    constructor() {
        this.outputVariable = 'EXEC_OUTPUT';
        this.executionHistory = [];
        this.setupGlobalFunctions();
    }

    // Setup global functions available to executed code
    setupGlobalFunctions() {
        // Create a safe output function
        window.setOutput = (value) => {
            window[this.outputVariable] = value;
            console.log('[Code Execution Output]:', value);

            // Emit event for UI
            document.dispatchEvent(new CustomEvent('code-execution-output', {
                detail: { output: value }
            }));
        };

        // Create a console wrapper that captures output
        window.execConsole = {
            log: (...args) => {
                console.log('[Executed Code]:', ...args);
                const output = args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' ');

                document.dispatchEvent(new CustomEvent('code-execution-log', {
                    detail: { log: output }
                }));
            },
            error: (...args) => {
                console.error('[Executed Code Error]:', ...args);
                const output = args.map(arg => String(arg)).join(' ');

                document.dispatchEvent(new CustomEvent('code-execution-error', {
                    detail: { error: output }
                }));
            }
        };
    }

    // Execute JavaScript code
    async execute(code, timeout = 30000) {
        const executionId = this.generateExecutionId();
        const startTime = Date.now();

        // Clear previous output
        delete window[this.outputVariable];

        const executionRecord = {
            id: executionId,
            code: code,
            startTime: startTime,
            status: 'running',
            output: null,
            error: null,
            logs: []
        };

        this.executionHistory.push(executionRecord);

        try {
            // Emit execution start event
            document.dispatchEvent(new CustomEvent('code-execution-start', {
                detail: { id: executionId, code: code }
            }));

            // Wrap code in async function to support await
            const wrappedCode = `
                (async () => {
                    try {
                        ${code}
                    } catch (error) {
                        execConsole.error('Execution error:', error.message);
                        setOutput({ error: error.message, stack: error.stack });
                    }
                })();
            `;

            // Execute with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Execution timeout')), timeout);
            });

            const executionPromise = new Promise((resolve) => {
                try {
                    // Direct eval execution (no sandbox as per requirements)
                    eval(wrappedCode);

                    // Wait a bit for async operations
                    setTimeout(() => {
                        resolve(window[this.outputVariable]);
                    }, 100);
                } catch (error) {
                    resolve({ error: error.message, stack: error.stack });
                }
            });

            const result = await Promise.race([executionPromise, timeoutPromise]);

            // Update execution record
            executionRecord.status = 'completed';
            executionRecord.output = result;
            executionRecord.duration = Date.now() - startTime;

            // Emit completion event
            document.dispatchEvent(new CustomEvent('code-execution-complete', {
                detail: {
                    id: executionId,
                    output: result,
                    duration: executionRecord.duration
                }
            }));

            return this.formatOutput(result);

        } catch (error) {
            // Update execution record with error
            executionRecord.status = 'error';
            executionRecord.error = error.message;
            executionRecord.duration = Date.now() - startTime;

            // Emit error event
            document.dispatchEvent(new CustomEvent('code-execution-error', {
                detail: {
                    id: executionId,
                    error: error.message
                }
            }));

            return `Execution Error: ${error.message}`;
        }
    }

    // Format output for display
    formatOutput(output) {
        if (output === undefined || output === null) {
            return 'Code executed successfully. No output set.';
        }

        if (typeof output === 'object') {
            try {
                return JSON.stringify(output, null, 2);
            } catch (e) {
                return String(output);
            }
        }

        return String(output);
    }

    // Generate unique execution ID
    generateExecutionId() {
        return 'exec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get execution history
    getHistory() {
        return this.executionHistory;
    }

    // Get last execution
    getLastExecution() {
        return this.executionHistory[this.executionHistory.length - 1] || null;
    }

    // Clear history
    clearHistory() {
        this.executionHistory = [];
    }

    // Clear output
    clearOutput() {
        delete window[this.outputVariable];
    }

    // Check if code contains potentially dangerous operations
    checkCodeSafety(code) {
        const warnings = [];

        // Check for localStorage clear
        if (code.includes('localStorage.clear()')) {
            warnings.push('Code attempts to clear localStorage');
        }

        // Check for infinite loops (basic detection)
        if (/while\s*\(\s*true\s*\)/.test(code) && !code.includes('break')) {
            warnings.push('Potential infinite loop detected');
        }

        // Check for document.write (can break page)
        if (code.includes('document.write')) {
            warnings.push('Code uses document.write which may break the page');
        }

        return {
            safe: warnings.length === 0,
            warnings: warnings
        };
    }

    // Execute with safety check
    async executeWithSafetyCheck(code) {
        const safetyCheck = this.checkCodeSafety(code);

        if (!safetyCheck.safe) {
            const warningMessage = 'Safety warnings:\n' + safetyCheck.warnings.join('\n');
            console.warn(warningMessage);

            // Still execute but log warnings
            document.dispatchEvent(new CustomEvent('code-execution-warning', {
                detail: { warnings: safetyCheck.warnings }
            }));
        }

        return await this.execute(code);
    }

    // Create sandboxed iframe for safer execution (optional alternative)
    createSandboxedExecutor() {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.sandbox = 'allow-scripts';
        document.body.appendChild(iframe);
        return iframe;
    }
}

// Export
window.CodeExecutor = CodeExecutor;
