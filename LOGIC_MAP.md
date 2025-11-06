# GDRS Modular System - Logic Map

## Component Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│                                                                      │
│  ┌────────────────────┐           ┌──────────────────────┐         │
│  │ loop-controller.js │◄──────────┤  js-executor.js      │         │
│  └────────────────────┘           └──────────────────────┘         │
└────────────┬────────────────────────────────┬──────────────────────┘
             │                                 │
             │ Uses                            │ Uses
             │                                 │
┌────────────▼────────────────────────────────▼──────────────────────┐
│                      SESSION MANAGEMENT LAYER                       │
│                                                                     │
│  ┌───────────────────────────┐    ┌──────────────────────────┐   │
│  │ ReasoningSessionManager   │    │ ExecutionPolicyManager   │   │
│  └──────────┬────────────────┘    └──────────────────────────┘   │
│             │                                                      │
│             │ Uses                                                 │
│             │                                                      │
│  ┌──────────▼──────────┐   ┌────────────────────┐               │
│  │SessionStateMachine  │   │IterationStateManager│              │
│  └─────────────────────┘   └────────────────────┘               │
└──────────────────────────────────────────────────────────────────┘
             │
             │ Uses
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                      MIDDLEWARE LAYER                              │
│                                                                    │
│  ┌──────────────────────────────┐    ┌───────────────────────┐  │
│  │ ReasoningChainMiddleware     │    │  ContextCompactor     │  │
│  └──────────────────────────────┘    └───────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
             │
             │ Uses
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                    EXECUTION STRATEGY LAYER                        │
│                                                                    │
│  ┌──────────────────────────────┐                                 │
│  │  ExecutionStrategyBase       │                                 │
│  └────┬────────────┬────────────┴──────┐                         │
│       │            │                    │                         │
│  ┌────▼─────┐ ┌───▼──────────┐  ┌─────▼──────────────┐         │
│  │Standard  │ │  Retry       │  │  SafeMode          │         │
│  │Strategy  │ │  Strategy    │  │  Strategy          │         │
│  └──────────┘ └──────────────┘  └────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
             │
             │ Uses
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                    EXECUTION CORE LAYER                            │
│                                                                    │
│  ┌────────────────────┐    ┌──────────────────────────────┐     │
│  │ ExecutionManager   │◄───┤  ExecutionStateMachine       │     │
│  └────────┬───────────┘    └──────────────────────────────┘     │
│           │                                                       │
│           │ Uses                                                  │
│           │                                                       │
│  ┌────────▼───────────┐    ┌──────────────────────────────┐    │
│  │ ExecutionRunner    │◄───┤  ExecutionContextManager     │    │
│  └────────────────────┘    └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Reports to
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                    ERROR PROCESSING LAYER                          │
│                                                                    │
│  ┌───────────────────────┐      ┌─────────────────────────┐     │
│  │ ExecutionErrorHandler │◄─────┤  ErrorClassifier         │     │
│  └───────────┬───────────┘      └─────────────────────────┘     │
│              │                                                     │
│              │ Uses                                                │
│              │                                                     │
│  ┌───────────▼──────────────┐  ┌──────────────────────────┐    │
│  │ ErrorContextCleaner      │  │  RetryStrategyManager    │    │
│  └──────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Uses
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                    POLICY LAYER                                    │
│                                                                    │
│  ┌──────────────────────────┐    ┌────────────────────────────┐ │
│  │ ExecutionPolicyManager   │    │  RetryPolicyManager        │ │
│  └──────────────────────────┘    └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Reports to
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                    OBSERVABILITY LAYER                             │
│                                                                    │
│  ┌────────────────────────────┐  ┌────────────────────────────┐ │
│  │ ExecutionMetricsCollector  │  │  ChainHealthMonitor        │ │
│  └────────────────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Uses
             │
