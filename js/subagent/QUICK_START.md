# Sub-Agent System - Quick Start Guide

## 🚀 Getting Started

The GDRS Sub-Agent System is now integrated and ready to use! This guide will help you get started quickly.

## 📦 What's Included

The system is automatically initialized when you load GDRS. No additional setup required!

**Available Components:**
- ✅ `SubAgentOrchestrator` - Main orchestration engine
- ✅ `WebTools` - API helper libraries (Wikipedia, arXiv, DuckDuckGo, Wikidata)
- ✅ `SubAgentUI` - Real-time monitoring UI
- ✅ `externalKnowledgeProvider` - Automatic context injection

## 🎯 Quick Start: Run Your First Sub-Agent

### Option 1: Using Console Commands

Open the browser console and run:

```javascript
// Enable sub-agent feature
GDRS_DEBUG.enableSubAgents();

// Show sub-agent UI panel
GDRS_DEBUG.toggleSubAgentUI();

// List available agents
GDRS_DEBUG.listSubAgents();

// Run a sub-agent
const result = await GDRS_DEBUG.runSubAgent(
  'webKnowledge',
  'What is TypeScript?',
  { modelId: 'gemini-1.5-pro' }
);

console.log(result.content);
```

### Option 2: Using GDRS Namespace Directly

```javascript
// Enable feature
GDRS.Storage.saveSubAgentEnabled(true);

// Show UI
GDRS.SubAgentUI.show();

// Run sub-agent
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'Explain quantum entanglement',
  { modelId: 'gemini-1.5-pro' }
);
```

## 🤖 Available Agents

### 1. webKnowledge
**Purpose:** General knowledge retrieval from Wikipedia, Wikidata, DuckDuckGo

**Best for:**
- General facts and information
- Historical data
- Definitions and explanations
- Current events

**Example:**
```javascript
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'What is the history of the Internet?',
  { modelId: 'gemini-1.5-pro' }
);
```

### 2. scienceResearch
**Purpose:** Academic paper search from arXiv

**Best for:**
- Scientific research papers
- Academic citations
- Technical publications
- Research trends

**Example:**
```javascript
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'scienceResearch',
  'Find recent papers on quantum computing',
  { modelId: 'gemini-1.5-pro' }
);
```

### 3. quickFacts
**Purpose:** Quick answers, definitions, and calculations

**Best for:**
- Simple facts
- Quick definitions
- Basic calculations
- Instant answers

**Example:**
```javascript
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'quickFacts',
  'What is the speed of light?',
  { modelId: 'gemini-1.5-flash' }
);
```

## 🎨 UI Features

The Sub-Agent UI automatically shows:

1. **Status Display** - Real-time execution status (IDLE/RUNNING/SUCCESS/ERROR)
2. **Current Execution Info** - Agent name, query, model, iteration
3. **Iteration Log** - Complete reasoning iteration history
4. **Code Execution Log** - Expandable code blocks with results
5. **Final Result** - Formatted output with metadata
6. **State Visualization** - Complete internal state (JSON)
7. **Execution History** - Last 50 executions

### UI Controls

```javascript
// Show UI panel
GDRS.SubAgentUI.show();

// Hide UI panel
GDRS.SubAgentUI.hide();

// Toggle visibility
GDRS.SubAgentUI.toggle();
```

## 🔗 Context Provider Integration

When sub-agents are enabled and a result is available, it's **automatically injected** into the main reasoning context!

**How it works:**
1. Run a sub-agent to gather information
2. Result is saved to storage
3. On next main query, the result is automatically included in the prompt
4. Main AI can use the external knowledge to answer

**Example workflow:**
```javascript
// 1. Enable sub-agents
GDRS.Storage.saveSubAgentEnabled(true);

// 2. Gather information
await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'What is Rust programming language?',
  { modelId: 'gemini-1.5-pro' }
);

// 3. Result is now stored

// 4. Main query automatically includes the result!
// Just type your query in the UI and run - the main AI
// will have access to the sub-agent's findings
```

## 📊 Monitoring Execution

### View Real-Time Updates

The UI automatically updates as the sub-agent runs:
- ✅ Each iteration appears in the iteration log
- ✅ Each code execution shows code + output + results
- ✅ Complete state updates in real-time

