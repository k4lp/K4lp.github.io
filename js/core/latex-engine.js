/**
 * KaTeX math rendering engine.
 */
(function (global) {
  "use strict";

  function isReady() {
    return typeof katex !== "undefined";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Render a single TeX string to HTML.
   * @param {string} tex
   * @param {boolean} displayMode
   * @returns {string} HTML
   */
  function render(tex, displayMode) {
    if (!isReady()) {
      const tag = displayMode ? "div" : "span";
      return (
        "<" +
        tag +
        ' class="math-fallback" style="font-family:serif;font-style:italic">' +
        escapeHtml(tex) +
        "</" +
        tag +
        ">"
      );
    }

    try {
      const html = katex.renderToString(tex, {
        displayMode: !!displayMode,
        throwOnError: false,
        strict: "ignore",
        trust: false,
        output: "html",
        macros: {
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}",
          "\\Q": "\\mathbb{Q}",
          "\\C": "\\mathbb{C}",
          "\\E": "\\mathbb{E}",
          "\\Var": "\\operatorname{Var}",
          "\\Cov": "\\operatorname{Cov}",
          "\\eps": "\\varepsilon",
        },
      });
      if (displayMode) {
        return '<div class="katex-display-wrap">' + html + "</div>";
      }
      return html;
    } catch (err) {
      return (
        '<span class="math-error" title="' +
        escapeHtml(err.message || "Math error") +
        '">' +
        escapeHtml(tex) +
        "</span>"
      );
    }
  }

  /**
   * Auto-render math in a DOM element (for leftover delimiters).
   */
  function renderElement(el) {
    if (!isReady() || !el) return;
    if (typeof renderMathInElement === "function") {
      renderMathInElement(el, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
        strict: "ignore",
      });
    }
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.LaTeX = {
    isReady,
    render,
    renderElement,
  };
})(typeof window !== "undefined" ? window : globalThis);
