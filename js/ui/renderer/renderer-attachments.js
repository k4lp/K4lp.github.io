import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';

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
    pill.textContent = 'NONE';
    pill.classList.remove('status-active');
    pill.classList.add('status-idle');
    return;
  }

  pill.textContent = 'ATTACHED';
  pill.classList.remove('status-idle');
  pill.classList.add('status-active');
}

function renderSummaryPanel(metadata, diffIndex) {
  const panel = document.getElementById('attachmentSummaryPanel');
  if (!panel) return;

  if (!metadata) {
    panel.innerHTML = '<p class="attachment-preview-placeholder">Attach a workbook to see runtime stats.</p>';
    return;
  }

  const sheetDiffs = Object.entries(diffIndex)
    .filter(([_, diff]) => diff.changedCells || diff.addedRows || diff.deletedRows)
    .slice(0, 4)
    .map(([sheet, diff]) => `<li><strong>${sheet}</strong>: ${diff.changedCells} cells changed, +${diff.addedRows} / -${diff.deletedRows} rows</li>`)
    .join('');

  panel.innerHTML = `
    <div class="attachment-card__status-row">
      <span>${metadata.name}</span>
      <span>${(metadata.sizeBytes / 1024).toFixed(2)} KB</span>
    </div>
    <div class="attachment-card__status-row">
      <span>Sheets</span>
      <strong>${metadata.sheetOrder?.length || 0}</strong>
    </div>
    <div class="attachment-card__status-row">
      <span>Total Rows</span>
      <strong>${metadata.totals?.rows || 0}</strong>
    </div>
    <div class="attachment-card__status-row">
      <span>Imported</span>
      <strong>${new Date(metadata.importedAt).toLocaleString()}</strong>
    </div>
    ${sheetDiffs ? `<ul class="attachment-diff-list">${sheetDiffs}</ul>` : '<p class="attachment-preview-placeholder">No mutations recorded.</p>'}
  `;
}

function renderSheetsPanel(diffIndex) {
  const panel = document.getElementById('attachmentSheetsPanel');
  if (!panel) return;

  if (!ExcelRuntimeStore.hasWorkbook()) {
    panel.innerHTML = '<p class="attachment-preview-placeholder">No workbook attached.</p>';
    return;
  }

  const sheets = ExcelRuntimeStore.getSheetNames();
  const summaries = sheets.map((name, index) => {
    const summary = ExcelRuntimeStore.getSheetSummary(name) || {};
    const diff = diffIndex[name] || { changedCells: 0, addedRows: 0, deletedRows: 0 };
    return `
      <div class="attachment-sheet-row">
        <div>
          <strong>${index + 1}. ${name}</strong>
          <p>${summary.rowCount || 0} rows • ${summary.columnCount || 0} columns</p>
        </div>
        <div class="attachment-sheet-meta">
          <span>${diff.changedCells} cells changed</span>
          <span>+${diff.addedRows} / -${diff.deletedRows} rows</span>
        </div>
      </div>
    `;
  }).join('');

  panel.innerHTML = summaries || '<p class="attachment-preview-placeholder">No sheets detected.</p>';
}

function renderMutationsPanel(mutationLog) {
  const panel = document.getElementById('attachmentMutationsPanel');
  if (!panel) return;

  if (!ExcelRuntimeStore.hasWorkbook()) {
    panel.innerHTML = '<p class="attachment-preview-placeholder">No workbook attached.</p>';
    return;
  }

  if (!mutationLog.length) {
    panel.innerHTML = '<p class="attachment-preview-placeholder">No mutations recorded.</p>';
    return;
  }

  panel.innerHTML = mutationLog.slice(-10).reverse().map((entry) => `
    <div class="attachment-mutation-entry">
      <strong>${entry.action}</strong> ${entry.sheet ? `on ${entry.sheet}` : ''}
      <span>${new Date(entry.timestamp).toLocaleString()} • v${entry.version}</span>
    </div>
  `).join('');
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
      window.open('docs/attachments-guide.md', '_blank');
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