### View Execution History

```javascript
// Load history
const history = GDRS.Storage.loadSubAgentHistory();
console.log(`Total executions: ${history.length}`);

// View specific execution
history.forEach(exec => {
  console.log(`[${exec.timestamp}] ${exec.agentName}`);
  console.log(`Query: ${exec.query}`);
  console.log(`Success: ${exec.result.success}`);
});
```

### Check Current Result

```javascript
const result = GDRS.Storage.loadSubAgentResult();
if (result) {
  console.log('Last result:', result.content);
  console.log('Iterations:', result.iterations);
  console.log('Time:', result.executionTime, 'ms');
}
```

## 🛠 Advanced Usage

### Custom Iteration Limits

```javascript
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'Complex research query',
  {
    modelId: 'gemini-1.5-pro',
    maxIterations: 10  // Override default (5)
  }
);
```

### Verbose Logging

```javascript
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'Your query',
  {
    modelId: 'gemini-1.5-pro',
    verbose: true  // Enable detailed console logs
  }
);
```

### Access WebTools Directly

```javascript
// Wikipedia search
const wikiResults = await GDRS.WebTools.wikipedia.searchWikipedia('TypeScript');
console.log(wikiResults);

// Get Wikipedia summary
const summary = await GDRS.WebTools.wikipedia.getWikipediaSummary('TypeScript', 3);
console.log(summary);

// arXiv search
const papers = await GDRS.WebTools.arxiv.searchArxiv('quantum computing', { maxResults: 5 });
console.log(papers);

// DuckDuckGo instant answer
const answer = await GDRS.WebTools.duckduckgo.getInstantAnswer('speed of light');
console.log(answer);

// Wikidata entity search
const entities = await GDRS.WebTools.wikidata.searchWikidata('Albert Einstein');
console.log(entities);
```

## 🔍 Debugging

### Enable Debug Mode

```javascript
// Enable sub-agent debugging
console.log('Available agents:', GDRS_DEBUG.listSubAgents());

// Check if enabled
const isEnabled = GDRS.Storage.loadSubAgentEnabled();
console.log('Sub-agents enabled:', isEnabled);

// Check current result
const result = GDRS.Storage.loadSubAgentResult();
console.log('Current result:', result);

// View state in UI
GDRS.SubAgentUI.show();
// Then expand "State & Data Structures" section
```

### Common Issues

**Issue: "modelId is required"**
```javascript
// Solution: Always provide modelId
const result = await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'Your query',
  { modelId: 'gemini-1.5-pro' }  // Required!
);
```

**Issue: Sub-agent results not appearing in main prompt**
```javascript
// Solution: Check if feature is enabled
GDRS.Storage.saveSubAgentEnabled(true);

// Also check if result exists and is successful
const result = GDRS.Storage.loadSubAgentResult();
console.log('Result exists:', !!result);
console.log('Result success:', result?.success);
```

**Issue: UI not showing**
```javascript
// Solution: Initialize UI if not already done
if (!GDRS.SubAgentUI) {
  const { SubAgentUI } = await import('./ui/subagent-ui.js');
  GDRS.SubAgentUI = new SubAgentUI();
}
GDRS.SubAgentUI.show();
```

## 📚 Example Workflows

### Workflow 1: Research Assistant

```javascript
// 1. Enable and show UI
GDRS.Storage.saveSubAgentEnabled(true);
GDRS.SubAgentUI.show();

// 2. Gather background information
await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'What is machine learning?',
  { modelId: 'gemini-1.5-pro' }
);

// 3. Find academic papers
await GDRS.SubAgentOrchestrator.runSubAgent(
  'scienceResearch',
  'Recent papers on neural networks',
  { modelId: 'gemini-1.5-pro' }
);

// 4. Main query now has both context automatically!
// Type in main UI: "Explain neural networks using recent research"
```

### Workflow 2: Quick Fact Checker

```javascript
// Quick facts don't need full context
const fact1 = await GDRS.SubAgentOrchestrator.runSubAgent(
  'quickFacts',
  'Population of Japan',
  { modelId: 'gemini-1.5-flash' }
);

const fact2 = await GDRS.SubAgentOrchestrator.runSubAgent(
  'quickFacts',
  'Capital of Australia',
  { modelId: 'gemini-1.5-flash' }
);
```

