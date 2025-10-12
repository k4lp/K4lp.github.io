# K4LP Engineering Tools - JavaScript Architecture Guide

## 📁 Project Structure Overview

```
K4lp.github.io/
├── css/
│   └── site.css                    # Master stylesheet (all CSS goes here)
├── js/
│   ├── common/                     # Shared utilities across all pages
│   │   ├── api.js                  # API Manager v2.2.0 (Digikey v4 + Mouser)
│   │   ├── excel.js                # Excel Manager v2.2.0 (Column mapping + BOM)
│   │   ├── scanner.js              # Scanner Manager v2.1.0 (QR/Barcode + Controls)
│   │   ├── storage.js              # Storage Manager (localStorage + caching)
│   │   ├── utils.js                # Utility Manager v2.3.0 (Engineering utils)
│   │   └── eventbus.js             # Event bus for component communication
│   ├── core/
│   │   └── navigation.js           # Navigation Manager v2.1.0 (Settings modal)
│   ├── libs/                       # External libraries (local storage)
│   │   ├── xlsx.full.min.js        # SheetJS for Excel processing
│   │   ├── html5-qrcode.min.js     # QR/Barcode scanning library
│   │   └── .gitkeep
│   └── pages/                      # Page-specific JavaScript modules
│       ├── index/
│       │   └── index.js            # Tools Dashboard v2.1.0
│       ├── contact/
│       │   └── contact.js          # Contact form handling
│       └── settings/
│           └── settings.js         # Settings page specific logic
├── index.html                      # Main tools dashboard
├── contact.html                    # Project info & contact
├── settings.html                   # API configuration (optional)
└── README.md                       # Project documentation
```

## 🛠️ Core Components Overview

### 1. API Manager (`js/common/api.js`)
**Version 2.2.0 - Fixed Digikey OAuth 2.0 Implementation**

#### Key Features:
- ✅ **Corrected Digikey OAuth 2.0 Client Credentials Flow** (2-legged)
- ✅ **Digikey API v4 Product Information** endpoints
- ✅ **Mouser API v1** integration
- ✅ **Token Management** with automatic refresh
- ✅ **Rate Limiting** and request queuing
- ✅ **Error Handling** and retry logic
- ✅ **Response Caching** with TTL
- ✅ **Performance Metrics** tracking

#### Usage:
```javascript
// Authentication
await window.apiManager.authenticateDigikey(clientId, clientSecret);
window.apiManager.setMouserApiKey(apiKey);

// Component Search
const results = await window.apiManager.searchComponents('STM32F4', {
    provider: 'both', // 'digikey', 'mouser', or 'both'
    limit: 50
});

// Product Details
const details = await window.apiManager.getDigikeyProductDetails('STM32F407VGT6');

// Status Monitoring
const status = window.apiManager.getStatus();
```

### 2. Excel Manager (`js/common/excel.js`)
**Version 2.2.0 - Visual Column Mapping & BOM Processing**

#### Key Features:
- ✅ **Visual Excel Preview** with table rendering
- ✅ **Intelligent Column Detection** for BOM fields
- ✅ **Interactive Column Mapping** interface
- ✅ **Data Type Analysis** and validation
- ✅ **BOM-specific Processing** and analysis
- ✅ **Export to CSV/JSON** formats

#### Usage:
```javascript
// Load Excel file
const summary = await window.excelManager.loadExcelFile(file);

// Create visual preview
window.excelManager.createVisualPreview('preview-container');

// Create column mapping interface
window.excelManager.createColumnMappingInterface('mapping-container');

// Process BOM data
const bomData = window.excelManager.processBomData();

// Export results
const csvData = window.excelManager.exportData('csv');
```

### 3. Scanner Manager (`js/common/scanner.js`)
**Version 2.1.0 - Advanced Camera Controls**

#### Key Features:
- ✅ **Multi-format Support** (QR, Code128, EAN, UPC, etc.)
- ✅ **Advanced Camera Controls** (zoom, torch, focus)
- ✅ **Visual Overlay Interface** with controls
- ✅ **Batch Scanning** with history tracking
- ✅ **File Upload Scanning** support
- ✅ **Performance Metrics** and capabilities detection

#### Usage:
```javascript
// Start scanning with advanced options
await window.scannerManager.startScanning('scanner-container', {
    showZoom: true,
    showTorch: true,
    enableBeep: true,
    formats: ['QR_CODE', 'CODE_128', 'EAN_13']
});

// Set callbacks
window.scannerManager.setCallbacks({
    onScanSuccess: (text, result, scanData) => {
        console.log('Scanned:', text);
    }
});

// Camera controls
await window.scannerManager.setZoom(2.0);
await window.scannerManager.toggleTorch();

// Export scan history
const csvHistory = window.scannerManager.exportScanHistory();
```

