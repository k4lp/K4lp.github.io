# 🤖 COMPREHENSIVE SUB-AGENT SYSTEM IMPLEMENTATION PLAN
## Modular, Isolated, Extensible Multi-Agent Architecture

**Project:** K4lp.github.io (GDRS - Gemini Deep Research System)
**Date:** 2025-11-10
**Branch:** `claude/remove-docs-add-plan-011CUxrZNQ7rnAGqx9RZguJi`
**Status:** 🔍 DETAILED DESIGN & BINDING ANALYSIS COMPLETE

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Codebase Analysis & Binding Tracker](#codebase-analysis--binding-tracker)
4. [External Knowledge Sources (No-Auth APIs)](#external-knowledge-sources-no-auth-apis)
5. [Sub-Agent Framework Design](#sub-agent-framework-design)
6. [Implementation Phases](#implementation-phases)
7. [File-by-File Changes](#file-by-file-changes)
8. [Integration Points](#integration-points)
9. [Testing Strategy](#testing-strategy)
10. [Risk Analysis & Mitigation](#risk-analysis--mitigation)

---

## 📊 EXECUTIVE SUMMARY

### Goals
Create a **modular sub-agent system** that allows the main LLM to delegate specialized queries (web searches, domain-specific lookups, math calculations) to isolated agents that:
- Run in complete isolation from the main session
- Use all project features internally (code execution, vault, memory)
- Return structured results to the main chain
- Are easily extensible through configuration-only changes

### Key Features
1. **Isolation**: Sub-agents run in separate contexts, no state pollution
2. **Modularity**: New agents added via config, no core code changes
3. **Tooling**: Comprehensive API helper library for external knowledge
4. **Iteration**: Sub-agents can reason multi-step, not just single-turn
5. **Integration**: Seamless insertion into main reasoning context

### Value Proposition
- **Main LLM stays focused**: No API details cluttering the main prompt
- **Knowledge augmentation**: Access to Wikipedia, arXiv, Wikidata, etc.
- **Maintainability**: Centralized tool functions, config-driven agents
- **Scalability**: Add new agents/tools without touching core logic

---

## 🏗️ ARCHITECTURE OVERVIEW

### High-Level Flow

```
User Query
    ↓
Main Reasoning Loop (LoopController)
    ↓
[Optional] Trigger Sub-Agent (if query needs external knowledge)
    ↓
Sub-Agent Runner (runSubAgent)
    ↓
Sub-Agent Reasoning Loop (isolated)
    ├─ LLM Call 1 (with sub-agent system prompt)
    ├─ Parse Operations (code execution, tool calls)
    ├─ Execute Tools (wikiSearch, arxivSearch, etc.)
    ├─ LLM Call 2 (with execution results)
    ├─ ... (iterate until final answer)
    └─ Final Structured Output
    ↓
Insert into Main Context (ExternalKnowledgeProvider)
    ↓
Main LLM Iteration (with augmented knowledge)
    ↓
Final Answer to User
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN SESSION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ LoopController                                       │   │
│  │  - Main reasoning iterations                         │   │
│  │  - Task/Goal management                              │   │
│  │  - User query processing                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ReasoningContextBuilder                              │   │
│  │  - Builds main LLM prompt                            │   │
│  │  - Includes ExternalKnowledgeProvider ← NEW          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   SUB-AGENT LAYER (NEW)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ SubAgentOrchestrator                                 │   │
│  │  - runSubAgent(agentId, query)                       │   │
│  │  - Isolated context creation                         │   │
│  │  - Result formatting and return                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Sub-Agent Config (agents-config.js)                  │   │
│  │  - Agent definitions (ID, prompt, tools)             │   │
│  │  - Extensibility through config                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Web Tools Library (web-tools.js)                     │   │
│  │  - wikiSearch(), wikidataQuery()                     │   │
│  │  - arxivSearch(), dbpediaQuery()                     │   │
│  │  - wolframQuery(), stackExchangeSearch()             │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Sandbox Code Executor                                │   │
│  │  - Isolated execution environment                    │   │
│  │  - No main session state pollution                   │   │
│  │  - Capture output for sub-agent context             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 CODEBASE ANALYSIS & BINDING TRACKER

### Critical Files & Dependencies

This section tracks ALL import/export bindings to ensure we don't break existing functionality.

#### **Core Architecture Files**

| File | Exports | Imported By | Sub-Agent Impact |
|------|---------|-------------|------------------|
| `js/main.js` | `window.GDRS` namespace | Entry point | ✅ Add sub-agent modules to namespace |
| `js/core/boot.js` | `boot()` | `main.js` | ⚠️ May need to initialize sub-agent registry |
| `js/control/loop-controller.js` | `LoopController` | `main.js` | ⚠️ Add sub-agent trigger logic |
| `js/reasoning/reasoning-engine.js` | `ReasoningEngine` | `loop-controller.js` | ✅ Will be reused for sub-agents |
| `js/reasoning/context/context-builder.js` | `ReasoningContextBuilder` | `reasoning-engine.js` | ⚠️ Add ExternalKnowledgeProvider |
| `js/config/app-config.js` | `SYSTEM_PROMPT`, limits | `core/constants.js`, `reasoning-engine.js` | ⚠️ Split prompt into base + feature modules so Excel/knowledge guidance is toggle-driven |

#### **Execution Layer Files**

| File | Exports | Imported By | Sub-Agent Impact |
|------|---------|-------------|------------------|
| `js/execution/code-executor.js` | `CodeExecutor` | `execution-runner.js`, `loop-controller.js` | ⚠️ Add sandbox mode flag |
| `js/execution/js-executor.js` | `JSExecutor` | `code-executor.js` | ✅ No changes needed |
| `js/execution/console-capture.js` | `ConsoleCapture` | `js-executor.js` | ⚠️ Add capture buffer for sub-agent |
| `js/execution/execution-runner.js` | `ExecutionRunner` | `code-executor.js` | ✅ No changes needed |
| `js/execution/execution-context-api.js` | `createExecutionContext()` | `code-executor.js` | ⚠️ Add sub-agent isolation mode |

#### **Storage Layer Files**

| File | Exports | Imported By | Sub-Agent Impact |
|------|---------|-------------|------------------|
| `js/storage/storage.js` | `Storage` | Multiple | ⚠️ Add typed helpers + LS keys for `settings_enable_sub_agent`, `settings_enable_excel_helpers`, cache TTL, and last-result payload |
| `js/storage/vault-manager.js` | `VaultManager` | `execution-context-api.js` | ✅ Sub-agents can use vault temporarily |

#### **API Layer Files**

| File | Exports | Imported By | Sub-Agent Impact |
|------|---------|-------------|------------------|
| `js/api/gemini-client.js` | `GeminiAPI` | `reasoning-engine.js` | ✅ Sub-agents will call same API |
| `js/api/key-manager.js` | `KeyManager` | `gemini-client.js` | ✅ No changes needed |

#### **UI Layer Files**

| File | Exports | Imported By | Sub-Agent Impact |
|------|---------|-------------|------------------|
| index.html | Settings markup | Browser | ⚠️ Add feature toggles (Enable Sub-Agent, Enable Excel Helpers) with clear descriptions |
| js/ui/handlers/handler-config.js | indConfigHandlers | ui/events.js | ⚠️ Persist toggle state via new Storage helpers and sync defaults on load |

#### **Reasoning Context Providers**

| File | Exports | Imported By | Sub-Agent Impact |
|------|---------|-------------|------------------|
| `js/reasoning/context/providers/index.js` | All providers | `context-builder.js` | ⚠️ Add ExternalKnowledgeProvider export |
| `js/reasoning/context/providers/attachments-provider.js` | `attachmentsProvider` | `providers/index.js` | ⚠️ Must gate Excel guidance behind `ExcelRuntimeStore.hasWorkbook()` and expose attachment flag |

### New Files to Create

| File Path | Purpose | Dependencies |
|-----------|---------|--------------|
| `js/subagent/sub-agent-orchestrator.js` | Main sub-agent runner | `ReasoningEngine`, `CodeExecutor`, `GeminiAPI` |
| `js/subagent/agents-config.js` | Agent definitions | None (config only) |
| `js/subagent/tools/web-tools.js` | API helper functions | None (pure functions) |
| `js/subagent/context/sub-agent-context-builder.js` | Isolated context | `ReasoningContextBuilder` (extends) |
| `js/reasoning/context/providers/external-knowledge-provider.js` | Inject sub-agent results | `Storage` |
| `js/execution/sandbox-executor.js` | Isolated execution | `CodeExecutor` (extends) |

### Import/Export Binding Safety Checks

**✅ Safe to Import (No Breaking Changes):**
- `ReasoningEngine` - Stateless, can be instantiated for sub-agent
- `ReasoningParser` - Pure functions, safe to reuse
- `GeminiAPI` - Stateless client, safe to call
- `JSExecutor` - Can be instantiated with isolated context
- `VaultManager` - Can use separate namespace for sub-agent

**⚠️ Needs Modification (Add Parameters):**
- `CodeExecutor` - Add `sandboxMode` flag to prevent UI/storage pollution
- `ConsoleCapture` - Add `captureTarget` parameter to isolate logs
- `ExecutionContextAPI` - Add `isolationMode` parameter

**❌ Do NOT Use Directly (Risk of State Pollution):**
- `LoopController` - Manages main session state, create new instance
- `Storage.saveIterationLog()` - Would pollute main session logs
- UI Renderers - Sub-agent operations should not render to UI

### Repository Verification Snapshot (2025-11-10)

| Plan Assumption | Repo Evidence | Status / Action |
|-----------------|---------------|-----------------|
| `LoopController` already wires the sub-agent import/trigger path | `js/control/loop-controller.js:6-24` imports only existing core modules; there is no `_fetchExternalKnowledge` helper or `SubAgentOrchestrator` reference | **Missing** – add the import plus the trigger method where the controller currently initializes sessions |
| `ReasoningContext` already exposes an `externalKnowledge` provider | `js/reasoning/context/providers/index.js:1-47` lists the built-in providers (pendingError, userQuery, attachments, tasks, goals, memory, vaultSummary, recentExecutions, recentReasoning) with no external knowledge slot | **Missing** – create the provider file and register it before the context section can exist |
| Storage already has generic `Storage.save()/load()` entries for sub-agent settings and cache | `js/storage/storage.js:15-212` only exposes typed helpers (e.g., `loadKeypool`, `saveMaxOutputTokens`), and `js/config/storage-config.js:11-58` lists no `gdrs_subagent_*` keys | **Missing** – add dedicated `LS_KEYS.SUB_AGENT_SETTINGS` & `LS_KEYS.SUB_AGENT_RESULT` entries alongside typed helpers (`load/save/clearSubAgent*`) |
| UI already contains an “Enable Sub-Agent” toggle wired through `handler-config` | `js/ui/handlers/handler-config.js:1-35` currently handles only the `#maxOutputTokens` input, and `index.html` contains no element with `id="enableSubAgent"` | **Missing** – create the toggle markup plus handler logic that persists via the new storage helpers |
| `main.js` exports `SubAgentOrchestrator` on `window.GDRS` | `js/main.js:9-70` imports/exports the existing modules only | **Missing** – once the orchestrator exists it must be imported and exposed in the bootstrap |
| `ReasoningEngine` can be reused for sub-agents | `js/reasoning/reasoning-engine.js:1-77` exposes a configurable builder/goal evaluator via `ReasoningEngine.configure` | **Confirmed** – safe to instantiate per agent session as planned |

Additional note: the current `js/` directory only contains `api`, `config`, `control`, `core`, `examples`, `excel`, `execution`, `policy`, `reasoning`, `state`, `storage`, `ui`, `utils`, `validation`, and `verification` (see `Get-ChildItem js`), so every `js/subagent/*` path referenced below is net-new and must be created by this plan.

### Context Pollution Controls (New Requirements)

1. **Excel knowledge gating:** `attachmentsProvider` (`js/reasoning/context/providers/attachments-provider.js:4-310`) injects the full Excel API reference even when `ExcelRuntimeStore.getMetadata()` is `null`. Update the plan so the provider only emits those heavy reference blocks when `ExcelRuntimeStore.hasWorkbook()` is true; otherwise return a single-line reminder to attach a workbook. This keeps Excel guidance out of prompts until it is actionable.
2. **Toggle-driven instructions:** The monolithic `SYSTEM_PROMPT` (`js/config/app-config.js:32-170`) always embeds Excel workflow instructions (and will soon include sub-agent directions) regardless of user settings, while `js/ui/handlers/handler-config.js` currently lacks any `#enableSubAgent` wiring. Add a dedicated instruction composer that takes feature toggles (e.g., `settings_enable_sub_agent`, future `settings_enable_excel_helpers`) plus runtime state (Excel attachment present) and only appends the relevant fragments when required. Wire this composer into `ReasoningEngine.buildContextPrompt()` so enabling knowledge search or Excel helpers explicitly opts-in to their instruction fragments.
3. **Storage-backed toggles:** Extend the storage plan with explicit keys/helpers (e.g., `LS_KEYS.SUB_AGENT_SETTINGS`, `Storage.loadSubAgentSettings()`) so UI toggles, context providers, and the instruction composer share one source of truth. Every feature-specific instruction must check both the persisted toggle and the live session state before being added to the prompt, reducing context pollution.

---

## 🌐 EXTERNAL KNOWLEDGE SOURCES (NO-AUTH APIS)

### 1. Wikipedia (MediaWiki API)

**Purpose:** Encyclopedic articles and summaries for general knowledge

**Endpoints:**
- Search: `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json&origin=*`
- Summary: `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`

**Implementation:**
```javascript
async function wikiSearch(query, limit = 5) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srprop=snippet&format=json&origin=*&srsearch=${encodeURIComponent(query)}&srlimit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia API error: ${res.statusText}`);
  const data = await res.json();
  return data.query.search.map(item => ({
    title: item.title,
    snippet: item.snippet.replace(/<[^>]*>/g, ''), // Strip HTML tags
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
  }));
}

async function wikiSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia summary error: ${res.statusText}`);
  const data = await res.json();
  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls.desktop.page
  };
}
```

**CORS:** ✅ Enabled with `origin=*`
**Rate Limit:** ⚠️ Unofficial limit ~200 req/sec (generous for our use)
**Error Handling:** Returns 404 if page not found, graceful fallback needed

---

### 2. Wikidata (SPARQL Query Service)

**Purpose:** Structured knowledge graph for facts, relationships, properties

**Endpoints:**
- SPARQL: `https://query.wikidata.org/sparql?query={sparql}&format=json`
- Entity Search: `https://www.wikidata.org/w/api.php?action=wbsearchentities&search={query}&format=json`

**Implementation:**
```javascript
async function wikidataQuery(sparql) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/sparql-results+json' }
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL error: ${res.statusText}`);
  return await res.json();
}

async function wikidataSearch(query, limit = 5) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&format=json&limit=${limit}&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikidata search error: ${res.statusText}`);
  const data = await res.json();
  return data.search.map(item => ({
    id: item.id,
    label: item.label,
    description: item.description,
    url: item.concepturi
  }));
}
```

**CORS:** ✅ Enabled
**Rate Limit:** ⚠️ ~60 queries/min recommended
**Use Cases:** Scientific entities, chemical properties, biographical data

---

### 3. DuckDuckGo Instant Answer API

**Purpose:** Quick facts and instant answers

**Endpoint:**
- `https://api.duckduckgo.com/?q={query}&format=json&no_redirect=1&no_html=1`

**Implementation:**
```javascript
async function duckDuckGo(query) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DuckDuckGo API error: ${res.statusText}`);
  const data = await res.json();
  return {
    answer: data.Answer || data.AbstractText || null,
    source: data.AbstractSource || 'DuckDuckGo',
    url: data.AbstractURL || null,
    relatedTopics: data.RelatedTopics.slice(0, 5).map(t => t.Text).filter(Boolean)
  };
}
```

**CORS:** ⚠️ May block browser calls, fallback to server proxy if needed
**Rate Limit:** ✅ No official limit for reasonable use
**Note:** Best for one-line facts, not full web search

---

### 4. arXiv (Scientific Papers)

**Purpose:** Access to research paper metadata and abstracts

**Endpoint:**
- `http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results={limit}`

**Implementation:**
```javascript
async function arxivSearch(query, maxResults = 5) {
  const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`arXiv API error: ${res.statusText}`);
  const text = await res.text();

  // Parse XML using DOMParser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'application/xml');
  const entries = xmlDoc.getElementsByTagName('entry');

  return Array.from(entries).map(entry => ({
    title: entry.getElementsByTagName('title')[0]?.textContent.trim(),
    authors: Array.from(entry.getElementsByTagName('author')).map(a =>
      a.getElementsByTagName('name')[0]?.textContent
    ),
    summary: entry.getElementsByTagName('summary')[0]?.textContent.trim(),
    published: entry.getElementsByTagName('published')[0]?.textContent,
    url: entry.getElementsByTagName('id')[0]?.textContent
  }));
}
```

**CORS:** ✅ Enabled
**Rate Limit:** ✅ No strict limit, ~1 req/sec recommended
**Format:** Atom XML (need DOMParser)

---

### 5. DBpedia (Semantic Web Data)

**Purpose:** Structured data extracted from Wikipedia

**Endpoint:**
- `https://dbpedia.org/sparql?query={sparql}&format=json`

**Implementation:**
```javascript
async function dbpediaQuery(sparql) {
  const url = `https://dbpedia.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/sparql-results+json' }
  });
  if (!res.ok) throw new Error(`DBpedia SPARQL error: ${res.statusText}`);
  return await res.json();
}
```

**CORS:** ⚠️ Public endpoint may block, use Wikidata as fallback
**Rate Limit:** ⚠️ Strict limits, use sparingly
**Note:** Overlaps with Wikidata, prefer Wikidata when possible

---

### 6. Wolfram Alpha Short Answers API

**Purpose:** Math calculations and factual answers

**Endpoint:**
- `http://api.wolframalpha.com/v1/result?i={query}&appid={APPID}`

