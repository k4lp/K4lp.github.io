# Gemini Advanced Reasoning Lab

A vanilla JavaScript implementation of a multi-agent iterative reasoning system powered by Google's Gemini API with enhanced data vault capabilities.

## Features

- **Multi-Agent Architecture**: Single Gemini instance acts as persistent reasoning agent
- **Unlimited Iterations**: Continues reasoning until task completion with rigorous analysis
- **Enhanced Data Vault**: Intelligent content storage with `{{<vault_store>}}` tags for better LLM recognition
- **Code Execution**: Full JavaScript execution with complete browser capabilities
- **Memory System**: Persistent storage for complex reasoning chains
- **Task Management**: Automatic task breakdown and progress tracking
- **Goal-Oriented**: Verification system ensures outputs meet all objectives
- **API Key Rotation**: Automatic rotation of up to 5 API keys with rate limit handling
- **Real-time Streaming**: Character-by-character response display
- **Swiss Design**: Clean, professional minimalist interface

## Quick Start

### 1. Get API Keys
Get your Gemini API key(s) from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Serve the Files
**Python 3:**
```bash
python -m http.server 8000
```

**Node.js:**
```bash
npx http-server -p 8000
```

**PHP:**
```bash
php -S localhost:8000
```

### 3. Configure and Start
1. Open `index.html` in your browser
2. Enter your API key(s) (up to 5 keys supported)
3. Select your preferred model
4. Start reasoning with rigorous analysis!

## Enhanced Data Vault System

### Better Tag Recognition
```
{{<vault_store id="unique_id" label="Description" tags="tag1,tag2">}}
Your large content here...
{{</vault_store>}}

{{<vault_retrieve id="unique_id" mode="preview|full|summary" />}}

{{<function_def name="functionName" params="param1,param2">}}
function calculateSum(a, b) { return a + b; }
{{</function_def>}}

{{<reasoning_text>}}
Long reasoning chain that gets automatically vaulted...
{{</reasoning_text>}}
```

### When to Use Code Execution
- Mathematical calculations and data processing
- API calls and external data fetching
- Complex algorithms and optimizations
- Hypothesis testing and verification
- When stuck on any problem (unlimited resources!)

## Project Structure

```
index.html                   # Main entry point
data-vault-enhanced.js       # Enhanced vault with {{<tag>}} processing
vault-tag-processor.js       # Modular tag processing engine
vault-llm-procedures.js      # LLM interaction procedures
tool-executor-enhanced.js    # Enhanced tool execution
ui-manager.js               # UI manager (uses enhanced backend)
main.js                     # Application entry point
storage.js                  # localStorage management
gemini-api.js              # API integration with rate limiting
styles.css                 # Swiss minimalist styling
```

## Usage Examples

### Basic Workflow
1. **User**: "Solve this complex optimization problem..."
2. **System**: Breaks down into specific tasks
3. **LLM**: Uses vault system to store functions and data
4. **Execution**: Runs code iteratively until solution is complete
5. **Verification**: Ensures all goals are met before final output

### Tool System
The model can use these XML tags:

#### Memory Operations
```xml
<create_memory summary="Brief summary">Detailed content</create_memory>
<fetch_memory id="memory_id_123" />
<update_memory id="memory_id_123">New content</update_memory>
<delete_memory id="memory_id_123" />
```

#### Task Management
```xml
<create_task>Task description</create_task>
<update_task id="task_id" status="ongoing" notes="Progress notes" />
```

#### Code Execution
```xml
<execute_js>
// Any JavaScript code with full browser access
const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);
return data;
</execute_js>
```

#### Enhanced Vault Operations
```xml
{{<vault_store id="data_123" label="Analysis Results" tags="analysis,results">}}
Large content that gets stored with better LLM recognition...
{{</vault_store>}}

{{<vault_retrieve id="data_123" mode="preview" limit="500" />}}
```

