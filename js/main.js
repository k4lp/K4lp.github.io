/**
 * Main Entry Point
 *
 * This file brings the application to life by wiring the Model (Audio Engine)
 * and the View (UI Controller) together when the page is ready.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Get the global audio engine instance (created in audio-engine.js)
  const engine = window.AudioEngine;

  // 2. Create the UI controller and give it access to the engine
  const ui = new window.UIController(engine);

  // 3. Start listening to user interactions
  ui.initialize();

  console.log("Binaural Frequency Generator Initialized. Ready for meditation.");
});
