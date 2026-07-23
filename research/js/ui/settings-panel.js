/**
 * Settings sidebar — live-bound to paper overrides.
 */
(function (global) {
  "use strict";

  const PP = () => global.PaperPDF;

  function fillFontSelect(select) {
    select.innerHTML = "";
    PP().Presets.FONT_OPTIONS.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.label;
      select.appendChild(opt);
    });
  }

  function fillPaperSize(select) {
    select.innerHTML = "";
    Object.entries(PP().Presets.PAPER_SIZES).forEach(([id, info]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = info.label;
      select.appendChild(opt);
    });
  }

  function stackToFontId(stack) {
    const opts = PP().Presets.FONT_OPTIONS;
    const found = opts.find((o) => o.stack === stack);
    return found ? found.id : "libertinus";
  }

  function fontIdToStack(id) {
    const found = PP().Presets.FONT_OPTIONS.find((o) => o.id === id);
    return found ? found.stack : PP().Presets.FONT_STACKS.libertinus;
  }

  /**
   * Sync form fields from current preset + overrides.
   */
  function syncForm(preset, overrides) {
    const p = Object.assign({}, preset, overrides || {});
    if (overrides && overrides.margins) {
      p.margins = Object.assign({}, preset.margins, overrides.margins);
    }

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!val;
      else el.value = val != null ? val : "";
    };

    set("cfg-font-size", parseFloat(p.fontSize) || 11);
    set("cfg-line-height", p.lineHeight);
    set("cfg-indent", parseFloat(p.paragraphIndent) || 0);
    set("cfg-columns", p.columns);
    set("cfg-align", p.textAlign);
    set("cfg-margin-top", parseFloat(p.margins.top) || 1);
    set("cfg-margin-right", parseFloat(p.margins.right) || 1);
    set("cfg-margin-bottom", parseFloat(p.margins.bottom) || 1);
    set("cfg-margin-left", parseFloat(p.margins.left) || 1);
    set("cfg-paper-size", p.paperSize || "letter");
    set("cfg-font", stackToFontId(p.fontFamily));
    set("cfg-booktabs", (p.className || "").includes("booktabs") || p.booktabs);

    // Update range labels
    updateRangeLabels();
  }

  function updateRangeLabels() {
    const pairs = [
      ["cfg-font-size", "cfg-font-size-val", (v) => v + " pt"],
      ["cfg-line-height", "cfg-line-height-val", (v) => Number(v).toFixed(2)],
      ["cfg-indent", "cfg-indent-val", (v) => v + " in"],
      ["cfg-margin-top", "cfg-margin-top-val", (v) => v + "″"],
      ["cfg-margin-right", "cfg-margin-right-val", (v) => v + "″"],
      ["cfg-margin-bottom", "cfg-margin-bottom-val", (v) => v + "″"],
      ["cfg-margin-left", "cfg-margin-left-val", (v) => v + "″"],
    ];
    pairs.forEach(([id, lid, fmt]) => {
      const el = document.getElementById(id);
      const lab = document.getElementById(lid);
      if (el && lab) lab.textContent = fmt(el.value);
    });
  }

  /**
   * Read overrides object from form.
   */
  function readOverrides() {
    const g = (id) => document.getElementById(id);
    const paperSize = g("cfg-paper-size")?.value || "letter";
    const size = PP().Presets.PAPER_SIZES[paperSize] || PP().Presets.PAPER_SIZES.letter;
    const fontId = g("cfg-font")?.value || "libertinus";
    const stack = fontIdToStack(fontId);
    const booktabs = g("cfg-booktabs")?.checked;
    const columns = Number(g("cfg-columns")?.value || 1);

    const unit = paperSize === "a4" || paperSize === "a5" ? "mm" : "in";
    // margins always stored as inches in form; convert for A4 if needed
    const mt = Number(g("cfg-margin-top")?.value || 1);
    const mr = Number(g("cfg-margin-right")?.value || 1);
    const mb = Number(g("cfg-margin-bottom")?.value || 1);
    const ml = Number(g("cfg-margin-left")?.value || 1);

    const margins =
      unit === "mm"
        ? {
            top: (mt * 25.4).toFixed(1) + "mm",
            right: (mr * 25.4).toFixed(1) + "mm",
            bottom: (mb * 25.4).toFixed(1) + "mm",
            left: (ml * 25.4).toFixed(1) + "mm",
          }
        : {
            top: mt + "in",
            right: mr + "in",
            bottom: mb + "in",
            left: ml + "in",
          };

    return {
      paperSize,
      width: size.width,
      height: size.height,
      fontFamily: stack,
      headingFont: stack,
      fontSize: (g("cfg-font-size")?.value || 11) + "pt",
      lineHeight: Number(g("cfg-line-height")?.value || 1.5),
      paragraphIndent: (g("cfg-indent")?.value || 0) + "in",
      columns,
      textAlign: g("cfg-align")?.value || "justify",
      margins,
      booktabs: !!booktabs,
      className: booktabs ? "table-booktabs" : "",
    };
  }

  function bind(onChange) {
    const ids = [
      "cfg-font-size",
      "cfg-line-height",
      "cfg-indent",
      "cfg-columns",
      "cfg-align",
      "cfg-margin-top",
      "cfg-margin-right",
      "cfg-margin-bottom",
      "cfg-margin-left",
      "cfg-paper-size",
      "cfg-font",
      "cfg-booktabs",
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => {
        updateRangeLabels();
        onChange && onChange(readOverrides());
      });
      el.addEventListener("change", () => {
        updateRangeLabels();
        onChange && onChange(readOverrides());
      });
    });

    fillFontSelect(document.getElementById("cfg-font"));
    fillPaperSize(document.getElementById("cfg-paper-size"));
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Settings = {
    bind,
    syncForm,
    readOverrides,
    updateRangeLabels,
  };
})(typeof window !== "undefined" ? window : globalThis);