**Implementation:**
```javascript
async function wolframQuery(query) {
  const APPID = 'DEMO_APPID'; // Replace with actual key (free tier available)
  const url = `http://api.wolframalpha.com/v1/result?i=${encodeURIComponent(query)}&appid=${APPID}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 501) return null; // No short answer available
    throw new Error(`Wolfram Alpha error: ${res.statusText}`);
  }
  return await res.text(); // Plain text answer
}
```

**CORS:** ⚠️ May need proxy
**Auth:** ⚠️ Requires free AppID (sign-up needed)
**Rate Limit:** 2000 queries/month on free tier
**Note:** Use sparingly for exact calculations

---

### 7. Stack Exchange API

**Purpose:** Expert Q&A for technical/scientific questions

**Endpoint:**
- `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q={query}&site={site}`

**Implementation:**
```javascript
async function stackExchangeSearch(query, site = 'stackoverflow', limit = 5) {
  const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=${site}&pagesize=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`StackExchange API error: ${res.statusText}`);
  const data = await res.json();
  return data.items.map(item => ({
    title: item.title,
    isAnswered: item.is_answered,
    score: item.score,
    url: item.link,
    tags: item.tags
  }));
}
```

**CORS:** ✅ Enabled
**Rate Limit:** 300 requests/day (no auth), 10,000/day (with key)
**Sites:** `math`, `physics`, `biology`, `chemistry`, `stackoverflow`

---

### 8. NASA Open APIs (Optional)

**Purpose:** Space and earth science data

**Endpoints:**
- APOD: `https://api.nasa.gov/planetary/apod?api_key={KEY}`
- NeoWs: `https://api.nasa.gov/neo/rest/v1/feed?api_key={KEY}`

