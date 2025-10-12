# K4LP Engineering Tools

A comprehensive suite of web-based utilities designed specifically for electronics engineers working in PCB assembly and component procurement.

## 🎯 Design Principles

- **Swiss Minimalist Design**: Clean, functional, and purposeful
- **Monochrome Color Scheme**: Professional black, white, and gray palette
- **Geist Typography**: Modern, readable typeface throughout
- **Pure Web Technologies**: HTML5, CSS3, and JavaScript only
- **Single CSS Architecture**: All styling in one master `site.css` file
- **Client-Side Processing**: Complete data privacy and security

## 📁 Project Structure

```
K4lp.github.io/
├── css/
│   └── site.css                 # Master stylesheet for entire project
├── js/
│   ├── common/                  # Shared utilities across all pages
│   │   ├── storage.js           # localStorage management for API keys
│   │   ├── api.js              # Digikey & Mouser API utilities
│   │   ├── excel.js            # Excel processing with SheetJS
│   │   ├── scanner.js          # QR/Barcode scanning utilities
│   │   └── utils.js            # General utility functions
│   ├── core/
│   │   └── navigation.js       # Navigation & settings modal logic
│   ├── libs/                   # External JavaScript libraries
│   │   └── .gitkeep           # Placeholder for libs (SheetJS, jsQR, etc.)
│   └── pages/                  # Page-specific JavaScript modules
│       ├── index/
│       │   └── index.js        # Tools showcase functionality
│       ├── contact/
│       │   └── contact.js      # Contact form handling
│       └── settings/
│           └── settings.js     # API configuration management
├── index.html                  # Main tools dashboard
├── contact.html               # Project info & contact form
└── README.md                  # This documentation
```

## 🛠️ Core Features

### Current Implementation
- **Responsive Navigation**: Fixed-top navbar with settings modal
- **Tools Dashboard**: Grid layout showcasing available engineering tools
- **API Management**: Secure client-side storage for Digikey and Mouser API keys
- **Settings System**: Modal-based configuration with connection testing
- **Contact System**: Professional contact form with project information

### Planned Features
- **BOM Processor**: Advanced Bill of Materials analysis with supplier integration
- **Excel Analyzer**: Visual column mapping and data extraction tools
- **QR/Barcode Scanner**: High-precision scanning with camera controls
- **Part Number Lookup**: Real-time component search across suppliers
- **Component Database**: Local caching and management system

## 🔧 Technical Architecture

### JavaScript Modules

#### Common Utilities (`js/common/`)
- **storage.js**: Permanent localStorage management for API keys and user data
- **api.js**: Centralized API management for Digikey and Mouser services
- **excel.js**: Excel file processing with sheet navigation and cell mapping
- **scanner.js**: Camera access and QR/barcode detection with overlay support
- **utils.js**: Shared utility functions (date formatting, validation, notifications)

#### Core Systems (`js/core/`)
- **navigation.js**: Navigation highlighting, settings modal, and layout management

#### Page-Specific Logic (`js/pages/`)
Each page has its own subdirectory containing focused functionality modules.

### CSS Architecture
Single master stylesheet (`css/site.css`) containing:
- CSS reset and base styles
- Swiss minimalist typography (Geist font)
- Responsive grid systems
- Component libraries (buttons, forms, modals)
- Mobile-first responsive design
- Accessibility improvements
- Print styles

## 🔐 Security & Privacy

- **Client-Side Processing**: All data processing happens in the browser
- **Persistent Storage**: API keys stored permanently in localStorage
- **No External Dependencies**: No CDN or third-party service calls
- **Local Libraries**: All JavaScript libraries stored in `/js/libs/`

## 📱 Responsive Design

- **Desktop First**: Optimized for engineering workstations
- **Tablet Support**: Touch-friendly interface adaptations
- **Mobile Ready**: Full functionality on mobile devices
- **Print Styles**: Professional printing layouts

## 🎨 Design System

### Colors
- **Primary**: `#000000` (Black)
- **Secondary**: `#ffffff` (White)
- **Text**: `#1a1a1a` (Near Black)
- **Muted**: `#666666` (Gray)
- **Background**: `#fafafa` (Light Gray)
- **Border**: `#e0e0e0` (Light Gray)

### Typography
- **Primary Font**: Geist (Google Fonts)
- **Fallback**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Weights**: 300, 400, 500, 600, 700

### Components
- **Cards**: Subtle borders with hover effects
- **Buttons**: High contrast with smooth transitions
- **Forms**: Clean inputs with focus states
- **Modals**: Backdrop blur with smooth animations

## 🚀 Getting Started

1. **Clone Repository**
   ```bash
   git clone https://github.com/k4lp/K4lp.github.io.git
   cd K4lp.github.io
   ```

2. **Add External Libraries**
   Place required libraries in `js/libs/`:
   - SheetJS (`xlsx.js`) for Excel processing
   - jsQR for QR code scanning
   - ZXing for barcode scanning

3. **Configure APIs**
   - Click the settings button in the navigation
   - Enter Digikey Client ID and Secret
   - Enter Mouser API Key
   - Test connections

4. **Deploy**
   - GitHub Pages: Automatically deployed from main branch
   - Vercel: Connect repository for instant deployment
   - Local: Serve files with any HTTP server

## 🧪 Development Guidelines

### HTML Structure
- No CSS in HTML files (not even inline)
- Semantic HTML5 elements
- Proper accessibility attributes
- Consistent class naming conventions

### CSS Organization
- All styles in single `site.css` file
- Mobile-first responsive approach
- Component-based organization
- Consistent naming patterns

### JavaScript Architecture
- Modular design with clear separation
- ES6+ features for modern browsers
- No external dependencies in production
- Comprehensive error handling

## 📊 Browser Support

- **Chrome**: 90+
- **Firefox**: 90+
- **Safari**: 14+
- **Edge**: 90+

## 🤝 Contributing

This is a personal engineering toolset. For questions or suggestions, use the contact form or reach out directly.

## 📄 License

Copyright © 2025 Kalp Pariya. All rights reserved.

---

**Built with Swiss precision for electronics engineering workflows.**
