/**
 * PDF export via html2pdf.js and browser print.
 * Optimized for research-paper typography fidelity.
 */
(function (global) {
  "use strict";

  const PP = () => global.PaperPDF;

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

  function parseMarginInches(preset) {
    const toIn = (v) => {
      const s = String(v).trim();
      const m = s.match(/^([\d.]+)\s*(in|mm|cm|pt)?$/i);
      if (!m) return 1;
      const n = parseFloat(m[1]);
      const u = (m[2] || "in").toLowerCase();
      if (u === "in") return n;
      if (u === "mm") return n / 25.4;
      if (u === "cm") return n / 2.54;
      if (u === "pt") return n / 72;
      return n;
    };
    return {
      top: toIn(preset.margins.top),
      right: toIn(preset.margins.right),
      bottom: toIn(preset.margins.bottom),
      left: toIn(preset.margins.left),
    };
  }

  function paperFormat(preset) {
    const w = String(preset.width).toLowerCase();
    const h = String(preset.height).toLowerCase();
    if (w.includes("210") || preset.paperSize === "a4") return "a4";
    if (preset.paperSize === "a5") return "a5";
    if (preset.paperSize === "legal" || h.includes("14")) return "legal";
    return "letter";
  }

  /**
   * Wait for fonts + images + mermaid SVGs.
   */
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
            setTimeout(res, 3000);
          })
      )
    );
    // small settle for layout
    await new Promise((r) => setTimeout(r, 120));
  }

  /**
   * Prepare a clean off-screen export host.
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

    host.innerHTML = "";
    host.appendChild(clone);

    // Zero padding on clone — html2pdf applies page margins
    clone.style.padding = "0";
    clone.style.width = merged.width;
    clone.style.minHeight = "auto";
    clone.style.boxShadow = "none";
    clone.style.margin = "0";
    clone.style.background = "#ffffff";

    PP().Presets.applyPresetToElement(host, merged);
    PP().Presets.applyPresetToElement(clone, merged);
    // Keep internal padding? For html2pdf we put margins in jsPDF, so content padding=0
    clone.style.setProperty("--paper-margin-top", "0px");
    clone.style.setProperty("--paper-margin-right", "0px");
    clone.style.setProperty("--paper-margin-bottom", "0px");
    clone.style.setProperty("--paper-margin-left", "0px");
    clone.style.padding = "0";

    return { host, clone, merged };
  }

  /**
   * Export using html2pdf.js (download).
   */
  async function exportHtml2Pdf(preset, overrides, filename) {
    if (typeof html2pdf === "undefined") {
      throw new Error("html2pdf.js library not loaded");
    }

    showOverlay("Preparing document…");
    try {
      // Ensure preview mermaid is rendered
      const canvas = document.getElementById("preview-canvas");
      if (canvas) await PP().Mermaid.renderAll(canvas);

      const { host, clone, merged } = prepareExportHost(preset, overrides);
      await waitForAssets(clone);

      showOverlay("Rasterizing pages…");

      const margins = parseMarginInches(merged);
      const format = paperFormat(merged);
      const name = filename || suggestFilename(merged);

      // html2pdf margin unit is inches when using jsPDF
      const opt = {
        margin: [margins.top, margins.left, margins.bottom, margins.right],
        filename: name,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          letterRendering: true,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: clone.scrollWidth,
        },
        jsPDF: {
          unit: "in",
          format: format,
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

      PP().DOM.toast("PDF downloaded: " + name, "success");
      PP().DOM.setStatus("PDF exported", "ok");
      return name;
    } finally {
      hideOverlay();
      const host = document.getElementById("pdf-export-source");
      if (host) host.innerHTML = "";
    }
  }

  /**
   * Browser print dialog (best text fidelity — user selects "Save as PDF").
   */
  async function exportPrint(preset, overrides) {
    showOverlay("Opening print dialog…");
    try {
      const canvas = document.getElementById("preview-canvas");
      if (canvas) await PP().Mermaid.renderAll(canvas);
      await waitForAssets(document.getElementById("paper-document"));

      // Apply styles to root for @page
      const merged = Object.assign({}, preset, overrides || {});
      if (overrides && overrides.margins) {
        merged.margins = Object.assign({}, preset.margins, overrides.margins);
      }
      PP().Presets.applyPresetToElement(document.documentElement, merged);

      hideOverlay();
      // Slight delay so overlay hides before print
      await new Promise((r) => setTimeout(r, 100));
      window.print();
      PP().DOM.setStatus("Print dialog opened", "ok");
    } catch (err) {
      hideOverlay();
      throw err;
    }
  }

  /**
   * Export markdown source.
   */
  function exportMarkdown(text, filename) {
    PP().DOM.downloadText(
      text,
      filename || "paper.md",
      "text/markdown;charset=utf-8"
    );
    PP().DOM.toast("Markdown saved", "success");
  }

  /**
   * Export HTML snapshot of the paper.
   */
  function exportHtml(preset, overrides, filename) {
    const paper = document.getElementById("paper-document");
    if (!paper) throw new Error("Nothing to export");

    const merged = Object.assign({}, preset, overrides || {});
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
    // Pull our paper-critical CSS from loaded stylesheets where possible
    let css = "";
    try {
      for (const sheet of document.styleSheets) {
        try {
          const href = sheet.href || "";
          if (
            href.includes("fonts.css") ||
            href.includes("paper.css") ||
            href.includes("katex") ||
            href.includes("highlight")
          ) {
            for (const rule of sheet.cssRules) {
              css += rule.cssText + "\n";
            }
          }
        } catch {
          /* cross-origin — skip */
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
  };
})(typeof window !== "undefined" ? window : globalThis);
