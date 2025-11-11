# Subagent System Improvement Plan

**Date:** 2025-11-11
**Version:** 1.0
**Goal:** Transform the subagent system into an extremely modular, reusable, and extensible architecture

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Objectives](#2-goals-and-objectives)
3. [Architecture Overview](#3-architecture-overview)
4. [Behavior Changes](#4-behavior-changes)
5. [Detailed Refactoring Plan](#5-detailed-refactoring-plan)
6. [Migration Strategy](#6-migration-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Implementation Phases](#8-implementation-phases)
9. [Success Criteria](#9-success-criteria)
10. [Risks and Mitigation](#10-risks-and-mitigation)

---

## 1. Executive Summary

### Current State
The subagent system is **tightly coupled**, with hardcoded dependencies, limited extensibility, and poor testability. While functional, it cannot easily adapt to new requirements or be reused in other contexts.

### Desired State
A **modular, plugin-based architecture** where:
- AI providers are swappable via interfaces
- Tools are self-registering plugins
- Storage is abstracted behind repositories
- Components are testable in isolation
- The system is portable to other projects

### Key Principles
1. **Dependency Injection** - No hardcoded dependencies
2. **Interface-First Design** - Define contracts before implementations
3. **Plugin Architecture** - Dynamic registration and discovery
4. **Separation of Concerns** - Each module has one responsibility
5. **Testability** - All components mockable and testable

---

## 2. Goals and Objectives

### Primary Goals

#### Goal 1: Extreme Modularity
**Definition:** Every component should be independently replaceable without modifying other components.

**Success Metrics:**
- Can swap AI provider (Gemini → Claude) without touching orchestrator
- Can add new tool without modifying tool registry core
- Can use custom storage backend without code changes
- Can inject mock dependencies for testing

#### Goal 2: Maximum Reusability
**Definition:** Core components should be usable in any JavaScript project with minimal setup.

**Success Metrics:**
- Can npm install as standalone package
- Zero dependencies on GDRS-specific code
- Configurable via options, not environment assumptions
- Works in Node.js, browser, or workers

#### Goal 3: Easy Extensibility
**Definition:** Common customizations should require zero core modifications.

**Success Metrics:**
- New tools via plugin registration
- New agents via configuration
- Custom retry strategies via policy injection
- Event hooks at every lifecycle phase

### Secondary Goals

- **Improved Performance** - Parallel tool execution, streaming responses
- **Better Observability** - Structured logging, trace querying, metrics
- **Enhanced Security** - Input validation, rate limiting, cost tracking
- **Developer Experience** - TypeScript support, comprehensive docs, examples

---

## 3. Architecture Overview

### 3.1 Target Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT / USER                            │
│                   (Reasoning Loop, CLI, API)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUBAGENT FACADE                              │
│  - High-level API (invoke, query, status)                      │
│  - Validation & sanitization                                    │
│  - Error translation                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ORCHESTRATION LAYER                            │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Orchestrator    │  │  Execution       │                    │
│  │  - Workflow      │  │  Context         │                    │
│  │  - Coordination  │  │  - State         │                    │
│  └──────────────────┘  └──────────────────┘                    │
└──────┬─────────┬─────────┬────────────┬────────────────────────┘
       │         │         │            │
       │         │         │            │
       ▼         ▼         ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│   AI     │ │  TOOL    │ │ STORAGE  │ │    EVENT         │
│ PROVIDER │ │  ENGINE  │ │  LAYER   │ │    BUS           │
│ (Plugin) │ │ (Plugin) │ │  (Repo)  │ │  (Observer)      │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────────────┘
     │            │            │
     ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       PLUGIN REGISTRY                           │
│  - Provider registration                                        │
│  - Lifecycle management                                         │
│  - Dependency resolution                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Layered Architecture

#### Layer 1: Facade (Public API)
**Responsibility:** Provide stable public interface

**Components:**
- `SubAgentFacade` - Main entry point
- `QueryValidator` - Input validation
- `ResponseFormatter` - Output formatting

#### Layer 2: Orchestration (Business Logic)
**Responsibility:** Coordinate execution workflow

**Components:**
- `SubAgentOrchestrator` - Workflow engine
- `ExecutionContext` - Request-scoped state
- `PromptBuilder` - Prompt construction
- `ResultAggregator` - Result assembly

#### Layer 3: Providers (Plugin Interfaces)
**Responsibility:** Define extension points

**Interfaces:**
- `IAIProvider` - AI completion interface
- `IToolProvider` - Tool execution interface
- `IStorageProvider` - Data persistence interface
- `ITraceProvider` - Observability interface

#### Layer 4: Implementations (Concrete Plugins)
**Responsibility:** Implement provider contracts

**Examples:**
- `GeminiProvider implements IAIProvider`
- `WikipediaToolProvider implements IToolProvider`
- `LocalStorageProvider implements IStorageProvider`

#### Layer 5: Infrastructure (Core Services)
**Responsibility:** Framework-level utilities

**Components:**
- `PluginRegistry` - Plugin management
- `DIContainer` - Dependency injection
- `EventBus` - Event distribution
- `Logger` - Structured logging

---

## 4. Behavior Changes

This section explicitly documents what changes from the user and developer perspective.

### 4.1 User-Facing Behavior Changes

#### Change 1: Agent Invocation

**Previous Behavior:**
```javascript
// Implicitly uses global Storage, EventBus
const result = await SubAgentAPI.invoke(query, { agentId: 'webKnowledge' });
```

**New Behavior:**
```javascript
// Explicit configuration passed at initialization
const subagent = new SubAgentFacade({
  aiProvider: geminiProvider,
  toolProviders: [wikipediaProvider, groqProvider],
  storage: customStorage,
  eventBus: myEventBus
});

const result = await subagent.invoke(query, { agentId: 'webKnowledge' });
```

**Why:** Explicit dependencies make behavior predictable and testable.

**Migration:** Provide backwards-compatible factory that uses singletons:
```javascript
// Old code continues to work
const subagent = SubAgentFacade.createDefault();
const result = await subagent.invoke(query, { agentId: 'webKnowledge' });
```

#### Change 2: Tool Registration

**Previous Behavior:**
```javascript
// Must modify web-tools.js source code
export const ToolRegistry = {
  wikipediaSearch,
  wikipediaSummary,
  duckDuckGoInstant,
  groqCompoundSearch
};
```

**New Behavior:**
```javascript
// Dynamic registration via plugin API
subagent.registerToolProvider(new CustomToolProvider({
  name: 'myCustomTool',
  execute: async (query, options) => {
    // Tool implementation
  },
  metadata: {
    description: 'My custom tool',
    parameters: { /* schema */ },
    cost: 'low'
  }
}));
```

**Why:** Allows third-party extensions without core modifications.

**Migration:** Auto-register built-in tools on initialization.

#### Change 3: Error Handling

**Previous Behavior:**
```javascript
// Inconsistent error handling
try {
  await SubAgentAPI.invoke(query);
} catch (error) {
  // Could be validation error, API error, tool error, etc.
  // No structured error information
  console.error(error.message);
}
```

**New Behavior:**
```javascript
// Structured error hierarchy
try {
  await subagent.invoke(query);
} catch (error) {
  if (error instanceof SubAgentValidationError) {
    // Handle validation errors
  } else if (error instanceof AIProviderError) {
    // Handle AI provider errors
    console.error(`AI Error: ${error.provider} - ${error.reason}`);
  } else if (error instanceof ToolExecutionError) {
    // Handle tool errors
    console.error(`Tool ${error.toolName} failed: ${error.reason}`);
  }
}
```

**Why:** Enables specific error handling strategies.

**Migration:** Wrap old errors in new error types for backwards compatibility.

#### Change 4: Trace Access

**Previous Behavior:**
```javascript
// Global singleton access
const trace = Storage.loadSubAgentTrace();
const history = Storage.loadSubAgentTraceHistory();
```

**New Behavior:**
```javascript
// Instance-based access with querying
const trace = await subagent.getTrace(traceId);
const history = await subagent.queryTraces({
  agentId: 'webKnowledge',
  status: 'completed',
  dateRange: { start: '2025-11-01', end: '2025-11-11' }
});
```

**Why:** Better encapsulation and powerful querying.

**Migration:** Provide compatibility methods that use instance methods internally.

### 4.2 Developer-Facing Behavior Changes

#### Change 5: Agent Configuration

**Previous Behavior:**
```javascript
// Modify agents-config.js directly
export const SUB_AGENTS = {
  myAgent: {
    id: 'myAgent',
    name: 'My Agent',
    systemPrompt: '...',
    allowedTools: ['tool1', 'tool2']
  }
};
```

**New Behavior:**
```javascript
// Register agents dynamically
subagent.registerAgent({
  id: 'myAgent',
  name: 'My Agent',
  systemPrompt: '...',
  capabilities: ['web-search', 'summarization'],
  provider: 'gemini',
  config: {
    model: 'gemini-1.5-flash',
    temperature: 0.7
  }
});

// Or load from external config
await subagent.loadAgents('./agents.json');
```

**Why:** Supports dynamic agent registration and external configuration.

**Migration:** Auto-load agents from agents-config.js on first init.

#### Change 6: AI Provider Swapping

**Previous Behavior:**
```javascript
// Must modify sub-agent-orchestrator.js line 120
response = await GeminiAPI.generateContent(modelId, prompt);
```

**New Behavior:**
```javascript
// Use any AI provider that implements IAIProvider
const claudeProvider = new ClaudeProvider({ apiKey: '...' });
const subagent = new SubAgentFacade({ aiProvider: claudeProvider });

// Or switch at runtime
subagent.setAIProvider(claudeProvider);
```

**Why:** Enables experimentation and fallback strategies.

**Migration:** Wrap existing GeminiAPI in GeminiProvider adapter.

#### Change 7: Testing

**Previous Behavior:**
```javascript
// Hard to test due to hardcoded dependencies
// Must use real APIs or complex mocking
test('subagent executes', async () => {
  // No clean way to mock
  const result = await SubAgentAPI.invoke('test query');
  expect(result).toBeDefined();
});
```

**New Behavior:**
```javascript
// Easy to test with mock providers
test('subagent executes', async () => {
  const mockAI = new MockAIProvider({
    response: 'Mock result'
  });
  const mockTools = new MockToolProvider({
    results: [{ title: 'Test', summary: 'Test data' }]
  });

  const subagent = new SubAgentFacade({
    aiProvider: mockAI,
    toolProviders: [mockTools],
    storage: new InMemoryStorage()
  });

  const result = await subagent.invoke('test query');
  expect(result.content).toBe('Mock result');
});
```

**Why:** Enables fast, isolated unit tests.

**Migration:** N/A - this is new capability.

#### Change 8: Tool Execution

**Previous Behavior:**
```javascript
// Sequential execution only
for (const toolName of tools) {
  const data = await runTool(toolName, query, options);
  outputs.push(data);
}
```

**New Behavior:**
```javascript
// Configurable execution strategy
const subagent = new SubAgentFacade({
  toolExecutionStrategy: 'parallel', // or 'sequential', 'race', 'waterfall'
  toolTimeout: 5000
});

// Or per-request
await subagent.invoke(query, {
  toolExecution: {
    mode: 'parallel',
    failFast: false,
    timeout: 10000
  }
});
```

**Why:** Performance optimization and flexibility.

**Migration:** Default to 'sequential' for backwards compatibility.

#### Change 9: Caching

**Previous Behavior:**
```javascript
// Simple TTL-based caching in Storage
if (cacheTtl > 0 && cached && cached.query === query) {
  return cached;
}
```

**New Behavior:**
```javascript
// Pluggable cache provider
const subagent = new SubAgentFacade({
  cacheProvider: new RedisCacheProvider({ /* config */ })
});

// Or use built-in
const subagent = new SubAgentFacade({
  cacheProvider: new MemoryCacheProvider({
    maxSize: 100,
    ttl: 60000,
    keyGenerator: (query, options) => `${query}:${options.agentId}`
  })
});
```

**Why:** Supports distributed caching and advanced strategies.

**Migration:** Default to current behavior with LocalStorageCacheProvider.

#### Change 10: Logging and Observability

**Previous Behavior:**
```javascript
// Console.log statements scattered everywhere
console.log(`[${nowISO()}] Starting subagent...`);
console.warn('Tool failed:', error);
```

**New Behavior:**
```javascript
// Structured logging with levels and context
const subagent = new SubAgentFacade({
  logger: new StructuredLogger({
    level: 'info',
    transport: new ConsoleTransport(),
    context: { service: 'subagent' }
  })
});

// Logs include structured data
// Output: {"level":"info","timestamp":"2025-11-11T...","service":"subagent","agentId":"webKnowledge","query":"...","event":"invocation_start"}
```

**Why:** Better debugging and monitoring in production.

**Migration:** Default to current console logging behavior.

---

## 5. Detailed Refactoring Plan

### Phase 1: Foundation (Interfaces and Contracts)

#### Step 1.1: Define Core Interfaces

**Create:** `js/subagent/core/interfaces.js`

```javascript
/**
 * AI Provider Interface
 * Providers must implement this contract to supply AI completions
 */
export class IAIProvider {
  /**
   * @param {string} prompt - The prompt to send
   * @param {object} options - Provider-specific options
   * @returns {Promise<AIResponse>}
   */
  async generateCompletion(prompt, options) {
    throw new Error('Not implemented');
  }

  /**
   * @returns {string} Provider name
   */
  getName() {
    throw new Error('Not implemented');
  }

  /**
   * @returns {object} Provider capabilities
   */
  getCapabilities() {
    throw new Error('Not implemented');
  }

  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    throw new Error('Not implemented');
  }
}

/**
 * Tool Provider Interface
 * Tools must implement this contract to provide data
 */
export class IToolProvider {
  /**
   * @param {string} query - The search/action query
   * @param {object} options - Tool-specific options
   * @returns {Promise<ToolResult>}
   */
  async execute(query, options) {
    throw new Error('Not implemented');
  }

  /**
   * @returns {ToolMetadata}
   */
  getMetadata() {
    throw new Error('Not implemented');
  }

  /**
   * Validate if this tool can handle the query
   * @param {string} query
   * @param {object} context
   * @returns {Promise<boolean>}
   */
  async canHandle(query, context) {
    return true; // Default: can handle any query
  }
}

/**
 * Storage Provider Interface
 * Abstract storage operations
 */
export class IStorageProvider {
  async save(key, value, options) {
    throw new Error('Not implemented');
  }

  async load(key, defaultValue) {
    throw new Error('Not implemented');
  }

  async remove(key) {
    throw new Error('Not implemented');
  }

  async query(pattern, filters) {
    throw new Error('Not implemented');
  }
}

/**
 * Trace Provider Interface
 * Observability and tracing
 */
export class ITraceProvider {
  async createTrace(traceData) {
    throw new Error('Not implemented');
  }

  async updateTrace(traceId, updates) {
    throw new Error('Not implemented');
  }

  async getTrace(traceId) {
    throw new Error('Not implemented');
  }

  async queryTraces(filters) {
    throw new Error('Not implemented');
  }
}

/**
 * Cache Provider Interface
 * Caching strategy abstraction
 */
export class ICacheProvider {
  async get(key) {
    throw new Error('Not implemented');
  }

  async set(key, value, ttl) {
    throw new Error('Not implemented');
  }

  async invalidate(key) {
    throw new Error('Not implemented');
  }

  async clear() {
    throw new Error('Not implemented');
  }
}
```

**Why:** Establishes contracts that all implementations must follow.

#### Step 1.2: Define Data Models

**Create:** `js/subagent/core/models.js`

```javascript
/**
 * Standard response from AI providers
 */
export class AIResponse {
  constructor({ content, metadata = {}, usage = {}, provider = '' }) {
    this.content = content;
    this.metadata = metadata; // Provider-specific metadata
    this.usage = usage;       // Token usage, cost, etc.
    this.provider = provider;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Standard result from tools
 */
export class ToolResult {
  constructor({ items = [], metadata = {}, error = null }) {
    this.items = items;       // Array of result items
    this.metadata = metadata; // Tool-specific metadata
    this.error = error;       // Error if tool failed
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Tool result item
 */
export class ToolResultItem {
  constructor({ title, summary, url, source, metadata = {} }) {
    this.title = title;
    this.summary = summary;
    this.url = url;
    this.source = source;
    this.metadata = metadata;
    this.retrievedAt = new Date().toISOString();
  }
}

/**
 * Execution trace
 */
export class ExecutionTrace {
  constructor(data) {
    this.id = data.id;
    this.status = data.status; // 'running', 'completed', 'error', 'cached'
    this.agentId = data.agentId;
    this.agentName = data.agentName;
    this.query = data.query;
    this.scope = data.scope;
    this.intent = data.intent;
    this.startedAt = data.startedAt;
    this.finishedAt = data.finishedAt;
    this.toolResults = data.toolResults || [];
    this.prompt = data.prompt;
    this.summary = data.summary;
    this.error = data.error;
    this.metadata = data.metadata || {};
  }
}

/**
 * Tool metadata
 */
export class ToolMetadata {
  constructor({ name, description, parameters, cost, timeout }) {
    this.name = name;
    this.description = description;
    this.parameters = parameters; // JSON Schema
    this.cost = cost;             // 'low', 'medium', 'high'
    this.timeout = timeout;       // Default timeout in ms
  }
}

/**
 * Agent configuration
 */
export class AgentConfig {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.systemPrompt = data.systemPrompt;
    this.capabilities = data.capabilities || [];
    this.allowedTools = data.allowedTools || [];
    this.maxToolResults = data.maxToolResults || 5;
    this.provider = data.provider || 'default';
    this.config = data.config || {};
  }
}
```

**Why:** Type-safe data structures improve reliability and documentation.

#### Step 1.3: Create Error Hierarchy

**Create:** `js/subagent/core/errors.js`

```javascript
/**
 * Base error for all subagent errors
 */
export class SubAgentError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation errors (user input issues)
 */
export class SubAgentValidationError extends SubAgentError {
  constructor(message, field, details = {}) {
    super(message, { field, ...details });
    this.field = field;
  }
}

/**
 * AI provider errors
 */
export class AIProviderError extends SubAgentError {
  constructor(message, provider, reason, details = {}) {
    super(message, { provider, reason, ...details });
    this.provider = provider;
    this.reason = reason;
  }
}

/**
 * Tool execution errors
 */
export class ToolExecutionError extends SubAgentError {
  constructor(message, toolName, reason, details = {}) {
    super(message, { toolName, reason, ...details });
    this.toolName = toolName;
    this.reason = reason;
  }
}

/**
 * Storage errors
 */
export class StorageError extends SubAgentError {}

/**
 * Configuration errors
 */
export class ConfigurationError extends SubAgentError {}

/**
 * Timeout errors
 */
export class TimeoutError extends SubAgentError {
  constructor(message, operation, timeout) {
    super(message, { operation, timeout });
    this.operation = operation;
    this.timeout = timeout;
  }
}
```

**Why:** Structured errors enable precise error handling.

---

### Phase 2: Infrastructure Layer

#### Step 2.1: Create Plugin Registry

**Create:** `js/subagent/core/plugin-registry.js`

```javascript
/**
 * Manages registration and lifecycle of plugins
 */
export class PluginRegistry {
  constructor() {
    this.providers = new Map();
    this.metadata = new Map();
  }

  /**
   * Register a provider plugin
   * @param {string} type - 'ai', 'tool', 'storage', 'trace', 'cache'
   * @param {string} name - Provider name
   * @param {object} provider - Provider instance
   * @param {object} metadata - Optional metadata
   */
  register(type, name, provider, metadata = {}) {
    const key = `${type}:${name}`;

    // Validate provider implements required interface
    this._validateProvider(type, provider);

    this.providers.set(key, provider);
    this.metadata.set(key, {
      type,
      name,
      registeredAt: new Date().toISOString(),
      ...metadata
    });

    return this;
  }

  /**
   * Get a registered provider
   */
  get(type, name) {
    const key = `${type}:${name}`;
    return this.providers.get(key);
  }

  /**
   * Get all providers of a type
   */
  getAll(type) {
    const providers = [];
    for (const [key, provider] of this.providers.entries()) {
      if (key.startsWith(`${type}:`)) {
        providers.push(provider);
      }
    }
    return providers;
  }

  /**
   * Unregister a provider
   */
  unregister(type, name) {
    const key = `${type}:${name}`;
    this.providers.delete(key);
    this.metadata.delete(key);
  }

  /**
   * Check if provider exists
   */
  has(type, name) {
    const key = `${type}:${name}`;
    return this.providers.has(key);
  }

  /**
   * Validate provider implements required interface
   */
  _validateProvider(type, provider) {
    const requiredMethods = {
      ai: ['generateCompletion', 'getName', 'getCapabilities'],
      tool: ['execute', 'getMetadata'],
      storage: ['save', 'load', 'remove'],
      trace: ['createTrace', 'updateTrace', 'getTrace'],
      cache: ['get', 'set', 'invalidate']
    };

    const methods = requiredMethods[type];
    if (!methods) {
      throw new ConfigurationError(`Unknown provider type: ${type}`);
    }

    for (const method of methods) {
      if (typeof provider[method] !== 'function') {
        throw new ConfigurationError(
          `Provider must implement ${method}()`,
          { type, method }
        );
      }
    }
  }
}
```

**Why:** Centralized plugin management with validation.

#### Step 2.2: Create Dependency Injection Container

**Create:** `js/subagent/core/di-container.js`

```javascript
/**
 * Simple dependency injection container
 */
export class DIContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
    this.singletons = new Map();
  }

  /**
   * Register a service instance
   */
  register(name, instance) {
    this.services.set(name, instance);
    return this;
  }

  /**
   * Register a factory function
   */
  registerFactory(name, factory) {
    this.factories.set(name, factory);
    return this;
  }

  /**
   * Register a singleton factory
   */
  registerSingleton(name, factory) {
    this.factories.set(name, () => {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, factory(this));
      }
      return this.singletons.get(name);
    });
    return this;
  }

  /**
   * Resolve a dependency
   */
  resolve(name) {
    // Check direct services first
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check factories
    if (this.factories.has(name)) {
      return this.factories.get(name)(this);
    }

    throw new ConfigurationError(`Service not registered: ${name}`);
  }

  /**
   * Check if service exists
   */
  has(name) {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Clear all registrations
   */
  clear() {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }
}
```

**Why:** Decouples object creation from usage.

#### Step 2.3: Create Structured Logger

**Create:** `js/subagent/core/logger.js`

```javascript
/**
 * Structured logging utility
 */
export class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.context = options.context || {};
    this.transport = options.transport || new ConsoleTransport();
  }

  log(level, message, data = {}) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] < levels[this.level]) {
      return;
    }

    const entry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...this.context,
      ...data
    };

    this.transport.write(entry);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  error(message, error, data) {
    this.log('error', message, {
      error: error?.message,
      stack: error?.stack,
      ...data
    });
  }

  child(context) {
    return new Logger({
      level: this.level,
      context: { ...this.context, ...context },
      transport: this.transport
    });
  }
}

/**
 * Console transport
 */
export class ConsoleTransport {
  write(entry) {
    const { level, message, timestamp, ...data } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(prefix, message, data);
    } else if (level === 'warn') {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }
  }
}

/**
 * JSON transport (for structured logging to files/services)
 */
export class JSONTransport {
  write(entry) {
    console.log(JSON.stringify(entry));
  }
}
```

**Why:** Consistent, structured logging across all components.

---

### Phase 3: Provider Implementations

#### Step 3.1: Adapt Existing Gemini Client

**Create:** `js/subagent/providers/gemini-provider.js`

```javascript
import { IAIProvider } from '../core/interfaces.js';
import { AIResponse } from '../core/models.js';
import { AIProviderError } from '../core/errors.js';
import { GeminiAPI } from '../../api/gemini-client.js';

/**
 * Gemini AI Provider - Adapter for existing GeminiAPI
 */
export class GeminiProvider extends IAIProvider {
  constructor(options = {}) {
    super();
    this.client = options.client || GeminiAPI;
    this.defaultModel = options.defaultModel || 'models/gemini-1.5-flash';
    this.logger = options.logger;
  }

  async generateCompletion(prompt, options = {}) {
    const modelId = options.model || this.defaultModel;

    this.logger?.debug('Generating completion', {
      provider: 'gemini',
      model: modelId,
      promptLength: prompt.length
    });

    try {
      const response = await this.client.generateContent(modelId, prompt);
      const content = this.client.extractResponseText(response);

      return new AIResponse({
        content,
        provider: 'gemini',
        metadata: {
          model: modelId,
          candidates: response.candidates?.length || 0
        },
        usage: this._extractUsage(response)
      });
    } catch (error) {
      this.logger?.error('Gemini completion failed', error);
      throw new AIProviderError(
        'Failed to generate completion',
        'gemini',
        error.message
      );
    }
  }

  getName() {
    return 'gemini';
  }

  getCapabilities() {
    return {
      streaming: false,
      functionCalling: false,
      maxTokens: 8192,
      supportedModels: [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest'
      ]
    };
  }

  async isHealthy() {
    // Could implement health check by trying to fetch model list
    return true;
  }

  _extractUsage(response) {
    // Extract token usage if available in response
    return {
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: response.usageMetadata?.totalTokenCount || 0
    };
  }
}
```

**Why:** Wraps existing client in new interface without breaking changes.

#### Step 3.2: Create Tool Provider Base Class

**Create:** `js/subagent/providers/tool-provider-base.js`

```javascript
import { IToolProvider } from '../core/interfaces.js';
import { ToolResult, ToolResultItem, ToolMetadata } from '../core/models.js';
import { ToolExecutionError } from '../core/errors.js';

/**
 * Base class for tool providers with common functionality
 */
export class ToolProviderBase extends IToolProvider {
  constructor(config = {}) {
    super();
    this.config = config;
    this.logger = config.logger;
  }

  async execute(query, options = {}) {
    const startTime = Date.now();
    this.logger?.debug('Tool execution started', {
      tool: this.getMetadata().name,
      query
    });

    try {
      const items = await this._executeInternal(query, options);
      const duration = Date.now() - startTime;

      this.logger?.info('Tool execution completed', {
        tool: this.getMetadata().name,
        itemCount: items.length,
        duration
      });

      return new ToolResult({ items });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger?.error('Tool execution failed', error, {
        tool: this.getMetadata().name,
        duration
      });

      return new ToolResult({
        items: [],
        error: error.message,
        metadata: { duration }
      });
    }
  }

  /**
   * Override this method in subclasses
   */
  async _executeInternal(query, options) {
    throw new Error('Subclass must implement _executeInternal');
  }

  /**
   * Helper to normalize API responses
   */
  _normalizeItem(data) {
    return new ToolResultItem({
      title: data.title || data.heading || 'Result',
      summary: data.summary || data.snippet || data.extract || '',
      url: data.url || data.link || '',
      source: this.getMetadata().name,
      metadata: data.metadata || {}
    });
  }
}
```

**Why:** Reduces boilerplate and ensures consistent behavior.

#### Step 3.3: Migrate Wikipedia Tools

**Create:** `js/subagent/providers/wikipedia-provider.js`

```javascript
import { ToolProviderBase } from './tool-provider-base.js';
import { ToolMetadata } from '../core/models.js';

/**
 * Wikipedia tool provider
 */
export class WikipediaProvider extends ToolProviderBase {
  constructor(config = {}) {
    super(config);
    this.searchEndpoint = 'https://en.wikipedia.org/w/api.php';
    this.summaryEndpoint = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
    this.limit = config.limit || 5;
  }

  async _executeInternal(query, options) {
    const limit = options.limit || this.limit;
    const url = new URL(this.searchEndpoint);
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'search');
    url.searchParams.set('srprop', 'snippet');
    url.searchParams.set('format', 'json');
    url.searchParams.set('origin', '*');
    url.searchParams.set('srsearch', query);
    url.searchParams.set('srlimit', String(Math.min(limit, 10)));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Wikipedia search failed (${response.status})`);
    }

    const data = await response.json();
    const results = data?.query?.search || [];

    return results.map(item => this._normalizeItem({
      title: item.title,
      summary: this._sanitizeSnippet(item.snippet),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
    }));
  }

  getMetadata() {
    return new ToolMetadata({
      name: 'wikipediaSearch',
      description: 'Search Wikipedia articles',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results', default: 5 }
        },
        required: ['query']
      },
      cost: 'low',
      timeout: 5000
    });
  }

  _sanitizeSnippet(snippet = '') {
    return snippet
      .replace(/<\/?span[^>]*>/gi, '')
      .replace(/<\/?b>/gi, '')
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .trim();
  }
}
```

**Why:** Self-contained, testable, reusable tool implementation.

#### Step 3.4: Create Storage Provider Adapter

**Create:** `js/subagent/providers/localstorage-provider.js`

```javascript
import { IStorageProvider } from '../core/interfaces.js';
import { StorageError } from '../core/errors.js';
import { Storage } from '../../storage/storage.js';

/**
 * LocalStorage provider - Adapter for existing Storage singleton
 */
export class LocalStorageProvider extends IStorageProvider {
  constructor(options = {}) {
    super();
    this.backend = options.backend || Storage;
    this.prefix = options.prefix || 'subagent_';
  }

  async save(key, value, options = {}) {
    const fullKey = this.prefix + key;
    const method = this._getMethodName(key, 'save');

    if (typeof this.backend[method] === 'function') {
      return this.backend[method](value);
    }

    throw new StorageError(`No save method for key: ${key}`);
  }

  async load(key, defaultValue = null) {
    const fullKey = this.prefix + key;
    const method = this._getMethodName(key, 'load');

    if (typeof this.backend[method] === 'function') {
      const value = this.backend[method]();
      return value !== undefined ? value : defaultValue;
    }

    return defaultValue;
  }

  async remove(key) {
    const method = this._getMethodName(key, 'clear');

    if (typeof this.backend[method] === 'function') {
      return this.backend[method]();
    }
  }

  async query(pattern, filters = {}) {
    // Basic implementation - can be enhanced
    if (pattern === 'traces') {
      const history = await this.load('traceHistory', []);
      return this._filterTraces(history, filters);
    }

    throw new StorageError(`Query not supported for pattern: ${pattern}`);
  }

  /**
   * Map generic keys to Storage method names
   */
  _getMethodName(key, operation) {
    const mapping = {
      'settings': { save: 'saveSubAgentSettings', load: 'loadSubAgentSettings' },
      'lastResult': { save: 'saveSubAgentLastResult', load: 'loadSubAgentLastResult', clear: 'clearSubAgentLastResult' },
      'trace': { save: 'saveSubAgentTrace', load: 'loadSubAgentTrace', clear: 'clearSubAgentTrace' },
      'traceHistory': { load: 'loadSubAgentTraceHistory' },
      'runtimeState': { save: 'saveSubAgentRuntimeState', load: 'loadSubAgentRuntimeState', clear: 'clearSubAgentRuntimeState' }
    };

    return mapping[key]?.[operation];
  }

  _filterTraces(traces, filters) {
    let results = traces;

    if (filters.agentId) {
      results = results.filter(t => t.agentId === filters.agentId);
    }

    if (filters.status) {
      results = results.filter(t => t.status === filters.status);
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      results = results.filter(t => {
        const date = new Date(t.startedAt);
        return date >= start && date <= end;
      });
    }

    return results;
  }
}
```

**Why:** Abstracts existing Storage singleton behind interface.

---

### Phase 4: Orchestration Refactoring

#### Step 4.1: Create Execution Context

**Create:** `js/subagent/core/execution-context.js`

```javascript
/**
 * Manages state for a single subagent execution
 */
export class ExecutionContext {
  constructor(options = {}) {
    this.id = options.id || `exec_${Date.now()}`;
    this.query = options.query;
    this.agentId = options.agentId;
    this.agent = options.agent;
    this.intent = options.intent;
    this.scope = options.scope || 'micro';
    this.iteration = options.iteration;
    this.sessionContext = options.sessionContext || {};
    this.maxToolResults = options.maxToolResults || 5;

    // Runtime state
    this.startedAt = new Date().toISOString();
    this.finishedAt = null;
    this.toolResults = [];
    this.prompt = null;
    this.response = null;
    this.error = null;
    this.metadata = {};
  }

  /**
   * Add tool result to context
   */
  addToolResult(result) {
    this.toolResults.push(result);
  }

  /**
   * Mark as finished
   */
  finish(response) {
    this.response = response;
    this.finishedAt = new Date().toISOString();
  }

  /**
   * Mark as failed
   */
  fail(error) {
    this.error = error;
    this.finishedAt = new Date().toISOString();
  }

  /**
   * Get duration in milliseconds
   */
  getDuration() {
    if (!this.finishedAt) {
      return Date.now() - new Date(this.startedAt).getTime();
    }
    return new Date(this.finishedAt).getTime() - new Date(this.startedAt).getTime();
  }

  /**
   * Convert to trace object
   */
  toTrace() {
    return {
      id: this.id,
      status: this.error ? 'error' : this.response ? 'completed' : 'running',
      agentId: this.agentId,
      agentName: this.agent?.name,
      query: this.query,
      scope: this.scope,
      intent: this.intent,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      toolResults: this.toolResults,
      prompt: this.prompt,
      summary: this.response?.content || '',
      error: this.error?.message || null,
      metadata: {
        ...this.metadata,
        duration: this.getDuration()
      }
    };
  }
}
```

**Why:** Encapsulates request state, improves testability.

#### Step 4.2: Refactor Orchestrator

**Create:** `js/subagent/core/orchestrator-v2.js`

```javascript
import { ExecutionContext } from './execution-context.js';
import { PromptBuilder } from './prompt-builder.js';
import { ToolExecutor } from './tool-executor.js';
import { ResultAggregator } from './result-aggregator.js';
import { SubAgentError, AIProviderError } from './errors.js';

/**
 * Refactored orchestrator with dependency injection
 */
export class SubAgentOrchestratorV2 {
  constructor(dependencies) {
    this.aiProvider = dependencies.aiProvider;
    this.toolExecutor = dependencies.toolExecutor;
    this.promptBuilder = dependencies.promptBuilder;
    this.resultAggregator = dependencies.resultAggregator;
    this.storageProvider = dependencies.storageProvider;
    this.traceProvider = dependencies.traceProvider;
    this.cacheProvider = dependencies.cacheProvider;
    this.logger = dependencies.logger;
    this.agentRegistry = dependencies.agentRegistry;
  }

  /**
   * Execute subagent workflow
   */
  async execute(query, options = {}) {
    // 1. Resolve agent
    const agent = this.agentRegistry.get(options.agentId || 'webKnowledge');
    if (!agent) {
      throw new SubAgentError(`Unknown agent: ${options.agentId}`);
    }

    // 2. Create execution context
    const context = new ExecutionContext({
      id: options.executionId || `subagent_${Date.now()}`,
      query,
      agentId: agent.id,
      agent,
      intent: options.intent,
      scope: options.scope,
      iteration: options.iteration,
      sessionContext: options.sessionContext,
      maxToolResults: options.maxToolResults
    });

    this.logger.info('Execution started', {
      executionId: context.id,
      agentId: agent.id,
      query: query.slice(0, 100)
    });

    // 3. Check cache
    if (this.cacheProvider && options.cacheTtl > 0) {
      const cacheKey = this._buildCacheKey(query, agent.id);
      const cached = await this.cacheProvider.get(cacheKey);
      if (cached) {
        this.logger.info('Cache hit', { executionId: context.id });
        await this.traceProvider.createTrace({
          ...context.toTrace(),
          status: 'cached',
          summary: cached.content
        });
        return cached;
      }
    }

    // 4. Create initial trace
    await this.traceProvider.createTrace(context.toTrace());

    try {
      // 5. Execute tools
      const toolResults = await this.toolExecutor.executeTools(
        agent.allowedTools,
        query,
        {
          limit: context.maxToolResults,
          onResult: async (result) => {
            context.addToolResult(result);
            await this.traceProvider.updateTrace(context.id, {
              toolResults: context.toolResults
            });
          }
        }
      );

      // 6. Build prompt
      const prompt = this.promptBuilder.build(agent, query, toolResults, {
        intent: context.intent,
        scope: context.scope,
        sessionContext: context.sessionContext,
        iteration: context.iteration
      });

      context.prompt = prompt;
      await this.traceProvider.updateTrace(context.id, { prompt });

      // 7. Generate AI response
      this.logger.debug('Calling AI provider', {
        executionId: context.id,
        provider: this.aiProvider.getName(),
        promptLength: prompt.length
      });

      const aiResponse = await this.aiProvider.generateCompletion(prompt, {
        model: agent.config?.model
      });

      // 8. Aggregate result
      const result = this.resultAggregator.aggregate(context, aiResponse);
      context.finish(aiResponse);

      // 9. Update trace
      await this.traceProvider.updateTrace(context.id, {
        status: 'completed',
        finishedAt: context.finishedAt,
        summary: result.content,
        metadata: context.metadata
      });

      // 10. Save to cache
      if (this.cacheProvider && options.cacheTtl > 0) {
        const cacheKey = this._buildCacheKey(query, agent.id);
        await this.cacheProvider.set(cacheKey, result, options.cacheTtl);
      }

      // 11. Save last result
      await this.storageProvider.save('lastResult', result);

      this.logger.info('Execution completed', {
        executionId: context.id,
        duration: context.getDuration(),
        contentLength: result.content.length
      });

      return result;

    } catch (error) {
      context.fail(error);

      this.logger.error('Execution failed', error, {
        executionId: context.id,
        duration: context.getDuration()
      });

      await this.traceProvider.updateTrace(context.id, {
        status: 'error',
        finishedAt: context.finishedAt,
        error: error.message
      });

      throw error;
    }
  }

  _buildCacheKey(query, agentId) {
    return `${agentId}:${query}`;
  }
}
```

**Why:** Clean separation of concerns, fully testable with DI.

#### Step 4.3: Create Tool Executor

**Create:** `js/subagent/core/tool-executor.js`

```javascript
/**
 * Handles tool execution with configurable strategies
 */
export class ToolExecutor {
  constructor(dependencies) {
    this.toolRegistry = dependencies.toolRegistry;
    this.logger = dependencies.logger;
    this.executionMode = dependencies.executionMode || 'sequential';
    this.timeout = dependencies.timeout || 30000;
  }

  /**
   * Execute multiple tools
   */
  async executeTools(toolNames, query, options = {}) {
    const mode = options.mode || this.executionMode;

    this.logger.debug('Executing tools', {
      tools: toolNames,
      mode,
      query: query.slice(0, 100)
    });

    if (mode === 'parallel') {
      return this._executeParallel(toolNames, query, options);
    } else {
      return this._executeSequential(toolNames, query, options);
    }
  }

  /**
   * Execute tools sequentially (current behavior)
   */
  async _executeSequential(toolNames, query, options) {
    const results = [];

    for (const toolName of toolNames) {
      const result = await this._executeSingleTool(toolName, query, options);
      results.push(result);

      if (options.onResult) {
        await options.onResult(result);
      }
    }

    return results;
  }

  /**
   * Execute tools in parallel (performance optimization)
   */
  async _executeParallel(toolNames, query, options) {
    const promises = toolNames.map(toolName =>
      this._executeSingleTool(toolName, query, options)
    );

    const results = await Promise.allSettled(promises);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        if (options.onResult) {
          options.onResult(result.value);
        }
        return result.value;
      } else {
        const toolName = toolNames[index];
        this.logger.warn('Tool execution failed', {
          tool: toolName,
          error: result.reason?.message
        });
        return {
          id: toolName,
          name: toolName,
          error: result.reason?.message || 'Unknown error',
          items: []
        };
      }
    });
  }

  /**
   * Execute a single tool with timeout
   */
  async _executeSingleTool(toolName, query, options) {
    const provider = this.toolRegistry.get(toolName);
    if (!provider) {
      this.logger.warn('Tool not found', { tool: toolName });
      return {
        id: toolName,
        name: toolName,
        error: 'Tool not registered',
        items: []
      };
    }

    const timeout = options.timeout || this.timeout;

    try {
      const resultPromise = provider.execute(query, {
        limit: options.limit || 5
      });

      const result = await this._withTimeout(resultPromise, timeout);
      const metadata = provider.getMetadata();

      return {
        id: toolName,
        name: metadata.name,
        items: result.items,
        retrievedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Tool execution error', error, { tool: toolName });
      return {
        id: toolName,
        name: toolName,
        error: error.message,
        items: []
      };
    }
  }

  async _withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tool timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}
