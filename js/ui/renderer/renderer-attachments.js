import { ExcelRuntimeStore } from '../../state/excel-runtime-store.js';

let subscribed = false;

function setButtonState(enabled) {
  const ids = [
    'attachmentDownloadOriginal',
    'attachmentDownloadWorking',
    'attachmentReset',
    'attachmentRemove'
  ];

  ids.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = !enabled;
    }
  });
}

function renderStatus(metadata) {
  const statusEl = document.getElementById('attachmentStatus');
  if (!statusEl) return;

  if (!metadata) {
    statusEl.innerHTML = '<p>No workbook attached.</p>';
    return;
  }

  statusEl.innerHTML = `
    <p><strong>${metadata.name}</strong></p>
    <p>${(metadata.sizeBytes / 1024).toFixed(2)} KB • ${metadata.sheetNames.length} sheets</p>
    <p>Imported: ${new Date(metadata.importedAt).toLocaleString()}</p>
  `;
}

function renderPreview(working, mutationLog) {
  const previewEl = document.getElementById('attachmentPreview');
  if (!previewEl) return;

  if (!working) {
    previewEl.innerHTML = '<p class="attachment-preview-placeholder">Sheet preview will appear once a workbook is attached.</p>';
    return;
  }

  const sheetNames = Object.keys(working);
  if (sheetNames.length === 0) {
    previewEl.innerHTML = '<p class="attachment-preview-placeholder">Workbook contains no sheets.</p>';
    return;
  }

  const mutationsBySheet = mutationLog.reduce((acc, entry) => {
    if (entry.sheet) {
      acc.add(entry.sheet);
    }
    return acc;
  }, new Set());

  const fragments = sheetNames.slice(0, 3).map((sheetName) => {
    const sheet = working[sheetName];
    const headers = sheet.headers || [];
    const rows = sheet.rows || [];
    const badge = mutationsBySheet.has(sheetName)
      ? '<span class="attachment-badge">modified</span>'
      : '';

    const headerRow = headers.slice(0, 6).map((header) => `<th>${header}</th>`).join('');
    const bodyRows = rows.slice(0, 5).map((row) => {
      return `<tr>${headers.slice(0, 6).map((header) => `<td>${row[header] ?? ''}</td>`).join('')}</tr>`;
    }).join('');

    return `
      <div class="attachment-sheet-preview">
        <div class="attachment-sheet-title">
          <strong>${sheetName}</strong> ${badge}
        </div>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="6">No rows</td></tr>'}</tbody>
        </table>
      </div>
    `;
  });

  previewEl.innerHTML = fragments.join('');
}

export function renderAttachmentPanel() {
  const metadata = ExcelRuntimeStore.getMetadata();
  const working = ExcelRuntimeStore.getWorkingCopy();
  const mutationLog = ExcelRuntimeStore.getMutationLog();

  setButtonState(!!metadata);
  renderStatus(metadata);
  renderPreview(working, mutationLog);

  if (!subscribed) {
    ExcelRuntimeStore.subscribe(() => renderAttachmentPanel());
    subscribed = true;
  }
}

