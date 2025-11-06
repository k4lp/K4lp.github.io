/**
 * ExecutionStateMachine
 *
 * Manages the state lifecycle of code execution with formal state transitions.
 * Provides state validation, history tracking, and event hooks.
 *
 * States:
 * - PENDING: Queued, not started
 * - PREPARING: Analyzing code, expanding references
 * - EXECUTING: Running code
 * - COMPLETED: Success
 * - FAILED: Error occurred
 * - TIMEOUT: Execution timed out
 * - RETRYING: Attempting retry
 * - CANCELLED: Manually cancelled
 *
 * Valid Transitions:
 * PENDING -> PREPARING -> EXECUTING -> COMPLETED
 *                                   -> FAILED -> RETRYING -> PREPARING
 *                                   -> TIMEOUT -> RETRYING -> PREPARING
 *                                   -> CANCELLED
 * Any state -> CANCELLED
 */

class ExecutionStateMachine {
  /**
   * Execution states enum
   */
  static STATES = {
    PENDING: 'pending',
    PREPARING: 'preparing',
    EXECUTING: 'executing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
    RETRYING: 'retrying',
    CANCELLED: 'cancelled'
  };

  /**
   * Valid state transitions
   */
  static TRANSITIONS = {
    [ExecutionStateMachine.STATES.PENDING]: [
      ExecutionStateMachine.STATES.PREPARING,
      ExecutionStateMachine.STATES.CANCELLED
    ],
    [ExecutionStateMachine.STATES.PREPARING]: [
      ExecutionStateMachine.STATES.EXECUTING,
      ExecutionStateMachine.STATES.FAILED,
      ExecutionStateMachine.STATES.CANCELLED
    ],
    [ExecutionStateMachine.STATES.EXECUTING]: [
      ExecutionStateMachine.STATES.COMPLETED,
      ExecutionStateMachine.STATES.FAILED,
      ExecutionStateMachine.STATES.TIMEOUT,
      ExecutionStateMachine.STATES.CANCELLED
    ],
    [ExecutionStateMachine.STATES.FAILED]: [
      ExecutionStateMachine.STATES.RETRYING,
      ExecutionStateMachine.STATES.CANCELLED
    ],
    [ExecutionStateMachine.STATES.TIMEOUT]: [
      ExecutionStateMachine.STATES.RETRYING,
      ExecutionStateMachine.STATES.CANCELLED
    ],
    [ExecutionStateMachine.STATES.RETRYING]: [
      ExecutionStateMachine.STATES.PREPARING,
      ExecutionStateMachine.STATES.CANCELLED
    ],
    [ExecutionStateMachine.STATES.COMPLETED]: [],
    [ExecutionStateMachine.STATES.CANCELLED]: []
  };

  /**
   * Create new state machine for execution
   * @param {string} executionId - Unique execution identifier
   */
  constructor(executionId) {
    this.executionId = executionId;
    this.currentState = ExecutionStateMachine.STATES.PENDING;
    this.stateHistory = [];
    this.listeners = new Map();
    this.metadata = {};

    // Record initial state
    this._recordState(ExecutionStateMachine.STATES.PENDING, {
      message: 'Execution created'
    });
  }

