# Execution Context API Documentation

**Version:** 1.0
**Last Updated:** 2025-11-01

---

## Overview

The Execution Context API provides clean, programmatic access to system storage (Vault, Memory, Tasks, Goals) from within executed JavaScript code. Instead of using vault references like `{{<vaultref id="data" />}}`, you can now use JavaScript APIs directly.

### Key Benefits

✅ **Clean API** - No need for text-based vault references
✅ **Type-safe** - Get proper data types (auto-parse JSON)
✅ **CRUD Operations** - Full create, read, update, delete support
✅ **Search & Filter** - Find data easily
✅ **Statistics** - Get insights about stored data

---

## Quick Start

When your code is executed, these APIs are automatically available:

```javascript
// Access vault data
const userData = vault.get('user_data');  // Auto-parses JSON

// Store new data
vault.set('results', { score: 95, grade: 'A' }, {
    type: 'data',
    description: 'Test results'
});

// Work with tasks
tasks.set('task_001', {
    heading: 'Complete analysis',
    status: 'ongoing'
});

// Update task status
tasks.setStatus('task_001', 'finished');

// Store in memory
memory.set('current_context', 'Processing batch 5', 'Context Info');

// Set goals
goals.set('goal_001', {
    heading: 'Achieve 100% accuracy',
    content: 'All tests must pass'
});
```

---

## Available APIs

### 1. Vault API (`vault`)

Access and manage DataVault entries.

#### Methods

##### `vault.get(id, options)`

Get vault entry content.

**Parameters:**
- `id` (string) - Vault entry identifier
- `options` (object, optional)
  - `parseJSON` (boolean) - Auto-parse JSON (default: `true`)

**Returns:** Entry content or `null` if not found

**Example:**
```javascript
// Auto-parses JSON data
const data = vault.get('analysis_results');
console.log(data.score);  // Direct access to parsed object

// Get raw text
const rawData = vault.get('analysis_results', { parseJSON: false });
```

##### `vault.getEntry(id)`

Get full vault entry with metadata.

**Returns:** Entry object with `{identifier, type, description, content, createdAt, updatedAt}` or `null`

**Example:**
```javascript
const entry = vault.getEntry('my_data');
console.log(`Type: ${entry.type}`);
console.log(`Created: ${entry.createdAt}`);
```

##### `vault.set(id, content, options)`

Create or update vault entry.

**Parameters:**
- `id` (string) - Vault entry identifier
- `content` (any) - Content to store
- `options` (object, optional)
  - `type` (string) - Entry type: `'text'`, `'code'`, or `'data'` (auto-detected if omitted)
  - `description` (string) - Entry description

**Returns:** Created/updated entry object

**Example:**
```javascript
// Store JSON data
vault.set('results', { score: 95 }, {
    type: 'data',
    description: 'Test results'
});

// Store code
vault.set('helper_function', 'function add(a, b) { return a + b; }', {
    type: 'code',
    description: 'Math helper'
});

// Store text
vault.set('notes', 'Remember to check edge cases', {
    type: 'text'
});
```

##### `vault.delete(id)`

Delete a vault entry.

**Returns:** `true` if deleted, `false` if not found

**Example:**
```javascript
if (vault.delete('old_data')) {
    console.log('Deleted successfully');
}
```

##### `vault.exists(id)`

Check if vault entry exists.

**Returns:** `boolean`

**Example:**
```javascript
if (vault.exists('user_data')) {
    const data = vault.get('user_data');
}
```

##### `vault.list(options)`

List all vault entries.

**Parameters:**
- `options` (object, optional)
  - `type` (string) - Filter by type: `'text'`, `'code'`, or `'data'`
  - `metadataOnly` (boolean) - Return only metadata without content

**Returns:** Array of vault entries

**Example:**
```javascript
// Get all entries
const all = vault.list();

// Get only data entries
const dataEntries = vault.list({ type: 'data' });

// Get metadata only (faster, no large content)
const metadata = vault.list({ metadataOnly: true });
```

##### `vault.search(query)`

Search vault entries by ID, description, or type.

**Parameters:**
- `query` (string|RegExp) - Search query

