// dataStructures.js - Manages data structures for Memory, Reasoning Chain, Goals, and Checkpoints

class DataStructures {
    constructor(storageManager) {
        this.storage = storageManager;
        this.memory = [];
        this.immediateReasoningChain = [];
        this.goals = [];
        this.checkpoints = [];
        this.currentSessionId = this.generateSessionId();
        this.init();
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize or load from storage
    init() {
        const savedData = this.storage.get(CONFIG.STORAGE_KEYS.SESSION_DATA);
        if (savedData) {
            this.memory = savedData.memory || [];
            this.goals = savedData.goals || [];
            this.checkpoints = savedData.checkpoints || [];
            this.currentSessionId = savedData.sessionId || this.currentSessionId;
        }
        this.save();
    }

    // Save all data to storage
    save() {
        this.storage.set(CONFIG.STORAGE_KEYS.SESSION_DATA, {
            sessionId: this.currentSessionId,
            memory: this.memory,
            goals: this.goals,
            checkpoints: this.checkpoints,
            timestamp: Date.now()
        });
    }

    // ===== MEMORY OPERATIONS =====

    // Add memory item
    addMemory(summary, details) {
        const index = this.memory.length;
        const memoryItem = {
            index: index,
            summary: summary,
            details: details,
            timestamp: Date.now(),
            accessCount: 0
        };
        this.memory.push(memoryItem);
        this.save();
        this.updateUI();
        return index;
    }

    // Get memory by index
    getMemory(index) {
        const mem = this.memory.find(m => m.index === parseInt(index));
        if (mem) {
            mem.accessCount++;
            this.save();
        }
        return mem;
    }

    // Get all memory summaries for prompt
    getMemorySummaries() {
        if (this.memory.length === 0) return '';
        return this.memory.map(m => `[${m.index}] ${m.summary}`).join('\n');
    }

    // Update memory item
    updateMemory(index, summary, details) {
        const mem = this.memory.find(m => m.index === parseInt(index));
        if (mem) {
            if (summary) mem.summary = summary;
            if (details) mem.details = details;
            mem.timestamp = Date.now();
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    }

    // Delete memory item
    deleteMemory(index) {
        const idx = this.memory.findIndex(m => m.index === parseInt(index));
        if (idx !== -1) {
            this.memory.splice(idx, 1);
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    }

    // Clear all memory
    clearMemory() {
        this.memory = [];
        this.save();
        this.updateUI();
    }

    // ===== REASONING CHAIN OPERATIONS =====

    // Add reasoning step
    addReasoningStep(step, metadata = {}) {
        const reasoningStep = {
            step: step,
            timestamp: Date.now(),
            iteration: this.immediateReasoningChain.length + 1,
            ...metadata
        };
        this.immediateReasoningChain.push(reasoningStep);
        this.updateUI();
        return this.immediateReasoningChain.length - 1;
    }

    // Get full reasoning chain as formatted string
    getReasoningChain() {
        if (this.immediateReasoningChain.length === 0) return '';
        return this.immediateReasoningChain
            .map((r, i) => `[Step ${i + 1}]\n${r.step}`)
            .join('\n\n---\n\n');
    }

    // Get last N reasoning steps
    getLastReasoningSteps(n = 3) {
        const steps = this.immediateReasoningChain.slice(-n);
        return steps.map(r => r.step).join('\n\n');
    }

    // Clear reasoning chain (after final output)
    clearReasoningChain() {
        this.immediateReasoningChain = [];
        this.updateUI();
    }

    // ===== GOALS OPERATIONS =====

    // Add goal
    addGoal(goal, priority = 'normal') {
        const goalItem = {
            index: this.goals.length,
            goal: goal,
            status: 'active',
            priority: priority,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.goals.push(goalItem);
        this.save();
        this.updateUI();
        return goalItem.index;
    }

    // Update goal status
    updateGoalStatus(index, status) {
        const goal = this.goals.find(g => g.index === parseInt(index));
        if (goal) {
            goal.status = status;
            goal.updatedAt = Date.now();
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    }

    // Get goals formatted for prompt
    getGoals() {
        if (this.goals.length === 0) return '';
        return this.goals
            .map(g => `[${g.index}] ${g.goal} (Status: ${g.status}, Priority: ${g.priority})`)
            .join('\n');
    }

    // Check if all goals achieved
    allGoalsAchieved() {
        if (this.goals.length === 0) return false;
        return this.goals.every(g => g.status === 'achieved');
    }

    // Delete goal
    deleteGoal(index) {
        const idx = this.goals.findIndex(g => g.index === parseInt(index));
        if (idx !== -1) {
            this.goals.splice(idx, 1);
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    }

    // Clear all goals
    clearGoals() {
        this.goals = [];
        this.save();
        this.updateUI();
    }

    // ===== CHECKPOINT OPERATIONS =====

    // Save checkpoint
    saveCheckpoint(name, description = '') {
        const checkpoint = {
            index: this.checkpoints.length,
            name: name,
            description: description,
            timestamp: Date.now(),
            data: {
                memory: JSON.parse(JSON.stringify(this.memory)),
                goals: JSON.parse(JSON.stringify(this.goals)),
                reasoningChain: JSON.parse(JSON.stringify(this.immediateReasoningChain))
            }
        };
        this.checkpoints.push(checkpoint);
        this.save();
        this.updateUI();
        return checkpoint.index;
    }

    // Restore checkpoint
    restoreCheckpoint(index) {
        const checkpoint = this.checkpoints.find(c => c.index === parseInt(index));
        if (checkpoint && checkpoint.data) {
            this.memory = JSON.parse(JSON.stringify(checkpoint.data.memory || []));
            this.goals = JSON.parse(JSON.stringify(checkpoint.data.goals || []));
            this.immediateReasoningChain = JSON.parse(JSON.stringify(checkpoint.data.reasoningChain || []));
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    }

    // Delete checkpoint
    deleteCheckpoint(index) {
        const idx = this.checkpoints.findIndex(c => c.index === parseInt(index));
        if (idx !== -1) {
            this.checkpoints.splice(idx, 1);
            this.save();
            this.updateUI();
            return true;
        }
        return false;
    }

    // Clear all checkpoints
    clearCheckpoints() {
        this.checkpoints = [];
        this.save();
        this.updateUI();
    }

    // ===== SESSION OPERATIONS =====

    // Clear entire session
    clearSession() {
        this.memory = [];
        this.immediateReasoningChain = [];
        this.goals = [];
        this.checkpoints = [];
        this.currentSessionId = this.generateSessionId();
        this.save();
        this.updateUI();
    }

    // Export session data
    exportSession() {
        return {
            sessionId: this.currentSessionId,
            exportedAt: Date.now(),
            memory: this.memory,
            goals: this.goals,
            checkpoints: this.checkpoints,
            reasoningChain: this.immediateReasoningChain
        };
    }

    // Import session data
    importSession(data) {
        if (!data) return false;
        try {
            this.memory = data.memory || [];
            this.goals = data.goals || [];
            this.checkpoints = data.checkpoints || [];
            this.immediateReasoningChain = data.reasoningChain || [];
            this.currentSessionId = data.sessionId || this.generateSessionId();
            this.save();
            this.updateUI();
            return true;
        } catch (e) {
            console.error('Error importing session:', e);
            return false;
        }
    }

    // ===== UI UPDATE =====

    // Trigger UI update event
    updateUI() {
        document.dispatchEvent(new CustomEvent('data-structures-updated', {
            detail: {
                memoryCount: this.memory.length,
                reasoningCount: this.immediateReasoningChain.length,
                goalsCount: this.goals.length,
                checkpointsCount: this.checkpoints.length
            }
        }));
    }
}

// Export
window.DataStructures = DataStructures;
