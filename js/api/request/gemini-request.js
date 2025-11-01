/**
 * Gemini Request
 * Makes actual API requests to Gemini
 */

import { Storage } from '../../storage/storage.js';

export const GeminiRequest = {
    async makeRequest(modelId, prompt, keyInfo) {
        const cleanModelId = modelId.startsWith('models/') ? modelId : `models/${modelId}`;
        const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModelId}:generateContent?key=${encodeURIComponent(keyInfo.key)}`;

        const maxOutputTokens = Storage.loadMaxOutputTokens();

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.7,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: maxOutputTokens
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (resp.status === 429) {
            throw new Error('Rate limited (429)');
        }

        if (resp.status === 401 || resp.status === 403) {
            throw new Error('Invalid API key (401/403)');
        }

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${errorText}`);
        }

        const data = await resp.json();

        if (!data) {
            throw new Error('Empty response from API');
        }

        if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
            throw new Error('Empty response: No candidates returned');
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('Empty response: No content in candidate');
        }

        const textParts = candidate.content.parts.map(p => p.text || '').join('').trim();
        if (!textParts) {
            throw new Error('Empty response: No text content');
        }

        return data;
    },

    async fetchModelList(apiKey) {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' +
            encodeURIComponent(apiKey);

        const resp = await fetch(url);

        if (resp.status === 429) {
            throw new Error('Rate limited (429)');
        }

        if (!resp.ok) {
            if (resp.status === 401 || resp.status === 403) {
                throw new Error('Invalid API key');
            }
            throw new Error(`HTTP ${resp.status}`);
        }

        return await resp.json();
    },

    extractResponseText(response) {
        if (!response || !response.candidates || !response.candidates[0]) {
            return '';
        }
        const parts = response.candidates[0].content?.parts || [];
        return parts.map(p => p.text || '').join('\n').trim();
    }
};
