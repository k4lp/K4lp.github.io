/**
 * Code Analyzer
 * Produces static metrics about code snippets
 */

export function analyseCode(rawCode) {
    const normalized = typeof rawCode === 'string' ? rawCode : '';
    const trimmed = normalized.trim();
    const lineCount = trimmed.length === 0 ? 0 : trimmed.split(/\r?\n/).length;

    return {
        charCount: normalized.length,
        lineCount
    };
}