```

**Why:** Supports parallel execution, timeouts, and different strategies.

#### Step 4.4: Create Prompt Builder

**Create:** `js/subagent/core/prompt-builder.js`

```javascript
/**
 * Builds prompts for AI providers
 */
export class PromptBuilder {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger;
  }

  /**
   * Build prompt from context
   */
  build(agent, query, toolResults, context = {}) {
    const sections = [
      this._buildSystemPrompt(agent),
      this._buildInvocationContext(query, context),
      this._buildSessionContext(context.sessionContext),
      this._buildToolEvidence(toolResults),
      this._buildResponseContract()
    ].filter(Boolean);

    return sections.join('\n\n');
  }

  _buildSystemPrompt(agent) {
    return agent.systemPrompt.trim();
  }

  _buildInvocationContext(query, context) {
    const lines = [
      `- Primary query: ${context.sessionContext?.currentQuery || query}`,
      context.intent ? `- Delegated intent: ${context.intent}` : null,
      `- Scope: ${context.scope || 'micro'} (keep the work micro and self-contained)`,
      context.iteration != null ? `- Main loop iteration: ${context.iteration}` : null
    ].filter(Boolean);

    return `## Invocation Context\n${lines.join('\n')}`;
  }

  _buildSessionContext(sessionContext = {}) {
    if (!sessionContext || Object.keys(sessionContext).length === 0) {
      return null;
    }

    const sections = [];

    if (Array.isArray(sessionContext.tasks) && sessionContext.tasks.length > 0) {
      const tasks = sessionContext.tasks.slice(0, 3).map(task =>
        `- [${(task.status || 'pending').toUpperCase()}] ${task.heading || 'Untitled'} — ${this._trim(task.content, 140)}`
      ).join('\n');
      sections.push(`### Active Tasks\n${tasks}`);
    }

    if (Array.isArray(sessionContext.goals) && sessionContext.goals.length > 0) {
      const goals = sessionContext.goals.slice(0, 3).map(goal =>
        `- ${goal.heading || 'Goal'} — ${this._trim(goal.content, 140)}`
      ).join('\n');
      sections.push(`### Active Goals\n${goals}`);
    }

    if (Array.isArray(sessionContext.memory) && sessionContext.memory.length > 0) {
      const memory = sessionContext.memory.slice(0, 3).map(mem =>
        `- ${mem.heading || 'Memory'}: ${this._trim(mem.content, 140)}`
      ).join('\n');
      sections.push(`### Pinned Memory\n${memory}`);
    }

    return sections.length > 0 ? sections.join('\n\n') : null;
  }

  _buildToolEvidence(toolResults = []) {
    if (!Array.isArray(toolResults) || toolResults.length === 0) {
      return '## Tool Evidence\nNo external tool results were retrieved.';
    }

    const formatted = toolResults.map(tool => {
      if (tool.error) {
        return `### ${tool.name}\n- ERROR: ${tool.error}`;
      }

      if (!Array.isArray(tool.items) || tool.items.length === 0) {
        return `### ${tool.name}\n- No items returned.`;
      }

      const items = tool.items.slice(0, 3).map(item => {
        const parts = [
          item.title || 'Result',
          item.summary ? `— ${this._trim(item.summary, 200)}` : null,
          item.url ? `(${item.url})` : null,
          item.source ? `[${item.source}]` : null
        ].filter(Boolean);
        return `- ${parts.join(' ')}`;
      }).join('\n');

      return `### ${tool.name}\n${items}`;
    }).join('\n\n');

    return `## Tool Evidence\n${formatted}`;
  }

  _buildResponseContract() {
    return [
      '## Response Contract',
      '- Answer only the delegated intent; if evidence is missing, state exactly what is missing.',
      '- Cite every fact inline using `[source](url)` pulled from the tool evidence.',
      '- Never leave placeholders such as `{{}}`, `TBD`, or `??`; produce concrete statements or request a rerun.',
      '- Present results in tight markdown bullets followed by a short "Next actions" note tailored for the main thread.'
    ].join('\n');
  }

  _trim(text, limit = 160) {
    if (!text || text.length <= limit) {
      return text || '';
    }
    return text.slice(0, limit - 3) + '...';
  }
}
```

**Why:** Isolated, testable prompt construction logic.

#### Step 4.5: Create Result Aggregator

**Create:** `js/subagent/core/result-aggregator.js`

```javascript
/**
 * Aggregates execution context and AI response into final result
 */
