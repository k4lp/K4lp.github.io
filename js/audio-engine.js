/**
 * Audio Engine - The Model
 *
 * This module purely handles the Web Audio API. It knows nothing about the HTML or DOM.
 * It is designed for maximum readability: clear variable names, pure functions where possible,
 * and conversational comments.
 */

class BinauralAudioEngine {
  constructor() {
    this.audioContext = null;
    this.isPlaying = false;

    // We store references to our nodes so we can update them in real-time
    this.nodes = {
      masterGain: null,

      left: {
        oscillator: null,
        gain: null,
        panner: null,
      },

      right: {
        oscillator: null,
        gain: null,
        panner: null,
      }
    };

    // State holds the current parameters.
    // We initialize with default meditation frequencies (e.g., 432Hz base, 440Hz right for an 8Hz Alpha binaural beat)
    this.state = {
      left: { frequency: 432, type: 'sine', volume: 0.5 },
      right: { frequency: 440, type: 'sine', volume: 0.5 }
    };
  }

  /**
   * Initializes the AudioContext and builds the routing graph.
   * Browsers require audio contexts to be created ONLY after a user gesture (like clicking a button).
   *
   * @param {Object} options - Configuration options for the AudioContext
   */
  initialize(options = {}) {
    if (this.audioContext) return; // Only initialize once if it exists

    // Fallback for older Safari
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    // Setup high quality options prioritizing playback smoothness
    const contextOptions = { latencyHint: 'playback' };

    if (options.sampleRate && options.sampleRate !== 'default') {
      contextOptions.sampleRate = parseInt(options.sampleRate, 10);
    }

    try {
      this.audioContext = new AudioContextClass(contextOptions);
    } catch (e) {
      console.warn("Requested sample rate not supported, falling back to default.", e);
      this.audioContext = new AudioContextClass(); // Fallback if hardware rejects 192kHz
    }

    // 1. Create the master volume control
    this.nodes.masterGain = this.audioContext.createGain();
    this.nodes.masterGain.connect(this.audioContext.destination);

    // Default master to silent until we officially "play"
    this.nodes.masterGain.gain.value = 0;

    // 2. Setup the left ear channel
    this._setupChannel('left', -1);

    // 3. Setup the right ear channel
    this._setupChannel('right', 1);
  }

  /**
   * Internal helper to build an individual audio channel (left or right).
   *
   * @param {string} channelSide - 'left' or 'right'
   * @param {number} panValue - -1 for hard left, 1 for hard right
   */
  _setupChannel(channelSide, panValue) {
    const context = this.audioContext;
    const channelState = this.state[channelSide];
    const channelNodes = this.nodes[channelSide];

    // Create the oscillator (the sound generator)
    channelNodes.oscillator = context.createOscillator();
    channelNodes.oscillator.type = channelState.type;
    channelNodes.oscillator.frequency.value = channelState.frequency;

    // Create a volume control for just this channel
    channelNodes.gain = context.createGain();
    channelNodes.gain.gain.value = channelState.volume;

    // Create a panner to push the sound completely to one ear
    channelNodes.panner = context.createStereoPanner();
    channelNodes.panner.pan.value = panValue;

    // Connect the chain: Oscillator -> Gain -> Panner -> Master Gain
    channelNodes.oscillator.connect(channelNodes.gain);
    channelNodes.gain.connect(channelNodes.panner);
    channelNodes.panner.connect(this.nodes.masterGain);

    // Start generating sound (it won't be heard yet because masterGain is 0)
    channelNodes.oscillator.start();
  }

  /**
   * Smoothly fades the master volume up to start playing the sound.
   */
  play() {
    if (!this.audioContext) this.initialize();

    // If the context was suspended (e.g., by the browser), wake it up
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Smooth fade in over 0.1 seconds to prevent audio "clicking" artifacts
    const currentTime = this.audioContext.currentTime;
    this.nodes.masterGain.gain.cancelScheduledValues(currentTime);
    this.nodes.masterGain.gain.setValueAtTime(this.nodes.masterGain.gain.value, currentTime);
    this.nodes.masterGain.gain.linearRampToValueAtTime(1, currentTime + 0.1);

    this.isPlaying = true;
  }

  /**
   * Smoothly fades the master volume down to stop playing.
   */
  stop() {
    if (!this.audioContext || !this.isPlaying) return;

    // Smooth fade out
    const currentTime = this.audioContext.currentTime;
    this.nodes.masterGain.gain.cancelScheduledValues(currentTime);
    this.nodes.masterGain.gain.setValueAtTime(this.nodes.masterGain.gain.value, currentTime);
    this.nodes.masterGain.gain.linearRampToValueAtTime(0, currentTime + 0.1);

    this.isPlaying = false;
  }

  /**
   * Toggles between play and stop states.
   * @returns {boolean} The new isPlaying state.
   */
  togglePlayback() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  /**
   * Updates the frequency (pitch) of a specific channel.
   *
   * @param {string} channelSide - 'left' or 'right'
   * @param {number} frequency - The target frequency in Hertz
   */
  setFrequency(channelSide, frequency) {
    this.state[channelSide].frequency = frequency;

    if (this.nodes[channelSide].oscillator) {
      // Exponential ramp sounds smoother for frequency changes
      const currentTime = this.audioContext.currentTime;
      this.nodes[channelSide].oscillator.frequency.cancelScheduledValues(currentTime);
      this.nodes[channelSide].oscillator.frequency.setValueAtTime(this.nodes[channelSide].oscillator.frequency.value, currentTime);
      this.nodes[channelSide].oscillator.frequency.exponentialRampToValueAtTime(frequency, currentTime + 0.05);
    }
  }

  /**
   * Updates the waveform shape (tone quality) of a specific channel.
   *
   * @param {string} channelSide - 'left' or 'right'
   * @param {string} waveType - 'sine', 'square', 'sawtooth', or 'triangle'
   */
  setWaveform(channelSide, waveType) {
    this.state[channelSide].type = waveType;

    if (this.nodes[channelSide].oscillator) {
      this.nodes[channelSide].oscillator.type = waveType;
    }
  }

  /**
   * Re-instantiates the AudioContext to change the sample rate (engine fidelity).
   * It gracefully stops the audio, destroys the context, rebuilds it, and resumes.
   *
   * @param {string} sampleRate - 'default', '96000', or '192000'
   */
  async setFidelity(sampleRate) {
    const wasPlaying = this.isPlaying;

    // 1. Gracefully fade out
    if (wasPlaying) {
      this.stop();
      // Wait for fade out to complete (0.1s + buffer)
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    // 2. Destroy the existing context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    // 3. Re-initialize with new settings.
    // This will use this.state to rebuild the oscillators exactly as they were.
    this.initialize({ sampleRate });

    // 4. Resume if needed
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Updates the individual volume for a specific channel.
   *
   * @param {string} channelSide - 'left' or 'right'
   * @param {number} volume - A float between 0.0 and 1.0
   */
  setVolume(channelSide, volume) {
    this.state[channelSide].volume = volume;

    if (this.nodes[channelSide].gain) {
      const currentTime = this.audioContext.currentTime;
      this.nodes[channelSide].gain.gain.cancelScheduledValues(currentTime);
      this.nodes[channelSide].gain.gain.setValueAtTime(this.nodes[channelSide].gain.gain.value, currentTime);
      this.nodes[channelSide].gain.gain.linearRampToValueAtTime(volume, currentTime + 0.05);
    }
  }
}

// Export for global use
window.AudioEngine = new BinauralAudioEngine();
