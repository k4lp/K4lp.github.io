/**
 * TASKS API
 *
 * Programmatic Tasks access for JavaScript execution context.
 */

import { Storage } from '../../storage/storage.js';
import { nowISO } from '../../core/utils.js';
import {
    isValidIdentifier,
    normalizeTaskStatus,
    TASK_STATUSES,
} from '../../config/tool-registry-config.js';

/**
 * Tasks API - Programmatic access to task management
 */
export class TasksAPI {
    /**
     * Get a task
     * @param {string} id - Task identifier
     * @returns {Object|null} Task or null
     *
     * @example
     * const task = tasks.get('task_001');
     */
    get(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid task ID: ${id}`);
        }

        const tasksData = Storage.loadTasks() || [];
        return tasksData.find(t => t.identifier === id) || null;
    }

    /**
     * Create or update a task
     * @param {string} id - Task identifier
     * @param {Object} task - Task data
     * @param {string} task.heading - Task title
     * @param {string} task.content - Task description
     * @param {string} task.status - Task status (pending|ongoing|finished|paused)
     * @param {string} task.notes - Task notes
     * @returns {Object} Created/updated task
     *
     * @example
     * tasks.set('task_001', {
     *   heading: 'Complete analysis',
     *   content: 'Analyze the data',
     *   status: 'ongoing',
     *   notes: 'Progress: 50%'
     * });
     */
    set(id, task = {}) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid task ID: ${id}`);
        }

        const tasksData = Storage.loadTasks() || [];
        const existingIndex = tasksData.findIndex(t => t.identifier === id);
        const timestamp = nowISO();

        const entry = {
            identifier: id,
            heading: task.heading || id,
            content: task.content || '',
            status: normalizeTaskStatus(task.status || 'pending'),
            notes: task.notes || '',
            createdAt: existingIndex >= 0 ? tasksData[existingIndex].createdAt : timestamp,
            updatedAt: timestamp,
        };

        if (existingIndex >= 0) {
            tasksData[existingIndex] = entry;
        } else {
            tasksData.push(entry);
        }

        Storage.saveTasks(tasksData);
        return entry;
    }

    /**
     * Update task status
     * @param {string} id - Task identifier
     * @param {string} status - New status
     * @returns {Object} Updated task
     *
     * @example
     * tasks.setStatus('task_001', 'finished');
     */
    setStatus(id, status) {
        const task = this.get(id);
        if (!task) {
            throw new Error(`Task not found: ${id}`);
        }

        task.status = normalizeTaskStatus(status);
        task.updatedAt = nowISO();

        const tasksData = Storage.loadTasks() || [];
        const index = tasksData.findIndex(t => t.identifier === id);
        tasksData[index] = task;
        Storage.saveTasks(tasksData);

        return task;
    }

    /**
     * Delete a task
     * @param {string} id - Task identifier
     * @returns {boolean} True if deleted
     *
     * @example
     * tasks.delete('task_001');
     */
    delete(id) {
        if (!id || !isValidIdentifier(id)) {
            throw new Error(`Invalid task ID: ${id}`);
        }

        const tasksData = Storage.loadTasks() || [];
        const filtered = tasksData.filter(t => t.identifier !== id);

        if (filtered.length < tasksData.length) {
            Storage.saveTasks(filtered);
            return true;
        }

        return false;
    }

    /**
     * List all tasks
     * @param {Object} options - List options
     * @param {string} options.status - Filter by status
     * @returns {Array} Tasks
     *
     * @example
     * const all = tasks.list();
     * const pending = tasks.list({ status: 'pending' });
     */
    list(options = {}) {
        let tasksData = Storage.loadTasks() || [];

        if (options.status) {
            const normalizedStatus = normalizeTaskStatus(options.status);
            tasksData = tasksData.filter(t => t.status === normalizedStatus);
        }

        return tasksData;
    }

    /**
     * Get task statistics
     * @returns {Object} Task statistics
     *
     * @example
     * const stats = tasks.stats();
     * console.log(`Pending: ${stats.byStatus.pending}`);
     */
    stats() {
        const tasksData = Storage.loadTasks() || [];

        const byStatus = {};
        TASK_STATUSES.forEach(status => {
            byStatus[status] = tasksData.filter(t => t.status === status).length;
        });

        return {
            total: tasksData.length,
            byStatus,
        };
    }
}

export default TasksAPI;