export class ResultAggregator {
  constructor(dependencies = {}) {
    this.logger = dependencies.logger;
  }

  /**
   * Aggregate execution into result object
   */
  aggregate(context, aiResponse) {
    return {
      id: context.id,
      agentId: context.agentId,
      agentName: context.agent.name,
      query: context.query,
      scope: context.scope,
      intent: context.intent,
      content: aiResponse.content || 'Sub-agent could not produce an answer.',
      toolResults: context.toolResults,
      createdAt: context.finishedAt || new Date().toISOString(),
      iterations: 1,
      metadata: {
        provider: aiResponse.provider,
        duration: context.getDuration(),
        usage: aiResponse.usage
      }
    };
  }
}
```

**Why:** Simple, focused responsibility.

---

### Phase 5: Facade and Public API

#### Step 5.1: Create Subagent Facade

**Create:** `js/subagent/facade/subagent-facade.js`

```javascript
import { SubAgentOrchestratorV2 } from '../core/orchestrator-v2.js';
import { SubAgentValidationError } from '../core/errors.js';
import { QueryValidator } from './query-validator.js';
import { DIContainer } from '../core/di-container.js';

/**
 * Public API facade for subagent system
 */
export class SubAgentFacade {
  constructor(config = {}) {
    this.container = config.container || this._buildContainer(config);
    this.orchestrator = this.container.resolve('orchestrator');
    this.validator = this.container.resolve('validator');
    this.storageProvider = this.container.resolve('storageProvider');
    this.traceProvider = this.container.resolve('traceProvider');
    this.logger = this.container.resolve('logger');
  }

