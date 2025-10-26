# Gemini Deep Research System (GDRS)

A production-grade, browser-based research assistant with iterative reasoning, unlimited JavaScript execution, and persistent storage management.

## Features

- **API Key Management**: 5-key rotation pool with automatic failover, rate limit detection, and cooldown handling
- **Model Selection**: Dynamic dropdown from Google's model list API
- **Storage Systems**: Persistent Goals, Memory, Tasks, and Data Vault in localStorage
- **Code Execution**: Unrestricted JavaScript environment with full DOM/Web API access
- **Iterative Reasoning**: Multi-step analysis with unlimited reasoning cycles
- **Data Vault**: Reference-based storage for large content with substitution system

## Usage

1. **Setup**: Enter up to 5 Gemini API keys in the left panel and click "Validate"
2. **Model**: Focus the Model dropdown to fetch latest models; select one for your session
3. **Research**: Enter a query and click "Run" to begin iterative analysis
4. **Code**: Use the Code Execution panel with vault references via `{{<vaultref id="..."/>}}`
5. **Storage**: Manage Goals, Memory, Tasks, and Vault entries in the right panels

## Architecture

- **Pure Client-Side**: No server dependencies, runs entirely in browser
- **localStorage Persistence**: All data stored locally with schema versioning
- **Geist Font Stack**: Modern, minimal typography with proper hierarchy
- **Responsive Design**: Three-column layout collapsing to mobile-friendly views

## Security

- Content Security Policy ready (CSP configurable)
- HTML sanitization for user content
- API keys stored locally only
- Error handling with crash reporting to reasoning log

## Development

The system is built with vanilla JavaScript and CSS, no build tools required:
- `index.html` - Main interface
- `js/gdrs.js` - Runtime core with all functionality
- Pure browser APIs for all operations

## Live Demo

Visit: [https://k4lp.github.io/](https://k4lp.github.io/)

---

*Built with minimalist design principles using Geist/Geist Mono typography*
