/**
 * GDRS Modal Management
 * All modal and export functionality
 */

import { Storage } from '../storage/storage.js';
import { qs } from '../core/utils.js';

// Current data for export
let currentTaskData = null;
let currentMemoryData = null;
let currentGoalData = null;
let currentVaultData = null;

/**
 * Download content as file
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Task Modal
 */
export function openTaskModal(taskId) {
  const tasks = Storage.loadTasks();
  const task = tasks.find(t => t.identifier === taskId);
  if (!task) return;

  currentTaskData = task;

  const modal = qs('#taskModal');
  const idEl = qs('#taskModalId');
  const statusEl = qs('#taskModalStatus');
  const headingEl = qs('#taskModalHeading');
  const contentEl = qs('#taskModalContent');
  const notesEl = qs('#taskModalNotes');
  const notesSection = qs('#taskModalNotesSection');

  if (idEl) idEl.textContent = task.identifier;
  if (statusEl) statusEl.textContent = task.status.toUpperCase();
  if (headingEl) headingEl.textContent = task.heading;
  if (contentEl) contentEl.textContent = task.content;

  if (task.notes) {
    if (notesEl) notesEl.textContent = task.notes;
    if (notesSection) notesSection.style.display = 'block';
  } else {
    if (notesSection) notesSection.style.display = 'none';
  }

  if (modal) modal.style.display = 'flex';

  // Bind export button
  const exportBtn = qs('#taskModalExport');
  if (exportBtn) {
    exportBtn.onclick = () => exportTask(task);
  }
}

export function closeTaskModal() {
  const modal = qs('#taskModal');
  if (modal) modal.style.display = 'none';
  currentTaskData = null;
}

function exportTask(task) {
  const content = `TASK: ${task.heading}
ID: ${task.identifier}
STATUS: ${task.status}

CONTENT:
${task.content}

${task.notes ? `NOTES:\n${task.notes}\n` : ''}
Created: ${new Date(task.createdAt).toLocaleString()}
Updated: ${new Date(task.updatedAt).toLocaleString()}`;

  downloadFile(`task-${task.identifier}.txt`, content);
}

/**
 * Memory Modal
 */
export function openMemoryModal(memoryId) {
  const memories = Storage.loadMemory();
  const memory = memories.find(m => m.identifier === memoryId);
  if (!memory) return;

  currentMemoryData = memory;

  const modal = qs('#memoryModal');
  const idEl = qs('#memoryModalId');
  const headingEl = qs('#memoryModalHeading');
  const contentEl = qs('#memoryModalContent');
  const notesEl = qs('#memoryModalNotes');
  const notesSection = qs('#memoryModalNotesSection');

  if (idEl) idEl.textContent = memory.identifier;
  if (headingEl) headingEl.textContent = memory.heading;
  if (contentEl) contentEl.textContent = memory.content;

  if (memory.notes) {
    if (notesEl) notesEl.textContent = memory.notes;
    if (notesSection) notesSection.style.display = 'block';
  } else {
    if (notesSection) notesSection.style.display = 'none';
  }

  if (modal) modal.style.display = 'flex';

  // Bind export button
  const exportBtn = qs('#memoryModalExport');
  if (exportBtn) {
    exportBtn.onclick = () => exportMemory(memory);
  }
}

export function closeMemoryModal() {
  const modal = qs('#memoryModal');
  if (modal) modal.style.display = 'none';
  currentMemoryData = null;
}

function exportMemory(memory) {
  const content = `MEMORY: ${memory.heading}
ID: ${memory.identifier}

CONTENT:
${memory.content}

${memory.notes ? `NOTES:\n${memory.notes}\n` : ''}
Created: ${new Date(memory.createdAt).toLocaleString()}
Updated: ${new Date(memory.updatedAt).toLocaleString()}`;

  downloadFile(`memory-${memory.identifier}.txt`, content);
}

/**
 * Goal Modal
 */
export function openGoalModal(goalId) {
  const goals = Storage.loadGoals();
  const goal = goals.find(g => g.identifier === goalId);
  if (!goal) return;

  currentGoalData = goal;

  const modal = qs('#goalModal');
  const idEl = qs('#goalModalId');
  const headingEl = qs('#goalModalHeading');
  const contentEl = qs('#goalModalContent');
  const notesEl = qs('#goalModalNotes');
  const notesSection = qs('#goalModalNotesSection');

  if (idEl) idEl.textContent = goal.identifier;
  if (headingEl) headingEl.textContent = goal.heading;
  if (contentEl) contentEl.textContent = goal.content;

  if (goal.notes) {
    if (notesEl) notesEl.textContent = goal.notes;
    if (notesSection) notesSection.style.display = 'block';
  } else {
    if (notesSection) notesSection.style.display = 'none';
  }

  if (modal) modal.style.display = 'flex';

  // Bind export button
  const exportBtn = qs('#goalModalExport');
  if (exportBtn) {
    exportBtn.onclick = () => exportGoal(goal);
  }
}

export function closeGoalModal() {
  const modal = qs('#goalModal');
  if (modal) modal.style.display = 'none';
  currentGoalData = null;
}

function exportGoal(goal) {
  const content = `GOAL: ${goal.heading}
ID: ${goal.identifier}

CONTENT:
${goal.content}

${goal.notes ? `NOTES:\n${goal.notes}\n` : ''}
Created: ${new Date(goal.createdAt).toLocaleString()}
Updated: ${new Date(goal.updatedAt).toLocaleString()}`;

  downloadFile(`goal-${goal.identifier}.txt`, content);
}

/**
 * Vault Modal
 */
export function openVaultModal(vaultId) {
  const vault = Storage.loadVault();
  const entry = vault.find(v => v.identifier === vaultId);
  if (!entry) return;

  currentVaultData = entry;

  const modal = qs('#vaultModal');
  const idEl = qs('#vaultModalId');
  const typeEl = qs('#vaultModalType');
  const descEl = qs('#vaultModalDesc');
  const contentEl = qs('#vaultModalContent');

  if (idEl) idEl.textContent = entry.identifier;
  if (typeEl) typeEl.textContent = entry.type.toUpperCase();
  if (descEl) descEl.textContent = entry.description || '— no description —';
  if (contentEl) contentEl.textContent = entry.content;
  if (modal) modal.style.display = 'flex';

  // Bind export button
  const exportBtn = qs('#vaultModalExport');
  if (exportBtn) {
    exportBtn.onclick = () => exportVault(entry);
  }
}

export function closeVaultModal() {
  const modal = qs('#vaultModal');
  if (modal) modal.style.display = 'none';
  currentVaultData = null;
}

function exportVault(vault) {
  const content = `VAULT ENTRY: ${vault.description || 'Untitled'}
ID: ${vault.identifier}
TYPE: ${vault.type}

CONTENT:
${vault.content}

Created: ${new Date(vault.createdAt).toLocaleString()}
Updated: ${new Date(vault.updatedAt).toLocaleString()}`;

  downloadFile(`vault-${vault.identifier}.txt`, content);
}