  /**
   * Invoke a subagent
   */
  async invoke(query, options = {}) {
    // Validate input
    this.validator.validate(query, options);

    // Execute
    return this.orchestrator.execute(query, options);
  }

  /**
   * Get last execution result
   */
  async getLastResult() {
    return this.storageProvider.load('lastResult');
  }

  /**
   * Get a specific trace
   */
  async getTrace(traceId) {
    return this.traceProvider.getTrace(traceId);
  }

  /**
   * Query traces
   */
  async queryTraces(filters = {}) {
    return this.traceProvider.queryTraces(filters);
  }

  /**
   * Register a new tool provider
   */
  registerToolProvider(provider) {
    const toolRegistry = this.container.resolve('toolRegistry');
    const metadata = provider.getMetadata();
    toolRegistry.register(metadata.name, provider);
    this.logger.info('Tool registered', { tool: metadata.name });
  }

  /**
   * Register a new agent
   */
  registerAgent(agentConfig) {
    const agentRegistry = this.container.resolve('agentRegistry');
    agentRegistry.register(agentConfig.id, agentConfig);
    this.logger.info('Agent registered', { agent: agentConfig.id });
  }

  /**
   * Set AI provider
   */
  setAIProvider(provider) {
    this.container.register('aiProvider', provider);
    // Recreate orchestrator with new provider
    this.orchestrator = this.container.resolve('orchestrator');
    this.logger.info('AI provider updated', { provider: provider.getName() });
  }

