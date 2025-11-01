/**
 * Response Parser
 *
 * Parses and validates API responses
 */

/**
 * Parse API response and extract text
 * @param {Object} response - API response object
 * @returns {string} Extracted text content
 * @throws {Error} If response is invalid or empty
 */
export function parseResponse(response) {
    if (!response) {
        throw new Error('Empty response from API');
    }

    if (!response.candidates || !Array.isArray(response.candidates) || response.candidates.length === 0) {
        throw new Error('Empty response: No candidates returned');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Empty response: No content in candidate');
    }

    const textParts = candidate.content.parts.map(p => p.text || '').join('').trim();
    if (!textParts) {
        throw new Error('Empty response: No text content');
    }

    return textParts;
}

/**
 * Extract response text (for backward compatibility)
 * @param {Object} response - API response
 * @returns {string} Extracted text
 */
export function extractResponseText(response) {
    if (!response || !response.candidates || !response.candidates[0]) {
        return '';
    }
    const parts = response.candidates[0].content?.parts || [];
    return parts.map(p => p.text || '').join('\n').trim();
}

/**
 * Validate response structure
 * @param {Object} response - API response
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export function validateResponse(response) {
    if (!response) {
        return { isValid: false, error: 'Null or undefined response' };
    }

    if (!response.candidates) {
        return { isValid: false, error: 'No candidates in response' };
    }

    if (!Array.isArray(response.candidates) || response.candidates.length === 0) {
        return { isValid: false, error: 'Empty candidates array' };
    }

    const candidate = response.candidates[0];
    if (!candidate.content) {
        return { isValid: false, error: 'No content in first candidate' };
    }

    if (!candidate.content.parts || candidate.content.parts.length === 0) {
        return { isValid: false, error: 'No parts in content' };
    }

    return { isValid: true, error: null };
}

export default {
    parseResponse,
    extractResponseText,
    validateResponse,
};
