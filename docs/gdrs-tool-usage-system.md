# GDRS Tool Usage System - Technical Documentation

## Overview

The GDRS (Gemini Deep Computation & Research System) implements a sophisticated tool invocation system that allows the Gemini AI model to execute JavaScript code, manage data storage, and control application state through custom XML-like tags embedded in its responses.

## Tool Invocation Architecture

### 1. Response Parsing Pipeline

The system follows a multi-stage parsing pipeline:

```
LLM Response → Block Extraction → Operation Parsing → Validation → Execution
```

**Core Components:**
- **Parser Core** (`parser-core.js`): Main parsing orchestrator
- **Extractors** (`parser-extractors.js`): Extract different types of tool blocks
- **Validators** (`parser-validators.js`): Validate tool operations before execution
- **Appliers** (`parser-appliers.js`): Execute validated operations

### 2. Tool Tag System

The system uses custom XML-like tags that Gemini can include in its responses:

#### JavaScript Execution
```xml
{{<js_execute>}}
console.log('Hello World');
return { status: 'success', data: [1, 2, 3] };
{{</js_execute>}}
```

#### Data Vault Operations
```xml
<!-- Create/Update vault entry -->
{{<datavault id="analysis_results" type="data" description="Analysis output">}}
{
  "results": [1, 2, 3],
  "timestamp": "2025-10-31"
}
{{</datavault>}}

<!-- Read vault entry -->
{{<datavault action="request_read" id="analysis_results" limit="100" />}}

<!-- Delete vault entry -->
{{<datavault action="delete" id="analysis_results" />}}
```

#### Memory Management
```xml
{{<memory identifier="key_insight" heading="Important Finding" content="Description here" notes="Additional context" />}}
```

#### Task Management
```xml
{{<task identifier="analyze_data" heading="Data Analysis" content="Analyze the dataset" status="ongoing" notes="In progress" />}}
```

#### Goal Management
```xml
{{<goal identifier="research_complete" heading="Complete Research" content="Finish comprehensive analysis" notes="Final step" />}}
```

#### Final Output
```xml
{{<final_output>}}
<h1>Research Results</h1>
<p>Analysis complete with findings...</p>
{{</final_output>}}
```

### 3. Execution Engine

#### JavaScript Executor (`js-executor.js`)

The JavaScript executor provides secure, isolated code execution with these capabilities:

**Features:**
- **Async/Await Support**: Automatically detects and handles async code
- **Console Capture**: Captures all console output (log, error, warn)
- **Vault Integration**: Supports `{{<vaultref id="vault_id" />}}` to inline vault content
- **Error Handling**: Comprehensive error catching and reporting
- **Execution Isolation**: Each execution runs in isolated context

**Code Execution Process:**
1. **Pre-processing**: Resolve vault references in code
2. **Async Detection**: Check if code contains `await` keywords
3. **Function Wrapping**: Wrap code in appropriate async/sync function
4. **Console Capture**: Start capturing console output
5. **Execution**: Run the code with timeout protection
6. **Result Processing**: Capture return values and console logs
7. **Storage**: Persist execution results and update UI

**Security Model:**
- Stateless execution (no persistent variables between runs)
- Isolated console capture with automatic cleanup
- Error boundary protection
- No access to DOM manipulation beyond designated areas

#### Vault Reference Resolution

The system supports dynamic content injection:

```javascript
// In JavaScript code:
const data = {{<vaultref id="my_data" />}};
console.log(data);
```

This gets resolved to:
```javascript
const data = {"key": "value", "items": [1,2,3]};
console.log(data);
```

### 4. Storage System Integration

#### Data Vault (`vault-manager.js`)

The vault system provides persistent data storage:

**Supported Operations:**
- **Create**: Store new data with ID, type, description
- **Read**: Retrieve data by ID with optional length limits
- **Update**: Modify existing entries
- **Delete**: Remove entries by ID

**Data Types:**
- `text`: Plain text content
- `code`: Source code and scripts
- `data`: JSON data structures