┌────────────▼──────────────────────────────────────────────────────┐
│                    DATA/STORAGE LAYER                              │
│                                                                    │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────────┐     │
│  │ Storage.js   │  │ EventBus   │  │ ApiAccessTracker     │     │
│  └──────────────┘  └────────────┘  └──────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Code Execution

```
1. User/Reasoning submits code
         │
         ▼
2. JSExecutor.executeCode()
         │
         ▼
3. ExecutionPolicyManager.getCurrentPolicy()
         │
         ▼
4. Get ExecutionStrategy (Standard/Retry/SafeMode)
         │
         ▼
5. Strategy.execute(request, runner)
         │
         ├─► BeforeExecution hooks
         │
         ├─► ExecutionContextManager.createContext()
         │   └─► Create snapshot for potential rollback
         │
         ├─► ExecutionStateMachine.transition('PREPARING')
         │
         ├─► ExecutionRunner.run(request)
         │   ├─► Expand vault references
         │   ├─► Setup console capture
         │   ├─► Build context with APIs
         │   ├─► Execute code
         │   └─► Return result
         │
         ├─► ExecutionStateMachine.transition('COMPLETED' or 'FAILED')
         │
         ├─► If FAILED:
         │   ├─► ErrorClassifier.classify(error)
         │   ├─► ErrorContextCleaner.clean(classification, context)
         │   ├─► If retryable:
         │   │   ├─► RestoreSnapshot()
         │   │   ├─► Wait for retry delay
         │   │   └─► Retry execution
         │   └─► Else:
         │       └─► ExecutionErrorHandler.handle(error)
         │
         ├─► AfterExecution hooks
         │
         ├─► ExecutionResultHandler.process(result)
         │   ├─► Classify result
         │   ├─► Aggregate metrics
         │   └─► Determine logging
         │
         ├─► ExecutionMetricsCollector.recordExecution(result)
         │
         ├─► If shouldLog:
         │   └─► Storage.saveExecutionLog()
         │
         └─► Return final result
```

---

## Data Flow: Reasoning Iteration

```
1. LoopController.startSession(query)
         │
         ▼
2. ReasoningSessionManager.createSession()
         │
         ├─► Create SessionStateMachine
         ├─► Create IterationStateManager
         ├─► Create ReasoningChainMiddleware
         └─► SessionStateMachine.transition('ACTIVE')
         │
         ▼
3. LoopController.runIteration()
         │
         ├─► Check SessionManager.shouldContinue()
         │
         ├─► IterationStateManager.startIteration(n)
         │
         ├─► Middleware.runPreIteration(context)
         │   └─► ContextCompactor.compact() [if needed]
         │
         ├─► ReasoningEngine.buildContextPrompt()
         │   └─► ReasoningContextBuilder.buildPrompt()
         │
         ├─► GeminiAPI.generateContent()
         │
         ├─► ReasoningParser.parseOperations()
         │
         ├─► ReasoningParser.applyOperations()
         │   └─► ToolOperationPipeline.run()
         │       ├─► Process vault operations
         │       ├─► Process memory operations
         │       ├─► Process tasks operations
         │       ├─► Process goals operations
         │       ├─► Process JS executions
         │       │   └─► Calls JSExecutor (see execution flow above)
         │       └─► Process final output
         │
         ├─► Middleware.runPostIteration(context, result)
         │
         ├─► If errors occurred:
         │   └─► Middleware.runOnError(context, error)
         │
         ├─► IterationStateManager.completeIteration(result)
         │
         ├─► SessionManager.recordIteration(sessionId, iterationData)
         │
         ├─► ChainHealthMonitor.recordIteration(iterationData)
         │   ├─► Analyze health
         │   ├─► Check error patterns
         │   └─► Update status
         │
         ├─► Check goal completion
         │
         ├─► If should continue:
         │   └─► Schedule next iteration
         └─► Else:
             ├─► SessionStateMachine.transition('COMPLETED')
             └─► SessionManager.stopSession()
```

---