  /**
   * Clear all data
   */
  async clear() {
    await this.storageProvider.remove('lastResult');
    await this.storageProvider.remove('trace');
    await this.storageProvider.remove('runtimeState');
    this.logger.info('Data cleared');
  }

  /**
   * Build default DI container
   */
  _buildContainer(config) {
    const container = new DIContainer();

    // Register all dependencies
    // (Implementation details in next section)

    return container;
  }

  /**
   * Create facade with default configuration (backwards compatibility)
   */
  static createDefault() {
    // Auto-detect and use existing singletons
    return new SubAgentFacade({
      // Config that uses existing Storage, EventBus, etc.
    });
  }
}
```

**Why:** Clean public API, hides complexity, supports both old and new usage.

---

## 6. Migration Strategy

### 6.1 Migration Phases

#### Phase 1: Parallel Implementation (Weeks 1-3)
- Build new architecture alongside existing code
- No changes to existing files
- New code in separate directories
- Zero risk to current functionality

#### Phase 2: Adapter Layer (Week 4)
- Create adapters that wrap old code in new interfaces
- `GeminiProvider` wraps `GeminiAPI`
- `LocalStorageProvider` wraps `Storage`
- Test adapters extensively

#### Phase 3: Opt-In Migration (Weeks 5-6)
- Add feature flag: `useModularSubagent`
- When flag is off: use old code
- When flag is on: use new facade
- Allow gradual rollout

#### Phase 4: Internal Migration (Weeks 7-8)
- Migrate internal components to use new API
- Update reasoning processor to use facade
- Update UI renderer to use new events
- Maintain backwards compatibility

#### Phase 5: Deprecation (Week 9)
- Mark old API as deprecated
- Add console warnings
- Update documentation
- Provide migration guide

#### Phase 6: Removal (Week 10+)
- Remove old code
- Clean up adapters
- Optimize new implementation
- Final documentation

### 6.2 Backwards Compatibility Strategy

**Maintain old API during transition:**

```javascript
// Old API continues to work
import { SubAgentAPI } from './subagent/sub-agent-api.js';
const result = await SubAgentAPI.invoke(query);

