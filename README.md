# Gemini Deep Research System (GDRS)

A browser-based research assistant using the Gemini API with iterative reasoning, unlimited code execution, and persistent storage management. The system enables multi-step analysis through an unrestricted JavaScript environment with comprehensive data management capabilities.

## Live Demo

🔗 **[https://k4lp.github.io](https://k4lp.github.io)**

## Features

### 🔑 API Key Management
- **5-key pool** with automatic failover
- **Sequential rotation** on rate limit detection
- **Real-time status** showing usage count, rate limits, and validity
- **Local storage only** - keys never leave your browser

### 🧠 LLM Integration
- **Dynamic model selection** from Google's model list API
- **Advanced prompting** with iterative reasoning capabilities
- **Persistent context** across reasoning cycles
- **Automatic retry** with key rotation on failures

### 💾 Storage Systems

#### 1. **Goals Storage**
- Define research objectives and success criteria
- Auto-injected for final output verification
- Trackable with unique identifiers

#### 2. **Memory Storage** 
- Store retrievable context for LLM reference via tool use
- Supports notes and contextual information
- Manual fetch capabilities with unique IDs

#### 3. **Tasks Storage**
- Track execution workflow with status management
- Auto-fed to LLM each iteration
- Immutable heading/content, updateable notes/status
- Status options: `pending` | `ongoing` | `finished` | `paused`

#### 4. **Data Vault System**
- Handle content exceeding model output limits
- Reference-based storage and substitution
- Support for `code`, `text`, and `data` types
- Vault references: `{{<vaultref id="vault_id" />}}`

### ⚡ Code Execution Environment
- **Browser-native JavaScript** execution (no sandboxing)
- **Full DOM and Web API** access
- **Unrestricted network** requests
- **No iteration limits** on reasoning cycles
- **Vault reference resolution** in code execution

### 🔄 Reasoning Pipeline

1. **Query Decomposition** - Break user input into atomic subtasks
2. **Task Generation** - Create tasks from decomposed components
3. **Context Building** - Generate memories and goals as needed
4. **Iterative Processing** - Continue reasoning until completion
5. **Final Verification** - Validate output against goals

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LEFT PANEL    │    │  CENTER PANEL   │    │   RIGHT PANEL   │
│                 │    │                 │    │                 │
│ • API Keys      │    │ • Reasoning Log │    │ • Tasks         │
│ • Model Select  │    │ • Code Executor │    │ • Memory        │
│ • Query Input   │    │ • Final Output  │    │ • Goals         │
│ • Run Controls  │    │                 │    │ • Data Vault    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Getting Started

### 1. **Setup API Keys**
   - Add 1-5 Gemini API keys in the left panel
   - Click "Validate" to verify all keys
   - System will show usage stats and rate limits

### 2. **Select Model**
   - Choose from available Gemini models
   - Models are fetched automatically from Google's API
   - Recommended: `gemini-1.5-pro` for best results

### 3. **Enter Research Query**
   - Input your research question or task
   - System will decompose into atomic subtasks
   - Goals will be automatically generated

### 4. **Run Analysis**
   - Click "Run Analysis" to start iterative reasoning
   - Monitor progress in real-time through reasoning log
   - System continues until goals are satisfied or max iterations reached

## LLM Command Syntax

The system uses special markup for LLM operations:

### Reasoning Blocks
```
{{<reasoning_text>}}
... all operations must be wrapped in these blocks ...
{{</reasoning_text>}}
```

### Memory Operations
```
{{<memory identifier="unique_id" heading="Title" content="Content" notes="" />}}
{{<memory identifier="existing_id" notes="Update notes" />}}
{{<memory identifier="existing_id" delete />}}
```

### Task Operations
```
{{<task identifier="unique_id" heading="Title" content="Content" status="pending" />}}
{{<task identifier="existing_id" status="ongoing" notes="Progress update" />}}
```

### Goal Operations
```
{{<goal identifier="unique_id" heading="Title" content="Content" />}}
{{<goal identifier="existing_id" notes="Additional context" />}}
{{<goal identifier="existing_id" delete />}}
```

### Data Vault Operations
```
{{<datavault id="dv_unique_id" type="code" description="Brief description">}}
function processData(input) {
  // your code here
  return result;
}
{{</datavault>}}
```

### Vault References
```
{{<vaultref id="dv_unique_id" />}}
```

## Design Philosophy

- **Minimalist & Modern**: Clean monochrome design with Geist fonts
- **Local-First**: All data stored in browser localStorage
- **Production-Ready**: Robust error handling and key rotation
- **Unlimited Iteration**: No artificial limits on reasoning cycles
- **Transparent Process**: Full visibility into LLM reasoning

## Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Fonts**: Geist and Geist Mono for optimal readability
- **Storage**: Browser localStorage with JSON serialization
- **API**: Google Gemini API with automatic failover
- **Execution**: Browser-native JavaScript (no sandboxing)

## Security & Privacy

- ✅ **API keys stored locally** - never transmitted to external services
- ✅ **Client-side execution** - no server-side processing
- ✅ **HTTPS only** - secure communication with Gemini API
- ✅ **No tracking** - pure client-side application

## Browser Support

- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Development

### File Structure
```
├── index.html          # Main application
├── styles.css          # Modern monochrome styling
├── js/
│   ├── tools.js        # Utility functions
│   ├── gemini.js       # Gemini API client
│   └── main.js         # Core application logic
└── README.md           # This file
```

### Local Development
1. Clone the repository
2. Serve files with a local HTTP server
3. Add your Gemini API keys
4. Start researching!

### Keyboard Shortcuts
- `Ctrl+Shift+D` - Clear all GDRS data (with confirmation)

## Contributing

Contributions are welcome! Please ensure:
- Maintain the minimalist design philosophy
- Follow existing code patterns
- Test with multiple Gemini models
- Preserve local-first architecture

## License

MIT License - see repository for details.

---

**Built with ❤️ for deep research and iterative reasoning**