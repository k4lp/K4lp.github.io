# QR Code Component Scanner

A robust and modular QR/barcode scanner for component identification and BOM matching.

## Features

- **Excel Integration**: Import BOM data from .xlsx/.xls files
- **Visual Range Selection**: Interactive data range selection with click-and-drag
- **Column Mapping**: Flexible column mapping for different BOM formats
- **High-Quality Scanning**: Multi-format barcode and QR code support
- **Real-Time Matching**: Instant component matching against BOM data
- **Export Results**: Export scan results with timestamps and match details
- **Audio/Vibration Feedback**: Immediate feedback for successful/failed scans
- **Multi-Camera Support**: Switch between available cameras
- **Swiss Design**: Clean, minimalist interface following design principles

## Setup Instructions

### 1. File Structure
```
your-website/
├── qrcode.html
├── css/site/styles.css  (from main repository)
└── js/qrcode/
    ├── config.js
    ├── utils.js
    ├── excel-handler.js
    ├── range-selector.js
    ├── scanner-manager.js
    ├── data-manager.js
    ├── main.js
    └── libs/
        ├── xlsx.full.min.js
        └── html5-qrcode.min.js
```

### 2. Prerequisites
- Modern web browser (Chrome 61+, Firefox 55+, Safari 11+, Edge 79+)
- HTTPS connection (required for camera access)
- Camera permissions enabled
- The main CSS file from the repository: `css/site/styles.css`

### 3. Installation
1. Extract all files maintaining the directory structure
2. Ensure you have the main CSS file: `css/site/styles.css`
3. Upload to your web server
4. Access via HTTPS (required for camera functionality)

## Usage Guide

### Step 1: Import Excel File
- Click "Select Excel File" and choose your BOM file (.xlsx or .xls)
- File information will be displayed including sheet count

### Step 2: Select Sheet
- Choose the sheet containing your BOM data from the dropdown
- A preview of the first 10 rows will be shown

### Step 3: Select Data Range
- Click and drag to select the data range containing BOM line items
- Include headers and all relevant data rows
- Range selection shows real-time cell references

### Step 4: Map Columns
- Map your Excel columns to BOM fields:
  - **Serial No.**: Item identifier
  - **MPN**: Manufacturer part number
  - **Designators**: Component references
  - **Manufacturer**: Component manufacturer
  - **Quantity**: Component quantity
  - **Target Column**: Column to match against scanned values (required)

### Step 5: Scan Components
- Click "Start Camera" to begin scanning
- Hold QR codes/barcodes steady in the scanning area
- Successful matches show component details and serial number
- Failed matches are logged with timestamp

## Supported Formats

### Barcode Types
- QR Code
- Code 128, Code 39, Code 93
- EAN-8, EAN-13
- UPC-A, UPC-E
- Data Matrix
- PDF417
- Aztec
- ITF (Interleaved 2 of 5)
- Codabar
- RSS-14, RSS Expanded

### File Formats
- Excel: .xlsx, .xls (up to 50MB)
- Export: .xlsx, .csv

## Keyboard Shortcuts

- **Ctrl+E**: Export results
- **Ctrl+R**: Reset scanner  
- **Ctrl+C**: Clear results
- **Space**: Start/stop scanner (when on scanner step)
- **Escape**: Stop scanner
- **F1**: Show help

## Technical Details

### Architecture
- **Modular Design**: 7 JavaScript modules for maintainability
- **No CSS Dependencies**: Uses master site-wide CSS only
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Error Handling**: Comprehensive error handling and user feedback

### Libraries Used
- **SheetJS (xlsx.full.min.js)**: Excel file processing
- **html5-qrcode**: Camera access and barcode scanning
- **Native Web APIs**: Camera, vibration, audio feedback

### Browser Compatibility
- Chrome 61+ (recommended)
- Firefox 55+
- Safari 11+
- Edge 79+

### Security
- Requires HTTPS for camera access
- No data sent to external servers
- Local processing only

## Troubleshooting

### Camera Issues
- Ensure HTTPS connection
- Check camera permissions in browser settings
- Try different browsers if camera doesn't work
- Ensure good lighting conditions

### File Import Issues
- Check file size (max 50MB)
- Ensure file is valid Excel format
- Try saving Excel file in compatibility mode

### Scanning Issues
- Hold codes steady and well-lit
- Ensure code is not damaged or blurry
- Try different camera distances
- Check if code format is supported

## Development

### Debug Mode
Open browser console and run:
```javascript
window.QRScannerMain.enableDebugMode();
// Access debug tools via window.QRDebug
```

### Configuration
Edit `js/qrcode/config.js` to modify:
- Scanner settings (FPS, scan box size)
- Audio feedback settings
- File size limits
- Supported formats

## Support

For technical support or feature requests, contact Alica Technologies.

**Version**: 1.0.0  
**Built**: October 2025  
**License**: Proprietary - Alica Technologies

Built with Swiss minimalist design principles for maximum usability and reliability.
