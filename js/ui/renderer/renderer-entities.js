/**
 * Entity Renderer
 * Renders tasks, memories, and goals
 */

import { Storage } from '../../storage/storage.js';
import { encodeHTML } from '../../core/utils.js';
import { renderEntityList } from './renderer-helpers.js';
import { openTaskModal, openMemoryModal, openGoalModal } from '../modals.js';

/**
 * Render tasks list
 */
export function renderTasks() {
  renderEntityList('#tasksList', Storage.loadTasks(), {
    placeholder: 'No tasks yet - LLM will create intelligent tasks after query analysis',
    renderItem: t => `
      <div class="li" data-task-id="${encodeHTML(t.identifier)}">
        <div>
          <div class="mono">${encodeHTML(t.heading)}</div>
          <div class="pm">${encodeHTML(t.content)}</div>
          ${t.notes ? `<div class="pm">Notes: ${encodeHTML(t.notes)}</div>` : ''}
        </div>
        <div class="status">${encodeHTML(t.status.toUpperCase())}</div>
      </div>
    `
  });

  // Add click handlers for tasks
  const taskItems = document.querySelectorAll('#tasksList [data-task-id]');
  taskItems.forEach(item => {
    item.addEventListener('click', () => {
      const taskId = item.getAttribute('data-task-id');
      openTaskModal(taskId);
    });
  });
}

/**
 * Render memories list
 */
export function renderMemories() {
  renderEntityList('#memoryList', Storage.loadMemory(), {
    placeholder: 'No memories yet - Important findings will be stored here',
    renderItem: m => `
      <div class="li" data-memory-id="${encodeHTML(m.identifier)}">
        <div>
          <div class="mono">${encodeHTML(m.heading)}</div>
          <div class="pm">${encodeHTML(m.content)}</div>
          ${m.notes ? `<div class="pm">Notes: ${encodeHTML(m.notes)}</div>` : ''}
        </div>
        <div class="id">${encodeHTML(m.identifier)}</div>
      </div>
    `
  });

  // Add click handlers for memories
  const memoryItems = document.querySelectorAll('#memoryList [data-memory-id]');
  memoryItems.forEach(item => {
    item.addEventListener('click', () => {
      const memoryId = item.getAttribute('data-memory-id');
      openMemoryModal(memoryId);
    });
  });
}

/**
 * Render goals list
 */
export function renderGoals() {
  renderEntityList('#goalsList', Storage.loadGoals(), {
    placeholder: 'No goals yet - Strategic success criteria will be defined after analysis',
    renderItem: g => `
      <div class="li" data-goal-id="${encodeHTML(g.identifier)}">
        <div>
          <div class="mono">${encodeHTML(g.heading)}</div>
          <div class="pm">${encodeHTML(g.content)}</div>
          ${g.notes ? `<div class="pm">Notes: ${encodeHTML(g.notes)}</div>` : ''}
        </div>
        <div class="id">${encodeHTML(g.identifier)}</div>
      </div>
    `
  });

  // Add click handlers for goals
  const goalItems = document.querySelectorAll('#goalsList [data-goal-id]');
  goalItems.forEach(item => {
    item.addEventListener('click', () => {
      const goalId = item.getAttribute('data-goal-id');
      openGoalModal(goalId);
    });
  });
}
