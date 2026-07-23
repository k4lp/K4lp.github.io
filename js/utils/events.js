/**
 * Tiny pub/sub event bus.
 */
(function (global) {
  "use strict";

  function createBus() {
    const map = new Map();

    return {
      on(event, handler) {
        if (!map.has(event)) map.set(event, new Set());
        map.get(event).add(handler);
        return () => this.off(event, handler);
      },
      off(event, handler) {
        const set = map.get(event);
        if (set) set.delete(handler);
      },
      emit(event, payload) {
        const set = map.get(event);
        if (!set) return;
        for (const h of set) {
          try {
            h(payload);
          } catch (err) {
            console.error("[PaperPDF] event handler error:", event, err);
          }
        }
      },
      once(event, handler) {
        const off = this.on(event, (p) => {
          off();
          handler(p);
        });
        return off;
      },
    };
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Events = { createBus };
  global.PaperPDF.bus = createBus();
})(typeof window !== "undefined" ? window : globalThis);
