/**
 * Markdown → HTML pipeline with math/mermaid protection,
 * GFM tables, footnotes, page breaks, front matter, captions.
 */
(function (global) {
  "use strict";

  const PLACEHOLDER_PREFIX = "\uE000PPDF";
  const PLACEHOLDER_SUFFIX = "\uE001";

  function makePlaceholder(kind, index) {
    return PLACEHOLDER_PREFIX + kind + index + PLACEHOLDER_SUFFIX;
  }

  /**
   * Extract and protect regions that must not be mangled by Markdown.
   * Returns { text, blocks: { math:[], mermaid:[], code:[] } }
   */
  function protect(source) {
    const blocks = { math: [], mermaid: [], code: [], html: [] };
    let text = source;

    // YAML front matter
    let frontMatter = null;
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (fmMatch) {
      frontMatter = parseFrontMatter(fmMatch[1]);
      text = text.slice(fmMatch[0].length);
    }

    // Fenced code blocks (including mermaid) — protect first
    text = text.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (full, info, body) => {
      const lang = (info || "").trim().split(/\s+/)[0].toLowerCase();
      if (lang === "mermaid") {
        const i = blocks.mermaid.length;
        blocks.mermaid.push(body.replace(/\s+$/, ""));
        return makePlaceholder("MERMAID", i);
      }
      const i = blocks.code.length;
      blocks.code.push({ lang, body: body.replace(/\n$/, "") });
      return makePlaceholder("CODE", i);
    });

    // Display math $$ ... $$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
      const i = blocks.math.length;
      blocks.math.push({ display: true, tex: tex.trim() });
      return makePlaceholder("MATH", i);
    });

    // Display math \[ ... \]
    text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => {
      const i = blocks.math.length;
      blocks.math.push({ display: true, tex: tex.trim() });
      return makePlaceholder("MATH", i);
    });

    // Equation environment with optional number: $$ ... $$ (n) handled later

    // Inline math \( ... \)
    text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => {
      const i = blocks.math.length;
      blocks.math.push({ display: false, tex: tex.trim() });
      return makePlaceholder("MATH", i);
    });

    // Inline math $ ... $ (not $$), including single tokens like $R$ or $x$
    // Avoid currency: $5, $12.50 when the whole body is numeric
    text = text.replace(
      /(^|[^\\$])\$((?:\\.|[^$\n])+?)\$(?!\$)/g,
      (_, pre, tex) => {
        const trimmed = tex.trim();
        if (!trimmed) return pre + "$$";
        if (/^\d+([.,]\d+)?$/.test(trimmed)) return pre + "$" + tex + "$";
        // Skip empty / whitespace-only
        if (/^\s+$/.test(tex)) return pre + "$" + tex + "$";
        const i = blocks.math.length;
        blocks.math.push({ display: false, tex: trimmed });
        return pre + makePlaceholder("MATH", i);
      }
    );

    // Page break markers
    text = text.replace(
      /(?:^|\n)\s*(?:<!--\s*pagebreak\s*-->|\\newpage|\\pagebreak|\{\{pagebreak\}\})\s*(?:\n|$)/gi,
      "\n\n" + makePlaceholder("PAGEBREAK", 0) + "\n\n"
    );

    return { text, blocks, frontMatter };
  }

  function parseFrontMatter(yaml) {
    const meta = {};
    const lines = yaml.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val.startsWith("[") && val.endsWith("]")) {
        val = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
      meta[m[1].toLowerCase()] = val;
    }
    return meta;
  }

  function restore(html, blocks, engines) {
    const { latex, code, mermaid } = engines;

    // Page breaks
    html = html.replace(
      new RegExp(escapeReg(makePlaceholder("PAGEBREAK", 0)), "g"),
      '<div class="page-break" data-pagebreak="true"></div>'
    );

    // Math
    html = html.replace(
      new RegExp(escapeReg(PLACEHOLDER_PREFIX) + "MATH(\\d+)" + escapeReg(PLACEHOLDER_SUFFIX), "g"),
      (_, idx) => {
        const item = blocks.math[Number(idx)];
        if (!item) return "";
        return latex.render(item.tex, item.display);
      }
    );

    // Mermaid
    html = html.replace(
      new RegExp(
        escapeReg(PLACEHOLDER_PREFIX) + "MERMAID(\\d+)" + escapeReg(PLACEHOLDER_SUFFIX),
        "g"
      ),
      (_, idx) => {
        const src = blocks.mermaid[Number(idx)];
        if (src == null) return "";
        return mermaid.placeholder(Number(idx), src);
      }
    );

    // Code
    html = html.replace(
      new RegExp(
        escapeReg(PLACEHOLDER_PREFIX) + "CODE(\\d+)" + escapeReg(PLACEHOLDER_SUFFIX),
        "g"
      ),
      (_, idx) => {
        const item = blocks.code[Number(idx)];
        if (!item) return "";
        return code.render(item.body, item.lang);
      }
    );

    return html;
  }

  function escapeReg(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Post-process HTML: captions, footnotes, TOC hooks, refs.
   */
  function enhance(html) {
    // Convert images with title to figures
    html = html.replace(
      /<p>\s*<img([^>]*?)>\s*<\/p>/gi,
      (full, attrs) => {
        const titleM = attrs.match(/\btitle="([^"]*)"/i);
        const altM = attrs.match(/\balt="([^"]*)"/i);
        const caption = (titleM && titleM[1]) || (altM && altM[1]) || "";
        if (!caption) return full;
        return (
          '<figure class="figure"><img' +
          attrs +
          '><figcaption class="figure-caption">' +
          escapeHtml(caption) +
          "</figcaption></figure>"
        );
      }
    );

    // Tables: optional <!-- table: Caption --> immediately before <table>
    html = html.replace(
      /(?:<!--\s*table:\s*([\s\S]*?)-->\s*)?(<table[\s\S]*?<\/table>)/gi,
      (_, cap, table) => {
        let inner = "";
        if (cap && String(cap).trim()) {
          inner +=
            '<div class="table-caption"><strong>Table.</strong> ' +
            escapeHtml(String(cap).trim()) +
            "</div>";
        }
        inner += table;
        return '<div class="table-wrap">' + inner + "</div>";
      }
    );

    // Footnote refs [^id] already handled if we add extension; simple syntax:
    // already converted? marked doesn't do footnotes by default — handle [^n]
    // We process footnotes in markdown text before marked if needed.

    // References section auto-class
    html = html.replace(
      /<h([12])([^>]*)>(\s*(?:References|Bibliography|Works Cited)\s*)<\/h\1>/gi,
      '<h$1$2 id="references">$3</h$1><div class="references">'
    );

    return html;
  }

  function processFootnotes(md) {
    const notes = {};
    // Definition: [^id]: text
    let text = md.replace(
      /^\[\^([^\]]+)\]:\s+(.+(?:\n(?:[ \t]+.+))*)/gm,
      (_, id, body) => {
        notes[id] = body.replace(/\n[ \t]+/g, " ").trim();
        return "";
      }
    );

    const used = [];
    text = text.replace(/\[\^([^\]]+)\]/g, (_, id) => {
      if (!notes[id]) return "[^" + id + "]";
      let n = used.indexOf(id);
      if (n === -1) {
        used.push(id);
        n = used.length - 1;
      }
      const num = n + 1;
      return (
        '<sup class="footnote-ref"><a href="#fn-' +
        num +
        '" id="fnref-' +
        num +
        '">[' +
        num +
        "]</a></sup>"
      );
    });

    if (used.length) {
      let section =
        '\n\n<div class="footnotes"><hr><ol>\n';
      used.forEach((id, i) => {
        const num = i + 1;
        section +=
          '<li id="fn-' +
          num +
          '">' +
          escapeHtml(notes[id]) +
          ' <a href="#fnref-' +
          num +
          '" class="footnote-back">↩</a></li>\n';
      });
      section += "</ol></div>\n";
      text += section;
    }

    return text;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Marked wraps lone placeholders in <p>; pull block-level restores out.
   */
  function unwrapBlockElements(html) {
    const patterns = [
      /<p>\s*(<div class="katex-display-wrap"[\s\S]*?<\/div>)\s*<\/p>/gi,
      /<p>\s*(<div class="katex-display"[\s\S]*?<\/div>)\s*<\/p>/gi,
      /<p>\s*(<div class="page-break"[\s\S]*?<\/div>)\s*<\/p>/gi,
      /<p>\s*(<div class="table-wrap"[\s\S]*?<\/div>)\s*<\/p>/gi,
      /<p>\s*(<div class="mermaid-figure"[\s\S]*?<\/div>)\s*<\/p>/gi,
      /<p>\s*(<figure\b[\s\S]*?<\/figure>)\s*<\/p>/gi,
      /<p>\s*(<pre\b[\s\S]*?<\/pre>)\s*<\/p>/gi,
      /<p>\s*(<section\b[\s\S]*?<\/section>)\s*<\/p>/gi,
    ];
    for (const p of patterns) {
      html = html.replace(p, "$1");
    }
    // Drop empty paragraphs left behind
    html = html.replace(/<p>\s*<\/p>/gi, "");
    return html;
  }

  function buildTitleBlock(meta) {
    if (!meta || (!meta.title && !meta.author && !meta.authors)) return "";
    const authors = meta.authors || meta.author || "";
    const authorStr = Array.isArray(authors) ? authors.join(", ") : authors;
    const aff = meta.affiliation || meta.affiliations || "";
    const affStr = Array.isArray(aff) ? aff.join("<br>") : escapeHtml(String(aff));
    let html = '<header class="paper-title-block">';
    if (meta.runninghead || meta["running-head"] || meta.running_head) {
      html +=
        '<div class="paper-running-head">' +
        escapeHtml(meta.runninghead || meta["running-head"] || meta.running_head) +
        "</div>";
    }
    if (meta.title) {
      html += '<h1 class="paper-title">' + escapeHtml(meta.title) + "</h1>";
    }
    if (authorStr) {
      html += '<div class="paper-authors">' + escapeHtml(authorStr) + "</div>";
    }
    if (affStr) {
      html += '<div class="paper-affiliations">' + affStr + "</div>";
    }
    if (meta.date || meta.email) {
      html += '<div class="paper-meta">';
      if (meta.date) html += escapeHtml(meta.date);
      if (meta.date && meta.email) html += " · ";
      if (meta.email) html += escapeHtml(meta.email);
      html += "</div>";
    }
    html += "</header>";
    return html;
  }

  function buildAbstract(meta, bodyHtml) {
    // Abstract from front matter or <!-- abstract --> section
    if (meta && meta.abstract) {
      return (
        '<section class="paper-abstract"><span class="abstract-label">Abstract</span><p>' +
        escapeHtml(meta.abstract) +
        "</p></section>"
      );
    }
    // Extract first blockquote marked as abstract is handled in markdown
    return "";
  }

  function configureMarked() {
    if (typeof marked === "undefined") {
      console.error("[PaperPDF] marked.js not loaded");
      return null;
    }

    // marked v9+ / v15: use marked.use() when available
    try {
      if (typeof marked.use === "function") {
        marked.use({
          gfm: true,
          breaks: false,
          pedantic: false,
        });
      } else if (typeof marked.setOptions === "function") {
        marked.setOptions({
          gfm: true,
          breaks: false,
          pedantic: false,
        });
      }
    } catch (err) {
      console.warn("[PaperPDF] marked config:", err);
    }

    return marked;
  }

  /**
   * Full convert: markdown string → { html, meta, mermaidSources }
   */
  function convert(markdown, engines) {
    const markedLib = configureMarked();
    let md = String(markdown || "");

    md = processFootnotes(md);
    const { text, blocks, frontMatter } = protect(md);

    let bodyHtml;
    if (markedLib) {
      bodyHtml = markedLib.parse(text, { async: false });
    } else {
      bodyHtml = "<pre>" + escapeHtml(text) + "</pre>";
    }

    bodyHtml = restore(bodyHtml, blocks, engines);
    bodyHtml = enhance(bodyHtml);
    bodyHtml = unwrapBlockElements(bodyHtml);

    // Sanitize
    if (typeof DOMPurify !== "undefined") {
      bodyHtml = DOMPurify.sanitize(bodyHtml, {
        ADD_TAGS: [
          "annotation",
          "semantics",
          "mrow",
          "mi",
          "mo",
          "mn",
          "msup",
          "msub",
          "mfrac",
          "msqrt",
          "mroot",
          "mtable",
          "mtr",
          "mtd",
          "mstyle",
          "mspace",
          "menclose",
          "mover",
          "munder",
          "munderover",
          "math",
          "svg",
          "path",
          "g",
          "rect",
          "circle",
          "ellipse",
          "line",
          "polyline",
          "polygon",
          "text",
          "tspan",
          "defs",
          "marker",
          "use",
          "clipPath",
          "foreignObject",
          "style",
          "figure",
          "figcaption",
          "colgroup",
          "col",
        ],
        ADD_ATTR: [
          "xmlns",
          "viewBox",
          "d",
          "fill",
          "stroke",
          "stroke-width",
          "stroke-dasharray",
          "stroke-linecap",
          "stroke-linejoin",
          "transform",
          "cx",
          "cy",
          "r",
          "x",
          "y",
          "x1",
          "y1",
          "x2",
          "y2",
          "width",
          "height",
          "dx",
          "dy",
          "rx",
          "ry",
          "points",
          "marker-end",
          "marker-start",
          "text-anchor",
          "dominant-baseline",
          "font-size",
          "font-family",
          "font-weight",
          "class",
          "id",
          "style",
          "data-mermaid-id",
          "data-mermaid-src",
          "data-pagebreak",
          "aria-hidden",
          "role",
          "focusable",
          "preserveAspectRatio",
          "clip-path",
          "opacity",
          "fx",
          "fy",
          "gradientUnits",
          "offset",
          "stop-color",
          "colspan",
          "rowspan",
          "align",
          "valign",
        ],
      });
    }

    const meta = frontMatter || {};
    const titleBlock = buildTitleBlock(meta);
    const abstractBlock = buildAbstract(meta, bodyHtml);

    // Keywords
    let keywordsBlock = "";
    if (meta.keywords) {
      const kw = Array.isArray(meta.keywords)
        ? meta.keywords.join(", ")
        : String(meta.keywords);
      keywordsBlock =
        '<div class="paper-keywords"><strong>Keywords—</strong>' +
        escapeHtml(kw) +
        "</div>";
    }

    // If abstract appears as ## Abstract in body, wrap it
    bodyHtml = bodyHtml.replace(
      /<h([12])[^>]*>\s*Abstract\s*<\/h\1>\s*<p>([\s\S]*?)<\/p>/i,
      '<section class="paper-abstract"><span class="abstract-label">Abstract</span><p>$2</p></section>'
    );

    const html =
      titleBlock +
      abstractBlock +
      keywordsBlock +
      '<div class="paper-body">' +
      bodyHtml +
      "</div>";

    return {
      html,
      meta,
      mermaidSources: blocks.mermaid,
      mathCount: blocks.math.length,
      codeCount: blocks.code.length,
    };
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Markdown = {
    convert,
    protect,
    parseFrontMatter,
    escapeHtml,
  };
})(typeof window !== "undefined" ? window : globalThis);
