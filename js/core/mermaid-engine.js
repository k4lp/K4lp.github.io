/**
 * Mermaid diagram engine — robust async render into the paper DOM.
 */
(function (global) {
  "use strict";

  let initialized = false;
  let renderCounter = 0;

  function isReady() {
    return typeof mermaid !== "undefined";
  }

  function init(theme) {
    if (!isReady()) return false;
    try {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme || "neutral",
        fontFamily: "STIX Two Text, Libertinus Serif, Times New Roman, serif",
        flowchart: {
          htmlLabels: true,
          curve: "basis",
          padding: 12,
          nodeSpacing: 40,
          rankSpacing: 40,
          useMaxWidth: true,
        },
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 12,
          diagramMarginY: 12,
        },
        er: { useMaxWidth: true },
        journey: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        themeVariables: {
          fontSize: "14px",
          primaryColor: "#f5f7fa",
          primaryTextColor: "#111",
          primaryBorderColor: "#333",
          lineColor: "#333",
          secondaryColor: "#e8eef7",
          tertiaryColor: "#fff",
        },
      });
      initialized = true;
      return true;
    } catch (err) {
      console.error("[PaperPDF] mermaid init failed", err);
      return false;
    }
  }

  function ensureInit() {
    if (!initialized) init("neutral");
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  /**
   * Insert a placeholder figure; actual SVG filled by renderAll().
   */
  function placeholder(index, source) {
    const id = "mermaid-fig-" + index + "-" + Date.now().toString(36);
    return (
      '<figure class="mermaid-figure" data-mermaid-index="' +
      index +
      '">' +
      '<div class="mermaid-svg-wrap" id="' +
      id +
      '" data-mermaid-id="' +
      id +
      '" data-mermaid-src="' +
      escapeAttr(source) +
      '">' +
      '<div class="mermaid" data-pending="true">' +
      escapeHtml(source) +
      "</div>" +
      "</div>" +
      "</figure>"
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Render all pending mermaid blocks inside root element.
   */
  async function renderAll(root) {
    if (!root || !isReady()) return { ok: 0, fail: 0 };
    ensureInit();

    const nodes = root.querySelectorAll("[data-mermaid-src]");
    let ok = 0;
    let fail = 0;

    for (const wrap of nodes) {
      const src = wrap.getAttribute("data-mermaid-src");
      if (!src) continue;

      // Already rendered SVG?
      if (wrap.querySelector("svg") && !wrap.querySelector("[data-pending]")) {
        ok++;
        continue;
      }

      const uid = "mmd-" + ++renderCounter + "-" + Math.random().toString(36).slice(2, 8);
      try {
        const { svg } = await mermaid.render(uid, src);
        wrap.innerHTML = svg;
        const svgEl = wrap.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("height");
          svgEl.style.maxWidth = "100%";
          svgEl.style.height = "auto";
          // Ensure white/transparent bg for print
          if (!svgEl.getAttribute("style")?.includes("background")) {
            svgEl.style.background = "transparent";
          }
        }
        ok++;
      } catch (err) {
        fail++;
        wrap.innerHTML =
          '<div class="mermaid-error">Mermaid diagram error:\n' +
          escapeHtml(err.message || String(err)) +
          "\n\n" +
          escapeHtml(src) +
          "</div>";
      }
    }

    return { ok, fail };
  }

  /**
   * Re-init with a different theme (e.g. for dark preview — papers stay neutral).
   */
  function setTheme(theme) {
    initialized = false;
    init(theme);
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Mermaid = {
    isReady,
    init,
    placeholder,
    renderAll,
    setTheme,
  };
})(typeof window !== "undefined" ? window : globalThis);
