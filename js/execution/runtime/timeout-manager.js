/**
 * Timeout Manager
 * Runs promises with timeout enforcement
 */

export function runWithTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let timer = null;

        const clear = () => {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        };

        if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
            timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    reject(new Error(`Execution timed out after ${timeoutMs}ms`));
                }
            }, timeoutMs);
        }

        promise.then(
            (value) => {
                if (!settled) {
                    settled = true;
                    clear();
                    resolve(value);
                }
            },
            (error) => {
                if (!settled) {
                    settled = true;
                    clear();
                    reject(error);
                }
            }
        );
    });
}
