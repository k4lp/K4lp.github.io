/**
 * Renderer Helper Utilities
 * Shared utility functions for rendering components
 */

import { qs, encodeHTML } from '../../core/utils.js';

/**
 * Generic entity list renderer (DRY principle)
 * @param {string} selector - DOM selector for container
 * @param {Array} entities - Array of entities to render
 * @param {Object} options - Rendering options
 * @param {string} options.placeholder - Placeholder text when empty
 * @param {Function} options.renderItem - Function to render individual item
 */
export function renderEntityList(selector, entities, options) {
  const element = qs(selector);
  if (!element) return;

  if (entities.length === 0) {
    element.innerHTML = `<div class="storage-placeholder">${options.placeholder}</div>`;
    return;
  }

  element.innerHTML = entities.map(options.renderItem).join('');
}

/**
 * Format activity details based on type
 * @param {Object} activity - Tool activity object
 * @returns {string} Formatted details string
 */
export function formatActivityDetails(activity) {
  switch (activity.type) {
    case 'js_execute':
      let details = `${activity.executionTime}ms • ${activity.codeSize} chars`;
      if (activity.vaultRefsUsed > 0) details += ` • ${activity.vaultRefsUsed} vault refs`;
      if (activity.wasAsync) details += ' • async';
      if (activity.complexity) details += ` • ${activity.complexity}`;
      return details;

    case 'vault':
      let vaultDetails = '';
      if (activity.dataSize) vaultDetails += `${activity.dataSize} chars`;
      if (activity.dataType) vaultDetails += ` • ${activity.dataType}`;
      return vaultDetails;

    case 'final_output':
      let outputDetails = `${activity.contentSize} chars`;
      if (activity.verified) outputDetails += ' • ✅ verified';
      if (activity.source) outputDetails += ` • ${activity.source}`;
      return outputDetails;

    default:
      return activity.id || '';
  }
}

/**
 * Get color for vault entry type
 * @param {string} type - Vault entry type
 * @returns {string} CSS color value
 */
export function getTypeColor(type) {
  const colors = {
    data: '#e3f2fd',
    code: '#f3e5f5',
    text: '#e8f5e8',
    json: '#fff3e0',
    result: '#e0f2f1'
  };
  return colors[type] || '#f5f5f5';
}

/**
 * Get icon and name for tool activity type
 */
function getActivityInfo(type) {
  const info = {
    'js_execute': { icon: '⚡', name: 'Code Execution' },
    'js-execute': { icon: '⚡', name: 'Code Execution' },
    'vault': { icon: '🔒', name: 'Data Vault' },
    'memory': { icon: '🧠', name: 'Memory Storage' },
    'task': { icon: '✓', name: 'Task Created' },
    'goal': { icon: '🎯', name: 'Goal Set' },
    'final_output': { icon: '📊', name: 'Final Output' },
    'final-output': { icon: '📊', name: 'Final Output' }
  };
  return info[type] || { icon: '🔧', name: type };
}

/**
 * Render tool activity block
 * @param {Object} activity - Tool activity object
 * @param {number} iteration - Iteration index for alternating colors
 * @returns {string} HTML string for activity
 */
export function renderToolActivities(activity, iteration) {
  const isEven = iteration % 2 === 0;
  const info = getActivityInfo(activity.type);
  const details = formatActivityDetails(activity);
  const hasError = activity.status === 'error';

  // Parse metadata from details
  const metaItems = details ? details.split(' • ') : [];

  let html = `
    <div class="reasoning-block ${isEven ? 'even' : 'odd'} ${hasError ? 'error' : 'success'}">
      <div class="block-header activity">
        <div class="header-left">
          <span class="activity-icon">${info.icon}</span>
          <span class="block-title">${info.name}</span>
          ${activity.action ? `<span class="activity-action">${encodeHTML(activity.action)}</span>` : ''}
        </div>
        <div class="header-right">
          ${metaItems.map(item => `<span class="meta-item">${item}</span>`).join('')}
          <span class="status-badge ${hasError ? 'error' : 'success'}">${hasError ? '✗ Failed' : '✓ Success'}</span>
        </div>
      </div>
  `;

  if (activity.error) {
    html += `
      <div class="activity-body">
        <div class="activity-error">
          <span class="error-icon">⚠️</span>
          <span class="error-message">${encodeHTML(activity.error)}</span>
        </div>
      </div>
    `;
  }

  html += `</div>`;

  return html;
}