**Returns:** Array of matching entries

**Example:**
```javascript
// Text search
const results = vault.search('analysis');

// Regex search
const dataEntries = vault.search(/^data_/);
```

##### `vault.stats()`

Get vault statistics.

**Returns:** `{total, byType, ids}`

**Example:**
```javascript
const stats = vault.stats();
console.log(`Total entries: ${stats.total}`);
console.log(`Data entries: ${stats.byType.data}`);
console.log(`All IDs: ${stats.ids.join(', ')}`);
```

##### `vault.clear()`

Clear all vault entries (use with caution!).

**Returns:** Number of entries cleared

**Example:**
```javascript
const count = vault.clear();
console.log(`Cleared ${count} entries`);
```

---

### 2. Memory API (`memory`)

Access and manage Memory storage.

#### Methods

##### `memory.get(id)`

Get memory entry.

**Returns:** Memory object `{identifier, heading, content, notes, createdAt, updatedAt}` or `null`

**Example:**
```javascript
const context = memory.get('user_context');
console.log(context.content);
```

##### `memory.set(id, content, heading, notes)`

Create or update memory entry.

**Parameters:**
- `id` (string) - Memory identifier
- `content` (string) - Memory content
- `heading` (string) - Memory title
- `notes` (string, optional) - Additional notes

**Returns:** Created/updated memory entry

**Example:**
```javascript
memory.set(
    'user_name',
    'John Doe',
    'User Information',
    'Collected from form'
);
```

##### `memory.delete(id)`

Delete memory entry.

**Returns:** `boolean`

##### `memory.list()`

List all memory entries.

**Returns:** Array of memory entries

**Example:**
```javascript
const allMemory = memory.list();
allMemory.forEach(m => console.log(m.heading));
```

##### `memory.search(query)`

Search memory entries.

**Parameters:**
- `query` (string|RegExp) - Search query

**Returns:** Array of matching entries

**Example:**
```javascript
const results = memory.search('user');
```

---

### 3. Tasks API (`tasks`)

Manage tasks programmatically.

#### Methods

##### `tasks.get(id)`

Get task entry.

**Returns:** Task object or `null`

##### `tasks.set(id, task)`

Create or update task.

**Parameters:**
- `id` (string) - Task identifier
- `task` (object) - Task data
  - `heading` (string) - Task title
  - `content` (string) - Task description
  - `status` (string) - Status: `'pending'`, `'ongoing'`, `'finished'`, or `'paused'`
  - `notes` (string) - Task notes

**Returns:** Created/updated task

**Example:**
```javascript
tasks.set('task_001', {
    heading: 'Data Analysis',
    content: 'Analyze user behavior patterns',
    status: 'ongoing',
    notes: 'Using dataset from Q3'
});
```

##### `tasks.setStatus(id, status)`

Update task status.

**Parameters:**
- `id` (string) - Task identifier
- `status` (string) - New status

**Returns:** Updated task

**Example:**
```javascript
tasks.setStatus('task_001', 'finished');
```

##### `tasks.delete(id)`

Delete task.

**Returns:** `boolean`

##### `tasks.list(options)`

List tasks.

**Parameters:**
- `options` (object, optional)
  - `status` (string) - Filter by status

**Returns:** Array of tasks

**Example:**
```javascript
// All tasks
const all = tasks.list();

// Only pending tasks
const pending = tasks.list({ status: 'pending' });
```

##### `tasks.stats()`

Get task statistics.

**Returns:** `{total, byStatus}`

**Example:**
```javascript
const stats = tasks.stats();
console.log(`Pending: ${stats.byStatus.pending}`);
console.log(`Ongoing: ${stats.byStatus.ongoing}`);
console.log(`Finished: ${stats.byStatus.finished}`);
```

---

### 4. Goals API (`goals`)

Manage goals programmatically.

#### Methods

##### `goals.get(id)`

Get goal entry.

**Returns:** Goal object or `null`

##### `goals.set(id, goal)`

Create or update goal.

**Parameters:**
- `id` (string) - Goal identifier
- `goal` (object) - Goal data
  - `heading` (string) - Goal title
  - `content` (string) - Goal description/success criteria
  - `notes` (string) - Additional notes

