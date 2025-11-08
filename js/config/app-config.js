/**
 * Application Configuration
 *
 * Core application settings, limits, and the system prompt
 */

/**
 * Application version
 */
export const VERSION = '1.1.4';

/**
 * Maximum number of reasoning iterations per session
 */
export const MAX_ITERATIONS = 2000;

/**
 * Delay between iterations in milliseconds
 */
export const ITERATION_DELAY = 200;

/**
 * Maximum retry attempts for failed API calls
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Delay before retrying after empty response (milliseconds)
 */
export const EMPTY_RESPONSE_RETRY_DELAY = 1000;

/**
 * INTELLIGENT SYSTEM PROMPT - STREAMLINED
 *
 * Defines the behavior, capabilities, and tool usage for the GDRS reasoning engine.
 */
export const SYSTEM_PROMPT = `# GEMINI DEEP RESEARCH SYSTEM - INTELLIGENT REASONING ENGINE

You are the cognitive core of GDRS, an advanced research assistant with strategic thinking, unlimited code execution, persistent knowledge management, and programmatic storage access. Operate with disciplined analysis, explicit planning, and tool-driven execution.
You operate under strict principle of iterations. Never ever even try to solve one thing in a single reply. 

## OPERATING GUARANTEES

- Controller allows up to 2000 reasoning iterations per session; treat this as effectively unlimited and continue iterating until every requirement is satisfied and verified.
- Every iteration must run inside exactly one \`{{<reasoning_text>}}...{{</reasoning_text>}}\` wrapper that contains concise reasoning plus any tool calls. The final response must be emitted separately through \`{{<final_output>}}\`.
- You have unrestricted JavaScript execution (fetch/network access, async/await, console logging). Prefer running JS to compute the true value whenever a fact can be validated computationally.
- Storage constructs (tasks, goals, memory, vault) persist between iterations. Use them aggressively so each reasoning block can stay small and focused on the single task you are currently solving.
- \`attachments.*\` exposes the in-memory Excel workbook: \`getOriginal()\` is read-only, \`getWorkingCopy()\` returns a fresh clone, and \`updateSheet()\` / \`resetWorkingCopy()\` mutate only the runtime copy (no guardrails beyond upload size).
- The system promotes deep tool usage and longer analytical runs, but you m2025-11-08T19:19:57.573Z] Stage 5/6: Processing 'jsExecute' - 1 operation(s)
tool-operation-pipeline.js:50 [2025-11-08T19:19:57.573Z] Committing dirty entities before stage 5...
tool-operation-pipeline.js:53 [2025-11-08T19:19:57.573Z] Entities committed
modular-system-init.js:68 [ExecutionState] pending -> preparing
console-capture.js:42 [ExecutionState] preparing -> executing
console-capture.js:42 Attempting to access attachments...
console-capture.js:42 Error accessing original attachment: attachments is not defined
console.<computed> @ console-capture.js:42
eval @ VM5291:21
eval @ VM5291:50
eval @ VM5291:51
_executeWithTimeout @ execution-runner.js:143
run @ execution-runner.js:53
execute @ retry-execution-strategy.js:72
await in execute
_drain @ execution-manager.js:138
await in _drain
enqueue @ execution-manager.js:79
executeCode @ js-executor.js:36
process @ js-execute-processor.js:11
run @ tool-operation-pipeline.js:57
await in run
applyOperations @ parser-appliers.js:58
runIteration @ loop-controller.js:309
await in runIteration
(anonymous) @ loop-controller.js:109
setTimeout
startSession @ loop-controller.js:109
(anonymous) @ handler-session.js:30Understand this error
console-capture.js:42 Error accessing working copy attachment: attachments is not defined
console.<computed> @ console-capture.js:42
eval @ VM5291:34
eval @ VM5291:50
eval @ VM5291:51
_executeWithTimeout @ execution-runner.js:143
run @ execution-runner.js:53
execute @ retry-execution-strategy.js:72
await in execute
_drain @ execution-manager.js:138
await in _drain
enqueue @ execution-manager.js:79
executeCode @ js-executor.js:36
process @ js-execute-processor.js:11
run @ tool-operation-pipeline.js:57
await in run
applyOperations @ parser-appliers.js:58
runIteration @ loop-controller.js:309
await in runIteration
(anonymous) @ loop-controller.js:109
setTimeout
startSession @ loop-controller.js:109
(anonymous) @ handler-session.js:30Understand this error
console-capture.js:42 No attachment found after trying all methods.
console-capture.js:42 [ExecutionState] executing -> completed
tool-operation-pipeline.js:59 [2025-11-08T19:19:57.581Z] Stage 5/6 completed
tool-operation-pipeline.js:46 [2025-11-08T19:19:57.581Z] Stage 6/6: Processing 'finalOutput' - 0 operation(s)
final-output-processor-v2.js:26 [2025-11-08T19:19:57.581Z] finalOutputProcessorV2 - No operations to process
tool-operation-pipeline.js:59 [2025-11-08T19:19:57.581Z] Stage 6/6 completed
tool-operation-pipeline.js:70 [2025-11-08T19:19:57.581Z] Pipeline duration: 9ms
tool-operation-pipeline.js:74 [2025-11-08T19:19:57.581Z] Emitting UI refresh...
tool-operation-pipeline.js:76 [2025-11-08T19:19:57.590Z] UI refresh emitted
tool-operation-pipeline.js:79 [2025-11-08T19:19:57.591Z] ToolOperationPipeline.run() completed
parser-appliers.js:60 [2025-11-08T19:19:57.591Z] applyOperations() completed
loop-controller.js:311 [2025-11-08T19:19:57.591Z] Operations applied - Duration: 9ms
storage.js:254 [2025-11-08T19:19:57.591Z] ========== Storage.isFinalOutputVerified() CALLED ==========
storage.js:255 [2025-11-08T19:19:57.591Z] Call stack:     at Object.isFinalOutputVerified (https://k4lp.github.io/js/storage/storage.js:255:47) <<     at runIteration (https://k4lp.github.io/js/control/loop-controller.js:316:34)
storage.js:258 [2025-11-08T19:19:57.591Z] Reading localStorage['gdrs_final_output_verified']
storage.js:259 [2025-11-08T19:19:57.591Z] Value: 'null' (type: object, null: true)
storage.js:262 [2025-11-08T19:19:57.591Z] Comparison logic: 'null' === 'true' => false
storage.js:266 [2025-11-08T19:19:57.591Z] Reading localStorage['gdrs_final_output'] for additional context
storage.js:270 [2025-11-08T19:19:57.591Z] FINAL_OUTPUT object exists in storage:
storage.js:271    - timestamp: 2025-11-08T19:19:46.659Z
storage.js:272    - verified field: false (type: boolean)
storage.js:273    - source: auto
storage.js:274    - html exists: false, length: 0 chars
storage.js:282 [2025-11-08T19:19:57.591Z] ========== Storage.isFinalOutputVerified() RETURNING: false ==========
storage.js:254 [2025-11-08T19:19:57.592Z] ========== Storage.isFinalOutputVerified() CALLED ==========
storage.js:255 [2025-11-08T19:19:57.592Z] Call stack:     at Object.isFinalOutputVerified (https://k4lp.github.io/js/storage/storage.js:255:47) <<     at runIteration (https://k4lp.github.io/js/control/loop-controller.js:463:40)
storage.js:258 [2025-11-08T19:19:57.592Z] Reading localStorage['gdrs_final_output_verified']
storage.js:259 [2025-11-08T19:19:57.592Z] Value: 'null' (type: object, null: true)
storage.js:262 [2025-11-08T19:19:57.592Z] Comparison logic: 'null' === 'true' => false
storage.js:266 [2025-11-08T19:19:57.592Z] Reading localStorage['gdrs_final_output'] for additional context
storage.js:270 [2025-11-08T19:19:57.592Z] FINAL_OUTPUT object exists in storage:
storage.js:271    - timestamp: 2025-11-08T19:19:46.659Z
storage.js:272    - verified field: false (type: boolean)
storage.js:273    - source: auto
storage.js:274    - html exists: false, length: 0 chars
storage.js:282 [2025-11-08T19:19:57.593Z] ========== Storage.isFinalOutputVerified() RETURNING: false ==========
loop-controller.js:464 [2025-11-08T19:19:57.592Z] POST-ITERATION VERIFICATION CHECK - Result: false
loop-controller.js:474 [2025-11-08T19:19:57.593Z] Goals completion check - Result: false
loop-controller.js:490 [2025-11-08T19:19:57.593Z] ========== ITERATION 1 END ==========
loop-controller.js:491 [2025-11-08T19:19:57.593Z] Scheduling next iteration in 200ms...
loop-controller.js:202 [2025-11-08T19:19:58.777Z] ========== ITERATION 2 START ==========
storage.js:254 [2025-11-08T19:19:58.778Z] ========== Storage.isFinalOutputVerified() CALLED ==========
storage.js:255 [2025-11-08T19:19:58.778Z] Call stack:     at Object.isFinalOutputVerified (https://k4lp.github.io/js/storage/storage.js:255:47) <<     at runIteration (https://k4lp.github.io/js/control/loop-controller.js:207:32)
storage.js:258 [2025-11-08T19:19:58.778Z] Reading localStorage['gdrs_final_output_verified']
storage.js:259 [2025-11-08T19:19:58.778Z] Value: 'null' (type: object, null: true)
storage.js:262 [2025-11-08T19:19:58.778Z] Comparison logic: 'null' === 'true' => false
storage.js:266 [2025-11-08T19:19:58.779Z] Reading localStorage['gdrs_final_output'] for additional context
storage.js:270 [2025-11-08T19:19:58.779Z] FINAL_OUTPUT object exists in storage:
storage.js:271    - timestamp: 2025-11-08T19:19:46.659Z
storage.js:272    - verified field: false (type: boolean)
storage.js:273    - source: auto
storage.js:274    - html exists: false, length: 0 chars
storage.js:282 [2025-11-08T19:19:58.779Z] ========== Storage.isFinalOutputVerified() RETURNING: false ==========
loop-controller.js:208 [2025-11-08T19:19:58.778Z] PRE-ITERATION VERIFICATION CHECK - Result: false
loop-controller.js:218 [2025-11-08T19:19:58.779Z] Building context prompt...
reasoning-engine.js:43 [2025-11-08T19:19:58.779Z] ReasoningEngine.buildContextPrompt() called
reasoning-engine.js:44 [2025-11-08T19:19:58.779Z] Parameters: query length=388, iteration=2, maxIterations=2000
reasoning-engine.js:54 [2025-11-08T19:19:58.780Z] Prompt built - Final length: 18268 chars
reasoning-engine.js:55 [2025-11-08T19:19:58.780Z] Prompt includes: System prompt, Instructions, Query, Iteration=2/2000
loop-controller.js:221 [2025-11-08T19:19:58.780Z] Prompt built - 18268 chars
loop-controller.js:224 [2025-11-08T19:19:58.781Z] Calling Gemini API with model: models/gemini-2.5-flash...
gemini-client.js:50 [2025-11-08T19:19:58.781Z] GeminiAPI.generateContent() starting...
gemini-client.js:58 [2025-11-08T19:19:58.781Z] Retry attempt 1/3
gemini-client.js:67 [2025-11-08T19:19:58.781Z] Found 24 available key(s)
gemini-client.js:76 [2025-11-08T19:19:58.781Z] Attempting with key #1 (key 1/24, attempt 1/3)
gemini-client.js:83 [2025-11-08T19:19:58.781Z] Making API request...
gemini-client.js:134 [2025-11-08T19:19:58.781Z] makeRequest() - Model: models/gemini-2.5-flash, Prompt length: 18268 chars
gemini-client.js:137 [2025-11-08T19:19:58.781Z] Config - maxOutputTokens: 65536
gemini-client.js:170 [2025-11-08T19:19:58.781Z] Sending fetch request to Gemini API...
gemini-client.js:181 [2025-11-08T19:20:05.027Z] Fetch completed - Status: 200
gemini-client.js:200 [2025-11-08T19:20:05.028Z] Parsing JSON response...
gemini-client.js:202 [2025-11-08T19:20:05.029Z] JSON parsed successfully
gemini-client.js:226 [2025-11-08T19:20:05.029Z] Valid response received - Text length: 1993 chars
gemini-client.js:88 [2025-11-08T19:20:05.029Z] Success with key #1
gemini-client.js:52 [2025-11-08T19:20:05.029Z] GeminiAPI.generateContent() completed
loop-controller.js:227 [2025-11-08T19:20:05.029Z] API call completed
loop-controller.js:230 [2025-11-08T19:20:05.029Z] Extracting response text from API response...
loop-controller.js:237 [2025-11-08T19:20:05.029Z] Response extracted: 1993 chars
loop-controller.js:238 [2025-11-08T19:20:05.030Z] Response metadata - Contains <final_output>: true, Contains <js_execute>: false
loop-controller.js:246 [2025-11-08T19:20:05.030Z] Extracting reasoning blocks...
loop-controller.js:257 [2025-11-08T19:20:05.035Z] Saved 1 reasoning block(s)
loop-controller.js:264 [2025-11-08T19:20:05.036Z] Parsing operations from entire response...
parser-core.js:59 [2025-11-08T19:20:05.036Z] ReasoningParser.parseOperations() - Input length: 1993 chars
parser-core.js:64 [2025-11-08T19:20:05.036Z] Extracted tool operations - memory: 0, task: 1, goal: 0, datavault: 0, js_execute: 0, final_output: 1
parser-core.js:84 [2025-11-08T19:20:05.036Z] Operations translated to normalized format
loop-controller.js:267 [2025-11-08T19:20:05.036Z] Operations parsed - jsExecute: 0, finalOutput: 1, vault: 0, tasks: 1, goals: 0, memories: 0
loop-controller.js:270 [2025-11-08T19:20:05.036Z] ========== PARSED OPERATIONS METADATA ==========
loop-controller.js:278 [2025-11-08T19:20:05.036Z] **FINAL OUTPUT DETECTED** - 1 operation(s)
loop-controller.js:280    [0] HTML length: 1353 chars, Type: string, Is empty: false
loop-controller.js:292 [2025-11-08T19:20:05.036Z] Task Operations: 1 operation(s)
loop-controller.js:300 [2025-11-08T19:20:05.036Z] ========== END OF OPERATIONS METADATA ==========
loop-controller.js:304 [2025-11-08T19:20:05.036Z] API Access Tracker reset for iteration 2
loop-controller.js:308 [2025-11-08T19:20:05.037Z] Applying operations...
parser-appliers.js:49 [2025-11-08T19:20:05.037Z] applyOperations() called
parser-appliers.js:56 [2025-11-08T19:20:05.037Z] Operations normalized - Total: 2 (vault: 0, memories: 0, tasks: 1, goals: 0, jsExecute: 0, finalOutput: 1)
tool-operation-pipeline.js:24 [2025-11-08T19:20:05.037Z] ToolOperationPipeline.run() starting - 6 stage(s)
tool-operation-pipeline.js:46 [2025-11-08T19:20:05.037Z] Stage 1/6: Processing 'vault' - 0 operation(s)
tool-operation-pipeline.js:59 [2025-11-08T19:20:05.037Z] Stage 1/6 completed
tool-operation-pipeline.js:46 [2025-11-08T19:20:05.037Z] Stage 2/6: Processing 'memory' - 0 operation(s)
tool-operation-pipeline.js:59 [2025-11-08T19:20:05.037Z] Stage 2/6 completed
tool-operation-pipeline.js:46 [2025-11-08T19:20:05.037Z] Stage 3/6: Processing 'tasks' - 1 operation(s)
tool-operation-pipeline.js:59 [2025-11-08T19:20:05.038Z] Stage 3/6 completed
tool-operation-pipeline.js:46 [2025-11-08T19:20:05.038Z] Stage 4/6: Processing 'goals' - 0 operation(s)
tool-operation-pipeline.js:59 [2025-11-08T19:20:05.038Z] Stage 4/6 completed
tool-operation-pipeline.js:46 [2025-11-08T19:20:05.038Z] Stage 5/6: Processing 'jsExecute' - 0 operation(s)
tool-operation-pipeline.js:50 [2025-11-08T19:20:05.038Z] Committing dirty entities before stage 5...
tool-operation-pipeline.js:53 [2025-11-08T19:20:05.038Z] Entities committed
tool-operation-pipeline.js:59 [2025-11-08T19:20:05.038Z] Stage 5/6 completed
tool-operation-pipeline.js:46 [2025-11-08T19:20:05.038Z] Stage 6/6: Processing 'finalOutput' - 1 operation(s)
final-output-processor-v2.js:30 [2025-11-08T19:20:05.038Z] ========== FINAL OUTPUT PROCESSING V2 ==========
final-output-processor-v2.js:31 [2025-11-08T19:20:05.038Z] Processing 1 final output operation(s)
final-output-processor-v2.js:39 [2025-11-08T19:20:05.038Z] ========== Operation 1/1 ==========
final-output-processor-v2.js:40 [2025-11-08T19:20:05.038Z] Input length: 1353 chars
final-output-processor-v2.js:52 [2025-11-08T19:20:05.039Z] STEP 1: Resolving vault references...
vault-resolution-service.js:191 [2025-11-08T19:20:05.039Z] [FinalOutput] ✓ Resolution successful, 0 resolved
final-output-processor-v2.js:64 [2025-11-08T19:20:05.039Z] Vault resolution successful - 1353 chars
final-output-processor-v2.js:67 [2025-11-08T19:20:05.039Z] STEP 2: Validating content...
final-output-processor-v2.js:71 [2025-11-08T19:20:05.040Z] Content validation: valid
final-output-processor-v2.js:89 [2025-11-08T19:20:05.040Z] STEP 3: Sending to LLM for verification...
llm-verification-service.js:45 [2025-11-08T19:20:05.040Z] [LLMVerification] Sending output to LLM for verification...
llm-verification-service.js:46 [2025-11-08T19:20:05.040Z] [LLMVerification] Output length: 1353 chars
llm-verification-service.js:47 [2025-11-08T19:20:05.040Z] [LLMVerification] Prompt length: 3371 chars
llm-verification-service.js:71 [2025-11-08T19:20:05.040Z] [LLMVerification] Using model: models/gemini-2.5-flash (gemini-2.5-flash)
gemini-client.js:50 [2025-11-08T19:20:05.040Z] GeminiAPI.generateContent() starting...
gemini-client.js:58 [2025-11-08T19:20:05.040Z] Retry attempt 1/3
gemini-client.js:67 [2025-11-08T19:20:05.041Z] Found 24 available key(s)
gemini-client.js:76 [2025-11-08T19:20:05.041Z] Attempting with key #1 (key 1/24, attempt 1/3)
gemini-client.js:83 [2025-11-08T19:20:05.041Z] Making API request...
gemini-client.js:134 [2025-11-08T19:20:05.041Z] makeRequest() - Model: models/gemini-2.5-flash, Prompt length: 3371 chars
gemini-client.js:137 [2025-11-08T19:20:05.041Z] Config - maxOutputTokens: 65536
gemini-client.js:170 [2025-11-08T19:20:05.041Z] Sending fetch request to Gemini API...
gemini-client.js:181 [2025-11-08T19:20:11.483Z] Fetch completed - Status: 200
gemini-client.js:200 [2025-11-08T19:20:11.483Z] Parsing JSON response...
gemini-client.js:202 [2025-11-08T19:20:11.484Z] JSON parsed successfully
gemini-client.js:226 [2025-11-08T19:20:11.484Z] Valid response received - Text length: 514 chars
gemini-client.js:88 [2025-11-08T19:20:11.484Z] Success with key #1
gemini-client.js:52 [2025-11-08T19:20:11.484Z] GeminiAPI.generateContent() completed
llm-verification-service.js:74 [2025-11-08T19:20:11.484Z] [LLMVerification] Received LLM response, extracting text...
llm-verification-service.js:83 [2025-11-08T19:20:11.484Z] [LLMVerification] Response text length: 514 chars
llm-verification-service.js:90 [2025-11-08T19:20:11.485Z] [LLMVerification] Verification PASSED
final-output-processor-v2.js:99 [2025-11-08T19:20:11.485Z] LLM Verification: PASSED
final-output-processor-v2.js:100 [2025-11-08T19:20:11.485Z] Confidence: 100%
final-output-processor-v2.js:115 [2025-11-08T19:20:11.485Z] STEP 4: Saving verified final output...
storage.js:215 [2025-11-08T19:20:11.485Z] ========== Storage.saveFinalOutput() CALLED ==========
storage.js:216 [2025-11-08T19:20:11.485Z] PARAMETERS:
storage.js:217    - htmlString: provided, length: 1353 chars, type: string
storage.js:218    - verified: true (type: boolean, truthy: true)
storage.js:219    - source: 'llm'
storage.js:229 [2025-11-08T19:20:11.486Z] Serialized output object - length: 1459 chars
storage.js:230 [2025-11-08T19:20:11.486Z] Writing to localStorage key: 'gdrs_final_output'
storage.js:232 [2025-11-08T19:20:11.486Z] localStorage.setItem() completed
storage.js:235 [2025-11-08T19:20:11.486Z] Checking if verification flag should be set: verified = true, if(verified) = true
storage.js:237 [2025-11-08T19:20:11.486Z] CONDITION MET - verified is truthy
storage.js:238 [2025-11-08T19:20:11.486Z] Setting localStorage['gdrs_final_output_verified'] = 'true'
storage.js:241 [2025-11-08T19:20:11.486Z] VERIFICATION FLAG SET SUCCESSFULLY - Readback: 'true' (type: string)
storage.js:247 [2025-11-08T19:20:11.486Z] Emitting event 'final-output:updated'
storage.js:249 [2025-11-08T19:20:11.487Z] ========== Storage.saveFinalOutput() COMPLETE ==========
final-output-processor-v2.js:119 [2025-11-08T19:20:11.487Z] STEP 5: Logging verification results...
final-output-processor-v2.js:156 [2025-11-08T19:20:11.487Z] ========== Operation 1 COMPLETED SUCCESSFULLY ==========
final-output-processor-v2.js:203 [2025-11-08T19:20:11.487Z] ========== FINAL OUTPUT PROCESSING COMPLETE ==========
final-output-processor-v2.js:204 [2025-11-08T19:20:11.487Z] Processed 1 operation(s)
tool-operation-pipeline.js:59 [2025-11-08T19:20:11.487Z] Stage 6/6 completed
tool-operation-pipeline.js:70 [2025-11-08T19:20:11.488Z] Pipeline duration: 6451ms
tool-operation-pipeline.js:74 [2025-11-08T19:20:11.488Z] Emitting UI refresh...
tool-operation-pipeline.js:76 [2025-11-08T19:20:11.497Z] UI refresh emitted
tool-operation-pipeline.js:79 [2025-11-08T19:20:11.497Z] ToolOperationPipeline.run() completed
parser-appliers.js:60 [2025-11-08T19:20:11.498Z] applyOperations() completed
loop-controller.js:311 [2025-11-08T19:20:11.498Z] Operations applied - Duration: 6451ms
storage.js:254 [2025-11-08T19:20:11.498Z] ========== Storage.isFinalOutputVerified() CALLED ==========
storage.js:255 [2025-11-08T19:20:11.498Z] Call stack:     at Object.isFinalOutputVerified (https://k4lp.github.io/js/storage/storage.js:255:47) <<     at runIteration (https://k4lp.github.io/js/control/loop-controller.js:316:34)
storage.js:258 [2025-11-08T19:20:11.498Z] Reading localStorage['gdrs_final_output_verified']
storage.js:259 [2025-11-08T19:20:11.498Z] Value: 'true' (type: string, null: false)
storage.js:262 [2025-11-08T19:20:11.498Z] Comparison logic: 'true' === 'true' => true
storage.js:266 [2025-11-08T19:20:11.498Z] Reading localStorage['gdrs_final_output'] for additional context
storage.js:270 [2025-11-08T19:20:11.498Z] FINAL_OUTPUT object exists in storage:
storage.js:271    - timestamp: 2025-11-08T19:20:11.485Z
storage.js:272    - verified field: true (type: boolean)
storage.js:273    - source: llmust still execute one prioritized task at a time: finish, verify, and document before moving to the next.

## STRATEGIC MINDSET

0. Iterate over the problem and output a reasoning block which should contain how are you going to divide the tasks and goals and create memories for important data from the user query.
1. **Deep Analysis First** - Clarify intent, scope, constraints, and success criteria before taking action.
2. **Structured Decomposition** - Break the problem into explicit tasks with measurable deliverables and create strategic goals that describe success/validation.
3. **Single-Task Focus** - Select the most critical pending/ongoing task, advance it with concrete work, and update its status/notes before picking another.
4. **Evidence Pipeline** - For every claim or result, plan how you will verify it (preferably via JS execution) and capture proof before reporting.
5. **Context Stewardship** - Keep the reasoning block concise; move detailed findings into Memory, Tasks, Goals, or the DataVault so context stays organized and lightweight.

## VERIFICATION & EVIDENCE PROTOCOL

- Follow the loop: *Plan -> Execute (JS/tool) -> Verify -> Store -> Decide next step*.
- Use JS code execution to recompute, test, simulate, or fetch data whenever possible; never rely on guesswork when computation is available.
- Document verification outcomes inside task notes, memory entries, or vault items so later iterations can reference them directly.
- Cross-check final answers against success criteria/goals before calling \`{{<final_output>}}\`.

## TASK & GOAL LIFECYCLE

- Create tasks as soon as you identify discrete workstreams; include heading, purpose, and completion criteria. Status must progress \`pending -> ongoing -> finished\` (or \`paused\` when blocked).
- Only run one task at a time. If new work appears, enqueue it as a new task instead of context-switching silently.
- Goals capture strategic success criteria and validation checkpoints. Update them when requirements evolve and reference them when verifying completion.
- Use Memory for durable context (insights, assumptions, constraints) and the DataVault for bulky artefacts (datasets, code, transcripts) so tasks/goals stay lean.

## TOOLING PROTOCOL (MARKUP)

### Reasoning Wrapper
All reasoning and tool invocations **must** be enclosed in a single \`{{<reasoning_text>}}...{{</reasoning_text>}}\` block per iteration. Keep the prose short, factual, and oriented around the currently active task.

### Memory Tool
- **Format**: \`{{<memory identifier="id" heading="Title" content="Details" notes="Optional" />}}\`
- **Operations**: Create/update by repeating the same identifier with new content; add \`delete\` to remove.
- **Use Cases**: Key findings, constraints, derived formulas, decisions needed later.

### Task Tool
- **Format**: \`{{<task identifier="task_id" heading="Title" content="Work description" status="pending|ongoing|finished|paused" notes="Progress" />}}\`
- **Operations**: Create/update via the same identifier; include status transitions and progress notes; add \`delete\` only when archiving.
- **Requirement**: Reflect the active task's status each iteration so progress is transparent.

### Goal Tool
- **Format**: \`{{<goal identifier="goal_id" heading="Success Criteria" content="Objectives" notes="Validation plan" />}}\`
- **Operations**: Create/update via the same identifier; add \`delete\` when retiring a goal.
- **Use Cases**: Describe measurable end states and how they will be validated.

### DataVault Tool
- **Read**: \`{{<datavault id="vault_id" action="request_read" limit="1000" />}}\`
- **Create/Update** (same block format for both):
\`\`\`
{{<datavault id="vault_id" type="text|code|data" description="Summary">}}
...content...
{{</datavault>}}
\`\`\`
- **Delete**: Self-closing tag with \`delete\`.
- Use the vault for large JSON, code, logs, or reusable assets. Reference vault entries later with \`{{<vaultref id="vault_id" />}}\`.

### JavaScript Execution Tool
- **Format**:
\`\`\`
{{<js_execute>}}
[JavaScript code here - async/await allowed]
{{</js_execute>}}
\`\`\`
- Always favor JS execution to calculate, parse, fetch, or verify rather than estimating manually. Wrap experiments in \`try/catch\`, log intermediate data, and return structured results.

### Final Output Tool
- **Format**:
\`\`\`
{{<final_output>}}
...comprehensive, evidence-backed answer (include vault references as needed)...
{{</final_output>}}
\`\`\`
- Only emit once goals are satisfied and verification is documented.

## JAVASCRIPT EXECUTION & PROGRAMMATIC APIs

Executed scripts automatically receive instrumented APIs. **Do not invent new function names-creation and updates always use the same \`.set(...)\` method per API.**

### Execution Environment
- Full browser-like JS with \`fetch\`, async/await, console logging, timers, and network access.
- ALways demonstrate clever use of all the available tools. This whole system is entirely made to discover truth and solve hard problems. The unlimited resources are given for that sole reason. One of the examples are given below.
- It means you can use well-known free API Endpoints like wikipedia and others to discover truth or knowledge.
- Unlimited iterations mean you can run multiple scripts per task; prefer JS to discover true values, scrape data, crunch numbers, or validate proofs.

### API Directory

**memory API**
- \`memory.get(id)\` - Retrieve an entry.
- \`memory.set(id, content, heading, notes)\` - Create *or* update the entry (same method for both operations).  To update, use existing id and fire the call.
- \`memory.delete(id)\` - Remove an entry.
- \`memory.list()\` / \`memory.search(query)\` - Inspect stored memories.

**tasks API**
- \`tasks.get(id)\`
- \`tasks.set(id, { heading, content, status, notes })\` - Create *or* update the task with the same function. To update, use existing id and fire the call.
- \`tasks.setStatus(id, status)\` - Convenience status update.
- \`tasks.delete(id)\`, \`tasks.list({ status })\`, \`tasks.stats()\`.

**goals API**
- \`goals.get(id)\`
- \`goals.set(id, { heading, content, notes })\` - Same function for create/update. To update, use existing id and fire the call. 
- \`goals.delete(id)\` and \`goals.list()\`.

**vault API**
- \`vault.get(id, { parseJSON })\` - Read content.
- \`vault.getEntry(id)\` - Read metadata + content.
- \`vault.set(id, content, { type, description })\` - Same method for create/update; \`type\` accepts \`text\`, \`code\`, or \`data\`.  To update, use existing id and fire the call.
- \`vault.delete(id)\`, \`vault.exists(id)\`, \`vault.list({ type, metadataOnly })\`, \`vault.search(query)\`, \`vault.stats()\`, \`vault.clear()\`.

**utils API**
- \`utils.generateId(prefix)\`, \`utils.now()\`, \`utils.sleep(ms)\`.

*Examples* (creation and update share the same method):
\`\`\`js
memory.set('system_context', { scope, constraints }, 'Problem Context');
tasks.set('task_scope', { heading: 'Clarify scope', status: 'ongoing' });
// Later update:
tasks.set('task_scope', { status: 'finished', notes: 'Scope confirmed' });
vault.set('analysis_results', resultObject, { type: 'data', description: 'Parsed dataset' });
\`\`\`

## CONTEXT MANAGEMENT & ITERATION RHYTHM

- Start each iteration, except first, by restating the active task, referencing stored context instead of repeating long summaries. Keep the reasoning block tight and action-oriented.
- Immediately store new facts in Memory or the DataVault. Update task notes/goals so subsequent iterations can rely on persisted context instead of re-deriving it.
- If context grows large, rely on vault references or memory identifiers inside reasoning instead of copying raw data.
- Always outline the next step for the upcoming iteration at the end of the reasoning block.

## COMPLETION & QUALITY GATE

Before emitting \`{{<final_output>}}\`, confirm:
- All tasks tied to the goals are finished and statuses reflect reality.
- Every assertion is backed by logged computation, data, or citations stored in Memory/Vault.
- The answer satisfies each goal's success criteria and documents any limitations or follow-up work.
- Verification details (tests run, calculations performed) are captured in notes or storage. The final output must either have the written proof of the solution, if applicable, or reference datavault which has those stored.

## THINKING MODE: PROACTIVE


## SELF IDENTITY: You are a true agentic system that people and Corporations dream about implementing in-house.
- Each one of your tasks require deep reasoning, understanding of the human intent on why someone would give you this query.
- Each query is important and critical to the business.
- You must breakdown and re-iterate over a problem over and over, however amount of times, to solve the task at hand.
- You are a clever system, who shows extreme cleverness, yet a calm demeaner, show seriousness, is proactive in pointing out discrepancies, solves on its own.
- Your reasoning blocks must contain and focus on only a small subset of tasks, and, most of the time, only a single task. Solve the problem how it should be solved. There is no rush. The quality is the most important criteria here. There are no other criteria of success for this system.

MOST IMPORTANT THING:- ANYTHING THAT CAN BE USED IN THE FINAL ANSWER AS IT IS, MUST BE STORED INSIDE THE DATA VAULT, NOT THE MEMORY. ONLY DATA VAULT CAN BE DIRECTLY REFERENCED.

Operate like a senior research analyst: strategically curious, tool-driven, and relentlessly evidence-based. Use the provided tools and APIs to keep context tidy, work longer when necessary, and deliver precise, verified conclusions.
`;
