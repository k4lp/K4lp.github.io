// JavaScript Code Execution Environment
class CodeExecutor {
    constructor() {
        this.executionHistory = [];
        this.variables = new Map();
        this.allowedAPIs = [
            'console',
            'Math',
            'Date',
            'JSON',
            'Array',
            'Object',
            'String',
            'Number',
            'Boolean',
            'fetch',
            'setTimeout',
            'setInterval',
            'clearTimeout',
            'clearInterval'
        ];
        this.setupSecureEnvironment();
    }

    setupSecureEnvironment() {
        // Create a secure execution context
        this.context = {
            console: {
                log: (...args) => this.logOutput('log', args),
                error: (...args) => this.logOutput('error', args),
                warn: (...args) => this.logOutput('warn', args),
                info: (...args) => this.logOutput('info', args)
            },
            Math: Math,
            Date: Date,
            JSON: JSON,
            Array: Array,
            Object: Object,
            String: String,
            Number: Number,
            Boolean: Boolean,
            fetch: fetch.bind(window),
            setTimeout: setTimeout.bind(window),
            setInterval: setInterval.bind(window),
            clearTimeout: clearTimeout.bind(window),
            clearInterval: clearInterval.bind(window),

            // Custom utilities
            store: (key, value) => this.storeVariable(key, value),
            retrieve: (key) => this.retrieveVariable(key),
            clearStore: () => this.clearVariables(),

            // Network utilities with CORS proxy
            httpGet: async (url) => this.httpGet(url),
            httpPost: async (url, data) => this.httpPost(url, data),

            // Data processing utilities
            processJSON: (data) => this.processJSON(data),
            parseCSV: (csvText) => this.parseCSV(csvText),

            // Output utilities
            displayHTML: (html) => this.displayHTML(html),
            createChart: (data, type) => this.createChart(data, type)
        };

        this.outputBuffer = [];
    }

    async executeCode(code) {
        try {
            this.outputBuffer = [];

            // Add execution to history
            const execution = {
                id: 'exec_' + Date.now(),
                code: code,
                timestamp: new Date(),
                status: 'executing'
            };

            this.executionHistory.push(execution);

            // Create a function with the code and execute it in the secure context
            const wrappedCode = `
                (function() {
                    ${code}
                })()
            `;

            // Use Function constructor for safer evaluation than eval
            const func = new Function(
                ...Object.keys(this.context),
                `return ${wrappedCode}`
            );

            const result = await func(...Object.values(this.context));

            execution.status = 'success';
            execution.result = result;
            execution.output = this.outputBuffer.join('\n');

            this.displayResult(execution);

            // Store successful execution in memory
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

    storeVariable(key, value) {
        this.variables.set(key, {
            value: value,
            timestamp: new Date(),
            type: typeof value
        });
        return value;
    }

    retrieveVariable(key) {
        const stored = this.variables.get(key);
        return stored ? stored.value : undefined;
    }

    clearVariables() {
        this.variables.clear();
        return 'Variables cleared';
    }

    // Network utilities with CORS handling
    async httpGet(url) {
        try {
            // Use a CORS proxy for external requests
            const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
            const response = await fetch(proxyUrl);
            const data = await response.json();
            return JSON.parse(data.contents);
        } catch (error) {
            console.error('HTTP GET error:', error);
            throw error;
        }
    }

    async httpPost(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('HTTP POST error:', error);
            throw error;
        }
    }

    // Data processing utilities
    processJSON(data) {
        if (typeof data === 'string') {
            return JSON.parse(data);
        }
        return data;
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
            const values = line.split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            return row;
        });
        return { headers, rows };
    }

    // Display utilities
    displayHTML(html) {
        const htmlOutput = document.getElementById('htmlOutput');
        if (htmlOutput) {
            htmlOutput.innerHTML = html;
            document.getElementById('canvasSection').classList.remove('hidden');
        }
        return 'HTML displayed in canvas area';
    }

    createChart(data, type = 'bar') {
        // Simple chart creation using HTML/CSS
        const chartHtml = this.generateSimpleChart(data, type);
        return this.displayHTML(chartHtml);
    }

    generateSimpleChart(data, type) {
        if (!Array.isArray(data) || data.length === 0) {
            return '<p>Invalid chart data</p>';
        }

        const maxValue = Math.max(...data.map(d => d.value || 0));

        if (type === 'bar') {
            return `
                <div style="font-family: var(--font-family); padding: 20px;">
                    <h4>Chart Visualization</h4>
                    <div style="display: flex; align-items: end; gap: 10px; height: 200px;">
                        ${data.map(item => `
                            <div style="display: flex; flex-direction: column; align-items: center;">
                                <div style="
                                    width: 40px; 
                                    height: ${(item.value / maxValue) * 150}px;
                                    background: var(--accent-color);
                                    margin-bottom: 5px;
                                "></div>
                                <span style="font-size: 12px; transform: rotate(-45deg);">
                                    ${item.label || item.name}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        return '<p>Chart type not supported</p>';
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

    // Get execution history and statistics
    getExecutionStats() {
        const successCount = this.executionHistory.filter(e => e.status === 'success').length;
        const errorCount = this.executionHistory.filter(e => e.status === 'error').length;

        return {
            totalExecutions: this.executionHistory.length,
            successCount,
            errorCount,
            successRate: this.executionHistory.length ? (successCount / this.executionHistory.length) * 100 : 0,
            storedVariables: this.variables.size,
            recentExecutions: this.executionHistory.slice(-5)
        };
    }

    // Clear execution history
    clearHistory() {
        this.executionHistory = [];
        this.clearVariables();
        document.getElementById('codeOutput').innerHTML = '';
    }
}

// Global instance
const codeExecutor = new CodeExecutor();