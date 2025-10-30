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
 * Render tool activities for reasoning log
 * @param {Array} activities - Array of tool activity objects
 * @returns {string} HTML string for activities
 */
export function renderToolActivities(activities) {
  let html = '<div class="tool-activities">';

  activities.forEach(activity => {
    const statusClass = activity.status === 'success' ? 'tool-success' : 'tool-error';
    const typeClass = `tool-${activity.type.replace('_', '-')}`;

    let details = formatActivityDetails(activity);

    html += `
      <div class="tool-activity ${statusClass} ${typeClass}">
        <div class="tool-icon">🔧</div>
        <div class="tool-details">
          <div class="tool-name">${activity.type.toUpperCase()}: ${activity.action}</div>
          <div class="tool-meta">${details}</div>
          ${activity.error ? `<div class="tool-error-msg">${encodeHTML(activity.error)}</div>` : ''}
        </div>
        <div class="tool-status ${activity.status}">${activity.status === 'success' ? '✓' : '✗'}</div>
      </div>
    `;
  });

  return html + '</div>';
}