**Returns:** Created/updated goal

**Example:**
```javascript
goals.set('goal_q4', {
    heading: 'Q4 Objectives',
    content: 'Achieve 95% user satisfaction',
    notes: 'Based on survey results'
});
```

##### `goals.delete(id)`

Delete goal.

**Returns:** `boolean`

##### `goals.list()`

List all goals.

**Returns:** Array of goals

---

### 5. Utils API (`utils`)

Utility functions for common tasks.

#### Methods

##### `utils.generateId(prefix)`

Generate unique ID.

**Parameters:**
- `prefix` (string) - ID prefix (default: `'item'`)

**Returns:** Unique ID string

**Example:**
```javascript
const taskId = utils.generateId('task');  // 'task_1699..._abc123'
const dataId = utils.generateId('data');  // 'data_1699..._xyz789'
```

##### `utils.now()`

Get current ISO timestamp.

**Returns:** ISO timestamp string

**Example:**
```javascript
const timestamp = utils.now();  // '2025-11-01T12:00:00.000Z'
```

##### `utils.sleep(ms)`

Async sleep function.

**Parameters:**
- `ms` (number) - Milliseconds to sleep

**Returns:** Promise

**Example:**
```javascript
console.log('Starting...');
await utils.sleep(2000);  // Wait 2 seconds
console.log('Done!');
```

---

## Complete Examples

### Example 1: Data Processing Pipeline

```javascript
// Load source data from vault
const rawData = vault.get('source_data');

// Process data
const processed = rawData.map(item => ({
    ...item,
    score: item.value * 100,
    grade: item.value > 0.9 ? 'A' : 'B'
}));

// Calculate statistics
const avgScore = processed.reduce((sum, p) => sum + p.score, 0) / processed.length;

// Store results
vault.set('processed_results', processed, {
    type: 'data',
    description: 'Processed scores with grades'
});

vault.set('statistics', { avgScore, count: processed.length }, {
    type: 'data',
    description: 'Summary statistics'
});

// Update task status
tasks.setStatus('data_processing', 'finished');

// Log completion
console.log(`Processed ${processed.length} items`);
console.log(`Average score: ${avgScore.toFixed(2)}`);

return { avgScore, count: processed.length };
```

### Example 2: Dynamic Task Management

```javascript
// Get all pending tasks
const pending = tasks.list({ status: 'pending' });

// Process each task
for (const task of pending) {
    // Mark as ongoing
    tasks.setStatus(task.identifier, 'ongoing');

    // Simulate work
    console.log(`Processing: ${task.heading}`);
    await utils.sleep(1000);

    // Mark as finished
    tasks.setStatus(task.identifier, 'finished');

    // Store result in memory
    memory.set(
        `result_${task.identifier}`,
        `Completed: ${task.heading}`,
        'Task Result'
    );
}

// Get final stats
const stats = tasks.stats();
console.log(`Completed ${stats.byStatus.finished} tasks`);

return stats;
```

### Example 3: Vault Search and Analysis

```javascript
// Search for all data entries
const dataEntries = vault.search(/^data_/);

// Analyze each entry
const analysis = dataEntries.map(entry => {
    const data = vault.get(entry.identifier);
    return {
        id: entry.identifier,
        size: JSON.stringify(data).length,
        keys: Object.keys(data),
        created: entry.createdAt
    };
});

// Store analysis
vault.set('vault_analysis', analysis, {
    type: 'data',
    description: 'Analysis of data entries'
});

// Get vault statistics
const vaultStats = vault.stats();

console.log(`Total entries: ${vaultStats.total}`);
console.log(`Data entries: ${vaultStats.byType.data}`);
console.log(`Code entries: ${vaultStats.byType.code}`);
console.log(`Text entries: ${vaultStats.byType.text}`);

return { analysis, vaultStats };
```

### Example 4: Mixed Operations

