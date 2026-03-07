# Audio Quality Integration Plan - 4 Iterations

## Iteration 1: Brainstorming & Concept
**Goal:** Introduce "highest quality possible" controls to the Binaural Frequency Generator without breaking the "Royal Modern" aesthetic.
**Initial Thoughts:**
- "High quality" in Web Audio typically means manipulating the `sampleRate` (e.g., 44.1kHz vs 96kHz vs 192kHz) and `latencyHint` (e.g., 'interactive' vs 'playback').
- High sample rates provide cleaner high-frequency reproduction (less aliasing), which is crucial for pure sine waves in meditation.
- We need UI controls for this. Maybe a dropdown menu?
- **Technical Challenge:** The `AudioContext` sample rate is read-only after creation. To change it, we must destroy the existing context, create a new one with the desired `{ sampleRate }`, and rebuild our entire audio graph (oscillators, gains, panners) while preserving the current playing state, frequencies, and volumes.

## Iteration 2: Critique & UX Refinement
**Critique of Iteration 1:**
- Dropdown menus are not "Royal Modern." They look like standard OS UI and break immersion.
- We need something elegant, perhaps a toggle pill or a distinct settings card that feels like high-end audio equipment (like a McIntosh amplifier switch).
- The user flow needs to be explicit. "Quality" might be too vague. We should label it "Audio Engine Fidelity" or "Sample Rate".
- The teardown/rebuild of the `AudioContext` might cause a "pop" or audio glitch. We need to handle the transition gracefully (e.g., fade out, rebuild, fade in).

## Iteration 3: UI/UX & Technical Blueprint
**UX Design:**
- Add a new section below the "Initiate Sound" button, or perhaps as a subtle header above the channels, labeled "Engine Fidelity".
- Use an elegant toggle group (similar to the waveform selectors).
- **Options:**
  - `Standard` (44.1kHz / 48kHz depending on hardware default)
  - `High-Res` (96kHz)
  - `Audiophile` (192kHz - Note: browser support varies, but we will request it).
- **Behavior:** When a user clicks a new fidelity level, if audio is playing, it gracefully pauses (fades out), reboots the engine, and resumes (fades in) immediately.

**Technical Strategy:**
- `audio-engine.js`: Add a `reboot({ sampleRate })` method.
  - Save current state (is playing?).
  - Call `stop()` to fade out.
  - Call `this.audioContext.close()`.
  - Re-run `initialize(newOptions)` and re-apply all frequencies/volumes.
  - Call `play()` if it was previously playing.

## Iteration 4: Pixel/Event-Level Technical Specification
**HTML (`generator.html`):**
- Insert a `<section class="fidelity-controls">` directly below the `app-header` or embedded in the `app-footer`. Embedding it below the master play button in the footer keeps the main cards clean.
- HTML Structure:
  ```html
  <div class="fidelity-group">
    <label class="control-label">Engine Fidelity</label>
    <div class="fidelity-selector">
      <button class="fidelity-btn active" data-rate="default">Standard</button>
      <button class="fidelity-btn" data-rate="96000">96kHz</button>
      <button class="fidelity-btn" data-rate="192000">192kHz</button>
    </div>
  </div>
  ```

**CSS (`generator.css`):**
- Style `.fidelity-group` to match the `.control-group` aesthetic.
- Use a slightly smaller font for `.fidelity-btn` to indicate it's a secondary setting compared to waveforms.
- Ensure the active state uses the `--accent-dark` or `--text-main` to look like a hardware switch.

**JS (`audio-engine.js`):**
- Update `initialize(options = {})`. Allow passing `sampleRate`.
- ```javascript
  const contextOptions = { latencyHint: 'playback' }; // 'playback' prioritizes smooth audio over low latency
  if (options.sampleRate && options.sampleRate !== 'default') {
    contextOptions.sampleRate = parseInt(options.sampleRate, 10);
  }
  this.audioContext = new AudioContextClass(contextOptions);
  ```
- Add `async setFidelity(rateString)`:
  - If `this.audioContext` exists, await `this.audioContext.close()`.
  - Set `this.audioContext = null`.
  - Call `initialize({ sampleRate: rateString })`.
  - Re-apply `this.state` to the newly created nodes.
  - Resume playback if it was active.

**JS (`ui-controller.js`):**
- Query `.fidelity-btn`.
- Add click listeners. On click: update `.active` classes, read `data-rate`, call `audioEngine.setFidelity(rate)`.
- **Event Handling:** Ensure the button click handles async teardown without throwing errors if the user double-clicks rapidly (debounce or disable buttons during transition).
