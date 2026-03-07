# Iterated Development Plan: Premium Royal Developer Landing Page + Extensive SEO

## 1. Concept & UX Methodology
- **Objective:** Transform the current demo page into a mature, premium developer landing page for "Kalp Pariya", signaling a master architect. Incorporate extensive SEO to rank for .NET development in Ahmedabad and Surat.
- **Theme:** "Soft, premium, modern royal" — striking a balance between classical elegance and modern web capabilities.
- **Visuals:** Milky white background (`#eae7dc`), with deep charcoal text (`#2b2b2b`) and elegant bronze/gold accents (`#b59c72`). Typography uses `Cinzel` for structural, regal headings and `Lora` for legible, mature body text.
- **UX Goal:** Immediate perception of value and meticulousness. A highly readable, deeply structured layout. SEO implementation must be invisible to the user experience but highly visible to crawlers.

## 2. Comprehensive SEO Strategy (New Addition)

### Meta Data & Head Tags
- **Title Tag:** Must be highly optimized. Example: `Kalp Pariya | Expert .NET Developer & Architect | Ahmedabad & Surat`
- **Meta Description:** A concise, keyword-rich summary: "Kalp Pariya is a premium software developer and architect specializing in robust .NET solutions, serving clients across Ahmedabad, Surat, and beyond."
- **Meta Keywords:** "Kalp Pariya, .NET Developer, Software Architect, Ahmedabad, Surat, C#, ASP.NET, Web Development"
- **Canonical Tag:** Pointing to the primary URL (e.g., `https://kalp.runasp.net` or the current domain if this is hosted separately). For now, assume a root path `/`.
- **Open Graph (OG) & Twitter Cards:** Essential for social sharing (LinkedIn, Twitter).
  - `og:title`, `og:description`, `og:type` (website), `og:url`.
  - `twitter:card` (summary_large_image).

### JSON-LD Structured Data
- Use `Schema.org/Person` to explicitly tell search engines who this page represents.
- Fields: `name` ("Kalp Pariya"), `jobTitle` (".NET Developer & Architect"), `email` ("Kalppariya@gmail.com"), `url` ("https://kalp.runasp.net"), and `address` (JSON array mentioning Ahmedabad and Surat, Gujarat).

### Content SEO (On-Page)
- **H1 Tag:** Update to explicitly state "Kalp Pariya".
- **H2/Subtitles:** Update to include ".NET Developer & Architect".
- **Body Copy:** Naturally weave in the keywords "Ahmedabad" and "Surat" within the elegant prose.
- **Contact Info:** Integrate `Kalppariya@gmail.com` cleanly into the UI, ensuring it matches the royal aesthetic.

## 3. Core Features & Architecture (Retained)
- **Redirect CTA:** A primary, flawlessly styled anchor tag redirecting to `https://kalp.runasp.net`.
- **Mobile-First Approach:** Base styles optimized for minimal mobile screens.
- **Modular JavaScript:** Split logic (`js/animations.js`, `js/interactive.js`, `js/app.js`).
- **Strict Clean Code:** Code must be legible enough for an engineer on zero sleep.

## 4. Pixel-Level Specifications (CSS Updates)
- **New Element (`.royal-contact`):**
  - A subtle, beautifully styled mailto link.
  - Typography: `Lora`, `font-style: italic`, `font-size: 0.95rem`.
  - Colors: `--text-muted`, transitioning to `--accent-gold` on hover.
  - Border: Subtle `border-bottom: 1px dotted var(--border-light)`.

## 5. Execution Todo (Updated)
1. **Update Plan:** Refine `PLAN_DRAFT.md` (Completed).
2. **Inject SEO (`index.html`):** Add Meta tags, Open Graph, and JSON-LD schema to the `<head>`.
3. **Update Content (`index.html`):** Rewrite UI text to include "Kalp Pariya", ".NET Developer", "Ahmedabad", "Surat", and the `Kalppariya@gmail.com` link.
4. **Style New Content (`style.css`):** Add styles for the contact email link to ensure visual harmony.
5. **Verify Code Edits:** Ensure SEO is perfectly structured and UI remains flawless.