**Implementation:**
```javascript
async function nasaAPOD() {
  const API_KEY = 'DEMO_KEY'; // Replace with actual key (free)
  const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA API error: ${res.statusText}`);
  return await res.json();
}
```

**CORS:** ✅ Enabled
**Auth:** Free API key (instant)
**Note:** Domain-specific, add as extension if needed

---

### API Helper Library Structure

**File:** `js/subagent/tools/web-tools.js`

```javascript
/**
 * Web Tools Library for Sub-Agent System
 * Centralized API helper functions for external knowledge retrieval
 */

// Wikipedia
export { wikiSearch, wikiSummary } from './apis/wikipedia.js';

// Wikidata
export { wikidataQuery, wikidataSearch } from './apis/wikidata.js';

// DuckDuckGo
export { duckDuckGo } from './apis/duckduckgo.js';

// arXiv
export { arxivSearch } from './apis/arxiv.js';

// DBpedia
export { dbpediaQuery } from './apis/dbpedia.js';

// Wolfram Alpha
export { wolframQuery } from './apis/wolfram.js';

// Stack Exchange
export { stackExchangeSearch } from './apis/stackexchange.js';

// NASA (optional)
export { nasaAPOD } from './apis/nasa.js';
```

**Sub-modules in:** `js/subagent/tools/apis/`
- `wikipedia.js`
- `wikidata.js`
- `duckduckgo.js`
- `arxiv.js`
- `dbpedia.js`
- `wolfram.js`
- `stackexchange.js`
- `nasa.js`

---

## 🧩 SUB-AGENT FRAMEWORK DESIGN

### 1. Agent Configuration Schema

**File:** `js/subagent/agents-config.js`

```javascript
/**
 * Sub-Agent Configuration
 * Define all available sub-agents here
 */

export const SUB_AGENTS = {

  // General web knowledge retrieval agent
  webKnowledge: {
    id: 'webKnowledge',
    name: 'Web Knowledge Agent',
    description: 'Retrieves general knowledge from Wikipedia, Wikidata, DuckDuckGo',

    systemPrompt: `You are a web knowledge retrieval agent with access to Wikipedia, Wikidata, and DuckDuckGo APIs.

YOUR ROLE:
- Gather factual information from reliable web sources
- Provide structured, cited summaries
- Use multiple sources to verify facts

AVAILABLE TOOLS (call via <js_execute>):
- wikiSearch(query) - Search Wikipedia articles
- wikiSummary(title) - Get Wikipedia page summary
- wikidataQuery(sparql) - Query Wikidata knowledge graph
- wikidataSearch(query) - Search Wikidata entities
- duckDuckGo(query) - Get instant answers

WORKFLOW:
1. Understand the user's query
2. Determine which sources are most relevant
3. Execute searches using available tools
4. Synthesize information from multiple sources
5. Output a structured summary with citations

OUTPUT FORMAT:
Provide your final answer as a bullet list of facts:
- **Fact 1**: [Description] (Source: Wikipedia/Wikidata/DuckDuckGo)
- **Fact 2**: [Description] (Source: ...)

CRITICAL RULES:
- Always cite sources
- Verify information across multiple sources when possible
- Use <js_execute> blocks to call tools
- Store large results in vault if needed
- Be concise but comprehensive`,

    allowedTools: [
      'wikiSearch',
      'wikiSummary',
      'wikidataQuery',
      'wikidataSearch',
      'duckDuckGo',
      'vault.set',
      'vault.get',
      'console.log'
    ],

    maxIterations: 3,
    outputFormat: 'markdown-bullets'
  },

  // Scientific research agent
  scienceResearch: {
    id: 'scienceResearch',
    name: 'Scientific Research Agent',
    description: 'Searches academic papers and scientific databases',

    systemPrompt: `You are a scientific research agent with access to arXiv, Wikidata, and Stack Exchange.

YOUR ROLE:
- Find relevant scientific papers and research
- Extract key findings and methodologies
- Provide academic citations

AVAILABLE TOOLS:
- arxivSearch(query) - Search arXiv papers
- wikidataQuery(sparql) - Query scientific entities
- stackExchangeSearch(query, site) - Search Stack Exchange (math, physics, etc.)

WORKFLOW:
1. Analyze the scientific query
2. Search arXiv for relevant papers
3. Use Wikidata for scientific facts/entities
4. Check Stack Exchange for expert discussions
5. Synthesize findings with proper citations

OUTPUT FORMAT:
**Research Findings:**
- **Paper 1**: [Title] by [Authors] ([Year])
  - Summary: [Key findings]
  - URL: [arXiv link]
- **Fact**: [Scientific fact] (Source: Wikidata)
- **Discussion**: [Expert answer] (Source: Stack Exchange)`,

    allowedTools: [
      'arxivSearch',
      'wikidataQuery',
      'stackExchangeSearch',
      'vault.set',
      'console.log'
    ],

    maxIterations: 4,
    outputFormat: 'markdown-structured'
  },

  // Math calculation agent
  mathExpert: {
    id: 'mathExpert',
    name: 'Math Expert Agent',
    description: 'Solves math problems using Wolfram Alpha and Stack Exchange',

    systemPrompt: `You are a math expert agent with computational capabilities.

YOUR ROLE:
- Solve mathematical problems
- Provide step-by-step solutions
- Use external computation when needed

AVAILABLE TOOLS:
- wolframQuery(query) - Get exact answers from Wolfram Alpha
- stackExchangeSearch(query, 'math') - Find expert solutions

WORKFLOW:
1. Parse the math problem
2. Attempt solution using JavaScript if simple
3. Use wolframQuery for complex calculations
4. Search Math Stack Exchange for similar problems
5. Provide clear, step-by-step answer

OUTPUT FORMAT:
**Solution:**
1. Problem: [Restate problem]
2. Approach: [Method used]
3. Steps: [Step-by-step solution]
4. Answer: **[Final answer]**
5. Source: [Computation/Stack Exchange/Manual]`,

    allowedTools: [
      'wolframQuery',
      'stackExchangeSearch',
      'vault.set',
      'console.log',
      'Math.*' // Allow JavaScript Math object
    ],

    maxIterations: 3,
    outputFormat: 'markdown-structured'
  }

};

