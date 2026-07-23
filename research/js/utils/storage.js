/**
 * LocalStorage helpers for document + settings persistence.
 */
(function (global) {
  "use strict";

  const PREFIX = "paperpdf.v1.";

  function key(k) {
    return PREFIX + k;
  }

  function get(k, fallback) {
    try {
      const raw = localStorage.getItem(key(k));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function set(k, value) {
    try {
      localStorage.setItem(key(k), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function remove(k) {
    try {
      localStorage.removeItem(key(k));
    } catch {
      /* ignore */
    }
  }

  function getRaw(k, fallback) {
    try {
      const raw = localStorage.getItem(key(k));
      return raw == null ? fallback : raw;
    } catch {
      return fallback;
    }
  }

  function setRaw(k, value) {
    try {
      localStorage.setItem(key(k), value);
      return true;
    } catch {
      return false;
    }
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Storage = { get, set, remove, getRaw, setRaw, key };
})(typeof window !== "undefined" ? window : globalThis);
