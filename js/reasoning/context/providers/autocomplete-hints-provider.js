/**
 * AUTOCOMPLETE HINTS PROVIDER
 *
 * Provides intelligent hints to LLM during reasoning to reduce reference errors.
 * Dynamically updates based on current context and iteration.
 *
 * FEATURES:
 * - Context-aware suggestions
 * - Recently used references highlighted
 * - Common patterns detected
 * - Typo prevention
 * - Usage examples
 *
 * WHEN PROVIDED:
 * - After reference errors detected
 * - When LLM attempts vault operations
 * - During code execution steps
 * - At iteration boundaries
 */

import { Storage } from '../../../storage/storage.js';
import { extractVaultReferenceIds } from '../../../config/tool-registry-config.js';

export const autoCompleteHintsProvider = {
    id: 'autoCompleteHints',

    collect({ snapshot, iteration }) {
        // Only provide hints after first iteration or if errors detected
        if (iteration <= 1) {
            return null;
        }

        const vault = Storage.loadVault() || [];
        if (vault.length === 0) {
            return null;
        }

        // Check for recent reference errors
        const pendingError = Storage.loadPendingExecutionError?.();
        const hasReferenceError = pendingError && this._isReferenceError(pendingError);

        // Build hints
        const hints = {
            hasRecentError: hasReferenceError,
            availableRefs: vault.map(v => v.identifier),
            recentlyUsed: this._getRecentlyUsedRefs(),
            commonPatterns: this._detectCommonPatterns(vault),
            suggestions: []
        };

        // Add contextual suggestions
        if (hasReferenceError) {
            hints.suggestions.push(...this._getSuggestionsForError(pendingError, vault));
        }

        return hints;
    },

    format(hints) {
        if (!hints) return null;

        const lines = [];

        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('💡 REFERENCE HINTS (to avoid errors)');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (hints.hasRecentError) {
            lines.push('');
            lines.push('⚠️  PREVIOUS REFERENCE ERROR DETECTED');
            lines.push('   Double-check reference IDs before using them!');
        }

        if (hints.recentlyUsed.length > 0) {
            lines.push('');
            lines.push('📌 RECENTLY USED REFERENCES:');
            hints.recentlyUsed.forEach(ref => {
                lines.push(`   • ${ref} ← Use this exact ID`);
            });
        }

        if (hints.availableRefs.length > 0) {
            lines.push('');
            lines.push('✅ ALL AVAILABLE REFERENCES:');
            hints.availableRefs.forEach(ref => {
                lines.push(`   • ${ref}`);
            });
        }

        if (hints.commonPatterns.length > 0) {
            lines.push('');
            lines.push('🔍 COMMON PATTERNS DETECTED:');
            hints.commonPatterns.forEach(pattern => {
                lines.push(`   • ${pattern}`);
            });
        }

        if (hints.suggestions.length > 0) {
            lines.push('');
            lines.push('💭 SUGGESTIONS:');
            hints.suggestions.forEach(suggestion => {
                lines.push(`   • ${suggestion}`);
            });
        }

        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return lines.join('\n');
    },

    /**
     * Check if error is reference-related
     * @private
     */
    _isReferenceError(error) {
        if (!error || !error.errorMessage) return false;

        const errorMsg = error.errorMessage.toLowerCase();
        return errorMsg.includes('vault') ||
               errorMsg.includes('reference') ||
               errorMsg.includes('identifier') ||
               errorMsg.includes('not found') ||
               errorMsg.includes('undefined');
    },

    /**
     * Get recently used references from execution log
     * @private
     */
    _getRecentlyUsedRefs() {
        const executionLog = Storage.loadExecutionLog?.() || [];
        const recent = executionLog.slice(-5); // Last 5 executions

        const refs = new Set();

        recent.forEach(entry => {
            if (entry.code) {
                const extractedRefs = extractVaultReferenceIds(entry.code);
                extractedRefs.forEach(ref => refs.add(ref));
            }
        });

        return Array.from(refs);
    },

    /**
     * Detect common patterns in vault identifiers
     * @private
     */
    _detectCommonPatterns(vault) {
        const patterns = [];

        // Group by prefix
        const prefixes = new Map();
        vault.forEach(entry => {
            const parts = entry.identifier.split('_');
            if (parts.length > 1) {
                const prefix = parts[0];
                if (!prefixes.has(prefix)) {
                    prefixes.set(prefix, []);
                }
                prefixes.get(prefix).push(entry.identifier);
            }
        });

        // Report patterns with 2+ entries
        prefixes.forEach((ids, prefix) => {
            if (ids.length >= 2) {
                patterns.push(`IDs starting with "${prefix}_": ${ids.join(', ')}`);
            }
        });

        return patterns;
    },

    /**
     * Get suggestions for error recovery
     * @private
     */
    _getSuggestionsForError(error, vault) {
        const suggestions = [];

        // Try to find the attempted reference
        if (error.code) {
            const attemptedRefs = extractVaultReferenceIds(error.code);

            attemptedRefs.forEach(attemptedRef => {
                // Check if it exists
                const exists = vault.some(v => v.identifier === attemptedRef);

                if (!exists) {
                    // Try to find similar references
                    const similar = this._findSimilarReferences(attemptedRef, vault);

                    if (similar.length > 0) {
                        suggestions.push(
                            `You tried "${attemptedRef}" (not found). Did you mean: ${similar.join(', ')}?`
                        );
                    } else {
                        suggestions.push(
                            `Reference "${attemptedRef}" does not exist. Check the available references list.`
                        );
                    }
                }
            });
        }

        if (suggestions.length === 0) {
            suggestions.push('Verify all reference IDs exist before using them');
            suggestions.push('Use autocomplete by checking the available references list');
        }

        return suggestions;
    },

    /**
     * Find similar references using Levenshtein distance
     * @private
     */
    _findSimilarReferences(attempted, vault, threshold = 3) {
        const similar = [];

        vault.forEach(entry => {
            const distance = this._levenshteinDistance(attempted, entry.identifier);
            if (distance <= threshold) {
                similar.push(entry.identifier);
            }
        });

        return similar;
    },

    /**
     * Calculate Levenshtein distance between two strings
     * @private
     */
    _levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
};

export default autoCompleteHintsProvider;
