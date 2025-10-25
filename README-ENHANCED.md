# Gemini Advanced Reasoning Lab v2.0 Enhanced

A comprehensive multi-agent iterative reasoning system powered by Google's Gemini API with advanced data vault capabilities and enhanced tag processing.

## 🆕 What's New in v2.0 Enhanced

### Enhanced Data Vault System
- **Advanced Tag Recognition**: Use `{{<tag>}}content{{</tag>}}` for better LLM recognition
- **Modular Architecture**: Separate processors for different content types
- **Intelligent Storage**: Automatic content classification and metadata handling
- **Rigorous Procedures**: Standardized workflows for consistent LLM interaction

### Key Enhancements
- **Improved Tag Patterns**: More robust parsing with `{{<vault_store>}}`, `{{<function_def>}}`, `{{<reasoning_text>}}`
- **Content Classification**: Automatic detection of functions, data structures, reasoning chains
- **Better Error Handling**: Enhanced debugging and validation for vault operations
- **Modular Components**: Reusable, maintainable architecture

## 🚀 Features

- **Unlimited Iterations**: Continues reasoning until task completion with rigorous analysis
- **Code Execution**: Full JavaScript execution with complete browser capabilities
- **Memory System**: Persistent storage for complex reasoning chains
- **Task Management**: Automatic task breakdown and progress tracking
- **Goal-Oriented**: Verification system ensures outputs meet all objectives
- **Enhanced Vault**: Intelligent content storage with advanced tag processing
- **Swiss Design**: Clean, professional minimalist interface

## 🛠️ System Architecture

### Enhanced Components
```
enhanced-data-vault.js        # Core vault system with improved storage
vault-tag-processor.js        # Modular tag processing engine
vault-llm-procedures.js       # Standardized LLM interaction procedures
tool-executor-enhanced.js     # Enhanced tool execution with vault integration
ui-manager-enhanced.js        # Complete UI with vault browser and statistics
main-enhanced.js             # Enhanced entry point with additional features
```

### Legacy Components (Still Active)
```
storage.js                   # localStorage abstraction layer
gemini-api.js               # Gemini API integration with rate limiting
styles.css                  # Core Swiss minimalist styling
```

## 📚 Enhanced Tag System

### Vault Operations
```
{{<vault_store id="unique_id" label="Description" tags="tag1,tag2">}}
Your large content here...
{{</vault_store>}}

{{<vault_retrieve id="unique_id" mode="preview|full|summary" limit="500" />}}

{{<vault_ref id="unique_id" />}}
```

### Function Storage
```
{{<function_def name="functionName" params="param1,param2">}}
function calculateSum(a, b) {
    return a + b;
}
{{</function_def>}}
```

### Data Structure Storage
```
{{<data_structure type="array" name="dataName">}}
[
    {"id": 1, "name": "John"},
    {"id": 2, "name": "Jane"}
]
{{</data_structure>}}
```

### Reasoning Storage
```
{{<reasoning_text>}}
Long analysis or reasoning chain that should be preserved...
{{</reasoning_text>}}
```

### Code Execution
```
{{<js_execution>}}
// Any JavaScript code with full browser access
const data = await fetch('https://api.example.com/data');
console.log(await data.json());
{{</js_execution>}}
```

## 🧠 Rigorous Reasoning Guidelines

### Core Principles
1. **Never Give Up**: Use unlimited iterations to solve complex problems completely
2. **Code When Stuck**: Execute JavaScript for calculations, data processing, API calls
3. **Break Down Tasks**: Decompose complex problems into manageable steps
4. **Verify Everything**: Check results against all stated goals
5. **Store Reusables**: Use vault for functions, data, and long reasoning chains

### When to Use Code Execution
- **Mathematical Calculations**: Complex computations, statistics, algorithms
- **Data Processing**: Parsing, filtering, transforming large datasets
- **API Interactions**: Fetching external data, validating information
- **Problem Solving**: Iterative algorithms, optimization, search
- **Verification**: Testing hypotheses, validating results

### Vault Usage Strategy
- **Large Content**: Store anything > 500 characters
- **Reusable Functions**: Mathematical utilities, data processors
- **Complex Data**: Arrays, objects, configuration data
- **Analysis Results**: Long reasoning chains, research findings
- **Reference Material**: Documentation, specifications, examples

## 🔧 Setup Instructions

