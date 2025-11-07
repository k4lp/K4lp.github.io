# GDRS - Gemini Deep Research System

An advanced AI research assistant with autonomous reasoning, code execution, persistent memory, and LLM-verified output generation.

## Core Capabilities

1. **Unlimited Iteration** - The LLM can iterate indefinitely to solve complex problems
2. **Code Execution** - Full JavaScript execution environment with internet access via fetch API
3. **Persistent Knowledge** - Memory, Tasks, Goals, and Vault storage systems
4. **LLM Verification** - Final outputs are verified by the LLM for quality and correctness
5. **Strategic Reasoning** - Deep analysis, systematic planning, evidence-based conclusions

## Architecture

### Execution Layer

**ExecutionRunner** (`js/execution/execution-runner.js`)
- Manages code execution with timeout protection
- Injects runtime APIs (vault, memory, tasks, goals, utils)
- Uses state machine for execution lifecycle tracking

**ExecutionManager** (`js/execution/execution-manager.js`)
- Queues and coordinates code execution requests
- Ensures serial execution with proper error handling

**ConsoleCapture** (`js/execution/console-capture.js`)
- Captures all console output during execution
- Properly serializes Error objects (name, message, stack)

### Reasoning Layer

**ReasoningEngine** (`js/reasoning/reasoning-engine.js`)
- Orchestrates LLM prompt construction
- Integrates system prompt, context, and iteration state

**Tool Processors** (`js/reasoning/tools/processors/`)
- Parse and execute LLM tool calls (memory, tasks, goals, vault, code)
- Process final output through verification pipeline

### Storage Layer

**Storage** (`js/storage/storage.js`)
- Unified interface for localStorage operations
- Manages Memory, Tasks, Goals, Vault, Final Output

**VaultManager** (`js/storage/vault-manager.js`)
- Manages vault entries (data, code, text)
- Validates vault integrity

**VaultResolutionService** (`js/storage/vault-resolution-service.js`)
- Resolves vault references in content
- Returns structured results with validation data
- Tracks missing/errored references

### Validation & Verification Layer

**ContentValidator** (`js/validation/content-validator.js`)
- Extensible validation framework
- Built-in validators: vault references, content size
- Returns structured validation results

**LLMVerificationService** (`js/verification/llm-verification-service.js`)
- TRUE VERIFICATION: Sends final output back to LLM
- LLM checks for discrepancies, completeness, accuracy
- Only marks verified if LLM confirms correctness

### Final Output Processing

**Old Flow (WRONG):**
```
Generate → Save → Mark verified=true
```
Problem: "Verified" just meant "saved successfully", not actually verified

**New Flow (CORRECT):**
```
1. Generate final output
2. Resolve vault references (VaultResolutionService)
3. Validate content (ContentValidator)
4. LLM verification (LLMVerificationService)
5. Save ONLY if all steps pass
```

`finalOutputProcessorV2` implements this properly:
- Structured vault resolution with error tracking
- Content validation against quality criteria
- LLM reviews output for discrepancies
- Fails fast with detailed error reporting

### Control Layer

**LoopController** (`js/control/loop-controller.js`)
- Main reasoning loop orchestration
- Iteration management and health monitoring
- Session lifecycle control

## LLM Tool System

The LLM uses these tools within `{{<reasoning_text>}}...{{</reasoning_text>}}` blocks:

### Storage Tools

**Memory** - Store key insights and findings
```
{{<memory identifier="id" heading="Title" content="Data" notes="Notes" />}}
```

**Tasks** - Track work items with status
```
{{<task identifier="id" heading="Title" content="Description" status="pending|ongoing|finished|paused" />}}
```

**Goals** - Define success criteria
```
{{<goal identifier="id" heading="Criteria" content="Objectives" />}}
```

**DataVault** - Store complex/reusable data
```
{{<datavault id="id" type="data|code|text" description="What this contains">}}
[Content here]
{{</datavault>}}
```

### Execution Tools

**JavaScript Execution** - Run code with full capabilities
```
{{<js_execute>}}
// Full JavaScript + fetch API
// Access to vault, memory, tasks, goals, utils APIs
{{</js_execute>}}
```

**Final Output** - Deliver results to user
```
{{<final_output>}}
[Comprehensive findings and analysis]
{{</final_output>}}
```

