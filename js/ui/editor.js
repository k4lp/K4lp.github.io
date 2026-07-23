/**
 * Markdown editor interactions: tabs, wrap, drop, shortcuts.
 */
(function (global) {
  "use strict";

  const PP = () => global.PaperPDF;

  function init(textarea, onChange) {
    if (!textarea) return;

    // Tab inserts spaces
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        const insert = "  ";
        textarea.value = val.slice(0, start) + insert + val.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + insert.length;
        onChange && onChange(textarea.value);
      }

      // Ctrl/Cmd+B bold, I italic, K link
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        wrapSelection(textarea, "**", "**");
        onChange && onChange(textarea.value);
      }
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        wrapSelection(textarea, "*", "*");
        onChange && onChange(textarea.value);
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        wrapSelection(textarea, "[", "](https://)");
        onChange && onChange(textarea.value);
      }
    });

    textarea.addEventListener("input", () => {
      onChange && onChange(textarea.value);
    });

    // Drag & drop
    const wrap = document.getElementById("editor-wrap");
    if (wrap) {
      ["dragenter", "dragover"].forEach((ev) => {
        wrap.addEventListener(ev, (e) => {
          e.preventDefault();
          wrap.classList.add("drag-over");
        });
      });
      ["dragleave", "drop"].forEach((ev) => {
        wrap.addEventListener(ev, (e) => {
          e.preventDefault();
          wrap.classList.remove("drag-over");
        });
      });
      wrap.addEventListener("drop", async (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (!files || !files.length) return;
        for (const file of files) {
          if (/\.(md|markdown|txt)$/i.test(file.name) || file.type.startsWith("text/")) {
            const text = await PP().DOM.readFileAsText(file);
            textarea.value = text;
            onChange && onChange(text);
            PP().DOM.toast("Loaded " + file.name, "success");
          } else if (file.type.startsWith("image/")) {
            const dataUrl = await PP().DOM.readFileAsDataURL(file);
            insertAtCursor(
              textarea,
              "\n\n![alt text](" + dataUrl + ' "Figure caption")\n\n'
            );
            onChange && onChange(textarea.value);
            PP().DOM.toast("Image inserted", "success");
          }
        }
      });
    }

    return {
      getValue: () => textarea.value,
      setValue: (v) => {
        textarea.value = v;
      },
      focus: () => textarea.focus(),
      insert: (text) => insertAtCursor(textarea, text),
      wrap: (before, after) => wrapSelection(textarea, before, after),
    };
  }

  function wrapSelection(textarea, before, after) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.slice(start, end) || "text";
    const next = val.slice(0, start) + before + selected + after + val.slice(end);
    textarea.value = next;
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + selected.length;
    textarea.focus();
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    textarea.value = val.slice(0, start) + text + val.slice(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
  }

  function insertSnippet(textarea, kind) {
    const snippets = {
      mathInline: "$E = mc^2$",
      mathDisplay:
        "\n\n$$\n\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}\n$$\n\n",
      mermaid:
        "\n\n```mermaid\nflowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Do thing]\n  B -->|No| D[Skip]\n  C --> E[End]\n  D --> E\n```\n\n",
      table:
        "\n\n<!-- table: Summary of results -->\n| Method | Accuracy | F1 |\n|--------|----------|----|\n| Baseline | 0.82 | 0.79 |\n| Ours | **0.91** | **0.88** |\n\n",
      pagebreak: "\n\n<!-- pagebreak -->\n\n",
      abstract:
        "\n\n## Abstract\n\nWrite a concise summary of the problem, method, and key findings here.\n\n",
      figure:
        '\n\n![Descriptive alt text](path/or/data-url.png "Figure 1. Caption describing the figure.")\n\n',
      footnote: "[^1]\n\n[^1]: Footnote text goes here.\n",
      equation:
        "\n\n$$\n\\begin{aligned}\n\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\\n\\nabla \\cdot \\mathbf{B} &= 0\n\\end{aligned}\n$$\n\n",
    };
    insertAtCursor(textarea, snippets[kind] || "");
  }

  global.PaperPDF = global.PaperPDF || {};
  global.PaperPDF.Editor = {
    init,
    wrapSelection,
    insertAtCursor,
    insertSnippet,
  };
})(typeof window !== "undefined" ? window : globalThis);
