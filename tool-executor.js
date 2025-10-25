// tool-executor.js - XML Tool Parser and Executor

import { storageManager } from './storage.js';
import { dataVault } from './data-vault.js';

class ToolExecutor {
    constructor() {
        this.executions = new Map(); // Store execution results by ID
        this.executionMeta = new Map();
    }

    async executeTools(text) {
        const results = [];

        // Parse all XML tool tags
        const memoryCreates = this.extractTags(text, 'create_memory');
        const memoryFetches = this.extractTags(text, 'fetch_memory');
        const memoryUpdates = this.extractTags(text, 'update_memory');
        const memoryDeletes = this.extractTags(text, 'delete_memory');

        const taskCreates = this.extractTags(text, 'create_task');
        const taskUpdates = this.extractTags(text, 'update_task');

        const goalCreates = this.extractTags(text, 'create_goal');

        const jsExecutions = this.extractTags(text, 'execute_js');
        const canvasOutputs = this.extractTags(text, 'canvas_html');
        const vaultReads = this.extractTags(text, 'vault_read');
        const vaultDeletes = this.extractTags(text, 'vault_delete');

        // Execute memory operations
        for (const tag of memoryCreates) {
            const name = (tag.attributes.name || tag.attributes.summary || 'Untitled memory').trim();
            const description = (tag.attributes.description || '').trim();
            const summary = (tag.attributes.summary || name).trim();
            let content = typeof tag.content === 'string' ? tag.content : (tag.content ?? '');
            if (typeof content !== 'string') {
                content = String(content);
            }

            let vaultReference = null;
            if (content && content.length > 500) {
                const entry = dataVault.store(content, {
                    source: 'memory',
                    label: `Memory content: ${summary}`,
                    tags: ['memory']
                });
                if (entry) {
                    vaultReference = entry.reference;
                    content = `Content stored in vault: ${vaultReference}`;
                }
            }

            const id = storageManager.addMemory({ name, description, summary, content });
            results.push({
                type: 'memory_create',
                tool: 'create_memory',
                id,
                name,
                description,
                summary,
                vaultReference
            });
        }

        for (const tag of memoryFetches) {
            const id = tag.attributes.id;
            const memory = storageManager.getMemory(id);
            results.push({ 
                type: 'memory_fetch',
                tool: 'fetch_memory',
                id, 
                found: !!memory, 
                name: memory ? memory.name : null,
                description: memory ? memory.description : null,
                content: memory ? memory.content : null,
                result: memory ? `Retrieved ${memory.name || memory.summary || memory.id}` : 'Memory not found'
            });
        }

        for (const tag of memoryUpdates) {
            const id = tag.attributes.id;
            const updates = {};
            if (typeof tag.attributes.name === 'string') {
                updates.name = tag.attributes.name;
            }
            if (typeof tag.attributes.description === 'string') {
                updates.description = tag.attributes.description;
            }
            if (typeof tag.attributes.summary === 'string') {
                updates.summary = tag.attributes.summary;
            }
            if (typeof tag.content === 'string') {
                updates.content = tag.content;
            }
            const success = storageManager.updateMemory(id, updates);
            results.push({
                type: 'memory_update',
                tool: 'update_memory',
                id,
                success,
                updates
            });
        }

        for (const tag of memoryDeletes) {
            const id = tag.attributes.id;
            storageManager.deleteMemory(id);
            results.push({ type: 'memory_delete', tool: 'delete_memory', id });
        }

        // Execute task operations
        for (const tag of taskCreates) {
            const name = (tag.attributes.name || '').trim();
            const descriptionAttr = (tag.attributes.description || '').trim();
            const content = typeof tag.content === 'string' ? tag.content : '';
            const statusAttr = (tag.attributes.status || '').trim().toLowerCase();
            const notes = (tag.attributes.notes || '').trim();
            const createdBy = (tag.attributes.created_by || 'model').trim();

            const normalizedStatus = ['pending', 'ongoing', 'complete', 'completed', 'done']
                .includes(statusAttr)
                ? (statusAttr === 'completed' ? 'complete' : statusAttr)
                : undefined;

            const payload = {
                name: name || descriptionAttr || content.split('\n')[0] || 'Task',
                description: descriptionAttr || name || content.split('\n')[0] || '',
                content,
                status: normalizedStatus || 'pending',
                notes,
                createdBy
            };

            const id = storageManager.addTask(payload);
            results.push({
                type: 'task_create',
                tool: 'create_task',
                id,
                name: payload.name,
                description: payload.description,
                content: payload.content,
                status: payload.status,
                notes: payload.notes
            });
        }

        for (const tag of taskUpdates) {
            const id = tag.attributes.id;

            // VALIDATION: Check if task exists before attempting update
            const tasks = storageManager.getTasks();
            const taskExists = tasks.some(t => t.id === id);

            if (!taskExists) {
                // Provide helpful error with available IDs
                const availableIds = tasks.map(t => ({
                    id: t.id,
                    desc: (t.description || t.name || '').slice(0, 40)
                })).slice(0, 10);

                results.push({
                    type: 'task_update',
                    tool: 'update_task',
                    id,
                    success: false,
                    error: 'TASK_NOT_FOUND',
                    availableIds: availableIds.map(t => `${t.id} (${t.desc})`),
                    suggestion: availableIds.length > 0
                        ? `Task ${id} does not exist. Check "CURRENT TASK IDs" section for valid IDs.`
                        : 'No tasks exist yet. Create one first with <create_task>.'
                });
                continue;
            }

            // Existing update logic
            const updates = {};
            if (typeof tag.attributes.name === 'string') {
                updates.name = tag.attributes.name;
            }
            if (typeof tag.attributes.description === 'string') {
                updates.description = tag.attributes.description;
            }
            if (typeof tag.attributes.content === 'string') {
                updates.content = tag.attributes.content;
            }
            if (typeof tag.attributes.status === 'string') {
                const status = tag.attributes.status.trim().toLowerCase();
                if (['pending', 'ongoing', 'complete', 'completed', 'done'].includes(status)) {
                    updates.status = status === 'completed' ? 'complete' : status;
                }
            }
            if (typeof tag.attributes.notes === 'string') {
                updates.notes = tag.attributes.notes;
            }
            if (typeof tag.content === 'string' && !updates.content) {
                updates.content = tag.content;
            }

            const success = storageManager.updateTask(id, updates);
            results.push({
                type: 'task_update',
                tool: 'update_task',
                id,
                success,
                updates
            });
        }

        // Execute goal operations
        for (const tag of goalCreates) {
            const name = (tag.attributes.name || '').trim();
            const description = (tag.attributes.description || '').trim();
            const content = typeof tag.content === 'string' ? tag.content : '';
            const id = storageManager.addGoal({
                name: name || content.split('\n')[0] || 'Goal',
                description,
                content,
                createdBy: 'model',
                modifiable: false
            });
            results.push({
                type: 'goal_create',
                tool: 'create_goal',
                id,
                name: name || content.split('\n')[0] || 'Goal',
                description,
                content
            });
        }

        // Execute JavaScript
        for (const tag of jsExecutions) {
            const code = tag.content;
            const result = await this.executeJavaScript(code);
            results.push({ type: 'js_execution', tool: 'execute_js', ...result });
        }

        // Create canvas outputs
        for (const tag of canvasOutputs) {
            const html = tag.content;
            const id = storageManager.addCanvas({ html, step: 0 });
            results.push({ type: 'canvas_create', tool: 'canvas_html', id });
        }

        for (const tag of vaultReads) {
            const rawId = tag.attributes.id || '';
            const id = dataVault.extractId(rawId) || rawId;
            const mode = (tag.attributes.mode || 'preview').toLowerCase() === 'full' ? 'full' : 'preview';
            const limit = Number.isFinite(Number(tag.attributes.limit))
                ? Math.max(0, Number(tag.attributes.limit))
                : undefined;

            let output = null;
            if (mode === 'full') {
                output = dataVault.getFull(id);
            } else {
                output = dataVault.getPreview(id, { limit });
            }

            results.push({
                type: 'vault_read',
                tool: 'vault_read',
                id,
                mode,
                limit,
                result: output,
                exists: output !== null
            });
        }

        for (const tag of vaultDeletes) {
            const rawId = tag.attributes.id || '';
            const id = dataVault.extractId(rawId) || rawId;
            const exists = !!dataVault.getEntry(id);
            if (exists) {
                dataVault.delete(id);
            }
            results.push({
                type: 'vault_delete',
                tool: 'vault_delete',
                id,
                deleted: exists
            });
        }

        return results;
    }

