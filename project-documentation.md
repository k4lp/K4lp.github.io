# K4lp.github.io Project Documentation

## Project Overview

This project is a professional collection of web-based tools for electronics manufacturing and component analysis, built with a Swiss design minimalist approach using the Geist font family and monochrome aesthetics.

## Design Principles

### Core Design Philosophy
- **Swiss Design**: Clean, minimalist, and functional interface design
- **Monochrome Aesthetic**: Black and white color scheme with minimal accent colors
- **Geist Font**: Mandatory usage of Geist font family throughout all pages
- **Modular Architecture**: Extremely modular, robust, and scalable JavaScript architecture
- **Separation of Concerns**: No styling or design code within HTML or JavaScript files

### Technical Architecture
- **CSS Structure**: All styling contained in `css/site/styles.css` - the single source of truth for all visual design
- **JavaScript Modularity**: Highly modular JavaScript with separate controller patterns for extensibility
- **Subfolder Organization**: Complex functionality organized into logical subfolders (`js/quote/`, `js/qrcode/`, etc.)
- **Future-Ready**: Architecture designed to support extensive feature additions

## Page Documentation

### 1. index.html - Main Tools Index
**Purpose**: Landing page and navigation hub for all tools

**Functionality**:
- **Navigation**: Clean navigation bar with Tools (active) and Contact sections
- **Page Header**: Company branding (Alica Technologies LLP, Est. 2021, EMS Provider)
- **Tool Categories**: 
  - Component Analysis & BOM Processing tools
  - Inventory Management tools
- **Tool Links**: Direct navigation to specialized tools with descriptive badges and summaries
- **Footer**: Complete navigation links, company information, and location details

**Notable HTML Elements**:
- `.container` - Main content wrapper
- `.nav` - Navigation bar with active state management
- `.page-header` - Branded header with company metadata
- `.tools` - Grid layout for tool cards
- `.tool` - Individual tool card with badge, title, description, and navigation
- `.footer` - Multi-column footer with organized links

### 2. quote.html - BOM Quote Generator (EXISTING)
**Purpose**: Advanced Excel processing with API integration for multi-source quote generation

**Core Functionality**:
- **Configuration Panel**: Collapsible settings interface for API credentials
- **Credential Management**: 
  - Digikey API credentials (Client ID, Secret, Environment, Locale)
  - Active/Inactive token status display
  - Mouser API key management
  - Stored credentials with encryption
- **Excel Processing**:
  - File upload with validation (.xlsx, .xls)
  - Multi-sheet selection and preview
  - Data preview with first 10 rows display
- **Row Selection Interface**:
  - Modal-based row selection system
  - Column mapping for MPN, Manufacturer, Quantity
  - Visual row selection with click-to-select interface
- **Output Column Configuration**:
  - Dynamic column addition system
  - Dropdown selection for API data sources:
    - Digikey: Unit Price, Manufacturer, Detailed Description, Datasheet, Stock Available, Package/Case, HTSUS Number, HTSUS Stripped
    - Mouser: Unit Price, Manufacturer, Detailed Description, Datasheet, Stock Available, HTSUS Number, HTSUS Stripped
  - Custom column headers
- **Processing Engine**:
  - Concurrent API processing with configurable rate limiting
  - Progress tracking with real-time statistics
  - Error handling and retry logic
- **Export System**:
  - Preserves original Excel formatting completely
  - Appends API data to existing spreadsheet
  - No formatting changes to source file

**JavaScript Architecture** (quote-controller.js + modular js/quote/ files):
- **QuoteController**: Main controller class with state management
- **Modular Design**: Separate managers for Config, Excel, API, and UI
- **Future Extensibility**: Architecture supports unlimited feature additions

**Key HTML Elements**:
- `#configPanel` - Collapsible configuration interface
- `#fileInput` - Excel file upload handler
- `#sheetSelection` - Sheet selection interface  
- `#dataPreview` - Data preview table container
- `#rowSelectionModal` - Modal for row and column configuration
- `#columnMapping` - Dynamic output column configuration
- `#progressSection` - Real-time processing progress display
- `#resultsTable` - Processed results display

### 3. digikey.html - Digikey MPN Analyzer
**Purpose**: Bulk MPN information gathering using Digikey API with parallel processing

