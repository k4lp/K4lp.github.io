# Gemini Advanced Reasoning Lab

A vanilla JavaScript implementation of a multi-agent iterative reasoning system powered by Google's Gemini API.

## Features

- **Multi-Agent Architecture**: Single Gemini instance acts as persistent reasoning agent
- **Unlimited Iterations**: Continues reasoning until task completion
- **External Tools**: Memory system, code execution, canvas rendering, task management
- **API Key Rotation**: Automatic rotation of up to 5 API keys with rate limit handling
- **Real-time Streaming**: Character-by-character response display
- **Swiss Minimalist Design**: Clean, professional interface
- **Full Browser Access**: Execute JavaScript with complete browser capabilities

## Project Structure

```
gemini-reasoning-lab/
├── index.html          # Main HTML structure with API key inputs
├── styles.css          # Swiss minimalist styling
├── storage.js          # localStorage management
├── gemini-api.js       # Gemini API integration with rate limiting
├── tool-executor.js    # XML tool parser and executor
├── ui-manager.js       # UI rendering and reasoning loop
├── main.js             # Application entry point
└── README.md           # This file
```

## Setup

### 1. Get API Keys

Get your Gemini API key(s) from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 2. Serve the Files

The application requires a local web server due to ES6 modules. Use one of these methods:

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

### 3. Open in Browser

Navigate to `http://localhost:8000`

### 4. Configure

1. Enter your API key(s) in the API Keys section (up to 5 keys supported)
2. Select your preferred model
3. Optionally add user goals
4. Start chatting!

## Usage

### Basic Workflow

1. **Configure API Keys**: Enter 1-5 Gemini API keys for automatic rotation
2. **Set Goals**: Add user goals that guide the reasoning process
3. **Send Message**: Type your request in the chat interface
4. **Watch Reasoning**: Monitor real-time reasoning chain and tool execution
5. **Review Output**: Final verified answer appears in chat

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

#### Goals
```xml
<create_goal>Goal description</create_goal>
```

#### Code Execution (Full Browser Access)
```xml
<execute_js>
// Any JavaScript code
const response = await fetch('https://api.example.com/data');
const data = await response.json();
console.log(data);
return data;
</execute_js>
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
   - Parse and execute XML tool calls
   - Update UI in real-time
   - Check for final output or continuation
4. **Verification call** → Ensures output meets all goals
5. **Display result** → Show to user with variable replacements

### Rate Limiting Strategy

- Supports up to 5 API keys
- Sequential rotation on 429 errors
- Exponential backoff (1min → 5min → 15min)
- System freezes when all keys rate-limited
- Automatic recovery when cooldown expires
- Visual status indicators for each key

### Data Persistence

All data persists in localStorage:

```javascript
{
  gemini_lab_api_keys: ['key1', 'key2', ...],
  gemini_lab_memories: [{id, summary, content, ...}],
  gemini_lab_tasks: [{id, description, status, ...}],
  gemini_lab_goals: [{id, content, createdBy, ...}],
  gemini_lab_reasoning: [{id, step, content, ...}],
  gemini_lab_canvas: [{id, html, ...}],
  gemini_lab_code_exec: [{id, code, output, ...}],
  gemini_lab_chat_history: [{role, content}],
  gemini_lab_selected_model: 'model-name',
  gemini_lab_key_status: {currentIndex, statuses: [...]}
}
```

## Security Warning

⚠️ **This lab executes JavaScript without restrictions**

- The model has complete browser access
- Code runs in the main browser context (no sandbox)
- Can make network requests, manipulate DOM, etc.
- Only use with trusted API keys
- Do NOT deploy publicly without security hardening

## Limitations

- **localStorage limit**: ~5MB per origin (browser dependent)
- **No server persistence**: Data only stored in browser
- **Rate limits**: Subject to Gemini API quotas
- **Browser-only**: Requires modern browser with ES6 modules

## Browser Compatibility

Requires modern browser with:
- ES6 modules support
- localStorage
- Fetch API
- ReadableStream
- async/await

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### "No available API keys"
- Enter at least one valid API key in the API Keys section
- Keys are validated on first use

### "All API keys are rate-limited"
- Wait for cooldown period (1-15 minutes)
- Add more API keys for better rotation
- Check key status indicators (green = active, red = rate-limited)

### localStorage quota exceeded
- Click "Reset All" to clear data
- Memories and reasoning chains use most storage

### Module loading errors
- Ensure files are served via HTTP (not file://)
- Check browser console for specific errors
- Verify all files are in same directory

## Development

### File Descriptions

- **index.html**: UI structure with semantic HTML and accessibility features
- **styles.css**: Swiss minimalist design with Inter font, pure monochrome colors
- **storage.js**: Abstraction layer for localStorage with error handling
- **gemini-api.js**: Gemini API client with streaming and rate limit handling
- **tool-executor.js**: XML parser and tool execution engine
- **ui-manager.js**: Complete UI rendering, event handling, and reasoning loop
- **main.js**: Entry point that initializes the application

### Key Design Decisions

1. **ES6 Modules**: Modern, maintainable code organization
2. **No Framework**: Vanilla JS for simplicity and performance
3. **Functional Separation**: Each file has single responsibility
4. **localStorage**: Simple persistence without server requirements
5. **Streaming API**: Real-time user feedback
6. **Swiss Design**: Clean, professional aesthetic

## License

This is a demonstration project. Use at your own risk.

## Credits

- Built for Google Gemini API
- Font: Inter by Rasmus Andersson
- Design: Swiss minimalism principles
- Inspired by advanced reasoning systems

## Version

1.0.0 - Initial release with complete feature set
