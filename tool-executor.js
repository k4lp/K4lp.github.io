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
            const content = tag.content;
            const id = storageManager.addMemory({ name, description, summary, content });
            results.push({
                type: 'memory_create',
                tool: 'create_memory',
                id,
                name,
                description,
                summary
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

    async executeJavaScript(code) {
        const execId = storageManager.generateId('exec');
        const logs = [];
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
            const errorMsg = (error && error.message) ? error.message : String(error);
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
    
        // FIX: Vault ANY result that should be vaulted, even if not explicitly a vault token
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
        } else if (dataVault.shouldVault(result)) {
            // FIX: Always vault large results
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
            }
        } else if (typeof result !== 'undefined') {
            // FIX: Even small results should be checked for length
            const stringified = this.stringifyValue(result);
            if (stringified.length > 800) {
                const entry = dataVault.store(result, {
                    source: 'execute_js:result',
                    execId,
                    notes: 'Large return value from execute_js'
                });
                if (entry) {
                    meta.vaultReference = entry.reference;
                    meta.vaultId = entry.id;
                    meta.vaultPreview = entry.preview || null;
                    primaryText = `${entry.reference} (${entry.label || entry.type})`;
                } else {
                    primaryText = stringified;
                }
            } else {
                primaryText = stringified;
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