**Functionality**:
- **Multi-Credential Management**: Support for multiple API credential sets
- **Parallel Processing**: Distributed requests across multiple authenticated credentials
- **Auto-Authentication**: Automatic token management and renewal
- **Bulk MPN Processing**: Batch processing with configurable concurrency
- **Comprehensive Data Extraction**: 
  - Product descriptions and detailed specifications
  - Manufacturer information and aliases
  - Package and mounting type parameters
  - Datasheet links and HTSUS codes
- **Progress Tracking**: Real-time statistics with rate limiting compliance
- **Export Functionality**: CSV export with processed MPN data

**JavaScript Architecture**: Monolithic but well-structured with classes for credential management, API processing, and parallel execution

**Key HTML Elements**:
- Credential input fields with environment and locale selection
- MPN input textarea for bulk processing
- Progress tracking with detailed statistics
- Results table with comprehensive product information

### 4. contact.html - Contact Information
**Purpose**: Company contact and communication interface

**Functionality**:
- Contact form for inquiries
- Company information display
- Professional contact details

### 5. qrcode.html - QR Code Component Scanner
**Purpose**: Inventory management through QR/barcode scanning

**Functionality**:
- **Camera Integration**: Real-time QR code and barcode scanning
- **Component Counting**: Rapid component identification and counting
- **Excel Integration**: BOM matching with visual range selection
- **Inventory Management**: Component tracking and quantity management

**JavaScript Architecture**: Modular scanner implementation in `js/qrcode/` subfolder

### 6. exce.html - Excel API Processor
**Purpose**: Enhanced Excel processing with comprehensive API integration

**Functionality**:
- **Excel Processing**: Advanced spreadsheet manipulation
- **API Integration**: Both Digikey and Mouser API support
- **Format Preservation**: Complete original formatting preservation
- **Multi-Source Data**: Simultaneous multi-API data gathering

## CSS Architecture

### Main Stylesheet: css/site/styles.css (47KB)
- **Complete Design System**: All visual styling in single file
- **Swiss Design Implementation**: Clean, minimalist component library
- **Geist Font Integration**: Typography system with Geist font family
- **Component Library**: 
  - Navigation systems
  - Form elements and inputs
  - Button variants and states
  - Card layouts and containers
  - Table styling and data display
  - Modal and overlay systems
  - Progress indicators
  - Alert and notification styles
  - Grid and layout utilities

### Font System: css/site/font-fix.css (4KB)
- **Geist Font Loading**: Proper font loading and fallback management
- **Typography Standards**: Consistent font weight and size systems

## JavaScript Architecture Philosophy

### Modular Design Pattern
- **Controller-Based**: Each major feature has a dedicated controller class
- **Manager Pattern**: Functionality split into specialized managers (Config, API, UI, Excel)
- **Subfolder Organization**: Complex features organized in logical subfolders
- **Future Extensibility**: Architecture designed for unlimited feature additions

### Current Modular Structure
```
js/
├── quote/
│   ├── quote-controller.js     - Main controller
│   ├── api-manager.js          - API handling
│   ├── credential-manager.js   - Credential management
│   ├── excel-processor.js      - Excel operations
│   └── ui-manager.js          - UI operations
├── qrcode/                     - QR scanner modules
└── exce/                      - Excel processor modules
```

### Design Patterns Used
- **Module Pattern**: Encapsulated functionality with private/public methods
- **Controller Pattern**: Central coordination of feature components
- **Manager Pattern**: Specialized managers for different responsibilities
- **Observer Pattern**: Event-driven communication between components
- **Factory Pattern**: Dynamic creation of UI components and data processors

## Proposed Quote.html Enhancement (NEW REQUIREMENTS)

### Enhanced Functionality Requirements
Building on the existing robust quote.html implementation, the following enhancements are needed:

#### 1. Advanced Configuration Interface
- **Expandable/Collapsible Settings Panel**: Enhanced version of existing config panel
- **Persistent Credential Storage**: Secure local storage with encryption
- **Active/Inactive Status Display**: Real-time token status for both APIs
- **Multi-Environment Support**: Production/Sandbox switching for both APIs

#### 2. Enhanced Excel Processing Engine
- **Advanced Sheet Selection**: Improved sheet preview and selection interface
- **Intelligent Column Detection**: Auto-detection of MPN, Manufacturer, Quantity columns
- **Flexible Row Selection**: Range selection and individual row selection
- **Data Validation**: Input validation and error prevention