## State Transitions

### Execution State Machine

```
[PENDING] ──────► [PREPARING] ──────► [EXECUTING]
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     │                     │                     │
                     ▼                     ▼                     ▼
                [COMPLETED]            [FAILED]              [TIMEOUT]
                                           │                     │
                                           └──────┬──────────────┘
                                                  │
                                                  ▼
                                             [RETRYING]
                                                  │
                                                  └──────► [PREPARING]

Any state ──────► [CANCELLED]
```

### Session State Machine

```
[CREATED] ──────► [ACTIVE]
                     │
      ┌──────────────┼──────────────┬──────────────┐
      │              │               │              │
      ▼              ▼               ▼              ▼
  [PAUSED]     [COMPLETED]      [FAILED]      [STOPPED]
      │
      └─────► [ACTIVE] or [STOPPED]
```

---

## Error Classification Logic

```
Error received
      │
      ▼
┌─────────────────┐
│ ErrorClassifier │
└────────┬────────┘
         │
         ├─► Is SyntaxError?
         │   └─► Classification: SYNTAX_ERROR
         │       • Category: compile_time
         │       • Retryable: false
         │       • RequiresReasoning: true
         │       • CleanContext: false
         │
         ├─► Is ReferenceError + "is not defined"?
         │   └─► Classification: UNDEFINED_REFERENCE
         │       • Category: runtime
         │       • Retryable: true
         │       • RequiresReasoning: true
         │       • CleanContext: true
         │
         ├─► Is ReferenceError + "not found"?
         │   └─► Classification: ENTITY_NOT_FOUND
         │       • Category: runtime
         │       • Retryable: true
         │       • RequiresReasoning: true
         │       • CleanContext: true
         │       • ProvideValidEntities: true
         │
         ├─► Is TypeError?
         │   └─► Classification: TYPE_ERROR
         │       • Category: runtime
         │       • Retryable: false
         │       • RequiresReasoning: true
         │       • CleanContext: false
         │
         ├─► Contains "timeout"?
         │   └─► Classification: TIMEOUT
         │       • Category: execution
         │       • Retryable: true
         │       • RequiresReasoning: false
         │       • CleanContext: true
         │       • OptimizationHint: true
         │
         └─► Unknown
             └─► Classification: UNKNOWN_ERROR
                 • Category: runtime
                 • Retryable: false
                 • RequiresReasoning: true
                 • CleanContext: false
```

---

## Context Cleaning Logic

```
Error Classification received
      │
      ▼
┌──────────────────────┐
│ ErrorContextCleaner  │
└──────────┬───────────┘
           │
           ├─► UNDEFINED_REFERENCE
           │   ├─► Clear ApiAccessTracker failed accesses
           │   ├─► Remove failed execution from execution log
           │   └─► Return cleaned context
           │
           ├─► ENTITY_NOT_FOUND
           │   ├─► Clear ApiAccessTracker failed accesses
           │   ├─► Remove failed execution from execution log
           │   ├─► Collect valid entity IDs (vault, memory, tasks, goals)
           │   └─► Return cleaned context + valid entities list
           │
           ├─► TIMEOUT
           │   ├─► Remove last execution from log
           │   ├─► Add suggestion for timeout increase
           │   └─► Return cleaned context
           │
           └─► DEFAULT
               └─► Return context with cleaned flag
```

---

## Retry Logic Flow

