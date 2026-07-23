/**
 * Academic paper presets — margins, type, spacing, structure.
 * All values use CSS-friendly units (in, pt, unitless line-height).
 */
(function (global) {
  "use strict";

  const FONT_STACKS = {
    times: '"Libre Baskerville", "Times New Roman", Times, serif',
    stix: '"STIX Two Text", "Times New Roman", Times, serif',
    sourceSerif: '"Source Serif 4", "Times New Roman", Times, serif',
    garamond: '"EB Garamond", Garamond, "Times New Roman", serif',
    crimson: '"Crimson Pro", "Times New Roman", Times, serif',
    libertinus: '"Libertinus Serif", "Times New Roman", Times, serif',
    sans: '"Source Sans 3", "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"Source Code Pro", "Courier New", Courier, monospace',
  };

  /**
   * @typedef {Object} PaperPreset
   * @property {string} id
   * @property {string} name
   * @property {string} description
   * @property {string} paperSize - letter | a4 | a5 | legal
   * @property {string} width
   * @property {string} height
   * @property {{top:string,right:string,bottom:string,left:string}} margins
   * @property {string} fontFamily
   * @property {string} headingFont
   * @property {string} fontSize
   * @property {number|string} lineHeight
   * @property {string} paragraphIndent
   * @property {string} paragraphSpacing
   * @property {string} titleSize
   * @property {string} h1Size
   * @property {string} h2Size
   * @property {string} h3Size
   * @property {number} columns
   * @property {string} columnGap
   * @property {string} textAlign - left | justify
   * @property {string} codeFont
   * @property {string} codeSize
   * @property {boolean} booktabs
   * @property {string} className - extra class on .paper-document
   * @property {Object} [defaults] - optional metadata defaults
   */

  /** @type {Record<string, PaperPreset>} */
  const PRESETS = {
    ieee: {
      id: "ieee",
      name: "IEEE Conference",
      description: "Two-column conference paper · 10 pt STIX · 0.75″ margins",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "0.75in", right: "0.75in", bottom: "1in", left: "0.75in" },
      fontFamily: FONT_STACKS.stix,
      headingFont: FONT_STACKS.stix,
      fontSize: "10pt",
      lineHeight: 1.15,
      paragraphIndent: "0.2in",
      paragraphSpacing: "0.35em",
      titleSize: "24pt",
      h1Size: "10pt",
      h2Size: "10pt",
      h3Size: "10pt",
      columns: 2,
      columnGap: "0.25in",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "8.5pt",
      booktabs: true,
      className: "preset-ieee table-booktabs",
      defaults: {
        runningHeader: "",
        showAbstractLabel: true,
      },
    },

    acm: {
      id: "acm",
      name: "ACM SIG",
      description: "ACM conference style · 9 pt · two-column · Libertinus",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "0.75in", right: "0.75in", bottom: "1in", left: "0.75in" },
      fontFamily: FONT_STACKS.libertinus,
      headingFont: FONT_STACKS.libertinus,
      fontSize: "9pt",
      lineHeight: 1.2,
      paragraphIndent: "0.15in",
      paragraphSpacing: "0.3em",
      titleSize: "18pt",
      h1Size: "9pt",
      h2Size: "9pt",
      h3Size: "9pt",
      columns: 2,
      columnGap: "0.33in",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "8pt",
      booktabs: true,
      className: "preset-acm table-booktabs",
    },

    apa7: {
      id: "apa7",
      name: "APA 7th",
      description: "Student/professional APA · double-spaced · 1″ · Times-like",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      fontFamily: FONT_STACKS.times,
      headingFont: FONT_STACKS.times,
      fontSize: "12pt",
      lineHeight: 2,
      paragraphIndent: "0.5in",
      paragraphSpacing: "0",
      titleSize: "12pt",
      h1Size: "12pt",
      h2Size: "12pt",
      h3Size: "12pt",
      columns: 1,
      columnGap: "0",
      textAlign: "left",
      codeFont: FONT_STACKS.mono,
      codeSize: "11pt",
      booktabs: false,
      className: "preset-apa spacing-double",
      defaults: {
        runningHeader: "RUNNING HEAD",
      },
    },

    mla9: {
      id: "mla9",
      name: "MLA 9th",
      description: "MLA essay · double-spaced · 1″ · Garamond/Times",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      fontFamily: FONT_STACKS.garamond,
      headingFont: FONT_STACKS.garamond,
      fontSize: "12pt",
      lineHeight: 2,
      paragraphIndent: "0.5in",
      paragraphSpacing: "0",
      titleSize: "12pt",
      h1Size: "12pt",
      h2Size: "12pt",
      h3Size: "12pt",
      columns: 1,
      columnGap: "0",
      textAlign: "left",
      codeFont: FONT_STACKS.mono,
      codeSize: "11pt",
      booktabs: false,
      className: "preset-mla spacing-double",
    },

    chicago: {
      id: "chicago",
      name: "Chicago / Turabian",
      description: "Notes-bibliography ready · double-spaced · Crimson Pro",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      fontFamily: FONT_STACKS.crimson,
      headingFont: FONT_STACKS.crimson,
      fontSize: "12pt",
      lineHeight: 2,
      paragraphIndent: "0.5in",
      paragraphSpacing: "0",
      titleSize: "12pt",
      h1Size: "12pt",
      h2Size: "12pt",
      h3Size: "12pt",
      columns: 1,
      columnGap: "0",
      textAlign: "left",
      codeFont: FONT_STACKS.mono,
      codeSize: "11pt",
      booktabs: false,
      className: "preset-chicago spacing-double",
    },

    nature: {
      id: "nature",
      name: "Nature-style",
      description: "Compact journal look · 9 pt Source Serif · tight leading",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "0.8in", right: "0.7in", bottom: "0.8in", left: "0.7in" },
      fontFamily: FONT_STACKS.sourceSerif,
      headingFont: FONT_STACKS.sourceSerif,
      fontSize: "9pt",
      lineHeight: 1.35,
      paragraphIndent: "0.15in",
      paragraphSpacing: "0.4em",
      titleSize: "16pt",
      h1Size: "11pt",
      h2Size: "10pt",
      h3Size: "9pt",
      columns: 1,
      columnGap: "0",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "8pt",
      booktabs: true,
      className: "preset-nature table-booktabs",
    },

    arxiv: {
      id: "arxiv",
      name: "arXiv / LaTeX article",
      description: "Libertinus (CM-like) · 11 pt · 1″ · single column",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      fontFamily: FONT_STACKS.libertinus,
      headingFont: FONT_STACKS.libertinus,
      fontSize: "11pt",
      lineHeight: 1.35,
      paragraphIndent: "0.2in",
      paragraphSpacing: "0.5em",
      titleSize: "17pt",
      h1Size: "13pt",
      h2Size: "12pt",
      h3Size: "11pt",
      columns: 1,
      columnGap: "0",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "9.5pt",
      booktabs: true,
      className: "preset-arxiv table-booktabs",
    },

    thesis: {
      id: "thesis",
      name: "Thesis / Dissertation",
      description: "1.5″ left binding margin · 12 pt · 1.5 line spacing",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1.5in" },
      fontFamily: FONT_STACKS.times,
      headingFont: FONT_STACKS.times,
      fontSize: "12pt",
      lineHeight: 1.5,
      paragraphIndent: "0.5in",
      paragraphSpacing: "0",
      titleSize: "14pt",
      h1Size: "14pt",
      h2Size: "12pt",
      h3Size: "12pt",
      columns: 1,
      columnGap: "0",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "10pt",
      booktabs: false,
      className: "preset-thesis",
    },

    a4_report: {
      id: "a4_report",
      name: "A4 Technical Report",
      description: "ISO A4 · 11 pt Source Serif · 25 mm margins",
      paperSize: "a4",
      width: "210mm",
      height: "297mm",
      margins: { top: "25mm", right: "25mm", bottom: "25mm", left: "25mm" },
      fontFamily: FONT_STACKS.sourceSerif,
      headingFont: FONT_STACKS.sourceSerif,
      fontSize: "11pt",
      lineHeight: 1.4,
      paragraphIndent: "0",
      paragraphSpacing: "0.65em",
      titleSize: "18pt",
      h1Size: "14pt",
      h2Size: "12pt",
      h3Size: "11pt",
      columns: 1,
      columnGap: "0",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "9.5pt",
      booktabs: true,
      className: "preset-a4 table-booktabs",
    },

    manuscript: {
      id: "manuscript",
      name: "Manuscript Draft",
      description: "Double-spaced submission draft · large margins · 12 pt",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      fontFamily: FONT_STACKS.times,
      headingFont: FONT_STACKS.times,
      fontSize: "12pt",
      lineHeight: 2,
      paragraphIndent: "0.5in",
      paragraphSpacing: "0",
      titleSize: "12pt",
      h1Size: "12pt",
      h2Size: "12pt",
      h3Size: "12pt",
      columns: 1,
      columnGap: "0",
      textAlign: "left",
      codeFont: FONT_STACKS.mono,
      codeSize: "11pt",
      booktabs: false,
      className: "preset-manuscript spacing-double",
    },

    custom: {
      id: "custom",
      name: "Custom",
      description: "Start from arXiv defaults and tune every parameter",
      paperSize: "letter",
      width: "8.5in",
      height: "11in",
      margins: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      fontFamily: FONT_STACKS.libertinus,
      headingFont: FONT_STACKS.libertinus,
      fontSize: "11pt",
      lineHeight: 1.5,
      paragraphIndent: "0.3in",
      paragraphSpacing: "0.4em",
      titleSize: "16pt",
      h1Size: "13pt",
      h2Size: "12pt",
      h3Size: "11pt",
      columns: 1,
      columnGap: "0.25in",
      textAlign: "justify",
      codeFont: FONT_STACKS.mono,
      codeSize: "9.5pt",
      booktabs: true,
      className: "preset-custom table-booktabs",
    },
  };

  const PAPER_SIZES = {
    letter: { width: "8.5in", height: "11in", label: "US Letter (8.5×11″)" },
    a4: { width: "210mm", height: "297mm", label: "A4 (210×297 mm)" },
    a5: { width: "148mm", height: "210mm", label: "A5 (148×210 mm)" },
    legal: { width: "8.5in", height: "14in", label: "US Legal (8.5×14″)" },
  };

  const FONT_OPTIONS = [
    { id: "times", label: "Libre Baskerville (Times-like)", stack: FONT_STACKS.times },
    { id: "stix", label: "STIX Two Text (Scientific)", stack: FONT_STACKS.stix },
    { id: "sourceSerif", label: "Source Serif 4", stack: FONT_STACKS.sourceSerif },
    { id: "garamond", label: "EB Garamond", stack: FONT_STACKS.garamond },
    { id: "crimson", label: "Crimson Pro", stack: FONT_STACKS.crimson },
    { id: "libertinus", label: "Libertinus Serif (TeX-like)", stack: FONT_STACKS.libertinus },
    { id: "sans", label: "Source Sans 3", stack: FONT_STACKS.sans },
  ];

  function listPresets() {
    return Object.values(PRESETS);
  }

  function getPreset(id) {
    return PRESETS[id] ? { ...PRESETS[id], margins: { ...PRESETS[id].margins } } : null;
  }

  function clonePreset(id) {
    const p = getPreset(id);
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  /**
   * Apply a preset (and optional overrides) to CSS custom properties on :root / element.
   */
  function applyPresetToElement(el, preset, overrides) {
    const p = Object.assign({}, preset, overrides || {});
    if (overrides && overrides.margins) {
      p.margins = Object.assign({}, preset.margins, overrides.margins);
    }

    const style = el.style;
    style.setProperty("--paper-width", p.width);
    style.setProperty("--paper-height", p.height);
    style.setProperty("--paper-margin-top", p.margins.top);
    style.setProperty("--paper-margin-right", p.margins.right);
    style.setProperty("--paper-margin-bottom", p.margins.bottom);
    style.setProperty("--paper-margin-left", p.margins.left);
    style.setProperty("--paper-font-family", p.fontFamily);
    style.setProperty("--paper-heading-font", p.headingFont);
    style.setProperty("--paper-font-size", p.fontSize);
    style.setProperty("--paper-line-height", String(p.lineHeight));
    style.setProperty("--paper-paragraph-indent", p.paragraphIndent);
    style.setProperty("--paper-paragraph-spacing", p.paragraphSpacing);
    style.setProperty("--paper-title-size", p.titleSize);
    style.setProperty("--paper-h1-size", p.h1Size);
    style.setProperty("--paper-h2-size", p.h2Size);
    style.setProperty("--paper-h3-size", p.h3Size);
    style.setProperty("--paper-columns", String(p.columns));
    style.setProperty("--paper-column-gap", p.columnGap);
    style.setProperty("--paper-text-align", p.textAlign);
    style.setProperty("--paper-code-font", p.codeFont);
    style.setProperty("--paper-code-size", p.codeSize);
  }

  function documentClasses(preset) {
    const parts = ["paper-document"];
    if (preset.className) parts.push(preset.className);
    if (preset.columns === 2) parts.push("columns-2");
    if (Number(preset.lineHeight) >= 1.9) parts.push("spacing-double");
    return parts.join(" ");
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Presets = {
    PRESETS,
    FONT_STACKS,
    PAPER_SIZES,
    FONT_OPTIONS,
    listPresets,
    getPreset,
    clonePreset,
    applyPresetToElement,
    documentClasses,
  };
})(typeof window !== "undefined" ? window : globalThis);
