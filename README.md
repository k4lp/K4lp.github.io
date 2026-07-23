# PaperPDF

**Research-grade Markdown → PDF** in pure HTML, CSS, and JavaScript. All libraries and fonts are vendored locally—no CDN at runtime.

## Features

- **Academic presets**: IEEE, ACM, APA 7, MLA 9, Chicago, Nature-style, arXiv/LaTeX article, Thesis, A4 report, Manuscript, Custom
- **Typography**: STIX Two, Libertinus Serif, Source Serif 4, EB Garamond, Libre Baskerville, Crimson Pro, JetBrains Mono
- **LaTeX math** via KaTeX (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`)
- **Flowcharts & diagrams** via Mermaid fenced blocks
- **Syntax highlighting** via highlight.js
- **YAML front matter** for title, authors, affiliation, keywords
- **Footnotes**, table captions, page breaks, GFM tables
- **Live preview** with zoom, word/page estimates
- **Export**: one-click PDF (html2pdf), Print → Save as PDF (best text fidelity), HTML, Markdown
- **Layout panel**: margins, font size, line height, columns, paper size

## Quick start

Serve the folder over HTTP (required for some browsers; `file://` often works with the embedded sample):

```bash
# Python
python3 -m http.server 8080

# Node
npx --yes serve -l 8080
```

Open `http://localhost:8080/`.

## Project layout

```
index.html              # single app shell
css/                    # fonts, chrome, paper, print
js/
  config/presets.js     # academic presets
  core/                 # markdown, latex, mermaid, pdf
  ui/                   # editor, toolbar, settings
  utils/
lib/                    # marked, katex, mermaid, hljs, purify, html2pdf
fonts/                  # woff2 academic faces
samples/                # sample research paper
```

## Markdown conventions

```markdown
---
title: Paper Title
author: Name
affiliation: Lab
keywords: [a, b]
---

## Abstract

Your summary.

Inline $x^2$ and display:

$$
\int_0^1 f(x)\,dx
$$

```mermaid
flowchart TD
  A --> B
```

<!-- table: Results summary -->
| A | B |
|---|---|
| 1 | 2 |

<!-- pagebreak -->

Footnote[^1]

[^1]: Note text.
```

## Export tips

| Method | When to use |
|--------|-------------|
| **Export PDF** | Fast download via html2pdf (canvas raster) |
| **Print** | Highest text quality — choose “Save as PDF” in the system dialog |
| **HTML** | Archival snapshot of the rendered paper |

## Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd+S` | Save Markdown |
| `Ctrl/Cmd+P` | Print |
| `Ctrl/Cmd+Shift+E` | Export PDF |
| `Ctrl/Cmd+B` / `I` / `K` | Bold / italic / link in editor |
| `Tab` | Insert two spaces |

## License

App code: use freely. Third-party libraries retain their own licenses (MIT/Apache for marked, KaTeX, Mermaid, highlight.js, DOMPurify, html2pdf; fonts under SIL OFL / respective licenses).
