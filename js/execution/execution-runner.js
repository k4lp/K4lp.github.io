/**
 * Execution Runner
 * Orchestrates code execution with preparation, resolution, and runtime
 */

import { ConsoleCapture } from './console-capture.js';
import { nowISO } from '../core/utils.js';
import { EXECUTION_DEFAULT_TIMEOUT_MS } from '../config/execution-config.js';
import { analyseCode } from './preparation/code-analyzer.js';
import { resolveVaultReferences } from './preparation/code-resolver.js';
import { executeWithTimeout } from './runtime/code-executor.js';

export class ExecutionRunner {
    constructor(options = {}) {
        this.timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : EXECUTION_DEFAULT_TIMEOUT_MS;
    }

    async run(request) {
        const capture = new ConsoleCapture();
        const analysis = analyseCode(request.code || '');

        // Resolve vault references
        const expansion = resolveVaultReferences(request.code || '');
        const resolvedCode = expansion.resolvedCode;
        const vaultRefs = expansion.vaultRefs;

        const startedAt = Date.now();
        capture.start();

        try {
            const value = await executeWithTimeout(resolvedCode, this.timeoutMs);
            const duration = Date.now() - startedAt;

            return {
                success: true,
                value,
                logs: capture.entries(),
                resolvedCode,
                analysis: { ...analysis, vaultRefs },
                duration,
                finishedAt: nowISO(),
                startedAt: new Date(startedAt).toISOString()
            };
        } catch (error) {
            const duration = Date.now() - startedAt;
            return {
                success: false,
                error,
                logs: capture.entries(),
                resolvedCode,
                analysis: { ...analysis, vaultRefs },
                duration,
                finishedAt: nowISO(),
                startedAt: new Date(startedAt).toISOString()
            };
        } finally {
            capture.stop();
        }
    }
}
