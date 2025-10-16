/*!
 * Excel Core Engine
 *
 * Handles file parsing and data extraction using the xlsx.js library.
 */
export const excelCore = {
    /**
     * Parses an uploaded file (Excel or CSV).
     * @param {File} file - The file object from a file input or drag-drop event.
     * @returns {Promise<Object>} A promise that resolves with the XLSX workbook object.
     */
    parseFile: (file) => {
        return new Promise((resolve, reject) => {
            if (!file) {
                return reject(new Error('No file provided.'));
            }

            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                } catch (err) {
                    console.error('Error parsing file:', err);
                    reject(new Error('Failed to parse the file. It might be corrupt or in an unsupported format.'));
                }
            };

            reader.onerror = (err) => {
                console.error('FileReader error:', err);
                reject(new Error('Failed to read the file.'));
            };

            reader.readAsArrayBuffer(file);
        });
    }
};