// New API available in parallel
import { SubAgentFacade } from './subagent/facade/subagent-facade.js';
const facade = SubAgentFacade.createDefault();
const result = await facade.invoke(query);

// Internally, old API delegates to new implementation
export class SubAgentAPI {
  static async invoke(query, options = {}) {
    if (window.__SUBAGENT_MIGRATION_MODE === 'new') {
      return defaultFacade.invoke(query, options);
    } else {
      return legacyOrchestrator.runSubAgent(null, query, options);
    }
  }
}
```

**Why:** Users can migrate at their own pace, no breaking changes.

### 6.3 Testing During Migration

**Test Strategy:**
1. **Unit Tests** - Test each new component in isolation
2. **Integration Tests** - Test new components working together
3. **Compatibility Tests** - Verify new implementation matches old behavior
4. **Smoke Tests** - Run both old and new in parallel, compare results

**Example Compatibility Test:**

```javascript
test('new implementation matches old behavior', async () => {
  const query = 'What is quantum computing?';

  // Run both implementations
  const oldResult = await legacySubAgent.runSubAgent('webKnowledge', query);
  const newResult = await newFacade.invoke(query, { agentId: 'webKnowledge' });

  // Compare outputs
  expect(newResult.content).toBeDefined();
  expect(newResult.agentId).toBe(oldResult.agentId);
  expect(newResult.query).toBe(oldResult.query);
  expect(newResult.toolResults.length).toBeGreaterThan(0);
});
```

---

## 7. Testing Strategy

### 7.1 Unit Testing

**Test Coverage Goals:**
- 90%+ code coverage
- All interfaces tested
- All error paths tested
- Edge cases covered

**Example Unit Test:**

```javascript
import { GeminiProvider } from '../providers/gemini-provider.js';
import { AIResponse } from '../core/models.js';

