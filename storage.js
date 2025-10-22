// storage.js - localStorage Management System

class StorageManager {
    constructor() {
        this.KEYS = {
            API_KEYS: 'gemini_lab_api_keys',
            MEMORIES: 'gemini_lab_memories',
            TASKS: 'gemini_lab_tasks',
            GOALS: 'gemini_lab_goals',
            REASONING: 'gemini_lab_reasoning',
            CANVAS: 'gemini_lab_canvas',
            CODE_EXEC: 'gemini_lab_code_exec',
            CHAT_HISTORY: 'gemini_lab_chat_history',
            SELECTED_MODEL: 'gemini_lab_selected_model',
            KEY_STATUS: 'gemini_lab_key_status',
            DATA_VAULT: 'gemini_lab_data_vault'
        };
    }

    // Generic storage methods
    getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading from localStorage key "${key}":`, error);
            return defaultValue;
        }
    }

    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded');
            } else {
                console.error(`Error writing to localStorage key "${key}":`, error);
            }
            return false;
        }
    }

    removeItem(key) {
        localStorage.removeItem(key);
    }

    // API Keys
    getApiKeys() {
        return this.getItem(this.KEYS.API_KEYS, ['', '', '', '', '']);
    }

    saveApiKeys(keys) {
        return this.setItem(this.KEYS.API_KEYS, keys);
    }

    getKeyStatus() {
        return this.getItem(this.KEYS.KEY_STATUS, {
            currentIndex: 0,
            statuses: Array(5).fill().map(() => ({
                rateLimited: false,
                limitedAt: null,
                invalid: false,
                invalidMessage: '',
                usageCount: 0,
                lastUsedAt: null,
                cooldownMs: null,
                lastError: '',
                lastErrorAt: null,
                willRetry: true
            }))
        });
    }

    saveKeyStatus(status) {
        return this.setItem(this.KEYS.KEY_STATUS, status);
    }

    // Memories
    getMemories() {
        return this.getItem(this.KEYS.MEMORIES, []);
    }

    saveMemories(memories) {
        return this.setItem(this.KEYS.MEMORIES, memories);
    }

    addMemory(memory) {
        const memories = this.getMemories();
        const now = Date.now();
        const name = typeof memory.name === 'string' && memory.name.trim().length > 0
            ? memory.name.trim()
            : (typeof memory.summary === 'string' && memory.summary.trim().length > 0
                ? memory.summary.trim()
                : 'Untitled Memory');
        const description = typeof memory.description === 'string' ? memory.description.trim() : '';
        const content = typeof memory.content === 'string'
            ? memory.content
            : String(memory.content ?? '');
        const id = this.generateId('mem');
        const record = {
            id,
            name,
            description,
            content,
            summary: memory.summary ? memory.summary.trim() : name,
            createdAt: now,
            updatedAt: now,
            lastAccessed: now,
            accessCount: 0
        };
        memories.push(record);
        this.saveMemories(memories);
        return id;
    }

    getMemory(id) {
        const memories = this.getMemories();
        const memory = memories.find(m => m.id === id);
        if (memory) {
            memory.lastAccessed = Date.now();
            memory.accessCount++;
            this.saveMemories(memories);
        }
        return memory;
    }

    updateMemory(id, updates) {
        const memories = this.getMemories();
        const index = memories.findIndex(m => m.id === id);
        if (index !== -1) {
            const current = memories[index];
            const next = { ...current };
            if (typeof updates.name === 'string') {
                next.name = updates.name.trim();
                if (!updates.summary) {
                    next.summary = next.name;
                }
            }
            if (typeof updates.description === 'string') {
                next.description = updates.description.trim();
            }
            if (typeof updates.content !== 'undefined') {
                next.content = typeof updates.content === 'string'
                    ? updates.content
                    : String(updates.content ?? '');
            }
            if (typeof updates.summary === 'string') {
                next.summary = updates.summary.trim();
            }
            next.updatedAt = Date.now();
            memories[index] = next;
            this.saveMemories(memories);
            return true;
        }
        return false;
    }

    deleteMemory(id) {
        const memories = this.getMemories();
        const filtered = memories.filter(m => m.id !== id);
        this.saveMemories(filtered);
    }

    // Tasks
    getTasks() {
        return this.getItem(this.KEYS.TASKS, []);
    }

    saveTasks(tasks) {
        return this.setItem(this.KEYS.TASKS, tasks);
    }

    addTask(task) {
        const tasks = this.getTasks();
        const now = Date.now();
        const name = typeof task.name === 'string' && task.name.trim().length > 0
            ? task.name.trim()
            : (typeof task.description === 'string' && task.description.trim().length > 0
                ? task.description.trim()
                : 'Task');
        const description = typeof task.description === 'string' ? task.description.trim() : '';
        const content = typeof task.content === 'string'
            ? task.content
            : (typeof task.content === 'undefined' ? '' : String(task.content));
        const record = {
            id: this.generateId('task'),
            name,
            description,
            content,
            status: task.status || 'pending',
            notes: task.notes || '',
            createdBy: task.createdBy || 'model',
            createdAt: now,
            updatedAt: now
        };
        tasks.push(record);
        this.saveTasks(tasks);
        return record.id;
    }

    updateTask(id, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            const current = tasks[index];
            const next = { ...current };
            if (typeof updates.name === 'string') {
                next.name = updates.name.trim();
            }
            if (typeof updates.description === 'string') {
                next.description = updates.description.trim();
            }
            if (typeof updates.content !== 'undefined') {
                next.content = typeof updates.content === 'string'
                    ? updates.content
                    : (typeof updates.content === 'undefined' ? '' : String(updates.content));
            }
            if (typeof updates.status === 'string') {
                next.status = updates.status;
            }
            if (typeof updates.notes === 'string') {
                next.notes = updates.notes;
            }
            next.updatedAt = Date.now();
            tasks[index] = next;
            this.saveTasks(tasks);
            return true;
        }
        return false;
    }

    // Goals
    getGoals() {
        return this.getItem(this.KEYS.GOALS, []);
    }

    saveGoals(goals) {
        return this.setItem(this.KEYS.GOALS, goals);
    }

    addGoal(goal) {
        const goals = this.getGoals();
        const now = Date.now();
        const name = typeof goal.name === 'string' && goal.name.trim().length > 0
            ? goal.name.trim()
            : (typeof goal.content === 'string' && goal.content.trim().length > 0
                ? goal.content.trim().slice(0, 80)
                : 'Goal');
        const description = typeof goal.description === 'string' ? goal.description.trim() : '';
        const content = typeof goal.content === 'string'
            ? goal.content
            : String(goal.content ?? '');

        const record = {
            id: this.generateId('goal'),
            name,
            description,
            content,
            createdAt: now,
            updatedAt: now,
            modifiable: goal.modifiable ?? false,
            createdBy: goal.createdBy || 'model'
        };

        goals.push(record);
        this.saveGoals(goals);
        return record.id;
    }

    deleteGoal(id) {
        const goals = this.getGoals();
        const filtered = goals.filter(g => g.id !== id);
        this.saveGoals(filtered);
    }

    // Reasoning Chain
    getReasoning() {
        return this.getItem(this.KEYS.REASONING, []);
    }

    saveReasoning(reasoning) {
        return this.setItem(this.KEYS.REASONING, reasoning);
    }

    addReasoningStep(step) {
        const reasoning = this.getReasoning();
        const sequence = reasoning.length + 1;
        const now = Date.now();
        const name = typeof step.name === 'string' && step.name.trim().length > 0
            ? step.name.trim()
            : `Step ${sequence}`;
        const description = typeof step.description === 'string' ? step.description.trim() : '';
        const content = typeof step.content === 'string'
            ? step.content
            : String(step.content ?? '');
        const rawContent = typeof step.rawContent === 'string'
            ? step.rawContent
            : content;

        const record = {
            id: this.generateId('rsn'),
            name,
            description,
            content,
            rawContent,
            step: sequence,
            timestamp: now,
            toolsUsed: step.toolsUsed || [],
            toolResults: step.toolResults || [],
            role: step.role || 'model'
        };

        reasoning.push(record);
        this.saveReasoning(reasoning);
        return record.id;
    }

    // Canvas Outputs
    getCanvases() {
        return this.getItem(this.KEYS.CANVAS, []);
    }

    saveCanvases(canvases) {
        return this.setItem(this.KEYS.CANVAS, canvases);
    }

    addCanvas(canvas) {
        const canvases = this.getCanvases();
        canvas.id = this.generateId('canvas');
        canvas.createdAt = Date.now();
        canvases.push(canvas);
        this.saveCanvases(canvases);
        return canvas.id;
    }

    // Code Executions
    getCodeExecutions() {
        return this.getItem(this.KEYS.CODE_EXEC, []);
    }

    saveCodeExecutions(executions) {
        return this.setItem(this.KEYS.CODE_EXEC, executions);
    }

    addCodeExecution(execution) {
        const executions = this.getCodeExecutions();
        execution.id = this.generateId('exec');
        execution.executedAt = Date.now();
        executions.push(execution);
        this.saveCodeExecutions(executions);
        return execution.id;
    }

    // Chat History
    getChatHistory() {
        return this.getItem(this.KEYS.CHAT_HISTORY, []);
    }

    saveChatHistory(history) {
        return this.setItem(this.KEYS.CHAT_HISTORY, history);
    }

    addChatMessage(message) {
        const history = this.getChatHistory();
        history.push(message);
        this.saveChatHistory(history);
    }

    // Data Vault
    getDataVaultEntries() {
        return this.getItem(this.KEYS.DATA_VAULT, []);
    }

    saveDataVaultEntries(entries) {
        return this.setItem(this.KEYS.DATA_VAULT, entries);
    }

    addDataVaultEntry(entry) {
        const entries = this.getDataVaultEntries();
        const timestamp = Date.now();
        const finalized = {
            id: this.generateId('data'),
            createdAt: timestamp,
            updatedAt: timestamp,
            ...entry
        };
        entries.push(finalized);
        this.saveDataVaultEntries(entries);
        return finalized.id;
    }

    updateDataVaultEntry(id, updates) {
        const entries = this.getDataVaultEntries();
        const index = entries.findIndex(item => item.id === id);
        if (index === -1) {
            return false;
        }
        const updated = {
            ...entries[index],
            ...updates,
            updatedAt: Date.now()
        };
        entries[index] = updated;
        this.saveDataVaultEntries(entries);
        return true;
    }

    deleteDataVaultEntry(id) {
        const entries = this.getDataVaultEntries();
        const filtered = entries.filter(item => item.id !== id);
        this.saveDataVaultEntries(filtered);
    }

    clearDataVault() {
        this.removeItem(this.KEYS.DATA_VAULT);
    }

    // Selected Model
    getSelectedModel() {
        return this.getItem(this.KEYS.SELECTED_MODEL, 'gemini-2.0-flash-exp');
    }

    saveSelectedModel(model) {
        return this.setItem(this.KEYS.SELECTED_MODEL, model);
    }

    // Reset All (except API keys and model)
    resetAll() {
        this.removeItem(this.KEYS.MEMORIES);
        this.removeItem(this.KEYS.TASKS);
        this.removeItem(this.KEYS.GOALS);
        this.removeItem(this.KEYS.REASONING);
        this.removeItem(this.KEYS.CANVAS);
        this.removeItem(this.KEYS.CODE_EXEC);
        this.removeItem(this.KEYS.CHAT_HISTORY);
        this.removeItem(this.KEYS.KEY_STATUS);
        this.removeItem(this.KEYS.DATA_VAULT);
    }

    // Utility
    generateId(prefix) {
        const safePrefix = (prefix || 'id').toLowerCase();
        const maxAttempts = 100;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const token = this.generateToken(4);
            const id = `${safePrefix}-${token}`;
            if (!this.isIdTaken(id)) {
                return id;
            }
        }
        throw new Error(`Failed to generate unique id for prefix "${safePrefix}" after ${maxAttempts} attempts.`);
    }

    generateToken(length = 4) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let token = '';
        for (let i = 0; i < length; i++) {
            const index = Math.floor(Math.random() * alphabet.length);
            token += alphabet[index];
        }
        return token;
    }

    isIdTaken(id) {
        const pools = [
            this.getMemories(),
            this.getTasks(),
            this.getGoals(),
            this.getReasoning(),
            this.getCanvases(),
            this.getCodeExecutions(),
            this.getDataVaultEntries()
        ];

        return pools.some(collection => Array.isArray(collection) && collection.some(item => item?.id === id));
    }
}

export const storageManager = new StorageManager();
