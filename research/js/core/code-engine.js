/**
 * Syntax highlighting via highlight.js.
 */
(function (global) {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isReady() {
    return typeof hljs !== "undefined";
  }

  function render(code, lang) {
    const language = (lang || "").trim().toLowerCase();
    let highlighted = escapeHtml(code);
    let cls = "hljs";

    if (isReady()) {
      try {
        if (language && hljs.getLanguage(language)) {
          highlighted = hljs.highlight(code, { language }).value;
          cls += " language-" + language;
        } else {
          const auto = hljs.highlightAuto(code);
          highlighted = auto.value;
          if (auto.language) cls += " language-" + auto.language;
        }
      } catch {
        highlighted = escapeHtml(code);
      }
    }

    return (
      '<pre class="code-block"><code class="' +
      cls +
      '">' +
      highlighted +
      "</code></pre>"
    );
  }

  function highlightElement(root) {
    if (!isReady() || !root) return;
    root.querySelectorAll("pre code").forEach((block) => {
      try {
        hljs.highlightElement(block);
      } catch {
        /* ignore */
      }
    });
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Code = {
    isReady,
    render,
    highlightElement,
  };
})(typeof window !== "undefined" ? window : globalThis);
