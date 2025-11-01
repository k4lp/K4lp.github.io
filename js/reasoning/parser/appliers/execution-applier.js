/**
 * Execution Applier
 * Handles JavaScript execution
 */

import { JSExecutor } from '../../../execution/js-executor.js';
import { appendActivity } from './applier-helpers.js';

export async function processExecutionBlocks(codeBlocks, summary) {
    for (const code of codeBlocks) {
        const result = { code: code.substring(0, 100), status: 'pending' };

        try {
            const execResult = await JSExecutor.executeCode(code, 'auto');
            result.status = execResult.success ? 'success' : 'error';
            result.output = execResult.logs.join('\n');
            if (execResult.error) {
                result.error = execResult.error;
                summary.errors.push({
                    type: 'execution',
                    id: 'code_block',
                    message: execResult.error
                });
            }

            appendActivity({
                type: 'execution',
                action: 'run',
                id: 'code_block',
                status: result.status
            });
        } catch (error) {
            result.status = 'error';
            result.error = error.message;
            summary.errors.push({
                type: 'execution',
                id: 'code_block',
                message: error.message
            });
        }

        summary.executions.push(result);
    }
}
