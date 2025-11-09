/**
 * Build XLSX workbooks from in-memory JSON data and trigger downloads.
 */
export function buildWorkbookBlob(sheets) {
  if (typeof XLSX === 'undefined') {
    throw new Error('SheetJS (XLSX) library not loaded.');
  }

  const workbook = XLSX.utils.book_new();

  Object.entries(sheets || {}).forEach(([sheetName, sheetData]) => {
    const rows = sheetData?.rows || [];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
  });

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadWorkbook(sheets, fileName = 'attachment.xlsx') {
  const blob = buildWorkbookBlob(sheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
