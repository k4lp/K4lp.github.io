/**
 * Code Resolver
 * Resolves vault references in code
 */

import { expandVaultReferences } from '../../utils/vault-reference-resolver.js';

export function resolveVaultReferences(code) {
    return expandVaultReferences(code || '');
}
