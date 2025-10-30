/**
 * Browser Execution Engine
 * Simple async execution with context injection
 */

export class BrowserExecutionEngine {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000;
    this.capturedLogs = [];
    this.originalConsole = null;
  }

  async execute(code, context = {}) {
    const startTime = Date.now();
    this.capturedLogs = [];

    this._startConsoleCapture();

    try {
      const result = await this._execute(code, context);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        output: result !== undefined ? String(result) : '',
        logs: this.capturedLogs,
        error: null,
        executionTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        result: null,
        output: '',
        logs: this.capturedLogs,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        executionTime,
        timestamp: new Date().toISOString()
      };

    } finally {
      this._stopConsoleCapture();
    }
  }

  async _execute(code, context) {
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    const wrapper = `
      (async () => {
        let __result__;
        try {
          __result__ = (${code.trim()});
          return __result__;
        } catch (__exprError__) {
          ${code}
        }
      })()
    `;

    const fn = new Function(...contextKeys, `return ${wrapper}`);
    const promise = fn(...contextValues);
    return await this._withTimeout(promise);
  }

  async _withTimeout(promise) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Execution timeout (${this.timeout}ms)`)),
        this.timeout
      );
    });

    return await Promise.race([promise, timeoutPromise]);
  }

  async cleanup() {
    this._stopConsoleCapture();
    this.capturedLogs = [];
  }

  _startConsoleCapture() {
    this.capturedLogs = [];

    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };

    const captureFunction = (type) => (...args) => {
      this.capturedLogs.push({
        type,
        message: args.map(arg => this._formatLogArg(arg)).join(' ')
      });
      this.originalConsole[type](...args);
    };

    console.log = captureFunction('log');
    console.error = captureFunction('error');
    console.warn = captureFunction('warn');
    console.info = captureFunction('info');
    console.debug = captureFunction('debug');
  }

  _stopConsoleCapture() {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
      console.info = this.originalConsole.info;
      console.debug = this.originalConsole.debug;
      this.originalConsole = null;
    }
  }

  _formatLogArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';

    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }

    return String(arg);
  }
}