### 4. Utility Manager (`js/common/utils.js`)
**Version 2.3.0 - Engineering-Specific Utilities**

#### Key Features:
- ✅ **Engineering Value Parsing** (with units and prefixes)
- ✅ **Electronic Component Calculations** (resistors, power, etc.)
- ✅ **Validation Functions** (part numbers, emails, etc.)
- ✅ **Formatting Utilities** (currency, engineering notation)
- ✅ **Data Processing** (deep merge, grouping, sorting)
- ✅ **Notification System** with sounds
- ✅ **File Operations** (download, read)

#### Usage:
```javascript
// Engineering calculations
const resistance = window.utils.calculateResistorValue(['red', 'red', 'brown']);
const power = window.utils.calculatePower(5, null, 100); // V=5V, R=100Ω

// Value parsing
const parsed = window.utils.parseEngineering('4.7kΩ'); // {value: 4700, unit: 'Ω', prefix: 'k'}

// Formatting
const formatted = window.utils.formatEngineering(4700, 'Ω'); // "4.7 kΩ"
const price = window.utils.formatCurrency(1.25, 'USD'); // "$1.25"

// Notifications
window.utils.showNotification('Operation completed!', 'success');

// File operations
window.utils.downloadFile(csvData, 'export.csv', 'text/csv');
```

### 5. Storage Manager (`js/common/storage.js`)
**Enhanced localStorage Management**

#### Key Features:
- ✅ **Persistent API Credentials** storage
- ✅ **Response Caching** with TTL
- ✅ **Settings Management** with validation
- ✅ **Data Compression** for large objects
- ✅ **Quota Management** and cleanup

#### Usage:
```javascript
// API credentials
window.storage.saveDigikeyCredentials(clientId, clientSecret);
const creds = window.storage.getDigikeyCredentials();

// Caching
window.storage.saveToCache('api_response_key', data, 900000); // 15 minutes
const cached = window.storage.getFromCache('api_response_key');

// General storage
window.storage.setItem('user_preferences', { theme: 'dark' });
const prefs = window.storage.getItem('user_preferences');
```

### 6. Navigation Manager (`js/core/navigation.js`)
**Version 2.1.0 - Settings Modal & Navigation**

#### Key Features:
- ✅ **Sticky Navigation** with active state management
- ✅ **Settings Modal** with tabbed interface
- ✅ **API Status Indicators** (live updates)
- ✅ **Keyboard Shortcuts** (Ctrl+K for settings)
- ✅ **Connection Testing** for all APIs
- ✅ **Theme Management** (light/dark/auto)

#### Usage:
```javascript
// Open settings programmatically
window.navigationManager.openSettings();

// Get navigation state
const state = window.navigationManager.getNavigationState();

// Settings are automatically loaded/saved to storage
```

### 7. Tools Dashboard (`js/pages/index/index.js`)
**Version 2.1.0 - Comprehensive Tool Management**

#### Key Features:
- ✅ **Dynamic Tool Grid** with filtering and sorting
- ✅ **Search Functionality** across tools
- ✅ **Requirement Checking** before tool launch
- ✅ **Quick Actions** for common tasks
- ✅ **System Status Monitoring** with live indicators
- ✅ **Tool Usage Tracking** and analytics

## 🔧 Integration Instructions

### 1. HTML Page Setup

**Required HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K4LP Engineering Tools</title>
    <link rel="stylesheet" href="/css/site.css">
</head>
<body>
    <!-- Navigation will be injected here automatically -->
    
    <main class="page-content">
        <!-- Your page content -->
    </main>
    
    <!-- Core Libraries -->
    <script src="/js/libs/xlsx.full.min.js"></script>
    <script src="/js/libs/html5-qrcode.min.js"></script>
    
    <!-- Core Modules (Load in Order) -->
    <script src="/js/common/eventbus.js"></script>
    <script src="/js/common/storage.js"></script>
    <script src="/js/common/utils.js"></script>
    <script src="/js/common/api.js"></script>
    <script src="/js/common/excel.js"></script>
    <script src="/js/common/scanner.js"></script>
    <script src="/js/core/navigation.js"></script>
    
    <!-- Page-Specific Module -->
    <script src="/js/pages/index/index.js"></script>