#### Canvas Rendering
```xml
<canvas_html>
<!DOCTYPE html>
<html>
<body>
  <h1>Interactive Canvas</h1>
  <button onclick="alert('Works!')">Click Me</button>
</body>
</html>
</canvas_html>
```

#### Final Output
```xml
<final_output>
Final answer with optional {{exec_id}} variable replacements
</final_output>
```

## System Architecture

### Execution Flow
1. **User sends message** → Added to chat history
2. **Reasoning loop begins** → Iterates until `<final_output>` is found
3. **Each iteration**:
   - Build context (memories, goals, tasks, previous reasoning)
   - Call Gemini API with streaming
   - Parse and execute XML tool calls with enhanced vault processing
   - Update UI in real-time
   - Check for final output or continuation
4. **Verification call** → Ensures output meets all goals
5. **Display result** → Show to user with variable replacements

### Enhanced Data Vault Features
- **Better Tag Recognition**: `{{<tag>}}` patterns that LLMs recognize more reliably
- **Modular Processors**: Separate handling for different content types
- **Intelligent Storage**: Automatic classification and metadata handling
- **Standardized Procedures**: Built-in guidelines for consistent LLM interaction

### Rate Limiting Strategy
- Supports up to 5 API keys with sequential rotation
- Exponential backoff on rate limits (1min → 5min → 15min)
- System preserves state during rate limit freezes
- Visual status indicators for each key
- Automatic recovery when cooldown expires

### Data Persistence
All data persists in localStorage:
- **Enhanced Vault**: Intelligent content storage with metadata
- **Memories**: Structured information storage
- **Tasks**: Progress tracking with status updates
- **Goals**: User and system objectives
- **Reasoning Chain**: Complete iteration history
- **Code Executions**: All JavaScript execution results
- **Canvas Outputs**: Interactive HTML renderings

## Rigorous Reasoning Guidelines

### For LLMs (Built-in)
1. **Never Give Up**: Use unlimited iterations for complete solutions
2. **Code Extensively**: Execute JavaScript for any computation or verification
3. **Break Down Problems**: Decompose complex tasks systematically
4. **Store Strategically**: Use vault for reusable components and large data
5. **Verify Thoroughly**: Check all results against stated objectives

### For Users
1. **Set Clear Goals**: Define specific, measurable objectives
2. **Use Multiple Keys**: Configure 2-5 API keys for reliability
3. **Monitor Progress**: Watch reasoning chain and task updates
4. **Trust the Process**: Let the system iterate until completion
5. **Export Results**: Save important vault data and solutions

## Security Warning

⚠️ **This lab executes JavaScript without restrictions**

- The model has complete browser access
- Code runs in the main browser context (no sandbox)
- Can make network requests, manipulate DOM, etc.
- Only use with trusted API keys
- Do NOT deploy publicly without security hardening

## Browser Compatibility

Requires modern browser with:
- ES6 modules support
- localStorage
- Fetch API
- ReadableStream
- async/await

Tested on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Troubleshooting

### "No available API keys"
- Enter at least one valid API key in the configuration
- Keys are validated on first use

### "All API keys are rate-limited"
- Wait for cooldown period (1-15 minutes)
- Add more API keys for better rotation
- System preserves all progress during freezes

### Enhanced vault errors
- Check console for detailed error messages
- Ensure content is properly formatted in vault tags
- Use `{{<vault_retrieve>}}` with correct syntax

### Module loading errors
- Ensure files are served via HTTP (not file://)
- Check browser console for specific errors
- Verify all system files are present

## License

This is a demonstration project for advanced AI reasoning capabilities. Use at your own risk.

## Credits

- Built for Google Gemini API
- Enhanced with rigorous reasoning principles and better LLM recognition
- Font: Geist by Vercel
- Design: Swiss minimalism
- Inspired by advanced multi-agent reasoning systems

---

**Ready for rigorous reasoning?** Open `index.html` and start exploring!