**Vault Entry Structure:**
```javascript
{
  identifier: "unique_id",
  type: "data",
  description: "Brief description",
  content: "Actual content (any type)",
  createdAt: "2025-10-31T19:30:00.000Z",
  updatedAt: "2025-10-31T19:30:00.000Z"
}
```

#### Memory, Tasks, and Goals

Each storage type follows similar patterns:

**Memory Entries:**
```javascript
{
  identifier: "key_insight",
  heading: "Important Finding",
  content: "Detailed description",
  notes: "Additional context",
  createdAt: "timestamp"
}
```

**Task Entries:**
```javascript
{
  identifier: "analyze_data",
  heading: "Data Analysis Task",
  content: "Task description",
  status: "pending|ongoing|finished|paused",
  notes: "Progress notes",
  createdAt: "timestamp"
}
```

**Goal Entries:**
```javascript
{
  identifier: "research_goal",
  heading: "Research Objective",
  content: "Goal description", 
  notes: "Achievement notes",
  createdAt: "timestamp"
}
```

### 5. Reasoning Engine Integration

#### Context Building (`reasoning-engine.js`)

The reasoning engine constructs prompts for Gemini that include:

1. **Current Query**: User's research question
2. **Iteration Context**: Current iteration number and history
3. **Storage State**: Current vault, memory, tasks, and goals
4. **Execution History**: Previous JavaScript executions and results
5. **Tool Capabilities**: Available tool operations and syntax

#### Response Processing

The system processes Gemini's responses through:

1. **Block Extraction**: Identify all tool blocks in response
2. **Sequential Processing**: Process reasoning blocks in order
3. **Operation Parsing**: Convert XML tags to operation objects
4. **Validation**: Ensure operations meet requirements
5. **Execution**: Apply operations to storage and execute code
6. **State Update**: Update UI and persist changes

### 6. UI Integration and Feedback

#### Real-time Updates

The system provides real-time feedback through:

- **Execution Status**: Shows current operation status
- **Console Output**: Displays JavaScript execution results
- **Storage Viewers**: Shows vault, memory, tasks, and goals
- **Reasoning Log**: Displays iteration-by-iteration reasoning
- **Error Reporting**: Shows validation and execution errors

#### Event System

Uses an event bus for loose coupling between components:

```javascript
// Event emission
eventBus.emit(Events.EXECUTION_COMPLETE, { id, result });

// Event listening  
eventBus.on(Events.EXECUTION_COMPLETE, (data) => {
  updateUI(data);
});
```

### 7. Session Management

#### Loop Controller (`loop-controller.js`)

Controls the iterative reasoning process:

**Session Flow:**
1. **Initialization**: Clean storage state, validate inputs
2. **Iteration Loop**: Generate prompts, get responses, apply operations
3. **Completion Detection**: Check for final output or goal completion
4. **Error Handling**: Retry logic for transient failures
5. **Session Termination**: Clean shutdown with status reporting

**Limits and Controls:**
- Maximum iterations: Prevents infinite loops
- Consecutive error limit: Stops on repeated failures  
- Final output requirement: LLM must provide final output
- Timeout handling: Manages request timeouts

### 8. Tool Operation Rules and Constraints

#### Validation Rules

**Vault Operations:**
- ID required for all operations
- Content type validation (text, code, data)
- Description length limits
- Delete operations require existing entry

**Memory/Task/Goal Operations:**
- Unique identifier required
- Heading and content required for creation
- Status validation for tasks (pending|ongoing|finished|paused)
- Update operations require existing entry

**JavaScript Execution:**
- No DOM manipulation outside designated areas
- No persistent state between executions
- Console output captured and displayed
- Error boundary protection
- Execution timeout limits

#### Security Constraints

**Sandboxing:**
- JavaScript runs in isolated context
- No access to localStorage/sessionStorage directly
- No access to external network requests
- Limited to computational operations
- Vault reference resolution only

**Storage Isolation:**
- Each session starts with clean storage
- No cross-session data persistence
- LocalStorage only for current application state
- No file system access

### 9. Extension Points

