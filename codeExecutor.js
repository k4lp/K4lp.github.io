// JavaScript Code Execution Environment
class CodeExecutor {
    constructor() {
        this.executionHistory = [];
        this.variables = new Map();
    }

    async executeCode(code) {
        try {
            this.outputBuffer = [];

            const execution = {
                id: 'exec_' + Date.now(),
                code: code,
                timestamp: new Date(),
                status: 'executing'
            };

            this.executionHistory.push(execution);

            // No sandbox: Execute in global scope using eval
            const result = eval(code); // WARNING: Insecure, full browser access

            execution.status = 'success';
            execution.result = result;
            execution.output = this.outputBuffer.join('\n');

            this.displayResult(execution);

            dataManager.addMemory(
                `Code execution: ${code.substring(0, 50)}...`,
                `Code: ${code}\n\nOutput: ${execution.output}\n\nResult: ${result}`,
                'code_execution'
            );

            return execution;

        } catch (error) {
            const errorExecution = {
                id: 'exec_' + Date.now(),
                code: code,
                timestamp: new Date(),
                status: 'error',
                error: error.message,
                output: this.outputBuffer.join('\n')
            };

            this.executionHistory.push(errorExecution);
            this.displayResult(errorExecution);

            throw error;
        }
    }

    logOutput(type, args) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        this.outputBuffer.push(`[${type.toUpperCase()}] ${message}`);
    }

    displayResult(execution) {
        const codeOutput = document.getElementById('codeOutput');
        let resultHtml = '';

        if (execution.status === 'success') {
            resultHtml = `
                <div style="color: var(--success-color); font-weight: 500;">✓ Execution Successful</div>
                ${execution.output ? `<div>Output:\n${execution.output}</div>` : ''}
                ${execution.result !== undefined ? `<div>Result: ${JSON.stringify(execution.result, null, 2)}</div>` : ''}
            `;
        } else {
            resultHtml = `
                <div style="color: var(--error-color); font-weight: 500;">✗ Execution Error</div>
                <div>Error: ${execution.error}</div>
                ${execution.output ? `<div>Output:\n${execution.output}</div>` : ''}
            `;
        }

        codeOutput.innerHTML = resultHtml;
    }

    clearHistory() {
        this.executionHistory = [];
        document.getElementById('codeOutput').innerHTML = '';
    }
}

// Global instance
const codeExecutor = new CodeExecutor();
