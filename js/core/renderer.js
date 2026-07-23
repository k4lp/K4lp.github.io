/**
 * Orchestrates markdown → paper DOM preview.
 */
(function (global) {
  "use strict";

  const PP = () => global.PaperPDF;

  let lastResult = null;
  let renderSeq = 0;

  function engines() {
    return {
      latex: PP().LaTeX,
      code: PP().Code,
      mermaid: PP().Mermaid,
    };
  }

  /**
   * Build paper document element HTML string for current preset + markdown.
   */
  function buildDocumentHtml(markdown, preset, options) {
    const result = PP().Markdown.convert(markdown, engines());
    lastResult = result;

    const classes = PP().Presets.documentClasses(preset);
    const opts = options || {};

    let extraClass = "";
    if (opts.extraClass) extraClass = " " + opts.extraClass;

    return {
      outer:
        '<div class="paper-sheet"><article class="' +
        classes +
        extraClass +
        '" id="paper-document">' +
        result.html +
        "</article></div>",
      result,
    };
  }

  /**
   * Apply CSS variables for preset onto documentElement and paper node.
   */
  function applyStyles(preset, overrides) {
    const root = document.documentElement;
    PP().Presets.applyPresetToElement(root, preset, overrides);
    const paper = document.getElementById("paper-document");
    if (paper) {
      PP().Presets.applyPresetToElement(paper, preset, overrides);
      paper.className = PP().Presets.documentClasses(
        Object.assign({}, preset, overrides || {})
      );
    }
  }

  /**
   * Full render into preview canvas.
   */
  async function renderToPreview(markdown, preset, overrides, options) {
    const seq = ++renderSeq;
    const canvas = document.getElementById("preview-canvas");
    if (!canvas) return null;

    const merged = Object.assign({}, preset, overrides || {});
    if (overrides && overrides.margins) {
      merged.margins = Object.assign({}, preset.margins, overrides.margins);
    }

    try {
      const { outer, result } = buildDocumentHtml(markdown, merged, options);

      if (seq !== renderSeq) return null; // stale

      canvas.innerHTML = outer;

      // Apply styles
      applyStyles(preset, overrides);

      // Re-apply classes with merged preset
      const paper = document.getElementById("paper-document");
      if (paper) {
        paper.className = PP().Presets.documentClasses(merged);
        PP().Presets.applyPresetToElement(paper, merged);
      }

      // Mermaid (async SVG fill — must run after DOM is in the canvas)
      let mermaidStats = { ok: 0, fail: 0, total: 0 };
      try {
        mermaidStats = await PP().Mermaid.renderAll(canvas);
        if (mermaidStats.fail > 0) {
          console.warn(
            "[PaperPDF] mermaid:",
            mermaidStats.ok,
            "ok,",
            mermaidStats.fail,
            "failed of",
            mermaidStats.total
          );
        }
      } catch (mErr) {
        console.error("[PaperPDF] mermaid renderAll threw", mErr);
        mermaidStats = { ok: 0, fail: 1, total: 1, reason: mErr.message };
      }
      if (seq !== renderSeq) return null;

      // Page estimate (after diagrams affect height)
      updatePageEstimate(merged);

      // Status line hint when diagrams fail
      if (mermaidStats.total > 0 && mermaidStats.fail > 0 && PP().DOM && PP().DOM.setStatus) {
        PP().DOM.setStatus(
          "Mermaid: " + mermaidStats.ok + " ok, " + mermaidStats.fail + " failed",
          "warn"
        );
      }

      PP().bus.emit("render:done", {
        result,
        mermaidStats,
        wordCount: countWords(markdown),
      });

      return { result, mermaidStats };
    } catch (err) {
      console.error("[PaperPDF] render failed", err);
      canvas.innerHTML =
        '<div class="preview-error">Render error: ' +
        PP().Markdown.escapeHtml(err.message || String(err)) +
        "</div>";
      PP().bus.emit("render:error", err);
      return null;
    }
  }

  function countWords(text) {
    const plain = String(text || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\$\$[\s\S]*?\$\$/g, " ")
      .replace(/\$[^$]+\$/g, " ")
      .replace(/[#>*_~`\[\]()!-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return 0;
    return plain.split(" ").filter(Boolean).length;
  }

  function countChars(text) {
    return String(text || "").length;
  }

  /**
   * Rough page estimate from content height vs page content box.
   */
  function updatePageEstimate(preset) {
    const badge = document.getElementById("page-estimate");
    const paper = document.getElementById("paper-document");
    if (!paper) return;

    const pageH = parseLengthToPx(preset.height || "11in");
    const mt = parseLengthToPx(preset.margins.top);
    const mb = parseLengthToPx(preset.margins.bottom);
    const contentH = Math.max(1, pageH - mt - mb);
    const scrollH = paper.scrollHeight;
    const pages = Math.max(1, Math.ceil(scrollH / contentH));

    if (badge) {
      badge.textContent =
        pages + " page" + (pages === 1 ? "" : "s") + " (estimate)";
    }

    const pageStat = document.getElementById("stat-pages");
    if (pageStat) pageStat.textContent = String(pages);

    return pages;
  }

  function parseLengthToPx(val) {
    if (val == null) return 0;
    const s = String(val).trim();
    const m = s.match(/^([\d.]+)\s*(in|mm|cm|px|pt)?$/i);
    if (!m) return parseFloat(s) || 0;
    const n = parseFloat(m[1]);
    const u = (m[2] || "px").toLowerCase();
    const dpi = 96;
    switch (u) {
      case "in":
        return n * dpi;
      case "cm":
        return (n / 2.54) * dpi;
      case "mm":
        return (n / 25.4) * dpi;
      case "pt":
        return (n / 72) * dpi;
      default:
        return n;
    }
  }

  /**
   * Clone the paper document for export (deep clone with SVG).
   * Strips preview-only chrome (zoom transforms live on .paper-sheet parent,
   * which we intentionally do not clone).
   */
  function cloneForExport() {
    const paper = document.getElementById("paper-document");
    if (!paper) return null;
    const clone = paper.cloneNode(true);
    clone.id = "paper-document-export";
    // Drop preview inline styles that can pollute capture geometry
    clone.removeAttribute("style");
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.boxShadow = "none";
    clone.style.transform = "none";
    clone.style.position = "relative";
    clone.style.left = "0";
    clone.style.top = "0";
    // Normalize mermaid / SVG presentation attributes that can overflow
    clone.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      if (!svg.getAttribute("xmlns")) {
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      svg.style.maxWidth = "100%";
      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      svg.style.margin = "0 auto";
    });
    // Drop loading placeholders if any left
    clone.querySelectorAll(".mermaid-loading, [data-pending]").forEach((el) => {
      if (!el.closest("svg")) el.remove();
    });
    return clone;
  }

  function getLastResult() {
    return lastResult;
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Renderer = {
    buildDocumentHtml,
    applyStyles,
    renderToPreview,
    countWords,
    countChars,
    updatePageEstimate,
    cloneForExport,
    getLastResult,
    parseLengthToPx,
  };
})(typeof window !== "undefined" ? window : globalThis);