### Workflow 3: Deep Research

```javascript
// Use higher iteration limit for complex research
const deepResearch = await GDRS.SubAgentOrchestrator.runSubAgent(
  'webKnowledge',
  'Comprehensive analysis of blockchain technology',
  {
    modelId: 'gemini-1.5-pro',
    maxIterations: 10,
    verbose: true
  }
);

console.log(deepResearch.content);
console.log(`Used ${deepResearch.iterations} iterations`);
console.log(`Took ${deepResearch.executionTime}ms`);
```

## 🎓 Understanding the Architecture

### Event Flow

```
User calls runSubAgent()
    ↓
SUBAGENT_START event → UI shows "RUNNING"
    ↓
For each iteration:
    SUBAGENT_ITERATION event → UI updates progress
    ↓
    For each code block:
        SUBAGENT_EXECUTION event → UI shows code + results
    ↓
Storage.saveSubAgentResult() → Saves to localStorage
    ↓
SUBAGENT_COMPLETE event → UI shows "SUCCESS"
    ↓
Context Provider checks on next main query
    ↓
If enabled + available + successful:
    Inject into main reasoning prompt
```

### Storage Structure

```javascript
// Result structure
{
  success: true,
  content: "Formatted markdown output",
  format: "markdown-bullets",
  source: "Web Knowledge Agent",
  iterations: 3,
  executionTime: 5420,
  timestamp: "2025-11-10T12:34:56.789Z",
  agentId: "webKnowledge",
  query: "Original query"
}

// History structure (last 50 executions)
[
  {
    timestamp: "2025-11-10T12:34:56.789Z",
    agentId: "webKnowledge",
    agentName: "Web Knowledge Agent",
    query: "...",
    modelId: "gemini-1.5-pro",
    result: { /* full result object */ }
  },
  // ...
]
```

## 🔐 Security Notes

- ⚠️ Sub-agents execute code from LLM responses
- ✅ Execution is sandboxed (isolated from main session)
- ✅ No access to outer scope variables
- ✅ Timeout protection prevents infinite loops
- ⚠️ Network access via WebTools (can make HTTP requests)
- ✅ HTML escaping prevents XSS in UI

**Best Practice:** Only use sub-agents with trusted LLM models.

## 📖 Additional Resources

- **PHASE1_VERIFICATION.md** - WebTools API documentation
- **PHASE2_VERIFICATION.md** - SandboxExecutor details
- **PHASE3_VERIFICATION.md** - SubAgentOrchestrator architecture
- **PHASE4_VERIFICATION.md** - Storage, Events, Context, UI
- **IMPLEMENTATION_COMPLETE.md** - Complete system overview

## 💡 Tips & Best Practices

1. **Enable sub-agents globally** - Set once and forget:
   ```javascript
   GDRS.Storage.saveSubAgentEnabled(true);
   ```

2. **Keep UI open during development** - Monitor execution in real-time:
   ```javascript
   GDRS.SubAgentUI.show();
   ```

3. **Use appropriate agents** - Match agent to task:
   - General info → `webKnowledge`
   - Academic papers → `scienceResearch`
   - Quick facts → `quickFacts`

4. **Check execution history** - Learn from past executions:
   ```javascript
   const history = GDRS.Storage.loadSubAgentHistory();
   ```

5. **Clear results when done** - Start fresh:
   ```javascript
   GDRS.Storage.clearSubAgentResult();
   ```

6. **Use verbose mode for debugging** - See detailed logs:
   ```javascript
   { verbose: true }
   ```

7. **Monitor state visualization** - See complete internal state in UI

## 🎉 You're Ready!

The Sub-Agent System is fully integrated and ready to enhance your GDRS experience with external knowledge retrieval!

**Try it now:**
```javascript
GDRS_DEBUG.enableSubAgents();
GDRS_DEBUG.toggleSubAgentUI();
await GDRS_DEBUG.runSubAgent('webKnowledge', 'What is Rust?', { modelId: 'gemini-1.5-pro' });
```

Happy researching! 🚀
