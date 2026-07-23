/**
 * PaperPDF — application bootstrap & state.
 */
(function () {
  "use strict";

  const PP = window.PaperPDF;
  const { debounce } = PP.Debounce;
  const Storage = PP.Storage;

  const state = {
    markdown: "",
    presetId: "arxiv",
    preset: null,
    overrides: {},
    viewMode: "split",
    zoom: 0.85,
    dirty: false,
  };

  let editorApi = null;

  function currentPreset() {
    return state.preset;
  }

  function mergedPreset() {
    const base = state.preset;
    const o = state.overrides || {};
    const merged = Object.assign({}, base, o);
    if (o.margins) {
      merged.margins = Object.assign({}, base.margins, o.margins);
    }
    // Merge className carefully
    if (o.className != null) {
      const baseCls = (base.className || "").replace(/\btable-booktabs\b/g, "").trim();
      merged.className = (baseCls + " " + o.className).trim();
    }
    if (o.booktabs === false) {
      merged.className = (merged.className || "").replace(/\btable-booktabs\b/g, "").trim();
    }
    if (o.booktabs === true && !(merged.className || "").includes("booktabs")) {
      merged.className = ((merged.className || "") + " table-booktabs").trim();
    }
    return merged;
  }

  async function render() {
    const preset = mergedPreset();
    PP.DOM.setStatus("Rendering…");
    await PP.Renderer.renderToPreview(state.markdown, preset, null);
    updateStats();
    PP.DOM.setStatus("Ready", "ok");
  }

  const scheduleRender = debounce(() => {
    render().catch((err) => {
      console.error(err);
      PP.DOM.setStatus("Render error", "err");
    });
  }, 280);

  function updateStats() {
    const words = PP.Renderer.countWords(state.markdown);
    const chars = PP.Renderer.countChars(state.markdown);
    const w = document.getElementById("stat-words");
    const c = document.getElementById("stat-chars");
    if (w) w.textContent = String(words);
    if (c) c.textContent = String(chars);
  }

  function setMarkdown(md, { persist, renderNow } = {}) {
    state.markdown = md;
    state.dirty = true;
    if (persist !== false) {
      Storage.setRaw("document", md);
    }
    updateStats();
    if (renderNow) scheduleRender.flush();
    else scheduleRender();
  }

  function loadPreset(id, { resetOverrides } = {}) {
    const p = PP.Presets.clonePreset(id);
    if (!p) return;
    state.presetId = id;
    state.preset = p;
    if (resetOverrides !== false) {
      state.overrides = {};
    }
    Storage.set("presetId", id);
    Storage.set("overrides", state.overrides);
    PP.Toolbar.updatePresetLabel(p);
    PP.Settings.syncForm(p, state.overrides);
    PP.Renderer.applyStyles(mergedPreset());
    scheduleRender();
  }

  function applyOverrides(ov) {
    state.overrides = ov;
    Storage.set("overrides", ov);
    // When user tweaks settings, mark as custom-ish but keep preset base
    PP.Renderer.applyStyles(mergedPreset());
    scheduleRender();
  }

  function persistMeta() {
    Storage.set("viewMode", state.viewMode);
    Storage.set("zoom", state.zoom);
  }

  async function loadSample() {
    try {
      const res = await fetch("samples/sample-paper.md");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      editorApi.setValue(text);
      setMarkdown(text, { renderNow: true });
      PP.DOM.toast("Sample paper loaded", "success");
    } catch (err) {
      // Offline / file:// fallback — embedded sample
      const text = window.PAPERPDF_SAMPLE || defaultSample();
      editorApi.setValue(text);
      setMarkdown(text, { renderNow: true });
      PP.DOM.toast("Sample paper loaded (embedded)", "info");
    }
  }

  function defaultSample() {
    return (
      window.PAPERPDF_SAMPLE ||
      "---\ntitle: Sample Research Paper\nauthor: A. Researcher\n---\n\n## Abstract\n\nThis is a sample.\n\n## Introduction\n\nWrite your paper in Markdown. Use $E=mc^2$ for math.\n"
    );
  }

  function bindToolbar() {
    // View modes
    document.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.viewMode = btn.getAttribute("data-view");
        PP.Toolbar.setViewMode(state.viewMode);
        persistMeta();
      });
    });

    document.getElementById("btn-settings")?.addEventListener("click", () => {
      PP.Toolbar.toggleSettings();
    });

    document.getElementById("btn-presets")?.addEventListener("click", () => {
      PP.Toolbar.populatePresetModal(state.presetId, (id) => {
        loadPreset(id, { resetOverrides: true });
        PP.DOM.toast("Preset: " + PP.Presets.getPreset(id).name, "success");
      });
      PP.Toolbar.openModal("modal-presets");
    });

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        PP.Toolbar.closeModal(btn.getAttribute("data-close-modal"));
      });
    });

    // Zoom
    document.querySelectorAll("[data-zoom]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.zoom = parseFloat(btn.getAttribute("data-zoom"));
        PP.Toolbar.setZoom(state.zoom);
        persistMeta();
      });
    });

    // File ops
    document.getElementById("btn-new")?.addEventListener("click", () => {
      if (state.dirty && !confirm("Discard current document?")) return;
      const blank =
        "---\ntitle: Untitled Paper\nauthor: Your Name\naffiliation: Your Institution\ndate: " +
        new Date().toISOString().slice(0, 10) +
        "\nkeywords: [keyword1, keyword2]\n---\n\n## Abstract\n\n\n\n## 1. Introduction\n\n";
      editorApi.setValue(blank);
      setMarkdown(blank, { renderNow: true });
      state.dirty = false;
    });

    document.getElementById("btn-open")?.addEventListener("click", () => {
      document.getElementById("file-open")?.click();
    });

    document.getElementById("file-open")?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await PP.DOM.readFileAsText(file);
      editorApi.setValue(text);
      setMarkdown(text, { renderNow: true });
      PP.DOM.toast("Opened " + file.name, "success");
      e.target.value = "";
    });

    document.getElementById("btn-sample")?.addEventListener("click", () => {
      loadSample();
    });

    document.getElementById("btn-save-md")?.addEventListener("click", () => {
      PP.PDF.exportMarkdown(state.markdown, PP.PDF.suggestFilename(mergedPreset()).replace(/\.pdf$/, ".md"));
    });

    document.getElementById("btn-export-pdf")?.addEventListener("click", async () => {
      try {
        await render(); // ensure fresh
        await PP.PDF.exportHtml2Pdf(mergedPreset(), null);
      } catch (err) {
        console.error(err);
        PP.DOM.toast(err.message || "PDF export failed", "error");
        PP.DOM.setStatus("Export failed", "err");
      }
    });

    document.getElementById("btn-print")?.addEventListener("click", async () => {
      try {
        await render();
        await PP.PDF.exportPrint(mergedPreset());
      } catch (err) {
        PP.DOM.toast(err.message || "Print failed", "error");
      }
    });

    document.getElementById("btn-export-html")?.addEventListener("click", () => {
      try {
        PP.PDF.exportHtml(mergedPreset());
      } catch (err) {
        PP.DOM.toast(err.message || "HTML export failed", "error");
      }
    });

    // Snippets
    document.querySelectorAll("[data-snippet]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ta = document.getElementById("markdown-input");
        PP.Editor.insertSnippet(ta, btn.getAttribute("data-snippet"));
        setMarkdown(ta.value);
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "s") {
        e.preventDefault();
        PP.PDF.exportMarkdown(state.markdown, "paper.md");
      }
      if (mod && e.key === "p") {
        e.preventDefault();
        document.getElementById("btn-print")?.click();
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        document.getElementById("btn-export-pdf")?.click();
      }
    });
  }

  function restoreState() {
    const savedMd = Storage.getRaw("document", null);
    const presetId = Storage.get("presetId", "arxiv");
    const overrides = Storage.get("overrides", {});
    const viewMode = Storage.get("viewMode", "split");
    const zoom = Storage.get("zoom", 0.85);

    state.viewMode = viewMode;
    state.zoom = zoom;
    state.overrides = overrides || {};
    PP.Toolbar.setViewMode(viewMode);
    PP.Toolbar.setZoom(zoom);

    loadPreset(presetId, { resetOverrides: false });
    state.overrides = overrides || {};
    PP.Settings.syncForm(state.preset, state.overrides);

    if (savedMd && savedMd.length) {
      state.markdown = savedMd;
      editorApi.setValue(savedMd);
    } else {
      // Will load sample on first run
      return false;
    }
    return true;
  }

  async function boot() {
    // Init engines
    if (PP.Mermaid.isReady()) PP.Mermaid.init("neutral");

    const ta = document.getElementById("markdown-input");
    editorApi = PP.Editor.init(ta, (val) => setMarkdown(val));

    PP.Settings.bind((ov) => applyOverrides(ov));
    bindToolbar();

    const hadDoc = restoreState();
    if (!hadDoc) {
      await loadSample();
    } else {
      await render();
    }

    // Status lib check
    const libs = [];
    if (typeof marked === "undefined") libs.push("marked");
    if (typeof katex === "undefined") libs.push("katex");
    if (typeof mermaid === "undefined") libs.push("mermaid");
    if (typeof hljs === "undefined") libs.push("hljs");
    if (typeof DOMPurify === "undefined") libs.push("DOMPurify");
    if (typeof html2pdf === "undefined") libs.push("html2pdf");
    if (libs.length) {
      PP.DOM.setStatus("Missing: " + libs.join(", "), "warn");
      console.warn("[PaperPDF] Missing libraries:", libs);
    }

    PP.bus.on("render:done", () => {
      state.dirty = false;
    });

    console.info(
      "%cPaperPDF%c ready — research-grade Markdown → PDF",
      "background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold",
      "color:#8b9cb3"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