describe('GeminiProvider', () => {
  let provider;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      generateContent: jest.fn(),
      extractResponseText: jest.fn()
    };

    provider = new GeminiProvider({
      client: mockClient,
      defaultModel: 'gemini-1.5-flash'
    });
  });

  test('generates completion successfully', async () => {
    const mockResponse = {
      candidates: [{ content: { parts: [{ text: 'Test response' }] } }]
    };

    mockClient.generateContent.mockResolvedValue(mockResponse);
    mockClient.extractResponseText.mockReturnValue('Test response');

    const result = await provider.generateCompletion('Test prompt');

    expect(result).toBeInstanceOf(AIResponse);
    expect(result.content).toBe('Test response');
    expect(result.provider).toBe('gemini');
  });

  test('throws AIProviderError on failure', async () => {
    mockClient.generateContent.mockRejectedValue(new Error('API error'));

    await expect(provider.generateCompletion('Test prompt'))
      .rejects
      .toThrow(AIProviderError);
  });
});
```

### 7.2 Integration Testing

**Test Scenarios:**
- End-to-end subagent execution
- Tool execution and aggregation
- Caching behavior
- Error handling and recovery
- Trace recording

**Example Integration Test:**

```javascript
describe('Subagent Integration', () => {
  let facade;

  beforeEach(() => {
    facade = new SubAgentFacade({
      aiProvider: new MockAIProvider({ response: 'Mock answer' }),
      toolProviders: [new MockToolProvider({ results: [...] })],
      storage: new InMemoryStorage(),
      trace: new InMemoryTraceProvider()
    });
  });

  test('complete execution flow', async () => {
    const result = await facade.invoke('Test query', {
      agentId: 'webKnowledge'
    });

    expect(result).toBeDefined();
    expect(result.content).toBe('Mock answer');
    expect(result.toolResults).toHaveLength(1);

    const trace = await facade.getTrace(result.id);
    expect(trace.status).toBe('completed');
  });
});
```

### 7.3 Performance Testing

**Metrics to Track:**
- Execution time (end-to-end)
- Tool execution time (individual and aggregate)
- AI provider latency
- Cache hit rate
- Memory usage

**Performance Benchmarks:**

```javascript
describe('Performance', () => {
  test('parallel tool execution is faster than sequential', async () => {
    const sequentialFacade = new SubAgentFacade({
      toolExecution: { mode: 'sequential' }
    });

    const parallelFacade = new SubAgentFacade({
      toolExecution: { mode: 'parallel' }
    });

    const start1 = Date.now();
    await sequentialFacade.invoke('Test query');
    const sequential Time = Date.now() - start1;

    const start2 = Date.now();
    await parallelFacade.invoke('Test query');
    const parallelTime = Date.now() - start2;

    expect(parallelTime).toBeLessThan(sequentialTime);
  });
});
```

---

## 8. Implementation Phases

### Timeline Overview

| Phase | Duration | Description | Deliverables |
|-------|----------|-------------|--------------|
| **Phase 1: Foundation** | 2 weeks | Interfaces, models, infrastructure | Core interfaces, DI container, plugin registry |
| **Phase 2: Providers** | 2 weeks | Implement provider adapters | Gemini, tools, storage providers |
| **Phase 3: Orchestration** | 2 weeks | Refactor orchestrator | New orchestrator, tool executor, prompt builder |
| **Phase 4: Facade** | 1 week | Public API | SubAgentFacade, validators |
| **Phase 5: Testing** | 2 weeks | Comprehensive tests | Unit, integration, performance tests |
| **Phase 6: Migration** | 2 weeks | Gradual migration | Feature flags, adapters, compatibility layer |
| **Phase 7: Documentation** | 1 week | Docs and examples | API docs, migration guide, examples |
| **Phase 8: Cleanup** | 1 week | Remove old code | Delete deprecated code, optimize |

**Total Duration: 13 weeks (~3 months)**

### Phase 1: Foundation (Weeks 1-2)

**Week 1:**
- [ ] Define all interfaces (IAIProvider, IToolProvider, etc.)
- [ ] Create data models (AIResponse, ToolResult, etc.)
- [ ] Build error hierarchy
- [ ] Write interface documentation

**Week 2:**
- [ ] Build plugin registry
- [ ] Build DI container
- [ ] Create structured logger
- [ ] Write unit tests for infrastructure
- [ ] Create examples demonstrating infrastructure usage

**Deliverables:**
- `js/subagent/core/interfaces.js`
- `js/subagent/core/models.js`
- `js/subagent/core/errors.js`
- `js/subagent/core/plugin-registry.js`
- `js/subagent/core/di-container.js`
- `js/subagent/core/logger.js`
- Test suite with 90%+ coverage

### Phase 2: Providers (Weeks 3-4)

**Week 3:**
- [ ] Implement GeminiProvider adapter
- [ ] Implement GroqProvider adapter
- [ ] Implement LocalStorageProvider adapter
- [ ] Create provider base classes
- [ ] Write unit tests for providers

**Week 4:**
- [ ] Migrate Wikipedia tool to provider pattern
- [ ] Migrate Groq tool to provider pattern
- [ ] Migrate DuckDuckGo tool to provider pattern
- [ ] Create tool provider base class
- [ ] Write unit tests for tool providers
- [ ] Test provider interoperability

**Deliverables:**
- `js/subagent/providers/gemini-provider.js`
- `js/subagent/providers/groq-provider.js`
- `js/subagent/providers/localstorage-provider.js`
- `js/subagent/providers/tool-provider-base.js`
- `js/subagent/providers/wikipedia-provider.js`
- Test suite for all providers

### Phase 3: Orchestration (Weeks 5-6)

**Week 5:**
- [ ] Create ExecutionContext
- [ ] Build ToolExecutor with parallel support
- [ ] Build PromptBuilder
- [ ] Build ResultAggregator
- [ ] Write unit tests

**Week 6:**
- [ ] Build SubAgentOrchestratorV2
- [ ] Implement caching layer
- [ ] Implement tracing layer
- [ ] Write integration tests
- [ ] Performance testing and optimization

**Deliverables:**
- `js/subagent/core/execution-context.js`
- `js/subagent/core/tool-executor.js`
- `js/subagent/core/prompt-builder.js`
- `js/subagent/core/result-aggregator.js`
- `js/subagent/core/orchestrator-v2.js`
- Integration test suite

### Phase 4: Facade (Week 7)

**Week 7:**
- [ ] Build SubAgentFacade
- [ ] Build QueryValidator
- [ ] Build ResponseFormatter
- [ ] Create backwards-compatible factory
- [ ] Write comprehensive API tests

**Deliverables:**
- `js/subagent/facade/subagent-facade.js`
- `js/subagent/facade/query-validator.js`
- `js/subagent/facade/response-formatter.js`
- API documentation

### Phase 5: Testing (Weeks 8-9)

**Week 8:**
- [ ] Write missing unit tests
- [ ] Write integration tests
- [ ] Write compatibility tests
- [ ] Achieve 90%+ code coverage

**Week 9:**
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Error scenario testing
- [ ] Cross-browser testing

**Deliverables:**
- Comprehensive test suite
- Performance benchmarks
- Test coverage report

### Phase 6: Migration (Weeks 10-11)

**Week 10:**
- [ ] Create feature flag system
- [ ] Build compatibility layer
- [ ] Create migration helper utilities
- [ ] Test parallel execution (old + new)

**Week 11:**
- [ ] Migrate reasoning processor
- [ ] Migrate UI renderer
- [ ] Migrate window API
- [ ] Run smoke tests

**Deliverables:**
- Migration utilities
- Updated integrations
- Migration guide

### Phase 7: Documentation (Week 12)

**Week 12:**
- [ ] Write API documentation
- [ ] Write architecture guide
- [ ] Write migration guide
- [ ] Create code examples
- [ ] Create video tutorials (optional)

**Deliverables:**
- Complete documentation
- Code examples
- Migration guide

### Phase 8: Cleanup (Week 13)

**Week 13:**
- [ ] Remove old code
- [ ] Clean up adapters
- [ ] Optimize performance
- [ ] Final testing
- [ ] Release v2.0

**Deliverables:**
- Clean codebase
- v2.0 release
- Release notes

---

## 9. Success Criteria

### 9.1 Functional Success Criteria

✅ **Criterion 1: Feature Parity**
- All existing functionality works in new system
- No regressions in behavior
- All tests pass

✅ **Criterion 2: Modularity**
- Can swap AI provider without modifying orchestrator
- Can add new tool without modifying registry core
- Can use custom storage backend via configuration
- All components testable in isolation

✅ **Criterion 3: Reusability**
- Core subagent module usable in other projects
- Zero dependencies on GDRS-specific code (except adapters)
- Can install as npm package
- Works in Node.js and browser

✅ **Criterion 4: Extensibility**
- New tools via plugin registration
- New agents via configuration
- Custom retry strategies via policy injection
- Event hooks at all lifecycle phases

### 9.2 Non-Functional Success Criteria

✅ **Criterion 5: Performance**
- Parallel tool execution reduces total time by 30%+
- Cache hit rate > 20% for repeated queries
- Memory usage < 50MB for typical session
- No memory leaks

✅ **Criterion 6: Reliability**
- 99.9% success rate on valid inputs
- Graceful degradation on tool failures
- Comprehensive error messages
- Automatic retry on transient failures

✅ **Criterion 7: Testability**
- 90%+ code coverage
- All critical paths covered
- Integration tests for all workflows
- Performance benchmarks established

✅ **Criterion 8: Maintainability**
- SOLID principles followed
- DRY principle followed
- Clear separation of concerns
- Comprehensive documentation
- Self-documenting code

### 9.3 Acceptance Criteria

**Before marking refactoring complete:**

1. [ ] All existing test cases pass
2. [ ] New test suite has 90%+ coverage
3. [ ] Performance benchmarks meet targets
4. [ ] All documentation complete
5. [ ] Migration guide reviewed and approved
6. [ ] Code review completed
7. [ ] Backwards compatibility verified
8. [ ] Production smoke tests pass
9. [ ] No critical bugs outstanding
10. [ ] Team sign-off obtained

---

## 10. Risks and Mitigation

### 10.1 Technical Risks

#### Risk 1: Breaking Changes
**Probability:** MEDIUM
**Impact:** HIGH
**Mitigation:**
- Maintain strict backwards compatibility during migration
- Use feature flags for gradual rollout
- Extensive compatibility testing
- Provide migration utilities

#### Risk 2: Performance Degradation
**Probability:** LOW
**Impact:** HIGH
**Mitigation:**
- Performance benchmarks before and after
- Profile code for bottlenecks
- Optimize critical paths
- Parallel tool execution for speed gains

#### Risk 3: Increased Complexity
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Comprehensive documentation
- Code examples for common tasks
- Clear architecture diagrams
- Developer training sessions

#### Risk 4: Integration Issues
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Integration tests from day one
- Test with actual GDRS components
- Gradual integration, not big bang
- Rollback plan ready

### 10.2 Project Risks

#### Risk 5: Timeline Overrun
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Phase-based delivery
- Prioritize core features
- Regular progress reviews
- Buffer time built into estimate

#### Risk 6: Scope Creep
**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Clear requirements document (this plan)
- Change control process
- Regular stakeholder communication
- Defer nice-to-haves to v2.1

#### Risk 7: Resource Availability
**Probability:** LOW
**Impact:** HIGH
**Mitigation:**
- Single developer can execute most phases
- Documentation enables knowledge transfer
- Modular approach allows parallel work
- Open source community contributions welcome

---

## 11. Future Enhancements (Post-v2.0)

### 11.1 Streaming Support
- Real-time result streaming
- Progressive tool result updates
- Cancellable operations

### 11.2 Multi-Agent Collaboration
- Agents can invoke other agents
- Parallel agent execution
- Agent result aggregation

### 11.3 Advanced Caching
- Semantic caching (similar queries)
- Distributed caching (Redis, Memcached)
- Cache warming strategies

### 11.4 Cost Tracking
- Track API usage costs
- Set budget limits
- Cost optimization recommendations

### 11.5 A/B Testing
- Compare different AI providers
- Test prompt variations
- Measure effectiveness

### 11.6 Plugin Marketplace
- Discover community tools
- Install tools via URL
- Tool ratings and reviews

---

## 12. Conclusion

This improvement plan transforms the subagent system from a functional but tightly-coupled implementation into a **world-class, modular, reusable architecture**.

### Key Outcomes

1. **Modularity Achieved**
   - Every component independently replaceable
   - Clear interfaces and contracts
   - Plugin-based extensibility

2. **Reusability Enabled**
   - Portable to any JavaScript project
   - Zero framework dependencies
   - NPM installable

3. **Maintainability Improved**
   - Clear separation of concerns
   - Comprehensive test coverage
   - Excellent documentation

4. **Developer Experience Enhanced**
   - Easy to test
   - Easy to extend
   - Easy to understand

### Next Steps

1. **Review this plan** - Ensure all stakeholders agree
2. **Approve for implementation** - Get sign-off to proceed
3. **Begin Phase 1** - Start with interfaces and infrastructure
4. **Regular check-ins** - Weekly progress reviews
5. **Iterate as needed** - Adjust based on learnings

This plan is a **living document** and should be updated as implementation progresses and requirements evolve.

---

**End of Improvement Plan**