</body>
</html>
```

### 2. CSS Guidelines

**Single CSS File Principle:**
- ✅ ALL styles go in `/css/site.css`
- ❌ NO CSS in HTML files (not even inline)
- ❌ NO per-page CSS files
- ✅ Responsive design (desktop + mobile)
- ✅ Swiss minimalist design principles

### 3. Adding New Tools

**Step 1: Create Tool Page**
```html
<!-- /tools/my-tool.html -->
<script src="/js/pages/tools/my-tool.js"></script>
```

**Step 2: Add Tool Definition**
```javascript
// In js/pages/index/index.js, add to this.tools array:
{
    id: 'my-tool',
    title: 'My Tool',
    description: 'Tool description',
    icon: '🔧',
    status: 'available', // 'available', 'beta', 'coming_soon'
    categories: ['category1', 'category2'],
    features: ['Feature 1', 'Feature 2'],
    requirements: ['Requirements'],
    estimatedTime: 'Time estimate',
    complexity: 'beginner', // 'beginner', 'intermediate', 'advanced'
    url: '/tools/my-tool.html',
    demoData: true
}
```

**Step 3: Create Tool Module**
```javascript
// /js/pages/tools/my-tool.js
class MyTool {
    constructor() {
        // Access global managers
        this.api = window.apiManager;
        this.excel = window.excelManager;
        this.scanner = window.scannerManager;
        this.utils = window.utils;
        this.storage = window.storage;
    }
    
    async initialize() {
        // Tool initialization
    }
}

const myTool = new MyTool();
```

## 🔐 API Configuration

### Digikey API Setup:
1. Register at [developer.digikey.com](https://developer.digikey.com)
2. Create a **Production** application (Organization type)
3. Use **OAuth 2.0 Client Credentials** flow (2-legged)
4. Set OAuth Callback to: `https://localhost:8139/digikey_callback`
5. Get Client ID and Client Secret
6. Configure in Settings modal

### Mouser API Setup:
1. Register at [mouser.com/api](https://www.mouser.com/api-hub/)
2. Get API Key (Search API)
3. Configure in Settings modal

## 🧪 Testing & Development

### Demo Mode:
- Most tools support `?demo=true` parameter
- Loads sample data for testing without real files/API calls

### Sandbox Mode:
- Digikey supports sandbox environment
- Enable in Settings → Digikey API → Use Sandbox

### Browser Console:
```javascript
// Check manager availability
console.log('API Manager:', !!window.apiManager);
console.log('Excel Manager:', !!window.excelManager);
console.log('Scanner Manager:', !!window.scannerManager);
console.log('Utils:', !!window.utils);
console.log('Storage:', !!window.storage);

// Test API connections
await window.apiManager.testAllConnections();

// Check system status
console.log(window.apiManager.getStatus());
console.log(window.navigationManager.getNavigationState());
console.log(window.toolsDashboard.systemStatus);
```

## 📊 Performance Considerations

### Module Loading Order:
1. **External Libraries** (xlsx, html5-qrcode)
2. **Event Bus** (for communication)
3. **Storage** (required by others)
4. **Utils** (used by others)
5. **API Manager** (core functionality)
6. **Excel & Scanner** (tool-specific)
7. **Navigation** (UI management)
8. **Page-specific** modules

### Caching Strategy:
- API responses cached for 15 minutes
- Settings cached permanently
- Excel data cached during session
- Scanner history cached permanently

### Error Handling:
- All managers have comprehensive error handling
- Errors logged to console with context
- User-friendly notifications via utils.showNotification()
- Graceful degradation when APIs unavailable

## 🔄 Event Communication

```javascript
// Subscribe to events
window.eventBus.on('api-status-changed', (data) => {
    console.log(`API ${data.provider} status: ${data.status}`);
});

// Emit events
window.eventBus.emit('tool-launched', { toolId: 'bom-processor' });
```

## 📱 Mobile Considerations

- All managers are mobile-friendly
- Scanner has touch-optimized controls
- Navigation is responsive
- File operations work on mobile browsers
- Camera access requires HTTPS in production

## 🎨 Design System Integration

**Colors:**
- Primary: `#000000` (Black)
- Background: `#fafafa` (Light Gray)
- Text: `#1a1a1a` (Near Black)
- Accent: `#666666` (Gray)

**Typography:**
- Primary: Geist (loaded from Google Fonts)
- Fallback: System fonts

**Components:**
- All styling in `site.css`
- Swiss minimalist principles
- No animations/hover effects
- Monospaced fonts for technical data

---

## 🚀 Quick Start Checklist

- [ ] Load all core JavaScript modules in correct order
- [ ] Include external libraries (xlsx, html5-qrcode)
- [ ] Set up API credentials via Settings modal
- [ ] Test connections using browser console
- [ ] Customize tools array in index.js
- [ ] Add tool-specific pages and modules
- [ ] Follow single CSS file principle
- [ ] Test on mobile devices
- [ ] Enable HTTPS for production (required for camera)

This architecture provides a solid foundation for building professional engineering tools with modern web technologies while maintaining the Swiss minimalist design philosophy.

**Built with precision for electronics engineering workflows.**