  /**
   * Transition to new state with validation
   * @param {string} toState - Target state
   * @param {Object} metadata - Additional data about transition
   * @returns {boolean} - Success status
   * @throws {Error} If transition is invalid
   */
  transition(toState, metadata = {}) {
    // Validate state exists
    if (!Object.values(ExecutionStateMachine.STATES).includes(toState)) {
      throw new Error(`Invalid state: ${toState}`);
    }

    // Validate transition
    const validNextStates = ExecutionStateMachine.TRANSITIONS[this.currentState];

    if (!validNextStates || !validNextStates.includes(toState)) {
      throw new Error(
        `Invalid transition from ${this.currentState} to ${toState}. ` +
        `Valid transitions: ${validNextStates ? validNextStates.join(', ') : 'none'}`
      );
    }

    const fromState = this.currentState;
    this.currentState = toState;
    this.metadata = { ...this.metadata, ...metadata };

    // Record state change
    this._recordState(toState, metadata);

    // Emit transition event
    this._emitTransition(fromState, toState, metadata);

    // Emit state-specific event to EventBus if available
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('EXECUTION_STATE_CHANGED', {
        executionId: this.executionId,
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
   * Get complete state history
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
    const validNextStates = ExecutionStateMachine.TRANSITIONS[this.currentState];
    return validNextStates && validNextStates.includes(state);
  }

  /**
   * Check if execution is in terminal state
   * @returns {boolean} Whether state is terminal (no further transitions)
   */
  isTerminal() {
    const terminalStates = [
      ExecutionStateMachine.STATES.COMPLETED,
      ExecutionStateMachine.STATES.CANCELLED
    ];
    return terminalStates.includes(this.currentState);
  }

  /**
   * Check if execution is in error state
   * @returns {boolean} Whether state represents an error
   */
  isError() {
    const errorStates = [
      ExecutionStateMachine.STATES.FAILED,
      ExecutionStateMachine.STATES.TIMEOUT
    ];
    return errorStates.includes(this.currentState);
  }

  /**
   * Check if execution is active (not terminal)
   * @returns {boolean} Whether execution is still active
   */
  isActive() {
    return !this.isTerminal();
  }

  /**
   * Register listener for specific state transition
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
   * Register listener for any state transition
   * @param {Function} callback - Callback function
   */
  onAny(callback) {
    this.on('*', callback);
  }

  /**
   * Remove listener
   * @param {string} state - State or '*' for any
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
   * Get all metadata
   * @returns {Object} Accumulated metadata
   */
  getMetadata() {
    return { ...this.metadata };
  }

  /**
   * Get duration in each state (in milliseconds)
   * @returns {Object} State durations
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
   * Get total execution duration
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
   * Emit transition event to listeners
   * @private
   */
  _emitTransition(fromState, toState, metadata) {
    // Call specific state listeners
    const stateListeners = this.listeners.get(toState) || [];
    stateListeners.forEach(callback => {
      try {
        callback(fromState, toState, metadata, this.executionId);
      } catch (error) {
        console.error('Error in state machine listener:', error);
      }
    });

    // Call wildcard listeners
    const wildcardListeners = this.listeners.get('*') || [];
    wildcardListeners.forEach(callback => {
      try {
        callback(fromState, toState, metadata, this.executionId);
      } catch (error) {
        console.error('Error in state machine wildcard listener:', error);
      }
    });
  }

  /**
   * Get summary of execution state
   * @returns {Object} State summary
   */
  getSummary() {
    return {
      executionId: this.executionId,
      currentState: this.currentState,
      isTerminal: this.isTerminal(),
      isError: this.isError(),
      isActive: this.isActive(),
      totalDuration: this.getTotalDuration(),
      stateDurations: this.getStateDurations(),
      transitionCount: this.stateHistory.length - 1,
      metadata: this.getMetadata()
    };
  }

  /**
   * Reset state machine (for reuse)
   */
  reset() {
    this.currentState = ExecutionStateMachine.STATES.PENDING;
    this.stateHistory = [];
    this.metadata = {};
    this._recordState(ExecutionStateMachine.STATES.PENDING, {
      message: 'Execution reset'
    });
  }

  /**
   * Serialize state machine to JSON
   * @returns {Object} Serialized state
   */
  toJSON() {
    return {
      executionId: this.executionId,
      currentState: this.currentState,
      stateHistory: this.stateHistory,
      metadata: this.metadata
    };
  }

  /**
   * Deserialize state machine from JSON
   * @param {Object} data - Serialized data
   * @returns {ExecutionStateMachine} Restored state machine
   */
  static fromJSON(data) {
    const sm = new ExecutionStateMachine(data.executionId);
    sm.currentState = data.currentState;
    sm.stateHistory = data.stateHistory;
    sm.metadata = data.metadata;
    return sm;
  }
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.ExecutionStateMachine = ExecutionStateMachine;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExecutionStateMachine;
}
