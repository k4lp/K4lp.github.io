/**
 * UI Controller - The View/Controller
 *
 * This module is exclusively responsible for interacting with the DOM.
 * It listens to user actions and talks to the Audio Engine.
 * It reads like a story of user interactions.
 */

class GeneratorUIController {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;

    // Cache our main DOM elements so we don't have to repeatedly search the page
    this.elements = {
      masterPlayBtn: document.getElementById('master-play-btn'),
      masterPlayBtnText: document.querySelector('#master-play-btn .btn-text'),

      left: {
        volumeSlider: document.getElementById('left-volume'),
        waveBtns: document.querySelectorAll('.wave-btn[data-channel="left"]'),
        freqInput: document.getElementById('left-freq-input'),
        freqSlider: document.getElementById('left-freq-slider'),
        freqDownBtn: document.getElementById('left-freq-down'),
        freqUpBtn: document.getElementById('left-freq-up')
      },

      right: {
        volumeSlider: document.getElementById('right-volume'),
        waveBtns: document.querySelectorAll('.wave-btn[data-channel="right"]'),
        freqInput: document.getElementById('right-freq-input'),
        freqSlider: document.getElementById('right-freq-slider'),
        freqDownBtn: document.getElementById('right-freq-down'),
        freqUpBtn: document.getElementById('right-freq-up')
      }
    };
  }

  /**
   * Sets up all event listeners on the page.
   * Called once on startup.
   */
  initialize() {
    this._setupMasterControls();
    this._setupChannelControls('left');
    this._setupChannelControls('right');
  }

  /**
   * Binds the giant "Initiate Sound" button.
   */
  _setupMasterControls() {
    this.elements.masterPlayBtn.addEventListener('click', () => {
      // Toggle playback in the engine, which returns the new state
      const isNowPlaying = this.audioEngine.togglePlayback();

      // Update UI to reflect reality
      if (isNowPlaying) {
        this.elements.masterPlayBtn.classList.add('playing');
        this.elements.masterPlayBtnText.textContent = 'Cease Sound';
      } else {
        this.elements.masterPlayBtn.classList.remove('playing');
        this.elements.masterPlayBtnText.textContent = 'Initiate Sound';
      }
    });
  }

  /**
   * Binds the volume, frequency, and wave controls for a specific side (left or right).
   *
   * @param {string} channelSide - 'left' or 'right'
   */
  _setupChannelControls(channelSide) {
    const channelElements = this.elements[channelSide];

    // 1. Volume Slider
    channelElements.volumeSlider.addEventListener('input', (event) => {
      const newVolume = parseFloat(event.target.value);
      this.audioEngine.setVolume(channelSide, newVolume);
    });

    // 2. Waveform Buttons
    channelElements.waveBtns.forEach(btn => {
      btn.addEventListener('click', (event) => {
        // Remove active class from all buttons in this channel
        channelElements.waveBtns.forEach(b => b.classList.remove('active'));

        // Add active class to the clicked one
        const clickedBtn = event.target;
        clickedBtn.classList.add('active');

        // Tell the engine about the change
        const selectedWave = clickedBtn.getAttribute('data-wave');
        this.audioEngine.setWaveform(channelSide, selectedWave);
      });
    });

    // 3. Frequency Slider (Coarse adjustment)
    channelElements.freqSlider.addEventListener('input', (event) => {
      const newFreq = parseInt(event.target.value, 10);

      // Keep the text input in sync with the slider
      channelElements.freqInput.value = newFreq;

      this.audioEngine.setFrequency(channelSide, newFreq);
    });

    // 4. Frequency Number Input (Fine adjustment via typing)
    channelElements.freqInput.addEventListener('change', (event) => {
      let newFreq = parseInt(event.target.value, 10);

      // Basic bounds checking
      if (isNaN(newFreq)) newFreq = 432;
      if (newFreq < 20) newFreq = 20;
      if (newFreq > 20000) newFreq = 20000;

      event.target.value = newFreq;

      // Update slider if within slider bounds (slider max is 1000 for better sweeping resolution)
      if (newFreq <= 1000) {
        channelElements.freqSlider.value = newFreq;
      }

      this.audioEngine.setFrequency(channelSide, newFreq);
    });

    // 5. Fine tuning Buttons (- and +)
    channelElements.freqDownBtn.addEventListener('click', () => {
      this._incrementFrequency(channelSide, channelElements, -1);
    });

    channelElements.freqUpBtn.addEventListener('click', () => {
      this._incrementFrequency(channelSide, channelElements, 1);
    });
  }

  /**
   * Helper function to bump frequency up or down by a specific amount.
   */
  _incrementFrequency(channelSide, channelElements, amount) {
    let currentFreq = parseInt(channelElements.freqInput.value, 10);
    if (isNaN(currentFreq)) currentFreq = 432;

    let newFreq = currentFreq + amount;

    // Bounds check
    if (newFreq < 20) newFreq = 20;
    if (newFreq > 20000) newFreq = 20000;

    // Update UI elements
    channelElements.freqInput.value = newFreq;
    if (newFreq <= parseInt(channelElements.freqSlider.max, 10)) {
        channelElements.freqSlider.value = newFreq;
    }

    // Tell Engine
    this.audioEngine.setFrequency(channelSide, newFreq);
  }
}

// Export for global use
window.UIController = GeneratorUIController;