export const DEFAULT_AGENT = 'webKnowledge';
```

---

### 2. Sub-Agent Orchestrator

**File:** `js/subagent/sub-agent-orchestrator.js`

```javascript
/**
 * Sub-Agent Orchestrator
 * Manages sub-agent lifecycle and execution
 */

import { SUB_AGENTS, DEFAULT_AGENT } from './agents-config.js';
import { ReasoningEngine } from '../reasoning/reasoning-engine.js';
import { ReasoningParser } from '../reasoning/reasoning-parser.js';
import { GeminiAPI } from '../api/gemini-client.js';
import { SandboxExecutor } from '../execution/sandbox-executor.js';
import { Storage } from '../storage/storage.js';
import * as WebTools from './tools/web-tools.js';

export class SubAgentOrchestrator {

  /**
   * Run a sub-agent with a given query
   * @param {string} agentId - Agent identifier from SUB_AGENTS
   * @param {string} query - User query to process
   * @param {object} options - Additional options
   * @returns {Promise<object>} Structured result from sub-agent
   */
  static async runSubAgent(agentId = DEFAULT_AGENT, query, options = {}) {
    const agent = SUB_AGENTS[agentId];
    if (!agent) {
      throw new Error(`Sub-agent '${agentId}' not found`);
    }

    console.log(`🤖 [Sub-Agent] Starting ${agent.name}...`);
    console.log(`📝 [Sub-Agent] Query: ${query}`);

    // Create isolated context
    const context = this._createIsolatedContext(agent);

    // Build initial prompt
    const initialPrompt = this._buildInitialPrompt(agent, query);

    // Reasoning loop
    let iteration = 0;
    let conversationHistory = [
      { role: 'user', content: initialPrompt }
    ];
    let finalResult = null;

    while (iteration < agent.maxIterations) {
      iteration++;
      console.log(`🔄 [Sub-Agent] Iteration ${iteration}/${agent.maxIterations}`);

      // Call LLM
      const response = await this._callLLM(conversationHistory);
      console.log(`💬 [Sub-Agent] LLM Response received`);

      // Parse operations
      const operations = ReasoningParser.parseOperations(response);

      // Check for final output
      const finalOp = operations.find(op => op.type === 'finalOutput');
      if (finalOp) {
        finalResult = {
          content: finalOp.content,
          format: agent.outputFormat,
          source: agent.name,
          iterations: iteration
        };
        console.log(`✅ [Sub-Agent] Final output received`);
        break;
      }

      // Execute code operations
      const codeOps = operations.filter(op => op.type === 'jsExecute');
      let executionOutput = '';

      for (const codeOp of codeOps) {
        const result = await this._executeInSandbox(codeOp.code, context);
        executionOutput += this._formatExecutionResult(result);
      }

      // If no operations and no final output, treat response as final
      if (operations.length === 0) {
        finalResult = {
          content: response,
          format: agent.outputFormat,
          source: agent.name,
          iterations: iteration
        };
        console.log(`✅ [Sub-Agent] Implicit final output`);
        break;
      }

      // Add to conversation history
      conversationHistory.push({ role: 'assistant', content: response });

      if (executionOutput) {
        conversationHistory.push({
          role: 'user',
          content: `**Tool Execution Results:**\n\n${executionOutput}\n\nContinue reasoning or provide final output.`
        });
      }
    }

    if (!finalResult) {
      console.warn(`⚠️ [Sub-Agent] Max iterations reached without final output`);
      finalResult = {
        content: 'Sub-agent exceeded maximum iterations without producing final answer.',
        format: 'error',
        source: agent.name,
        iterations: iteration
      };
    }

    // Cleanup isolated context
    this._cleanupContext(context);

    console.log(`🏁 [Sub-Agent] Completed in ${iteration} iterations`);
    return finalResult;
  }

  /**
   * Create isolated execution context for sub-agent
   */
  static _createIsolatedContext(agent) {
    const context = {
      vault: new Map(), // Isolated vault
      memory: new Map(), // Isolated memory
      executionLog: [], // Isolated logs
      agentId: agent.id
    };

    // Attach allowed tools to context
    for (const tool of agent.allowedTools) {
      if (tool.startsWith('vault.')) {
        // Provide vault methods bound to isolated storage
        const method = tool.split('.')[1];
        context[`vault_${method}`] = (...args) => {
          if (method === 'set') {
            context.vault.set(args[0], args[1]);
            return true;
          } else if (method === 'get') {
            return context.vault.get(args[0]);
          }
        };
      } else if (WebTools[tool]) {
        // Attach web tool functions
        context[tool] = WebTools[tool];
      }
    }

    return context;
  }

  /**
   * Build initial prompt for sub-agent
   */
  static _buildInitialPrompt(agent, query) {
    return `${agent.systemPrompt}

---

**USER QUERY:**
${query}

**YOUR TASK:**
Process this query using your available tools. Execute searches, gather information, and provide a final structured answer following your output format.

Remember to use <js_execute> blocks to call tools and <final_output> tag for your answer.`;
  }

  /**
   * Call LLM API
   */
  static async _callLLM(conversationHistory) {
    // Convert conversation history to single prompt
    // (Gemini API supports multi-turn, but for simplicity we'll concatenate)
    const prompt = conversationHistory
      .map(msg => `**${msg.role.toUpperCase()}:**\n${msg.content}`)
      .join('\n\n---\n\n');

    const response = await GeminiAPI.generateResponse(prompt);
    return response;
  }