    extractTags(text, tagName) {
        const tags = [];

        // Match opening and closing tags
        const regex = new RegExp(`<${tagName}([^>]*)>([\\s\\S]*?)</${tagName}>`, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const attributesStr = match[1];
            const content = match[2].trim();
            const attributes = this.parseAttributes(attributesStr);
            tags.push({ tagName, attributes, content });
        }

        // Match self-closing tags
        const selfClosingRegex = new RegExp(`<${tagName}([^>]*?)\\s*/>`, 'g');
        while ((match = selfClosingRegex.exec(text)) !== null) {
            const attributesStr = match[1];
            const attributes = this.parseAttributes(attributesStr);
            if (Object.keys(attributes).length > 0) {
                tags.push({ tagName, attributes, content: '' });
            }
        }

        return tags;
    }

    parseAttributes(attrStr) {
        const attributes = {};
        const regex = /(\w+)\s*=\s*["']([^"']*)["']/g;
        let match;

        while ((match = regex.exec(attrStr)) !== null) {
            attributes[match[1]] = match[2];
        }

        return attributes;
    }

    validateLabApiUsage(code) {
        // Scan for Lab.read() being used with object methods
        const problematicPatterns = [
            {
                pattern: /Lab\.read\([^)]+\)\s*\.\s*(filter|map|find|reduce|forEach|some|every|includes|push|pop|shift|unshift|splice|sort|reverse)/g,
                message: 'Detected Lab.read() used with array methods. Lab.read() returns a STRING. Use Lab.value() to get the actual array/object.'
            },
            {
                pattern: /Lab\.read\([^)]+\)\s*\[\s*\d+\s*\]/g,
                message: 'Detected Lab.read() with array indexing []. Lab.read() returns a STRING. Use Lab.value() to access array elements.'
            },
            {
                pattern: /Lab\.read\([^)]+\)\s*\.\s*length/g,
                message: 'Detected Lab.read().length for counting. Lab.read() returns STRING length, not array length. Use Lab.value() for actual data.'
            },
            {
                pattern: /await\s+Lab\.(read|value|store|info|list|drop)/g,
                message: 'Detected "await" with Lab API. Lab helpers are SYNCHRONOUS - never use await with them.'
            },
            {
                pattern: /Lab\.value\([^)]+\)\s*\.\s*then\(/g,
                message: 'Detected .then() with Lab.value(). Lab helpers return values immediately, not Promises.'
            }
        ];

        const warnings = [];
        problematicPatterns.forEach(({ pattern, message }) => {
            if (pattern.test(code)) {
                warnings.push(message);
            }
        });

        return warnings;
    }

    /**
     * Executes JavaScript code in the browser context with Lab API access.
     * 
     * Lab API available inside execute_js:
     * - Lab.value(id)  → Returns actual JavaScript object (USE THIS for data manipulation)
     * - Lab.read(id)   → Returns string preview (for display only, NOT for .filter/.map)
     * - Lab.store(val) → Saves data and returns [[vault:id]] token
     * - Lab.info(id)   → Returns metadata about stored item
     * - Lab.list()     → Lists all vault entries
     * - Lab.drop(id)   → Deletes vault entry
     * 
     * CRITICAL: All Lab helpers are SYNCHRONOUS - never use await
     * 
     * Common mistake: Using Lab.read() result with .filter() or .map()
     * Fix: Use Lab.value() instead when you need the actual object/array
     * 
     * Example:
     *   WRONG: const data = Lab.read('data-XYZ'); data.filter(x => x.age > 18);
     *   RIGHT: const data = Lab.value('data-XYZ'); data.filter(x => x.age > 18);
     */
    async executeJavaScript(code) {
        const execId = storageManager.generateId('exec');
        const logs = [];
        // VALIDATION: Check for common Lab API misuse
        const warnings = this.validateLabApiUsage(code);
        if (warnings.length > 0) {
            logs.push('⚠️  POTENTIAL ISSUES DETECTED IN YOUR CODE:');
            logs.push('');
            warnings.forEach((w, idx) => {
                logs.push(`${idx + 1}. ${w}`);
            });
            logs.push('');
            logs.push('The code will still execute, but may fail. Review the warnings above.');
            logs.push('═══════════════════════════════════════════════════════════════');
            logs.push('');
        }
        const originalLog = console.log;
        const originalError = console.error;
        const runtime = dataVault.createRuntimeApi({ source: 'execute_js', execId });
        const globalsSnapshot = this.injectRuntimeGlobals(runtime);

        try {
            console.log = (...args) => {
                const formatted = args.map(arg => this.formatRuntimeValue(arg, execId)).join(' ');
                logs.push(formatted);
                originalLog.apply(console, args);
            };

            console.error = (...args) => {
                const formatted = args.map(arg => this.formatRuntimeValue(arg, execId)).join(' ');
                logs.push('ERROR: ' + formatted);
                originalError.apply(console, args);
            };

            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction('Lab', 'LabData', 'LabVault', code);
            const result = await fn(runtime, runtime, runtime);

            const processed = this.prepareExecutionResult({
                result,
                logs,
                execId
            });

            this.executions.set(execId, processed.outputForReference);
            this.executionMeta.set(execId, processed.meta);

            storageManager.addCodeExecution({
                code,
                output: processed.outputForStorage,
                logs,
                status: 'success',
                step: 0,
                vaultReference: processed.meta.vaultReference || null,
                vaultId: processed.meta.vaultId || null,
                vaultPreview: processed.meta.vaultPreview || null,
                resultType: processed.meta.resultType || null,
                error: null
            });

            return {
                id: execId,
                code,
                output: processed.outputForStorage,
                error: null,
                result: processed.outputForReference,
                status: 'success',
                logs,
                vaultId: processed.meta.vaultId || null,
                vaultReference: processed.meta.vaultReference || null,
                vaultPreview: processed.meta.vaultPreview || null
            };

        } catch (error) {
            let errorMsg = (error && error.message) ? error.message : String(error);

            // Enhanced error messages for common Lab API mistakes
            if (errorMsg.includes('Cannot read properties of null') ||
                errorMsg.includes('Cannot read property') ||
                errorMsg.includes('is not a function') ||
                errorMsg.includes('is not iterable')) {

                // Check if code uses Lab.read with object methods
                if (/Lab\.read\([^)]+\)\s*\./.test(code)) {
                    errorMsg += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
                    errorMsg += '\n💡 DIAGNOSIS: You used Lab.read() with object/array methods.';
                    errorMsg += '\n';
                    errorMsg += '\nPROBLEM:';
                    errorMsg += '\n   Lab.read() returns a STRING preview of the data.';
                    errorMsg += '\n   You cannot call .filter(), .map(), .find(), etc. on strings.';
                    errorMsg += '\n';
                    errorMsg += '\nSOLUTION:';
                    errorMsg += '\n   Use Lab.value() instead to get the actual JavaScript object.';
                    errorMsg += '\n';
                    errorMsg += '\nEXAMPLE:';
                    errorMsg += '\n   ❌ WRONG:  let data = Lab.read("data-XYZ"); data.filter(...)';
                    errorMsg += '\n   ✓ CORRECT: let data = Lab.value("data-XYZ"); data.filter(...)';
                    errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
                }

                // Check for other Lab API misuse
                if (/Lab\.read/.test(code) && !(/Lab\.read\([^)]+\)\s*\./.test(code))) {
                    errorMsg += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
                    errorMsg += '\n💡 TIP: You used Lab.read() in your code.';
                    errorMsg += '\n   - Lab.read(id) returns a STRING (for display/preview)';
                    errorMsg += '\n   - Lab.value(id) returns the actual OBJECT/ARRAY (for processing)';
                    errorMsg += '\n';
                    errorMsg += '\n   If you need to manipulate data, use Lab.value() instead.';
                    errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
                }
            }

            // Check for await misuse
            if (errorMsg.includes('await') || /await\s+Lab\./.test(code)) {
                errorMsg += '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
                errorMsg += '\n💡 TIP: Lab API helpers are SYNCHRONOUS.';
                errorMsg += '\n   Never use "await" with Lab.read(), Lab.value(), Lab.store(), etc.';
                errorMsg += '\n';
                errorMsg += '\n   ❌ WRONG:  const data = await Lab.value("data-XYZ");';
                errorMsg += '\n   ✓ CORRECT: const data = Lab.value("data-XYZ");';
                errorMsg += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
            }

            const formattedError = `Error: ${errorMsg}`;

            this.executions.set(execId, formattedError);
            this.executionMeta.set(execId, { error: errorMsg, resultType: 'error' });

            storageManager.addCodeExecution({
                code,
                output: formattedError,
                error: errorMsg,
                logs,
                status: 'error',
                step: 0
            });

            return {
                id: execId,
                code,
                output: null,
                error: errorMsg,
                result: formattedError,
                status: 'error',
                logs
            };
        } finally {
            console.log = originalLog;
            console.error = originalError;
            this.restoreRuntimeGlobals(globalsSnapshot);
        }
    }

    injectRuntimeGlobals(runtime) {
        const target = typeof globalThis !== 'undefined'
            ? globalThis
            : (typeof window !== 'undefined' ? window : {});

        const snapshot = {
            target,
            Lab: target.Lab,
            LabData: target.LabData,
            LabVault: target.LabVault,
            __LAB_VAULT__: target.__LAB_VAULT__
        };

        target.Lab = runtime;
        target.LabData = runtime;
        target.LabVault = runtime;
        target.__LAB_VAULT__ = runtime;

        return snapshot;
    }

    restoreRuntimeGlobals(snapshot) {
        if (!snapshot || !snapshot.target) return;
        const { target } = snapshot;
        target.Lab = snapshot.Lab;
        target.LabData = snapshot.LabData;
        target.LabVault = snapshot.LabVault;
        target.__LAB_VAULT__ = snapshot.__LAB_VAULT__;
    }

    formatRuntimeValue(value, execId) {
        if (typeof value === 'string' && dataVault.isReferenceToken(value)) {
            const entry = dataVault.getEntryByReference(value);
            if (entry) {
                return `${entry.reference} (${entry.label || entry.type || 'Stored data'})`;
            }
            return value;
        }

        if (dataVault.shouldVault(value)) {
            const entry = dataVault.store(value, {
                source: 'console.log',
                execId,
                notes: 'Captured from console output'
            });
            if (entry) {
                return `${entry.reference} (${entry.label || entry.type || 'Stored data'})`;
            }
            return '[Stored data]';
        }

        return this.stringifyValue(value);
    }

    prepareExecutionResult({ result, logs, execId }) {
        const meta = {
            resultType: this.describeValueType(result),
            logsCount: logs.length,
            vaultReference: null,
            vaultId: null,
            vaultPreview: null
        };

        let primaryText = '';
        let logsSection = logs;

        if (typeof result === 'string' && dataVault.isReferenceToken(result)) {
            const entry = dataVault.getEntryByReference(result);
            if (entry) {
                meta.vaultReference = entry.reference;
                meta.vaultId = entry.id;
                meta.vaultPreview = entry.preview || null;
                primaryText = `${entry.reference} (${entry.label || entry.type || 'Stored data'})`;
            } else {
                primaryText = result;
            }
        } else if (typeof result !== 'undefined') {
            const shouldVaultResult = dataVault.shouldVault(result);
            const stringified = shouldVaultResult ? null : this.stringifyValue(result);
            const needsVault = shouldVaultResult || (stringified && stringified.length > 800);

            if (needsVault) {
                const entry = dataVault.store(result, {
                    source: 'execute_js:result',
                    execId,
                    notes: 'Return value from execute_js'
                });
                if (entry) {
                    meta.vaultReference = entry.reference;
                    meta.vaultId = entry.id;
                    meta.vaultPreview = entry.preview || null;
                    primaryText = `${entry.reference} (${entry.label || entry.type || 'Stored data'})`;
                } else {
                    const fallback = stringified ?? this.stringifyValue(result);
                    primaryText = fallback;
                }
            } else {
                primaryText = stringified ?? '';
            }
        }

        if (!primaryText) {
            if (logs.length > 0) {
                primaryText = logs.join('\n');
                logsSection = [];
            } else {
                primaryText = 'Success';
            }
        }

        const sections = [primaryText];

        if (logsSection.length > 0) {
            sections.push(`Logs:\n${logsSection.join('\n')}`);
        }

        const output = sections.join('\n\n').trim();

        return {
            outputForStorage: output || 'Success',
            outputForReference: output || 'Success',
            meta
        };
    }
    stringifyValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        const type = typeof value;
        switch (type) {
            case 'string': {
                const limit = 400;
                return value.length > limit ? `${value.slice(0, limit)}…` : value;
            }
            case 'number':
            case 'boolean':
            case 'bigint':
                return String(value);
            case 'symbol':
                return value.toString();
            case 'function':
                return `[Function ${value.name || 'anonymous'}]`;
            case 'object': {
                try {
                    return JSON.stringify(value);
                } catch (error) {
                    try {
                        return String(value);
                    } catch {
                        return '[Object]';
                    }
                }
            }
            default:
                return String(value);
        }
    }

    describeValueType(value) {
        return dataVault.detectType(value);
    }

    getExecutionMeta(execId) {
        return this.executionMeta.get(execId) || null;
    }

    replaceVariables(text) {
        // Replace {{EXECUTION_ID}} or {{exec_123}} with actual execution results
        return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            // Check if it's an execution reference
            if (varName.startsWith('exec_') || varName === 'EXECUTION_ID') {
                const execResult = this.executions.get(varName);
                if (execResult) {
                    return execResult;
                }

                // Try to find by ID in storage
                const executions = storageManager.getCodeExecutions();
                const exec = executions.find(e => e.id === varName);
                if (exec) {
                    return exec.output || '';
                }
            }

            if (varName.toLowerCase().startsWith('vault:')) {
                const identifier = varName.slice(6);
                const entry = dataVault.getEntry(identifier) || dataVault.getEntryByReference(`[[vault:${identifier}]]`);
                if (entry) {
                    return entry.preview || `[vault ${entry.id}]`;
                }
            }
            return match;
        });
    }

    checkForFinalOutput(text) {
        const regex = /<final_output>([\s\S]*?)<\/final_output>/;
        const match = text.match(regex);
        if (match) {
            return this.replaceVariables(match[1].trim());
        }
        return null;
    }

    checkForContinueReasoning(text) {
        return /<continue_reasoning>/.test(text);
    }
}

export const toolExecutor = new ToolExecutor();