```javascript
// Create a new task
const taskId = utils.generateId('task');
tasks.set(taskId, {
    heading: 'Generate Report',
    content: 'Create monthly report',
    status: 'ongoing',
    notes: `Started at: ${utils.now()}`
});

// Check if required data exists
if (!vault.exists('monthly_data')) {
    throw new Error('Monthly data not found');
}

// Load and process data
const monthlyData = vault.get('monthly_data');
const report = {
    period: monthlyData.period,
    summary: monthlyData.summary,
    generated: utils.now(),
    totalRecords: monthlyData.records.length
};

// Store report
vault.set('monthly_report', report, {
    type: 'data',
    description: `Report for ${monthlyData.period}`
});

// Update task
tasks.setStatus(taskId, 'finished');

// Set goal if needed
if (report.totalRecords > 1000) {
    goals.set('growth_goal', {
        heading: 'Maintain Growth',
        content: 'Keep monthly records above 1000',
        notes: `Current: ${report.totalRecords}`
    });
}

return report;
```

---

## Migration from Vault References

### Before (Using Vault References)

```javascript
// Had to use vault references in template
const data = {{<vaultref id="my_data" />}};
console.log(data);
```

### After (Using Vault API)

```javascript
// Clean API access
const data = vault.get('my_data');
console.log(data);

// Can also modify vault during execution
vault.set('updated_data', { ...data, timestamp: utils.now() });
```

---

## Best Practices

1. **Use Descriptive IDs**
   ```javascript
   // Good
   vault.set('user_analysis_q4_2024', data);

   // Bad
   vault.set('data1', data);
   ```

2. **Always Check Existence**
   ```javascript
   if (vault.exists('required_data')) {
       const data = vault.get('required_data');
       // Process data
   } else {
       console.error('Required data not found');
   }
   ```

3. **Use Appropriate Types**
   ```javascript
   // Data type for JSON
   vault.set('stats', { count: 100 }, { type: 'data' });

   // Code type for functions
   vault.set('helper', 'function add(a,b) { return a+b; }', { type: 'code' });

   // Text type for notes
   vault.set('notes', 'Remember to check edge cases', { type: 'text' });
   ```

4. **Add Descriptions**
   ```javascript
   vault.set('results', data, {
       type: 'data',
       description: 'Analysis results from batch processing Q4 2024'
   });
   ```

5. **Clean Up When Done**
   ```javascript
   // Delete temporary data
   if (vault.exists('temp_processing_data')) {
       vault.delete('temp_processing_data');
   }
   ```

---

## Error Handling

All APIs throw errors for invalid inputs:

```javascript
try {
    vault.set('invalid<>id', data);  // Throws: Invalid vault ID
} catch (error) {
    console.error('Error:', error.message);
}

try {
    tasks.setStatus('nonexistent_task', 'finished');  // Throws: Task not found
} catch (error) {
    console.error('Task error:', error.message);
}
```

---

## Performance Tips

1. **Use metadata-only listing for large vaults**
   ```javascript
   const metadata = vault.list({ metadataOnly: true });  // Faster
   ```

2. **Filter at API level**
   ```javascript
   // Good - filtered by API
   const dataEntries = vault.list({ type: 'data' });

   // Bad - loads all then filters
   const all = vault.list();
   const dataEntries = all.filter(e => e.type === 'data');
   ```

3. **Batch operations**
   ```javascript
   // Get all data at once
   const pending = tasks.list({ status: 'pending' });

   // Process in batch
   pending.forEach(task => {
       // Process task
       tasks.setStatus(task.identifier, 'finished');
   });
   ```

---

## Architecture

The execution context APIs are modular and located in:

```
js/execution/
├── execution-context-api.js     ← Main assembler
└── apis/
    ├── vault-api.js             ← VaultAPI implementation
    ├── memory-api.js            ← MemoryAPI implementation
    ├── tasks-api.js             ← TasksAPI implementation
    └── goals-api.js             ← GoalsAPI implementation
```

Each API is ~100-200 lines, focused on a single responsibility.

---

## See Also

- [Tool Parsing System](./TOOL_PARSING_SYSTEM.md) - How tools are parsed
- [Storage Documentation](../js/storage/README.md) - Underlying storage system
- [Examples](../js/examples/) - More code examples

---

## License

Same as parent project.