  /**
   * Execute code in sandbox
   */
  static async _executeInSandbox(code, context) {
    try {
      // Create sandbox executor
      const executor = new SandboxExecutor(context);
      const result = await executor.execute(code);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Format execution result for LLM
   */
  static _formatExecutionResult(result) {
    if (result.success) {
      let output = '';
      if (result.consoleOutput) {
        output += `**Console Output:**\n\`\`\`\n${result.consoleOutput}\n\`\`\`\n\n`;
      }
      if (result.returnValue !== undefined) {
        output += `**Return Value:**\n\`\`\`\n${JSON.stringify(result.returnValue, null, 2)}\n\`\`\`\n\n`;
      }
      return output || '(No output)';
    } else {
      return `**Error:**\n\`\`\`\n${result.error}\n\`\`\`\n\n`;
    }
  }

  /**
   * Cleanup isolated context
   */
  static _cleanupContext(context) {
    // Clear isolated storage
    context.vault.clear();
    context.memory.clear();
    context.executionLog = [];
  }

}
```

---

### 3. Sandbox Executor

**File:** `js/execution/sandbox-executor.js`

```javascript
/**
 * Sandbox Executor
 * Isolated code execution environment for sub-agents
 * Does NOT pollute main session state or UI
 */

import { JSExecutor } from './js-executor.js';

export class SandboxExecutor {

  constructor(isolatedContext = {}) {
    this.context = isolatedContext;
    this.consoleBuffer = [];
  }

  /**
   * Execute code in sandbox
   */
  async execute(code) {
    // Capture console output
    this.consoleBuffer = [];
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };

    // Override console to capture output
    console.log = (...args) => {
      this.consoleBuffer.push(['log', args.map(String).join(' ')]);
    };
    console.warn = (...args) => {
      this.consoleBuffer.push(['warn', args.map(String).join(' ')]);
    };
    console.error = (...args) => {
      this.consoleBuffer.push(['error', args.map(String).join(' ')]);
    };

    try {
      // Build execution context with isolated scope
      const contextKeys = Object.keys(this.context);
      const contextValues = contextKeys.map(key => this.context[key]);

      // Create function with isolated context
      const fn = new Function(...contextKeys, code);

      // Execute
      const returnValue = await fn(...contextValues);

      // Restore console
      Object.assign(console, originalConsole);

      return {
        success: true,
        returnValue,
        consoleOutput: this.consoleBuffer.map(([type, msg]) => msg).join('\n')
      };

    } catch (error) {
      // Restore console
      Object.assign(console, originalConsole);

      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

}
```

---

### 4. External Knowledge Provider

**File:** `js/reasoning/context/providers/external-knowledge-provider.js`

```javascript
/**
 * External Knowledge Provider
 * Injects sub-agent results into main reasoning context
 */

import { Storage } from '../../../storage/storage.js';

export const externalKnowledgeProvider = {
  id: 'externalKnowledge',
  priority: 50, // After attachments, before tasks

  collect() {
    // Retrieve cached sub-agent results
    const result = Storage.load('subagent_last_result');

    if (!result) {
      return null; // No external knowledge available
    }

    return {
      source: result.source,
      content: result.content,
      iterations: result.iterations
    };
  },

  build(data) {
    if (!data) return '';

    return `## EXTERNAL KNOWLEDGE

The following information was retrieved by the ${data.source}:

${data.content}

*Retrieved in ${data.iterations} iteration(s). Use this information to inform your analysis.*`;
  }
};
```

**Update:** `js/reasoning/context/providers/index.js`

```javascript
// Add to exports
export { externalKnowledgeProvider } from './external-knowledge-provider.js';
```

---

### 5. Integration into Main Loop

**File:** `js/control/loop-controller.js` (Modified)

```javascript
// Add import at top
import { SubAgentOrchestrator } from '../subagent/sub-agent-orchestrator.js';
import { Storage } from '../storage/storage.js';

// In LoopController class, add method:

/**
 * Optionally trigger sub-agent for external knowledge retrieval
 */
async _fetchExternalKnowledge(userQuery) {
  // Check if feature is enabled
  const enableSubAgent = Storage.load('settings_enable_sub_agent') || false;

  if (!enableSubAgent) {
    return; // Feature disabled
  }

  console.log('🔍 Checking if sub-agent should be triggered...');

  // Simple heuristic: trigger if query contains question words or "latest"
  const triggers = ['what', 'who', 'where', 'when', 'why', 'how', 'latest', 'recent', 'current'];
  const shouldTrigger = triggers.some(trigger =>
    userQuery.toLowerCase().includes(trigger)
  );

  if (!shouldTrigger) {
    console.log('⏭️ Sub-agent not needed for this query');
    return;
  }

  console.log('🚀 Triggering sub-agent for external knowledge...');

  try {
    const result = await SubAgentOrchestrator.runSubAgent('webKnowledge', userQuery);

    // Cache result for context provider
    Storage.save('subagent_last_result', result);

    console.log('✅ External knowledge retrieved and cached');
  } catch (error) {
    console.error('❌ Sub-agent error:', error);
    // Continue without external knowledge
  }
}

// In startReasoning method, before main loop:
async startReasoning(userQuery, options = {}) {
  // ... existing validation ...

  // NEW: Fetch external knowledge if enabled
  await this._fetchExternalKnowledge(userQuery);

  // ... continue with main reasoning loop ...
}
```

---

## 📁 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1)

**Goal:** Set up core infrastructure without breaking existing functionality

**Tasks:**
1. ✅ Create directory structure
   - `js/subagent/`
   - `js/subagent/tools/`
   - `js/subagent/tools/apis/`

2. ✅ Implement API helper functions
   - `js/subagent/tools/apis/wikipedia.js`
   - `js/subagent/tools/apis/wikidata.js`
   - `js/subagent/tools/apis/arxiv.js`
   - (All 8 APIs from section above)
   - `js/subagent/tools/web-tools.js` (index)

3. ✅ Test API helpers in isolation
   - Create test HTML page
   - Verify all APIs work with CORS
   - Test error handling

**Deliverables:**
- Fully functional web tools library
- Unit tests for each API
- Documentation for each helper function

**Risk:** Low (isolated from main codebase)

---

### Phase 2: Sandbox Executor (Week 2)

**Goal:** Create isolated execution environment

**Tasks:**
1. ✅ Implement SandboxExecutor
   - `js/execution/sandbox-executor.js`
   - Console capture
   - Context isolation
   - Error handling

2. ✅ Test sandbox isolation
   - Verify no global state pollution
   - Test with web tools attached
   - Test error recovery

3. ✅ Integration test with CodeExecutor
   - Ensure no conflicts
   - Verify both can coexist

**Deliverables:**
- Working sandbox executor
- Isolation tests passing
- Documentation

**Risk:** Medium (touches execution layer, thorough testing needed)

---

### Phase 3: Sub-Agent Configuration (Week 2)

**Goal:** Define agent schemas and orchestrator

**Tasks:**
1. ✅ Create agents-config.js
   - Define webKnowledge agent
   - Define scienceResearch agent
   - Define mathExpert agent
   - Document schema

2. ✅ Implement SubAgentOrchestrator
   - `js/subagent/sub-agent-orchestrator.js`
   - Context creation
   - Reasoning loop
   - Result formatting

3. ✅ Test orchestrator in isolation
   - Mock LLM calls
   - Test iteration limits
   - Test tool execution

**Deliverables:**
- Agent configuration file
- Working orchestrator
- Integration tests

**Risk:** Medium (complex logic, needs careful testing)

---

### Phase 4: Context Integration (Week 3)

**Goal:** Integrate sub-agent results into main context

**Tasks:**
1. ✅ Create ExternalKnowledgeProvider
   - `js/reasoning/context/providers/external-knowledge-provider.js`
   - Storage integration
   - Formatting

2. ✅ Update providers index
   - Export new provider
   - Register in context builder

3. ✅ Update ReasoningContextBuilder
   - Add external knowledge section
   - Configure priority

4. ✅ Test context injection
   - Verify section appears in prompt
   - Test with/without sub-agent results

5. ✅ Add Excel context gating
   - Update `attachmentsProvider` so the detailed Excel API reference and exploration guide emit only when `ExcelRuntimeStore.hasWorkbook()` is true
   - Return a lightweight “no attachment detected” status otherwise
   - Expose an `hasExcelAttachment` flag to the instruction composer so Excel-specific guidance is appended only when actionable

**Deliverables:**
- Context provider implemented
- Main prompt includes external knowledge
- Tests passing

**Risk:** Low (additive change, easy to rollback)

---

### Phase 5: Main Loop Integration (Week 3)

**Goal:** Trigger sub-agent from main reasoning loop

**Tasks:**
1. ✅ Modify LoopController
   - Add _fetchExternalKnowledge method
   - Add trigger heuristic
   - Add settings check

2. ✅ Add UI toggle
   - Settings section
   - Enable/disable sub-agent
   - Save to storage

3. ✅ End-to-end testing
   - Test full flow with real queries
   - Verify no breaking changes
   - Performance testing

4. ✅ Build instruction composer
   - Create `js/config/prompt-instruction-modules.js` with `SYSTEM_PROMPT_BASE` plus feature fragments (Excel attachment, sub-agent knowledge search, future modules)
   - Add `buildSystemInstructions({ hasExcelAttachment, enableKnowledgeSearch })` helper that pulls from Storage + runtime state
   - Ensure fragments only append when the corresponding toggle/state is true

5. ✅ Update ReasoningEngine
   - Inject the instruction composer so `ReasoningEngine.buildContextPrompt()` passes dynamic instructions instead of the static `SYSTEM_PROMPT`
   - Thread the `hasExcelAttachment` flag from `attachmentsProvider` (via storage or context snapshot) and `settings_enable_sub_agent` from Storage into the composer
   - Add unit tests that verify instructions expand/omit fragments based on toggles

**Deliverables:**
- Fully integrated sub-agent system
- UI controls
- E2E tests passing

**Risk:** Medium (modifies critical path, needs extensive testing)

---

### Phase 6: Polish & Documentation (Week 4)

**Goal:** Finalize, optimize, document

**Tasks:**
1. ✅ Performance optimization
   - Caching strategy
   - Rate limiting
   - Timeout handling

2. ✅ Error handling
   - Graceful degradation
   - User-friendly messages
   - Logging

3. ✅ Documentation
   - User guide
   - Developer guide
   - API reference
   - Examples

4. ✅ UI improvements
   - Sub-agent status indicator
   - Show external knowledge in UI
   - Loading states

**Deliverables:**
- Production-ready system
- Complete documentation
- User guide

**Risk:** Low (polish phase)

---

## 📝 FILE-BY-FILE CHANGES

### New Files to Create

#### 1. `js/subagent/tools/apis/wikipedia.js`
```javascript
/**
 * Wikipedia API Helper Functions
 */

export async function wikiSearch(query, limit = 5) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srprop=snippet&format=json&origin=*&srsearch=${encodeURIComponent(query)}&srlimit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia API error: ${res.statusText}`);
  const data = await res.json();
  return data.query.search.map(item => ({
    title: item.title,
    snippet: item.snippet.replace(/<[^>]*>/g, ''),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
  }));
}

export async function wikiSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikipedia summary error: ${res.statusText}`);
  const data = await res.json();
  return {
    title: data.title,
    extract: data.extract,
    url: data.content_urls.desktop.page
  };
}
```

#### 2. `js/subagent/tools/apis/wikidata.js`
```javascript
/**
 * Wikidata API Helper Functions
 */

export async function wikidataQuery(sparql) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/sparql-results+json' }
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL error: ${res.statusText}`);
  return await res.json();
}

export async function wikidataSearch(query, limit = 5) {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&format=json&limit=${limit}&origin=*`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wikidata search error: ${res.statusText}`);
  const data = await res.json();
  return data.search.map(item => ({
    id: item.id,
    label: item.label,
    description: item.description,
    url: item.concepturi
  }));
}
```

#### 3-8. Similar files for other APIs (arXiv, DuckDuckGo, DBpedia, Wolfram, Stack Exchange, NASA)

#### 9. `js/subagent/tools/web-tools.js`
```javascript
/**
 * Web Tools Library - Main Export
 */

export { wikiSearch, wikiSummary } from './apis/wikipedia.js';
export { wikidataQuery, wikidataSearch } from './apis/wikidata.js';
export { duckDuckGo } from './apis/duckduckgo.js';
export { arxivSearch } from './apis/arxiv.js';
export { dbpediaQuery } from './apis/dbpedia.js';
export { wolframQuery } from './apis/wolfram.js';
export { stackExchangeSearch } from './apis/stackexchange.js';
export { nasaAPOD } from './apis/nasa.js';
```

#### 10. `js/execution/sandbox-executor.js`
*(Full implementation in Section 3 above)*

#### 11. `js/subagent/agents-config.js`
*(Full implementation in Section 1 above)*

#### 12. `js/subagent/sub-agent-orchestrator.js`
*(Full implementation in Section 2 above)*

#### 13. `js/reasoning/context/providers/external-knowledge-provider.js`
*(Full implementation in Section 4 above)*

#### 14. `js/config/prompt-instruction-modules.js`
```javascript
/**
 * Dynamic instruction composer
 * - Export SYSTEM_PROMPT_BASE (no feature-specific guidance)
 * - Export FEATURE_INSTRUCTION_MODULES keyed by toggle name
 * - Export buildSystemInstructions(state) that concatenates BASE + enabled fragments
 */
export const SYSTEM_PROMPT_BASE = `...core reasoning guarantees...`;

export const FEATURE_INSTRUCTION_MODULES = {
  excelAttachment: {
    toggleKey: 'settings_enable_excel_helpers',
    requiresAttachment: true,
    instructions: `### Excel Attachment Protocol\n...`
  },
  subAgentKnowledge: {
    toggleKey: 'settings_enable_sub_agent',
    instructions: `### External Knowledge Retrieval\n...`
  }
};

