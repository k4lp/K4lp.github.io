export const excelCore = {
    parseFile: (file) => {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error('No file provided.'));
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    resolve(workbook);
                } catch (err) {
                    reject(new Error('Failed to parse file.'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsArrayBuffer(file);
        });
    },
    extractData: (worksheet, mapping) => {
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const extracted = [];
        const rows = data.slice(1);

        const columnIndexMap = {};
        for (const key in mapping) {
            const colLetter = mapping[key];
            columnIndexMap[key.replace('-', '')] = colLetter.charCodeAt(0) - 65;
        }

        rows.forEach(row => {
            const newObj = {};
            let hasData = false;
            for (const key in columnIndexMap) {
                const colIndex = columnIndexMap[key];
                if (row[colIndex]) {
                    newObj[key] = row[colIndex];
                    hasData = true;
                }
            }
            if (hasData) extracted.push(newObj);
        });
        return extracted;
    }
};