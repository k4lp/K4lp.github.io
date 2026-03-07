# Iterated Development Plan: Premium Royal Developer Landing Page

## 1. Concept & UX Methodology
- **Objective:** Transform the current demo page into a mature, premium developer landing page for "Kalp", signaling a master architect.
- **Theme:** "Soft, premium, modern royal" — striking a balance between classical elegance and modern web capabilities.
- **Visuals:** Milky white background (`#eae7dc`), with deep charcoal text (`#2b2b2b`) and elegant bronze/gold accents (`#b59c72`). Typography uses `Cinzel` for structural, regal headings and `Lora` for legible, mature body text.
- **UX Goal:** Immediate perception of value and meticulousness. A highly readable, deeply structured layout. Everything from padding to animation timing must feel deliberate and expensive.

## 2. Core Features & Architecture
- **Redirect CTA:** A primary, flawlessly styled anchor tag (acting visually as a button) redirecting to `https://kalp.runasp.net`.
- **Mobile-First Approach:** Base styles optimized for minimal mobile screens, meticulously scaling up for tablet and desktop via precise media queries.
- **Modular JavaScript:** Split logic. `js/animations.js` handles visual orchestration; `js/interactive.js` handles specific complex interactions (like a magnetic button effect); `js/app.js` is the central controller.
- **Strict Clean Code:** Code must be legible enough for an engineer on zero sleep. Explicit CSS resets applied specifically to UI elements to prevent mobile browser hijacking.

## 3. Pixel-Level Specifications (CSS)

### Variables & Resets
- `--bg: #eae7dc` (milky white foundation)
- `--text-main: #2b2b2b` (deep charcoal, ensures high contrast without the harshness of `#000`)
- `--text-muted: #5a5a5a`
- `--accent-gold: #b59c72` (the 'royal' touch)
- `--accent-hover: #9e855c`
- `--border-light: rgba(181, 156, 114, 0.2)`
- **Reset:** Specific reset block targeting `.royal-btn` (`appearance: none`, `-webkit-appearance: none`, removing tap highlight colors).

### Layout & Spacing
- **Body:** `min-height: 100vh`, flexbox centering, `padding: 20px` (mobile).
- **Container (`.royal-card`):**
  - **Mobile:** `padding: 40px 20px`, `max-width: 100%`
  - **Desktop (`min-width: 768px`):** `padding: 80px 60px`, `max-width: 750px`
  - **Visuals:** `#fdfdfc` background, `border-radius: 4px`, `box-shadow: 0 15px 45px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)`.
  - **The Royal Border:** A pseudo-element (`::before`) creating an inset 1px solid border (`var(--accent-gold)`) with `opacity: 0.5`, positioned `15px` from all edges.

### The Redirect CTA (`.royal-btn`)
- **Structure:** An `<a>` tag, `display: inline-flex`, `align-items: center`.
- **Typography:** `font-family: var(--font-heading)`, `font-size: 0.95rem`, `letter-spacing: 2px`, `text-transform: uppercase`, `text-decoration: none`.
- **Box Model:** `padding: 18px 40px`, `border: 1px solid var(--accent-gold)`, `border-radius: 2px`.
- **Colors:** `color: var(--accent-gold)`, `background: transparent`.
- **Transitions:** `all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)`.
- **Hover/Focus State:** `background: var(--accent-gold)`, `color: #fff`, `transform: translateY(-3px)`, `box-shadow: 0 10px 20px rgba(181, 156, 114, 0.3)`.

## 4. Complex Visuals & Animations

### Staggered Entrance
- **Animation (`fadeInUp`):**
  - `0%`: `opacity: 0`, `transform: translateY(40px)`
  - `100%`: `opacity: 1`, `transform: translateY(0)`
- **Execution:** Elements inside the `.royal-card` start with `opacity: 0`. The JS module applies a class (`.is-visible`) sequentially with computed transition delays to create a smooth waterfall effect.

### Ambient Button Glow
- **Animation (`subtlePulse`):**
  - Continuous keyframe animation applied to `.royal-btn` to ensure it subtly breathes, drawing the user's eye to the primary goal (redirecting).
  - `box-shadow: 0 0 0 0 rgba(181, 156, 114, 0.4)` to `box-shadow: 0 0 0 15px rgba(181, 156, 114, 0)`.

## 5. Event-Level JavaScript Specifications

### Architecture
- **`js/animations.js`**
  - `class EntranceAnimator`:
    - `constructor(selector, staggerMs)`
    - `init()`: Uses `IntersectionObserver` to detect when the card enters the viewport (robustness), then loops through targets, setting `element.style.transitionDelay = index * staggerMs + 'ms'`, and adding an `.animate-in` class.
- **`js/interactive.js`**
  - `class MagneticButton`:
    - Event listener on `mousemove` over the `.royal-btn`. Calculates mouse position relative to button center and translates the button slightly (`transform: translate(x, y)`) for a premium, weighty, interactive feel.
    - Event listener on `mouseleave` to reset translation with a spring-like smooth transition.
- **`js/app.js`**
  - Central controller. `import` (or instantiate via IIFE if no build tool) both classes and initialize them on `DOMContentLoaded`.

## 6. Execution Todo
1. **Refactor HTML:** Rewrite `index.html` structure (Header, Title, Intro, CTA).
2. **Refactor CSS:** Clear `style.css` and rewrite strictly following the pixel-level specs, ensuring mobile-first cascading.
3. **Build JS Controllers:** Create `js/animations.js`, `js/interactive.js`, `js/app.js` with meticulous commenting.
4. **Verification:** Inspect file changes and ensure the logic connects flawlessly.