export function buildSystemInstructions(state) {
  const segments = [SYSTEM_PROMPT_BASE.trim()];
  for (const module of Object.values(FEATURE_INSTRUCTION_MODULES)) {
    if (state[module.toggleKey] !== true) continue;
    if (module.requiresAttachment && !state.hasExcelAttachment) continue;
    segments.push(module.instructions.trim());
  }
  return segments.join('\n\n');
}
```

---

### Files to Modify

#### 1. `js/reasoning/context/providers/index.js`

**Before:**
```javascript
export { attachmentsProvider } from './attachments-provider.js';
export { tasksProvider } from './tasks-provider.js';
// ... other providers
```

**After:**
```javascript
export { attachmentsProvider } from './attachments-provider.js';
export { tasksProvider } from './tasks-provider.js';
// ... other providers
export { externalKnowledgeProvider } from './external-knowledge-provider.js'; // NEW
```

---

#### 2. `js/control/loop-controller.js`

**Add imports:**
```javascript
import { SubAgentOrchestrator } from '../subagent/sub-agent-orchestrator.js';
```

**Add method:** (See Section 5 above for full implementation)

**Modify startReasoning:**
```javascript
async startReasoning(userQuery, options = {}) {
  // ... existing validation ...

  // NEW: Fetch external knowledge if enabled
  await this._fetchExternalKnowledge(userQuery);

  // ... continue with main reasoning loop ...
}
```

---

#### 3. `js/main.js`

**Add imports:**
```javascript
import { SubAgentOrchestrator } from './subagent/sub-agent-orchestrator.js';
import { SUB_AGENTS } from './subagent/agents-config.js';
```

**Add to window.GDRS namespace:**
```javascript
window.GDRS = {
  // ... existing exports ...

  // Sub-agent system (new!)
  SubAgentOrchestrator,
  SUB_AGENTS,
};
```

---

#### 4. `index.html` (Optional UI Toggle)

**Add to Settings section:**
```html
<section class="block">
  <header class="block-header">
    <h2>Advanced Features</h2>
  </header>
  <div class="block-body">
    <label class="checkbox-label">
      <input type="checkbox" id="enableSubAgent">
      <span>Enable Sub-Agent (External Knowledge)</span>
    </label>
    <p class="help-text">
      Automatically fetch information from Wikipedia, arXiv, and other sources
    </p>
  </div>
</section>
```

**Add handler in** `js/ui/handlers/handler-config.js`:
```javascript
document.getElementById('enableSubAgent')?.addEventListener('change', (e) => {
  Storage.save('settings_enable_sub_agent', e.target.checked);
});
```

---

## 🔗 INTEGRATION POINTS

### 1. Context Provider Registration

**File:** `js/reasoning/context/context-builder.js`

Ensure the new `externalKnowledgeProvider` is registered in the context sections:

```javascript
const CONTEXT_SECTIONS = [
  // ... existing sections ...
  {
    id: 'externalKnowledge',
    providerId: 'externalKnowledge',
    priority: 50,
    includeWhenEmpty: false
  },
  // ... rest of sections ...
];
```

---

### 2. Storage Keys

**New storage keys required (none exist today per `js/storage/storage.js` + `js/config/storage-config.js`):**
- `settings_enable_sub_agent` - Boolean toggle for external knowledge
- `settings_enable_excel_helpers` - Boolean toggle for Excel-specific instruction blocks
- `settings_sub_agent_default` - Default agent id
- `settings_sub_agent_timeout` - Timeout in ms
- `settings_sub_agent_cache_ttl` - Cache TTL in ms
- `subagent_last_result` - Cached sub-agent payload (content, format, iterations)

Add typed `Storage.load/save/clear*` helpers for each key so UI, orchestrator, and context providers share consistent behavior.

---

### 3. Event Bus Integration (Optional)

**File:** `js/core/event-bus.js`

Add new events for sub-agent lifecycle:

```javascript
export const Events = {
  // ... existing events ...

  // Sub-agent events
  SUBAGENT_STARTED: 'subagent:started',
  SUBAGENT_ITERATION: 'subagent:iteration',
  SUBAGENT_COMPLETED: 'subagent:completed',
  SUBAGENT_ERROR: 'subagent:error'
};
```

Emit events from `SubAgentOrchestrator`:

```javascript
// In runSubAgent method
eventBus.emit(Events.SUBAGENT_STARTED, { agentId, query });
// ... during loop
eventBus.emit(Events.SUBAGENT_ITERATION, { iteration });
// ... on completion
eventBus.emit(Events.SUBAGENT_COMPLETED, { result });
```

---

### 4. UI Rendering (Optional Enhancement)

**File:** `js/ui/renderer/renderer-reasoning.js`

Add visual indicator when external knowledge is present:

```javascript
function renderExternalKnowledge(data) {
  if (!data) return '';

  return `
    <div class="external-knowledge-block">
      <div class="block-header">
        <span class="icon">🌐</span>
        <h3>External Knowledge</h3>
        <span class="badge">${data.source}</span>
      </div>
      <div class="block-body">
        ${marked.parse(data.content)}
      </div>
      <div class="block-footer">
        Retrieved in ${data.iterations} iteration(s)
      </div>
    </div>
  `;
}
```

---

## 🧪 TESTING STRATEGY

### Unit Tests

**1. API Helper Functions**
```javascript
// Test file: tests/subagent/apis/wikipedia.test.js

