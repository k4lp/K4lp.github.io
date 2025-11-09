import { ExcelRuntimeStore } from '../../excel/core/excel-store.js';
import { parseWorkbook } from '../../excel/core/excel-parser.js';
import { downloadWorkbook } from '../../excel/core/excel-exporter.js';
import { eventBus, Events } from '../../core/event-bus.js';

const MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

function emitUpdate(reason) {
  eventBus.emit(Events.EXCEL_ATTACHMENT_UPDATED, {
    reason,
    state: ExcelRuntimeStore.getPublicState()
  });
}

async function handleFile(file) {
  if (!file) return;

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    alert(`File exceeds ${(MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024)).toFixed(1)} MB limit.`);
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const parsed = parseWorkbook(buffer, { fileName: file.name, sizeBytes: file.size });

    ExcelRuntimeStore.setWorkbook({
      metadata: parsed.metadata,
      sheets: parsed.sheets,
      bufferBase64: parsed.bufferBase64
    });
  } catch (error) {
    console.error('[AttachmentHandler] Failed to parse workbook', error);
    alert('Failed to parse file. Check console for details.');
  }
}

function setupButtons() {
  const downloadOriginalBtn = document.getElementById('attachmentDownloadOriginal');
  const downloadWorkingBtn = document.getElementById('attachmentDownloadWorking');
  const resetBtn = document.getElementById('attachmentReset');
  const removeBtn = document.getElementById('attachmentRemove');

  downloadOriginalBtn?.addEventListener('click', () => {
    const sheets = ExcelRuntimeStore.getOriginal();
    const metadata = ExcelRuntimeStore.getMetadata();
    if (!sheets || !metadata) return;
    downloadWorkbook(sheets, metadata.name.replace(/\.xlsx$/i, '') + '_original.xlsx');
  });

  downloadWorkingBtn?.addEventListener('click', () => {
    const sheets = ExcelRuntimeStore.getWorkingCopy();
    const metadata = ExcelRuntimeStore.getMetadata();
    if (!sheets || !metadata) return;
    downloadWorkbook(sheets, metadata.name.replace(/\.xlsx$/i, '') + '_working.xlsx');
  });

  resetBtn?.addEventListener('click', () => {
    ExcelRuntimeStore.resetWorkingCopy();
    eventBus.emit(Events.EXCEL_ATTACHMENT_RESET);
    emitUpdate('reset');
  });

  removeBtn?.addEventListener('click', () => {
    ExcelRuntimeStore.clearWorkbook();
    eventBus.emit(Events.EXCEL_ATTACHMENT_REMOVED);
    emitUpdate('remove');
  });
}

export function bindAttachmentHandlers() {
  const dropzone = document.getElementById('attachmentDropzone');
  const input = document.getElementById('attachmentInput');

  if (!dropzone || !input) {
    return;
  }

  dropzone.addEventListener('click', () => input.click());

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const file = event.dataTransfer?.files?.[0];
    handleFile(file);
  });

  input.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    input.value = '';
  });

  setupButtons();
}
