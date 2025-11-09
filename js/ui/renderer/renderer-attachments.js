import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';

const TAB_IDS = ['summary', 'sheets', 'mutations'];
let subscribed = false;
let tabsBound = false;
let quickActionsBound = false;
let activeTab = 'summary';

function setButtonState(enabled) {
  const ids = [
    'attachmentDownloadOriginal',
    'attachmentDownloadWorking',
    'attachmentReset',
    'attachmentRemove',
    'attachmentQuickActions'
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.classList.contains('attachment-quick-actions')) {
      el.querySelectorAll('button[data-action]').forEach((btn) => {
        if (btn.dataset.action === 'openGuide') {
          btn.disabled = false;
        } else {
          btn.disabled = !enabled;
        }
      });
    } else {
      el.disabled = !enabled;
    }
  });
}

function updateStatusPill(metadata) {
  const pill = document.getElementById('attachmentStatusPill');
  if (!pill) return;

  if (!metadata) {
    pill.innerHTML = '<span class="status-dot status-dot--idle"></span> NO FILE';
    pill.classList.remove('status-pill--active');
    pill.classList.add('status-pill--idle');
    return;
  }

  pill.innerHTML = '<span class="status-dot status-dot--active"></span> ATTACHED';
  pill.classList.remove('status-pill--idle');
  pill.classList.add('status-pill--active');
}

function renderSummaryPanel(metadata, diffIndex) {
  const panel = document.getElementById('attachmentSummaryPanel');
  if (!panel) return;

  if (!metadata) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📊</div>
        <div class="empty-state__title">No Workbook Loaded</div>
        <div class="empty-state__description">
          Drop an Excel file (.xlsx, .xls, .csv) in the drop zone above to get started
        </div>
      </div>
    `;
    return;
  }

  const totalChanges = Object.values(diffIndex).reduce(
    (sum, diff) => sum + diff.changedCells + diff.addedRows + diff.deletedRows,
    0
  );

  const changesSummary = Object.entries(diffIndex)
    .filter(([_, diff]) => diff.changedCells || diff.addedRows || diff.deletedRows)
    .slice(0, 5)
    .map(([sheet, diff]) => {
      const changes = [];
      if (diff.changedCells) changes.push(`<span class="badge badge--warning">${diff.changedCells} cells</span>`);
      if (diff.addedRows) changes.push(`<span class="badge badge--success">+${diff.addedRows} rows</span>`);
      if (diff.deletedRows) changes.push(`<span class="badge badge--danger">-${diff.deletedRows} rows</span>`);

      return `
        <div class="stat-row">
          <span class="stat-row__label">${sheet}</span>
          <span class="stat-row__value">${changes.join(' ')}</span>
        </div>
      `;
    }).join('');

  panel.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card__icon">📄</div>
        <div class="stat-card__content">
          <div class="stat-card__label">File Name</div>
          <div class="stat-card__value" title="${metadata.name}">${metadata.name}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">💾</div>
        <div class="stat-card__content">
          <div class="stat-card__label">File Size</div>
          <div class="stat-card__value">${(metadata.sizeBytes / 1024).toFixed(2)} KB</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">📑</div>
        <div class="stat-card__content">
          <div class="stat-card__label">Sheets</div>
          <div class="stat-card__value">${metadata.sheetOrder?.length || 0}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">📊</div>
        <div class="stat-card__content">
          <div class="stat-card__label">Total Rows</div>
          <div class="stat-card__value">${metadata.totals?.rows?.toLocaleString() || 0}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon">🕐</div>
        <div class="stat-card__content">
          <div class="stat-card__label">Imported</div>
          <div class="stat-card__value">${new Date(metadata.importedAt).toLocaleString()}</div>
        </div>
      </div>

      <div class="stat-card ${totalChanges ? 'stat-card--highlight' : ''}">
        <div class="stat-card__icon">${totalChanges ? '✏️' : '✓'}</div>
        <div class="stat-card__content">
          <div class="stat-card__label">Changes</div>
          <div class="stat-card__value">${totalChanges || 'None'}</div>
        </div>
      </div>
    </div>

    ${changesSummary ? `
      <div class="changes-section">
        <div class="section-title">Recent Modifications</div>
        ${changesSummary}
      </div>
    ` : ''}
  `;
}