describe('Wikipedia API', () => {

  test('wikiSearch returns results', async () => {
    const results = await wikiSearch('quantum mechanics');
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('snippet');
    expect(results[0]).toHaveProperty('url');
  });

  test('wikiSummary returns page summary', async () => {
    const summary = await wikiSummary('Albert Einstein');
    expect(summary).toHaveProperty('title');
    expect(summary).toHaveProperty('extract');
    expect(summary.title).toBe('Albert Einstein');
  });

  test('handles errors gracefully', async () => {
    await expect(wikiSummary('ThisPageDoesNotExist12345')).rejects.toThrow();
  });

});
```

**Similar tests for all 8 APIs**

---

**2. Sandbox Executor**
```javascript
// Test file: tests/execution/sandbox-executor.test.js

describe('SandboxExecutor', () => {

  test('executes code in isolation', async () => {
    const sandbox = new SandboxExecutor();
    const result = await sandbox.execute('return 2 + 2;');
    expect(result.success).toBe(true);
    expect(result.returnValue).toBe(4);
  });

  test('captures console output', async () => {
    const sandbox = new SandboxExecutor();
    const result = await sandbox.execute('console.log("test");');
    expect(result.consoleOutput).toContain('test');
  });

  test('provides isolated context', async () => {
    const context = { myVar: 42 };
    const sandbox = new SandboxExecutor(context);
    const result = await sandbox.execute('return myVar * 2;');
    expect(result.returnValue).toBe(84);
  });

  test('handles errors', async () => {
    const sandbox = new SandboxExecutor();
    const result = await sandbox.execute('throw new Error("test error");');
    expect(result.success).toBe(false);
    expect(result.error).toContain('test error');
  });

  test('does not pollute global scope', async () => {
    const originalConsole = console.log;
    const sandbox = new SandboxExecutor();
    await sandbox.execute('console.log("test");');
    expect(console.log).toBe(originalConsole);
  });

});
```

---

**3. Sub-Agent Orchestrator**
```javascript
// Test file: tests/subagent/orchestrator.test.js

describe('SubAgentOrchestrator', () => {

  test('creates isolated context', () => {
    const agent = SUB_AGENTS.webKnowledge;
    const context = SubAgentOrchestrator._createIsolatedContext(agent);
    expect(context).toHaveProperty('vault');
    expect(context).toHaveProperty('memory');
    expect(context.vault).toBeInstanceOf(Map);
  });

  test('builds initial prompt correctly', () => {
    const agent = SUB_AGENTS.webKnowledge;
    const prompt = SubAgentOrchestrator._buildInitialPrompt(agent, 'test query');
    expect(prompt).toContain(agent.systemPrompt);
    expect(prompt).toContain('test query');
  });

  test('respects max iterations', async () => {
    // Mock LLM to return non-final responses
    jest.spyOn(GeminiAPI, 'generateResponse').mockResolvedValue('Thinking...');

    const result = await SubAgentOrchestrator.runSubAgent('webKnowledge', 'test');
    expect(result.iterations).toBe(SUB_AGENTS.webKnowledge.maxIterations);
  });

  test('returns final output when provided', async () => {
    jest.spyOn(GeminiAPI, 'generateResponse').mockResolvedValue(
      '<final_output>Test answer</final_output>'
    );

    const result = await SubAgentOrchestrator.runSubAgent('webKnowledge', 'test');
    expect(result.content).toContain('Test answer');
    expect(result.iterations).toBe(1);
  });

});
```

---

### Integration Tests

**1. Sub-Agent + Web Tools**
```javascript
describe('Sub-Agent with Web Tools', () => {

  test('can search Wikipedia', async () => {
    const query = 'What is quantum entanglement?';
    const result = await SubAgentOrchestrator.runSubAgent('webKnowledge', query);

    expect(result.success).toBe(true);
    expect(result.content).toBeTruthy();
    expect(result.content.toLowerCase()).toContain('entanglement');
  });

  test('can search arXiv papers', async () => {
    const query = 'Recent papers on neural networks';
    const result = await SubAgentOrchestrator.runSubAgent('scienceResearch', query);

    expect(result.content).toContain('arXiv');
  });

});
```

---

**2. Context Provider Integration**
```javascript
describe('External Knowledge Provider', () => {

  beforeEach(() => {
    Storage.clear('subagent_last_result');
  });

  test('returns null when no data', () => {
    const data = externalKnowledgeProvider.collect();
    expect(data).toBeNull();
  });

  test('collects cached result', () => {
    const mockResult = {
      source: 'Web Knowledge Agent',
      content: 'Test content',
      iterations: 2
    };
    Storage.save('subagent_last_result', mockResult);

    const data = externalKnowledgeProvider.collect();
    expect(data).toEqual(mockResult);
  });

  test('builds formatted section', () => {
    const data = {
      source: 'Test Agent',
      content: '- Fact 1\n- Fact 2',
      iterations: 1
    };

    const section = externalKnowledgeProvider.build(data);
    expect(section).toContain('EXTERNAL KNOWLEDGE');
    expect(section).toContain('Test Agent');
    expect(section).toContain('Fact 1');
  });

});
```

---

**3. End-to-End Flow**
```javascript
describe('E2E: Sub-Agent in Main Loop', () => {

  test('full flow with external knowledge', async () => {
    // Enable sub-agent
    Storage.save('settings_enable_sub_agent', true);

    // Start reasoning with query that should trigger sub-agent
    const controller = new LoopController();
    const query = 'What are the latest discoveries in quantum computing?';

    await controller.startReasoning(query);

    // Verify external knowledge was fetched
    const result = Storage.load('subagent_last_result');
    expect(result).toBeTruthy();
    expect(result.content).toBeTruthy();

    // Verify it appears in context
    const context = await controller._buildContext();
    expect(context).toContain('EXTERNAL KNOWLEDGE');
  });

  test('skips sub-agent when disabled', async () => {
    Storage.save('settings_enable_sub_agent', false);

    const controller = new LoopController();
    await controller.startReasoning('test query');

    const result = Storage.load('subagent_last_result');
    expect(result).toBeFalsy();
  });

});
```

---

### Manual Testing Checklist

- [ ] Wikipedia search returns accurate results
- [ ] Wikidata SPARQL queries work correctly
- [ ] arXiv search returns relevant papers
- [ ] Sandbox executor isolates execution
- [ ] Sub-agent completes within max iterations
- [ ] External knowledge appears in main context
- [ ] Main loop continues normally with/without sub-agent
- [ ] UI toggle enables/disables feature
- [ ] No errors in console during full flow
- [ ] Performance is acceptable (<5s for sub-agent)
- [ ] Error handling works (API failures, timeouts)
- [ ] No state pollution between sub-agent and main session

---

## ⚠️ RISK ANALYSIS & MITIGATION

### High-Risk Areas

#### 1. **Execution Isolation**

**Risk:** Sub-agent execution pollutes main session state

**Impact:** Critical - Could corrupt main reasoning loop, storage, or UI

**Mitigation:**
- Implement strict SandboxExecutor with isolated context
- Use separate Map instances for vault/memory
- Override console methods only during execution
- Restore global state after execution
- Extensive isolation tests
- Code review for state access

**Verification:**
```javascript
// Test that sub-agent execution doesn't affect global state
const originalStorage = Storage.getAll();
await SubAgentOrchestrator.runSubAgent('webKnowledge', 'test');
const afterStorage = Storage.getAll();
expect(afterStorage).toEqual(originalStorage);
```

---

#### 2. **API Rate Limits**

**Risk:** Exceed API rate limits, causing failures or bans

**Impact:** High - Feature becomes unreliable or unusable

**Mitigation:**
- Implement rate limiting in API helpers
- Cache results when possible
- Add retry logic with exponential backoff
- Use multiple APIs to distribute load
- Monitor usage in production
- Graceful degradation on failures

**Implementation:**
```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.max = maxRequests;
    this.window = windowMs;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.window);

    if (this.requests.length >= this.max) {
      const oldest = this.requests[0];
      const waitTime = this.window - (now - oldest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(now);
  }
}

