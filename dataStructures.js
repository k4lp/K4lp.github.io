// Data Structures Manager
class DataStructuresManager {
    constructor() {
        this.memory = new Map();
        this.goals = [];
        this.reasoningChain = [];
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: new Date(),
            messageCount: 0
        };
        this.initializeUI();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Memory Management
    addMemory(summary, detail, type = 'general') {
        const memoryId = 'mem_' + Date.now();
        const memoryItem = {
            id: memoryId,
            summary,
            detail,
            type,
            timestamp: new Date(),
            accessCount: 0
        };

        this.memory.set(memoryId, memoryItem);
        this.updateMemoryUI();
        this.updateStatus();
        return memoryId;
    }

    getMemory(memoryId) {
        const item = this.memory.get(memoryId);
        if (item) {
            item.accessCount++;
            return item;
        }
        return null;
    }

    getAllMemories() {
        return Array.from(this.memory.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    searchMemory(query) {
        const results = [];
        for (const [id, item] of this.memory) {
            if (item.summary.toLowerCase().includes(query.toLowerCase()) ||
                item.detail.toLowerCase().includes(query.toLowerCase())) {
                results.push(item);
            }
        }
        return results;
    }

    clearMemory() {
        this.memory.clear();
        this.updateMemoryUI();
        this.updateStatus();
    }

    // Goals Management
    setGoals(goalsList) {
        this.goals = goalsList.map(goal => ({
            id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            content: goal,
            status: 'active',
            timestamp: new Date()
        }));
        this.updateGoalsUI();
    }

    updateGoalStatus(goalId, status) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            goal.status = status;
            this.updateGoalsUI();
        }
    }

    getActiveGoals() {
        return this.goals.filter(g => g.status === 'active');
    }

    // Reasoning Chain Management
    addReasoningStep(step, type = 'analysis') {
        const reasoningStep = {
            id: 'reason_' + Date.now(),
            step,
            type,
            timestamp: new Date(),
            sessionId: this.currentSession.id
        };

        this.reasoningChain.push(reasoningStep);
        this.updateReasoningUI();
        this.updateStatus();
        return reasoningStep.id;
    }

    getReasoningChain() {
        return this.reasoningChain
            .filter(step => step.sessionId === this.currentSession.id)
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    clearReasoningChain() {
        this.reasoningChain = this.reasoningChain
            .filter(step => step.sessionId !== this.currentSession.id);
        this.updateReasoningUI();
        this.updateStatus();
    }

    // Context Building for AI
    buildContext() {
        const context = {
            session: this.currentSession,
            memories: this.getAllMemories().slice(0, 20), // Last 20 memories
            goals: this.getActiveGoals(),
            reasoningChain: this.getReasoningChain(),
            timestamp: new Date()
        };
        return context;
    }

    // Export/Import functionality
    exportSession() {
        return {
            session: this.currentSession,
            memory: Array.from(this.memory.entries()),
            goals: this.goals,
            reasoningChain: this.reasoningChain,
            exportTime: new Date()
        };
    }

    importSession(sessionData) {
        this.currentSession = sessionData.session || this.currentSession;
        this.memory = new Map(sessionData.memory || []);
        this.goals = sessionData.goals || [];
        this.reasoningChain = sessionData.reasoningChain || [];

        this.updateMemoryUI();
        this.updateGoalsUI();
        this.updateReasoningUI();
        this.updateStatus();
    }

    // UI Update Methods
    updateMemoryUI() {
        const memoryList = document.getElementById('memoryList');
        const memories = this.getAllMemories().slice(0, 10); // Show last 10

        memoryList.innerHTML = memories.map(mem => `
            <div class="data-item" onclick="dataManager.showMemoryDetail('${mem.id}')">
                <div class="summary">${mem.summary}</div>
                <div class="detail">${mem.type} • ${mem.accessCount} accesses</div>
            </div>
        `).join('');
    }

    updateGoalsUI() {
        const goalsList = document.getElementById('goalsList');
        goalsList.innerHTML = this.goals.map(goal => `
            <div class="data-item" onclick="dataManager.toggleGoalStatus('${goal.id}')">
                <div class="summary">${goal.content}</div>
                <div class="detail">Status: ${goal.status}</div>
            </div>
        `).join('');
    }

    updateReasoningUI() {
        const reasoningChain = document.getElementById('reasoningChain');
        const steps = this.getReasoningChain().slice(-5); // Last 5 steps

        reasoningChain.innerHTML = steps.map(step => `
            <div class="reasoning-step">
                <div class="step-title">${step.type.toUpperCase()}</div>
                <div class="step-content">${step.step}</div>
            </div>
        `).join('');
    }

    updateStatus() {
        document.getElementById('memoryCount').textContent = this.memory.size;
        document.getElementById('reasoningCount').textContent = this.getReasoningChain().length;
    }

    // Event Handlers
    showMemoryDetail(memoryId) {
        const memory = this.getMemory(memoryId);
        if (memory) {
            alert(`Memory Detail:\n\nSummary: ${memory.summary}\n\nDetail: ${memory.detail}\n\nAccessed: ${memory.accessCount} times`);
        }
    }

    toggleGoalStatus(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (goal) {
            goal.status = goal.status === 'active' ? 'completed' : 'active';
            this.updateGoalsUI();
        }
    }

    initializeUI() {
        // Initialize empty UI
        this.updateMemoryUI();
        this.updateGoalsUI();
        this.updateReasoningUI();
        this.updateStatus();
    }

    // Reset session
    resetSession() {
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: new Date(),
            messageCount: 0
        };
        this.clearMemory();
        this.goals = [];
        this.clearReasoningChain();
    }
}

// Global instance
const dataManager = new DataStructuresManager();