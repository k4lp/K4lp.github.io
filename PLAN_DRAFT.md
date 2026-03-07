# Iterated Development Plan: Premium Royal Developer Landing Page + Aggressive SEO

## 1. Concept & UX Methodology
- **Objective:** Transform the current demo page into a mature, premium developer landing page for "Kalp Pariya", signaling a master architect. Incorporate aggressive technical and on-page SEO to rank highly for .NET development in Ahmedabad and Surat.
- **Theme:** "Soft, premium, modern royal" — striking a balance between classical elegance and modern web capabilities.
- **Visuals:** Milky white background (`#eae7dc`), with deep charcoal text (`#2b2b2b`) and elegant bronze/gold accents (`#b59c72`). Typography uses `Cinzel` for structural, regal headings and `Lora` for legible, mature body text.
- **UX Goal:** Immediate perception of value and meticulousness. SEO implementation must be invisible to the user experience but aggressively visible and compliant with modern crawler standards.

## 2. Aggressive Technical SEO Strategy (New Addition)

### Modern Head Directives & Performance
- **Aggressive Robots Meta:** Explicitly allow maximum indexing: `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`.
- **Resource Hints:** `dns-prefetch` and `preconnect` for `fonts.googleapis.com` to speed up First Contentful Paint (FCP), a core web vital ranking factor.
- **Mobile & Web App Manifest:** Include `<meta name="theme-color" content="#eae7dc">` to theme the mobile browser UI, and link to a `site.webmanifest` for PWA readiness.
- **Icons:** Add standard placeholder `<link>` tags for `apple-touch-icon` and `icon`.
- **External Links:** Ensure the CTA redirect button uses `rel="noopener noreferrer"` for security and performance.

### Site Architecture & Crawlability Files
- **`sitemap.xml`:** A standard XML sitemap pointing to the root URL (`https://kalp.runasp.net/`), setting a high `priority="1.0"` and `changefreq="monthly"`.
- **`robots.txt`:** A clean robots directive allowing all user-agents (`User-agent: *`, `Allow: /`) and explicitly linking to the `sitemap.xml` to forcefully guide crawlers.
- **`site.webmanifest`:** A JSON manifest providing the app name, short name, start URL, background color, and theme color, solidifying the site as a modern, installable web entity.

## 3. Comprehensive Content SEO (Retained & Refined)

### Meta Data & Head Tags
- **Title Tag:** `Kalp Pariya | Expert .NET Developer & Architect | Ahmedabad & Surat`
- **Meta Description:** Keyword-rich summary focusing on premium .NET solutions.
- **Canonical Tag:** Pointing to `https://kalp.runasp.net/`.
- **Open Graph (OG) & Twitter Cards:** Complete suite for rich social sharing (`og:title`, `twitter:card`, etc.).

### JSON-LD Structured Data
- Strict `Schema.org/Person` schema detailing Name, Job Title, Email, URL, and an array of `address` blocks specifically highlighting Ahmedabad and Surat, Gujarat.

### Content Weaving
- "Kalp Pariya", ".NET Developer", "Ahmedabad", "Surat", and the `Kalppariya@gmail.com` link are elegantly woven into the `index.html` copy.

## 4. Execution Todo (Updated)
1. **Update Plan:** Refine `PLAN_DRAFT.md` (Completed).
2. **Create Tech SEO Files:** Generate `sitemap.xml`, `robots.txt`, and `site.webmanifest` in the root directory.
3. **Enhance Head (`index.html`):** Inject aggressive robots meta, theme-color, webmanifest links, icon links, and resource hints.
4. **Update CTA (`index.html`):** Add `rel="noopener noreferrer"` to external links.
5. **Verify Code Edits:** Ensure all technical files are valid and HTML head is pristine.