// Usage in API helper
const wikiLimiter = new RateLimiter(10, 1000); // 10 req/sec

async function wikiSearch(query) {
  await wikiLimiter.throttle();
  // ... perform search
}
```

---

#### 3. **CORS Issues**

**Risk:** APIs block cross-origin requests from browser

**Impact:** Medium - Some tools become unusable

**Mitigation:**
- Test all APIs thoroughly in browser
- Provide server-side proxy for blocked APIs
- Use `origin=*` parameter where supported
- Fallback to alternative APIs
- Clear documentation of limitations

**Fallback Strategy:**
```javascript
async function fetchWithFallback(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch (error) {
    if (error.message.includes('CORS')) {
      // Try server-side proxy
      return await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, options);
    }
    throw error;
  }
}
```

---

#### 4. **Infinite Loop in Sub-Agent**

**Risk:** Sub-agent never produces final output, loops indefinitely

**Impact:** Medium - Wastes API calls and time, blocks main loop

**Mitigation:**
- Strict max iterations limit
- Timeout for each iteration
- Overall timeout for entire sub-agent run
- Fallback to error result
- Logging for debugging

**Implementation:**
```javascript
async runSubAgent(agentId, query, options = {}) {
  const timeout = options.timeout || 30000; // 30 sec default
  const maxIterations = agent.maxIterations;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Sub-agent timeout')), timeout)
  );

  const executionPromise = (async () => {
    let iteration = 0;
    while (iteration < maxIterations) {
      // ... reasoning loop
      iteration++;
    }
    return result;
  })();

  return await Promise.race([executionPromise, timeoutPromise]);
}
```

---

### Medium-Risk Areas

#### 5. **LLM Prompt Quality**

**Risk:** Sub-agent system prompts don't produce good results

**Impact:** Medium - Poor quality external knowledge

**Mitigation:**
- Iterate on prompts with testing
- Include examples in system prompt
- Clear output format specification
- Fallback parsing strategies
- User feedback mechanism

---

#### 6. **Context Size Bloat**

**Risk:** External knowledge section makes main prompt too large

**Impact:** Medium - Increased latency, token costs

**Mitigation:**
- Limit sub-agent output length
- Summarize results if too long
- Make section optional (only when useful)
- Monitor prompt size
- Implement truncation strategies

---

#### 7. **Integration Breaking Changes**

**Risk:** Sub-agent integration breaks existing features

**Impact:** High (if it happens) - Main app stops working

**Mitigation:**
- Feature flag for easy disable
- Extensive E2E tests
- Gradual rollout
- Monitoring and alerts
- Easy rollback plan
- Code review

---

### Low-Risk Areas

#### 8. **API Changes**

**Risk:** External APIs change or deprecate

**Impact:** Low - Individual tools fail, but system continues

**Mitigation:**
- Abstraction layer for each API
- Version pinning where possible
- Monitoring for API errors
- Fallback to alternative sources

---

#### 9. **Performance**

**Risk:** Sub-agent slows down main reasoning loop

**Impact:** Low-Medium - Increased response time

**Mitigation:**
- Run sub-agent asynchronously (don't block)
- Cache results aggressively
- Make feature optional
- Optimize API calls
- Parallel execution where possible

---

## 📚 APPENDICES

### A. Configuration Reference

**Sub-Agent Settings:**
```javascript
// In Storage or config file
{
  "settings_enable_sub_agent": true,           // Enable/disable feature
  "settings_sub_agent_default": "webKnowledge", // Default agent ID
  "settings_sub_agent_timeout": 30000,         // Timeout in ms
  "settings_sub_agent_cache_ttl": 3600000      // Cache TTL in ms (1 hour)
}
```

---

### B. API Reference

**SubAgentOrchestrator API:**

```javascript
/**
 * Run a sub-agent
 * @param {string} agentId - Agent ID from SUB_AGENTS
 * @param {string} query - User query
 * @param {object} options - Optional configuration
 * @returns {Promise<object>} Result object
 */
SubAgentOrchestrator.runSubAgent(agentId, query, options)

/**
 * Result object structure:
 * {
 *   content: string,         // Final answer content
 *   format: string,          // Output format (markdown-bullets, etc.)
 *   source: string,          // Agent name
 *   iterations: number       // Number of iterations taken
 * }
 */
```

---

### C. Extension Points

**Adding a New Agent:**

1. Define agent in `agents-config.js`:
```javascript
export const SUB_AGENTS = {
  // ... existing agents ...

  myNewAgent: {
    id: 'myNewAgent',
    name: 'My New Agent',
    description: 'Does something specific',
    systemPrompt: `...`,
    allowedTools: ['tool1', 'tool2'],
    maxIterations: 3,
    outputFormat: 'markdown-bullets'
  }
};
```

2. Use it:
```javascript
const result = await SubAgentOrchestrator.runSubAgent('myNewAgent', 'query');
```

**Adding a New API Tool:**

1. Create API helper in `js/subagent/tools/apis/myapi.js`:
```javascript
export async function myApiSearch(query) {
  const res = await fetch(`https://api.example.com/search?q=${query}`);
  return await res.json();
}
```

2. Export from `web-tools.js`:
```javascript
export { myApiSearch } from './apis/myapi.js';
```

3. Add to agent's `allowedTools`:
```javascript
allowedTools: ['myApiSearch']
```

---

### D. Troubleshooting

**Common Issues:**

1. **Sub-agent not triggering**
   - Check `settings_enable_sub_agent` is true
   - Verify query matches trigger heuristic
   - Check console for errors

2. **API errors**
   - Check network tab for failed requests
   - Verify CORS headers
   - Check rate limits
   - Try alternative APIs

3. **No external knowledge in context**
   - Verify sub-agent completed successfully
   - Check storage for `subagent_last_result`
   - Verify provider is registered
   - Check context builder configuration

4. **Execution errors**
   - Check sandbox isolation
   - Verify tool functions are available
   - Check console capture
   - Review error logs

---

## ✅ COMPLETION CRITERIA

The sub-agent system is considered complete when:

- [ ] All 8 API helpers implemented and tested
- [ ] SandboxExecutor fully isolated and tested
- [ ] SubAgentOrchestrator handles all edge cases
- [ ] All 3 default agents (webKnowledge, scienceResearch, mathExpert) working
- [ ] External knowledge provider integrated into context
- [ ] Main loop integration complete with feature flag
- [ ] UI toggle implemented
- [ ] All unit tests passing (>90% coverage)
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Documentation complete
- [ ] Performance acceptable (<5s avg for sub-agent)
- [ ] No breaking changes to existing features
- [ ] Code review completed
- [ ] Security review completed
- [ ] Production deployment successful

---

## 🎯 SUCCESS METRICS

**Quantitative:**
- Sub-agent response time: <5 seconds (p95)
- API success rate: >95%
- Isolation test pass rate: 100%
- Coverage: >90%
- Main loop latency increase: <10%

**Qualitative:**
- External knowledge improves main LLM answers
- Users find feature helpful
- No negative impact on existing features
- Easy to add new agents/tools
- Clear documentation and examples

---

## 📞 CONTACTS & RESOURCES

**Developer:** Kalp Pariya
**Project:** GDRS (Gemini Deep Research System)
**Repository:** K4lp.github.io
**Branch:** `claude/remove-docs-add-plan-011CUxrZNQ7rnAGqx9RZguJi`

**External Resources:**
- Wikipedia API: https://www.mediawiki.org/wiki/API:Main_page
- Wikidata SPARQL: https://query.wikidata.org/
- arXiv API: https://info.arxiv.org/help/api/index.html
- Stack Exchange API: https://api.stackexchange.com/docs

---

**END OF IMPLEMENTATION PLAN**

*This plan is comprehensive, binding-safe, and ready for execution. All changes are tracked, tested, and documented to ensure zero breaking changes to the existing GDRS system.*
