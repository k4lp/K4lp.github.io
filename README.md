# Gemini Advanced Reasoning Interface

A sophisticated web-based chat interface for Google's Gemini API with advanced reasoning capabilities, persistent memory, and code execution.

## Features

### Core Functionality
- **Advanced Chat Interface**: Clean, minimalist design with real-time messaging
- **Iterative Reasoning**: Multi-step chain-of-thought processing for complex queries
- **Persistent Memory**: Automatic storage and retrieval of conversation context
- **Goal Tracking**: Set and monitor conversation objectives
- **Output Verification**: Automatic validation against stated goals

### Technical Capabilities
- **JavaScript Code Execution**: Secure in-browser code execution environment
- **HTML Canvas Display**: Render and display HTML content dynamically
- **Network Access**: Built-in HTTP utilities with CORS handling
- **Data Processing**: JSON and CSV parsing utilities
- **Session Management**: Export/import conversation data

### Data Structures
1. **Memory Bank**: Stores important conversation insights with summaries
2. **Goals System**: Tracks active objectives for conversations
3. **Reasoning Chain**: Maintains step-by-step thought processes

## Setup

1. Extract all files to a web directory
2. Open `index.html` in a modern web browser
3. Enter your Gemini API key in the configuration section
4. Start chatting with advanced AI reasoning capabilities

## File Structure

- `index.html` - Main application interface
- `styles.css` - Swiss minimalist design with Geist fonts
- `dataStructures.js` - Memory, goals, and reasoning chain management
- `geminiApi.js` - Gemini API integration and iterative reasoning
- `reasoningEngine.js` - Advanced chain-of-thought processing
- `codeExecutor.js` - Secure JavaScript execution environment
- `main.js` - Application controller and event handling

## Usage

### Basic Chat
1. Enter your message in the input field
2. Use Ctrl+Enter to send messages quickly
3. Toggle iterative reasoning for complex queries

### Code Execution
1. Click "Execute JS" to open the code environment
2. Write JavaScript code with full internet access
3. Use built-in utilities for data processing and visualization

### HTML Canvas
1. Click "Canvas" to open the HTML display area
2. Write HTML content for dynamic rendering
3. Create visualizations and interactive content

### Advanced Features
- Set conversation goals for focused discussions
- Enable auto-memory storage for important insights
- Use verification mode for quality assurance
- Export sessions for backup and analysis

## Keyboard Shortcuts

- `Ctrl+Enter` - Send message
- `Ctrl+E` - Toggle code execution
- `Ctrl+H` - Toggle HTML canvas
- `Ctrl+Shift+R` - Reset session

## Security

The code execution environment includes:
- Sandboxed JavaScript execution
- Limited API access
- CORS proxy for external requests
- No access to sensitive browser APIs

## Requirements

- Modern web browser with ES6+ support
- Valid Google Gemini API key
- Internet connection for API requests

## Design Philosophy

Built with Swiss minimalist principles:
- Clean, uncluttered interface
- Monochrome color scheme
- Geist font family for optimal readability
- Focus on functionality over decoration

---

**Note**: This interface requires a valid Gemini API key. The application stores the key locally for convenience but never transmits it except to Google's official API endpoints.