```
Execution Failed
      │
      ▼
Error Classification
      │
      ├─► Is Retryable?
      │   │
      │   ├─► YES
      │   │   ├─► Attempt count < max attempts?
      │   │   │   │
      │   │   │   ├─► YES
      │   │   │   │   ├─► Should clean context?
      │   │   │   │   │   │
      │   │   │   │   │   ├─► YES
      │   │   │   │   │   │   └─► ErrorContextCleaner.clean()
      │   │   │   │   │   │       └─► ExecutionContextManager.restoreSnapshot()
      │   │   │   │   │   │
      │   │   │   │   │   └─► NO
      │   │   │   │   │       └─► Continue
      │   │   │   │   │
      │   │   │   │   ├─► Calculate retry delay
      │   │   │   │   │   └─► baseDelay * (backoff ^ (attempt - 1)) + jitter
      │   │   │   │   │
      │   │   │   │   ├─► Wait for delay
      │   │   │   │   │
      │   │   │   │   ├─► ExecutionStateMachine.transition('RETRYING')
      │   │   │   │   │
      │   │   │   │   └─► Retry execution
      │   │   │   │
      │   │   │   └─► NO (max attempts reached)
      │   │   │       └─► Return final failed result
      │   │   │
      │   │   └─► Requires reasoning fix?
      │   │       └─► Notify reasoning chain
      │   │
      │   └─► NO
      │       └─► Return failed result
      │
      └─► Record metrics and log
```

---

## Middleware Execution Order

```
Iteration Start
      │
      ▼
1. runPreIteration()
      │
      ├─► Middleware 1: preIteration(context)
      ├─► Middleware 2: preIteration(context)
      └─► Middleware N: preIteration(context)
      │
      ▼
2. Execute Iteration
      │
      ├─► Build context prompt
      ├─► Call API
      ├─► Parse operations
      │
      ├─► For each JS execution:
      │   ├─► runPreExecution(context, code)
      │   │   ├─► Middleware 1: preExecution(context, code)
      │   │   ├─► Middleware 2: preExecution(context, code)
      │   │   └─► Middleware N: preExecution(context, code)
      │   │
      │   ├─► Execute code
      │   │
      │   └─► runPostExecution(context, result)
      │       ├─► Middleware 1: postExecution(context, result)
      │       ├─► Middleware 2: postExecution(context, result)
      │       └─► Middleware N: postExecution(context, result)
      │
      └─► Apply operations
      │
      ▼
3. runPostIteration()
      │
      ├─► Middleware 1: postIteration(context, result)
      ├─► Middleware 2: postIteration(context, result)
      └─► Middleware N: postIteration(context, result)
      │
      ▼
If errors:
      │
      ▼
4. runOnError()
      │
      ├─► Middleware 1: onError(context, error)
      ├─► Middleware 2: onError(context, error)
      └─► Middleware N: onError(context, error)
```

---

## Policy Selection Logic

```
Execution Request
      │
      ▼
ExecutionPolicyManager.getCurrentPolicy()
      │
      ├─► Check Storage.getConfig('executionPolicy')
      │   │
      │   ├─► Found 'safe' → Return SafeModePolicy
      │   │   • Strategy: SafeModeExecutionStrategy
      │   │   • Timeout: 10000ms
      │   │   • EnableRetry: false
      │   │   • ValidateCodeSafety: true
      │   │
      │   ├─► Found 'aggressive' → Return AggressivePolicy
      │   │   • Strategy: RetryExecutionStrategy
      │   │   • Timeout: 30000ms
      │   │   • EnableRetry: true
      │   │   • MaxRetries: 5
      │   │
      │   ├─► Found 'debug' → Return DebugPolicy
      │   │   • Strategy: StandardExecutionStrategy
      │   │   • Timeout: 60000ms
      │   │   • EnableRetry: false
      │   │   • LogAllAttempts: true
      │   │   • VerboseErrors: true
      │   │
      │   └─► Not found or 'default' → Return DefaultPolicy
      │       • Strategy: RetryExecutionStrategy
      │       • Timeout: 15000ms
      │       • EnableRetry: true
      │       • MaxRetries: 3
      │
      ▼
Load Strategy Class
      │
      └─► window[policyStrategyName]
          │
          ├─► RetryExecutionStrategy
          ├─► StandardExecutionStrategy
          └─► SafeModeExecutionStrategy
```

---

## Metrics Collection Flow

