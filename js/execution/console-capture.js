/**
 * ConsoleCapture
 *
 * Small utility that temporarily redirects console methods and records
 * every call. Designed to be exception-safe so the original console is
 * always restored even if execution throws halfway through.
 */

import { nowISO } from '../core/utils.js';

const CONSOLE_METHODS = ['log', 'error', 'warn', 'info', 'debug'];

export class ConsoleCapture {
  constructor() {
    this._original = null;
    this._entries = [];
    this._active = false;
  }

  /**
   * Start intercepting console output.
   */
  start() {
    if (this._active) {
      return;
    }

    this._entries = [];
    this._original = {};

    CONSOLE_METHODS.forEach((method) => {
      this._original[method] = console[method];
      console[method] = (...args) => {
        this._entries.push({
          type: method,
          message: this._stringify(args),
          raw: args,
          timestamp: nowISO()
        });

        if (typeof this._original[method] === 'function') {
          this._original[method].apply(console, args);
        }
      };
    });

    this._active = true;
  }

  /**
   * Stop capturing and restore the original console methods.
   */
  stop() {
    if (!this._active) {
      return;
    }

    CONSOLE_METHODS.forEach((method) => {
      if (this._original?.[method]) {
        console[method] = this._original[method];
      }
    });

    this._original = null;
    this._active = false;
  }

  /**
   * Retrieve captured log entries.
   */
  entries() {
    return [...this._entries];
  }

  /**
   * Utility to format console arguments.
   * @private
   */
  _stringify(args) {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;

        // Handle Error objects specially (Error properties are non-enumerable)
        if (arg instanceof Error) {
          const errorObj = {
            name: arg.name,
            message: arg.message,
            stack: arg.stack
          };
          // Include any additional enumerable properties
          Object.keys(arg).forEach(key => {
            errorObj[key] = arg[key];
          });
          return JSON.stringify(errorObj, null, 2);
        }

        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }
}