## Runtime APIs (Available in Code)

When code executes via `{{<js_execute>}}`, these APIs are injected:

**vault** - Programmatic vault access
- `vault.get(id)` - Get vault entry content
- `vault.set(id, content, {type, description})` - Create/update
- `vault.delete(id)` - Delete entry
- `vault.list({type})` - List entries
- `vault.search(query)` - Search entries

**memory** - Programmatic memory access
- `memory.get(id)` - Get memory entry
- `memory.set(id, content, heading, notes)` - Create/update
- `memory.list()` - List all entries

**tasks** - Programmatic task management
- `tasks.get(id)` - Get task
- `tasks.set(id, {heading, content, status, notes})` - Create/update
- `tasks.setStatus(id, status)` - Update status
- `tasks.list({status})` - List tasks

**goals** - Programmatic goal management
- `goals.get(id)` - Get goal
- `goals.set(id, {heading, content, notes})` - Create/update
- `goals.list()` - List goals

**utils** - Utility functions
- `utils.generateId(prefix)` - Generate unique ID
- `utils.now()` - Get ISO timestamp
- `utils.sleep(ms)` - Async sleep

## Key Files

```
index.html                                   # Main application
js/
├── api/
│   ├── gemini-client.js                    # Gemini API client
│   └── key-manager.js                      # API key management
├── control/
│   └── loop-controller.js                  # Main reasoning loop
├── execution/
│   ├── execution-runner.js                 # Code execution engine
│   ├── execution-manager.js                # Execution coordination
│   ├── console-capture.js                  # Console output capture
│   └── execution-context-api.js            # Runtime API injection
├── reasoning/
│   ├── reasoning-engine.js                 # Prompt construction
│   └── tools/processors/
│       ├── final-output-processor-v2.js    # Verified output processing
│       ├── js-execute-processor.js         # Code execution processor
│       ├── memory-processor.js             # Memory tool processor
│       ├── tasks-processor.js              # Tasks tool processor
│       ├── goals-processor.js              # Goals tool processor
│       └── vault-processor.js              # Vault tool processor
├── storage/
│   ├── storage.js                          # Unified storage interface
│   ├── vault-manager.js                    # Vault operations
│   └── vault-resolution-service.js         # Structured vault resolution
├── validation/
│   └── content-validator.js                # Extensible validation framework
├── verification/
│   └── llm-verification-service.js         # LLM-based verification
├── utils/
│   └── vault-reference-resolver.js         # Vault reference resolution
└── config/
    ├── app-config.js                       # System prompt & settings
    └── storage-config.js                   # Storage keys & defaults
```

## System Prompt

The LLM operates under a comprehensive system prompt (`js/config/app-config.js`) that defines:
- Unlimited iteration capability
- Tool usage patterns and syntax
- Reasoning principles and methodology
- Task/goal/memory management guidelines
- Code execution capabilities
- Final output requirements

## Verification Process

When LLM generates final output:

1. **Extract** - System extracts HTML content from `{{<final_output>}}` block
2. **Resolve** - VaultResolutionService resolves all `{{<vaultref id="..." />}}` references
3. **Validate** - ContentValidator checks for missing refs, content quality
4. **Verify** - LLMVerificationService sends to LLM with context:
   - Original user query
   - Generated output
   - All vault/memory/task/goal data
   - LLM checks for discrepancies, completeness, accuracy
5. **Save** - ONLY saved as verified if LLM confirms correctness

## Error Handling

- **Structured Results** - All services return detailed result objects
- **Fail-Fast** - Processing stops at first critical error
- **Detailed Logging** - Every step logged with timestamps
- **Error Serialization** - Proper Error object serialization (name, message, stack)

## Development

The system is built with:
- Vanilla JavaScript (ES6 modules)
- No build process required
- Direct browser execution
- localStorage for persistence
- Gemini API for LLM capabilities

## Architecture Principles

1. **Separation of Concerns** - Resolution, validation, verification are separate
2. **Single Responsibility** - Each service has one clear purpose
3. **Structured Results** - No lossy data transformations
4. **Fail-Fast** - Errors caught and reported immediately
5. **Extensibility** - Validators and processors are pluggable
6. **Composability** - Services compose into complete pipelines
