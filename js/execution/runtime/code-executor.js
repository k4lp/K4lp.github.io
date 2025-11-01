/**
 * Code Executor
 * Executes JavaScript code with injected context APIs and timeout protection
 */

import { buildExecutionContext } from '../execution-context-api.js';
import { runWithTimeout } from './timeout-manager.js';

export async function executeWithTimeout(resolvedCode, timeoutMs) {
    let runner;

    // Build the execution context with all APIs
    const context = buildExecutionContext();

    // Normalize the code to handle both raw scripts and async IIFEs
    let codeToRun = resolvedCode.trim();
    const isAsyncIIFE = codeToRun.startsWith('(async ()') && codeToRun.endsWith('})();');

    // If it's NOT an IIFE, wrap it in one so it can be awaited.
    if (!isAsyncIIFE) {
        codeToRun = '(async () => {\n' +
                    `  ${codeToRun}\n` +
                    '})()';
    }

    try {
        // Create function with injected context parameters
        // The executed code can access: vault, memory, tasks, goals, utils
        runner = new Function(
            'vault', 'memory', 'tasks', 'goals', 'utils',
            '"use strict";\n' +
            'return (async () => {\n' +
            `  return await ${codeToRun};\n` +
            '})();'
        );
    } catch (error) {
        error.message = `Compilation failed: ${error.message}`;
        throw error;
    }

    // Execute with context APIs injected
    const promise = runner(
        context.vault,
        context.memory,
        context.tasks,
        context.goals,
        context.utils
    );

    return timeoutMs
        ? await runWithTimeout(promise, timeoutMs)
        : promise;
}