#### 3. Advanced API Integration System
- **Simultaneous Multi-API Processing**: Parallel Digikey and Mouser API calls
- **Intelligent Rate Limiting**: Dynamic rate adjustment based on API responses
- **Enhanced Error Handling**: Retry logic and fallback mechanisms
- **Data Mapping System**: Configurable field mapping between APIs and output

#### 4. Extended Output Column System
**Digikey Data Fields**:
- Unit Price - Current pricing information
- Manufacturer - Component manufacturer name
- Detailed Description - Complete product description
- Datasheet - Direct datasheet URL links
- Stock Available - Current inventory levels
- Package/Case - Physical package specifications
- HTSUS Number - Complete harmonized tariff code
- HTSUS Stripped - First 8 digits only (regulatory requirement)

**Mouser Data Fields**:
- Unit Price - Current Mouser pricing
- Manufacturer - Manufacturer information
- Detailed Description - Product specifications
- Datasheet - Datasheet documentation links
- Stock Available - Real-time stock levels
- HTSUS Number - Full tariff classification
- HTSUS Stripped - 8-digit regulatory code

#### 5. Enhanced Export System
- **Perfect Format Preservation**: Zero changes to original Excel formatting
- **Append-Only Data Addition**: New columns added without disrupting existing data
- **Multi-Sheet Support**: Process and export multiple sheets
- **Audit Trail**: Processing log embedded in exported file

#### 6. Advanced Processing Architecture
- **Extremely Modular JavaScript**: Enhanced modular architecture for unlimited extensibility
- **Controller Pattern Evolution**: Advanced controller with plugin architecture
- **Manager System Expansion**: Additional specialized managers for new features
- **Event-Driven Communication**: Enhanced inter-component communication

### Technical Implementation Requirements

#### JavaScript Architecture Enhancement
```
js/quote/
├── controllers/
│   ├── main-controller.js      - Enhanced main controller
│   ├── processing-controller.js - Processing orchestration
│   └── export-controller.js    - Advanced export handling
├── managers/
│   ├── credential-manager.js   - Enhanced credential handling
│   ├── api-manager.js         - Multi-API coordination
│   ├── excel-manager.js       - Advanced Excel operations
│   ├── ui-manager.js          - Enhanced UI operations
│   └── validation-manager.js  - Input validation and error handling
├── processors/
│   ├── digikey-processor.js   - Digikey-specific processing
│   ├── mouser-processor.js    - Mouser-specific processing
│   └── data-formatter.js     - Output formatting and mapping
└── utils/
    ├── rate-limiter.js        - API rate limiting utilities
    ├── error-handler.js       - Centralized error handling
    └── storage-manager.js     - Secure local storage operations
```

#### Enhanced HTML Structure Requirements
- **Responsive Configuration Panel**: Improved collapsible interface
- **Advanced Row Selection Modal**: Enhanced selection with range support
- **Dynamic Column Configuration**: Drag-and-drop column management
- **Real-Time Progress Display**: Enhanced progress tracking with detailed metrics
- **Results Management Interface**: Advanced results viewing and manipulation

#### CSS Integration Requirements
- **Zero CSS Modifications**: All styling through existing styles.css
- **Component Reusability**: Use existing CSS components and classes
- **Responsive Design**: Mobile-friendly interface using existing grid system
- **Accessibility**: Proper ARIA labels and keyboard navigation support

### Future Extensibility Considerations

#### Plugin Architecture Preparation
- **Modular Plugin System**: Architecture to support future API integrations
- **Configuration Extensibility**: Flexible configuration system for new data sources
- **Export Format Extensions**: Support for future export formats (CSV, JSON, PDF)
- **UI Component Library**: Reusable UI components for rapid feature development

#### Scalability Considerations
- **Performance Optimization**: Efficient processing for large datasets (10,000+ rows)
- **Memory Management**: Proper cleanup and garbage collection
- **Error Recovery**: Robust error handling and recovery mechanisms
- **User Experience**: Smooth interactions with loading states and feedback

This enhanced Quote.html page represents a significant evolution of the existing robust system, adding advanced multi-API processing capabilities while maintaining the project's core design principles of modularity, Swiss design aesthetics, and future extensibility.