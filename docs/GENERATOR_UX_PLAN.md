# Frequency Generator - UX & Technical Methodology Plan

## 1. Design & UX Philosophy
**Theme:** "Royal Modern"
- **Color Palette:** Milky white background (`#eae7dc`), elegant deep charcoal text, and subtle golden/brass accents for active states, reflecting a premium, calming aesthetic suitable for meditation.
- **Typography:** Serif fonts (`Cinzel` for headings, `Lora` for values and body) to carry over the royal, high-end feel.
- **Layout (Mobile-First):**
  - Stacked vertical layout optimized for thumb reachability.
  - Large, easily tappable touch targets.
  - Generous whitespace to prevent cognitive overload.
- **User Flow:**
  - **Master Play/Pause:** A prominent, central button to instantly start or stop all audio.
  - **Channel Separation:** Two distinct, visually symmetrical cards for the Left Ear and Right Ear settings, promoting mental clarity about what is playing where.
  - **Inputs:**
    - Waveform selection (Sine, Square, Sawtooth, Triangle) via elegant pill-shaped toggles.
    - Frequency input via coarse slider (for sweeping) and fine +/- buttons or direct text input (for exact binaural beat targets).
    - Independent volume controls.

## 2. Technical Methodology
**Goal:** "Brainfried readability" - Extreme clarity, decoupling, and robustness.

### 2.1 Architecture
The application will be split into three distinct Javascript layers to separate concerns:
1.  **`js/audio-engine.js` (The Model):** A pure Web Audio API wrapper. It knows *nothing* about the DOM. It exposes a simple API (`setFrequency('left', 432)`, `play()`, `stop()`).
2.  **`js/ui-controller.js` (The View/Controller):** Handles all DOM queries, event listeners, and updates the HTML to reflect the state. It translates user actions into calls to the Audio Engine.
3.  **`js/main.js` (The Entry Point):** Initializes the Audio Engine and UI Controller, injecting dependencies and starting the application lifecycle.

### 2.2 Web Audio API Implementation
- **AudioContext:** A single `AudioContext` will be initialized upon the first user interaction (to comply with browser autoplay policies).
- **Oscillator Nodes:** Two `OscillatorNode` instances will be created (one for left, one for right).
- **Gain Nodes (Volume):** Each oscillator feeds into its own `GainNode` for independent volume control. A Master `GainNode` will sit at the end of the chain for overall muting/fading.
- **StereoPanner Nodes:**
  - Left oscillator -> `StereoPannerNode` (pan: -1)
  - Right oscillator -> `StereoPannerNode` (pan: +1)
- **Routing:** Oscillator -> Gain -> Panner -> Master Gain -> AudioContext.destination.

### 2.3 Code Quality & Readability Standards
- Extensive, conversational JSDoc comments explaining *why* something is done, not just *what*.
- Meaningful, unabbreviated variable names (e.g., `leftChannelOscillator` instead of `lOsc`).
- Early returns to avoid deep nesting.
- Pure functions where possible.
