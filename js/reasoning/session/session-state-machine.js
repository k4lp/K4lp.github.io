/**
 * SessionStateMachine
 *
 * Manages reasoning session lifecycle with formal state transitions.
 * Provides state validation, history tracking, and event hooks.
 *
 * States:
 * - CREATED: Session initialized
 * - ACTIVE: Session running
 * - PAUSED: Session paused by user
 * - STOPPED: Session manually stopped
 * - COMPLETED: Session completed successfully
 * - FAILED: Session failed due to errors
 *
 * Valid Transitions:
 * CREATED -> ACTIVE
 * ACTIVE -> PAUSED | COMPLETED | FAILED | STOPPED
 * PAUSED -> ACTIVE | STOPPED
 * Others -> (terminal, no transitions)
 */

class SessionStateMachine {
  /**
   * Session states enum
   */
  static STATES = {
    CREATED: 'created',
    ACTIVE: 'active',
    PAUSED: 'paused',
    STOPPED: 'stopped',
    COMPLETED: 'completed',
    FAILED: 'failed'
  };

  /**
   * Valid state transitions
   */
  static TRANSITIONS = {
    [SessionStateMachine.STATES.CREATED]: [
      SessionStateMachine.STATES.ACTIVE
    ],
    [SessionStateMachine.STATES.ACTIVE]: [
      SessionStateMachine.STATES.PAUSED,
      SessionStateMachine.STATES.STOPPED,
      SessionStateMachine.STATES.COMPLETED,
      SessionStateMachine.STATES.FAILED
    ],
    [SessionStateMachine.STATES.PAUSED]: [
      SessionStateMachine.STATES.ACTIVE,
      SessionStateMachine.STATES.STOPPED
    ],
    [SessionStateMachine.STATES.STOPPED]: [],
    [SessionStateMachine.STATES.COMPLETED]: [],
    [SessionStateMachine.STATES.FAILED]: []
  };

  /**
   * Create new state machine for session
   * @param {string} sessionId - Unique session identifier
   */
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.currentState = SessionStateMachine.STATES.CREATED;
    this.stateHistory = [];
    this.listeners = new Map();
    this.metadata = {};

