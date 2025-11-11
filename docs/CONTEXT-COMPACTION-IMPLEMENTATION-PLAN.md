# CONTEXT COMPACTION IMPLEMENTATION PLAN
**Feature:** Intelligent Context Window Management via Reasoning Log Compaction
**Created:** 2025-11-11
**Status:** DESIGN PHASE

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Architecture Analysis](#architecture-analysis)
4. [Detailed Requirements](#detailed-requirements)
5. [Technical Design](#technical-design)
6. [Implementation Plan](#implementation-plan)
7. [File-by-File Implementation](#file-by-file-implementation)
8. [UI/UX Design](#uiux-design)
9. [Testing Strategy](#testing-strategy)
10. [Performance Metrics](#performance-metrics)
11. [Risk Analysis](#risk-analysis)

---

## 1. EXECUTIVE SUMMARY

### What is Context Compaction?

**Context Compaction** is a critical feature that prevents context window overflow by intelligently summarizing completed reasoning iterations. As the reasoning loop progresses, the context window fills up with:
- Reasoning blocks from each iteration
- Code execution results
- Tool operation logs
- Error messages
- Intermediate outputs

Without compaction, the context window becomes bloated, causing:
- ❌ Slower LLM response times
- ❌ Higher API costs
- ❌ Loss of early context (pruned out)
- ❌ Reduced reasoning quality

### Solution Overview

A **"Compact Context"** button that:
1. **Waits** for current iteration (n+1) to complete
2. **Freezes** the system temporarily
3. **Sends** iterations 1 through (n-1) to a compaction LLM
4. **Receives** a compressed summary containing ONLY true, verified information
5. **Replaces** the (n-1) reasoning logs with the compact summary
6. **Resumes** the system with a much smaller context window

### Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Context Window Usage | ~85% (critical) | ~40% (healthy) | **53% reduction** |
| Reasoning Logs Size | ~15,000 tokens | ~3,000 tokens | **80% smaller** |
| LLM Response Time | 8-12s | 3-5s | **60% faster** |
| API Cost per Session | $0.15 | $0.06 | **60% savings** |
| Context Retention | 3 iterations | 10+ iterations | **3x more history** |

---

## 2. PROBLEM STATEMENT

### Current Context Window Breakdown

Based on analysis of `context-builder.js` and provider system:

```
┌─────────────────────────────────────────────────────────────┐
│           TYPICAL CONTEXT WINDOW (Iteration 10)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  System Prompt & Instructions        4,500 tokens  (15%)   │
│  User Query                             200 tokens  (1%)    │
│  Tasks/Goals/Memory                     800 tokens  (3%)    │
│  Vault Summary                          600 tokens  (2%)    │
│  Recent Reasoning (last 3 iter)      12,000 tokens  (40%)  ← BLOAT
│  Recent Executions (last 2)          8,000 tokens  (27%)   ← BLOAT
│  Pending Error Context                1,500 tokens  (5%)    │
│  Sub-agent Traces                     1,400 tokens  (5%)    │
│  Attachments Summary                    500 tokens  (2%)    │
│                                                             │
│  TOTAL:                              29,500 tokens (98%)    │
│  Available for response:                600 tokens (2%)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                    ⚠️ CRITICALLY FULL ⚠️
```

### The Bloat Problem

**Recent Reasoning Logs (40% of context):**
- Contains iterations 8, 9, 10
- Includes ALL thinking, even wrong paths
- Includes failed code attempts
- Includes corrected errors
- Includes intermediate outputs that are no longer relevant

**Recent Executions (27% of context):**
- Last 2 code executions with full output
- May include failed executions
- May include debugging console.logs
- Full stack traces for errors

### What Happens Without Compaction?

After ~12 iterations:
1. Context window hits 100%
2. Oldest reasoning gets pruned automatically
3. LLM loses track of early decisions
4. Reasoning quality degrades
5. LLM starts repeating solved problems
6. User has to restart session

---

## 3. ARCHITECTURE ANALYSIS

### 3.1 Current Reasoning Log Storage

**File:** `js/storage/storage.js`

#### Storage Key: `gdrs_reasoning_log`
- **Type:** `Array<string>`
- **Format:** Plain text entries
- **Example Entry:**
```
=== ITERATION 5 ===
I need to analyze the user's request. They want to calculate the Fibonacci sequence.
Let me break this down:
1. First, I'll write a function
2. Then test it with n=10
3. Finally, display the results

=== JAVASCRIPT EXECUTION ===
ID: exec_1699123456789
SOURCE: auto
TIME: 45ms
CODE:
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
console.log(fibonacci(10));
OUTPUT:
55

Now I have the result...
```

#### Current Providers Using Reasoning Log

**File:** `js/reasoning/context/providers/recent-reasoning-provider.js`

```javascript
collect({ snapshot, limits }) {
  const entries = snapshot.reasoningLog;
  const limit = limits.reasoningLogEntries || 3;
  return entries.slice(-limit); // Last 3 entries
}
```

**Impact:** Last 3 iterations sent to LLM every time.

### 3.2 Current Execution Log Storage

**File:** `js/storage/storage.js`

#### Storage Key: `gdrs_execution_log`
- **Type:** `Array<Object>`
- **Structure:**
```javascript
{
  timestamp: "2025-11-11T10:30:45.123Z",
  id: "exec_1699123456789",
  success: true,
  code: "function fibonacci(n) {...}",
  result: 55,
  error: null,
  executionTime: 45,
  source: "auto",
  context: { blockIndex: 0, operationsBefore: {...} },
  metadata: {}
}
```

#### Current Provider: `recent-executions-provider.js`

```javascript
collect({ snapshot, limits }) {
  const entries = snapshot.executionLog;
  const limit = limits.executionLogEntries || 2;
  return entries.slice(-limit); // Last 2 executions
}

format(entries) {
  return entries.map(entry => {
    if (entry.success) {
      return `[${entry.timestamp}] SUCCESS (${entry.source}): ${formatResult(entry.result)}`;
    } else {
      return `[${entry.timestamp}] ERROR (${entry.source}): ${entry.error.message}`;
    }
  }).join('\n');
}
```

**Impact:** Last 2 full executions sent every time, including code + output.

### 3.3 Context Building Flow

**File:** `js/reasoning/context/context-builder.js`

```javascript
async buildPrompt({ query, iteration, maxIterations, systemPrompt, instructions }) {
  const snapshot = this.snapshotFactory();
  snapshot.capture(); // Load all logs from storage

  const providerContextBase = { query, iteration, maxIterations, limits, snapshot };

  // Build each section
  const sections = this.sections.map(async (sectionConfig) => {
    const provider = this.providers.get(sectionConfig.providerId);

    // Collect data
    const collected = provider.collect ? provider.collect(providerContextBase) : null;

    // Format for prompt
    const formatted = provider.format ? provider.format(collected, providerContextBase) : collected;

    return { id: sectionConfig.id, content: formatted };
  });

  // Join all sections
  const prompt = [systemPrompt, ...sections, iterationLine, instructions].join('\n\n');

  return prompt;
}
```

### 3.4 Iteration Loop Flow

**File:** `js/control/loop-controller.js`

```javascript
async function executeOneIteration() {
  const iterationCount = sessionManager.getIteration(sessionId);

  // 1. Build context prompt (includes ALL recent logs)
  const prompt = await reasoningEngine.buildContextPrompt(query, iterationCount);

  // 2. Call LLM
  const response = await GeminiAPI.generateContent(modelId, prompt);

  // 3. Parse response
  const operations = parseAllOperations(response);

  // 4. Execute operations (this adds NEW entries to logs)
  await executeOperations(operations);

  // 5. Record iteration
  sessionManager.recordIteration(sessionId, { iterationCount, operations });

  // 6. Check if done
  if (Storage.isFinalOutputVerified()) {
    finishSession();
  } else {
    scheduleNextIteration(); // Loop continues
  }
}
```

**Key Insight:** Each iteration adds to logs, but old logs are never compacted.

---

## 4. DETAILED REQUIREMENTS

### 4.1 Functional Requirements

#### FR1: Button Placement and Visibility
- **Location:** Reasoning control panel (top-right of UI)
- **Label:** "🗜️ Compact Context" or "🔄 Compress Logs"
- **Visibility:**
  - Hidden when iterations < 3
  - Visible when iterations >= 3
  - Disabled during iteration execution
  - Enabled when system is idle between iterations

#### FR2: Button Click Behavior
```
User clicks "Compact Context"
    ↓
[1] Check if iteration is in progress
    ├─ If YES → Wait for current iteration to complete
    │           Show: "⏳ Waiting for iteration N to finish..."
    │
    └─ If NO  → Proceed to step 2
    ↓
[2] Freeze system
    ├─ Disable "Continue Reasoning" button
    ├─ Disable all tool operations
    ├─ Show: "🔒 System frozen for compaction"
    └─ Emit event: COMPACTION_START
    ↓
[3] Gather data for compaction
    ├─ Current iteration: N
    ├─ Logs to compact: Iterations 1 through (N-1)
    ├─ Exclude: Current iteration N (keep as-is)
    │
    ├─ Load from storage:
    │  ├─ Reasoning log entries [1..N-1]
    │  ├─ Execution log entries [1..N-1]
    │  ├─ Tool activity log [1..N-1]
    │  └─ Pending errors (resolved)
    │
    └─ Build compaction prompt (see FR3)
    ↓
[4] Call Compaction LLM
    ├─ Model: Gemini 1.5 Flash (fast + cheap)
    ├─ Temperature: 0.1 (deterministic)
    ├─ Max tokens: 4000 (compact summary)
    ├─ Timeout: 30 seconds
    └─ Show progress: "🤖 Compacting iterations 1-{N-1}..."
    ↓
[5] Receive compacted summary
    ├─ Validate response structure
    ├─ Check for required sections
    └─ If invalid → Retry once, else abort
    ↓
[6] Replace old logs with compact summary
    ├─ Create new reasoning log entry:
    │  "=== COMPACTED SUMMARY (Iterations 1-{N-1}) ==="
    │  {compacted_content}
    │  "=== END COMPACTED SUMMARY ==="
    │
    ├─ Archive original logs:
    │  └─ Save to: localStorage["gdrs_archived_logs_{timestamp}"]
    │
    ├─ Clear execution log entries [1..N-1]
    ├─ Keep: Current iteration (N) logs intact
    └─ Emit event: COMPACTION_COMPLETE
    ↓
[7] Update UI
    ├─ Show success message: "✅ Compacted {tokens_saved} tokens"
    ├─ Update context usage indicator
    ├─ Show before/after metrics
    └─ Re-enable system
    ↓
[8] Unfreeze system
    ├─ Enable "Continue Reasoning" button
    ├─ Enable tool operations
    └─ Show: "🔓 System ready - context optimized"
```

#### FR3: Compaction Prompt Structure

The prompt sent to the compaction LLM:

```markdown
# CONTEXT COMPACTION TASK

You are a **Context Compaction Agent**. Your SOLE purpose is to compress reasoning history into a compact, truth-only summary.

## YOUR MISSION

Review the reasoning history below (iterations 1 through {N-1}) and produce a COMPACT SUMMARY that:

✅ **INCLUDE:**
- All TRUE, VERIFIED information
- Successful solutions and their results
- Important decisions and their rationale
- Key data discoveries
- Working code (final versions only)
- Successful tool operations
- Critical insights and learnings
- Minute details that matter for future reasoning

❌ **EXCLUDE:**
- Failed code attempts
- Error messages (unless critical to understanding)
- Wrong reasoning paths that were corrected
- Debugging outputs
- Redundant information
- Intermediate attempts
- Trial-and-error iterations
- Console logs from debugging
- Verbose explanations (keep it concise)

## REASONING HISTORY TO COMPACT

{reasoning_log_entries_1_to_N_minus_1}

## EXECUTION HISTORY TO COMPACT

{execution_log_entries_1_to_N_minus_1}

## OUTPUT FORMAT

Produce a structured summary in this format:

### 🎯 OBJECTIVE ACHIEVED
[One sentence: What was accomplished in these iterations]

### 📊 KEY DISCOVERIES
- [Discovery 1]
- [Discovery 2]
...

### ✅ SUCCESSFUL SOLUTIONS
#### Solution 1: [Name]
- **What:** [Brief description]
- **How:** [Approach used]
- **Result:** [Outcome]
- **Code:** [Final working code if applicable]

#### Solution 2: [Name]
...

### 🔧 TOOLS USED SUCCESSFULLY
- [Tool 1]: [Purpose and result]
- [Tool 2]: [Purpose and result]

### 💡 CRITICAL INSIGHTS
- [Insight 1]
- [Insight 2]

### 📝 IMPORTANT CONTEXT FOR FUTURE REASONING
[Any context that will be needed in subsequent iterations]

---

**IMPORTANT RULES:**
1. Be RUTHLESSLY concise - every word must add value
2. Include ALL minute details that are TRUE and USEFUL
3. If code was eventually successful, include ONLY the final working version
4. If multiple attempts were made, summarize: "After 3 attempts, found solution: [solution]"
5. Do NOT include explanations of failures unless they teach a lesson
6. Do NOT include debugging artifacts
7. Your summary should be ~70% smaller than the original
8. Maintain chronological flow when important for understanding

**OUTPUT ONLY THE SUMMARY. NO PREAMBLE. START WITH "### 🎯 OBJECTIVE ACHIEVED"**
```

#### FR4: Compaction Trigger Logic

**When can compaction be triggered?**

```javascript
function canTriggerCompaction() {
  const session = sessionManager.getCurrentSession();

  // Must have active session
  if (!session) return false;

  // Must have at least 3 completed iterations
  if (session.iterationCount < 3) return false;

  // System must be idle (not executing)
  if (session.status === 'running') return false;

  // Must not already be compacting
  if (session.isCompacting) return false;

  // Context usage should be > 60% to justify compaction
  const contextUsage = calculateContextUsage();
  if (contextUsage < 0.60) return false;

  return true;
}
```

**Auto-trigger threshold:**
```javascript
function shouldAutoTriggerCompaction() {
  const contextUsage = calculateContextUsage();

  // Auto-trigger at 85% context usage
  if (contextUsage >= 0.85) {
    console.warn('[Compaction] Context usage critical - auto-triggering compaction');
    return true;
  }

  return false;
}
```

#### FR5: Archive System

**Before compaction, archive original logs:**

```javascript
function archiveBeforeCompaction(iterationsToCompact) {
  const timestamp = Date.now();
  const archiveKey = `gdrs_archived_logs_${timestamp}`;

  const archive = {
    timestamp,
    sessionId: sessionManager.getCurrentSessionId(),
    iterations: iterationsToCompact,
    data: {
      reasoningLog: Storage.loadReasoningLog(),
      executionLog: Storage.loadExecutionLog(),
      toolActivityLog: Storage.loadToolActivityLog()
    },
    metadata: {
      compactionReason: 'user_triggered', // or 'auto_triggered'
      contextUsageBefore: calculateContextUsage(),
      totalTokensBefore: estimateTokenCount()
    }
  };

  localStorage.setItem(archiveKey, JSON.stringify(archive));

  // Emit event for UI
  eventBus.emit(Events.LOGS_ARCHIVED, { archiveKey, timestamp });

  return archiveKey;
}
```

#### FR6: Rollback Capability

**If compaction fails or produces bad summary, rollback:**

```javascript
function rollbackCompaction(archiveKey) {
  const archive = JSON.parse(localStorage.getItem(archiveKey));

  if (!archive) {
    throw new Error('Archive not found - cannot rollback');
  }

  // Restore original logs
  Storage.saveReasoningLog(archive.data.reasoningLog);
  Storage.saveExecutionLog(archive.data.executionLog);
  Storage.saveToolActivityLog(archive.data.toolActivityLog);

  // Mark session as not compacting
  sessionManager.setCompactionStatus(false);

  // Emit event
  eventBus.emit(Events.COMPACTION_ROLLED_BACK, { archiveKey });

  console.log('[Compaction] Rolled back to archive:', archiveKey);
}
```

### 4.2 Non-Functional Requirements

#### NFR1: Performance
- Compaction LLM call: < 30 seconds
- Archive creation: < 1 second
- Log replacement: < 0.5 seconds
- UI freeze time: < 35 seconds total

#### NFR2: Reliability
- Success rate: > 95%
- Retry on failure: 1 time
- Rollback on critical error: Automatic
- Data loss: Zero tolerance

#### NFR3: Usability
- Button discoverable: Tooltip + icon
- Progress indication: Real-time updates
- Error messages: Clear and actionable
- Metrics display: Before/after comparison

#### NFR4: Cost
- Compaction LLM: Gemini 1.5 Flash (~$0.002/call)
- Archive storage: < 1MB per session
- Total cost per compaction: < $0.005

---

## 5. TECHNICAL DESIGN

### 5.1 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       UI LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CompactionButton.js          CompactionProgressModal.js       │
│  (triggers compaction)         (shows live progress)           │
│           │                              ↑                      │
│           └──────────────────┬───────────┘                      │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                     ORCHESTRATION LAYER                         │
├──────────────────────────────┼──────────────────────────────────┤
│                              ↓                                  │
│                  CompactionOrchestrator.js                      │
│                  (main coordinator)                             │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ↓                    ↓                    ↓             │
│   [1] Freeze         [2] Gather Data      [3] Execute          │
│   System             & Build Prompt       Compaction           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
┌──────────┼────────────────────┼────────────────────┼────────────┐
│          ↓         PROCESSING LAYER        ↓       ↓            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CompactionDataGatherer.js    CompactionPromptBuilder.js       │
│  (extracts logs 1..N-1)        (builds LLM prompt)             │
│           │                              │                      │
│           └──────────────────┬───────────┘                      │
│                              ↓                                  │
│                  CompactionExecutor.js                          │
│                  (calls LLM + validates)                        │
│                              │                                  │
│         ┌────────────────────┼────────────────────┐            │
│         ↓                    ↓                    ↓             │
│  [4] Replace Logs    [5] Archive Old     [6] Update            │
│                          Logs                Metrics            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
┌──────────┼────────────────────┼────────────────────┼────────────┐
│          ↓         STORAGE LAYER           ↓       ↓            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CompactionArchive.js         CompactionMetrics.js             │
│  (save/restore archives)       (track stats)                   │
│                                                                 │
│  Storage.js (modified)         SessionManager.js (modified)    │
│  (new compaction methods)      (compaction state tracking)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 State Machine

```
┌──────────────┐
│   IDLE       │ ← Initial state (between iterations)
└──────┬───────┘
       │ User clicks "Compact" OR Auto-trigger
       ↓
┌──────────────┐
│  WAITING     │ ← Waiting for current iteration to finish
└──────┬───────┘   (if iteration in progress)
       │ Iteration complete OR Already idle
       ↓
┌──────────────┐
│  FREEZING    │ ← Freeze system, disable controls
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  GATHERING   │ ← Collect logs, build prompt
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  COMPACTING  │ ← Call LLM, wait for response
└──────┬───────┘
       │
       ├─ ERROR ──→ ┌──────────────┐
       │            │  RETRYING     │ ← Retry once
       │            └──────┬────────┘
       │                   │
       │                   ├─ SUCCESS → (continue below)
       │                   │
       │                   └─ FAILURE → ┌──────────────┐
       │                                │ ROLLING_BACK │
       │                                └──────┬───────┘
       │                                       ↓
       ↓                                ┌──────────────┐
┌──────────────┐                       │   ERROR      │ → Show error, unfreeze
│  REPLACING   │ ← Replace logs         └──────────────┘
└──────┬───────┘   with summary
       │
       ↓
┌──────────────┐
│  ARCHIVING   │ ← Save original logs to archive
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  UNFREEZING  │ ← Re-enable system
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  COMPLETE    │ ← Show success metrics, return to IDLE
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   IDLE       │ ← Ready for next compaction
└──────────────┘
```

### 5.3 Data Flow Diagram

```
USER CLICKS "COMPACT"
        │
        ↓
[CompactionButton.js]
  ├─ Check: canTriggerCompaction()
  ├─ Show: CompactionProgressModal
  └─ Call: CompactionOrchestrator.startCompaction()
        │
        ↓
[CompactionOrchestrator.js]
        │
        ├──→ [PHASE 1: FREEZE]
        │    ├─ sessionManager.setCompactionStatus(true)
        │    ├─ loopController.pauseIterations()
        │    └─ eventBus.emit(COMPACTION_PHASE_CHANGE, 'freezing')
        │
        ├──→ [PHASE 2: GATHER]
        │    └─ CompactionDataGatherer.gather()
        │         ├─ currentIteration = sessionManager.getIteration()
        │         ├─ targetIterations = [1..(currentIteration - 1)]
        │         │
        │         ├─ Load from Storage:
        │         │  ├─ reasoningLog = Storage.loadReasoningLog()
        │         │  ├─ executionLog = Storage.loadExecutionLog()
        │         │  └─ toolActivityLog = Storage.loadToolActivityLog()
        │         │
        │         ├─ Filter to iterations [1..N-1]:
        │         │  ├─ reasoningEntries = filterByIteration(reasoningLog, targetIterations)
        │         │  ├─ executionEntries = filterByIteration(executionLog, targetIterations)
        │         │  └─ toolEntries = filterByIteration(toolActivityLog, targetIterations)
        │         │
        │         └─ Return: { reasoningEntries, executionEntries, toolEntries, targetIterations }
        │
        ├──→ [PHASE 3: BUILD PROMPT]
        │    └─ CompactionPromptBuilder.build(gatheredData)
        │         ├─ Format reasoning entries as text
        │         ├─ Format execution entries as code blocks
        │         ├─ Include tool activity summary
        │         └─ Return: fullPrompt (see FR3)
        │
        ├──→ [PHASE 4: EXECUTE COMPACTION]
        │    └─ CompactionExecutor.execute(prompt)
        │         ├─ Call GeminiAPI.generateContent()
        │         │  ├─ model: 'gemini-1.5-flash'
        │         │  ├─ temperature: 0.1
        │         │  ├─ maxOutputTokens: 4000
        │         │  └─ timeout: 30000ms
        │         │
        │         ├─ Validate response:
        │         │  ├─ Check structure (has required sections)
        │         │  ├─ Check length (not too short)
        │         │  └─ Check for errors
        │         │
        │         └─ Return: { success, compactedSummary, metrics }
        │
        ├──→ [PHASE 5: ARCHIVE]
        │    └─ CompactionArchive.archive(gatheredData)
        │         ├─ Create archive object
        │         ├─ Save to localStorage[archiveKey]
        │         └─ Return: archiveKey
        │
        ├──→ [PHASE 6: REPLACE]
        │    └─ CompactionLogReplacer.replace(compactedSummary, targetIterations)
        │         │
        │         ├─ Create new reasoning log entry:
        │         │  newEntry = [
        │         │    "=== COMPACTED SUMMARY (Iterations 1-{N-1}) ===",
        │         │    compactedSummary,
        │         │    "=== END COMPACTED SUMMARY ===",
        │         │    "",
        │         │    "=== ITERATION {N} ===" ← Keep current iteration
        │         │    {current_iteration_content}
        │         │  ]
        │         │
        │         ├─ Update storage:
        │         │  ├─ Storage.saveReasoningLog(newEntry)
        │         │  ├─ Storage.clearExecutionLogRange(1, N-1)
        │         │  └─ Storage.clearToolActivityLogRange(1, N-1)
        │         │
        │         └─ Emit: LOGS_COMPACTED event
        │
        ├──→ [PHASE 7: METRICS]
        │    └─ CompactionMetrics.record({
        │         tokensBefore,
        │         tokensAfter,
        │         compressionRatio,
        │         executionTime
        │       })
        │
        └──→ [PHASE 8: UNFREEZE]
             ├─ sessionManager.setCompactionStatus(false)
             ├─ loopController.resumeIterations()
             ├─ eventBus.emit(COMPACTION_COMPLETE, metrics)
             └─ CompactionProgressModal.showSuccess(metrics)
```

---

## 6. IMPLEMENTATION PLAN

### Phase 1: Foundation (Week 1)
**Goal:** Set up core infrastructure

- [ ] Create `js/reasoning/compaction/` directory
- [ ] Add compaction events to `core/event-bus.js`
- [ ] Add compaction state to `reasoning/session/reasoning-session-manager.js`
- [ ] Add pause/resume methods to `control/loop-controller.js`
- [ ] Create compaction config in `config/compaction-config.js`

### Phase 2: Data Layer (Week 1-2)
**Goal:** Build data gathering and archive system

- [ ] Implement `CompactionDataGatherer.js`
- [ ] Implement `CompactionArchive.js`
- [ ] Implement `CompactionMetrics.js`
- [ ] Add helper methods to `Storage.js`
- [ ] Unit tests for data layer

### Phase 3: Processing Layer (Week 2)
**Goal:** Build prompt construction and LLM execution

- [ ] Implement `CompactionPromptBuilder.js`
- [ ] Implement `CompactionExecutor.js`
- [ ] Implement `CompactionValidator.js`
- [ ] Add retry logic
- [ ] Unit tests for processing layer

### Phase 4: Orchestration (Week 2-3)
**Goal:** Build main coordinator and state machine

- [ ] Implement `CompactionOrchestrator.js`
- [ ] Implement state machine
- [ ] Add error handling and rollback
- [ ] Integration tests

### Phase 5: UI Layer (Week 3)
**Goal:** Build user interface components

- [ ] Implement `CompactionButton.js`
- [ ] Implement `CompactionProgressModal.js`
- [ ] Add CSS styles
- [ ] Add tooltips and help text
- [ ] UI/UX testing

### Phase 6: Integration (Week 3-4)
**Goal:** Connect all components

- [ ] Integrate with loop controller
- [ ] Integrate with session manager
- [ ] Add auto-trigger logic
- [ ] End-to-end testing

### Phase 7: Polish & Launch (Week 4)
**Goal:** Final refinements and launch

- [ ] Performance optimization
- [ ] Error message refinement
- [ ] Documentation
- [ ] User guide
- [ ] Launch

---

## 7. FILE-BY-FILE IMPLEMENTATION

### File 1: `js/config/compaction-config.js`

**Purpose:** Configuration constants for compaction system

```javascript
/**
 * COMPACTION CONFIGURATION
 *
 * Controls behavior of context compaction system
 */

export const COMPACTION_CONFIG = {
  // Trigger thresholds
  minIterationsForCompaction: 3,
  autoTriggerContextUsage: 0.85, // 85%
  recommendedContextUsage: 0.60, // 60%

  // LLM settings
  model: 'gemini-1.5-flash',
  temperature: 0.1,
  maxOutputTokens: 4000,
  timeout: 30000, // 30 seconds

  // Retry settings
  maxRetries: 1,
  retryDelay: 2000, // 2 seconds

  // Archive settings
  archivePrefix: 'gdrs_archived_logs_',
  maxArchives: 10, // Keep last 10 archives
  archiveExpiryDays: 30,

  // Performance
  estimatedTokensPerIteration: 5000,
  targetCompressionRatio: 0.3, // 70% reduction

  // UI
  progressUpdateInterval: 500, // ms
  showMetricsInUI: true,
  animateCompaction: true
};

export const COMPACTION_EVENTS = {
  START: 'compaction_start',
  PHASE_CHANGE: 'compaction_phase_change',
  PROGRESS: 'compaction_progress',
  COMPLETE: 'compaction_complete',
  ERROR: 'compaction_error',
  ROLLED_BACK: 'compaction_rolled_back',
  ARCHIVED: 'compaction_archived'
};

export const COMPACTION_PHASES = {
  IDLE: 'idle',
  WAITING: 'waiting',
  FREEZING: 'freezing',
  GATHERING: 'gathering',
  BUILDING_PROMPT: 'building_prompt',
  COMPACTING: 'compacting',
  VALIDATING: 'validating',
  ARCHIVING: 'archiving',
  REPLACING: 'replacing',
  RECORDING_METRICS: 'recording_metrics',
  UNFREEZING: 'unfreezing',
  COMPLETE: 'complete',
  ERROR: 'error',
  RETRYING: 'retrying',
  ROLLING_BACK: 'rolling_back'
};

export default COMPACTION_CONFIG;
```

---

### File 2: `js/reasoning/compaction/CompactionDataGatherer.js`

**Purpose:** Extract reasoning logs from iterations 1 to N-1

```javascript
/**
 * COMPACTION DATA GATHERER
 *
 * Extracts and filters reasoning logs for compaction.
 * Only includes iterations 1 through (current - 1).
 */

import { Storage } from '../../storage/storage.js';

export class CompactionDataGatherer {
  constructor() {
    this.currentIteration = null;
    this.targetIterations = [];
  }

  /**
   * Gather all data needed for compaction
   *
   * @param {number} currentIteration - Current iteration number
   * @returns {Object} Gathered data
   */
  gather(currentIteration) {
    this.currentIteration = currentIteration;
    this.targetIterations = this._getTargetIterations();

    console.log(`[CompactionGatherer] Gathering data for iterations 1-${currentIteration - 1}`);

    const data = {
      currentIteration,
      targetIterations: this.targetIterations,
      reasoningEntries: this._gatherReasoningLog(),
      executionEntries: this._gatherExecutionLog(),
      toolActivityEntries: this._gatherToolActivityLog(),
      metadata: this._gatherMetadata()
    };

    console.log(`[CompactionGatherer] Gathered:`, {
      reasoningEntries: data.reasoningEntries.length,
      executionEntries: data.executionEntries.length,
      toolActivityEntries: data.toolActivityEntries.length
    });

    return data;
  }

  /**
   * Get target iteration numbers (1 to N-1)
   * @private
   */
  _getTargetIterations() {
    const iterations = [];
    for (let i = 1; i < this.currentIteration; i++) {
      iterations.push(i);
    }
    return iterations;
  }

  /**
   * Gather reasoning log entries
   * @private
   */
  _gatherReasoningLog() {
    const fullLog = Storage.loadReasoningLog() || [];

    // Extract entries for target iterations
    const entries = [];
    let currentIterationNum = null;
    let currentBlock = [];

    for (const line of fullLog) {
      // Check if this is an iteration marker
      const iterMatch = line.match(/^=== ITERATION (\d+) ===/);

      if (iterMatch) {
        // Save previous block if it was in target range
        if (currentIterationNum && this.targetIterations.includes(currentIterationNum)) {
          entries.push({
            iteration: currentIterationNum,
            content: currentBlock.join('\n')
          });
        }

        // Start new block
        currentIterationNum = parseInt(iterMatch[1]);
        currentBlock = [line];
      } else {
        currentBlock.push(line);
      }
    }

    // Handle last block
    if (currentIterationNum && this.targetIterations.includes(currentIterationNum)) {
      entries.push({
        iteration: currentIterationNum,
        content: currentBlock.join('\n')
      });
    }

    return entries;
  }

  /**
   * Gather execution log entries
   * @private
   */
  _gatherExecutionLog() {
    const fullLog = Storage.loadExecutionLog() || [];

    // Filter by iteration context
    const entries = fullLog.filter(entry => {
      // Try to determine iteration from context or timestamp
      const iteration = this._determineIterationFromExecution(entry);
      return iteration && this.targetIterations.includes(iteration);
    });

    return entries;
  }

  /**
   * Gather tool activity log entries
   * @private
   */
  _gatherToolActivityLog() {
    const fullLog = Storage.loadToolActivityLog() || [];

    // Filter by iteration field
    const entries = fullLog.filter(entry => {
      return entry.iteration && this.targetIterations.includes(entry.iteration);
    });

    return entries;
  }

  /**
   * Gather metadata about the session
   * @private
   */
  _gatherMetadata() {
    return {
      sessionId: Storage.loadCurrentSessionId?.() || 'unknown',
      timestamp: new Date().toISOString(),
      tasksSnapshot: Storage.loadTasks?.() || [],
      goalsSnapshot: Storage.loadGoals?.() || [],
      memorySnapshot: Storage.loadMemory?.() || [],
      vaultSummary: Storage.loadVault?.()?.map(v => ({
        identifier: v.identifier,
        type: v.type,
        description: v.description
      })) || []
    };
  }

  /**
   * Determine iteration number from execution entry
   * @private
   */
  _determineIterationFromExecution(entry) {
    // Try context first
    if (entry.context && entry.context.iteration) {
      return entry.context.iteration;
    }

    // Try to infer from timestamp by matching to reasoning log
    // (This is approximate - ideally executions should store iteration)
    // For now, return null if no context
    return null;
  }

  /**
   * Estimate token count of gathered data
   *
   * @returns {number} Estimated tokens
   */
  estimateTokenCount() {
    const reasoningText = this.reasoningEntries.map(e => e.content).join('\n');
    const executionText = JSON.stringify(this.executionEntries);
    const toolText = JSON.stringify(this.toolActivityEntries);

    const totalChars = reasoningText.length + executionText.length + toolText.length;

    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(totalChars / 4);
  }
}

export default CompactionDataGatherer;
```

---

### File 3: `js/reasoning/compaction/CompactionPromptBuilder.js`

**Purpose:** Build the compaction prompt for LLM

```javascript
/**
 * COMPACTION PROMPT BUILDER
 *
 * Constructs the prompt sent to the compaction LLM.
 * Includes clear instructions to exclude failures and wrong paths.
 */

export class CompactionPromptBuilder {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Build full compaction prompt
   *
   * @param {Object} gatheredData - Data from CompactionDataGatherer
   * @returns {string} Full prompt
   */
  build(gatheredData) {
    const parts = [];

    // Header
    parts.push(this._buildHeader(gatheredData));

    // Instructions
    parts.push(this._buildInstructions());

    // Reasoning history
    parts.push(this._buildReasoningSection(gatheredData.reasoningEntries));

    // Execution history
    parts.push(this._buildExecutionSection(gatheredData.executionEntries));

    // Tool activity
    parts.push(this._buildToolActivitySection(gatheredData.toolActivityEntries));

    // Context metadata
    parts.push(this._buildMetadataSection(gatheredData.metadata));

    // Output format specification
    parts.push(this._buildOutputFormat());

    // Final instructions
    parts.push(this._buildFinalInstructions());

    return parts.join('\n\n');
  }

  /**
   * Build header
   * @private
   */
  _buildHeader(data) {
    return [
      '# CONTEXT COMPACTION TASK',
      '',
      'You are a **Context Compaction Agent**. Your SOLE purpose is to compress reasoning history into a compact, truth-only summary.',
      '',
      `**Iterations to Compact:** 1 through ${data.currentIteration - 1}`,
      `**Current Iteration:** ${data.currentIteration} (will NOT be compacted)`,
      `**Session ID:** ${data.metadata.sessionId}`
    ].join('\n');
  }

  /**
   * Build main instructions
   * @private
   */
  _buildInstructions() {
    return [
      '## YOUR MISSION',
      '',
      'Review the reasoning history below and produce a COMPACT SUMMARY that:',
      '',
      '✅ **INCLUDE:**',
      '- All TRUE, VERIFIED information',
      '- Successful solutions and their results',
      '- Important decisions and their rationale',
      '- Key data discoveries',
      '- Working code (final versions only)',
      '- Successful tool operations',
      '- Critical insights and learnings',
      '- Minute details that matter for future reasoning',
      '- Context needed for understanding the current state',
      '',
      '❌ **EXCLUDE:**',
      '- Failed code attempts',
      '- Error messages that were resolved',
      '- Wrong reasoning paths that were corrected',
      '- Debugging outputs (console.logs, test prints)',
      '- Redundant information already stated',
      '- Intermediate attempts that led nowhere',
      '- Trial-and-error iterations',
      '- Verbose explanations (be concise)',
      '- Stack traces from resolved errors',
      '- Duplicate information',
      '',
      '**CRITICAL RULE:** Only include information that is VERIFIED TRUE and USEFUL.',
      'If something was tried and failed, only mention it if the failure teaches an important lesson.',
      'Otherwise, skip it entirely.'
    ].join('\n');
  }

  /**
   * Build reasoning section
   * @private
   */
  _buildReasoningSection(entries) {
    if (!entries || entries.length === 0) {
      return '## REASONING HISTORY\n\n(No reasoning entries to compact)';
    }

    const parts = ['## REASONING HISTORY TO COMPACT', ''];

    entries.forEach(entry => {
      parts.push(`### Iteration ${entry.iteration}`);
      parts.push(entry.content);
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Build execution section
   * @private
   */
  _buildExecutionSection(entries) {
    if (!entries || entries.length === 0) {
      return '## EXECUTION HISTORY\n\n(No code executions to compact)';
    }

    const parts = ['## EXECUTION HISTORY TO COMPACT', ''];

    entries.forEach((entry, index) => {
      parts.push(`### Execution ${index + 1}`);
      parts.push(`**Status:** ${entry.success ? 'SUCCESS ✅' : 'FAILURE ❌'}`);
      parts.push(`**Time:** ${entry.executionTime}ms`);
      parts.push(`**Source:** ${entry.source}`);
      parts.push('');
      parts.push('**Code:**');
      parts.push('```javascript');
      parts.push(entry.code);
      parts.push('```');
      parts.push('');

      if (entry.success) {
        parts.push('**Result:**');
        parts.push('```');
        parts.push(this._formatResult(entry.result));
        parts.push('```');
      } else {
        parts.push('**Error:**');
        parts.push('```');
        parts.push(entry.error?.message || 'Unknown error');
        parts.push('```');
      }

      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Build tool activity section
   * @private
   */
  _buildToolActivitySection(entries) {
    if (!entries || entries.length === 0) {
      return '## TOOL ACTIVITY\n\n(No tool operations to compact)';
    }

    const parts = ['## TOOL ACTIVITY TO COMPACT', ''];

    // Group by tool type
    const byType = {};
    entries.forEach(entry => {
      const type = entry.type || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(entry);
    });

    Object.entries(byType).forEach(([type, typeEntries]) => {
      parts.push(`### ${type} Operations`);
      typeEntries.forEach((entry, index) => {
        parts.push(`${index + 1}. [${entry.action}] ${entry.status} - ${entry.timestamp}`);
      });
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Build metadata section
   * @private
   */
  _buildMetadataSection(metadata) {
    const parts = ['## CURRENT STATE CONTEXT', ''];

    if (metadata.tasksSnapshot.length > 0) {
      parts.push('**Current Tasks:**');
      metadata.tasksSnapshot.forEach(task => {
        parts.push(`- [${task.status}] ${task.heading}`);
      });
      parts.push('');
    }

    if (metadata.goalsSnapshot.length > 0) {
      parts.push('**Current Goals:**');
      metadata.goalsSnapshot.forEach(goal => {
        parts.push(`- ${goal.heading}`);
      });
      parts.push('');
    }

    if (metadata.vaultSummary.length > 0) {
      parts.push('**Vault Entries:**');
      metadata.vaultSummary.forEach(entry => {
        parts.push(`- [${entry.identifier}] ${entry.type}: ${entry.description}`);
      });
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Build output format specification
   * @private
   */
  _buildOutputFormat() {
    return [
      '## OUTPUT FORMAT REQUIRED',
      '',
      'Produce your compact summary in this EXACT structure:',
      '',
      '```markdown',
      '### 🎯 OBJECTIVE ACHIEVED',
      '[One sentence: What was accomplished in these iterations]',
      '',
      '### 📊 KEY DISCOVERIES',
      '- [Discovery 1]',
      '- [Discovery 2]',
      '- [Discovery 3...]',
      '',
      '### ✅ SUCCESSFUL SOLUTIONS',
      '#### Solution 1: [Name]',
      '- **What:** [Brief description]',
      '- **How:** [Approach used]',
      '- **Result:** [Outcome with specific values]',
      '- **Code:** [Final working code if applicable]',
      '',
      '#### Solution 2: [Name]',
      '...',
      '',
      '### 🔧 TOOLS USED SUCCESSFULLY',
      '- [Tool 1]: [Purpose and result]',
      '- [Tool 2]: [Purpose and result]',
      '',
      '### 💡 CRITICAL INSIGHTS',
      '- [Insight 1]',
      '- [Insight 2]',
      '',
      '### 📝 IMPORTANT CONTEXT FOR FUTURE REASONING',
      '[Any context, state, or decisions that will be needed in subsequent iterations]',
      '```'
    ].join('\n');
  }

  /**
   * Build final instructions
   * @private
   */
  _buildFinalInstructions() {
    return [
      '---',
      '',
      '## FINAL REMINDERS',
      '',
      '1. **Be RUTHLESSLY concise** - every word must add value',
      '2. **Include ALL minute details** that are TRUE and USEFUL',
      '3. **If code was eventually successful**, include ONLY the final working version',
      '4. **If multiple attempts were made**, summarize: "After N attempts, found solution: [solution]"',
      '5. **Do NOT explain failures** unless they teach a critical lesson',
      '6. **Do NOT include debugging artifacts** (console.logs, test outputs, etc.)',
      '7. **Your summary should be ~70% smaller** than the original (~30% of original size)',
      '8. **Maintain chronological flow** when important for understanding causality',
      '9. **Focus on TRUTH** - only facts that are verified and correct',
      '10. **Think: "What does iteration N need to know to continue successfully?"**',
      '',
      '**OUTPUT ONLY THE SUMMARY. NO PREAMBLE. START WITH "### 🎯 OBJECTIVE ACHIEVED"**'
    ].join('\n');
  }

  /**
   * Format execution result
   * @private
   */
  _formatResult(result) {
    if (result === null) return 'null';
    if (result === undefined) return 'undefined';
    if (typeof result === 'object') {
      try {
        return JSON.stringify(result, null, 2);
      } catch (e) {
        return String(result);
      }
    }
    return String(result);
  }
}

export default CompactionPromptBuilder;
```

---

### File 4: `js/reasoning/compaction/CompactionExecutor.js`

**Purpose:** Execute LLM call for compaction

```javascript
/**
 * COMPACTION EXECUTOR
 *
 * Calls Gemini API to perform compaction and validates response.
 */

import { GeminiAPI } from '../../api/gemini-client.js';
import { COMPACTION_CONFIG } from '../../config/compaction-config.js';

export class CompactionExecutor {
  constructor(config = {}) {
    this.config = { ...COMPACTION_CONFIG, ...config };
    this.retryCount = 0;
  }

  /**
   * Execute compaction
   *
   * @param {string} prompt - Full compaction prompt
   * @returns {Promise<Object>} Result with compacted summary
   */
  async execute(prompt) {
    console.log('[CompactionExecutor] Starting execution');

    const startTime = Date.now();

    try {
      const response = await this._callLLM(prompt);

      const result = {
        success: true,
        compactedSummary: response.text,
        metrics: {
          executionTime: Date.now() - startTime,
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        rawResponse: response
      };

      // Validate
      const validation = this._validate(result.compactedSummary);

      if (!validation.valid) {
        console.warn('[CompactionExecutor] Validation failed:', validation.errors);

        if (this.retryCount < this.config.maxRetries) {
          console.log('[CompactionExecutor] Retrying...');
          this.retryCount++;
          await this._delay(this.config.retryDelay);
          return this.execute(prompt);
        } else {
          result.success = false;
          result.error = 'Validation failed after retries';
          result.validationErrors = validation.errors;
        }
      }

      console.log('[CompactionExecutor] Success:', result.metrics);

      return result;

    } catch (error) {
      console.error('[CompactionExecutor] Error:', error);

      if (this.retryCount < this.config.maxRetries) {
        console.log('[CompactionExecutor] Retrying due to error...');
        this.retryCount++;
        await this._delay(this.config.retryDelay);
        return this.execute(prompt);
      }

      return {
        success: false,
        error: error.message,
        metrics: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Call Gemini API
   * @private
   */
  async _callLLM(prompt) {
    const response = await GeminiAPI.generateContent(
      this.config.model,
      prompt,
      {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
        timeout: this.config.timeout
      }
    );

    return response;
  }

  /**
   * Validate compacted summary
   * @private
   */
  _validate(summary) {
    const errors = [];

    // Check if empty
    if (!summary || summary.trim().length === 0) {
      errors.push('Summary is empty');
    }

    // Check if too short (suspiciously small)
    if (summary.length < 100) {
      errors.push('Summary too short (< 100 characters)');
    }

    // Check for required sections
    const requiredSections = [
      '### 🎯 OBJECTIVE ACHIEVED',
      '### 📊 KEY DISCOVERIES',
      '### ✅ SUCCESSFUL SOLUTIONS'
    ];

    requiredSections.forEach(section => {
      if (!summary.includes(section)) {
        errors.push(`Missing required section: ${section}`);
      }
    });

    // Check for common failure patterns
    if (summary.toLowerCase().includes('i cannot') ||
        summary.toLowerCase().includes('i am unable')) {
      errors.push('LLM refused to perform compaction');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Delay helper
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default CompactionExecutor;
```

---

**[TRUNCATED - Document is very long. Continuing in next sections...]**

### Remaining Files to Implement (Summary):

5. **CompactionArchive.js** - Archive original logs before replacement
6. **CompactionLogReplacer.js** - Replace old logs with compacted summary
7. **CompactionMetrics.js** - Track compaction statistics
8. **CompactionOrchestrator.js** - Main coordinator (state machine)
9. **CompactionButton.js** - UI button component
10. **CompactionProgressModal.js** - Progress display modal

---

## 8. UI/UX DESIGN

### Button Design

```
┌────────────────────────────────────┐
│  Reasoning Controls                │
├────────────────────────────────────┤
│                                    │
│  [▶️ Continue Reasoning]           │
│  [⏸️ Pause]                         │
│  [🗜️ Compact Context]  ← NEW      │
│      💡 Save 70% context           │
│                                    │
└────────────────────────────────────┘
```

### Progress Modal Design

```
┌──────────────────────────────────────────────────┐
│  🗜️ Compacting Context                          │
├──────────────────────────────────────────────────┤
│                                                  │
│  Phase: Calling Compaction LLM                   │
│  [████████████░░░░░░░░░░░] 60%                  │
│                                                  │
│  ✅ Frozen system                                │
│  ✅ Gathered data (15,234 tokens)                │
│  ✅ Built prompt                                  │
│  🔄 Waiting for LLM response... (12s)            │
│  ⏳ Archiving logs                                │
│  ⏳ Replacing logs                                │
│  ⏳ Recording metrics                             │
│  ⏳ Unfreezing system                             │
│                                                  │
│  Estimated time remaining: 18 seconds            │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Success Display

```
┌──────────────────────────────────────────────────┐
│  ✅ Context Compacted Successfully!              │
├──────────────────────────────────────────────────┤
│                                                  │
│  📊 RESULTS:                                     │
│                                                  │
│  Before:  29,500 tokens  ████████████████████    │
│  After:    8,200 tokens  ██████                  │
│  Saved:   21,300 tokens  (72% reduction)         │
│                                                  │
│  Context Usage:  85% → 28% ⬇️                    │
│  Available Space: +21K tokens                    │
│  Execution Time: 23 seconds                      │
│                                                  │
│  Iterations compacted: 1-9                       │
│  Archive saved: archive_1699123456789            │
│                                                  │
│  [View Archive] [Close]                          │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 9. TESTING STRATEGY

### Unit Tests

1. **CompactionDataGatherer**
   - Test: Extract correct iteration range
   - Test: Filter reasoning logs by iteration
   - Test: Filter execution logs correctly
   - Test: Handle empty logs

2. **CompactionPromptBuilder**
   - Test: Build complete prompt
   - Test: Format reasoning entries
   - Test: Format execution entries
   - Test: Include all required sections

3. **CompactionExecutor**
   - Test: Call LLM successfully
   - Test: Validate response structure
   - Test: Retry on failure
   - Test: Handle timeout

4. **CompactionArchive**
   - Test: Create archive
   - Test: Restore from archive
   - Test: Expire old archives
   - Test: Handle corrupt archives

### Integration Tests

1. **End-to-End Compaction**
   - Setup: Create session with 10 iterations
   - Execute: Trigger compaction
   - Verify: Logs replaced correctly
   - Verify: Context size reduced
   - Verify: No data loss

2. **Rollback Scenario**
   - Setup: Create session
   - Execute: Trigger compaction
   - Simulate: LLM failure
   - Verify: Rollback successful
   - Verify: Original logs restored

3. **Auto-Trigger**
   - Setup: Fill context to 85%
   - Verify: Compaction triggered automatically
   - Verify: System continues normally

### Performance Tests

1. **Large Session**
   - Setup: 50 iterations, 100K tokens
   - Measure: Compaction time
   - Target: < 30 seconds

2. **Concurrent Operations**
   - Test: Compaction during pending operation
   - Verify: Graceful handling

---

## 10. PERFORMANCE METRICS

### Expected Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Compaction Time | < 30s | End-to-end latency |
| Context Reduction | 70% | Token count before/after |
| Success Rate | > 95% | Successful compactions / total |
| Data Loss | 0% | Verify all critical data retained |
| Archive Size | < 1MB | localStorage usage |
| UI Freeze | < 35s | Time until user can interact |

### Monitoring

Track in `CompactionMetrics`:
```javascript
{
  totalCompactions: 42,
  successfulCompactions: 41,
  failedCompactions: 1,
  averageReductionRatio: 0.72,
  averageExecutionTime: 23000,
  totalTokensSaved: 1234567,
  totalCostSaved: 2.45 // USD
}
```

---

## 11. RISK ANALYSIS

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM produces bad summary | Medium | High | Validation + retry + rollback |
| Data loss during replacement | Low | Critical | Archive before replace + atomic operations |
| Context still too large | Low | Medium | Adjust compression ratio |
| System crashes during compaction | Low | High | Archive + rollback + recovery |
| User loses work | Very Low | Critical | No data modified until verified |
| Cost explosion | Low | Medium | Use Flash model + limit frequency |

### Mitigation Strategies

1. **Archive System**: Always save original before modification
2. **Validation**: Strict checks on LLM output
3. **Rollback**: Automatic on failure
4. **Atomic Operations**: Use transaction-like pattern
5. **User Confirmation**: Optional "Are you sure?" dialog
6. **Rate Limiting**: Prevent rapid repeated compactions

---

## CONCLUSION

This implementation plan provides a comprehensive blueprint for building the Context Compaction feature. The system will:

1. ✅ Reduce context window usage by ~70%
2. ✅ Preserve all critical information
3. ✅ Eliminate wrong/failed attempts
4. ✅ Enable longer reasoning sessions
5. ✅ Reduce API costs by ~60%
6. ✅ Improve LLM response times

**Next Steps:**
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Iterate based on testing feedback

**Estimated Timeline:** 3-4 weeks for full implementation and testing.
