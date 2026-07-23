# PaperPDF — layout physics & export pipeline

## Coordinate model (3 layers)

```
┌─ Viewport (screen) ─────────────────────────────────────────┐
│  #app → toolbar / workspace / status                         │
│  ┌─ #preview-scroll (scroll container) ───────────────────┐ │
│  │  #preview-canvas (flex, centered)                       │ │
│  │  ┌─ .paper-sheet (optional zoom: transform scale) ───┐ │ │
│  │  │  ┌─ .paper-document  (PAGE box) ────────────────┐ │ │ │
│  │  │  │  padding = page margins                      │ │ │ │
│  │  │  │  width  = page width (e.g. 8.5in)            │ │ │ │
│  │  │  │  ┌─ content flow (columns, figures, math) ─┐ │ │ │ │
│  │  │  │  │  usable width = pageW − mL − mR         │ │ │ │ │
│  │  │  │  └─────────────────────────────────────────┘ │ │ │ │
│  │  │  └──────────────────────────────────────────────┘ │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Layer contracts

| Layer | Owns | Must not |
|-------|------|----------|
| **Page box** | Physical paper size (`--paper-width/height`) | Transform from zoom at export time |
| **Margin band** | Inset padding *or* PDF margins — **one owner only** | Be applied twice (CSS + jsPDF) |
| **Content box** | Typography, columns, figures | Exceed content width without wrap |
| **Capture** | html2canvas raster of content box only | Capture off-screen `left:-99999px` offsets |
| **PDF page** | jsPDF page size + margin placement of raster | Re-scale unevenly on X vs Y |

## Data pipeline (markdown → PDF)

```
Editor text
    │
    ▼
Markdown engine ──► HTML fragments (+ front matter meta)
    │
    ├─► LaTeX / KaTeX ──► .katex / .katex-display
    ├─► Code / HLJS ────► <pre><code>
    └─► Mermaid ────────► SVG figures (async)
    │
    ▼
Renderer.buildDocumentHtml
    │  wraps → .paper-sheet > article.paper-document
    ▼
Preview DOM  (#preview-canvas)
    │  styles ← Presets CSS variables
    │  zoom   ← .paper-sheet { transform }  (screen only)
    ▼
cloneForExport()  ── deep clone article only (no sheet zoom)
    │
    ▼
LayoutGeometry.forPreset(preset)
    │  pageW/H, margins → contentW/H (inches + px @ 96dpi)
    ▼
Export host  (#pdf-export-source)
    │  position: fixed; left:0; top:0; opacity:0
    │  width = contentW   ← NOT full page width
    │  padding = 0        ← margins owned by jsPDF
    │  overflow: visible; transform: none
    ▼
html2canvas  (scale 2, scrollX/Y = 0, width/height locked)
    │
    ▼
jsPDF pages  margin = [top, left, bottom, right] inches
    │  places canvas into content rectangle
    ▼
.pdf file
```

## Why content was shifted / clipped

1. **Double width**: clone `width = 8.5in` (full page) *and* jsPDF margins → canvas wider than content slot → horizontal scale/clip.
2. **Off-screen host** `left: -99999px` → html2canvas origin bugs → rightward shift, left half blank/cropped.
3. **Preview zoom transform** could leak if sheet was cloned.
4. **Overflow** from KaTeX / tables / pre without `max-width: 100%` on the export surface.

## Invariants (export)

1. Export clone width **equals** `pageWidth − marginLeft − marginRight`.
2. Export clone padding **0**; PDF margin array carries the four sides.
3. Export host is **on-origin** (fixed 0,0), not far off-screen.
4. No `transform` / zoom on the capture tree.
5. All media (fonts, images, mermaid SVG) settled before capture.
6. Block-level figures, tables, pre, `.katex-display` clamp to content width.
