/**
 * PDF export via html2pdf.js and browser print.
 *
 * Layout physics (see docs/PDF_LAYOUT.md):
 *   page box  = physical paper size
 *   content box = page − margins  (what we rasterize)
 *   jsPDF margins place the raster into the page — do NOT also
 *   pad the clone to full page width (that caused right-shift / clip).
 *
 * Capture host sits at fixed (0,0) with opacity 0 — never left:-99999px
 * (html2canvas origin bugs).
 */
(function (global) {
  "use strict";

  const PP = () => global.PaperPDF;
  /** CSS reference DPI used by browsers for in/pt/mm → px */
  const CSS_DPI = 96;

  /* ─────────────────── geometry ─────────────────── */

  /**
   * Parse a CSS length to inches.
   * @param {string|number} val
   * @returns {number}
   */
  function toInches(val) {
    if (val == null || val === "") return 0;
    if (typeof val === "number" && Number.isFinite(val)) return val;
    const s = String(val).trim();
    const m = s.match(/^([\d.]+)\s*(in|mm|cm|pt|px)?$/i);
    if (!m) {
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    }
    const n = parseFloat(m[1]);
    const u = (m[2] || "in").toLowerCase();
    switch (u) {
      case "in":
        return n;
      case "mm":
        return n / 25.4;
      case "cm":
        return n / 2.54;
      case "pt":
        return n / 72;
      case "px":
        return n / CSS_DPI;
      default:
        return n;
    }
  }

  function inchesToPx(inches) {
    return inches * CSS_DPI;
  }

  /**
   * Full page + content-box geometry for a preset.
   * This is the single source of truth for export layout.
   *
   * @param {object} preset
   * @returns {{
   *   pageW: number, pageH: number,
   *   margin: {top:number,right:number,bottom:number,left:number},
   *   contentW: number, contentH: number,
   *   pageWpx: number, pageHpx: number,
   *   contentWpx: number, contentHpx: number,
   *   format: string
   * }}
   */
  function layoutGeometry(preset) {
    const pageW = toInches(preset.width) || 8.5;
    const pageH = toInches(preset.height) || 11;
    const margin = {
      top: toInches(preset.margins && preset.margins.top) || 1,
      right: toInches(preset.margins && preset.margins.right) || 1,
      bottom: toInches(preset.margins && preset.margins.bottom) || 1,
      left: toInches(preset.margins && preset.margins.left) || 1,
    };
    // Guard insane margins
    const contentW = Math.max(1, pageW - margin.left - margin.right);
    const contentH = Math.max(1, pageH - margin.top - margin.bottom);

    return {
      pageW,
      pageH,
      margin,
      contentW,
      contentH,
      pageWpx: inchesToPx(pageW),
      pageHpx: inchesToPx(pageH),
      contentWpx: inchesToPx(contentW),
      contentHpx: inchesToPx(contentH),
      format: paperFormat(preset),
    };
  }

  function paperFormat(preset) {
    const w = String(preset.width || "").toLowerCase();
    const h = String(preset.height || "").toLowerCase();
    if (w.includes("210") || preset.paperSize === "a4") return "a4";
    if (preset.paperSize === "a5") return "a5";
    if (preset.paperSize === "legal" || h.includes("14")) return "legal";
    return "letter";
  }

  /* ─────────────────── UI chrome ─────────────────── */

  function showOverlay(msg) {
    const o = document.getElementById("export-overlay");
    if (!o) return;
    o.classList.add("visible");
    const t = o.querySelector(".export-msg");
    if (t) t.textContent = msg || "Generating PDF…";
  }

  function hideOverlay() {
    const o = document.getElementById("export-overlay");
    if (o) o.classList.remove("visible");
  }

  /* ─────────────────── asset settle ─────────────────── */

  async function waitForAssets(root) {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
    }
    const imgs = root ? root.querySelectorAll("img") : [];
    await Promise.all(
      Array.from(imgs).map(
        (img) =>
          new Promise((res) => {
            if (img.complete) return res();
            img.onload = img.onerror = () => res();
            setTimeout(res, 4000);
          })
      )
    );
    // Double rAF so layout + paint settle after style application
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await new Promise((r) => setTimeout(r, 80));
  }

  /* ─────────────────── export DOM prep ─────────────────── */

  /**
   * Clamp anything that can blow past the content box width.
   * @param {HTMLElement} root
   */
  function clampOverflow(root) {
    if (!root) return;
    root.style.boxSizing = "border-box";
    root.style.maxWidth = "100%";
    root.style.overflow = "visible";
    root.style.overflowWrap = "break-word";
    root.style.wordWrap = "break-word";

    const selectors = [
      "img",
      "svg",
      "table",
      "pre",
      "code",
      ".table-wrap",
      ".figure",
      ".mermaid-figure",
      ".mermaid",
      ".katex-display",
      ".katex-display-wrap",
      ".equation-block",
      "video",
      "canvas",
    ];
    root.querySelectorAll(selectors.join(",")).forEach((el) => {
      el.style.maxWidth = "100%";
      el.style.boxSizing = "border-box";
      if (el.tagName === "IMG" || el.tagName === "SVG" || el.tagName === "VIDEO") {
        el.style.height = "auto";
      }
      if (el.tagName === "PRE") {
        el.style.whiteSpace = "pre-wrap";
        el.style.overflowX = "hidden";
      }
      if (el.tagName === "TABLE") {
        el.style.width = "100%";
        el.style.tableLayout = "fixed";
      }
    });

    // KaTeX display math can paint wider than the box
    root.querySelectorAll(".katex-display").forEach((el) => {
      el.style.maxWidth = "100%";
      el.style.overflowX = "auto";
      el.style.overflowY = "hidden";
    });
  }

  /**
   * Build a capture-ready tree whose WIDTH equals the content box.
   * Margins are NOT in the DOM — they are applied by jsPDF.
   *
   * @returns {{ host: HTMLElement, clone: HTMLElement, merged: object, geo: object }}
   */
  function prepareExportHost(preset, overrides) {
    let host = document.getElementById("pdf-export-source");
    if (!host) {
      host = document.createElement("div");
      host.id = "pdf-export-source";
      document.body.appendChild(host);
    }

    const clone = PP().Renderer.cloneForExport();
    if (!clone) throw new Error("No document to export. Render a preview first.");

    const merged = Object.assign({}, preset, overrides || {});
    if (overrides && overrides.margins) {
      merged.margins = Object.assign({}, preset.margins, overrides.margins);
    }

    const geo = layoutGeometry(merged);

    // ── Host: on-origin, invisible, exact content width ──
    // NEVER use left:-99999px — html2canvas mis-reads the origin.
    host.innerHTML = "";
    host.setAttribute("data-export-host", "1");
    Object.assign(host.style, {
      position: "fixed",
      left: "0",
      top: "0",
      right: "auto",
      bottom: "auto",
      width: geo.contentW + "in",
      maxWidth: geo.contentW + "in",
      minWidth: geo.contentW + "in",
      height: "auto",
      margin: "0",
      padding: "0",
      border: "none",
      background: "#ffffff",
      opacity: "0",
      pointerEvents: "none",
      zIndex: "-1",
      overflow: "visible",
      transform: "none",
      WebkitTransform: "none",
      boxShadow: "none",
    });

    // CSS variables: content-sized "page" for export
    host.style.setProperty("--paper-width", geo.contentW + "in");
    host.style.setProperty("--paper-height", geo.pageH + "in");
    host.style.setProperty("--paper-margin-top", "0in");
    host.style.setProperty("--paper-margin-right", "0in");
    host.style.setProperty("--paper-margin-bottom", "0in");
    host.style.setProperty("--paper-margin-left", "0in");

    // ── Clone: pure content box ──
    clone.id = "paper-document-export";
    clone.removeAttribute("style"); // drop any preview inline styles
    Object.assign(clone.style, {
      boxSizing: "border-box",
      width: geo.contentW + "in",
      maxWidth: geo.contentW + "in",
      minWidth: "0",
      minHeight: "0",
      height: "auto",
      margin: "0",
      padding: "0",
      border: "none",
      boxShadow: "none",
      background: "#ffffff",
      color: "#000000",
      transform: "none",
      WebkitTransform: "none",
      position: "relative",
      left: "0",
      top: "0",
      overflow: "visible",
      float: "none",
    });
    clone.style.setProperty("--paper-width", geo.contentW + "in");
    clone.style.setProperty("--paper-margin-top", "0px");
    clone.style.setProperty("--paper-margin-right", "0px");
    clone.style.setProperty("--paper-margin-bottom", "0px");
    clone.style.setProperty("--paper-margin-left", "0px");

    // Apply type tokens (font, size, columns) without page padding
    if (PP().Presets && PP().Presets.applyPresetToElement) {
      PP().Presets.applyPresetToElement(host, merged);
      PP().Presets.applyPresetToElement(clone, merged);
      // Re-zero margins after preset (preset rewrites margin vars)
      clone.style.setProperty("--paper-margin-top", "0px");
      clone.style.setProperty("--paper-margin-right", "0px");
      clone.style.setProperty("--paper-margin-bottom", "0px");
      clone.style.setProperty("--paper-margin-left", "0px");
      clone.style.setProperty("--paper-width", geo.contentW + "in");
      clone.style.width = geo.contentW + "in";
      clone.style.padding = "0";
      clone.style.margin = "0";
    }

    host.appendChild(clone);
    clampOverflow(clone);

    // Force layout so scrollWidth is real
    void clone.offsetWidth;

    return { host, clone, merged, geo };
  }

  function teardownExportHost() {
    const host = document.getElementById("pdf-export-source");
    if (host) {
      host.innerHTML = "";
      host.removeAttribute("style");
      host.style.cssText =
        "position:fixed;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;overflow:hidden;z-index:-1;";
    }
  }

  /* ─────────────────── html2pdf export ─────────────────── */

  /**
   * Export using html2pdf.js (download).
   */
  async function exportHtml2Pdf(preset, overrides, filename) {
    if (typeof html2pdf === "undefined") {
      throw new Error("html2pdf.js library not loaded");
    }

    showOverlay("Preparing document…");
    try {
      // Ensure preview mermaid is rendered before clone
      const canvas = document.getElementById("preview-canvas");
      if (canvas) await PP().Mermaid.renderAll(canvas);

      const { host, clone, merged, geo } = prepareExportHost(preset, overrides);
      await waitForAssets(clone);

      // Re-clamp after mermaid/fonts may have expanded
      clampOverflow(clone);
      void clone.offsetWidth;

      showOverlay("Rasterizing pages…");

      const name = filename || suggestFilename(merged);

      // Measured content size (px) — lock capture to this box
      const captureW = Math.ceil(
        Math.max(clone.scrollWidth, clone.offsetWidth, geo.contentWpx)
      );
      const captureH = Math.ceil(Math.max(clone.scrollHeight, clone.offsetHeight, 1));

      // Reset window scroll so html2canvas origin is stable
      const prevX = window.scrollX;
      const prevY = window.scrollY;
      window.scrollTo(0, 0);

      // html2pdf margin order: [top, left, bottom, right] (inches with unit:"in")
      const opt = {
        margin: [geo.margin.top, geo.margin.left, geo.margin.bottom, geo.margin.right],
        filename: name,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          letterRendering: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
          width: captureW,
          height: captureH,
          windowWidth: captureW,
          windowHeight: captureH,
          // Flatten any inherited transform in the cloned document
          onclone: function (doc) {
            const exp = doc.getElementById("paper-document-export");
            if (exp) {
              exp.style.transform = "none";
              exp.style.margin = "0";
              exp.style.padding = "0";
              exp.style.left = "0";
              exp.style.top = "0";
              exp.style.position = "relative";
              exp.style.width = geo.contentW + "in";
              exp.style.maxWidth = geo.contentW + "in";
            }
            const h = doc.getElementById("pdf-export-source");
            if (h) {
              h.style.opacity = "1"; // must be visible inside clone for paint
              h.style.position = "static";
              h.style.left = "0";
              h.style.top = "0";
              h.style.transform = "none";
              h.style.width = geo.contentW + "in";
            }
          },
        },
        jsPDF: {
          unit: "in",
          format: geo.format,
          orientation: "portrait",
          compress: true,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          before: ".page-break",
          avoid: [
            "tr",
            "img",
            "svg",
            ".katex-display",
            ".katex-display-wrap",
            ".figure",
            ".mermaid-figure",
            "pre",
            "table",
            ".table-wrap",
            "blockquote",
            "h1",
            "h2",
            "h3",
          ],
        },
      };

      await html2pdf().set(opt).from(clone).save();

      window.scrollTo(prevX, prevY);

      PP().DOM.toast("PDF downloaded: " + name, "success");
      PP().DOM.setStatus("PDF exported", "ok");
      return name;
    } finally {
      hideOverlay();
      teardownExportHost();
    }
  }

  /* ─────────────────── print / other exports ─────────────────── */

  /**
   * Browser print dialog (best text fidelity — user selects "Save as PDF").
   */
  async function exportPrint(preset, overrides) {
    showOverlay("Opening print dialog…");
    try {
      const canvas = document.getElementById("preview-canvas");
      if (canvas) await PP().Mermaid.renderAll(canvas);
      await waitForAssets(document.getElementById("paper-document"));

      const merged = Object.assign({}, preset, overrides || {});
      if (overrides && overrides.margins) {
        merged.margins = Object.assign({}, preset.margins, overrides.margins);
      }
      PP().Presets.applyPresetToElement(document.documentElement, merged);

      // Remove preview zoom for print
      const sheet = document.querySelector("#preview-canvas .paper-sheet");
      const prevTransform = sheet ? sheet.style.transform : "";
      if (sheet) sheet.style.transform = "none";

      hideOverlay();
      await new Promise((r) => setTimeout(r, 100));
      window.print();

      if (sheet) sheet.style.transform = prevTransform;
      PP().DOM.setStatus("Print dialog opened", "ok");
    } catch (err) {
      hideOverlay();
      throw err;
    }
  }

  function exportMarkdown(text, filename) {
    PP().DOM.downloadText(
      text,
      filename || "paper.md",
      "text/markdown;charset=utf-8"
    );
    PP().DOM.toast("Markdown saved", "success");
  }

  function exportHtml(preset, overrides, filename) {
    const paper = document.getElementById("paper-document");
    if (!paper) throw new Error("Nothing to export");

    const styles = collectInlineStylesheets();
    const doc =
      "<!DOCTYPE html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">" +
      "<title>Paper Export</title>\n<style>\n" +
      styles +
      "\nbody{background:#fff;margin:0;}" +
      "\n.paper-document{box-shadow:none;margin:0 auto;}" +
      "\n</style></head><body>\n" +
      paper.outerHTML +
      "\n</body></html>";

    PP().DOM.downloadText(
      doc,
      filename || "paper.html",
      "text/html;charset=utf-8"
    );
    PP().DOM.toast("HTML exported", "success");
  }

  function collectInlineStylesheets() {
    let css = "";
    try {
      for (const sheet of document.styleSheets) {
        try {
          const href = sheet.href || "";
          if (
            href.includes("fonts.css") ||
            href.includes("paper.css") ||
            href.includes("print.css") ||
            href.includes("katex") ||
            href.includes("highlight")
          ) {
            for (const rule of sheet.cssRules) {
              css += rule.cssText + "\n";
            }
          }
        } catch {
          /* cross-origin */
        }
      }
    } catch {
      /* ignore */
    }
    return css;
  }

  function suggestFilename(preset) {
    const meta = (PP().Renderer.getLastResult() || {}).meta || {};
    let base = meta.title || "research-paper";
    base = String(base)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    if (!base) base = "research-paper";
    return base + ".pdf";
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.PDF = {
    exportHtml2Pdf,
    exportPrint,
    exportMarkdown,
    exportHtml,
    suggestFilename,
    showOverlay,
    hideOverlay,
    layoutGeometry,
  };
})(typeof window !== "undefined" ? window : globalThis);
