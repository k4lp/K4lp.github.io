// Status utilities for API connectivity badges
export const Status = Object.freeze({
  Active: 'active',
  Inactive: 'inactive',
  Error: 'error',
  Connecting: 'connecting'
});

export function statusBadge(statusText) {
  const normalized = String(statusText || '').toLowerCase();
  const status = Object.values(Status).includes(normalized) ? normalized : Status.Inactive;
  const badge = document.createElement('span');
  badge.className = 'status-badge';
  const dot = document.createElement('span');
  dot.className = `dot ${status}`;
  const label = document.createElement('span');
  label.textContent = normalized.toUpperCase();
  badge.append(dot, label);
  return badge;
}