function renderSheetsPanel(diffIndex) {
  const panel = document.getElementById('attachmentSheetsPanel');
  if (!panel) return;

  if (!ExcelRuntimeStore.hasWorkbook()) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <div class="empty-state__title">No Sheets Available</div>
        <div class="empty-state__description">Load a workbook to view sheets</div>
      </div>
    `;
    return;
  }

  const sheets = ExcelRuntimeStore.getSheetNames();
  const summaries = sheets.map((name, index) => {
    const summary = ExcelRuntimeStore.getSheetSummary(name) || {};
    const diff = diffIndex[name] || { changedCells: 0, addedRows: 0, deletedRows: 0 };
    const hasChanges = diff.changedCells || diff.addedRows || diff.deletedRows;

    const badges = [];
    if (diff.changedCells) badges.push(`<span class="badge badge--warning">${diff.changedCells} edited</span>`);
    if (diff.addedRows) badges.push(`<span class="badge badge--success">+${diff.addedRows}</span>`);
    if (diff.deletedRows) badges.push(`<span class="badge badge--danger">-${diff.deletedRows}</span>`);

    return `
      <div class="sheet-card ${hasChanges ? 'sheet-card--modified' : ''}">
        <div class="sheet-card__header">
          <div class="sheet-card__icon">${hasChanges ? '📝' : '📄'}</div>
          <div class="sheet-card__info">
            <div class="sheet-card__name">${index + 1}. ${name}</div>
            <div class="sheet-card__meta">
              ${summary.rowCount?.toLocaleString() || 0} rows × ${summary.columnCount || 0} columns
            </div>
          </div>
          ${hasChanges ? '<div class="sheet-card__indicator"></div>' : ''}
        </div>
        ${badges.length ? `
          <div class="sheet-card__badges">
            ${badges.join(' ')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  panel.innerHTML = summaries || `
    <div class="empty-state">
      <div class="empty-state__icon">❌</div>
      <div class="empty-state__title">No Sheets Found</div>
      <div class="empty-state__description">This workbook appears to be empty</div>
    </div>
  `;
}

function renderMutationsPanel(mutationLog) {
  const panel = document.getElementById('attachmentMutationsPanel');
  if (!panel) return;

  if (!ExcelRuntimeStore.hasWorkbook()) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <div class="empty-state__title">No Mutations Logged</div>
        <div class="empty-state__description">Load a workbook to track changes</div>
      </div>
    `;
    return;
  }

  if (!mutationLog.length) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">✓</div>
        <div class="empty-state__title">No Changes Yet</div>
        <div class="empty-state__description">All data matches the original file</div>
      </div>
    `;
    return;
  }

  const actionIcons = {
    'create': '✨',
    'update': '✏️',
    'reset': '↺',
    'delete': '🗑️'
  };

  const mutations = mutationLog.slice(-15).reverse().map((entry) => {
    const icon = actionIcons[entry.action] || '📝';
    const time = new Date(entry.timestamp).toLocaleTimeString();
    const sheetLabel = entry.sheet ? `<span class="mutation-sheet">${entry.sheet}</span>` : '';

    return `
      <div class="mutation-item">
        <div class="mutation-item__icon">${icon}</div>
        <div class="mutation-item__content">
          <div class="mutation-item__action">
            <strong>${entry.action}</strong> ${sheetLabel}
          </div>
          <div class="mutation-item__time">${time} • v${entry.version}</div>
        </div>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <div class="mutations-list">
      ${mutations}
    </div>
  `;
}

function bindTabs() {
  if (tabsBound) return;
  const buttons = document.querySelectorAll('.attachment-tab');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.panel;
      updateTabs();
    });
  });
  tabsBound = true;
}

function updateTabs() {
  TAB_IDS.forEach((tab) => {
    const button = document.querySelector(`.attachment-tab[data-panel="${tab}"]`);
    const panel = document.getElementById(`attachment${tab.charAt(0).toUpperCase() + tab.slice(1)}Panel`);
    if (!button || !panel) return;
    if (tab === activeTab) {
      button.classList.add('active');
      panel.classList.add('active');
    } else {
      button.classList.remove('active');
      panel.classList.remove('active');
    }
  });
}

function bindQuickActions() {
  if (quickActionsBound) return;
  const container = document.getElementById('attachmentQuickActions');
  if (!container) return;
  container.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (action === 'openGuide') {
      window.open('docs/EXCEL_API_REFERENCE.md', '_blank');
      return;
    }
    if (!ExcelRuntimeStore.hasWorkbook()) {
      alert('Attach a workbook to use this action.');
      return;
    }
    if (action === 'previewRows') {
      const firstSheet = ExcelRuntimeStore.getSheetNames()[0];
      if (!firstSheet) return;
      const rows = ExcelRuntimeStore.getWorkingCopy()?.[firstSheet]?.rows?.slice(0, 5) || [];
      console.table(rows);
    } else if (action === 'logSummary') {
      const summaries = ExcelRuntimeStore.getSheetNames().map((name) => ExcelRuntimeStore.getSheetSummary(name));
      console.table(summaries);
    }
  });
  quickActionsBound = true;
}

export function renderAttachmentPanel() {
  const metadata = ExcelRuntimeStore.getMetadata();
  const diffIndex = ExcelRuntimeStore.getDiffIndex();
  const mutationLog = ExcelRuntimeStore.getMutationLog();

  setButtonState(!!metadata);
  updateStatusPill(metadata);
  renderSummaryPanel(metadata, diffIndex);
  renderSheetsPanel(diffIndex);
  renderMutationsPanel(mutationLog);
  bindTabs();
  updateTabs();
  bindQuickActions();

  if (!subscribed) {
    ExcelRuntimeStore.subscribe(() => renderAttachmentPanel());
    subscribed = true;
  }
}
