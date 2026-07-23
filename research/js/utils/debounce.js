/**
 * Debounce / throttle utilities.
 */
(function (global) {
  "use strict";

  function debounce(fn, wait) {
    let t = null;
    function debounced(...args) {
      const ctx = this;
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        fn.apply(ctx, args);
      }, wait);
    }
    debounced.cancel = function () {
      if (t) clearTimeout(t);
      t = null;
    };
    debounced.flush = function (...args) {
      if (t) {
        clearTimeout(t);
        t = null;
        fn.apply(this, args);
      }
    };
    return debounced;
  }

  function throttle(fn, wait) {
    let last = 0;
    let pending = null;
    return function (...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      const ctx = this;
      if (remaining <= 0) {
        last = now;
        if (pending) {
          clearTimeout(pending);
          pending = null;
        }
        fn.apply(ctx, args);
      } else if (!pending) {
        pending = setTimeout(() => {
          last = Date.now();
          pending = null;
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Debounce = { debounce, throttle };
})(typeof window !== "undefined" ? window : globalThis);