    this._recordState(SessionStateMachine.STATES.CREATED, {
      message: 'Session created'
    });
  }

  /**
   * Transition to new state with validation
   * @param {string} toState - Target state
   * @param {Object} metadata - Additional data about transition
   * @returns {boolean} Success status
   * @throws {Error} If transition is invalid
   */
  transition(toState, metadata = {}) {
    if (!Object.values(SessionStateMachine.STATES).includes(toState)) {
      throw new Error(`Invalid state: ${toState}`);
    }

    const validNextStates = SessionStateMachine.TRANSITIONS[this.currentState];

    if (!validNextStates || !validNextStates.includes(toState)) {
      throw new Error(
        `Invalid transition from ${this.currentState} to ${toState}. ` +
        `Valid transitions: ${validNextStates ? validNextStates.join(', ') : 'none'}`
      );
    }

    const fromState = this.currentState;
    this.currentState = toState;
    this.metadata = { ...this.metadata, ...metadata };

    this._recordState(toState, metadata);
    this._emitTransition(fromState, toState, metadata);

    if (typeof EventBus !== 'undefined') {
      EventBus.emit('SESSION_STATE_CHANGED', {
        sessionId: this.sessionId,
        fromState,
        toState,
        metadata
      });
    }

    return true;
  }

  /**
   * Get current state
   * @returns {string} Current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get state history
   * @returns {Array} State history with timestamps
   */
  getStateHistory() {
    return [...this.stateHistory];
  }

  /**
   * Check if can transition to given state
   * @param {string} state - Target state
   * @returns {boolean} Whether transition is valid
   */
  canTransitionTo(state) {
    const validNextStates = SessionStateMachine.TRANSITIONS[this.currentState];
    return validNextStates && validNextStates.includes(state);
  }

  /**
   * Check if session is in terminal state
   * @returns {boolean} Whether state is terminal
   */
  isTerminal() {
    const terminalStates = [
      SessionStateMachine.STATES.STOPPED,
      SessionStateMachine.STATES.COMPLETED,
      SessionStateMachine.STATES.FAILED
    ];
    return terminalStates.includes(this.currentState);
  }

  /**
   * Check if session is active
   * @returns {boolean} Whether session can execute iterations
   */
  isActive() {
    return this.currentState === SessionStateMachine.STATES.ACTIVE;
  }

  /**
   * Check if session is paused
   * @returns {boolean} Whether session is paused
   */
  isPaused() {
    return this.currentState === SessionStateMachine.STATES.PAUSED;
  }

  /**
   * Register listener for state transition
   * @param {string} state - State to listen for
   * @param {Function} callback - Callback function
   */
  on(state, callback) {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, []);
    }
    this.listeners.get(state).push(callback);
  }

  /**
   * Register listener for any transition
   * @param {Function} callback - Callback function
   */
  onAny(callback) {
    this.on('*', callback);
  }

  /**
   * Remove listener
   * @param {string} state - State or '*'
   * @param {Function} callback - Callback to remove
   */
  off(state, callback) {
    if (!this.listeners.has(state)) return;

    const callbacks = this.listeners.get(state);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Get metadata
   * @returns {Object} Accumulated metadata
   */
  getMetadata() {
    return { ...this.metadata };
  }

  /**
   * Get duration in each state
   * @returns {Object} State durations (ms)
   */
  getStateDurations() {
    const durations = {};

    for (let i = 0; i < this.stateHistory.length; i++) {
      const current = this.stateHistory[i];
      const next = this.stateHistory[i + 1];

      const startTime = new Date(current.timestamp).getTime();
      const endTime = next
        ? new Date(next.timestamp).getTime()
        : Date.now();

      const duration = endTime - startTime;

      if (!durations[current.state]) {
        durations[current.state] = 0;
      }
      durations[current.state] += duration;
    }

    return durations;
  }

  /**
   * Get total session duration
   * @returns {number} Duration in milliseconds
   */
  getTotalDuration() {
    if (this.stateHistory.length === 0) return 0;

    const firstState = this.stateHistory[0];
    const lastState = this.stateHistory[this.stateHistory.length - 1];

    const startTime = new Date(firstState.timestamp).getTime();
    const endTime = this.isTerminal()
      ? new Date(lastState.timestamp).getTime()
      : Date.now();

    return endTime - startTime;
  }

  /**
   * Get session summary
   * @returns {Object} Session summary
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      currentState: this.currentState,
      isTerminal: this.isTerminal(),
      isActive: this.isActive(),
      isPaused: this.isPaused(),
      totalDuration: this.getTotalDuration(),
      stateDurations: this.getStateDurations(),
      transitionCount: this.stateHistory.length - 1,
      metadata: this.getMetadata()
    };
  }

  /**
   * Record state in history
   * @private
   */
  _recordState(state, metadata = {}) {
    this.stateHistory.push({
      state,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit transition event
   * @private
   */
  _emitTransition(fromState, toState, metadata) {
    const stateListeners = this.listeners.get(toState) || [];
    stateListeners.forEach(callback => {
      try {
        callback(fromState, toState, metadata, this.sessionId);
      } catch (error) {
        console.error('Error in session state machine listener:', error);
      }
    });

    const wildcardListeners = this.listeners.get('*') || [];
    wildcardListeners.forEach(callback => {
      try {
        callback(fromState, toState, metadata, this.sessionId);
      } catch (error) {
        console.error('Error in session state machine wildcard listener:', error);
      }
    });
  }

  /**
   * Serialize to JSON
   * @returns {Object} Serialized state
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      currentState: this.currentState,
      stateHistory: this.stateHistory,
      metadata: this.metadata
    };
  }

  /**
   * Deserialize from JSON
   * @param {Object} data - Serialized data
   * @returns {SessionStateMachine} Restored state machine
   */
  static fromJSON(data) {
    const sm = new SessionStateMachine(data.sessionId);
    sm.currentState = data.currentState;
    sm.stateHistory = data.stateHistory;
    sm.metadata = data.metadata;
    return sm;
  }
}

// Export to window
if (typeof window !== 'undefined') {
  window.SessionStateMachine = SessionStateMachine;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionStateMachine;
}