```
Execution Complete
      │
      ▼
ExecutionMetricsCollector.recordExecution(result)
      │
      ├─► Record execution entry
      │   └─► { id, success, duration, error, timestamp }
      │
      ├─► Update aggregates
      │   ├─► Increment total
      │   ├─► If success: increment successful
      │   ├─► If failed:
      │   │   ├─► Increment failed
      │   │   ├─► Increment error count for error type
      │   │   └─► If timeout: increment timeouts
      │   └─► If retry: add to retry count
      │
      ├─► Record performance metrics
      │   └─► { duration, codeSize, timestamp }
      │
      └─► Keep only last 100 metrics


Iteration Complete
      │
      ▼
ChainHealthMonitor.recordIteration(data)
      │
      ├─► Record iteration entry
      │   └─► { number, hasErrors, errorCount, progress, timestamp }
      │
      ├─► Analyze health
      │   ├─► Count consecutive errors
      │   ├─► Calculate error rate
      │   ├─► Calculate progress rate
      │   └─► Report issues if thresholds exceeded
      │
      └─► Update health status
          ├─► High severity issues → 'critical'
          ├─► Multiple issues → 'degraded'
          └─► Normal → 'healthy'
```

---

## Critical Integration Points

### 1. ExecutionManager Integration
```javascript
// In execution-manager.js

// Initialize on load
const policyManager = new ExecutionPolicyManager();
const resultHandler = new ExecutionResultHandler();
const metricsCollector = new ExecutionMetricsCollector();

// In enqueue method
const policy = policyManager.getCurrentPolicy();
const StrategyClass = window[policy.strategy + 'ExecutionStrategy'];
const strategy = new StrategyClass(policy);

const result = await strategy.execute(request, executionRunner);
const processedResult = await resultHandler.process(result);

if (processedResult.shouldLog) {
  // Add to execution log
}

metricsCollector.recordExecution(processedResult);
```

### 2. LoopController Integration
```javascript
// In loop-controller.js

// Initialize on startSession
const sessionManager = new ReasoningSessionManager();
const session = sessionManager.createSession(query, options);
const healthMonitor = new ChainHealthMonitor();

// In runIteration
const iteration = session.iterationManager.startIteration(currentIteration);

const context = await session.middleware.runPreIteration(contextData);

// ... do reasoning work ...

const result = await session.middleware.runPostIteration(context, iterationResult);

iteration.completeIteration(result);
session.recordIteration(session.id, iterationData);
healthMonitor.recordIteration(iterationData);

if (!sessionManager.shouldContinue(session.id)) {
  sessionManager.stopSession(session.id);
}
```

### 3. JSExecutor Integration
```javascript
// In js-executor.js

const errorHandler = new ExecutionErrorHandler();

try {
  const result = await executionManager.enqueue(options);

  if (!result.success) {
    const handlerResult = await errorHandler.handle(result.error, result.context);

    if (handlerResult.requiresReasoningFix) {
      // Notify reasoning chain about the error
      EventBus.emit('EXECUTION_ERROR_NEEDS_REASONING', {
        error: result.error,
        classification: handlerResult.classification,
        validEntities: handlerResult.handlerResult.details?.validEntities
      });
    }
  }
} catch (error) {
  await errorHandler.handle(error, {});
}
```

---

## Global Window Exports

All classes must be exported to window for cross-file access:

```javascript
// At end of each module file:

window.ExecutionStateMachine = ExecutionStateMachine;
window.ExecutionStrategyBase = ExecutionStrategyBase;
window.StandardExecutionStrategy = StandardExecutionStrategy;
window.RetryExecutionStrategy = RetryExecutionStrategy;
window.SafeModeExecutionStrategy = SafeModeExecutionStrategy;
window.ExecutionContextManager = ExecutionContextManager;
window.ExecutionResultHandler = ExecutionResultHandler;
window.ResultAggregator = ResultAggregator;
window.ErrorClassifier = ErrorClassifier;
window.ErrorContextCleaner = ErrorContextCleaner;
window.RetryStrategyManager = RetryStrategyManager;
window.ExecutionErrorHandler = ExecutionErrorHandler;
window.SessionStateMachine = SessionStateMachine;
window.IterationStateManager = IterationStateManager;
window.ReasoningSessionManager = ReasoningSessionManager;
window.ReasoningChainMiddleware = ReasoningChainMiddleware;
window.ContextCompactor = ContextCompactor;
window.ExecutionPolicyManager = ExecutionPolicyManager;
window.RetryPolicyManager = RetryPolicyManager;
window.ExecutionMetricsCollector = ExecutionMetricsCollector;
window.ChainHealthMonitor = ChainHealthMonitor;
```

---

## Event Bus Events (New)

```javascript
// Execution events
'EXECUTION_STATE_CHANGED' - { executionId, fromState, toState, metadata }
'EXECUTION_RETRY_ATTEMPT' - { executionId, attempt, maxAttempts, error }
'EXECUTION_CONTEXT_CLEANED' - { executionId, errorType, cleaningType }
'EXECUTION_ERROR_NEEDS_REASONING' - { error, classification, validEntities }

// Session events
'SESSION_STATE_CHANGED' - { sessionId, fromState, toState, metadata }
'SESSION_ITERATION_START' - { sessionId, iterationNumber }
'SESSION_ITERATION_COMPLETE' - { sessionId, iterationNumber, result }
'SESSION_HEALTH_DEGRADED' - { sessionId, status, issues }

// Middleware events
'MIDDLEWARE_PRE_ITERATION' - { sessionId, context }
'MIDDLEWARE_POST_ITERATION' - { sessionId, context, result }
'MIDDLEWARE_ERROR' - { sessionId, error, middleware }

// Policy events
'POLICY_CHANGED' - { type, oldPolicy, newPolicy }

// Metrics events
'METRICS_THRESHOLD_EXCEEDED' - { metric, threshold, value }
```

---

## Configuration Loading Order

```
1. Load base configs (no dependencies)
   ├─► execution-strategies-config.js
   ├─► retry-policies-config.js
   ├─► error-recovery-config.js
   └─► monitoring-config.js

2. Initialize policy managers (depend on configs)
   ├─► ExecutionPolicyManager (uses execution-strategies-config)
   └─► RetryPolicyManager (uses retry-policies-config)

3. Initialize core systems (depend on policies)
   ├─► ErrorClassifier
   ├─► ErrorContextCleaner
   ├─► RetryStrategyManager
   └─► ExecutionErrorHandler

4. Initialize managers (depend on core systems)
   ├─► ExecutionContextManager
   ├─► ExecutionResultHandler
   └─► ReasoningSessionManager

5. Initialize monitoring (depend on configs)
   ├─► ExecutionMetricsCollector
   └─► ChainHealthMonitor

6. Wire up event listeners
   └─► Connect all components via EventBus
```

---

## Testing Strategy per Component

Each component requires:

1. **Unit Tests** - Test in isolation
2. **Integration Tests** - Test with dependencies
3. **Edge Cases** - Test error conditions
4. **Performance Tests** - Ensure no performance regression

Example test checklist for ExecutionStateMachine:
- ✓ Can transition from PENDING to PREPARING
- ✓ Can transition from PREPARING to EXECUTING
- ✓ Can transition from EXECUTING to COMPLETED
- ✓ Can transition from EXECUTING to FAILED
- ✓ Can transition from FAILED to RETRYING
- ✓ Cannot transition from COMPLETED to EXECUTING (invalid)
- ✓ Can transition from any state to CANCELLED
- ✓ State history records all transitions
- ✓ Event listeners fire on transitions
- ✓ Metadata is preserved in transitions

---

## End of Logic Map

This logic map provides visual and logical flow documentation to ensure correct implementation and prevent integration errors.