#### Custom Providers

The system supports custom implementations through extension points:

**Storage Providers:**
```javascript
Registry.register(ExtensionPoints.STORAGE_PROVIDERS, 'custom', CustomStorageProvider);
```

**API Providers:**  
```javascript
Registry.register(ExtensionPoints.API_PROVIDERS, 'custom', CustomAPIProvider);
```

**Validators:**
```javascript
Registry.register(ExtensionPoints.VALIDATORS, 'custom', CustomValidator);
```

#### Example Custom Validator

```javascript
const CustomValidator = {
  validateVaultOperation(op) {
    if (op.type === 'sensitive' && !op.encrypted) {
      return { valid: false, error: 'Sensitive data must be encrypted' };
    }
    return { valid: true };
  }
};
```

### 10. Tool Usage Examples

#### Data Analysis Workflow

```xml
{{<js_execute>}}
// Generate sample data
const data = Array.from({length: 100}, () => Math.random() * 100);
const mean = data.reduce((a, b) => a + b) / data.length;
const variance = data.reduce((a, b) => a + (b - mean) ** 2) / data.length;

const results = {
  count: data.length,
  mean: mean.toFixed(2),
  variance: variance.toFixed(2),
  std: Math.sqrt(variance).toFixed(2)
};

console.log('Statistical Analysis:', results);
return results;
{{</js_execute>}}

{{<datavault id="stats_results" type="data" description="Statistical analysis results">}}
{
  "analysis_type": "descriptive_statistics",
  "results": {{<vaultref id="last_execution_result" />}}
}
{{</datavault>}}

{{<memory identifier="analysis_complete" heading="Statistical Analysis" content="Completed descriptive statistics on 100 data points" notes="Results stored in vault" />}}
```

#### Iterative Data Processing

```xml
{{<datavault action="request_read" id="previous_results" limit="full-length" />}}

{{<js_execute>}}
// Access previous results
const previousData = {{<vaultref id="previous_results" />}};
const newData = previousData.map(x => x * 1.1); // Apply 10% increase

console.log('Processing', newData.length, 'items');
return { 
  processed: newData.length,
  sample: newData.slice(0, 5)
};
{{</js_execute>}}

{{<datavault id="processed_results" type="data" description="Processed data with 10% increase">}}
Updated data processing complete
{{</datavault>}}
```

### 11. Error Handling and Recovery

#### Error Types

**Validation Errors:**
- Invalid tool syntax
- Missing required parameters
- Type mismatches
- Constraint violations

**Execution Errors:**
- JavaScript runtime errors
- Timeout errors
- Memory errors
- Storage errors

**Recovery Mechanisms:**
- Automatic retry for transient failures
- Error logging and reporting
- Session continuation on recoverable errors
- Graceful degradation

#### Error Reporting

```javascript
Storage.appendToolActivity({
  type: 'vault',
  action: 'create',
  id: 'test_entry',
  status: 'error',
  error: 'Validation failed: Invalid type',
  operationIndex: 0
});
```

## Implementation Best Practices

### 1. Tool Design Principles

- **Idempotent Operations**: Same operation produces same result
- **Atomic Transactions**: Operations complete fully or not at all
- **Clear Error Messages**: Specific, actionable error reporting
- **Consistent Interfaces**: Uniform parameter naming and structure

### 2. Performance Considerations

- **Lazy Loading**: Load modules only when needed
- **Batch Operations**: Group related operations together
- **Efficient Storage**: Minimize localStorage usage
- **UI Optimization**: Debounced updates and virtual scrolling

### 3. Debugging and Development

**Debug Mode:**
```javascript
window.GDRS_DEBUG.enableEventDebug(); // Enable event logging
window.GDRS_DEBUG.listEvents(); // Show registered events
```

**Tool Activity Monitoring:**
```javascript
const activities = Storage.loadToolActivityLog();
console.table(activities); // View tool execution history
```

This tool system enables Gemini to perform complex computational tasks, manage persistent data, and provide interactive research capabilities through a clean, extensible architecture.