### 1. Get API Keys
Obtain your Gemini API key(s) from [Google AI Studio](https://aistudio.google.com/app/apikey)

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

### 3. Choose Your Version
- **Enhanced Version**: Open `enhanced-index.html` for the new vault system
- **Original Version**: Open `index.html` for the classic interface

### 4. Configure
1. Enter your API key(s) (up to 5 keys supported for rotation)
2. Select your preferred Gemini model
3. Optionally set initial goals
4. Start with rigorous reasoning!

## 📊 Workflow Example

### Problem-Solving Process
```
1. User: "Solve this complex optimization problem..."

2. System: Break down into tasks
   {{<create_task>}}Analyze problem constraints{{</create_task>}}
   {{<create_task>}}Implement optimization algorithm{{</create_task>}}
   {{<create_task>}}Test and validate solution{{</create_task>}}

3. Store reusable components:
   {{<function_def name="optimizationAlgorithm" params="data,constraints">}}
   // Complex algorithm implementation...
   {{</function_def>}}

4. Execute and iterate:
   {{<js_execution>}}
   // Run calculations, test different approaches
   const result = optimizationAlgorithm(dataset, constraints);
   console.log('Optimization result:', result);
   {{</js_execution>}}

5. Verify against goals and provide final answer
```

## 🔒 Security Considerations

⚠️ **Important Security Warning**
- The enhanced system executes JavaScript without restrictions
- The model has complete browser access (fetch, DOM, etc.)
- Use only with trusted API keys
- Do not deploy publicly without security hardening
- Vault data persists in localStorage (browser-specific)

## 🎆 Enhanced Features

### Vault Browser
- Visual interface for stored content
- Search and filter vault entries
- Export/import functionality
- Metadata and tagging system

### Smart Processing
- Automatic content classification
- Intelligent storage decisions
- Error recovery and suggestions
- Performance optimization

### Advanced UI
- Real-time vault statistics
- Enhanced tool result display
- Modular component architecture
- Improved error messaging

## 🚑 Troubleshooting

### "Cannot read properties of null"
- Check vault entry IDs are correct
- Verify content was successfully stored
- Use vault browser to inspect entries

### "Vault entry not found"
- Use `Lab.list()` to see available entries
- Check ID formatting (no special characters)
- Verify entry wasn't accidentally deleted

### Performance Issues
- Large vault entries are automatically compressed
- Use preview mode for quick access
- Regular cleanup of temporary entries
- Monitor localStorage usage

## 📄 Files Overview

### Enhanced System Files
- `enhanced-index.html` - Enhanced entry point
- `data-vault-enhanced.js` - Advanced vault system
- `vault-tag-processor.js` - Modular tag processing
- `vault-llm-procedures.js` - LLM interaction standards
- `tool-executor-enhanced.js` - Enhanced tool execution
- `ui-manager-enhanced.js` - Complete enhanced UI
- `main-enhanced.js` - Enhanced application entry

### Legacy System Files
- `index.html` - Original entry point
- `data-vault.js` - Original vault system
- `tool-executor.js` - Original tool executor
- `ui-manager.js` - Original UI manager
- `main.js` - Original entry point

### Shared Components
- `storage.js` - localStorage management
- `gemini-api.js` - API integration
- `styles.css` - Swiss minimalist styles

## 📦 Version History

### v2.0 Enhanced (Current)
- Advanced vault system with enhanced tags
- Modular architecture for better maintainability
- Improved error handling and debugging
- Rigorous reasoning guidelines and procedures
- Enhanced UI with vault browser and statistics

### v1.0 Original
- Basic vault system with simple tags
- Monolithic architecture
- Core reasoning and tool execution
- Swiss minimalist design
- Multi-API key rotation

## 🌟 Best Practices

### For Users
1. **Start Small**: Test with simple problems first
2. **Set Clear Goals**: Define specific objectives
3. **Use Multiple Keys**: Configure 2-5 API keys for reliability
4. **Regular Backups**: Export vault data periodically
5. **Monitor Usage**: Check API quotas and rate limits

### For LLMs (Built-in Guidelines)
1. **Rigorous Analysis**: Never settle for "good enough"
2. **Code Extensively**: Use JavaScript for any computation
3. **Store Strategically**: Vault reusable components
4. **Verify Thoroughly**: Test results against all goals
5. **Iterate Freely**: Use unlimited reasoning cycles

## 🔗 Links

- [Google AI Studio](https://aistudio.google.com/app/apikey) - Get API Keys
- [Gemini API Documentation](https://ai.google.dev/docs) - API Reference
- [GitHub Repository](https://github.com/k4lp/K4lp.github.io) - Source Code

---

**Built with:** Vanilla JavaScript, Gemini API, Swiss Design Principles, Rigorous Reasoning Standards

**Version:** 2.0 Enhanced - Production Ready with Advanced Vault System