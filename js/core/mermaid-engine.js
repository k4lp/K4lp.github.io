/**
 * Mermaid diagram engine — robust async render into the paper DOM.
 *
 * Architecture:
 *   markdown fence ```mermaid → protect() stores source
 *   restore() → placeholder figure with data-mermaid-id
 *   source kept in an in-memory Map (+ base64 attr fallback)
 *   renderAll(root) → mermaid.render → inline SVG
 *
 * Why not data-mermaid-src raw text?
 *   Multi-line / quote / & content in attributes is fragile under
 *   HTML parsing + DOMPurify and often yields empty/broken diagrams.
 */
(function (global) {
  "use strict";

  let initialized = false;
  let initError = null;
  let renderCounter = 0;

  /** @type {Map<string, string>} id → diagram source */
  const sourceRegistry = new Map();

  function isReady() {
    return typeof mermaid !== "undefined" && mermaid != null;
  }

  function getMermaid() {
    if (typeof mermaid !== "undefined" && mermaid) return mermaid;
    if (typeof globalThis !== "undefined" && globalThis.mermaid) return globalThis.mermaid;
    return null;
  }

  /**
   * UTF-8 safe base64 for attribute fallback.
   */
  function encodeSource(src) {
    try {
      return btoa(unescape(encodeURIComponent(String(src))));
    } catch {
      return "";
    }
  }

  function decodeSource(b64) {
    if (!b64) return "";
    try {
      return decodeURIComponent(escape(atob(String(b64))));
    } catch {
      try {
        return atob(String(b64));
      } catch {
        return "";
      }
    }
  }

  /**
   * Normalize diagram text: strip BOM, fences, common HTML entities.
   */
  function normalizeSource(src) {
    let s = String(src || "")
      .replace(/^\uFEFF/, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    // If still wrapped in a fence (paste accidents)
    const fence = s.match(/^```(?:mermaid)?\s*\n([\s\S]*?)```$/i);
    if (fence) s = fence[1].trim();

    // Decode common entities if source was attribute-mangled
    if (/&(?:amp|lt|gt|quot|#39);/i.test(s)) {
      const ta = document.createElement("textarea");
      ta.innerHTML = s;
      s = ta.value;
    }

    return s;
  }

  function init(theme) {
    const m = getMermaid();
    if (!m) {
      initError = "mermaid.js library not loaded";
      return false;
    }
    try {
      // Prefer loose/antiscript so flowchart labels render as SVG text.
      // "strict" + htmlLabels often yields blank or failed diagrams.
      const config = {
        startOnLoad: false,
        securityLevel: "loose",
        theme: theme || "neutral",
        fontFamily:
          '"STIX Two Text", "Libertinus Serif", "Times New Roman", Times, serif',
        // suppressErrorRendering avoids mermaid injecting its own error DOM
        suppressErrorRendering: true,
        flowchart: {
          htmlLabels: false,
          curve: "basis",
          padding: 12,
          nodeSpacing: 45,
          rankSpacing: 45,
          useMaxWidth: true,
        },
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 16,
          diagramMarginY: 12,
          actorMargin: 40,
          mirrorActors: false,
        },
        er: { useMaxWidth: true },
        journey: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        class: { useMaxWidth: true },
        state: { useMaxWidth: true },
        pie: { useMaxWidth: true },
        themeVariables: {
          fontSize: "14px",
          fontFamily:
            "STIX Two Text, Libertinus Serif, Times New Roman, Times, serif",
          primaryColor: "#f4f6f9",
          primaryTextColor: "#111111",
          primaryBorderColor: "#333333",
          lineColor: "#333333",
          secondaryColor: "#e8eef7",
          tertiaryColor: "#ffffff",
          actorBkg: "#f4f6f9",
          actorBorder: "#333333",
          actorTextColor: "#111111",
          signalColor: "#333333",
          signalTextColor: "#111111",
        },
      };

      if (typeof m.initialize === "function") {
        m.initialize(config);
      } else if (m.mermaidAPI && typeof m.mermaidAPI.initialize === "function") {
        m.mermaidAPI.initialize(config);
      }

      initialized = true;
      initError = null;
      return true;
    } catch (err) {
      initError = err.message || String(err);
      console.error("[PaperPDF] mermaid init failed", err);
      return false;
    }
  }

  function ensureInit() {
    if (!initialized) init("neutral");
    return initialized;
  }

  /**
   * Register source and return a capture-safe placeholder figure.
   * Source is NOT put in a raw multi-line attribute.
   */
  function placeholder(index, source) {
    const id =
      "mmd-" +
      String(index) +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8);

    const clean = normalizeSource(source);
    sourceRegistry.set(id, clean);
    const b64 = encodeSource(clean);

    return (
      '<figure class="mermaid-figure no-columns" data-mermaid-index="' +
      index +
      '" data-mermaid-pending="1">' +
      '<div class="mermaid-svg-wrap" id="' +
      escapeAttr(id) +
      '" data-mermaid-id="' +
      escapeAttr(id) +
      '"' +
      (b64 ? ' data-mermaid-b64="' + b64 + '"' : "") +
      ">" +
      '<div class="mermaid-loading" data-pending="true">Rendering diagram…</div>' +
      "</div>" +
      "</figure>"
    );
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveSource(wrap) {
    const id = wrap.getAttribute("data-mermaid-id") || wrap.id;
    if (id && sourceRegistry.has(id)) {
      return normalizeSource(sourceRegistry.get(id));
    }
    const b64 = wrap.getAttribute("data-mermaid-b64");
    if (b64) return normalizeSource(decodeSource(b64));
    // Legacy fallback
    const raw = wrap.getAttribute("data-mermaid-src");
    if (raw) return normalizeSource(raw);
    return "";
  }

  function showError(wrap, message, src) {
    wrap.innerHTML =
      '<div class="mermaid-error" role="alert">' +
      "<strong>Mermaid diagram error</strong>\n" +
      escapeHtml(message || "Unknown error") +
      (src ? "\n\n" + escapeHtml(src) : "") +
      "</div>";
    const fig = wrap.closest(".mermaid-figure");
    if (fig) fig.removeAttribute("data-mermaid-pending");
  }

  /**
   * Call mermaid.render across API variants (v9 / v10 / v11).
   */
  async function renderDiagram(m, uid, src) {
    // Preferred: promise API (v10+)
    if (typeof m.render === "function") {
      const result = m.render(uid, src);
      if (result && typeof result.then === "function") {
        const out = await result;
        if (typeof out === "string") return out;
        if (out && out.svg) return out.svg;
        return String(out || "");
      }
      // Callback-style (older)
      if (typeof result === "string") return result;
    }

    // mermaidAPI.render(id, text, cb)
    if (m.mermaidAPI && typeof m.mermaidAPI.render === "function") {
      return await new Promise((resolve, reject) => {
        try {
          m.mermaidAPI.render(uid, src, (svgCode) => {
            if (!svgCode) reject(new Error("Empty SVG from mermaidAPI.render"));
            else resolve(svgCode);
          });
        } catch (err) {
          reject(err);
        }
      });
    }

    throw new Error("No supported mermaid.render API on this build");
  }

  /**
   * Render all pending mermaid blocks inside root element.
   * @param {ParentNode} root
   * @returns {Promise<{ok:number, fail:number, total:number, reason?: string}>}
   */
  async function renderAll(root) {
    if (!root) return { ok: 0, fail: 0, total: 0, reason: "no-root" };

    const wraps = root.querySelectorAll(".mermaid-svg-wrap[data-mermaid-id], [data-mermaid-b64], [data-mermaid-src]");
    const list = Array.from(wraps);
    if (!list.length) return { ok: 0, fail: 0, total: 0 };

    if (!isReady()) {
      for (const wrap of list) {
        showError(
          wrap,
          initError ||
            "mermaid.js failed to load. Check that lib/mermaid/mermaid.min.js is present."
        );
      }
      return { ok: 0, fail: list.length, total: list.length, reason: "not-ready" };
    }

    if (!ensureInit()) {
      for (const wrap of list) {
        showError(wrap, initError || "mermaid.initialize failed");
      }
      return { ok: 0, fail: list.length, total: list.length, reason: "init-failed" };
    }

    const m = getMermaid();
    let ok = 0;
    let fail = 0;

    for (const wrap of list) {
      // Already has a real SVG (e.g. re-entrant call after success)
      if (wrap.querySelector("svg") && !wrap.querySelector("[data-pending]")) {
        ok++;
        continue;
      }

      const src = resolveSource(wrap);
      if (!src) {
        fail++;
        showError(wrap, "Missing diagram source (registry miss). Re-render the preview.");
        continue;
      }

      // Validate with parse when available (clearer errors)
      try {
        if (typeof m.parse === "function") {
          const parsed = m.parse(src, { suppressErrors: true });
          if (parsed && typeof parsed.then === "function") {
            await parsed;
          }
        }
      } catch (parseErr) {
        // parse may throw on invalid — fall through to render for message
      }

      const uid =
        "mermaid-svg-" +
        ++renderCounter +
        "-" +
        Math.random().toString(36).slice(2, 9);

      try {
        // Remove any leftover error SVG nodes mermaid may have created
        const stale = document.getElementById(uid);
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

        const svg = await renderDiagram(m, uid, src);
        if (!svg || !String(svg).includes("<svg")) {
          throw new Error("Renderer returned no SVG");
        }

        wrap.innerHTML = svg;
        const svgEl = wrap.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("height");
          svgEl.style.maxWidth = "100%";
          svgEl.style.width = "100%";
          svgEl.style.height = "auto";
          svgEl.style.display = "block";
          svgEl.style.margin = "0 auto";
          svgEl.setAttribute("role", "img");
          // Help html2canvas/pdf capture
          if (!svgEl.getAttribute("xmlns")) {
            svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          }
        }

        const fig = wrap.closest(".mermaid-figure");
        if (fig) {
          fig.removeAttribute("data-mermaid-pending");
          fig.setAttribute("data-mermaid-ok", "1");
        }
        ok++;
      } catch (err) {
        fail++;
        console.error("[PaperPDF] mermaid render failed", err, src);
        showError(wrap, err.message || String(err), src);
      }
    }

    return { ok, fail, total: list.length };
  }

  /**
   * Drop registry entries not present in root (optional GC after render).
   */
  function pruneRegistry(root) {
    if (!root) {
      sourceRegistry.clear();
      return;
    }
    const live = new Set();
    root.querySelectorAll("[data-mermaid-id]").forEach((el) => {
      live.add(el.getAttribute("data-mermaid-id"));
    });
    for (const key of sourceRegistry.keys()) {
      if (!live.has(key)) sourceRegistry.delete(key);
    }
  }

  function clearRegistry() {
    sourceRegistry.clear();
  }

  function setTheme(theme) {
    initialized = false;
    init(theme);
  }

  function getRegistrySize() {
    return sourceRegistry.size;
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Mermaid = {
    isReady,
    init,
    ensureInit,
    placeholder,
    renderAll,
    setTheme,
    clearRegistry,
    pruneRegistry,
    getRegistrySize,
    normalizeSource,
  };
})(typeof window !== "undefined" ? window : globalThis);
