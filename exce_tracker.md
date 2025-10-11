# EXCE.html Project Issue Tracker

## Current Analysis (2025-10-11)

### Files Examined
1. **exce.html** - Main HTML structure with settings panel and form elements
2. **js/exce/main.js** - Application initialization and global event handlers  
3. **js/exce/credentials-manager.js** - Settings panel toggle and credential storage
4. **js/exce/export-handler.js** - Excel export functionality
5. **js/exce/config.js** - Configuration constants and element IDs

### Issues Identified

#### 1. Settings Panel Toggle Not Working
**Problem**: Settings panel expand/collapse functionality broken
**Root Cause**: Event listener binding in credentials-manager.js line 22-26
**HTML Element**: `<button id="toggleSettings" class="button button--ghost">Expand Settings</button>`
**Attributes**: id="toggleSettings", class="button button--ghost"
**Function**: `_toggleSettingsPanel()` at line 54-67 in credentials-manager.js
**Issue**: DOM query failing or event not binding properly

#### 2. Credentials Not Persisting 
**Problem**: localStorage credentials not persisting for extended time
**Root Cause**: Storage persistence issues in utils.js storage methods
**Functions**: 
- `_loadStoredCredentials()` at line 40-55 in credentials-manager.js
- Storage keys: 'exce_digikey_creds', 'exce_mouser_creds'
**Issue**: Need enhanced storage with expiration handling

#### 3. Mouser API CORS Issues
**Problem**: CORS policy blocking Mouser API calls and 405 Method Not Allowed
**Root Cause**: Direct API calls from browser not allowed by Mouser
**Function**: `_testMouserApiKey()` at line 274 in credentials-manager.js
**Error**: "Access to fetch at 'https://api.mouser.com/api/v1/search/partnumber' blocked by CORS policy"
**Solution Needed**: Proxy or alternative API testing method

#### 4. Excel Formatting Lost
**Problem**: Original Excel formatting wiped during processing, only text preserved
**Root Cause**: Using XLSX.utils.aoa_to_sheet() which creates new sheet without formatting
**Function**: `_exportExcel()` at line 23-47 in export-handler.js
**Issue**: Need to preserve original workbook structure and formatting

### Noteworthy Functions/Signatures

#### credentials-manager.js
- `_toggleSettingsPanel()`: Toggles visibility of settings panel
- `_loadStoredCredentials()`: Loads from localStorage on init
- `_saveDigikeyCredentials()`: Saves and tests Digikey API
- `_saveMouserCredentials()`: Saves and tests Mouser API  
- `_testDigikeyAuthentication(creds)`: OAuth2 token test
- `_testMouserApiKey(creds)`: Simple API key validation

#### export-handler.js
- `_exportExcel()`: Creates new workbook with XLSX.utils.aoa_to_sheet()
- `isExportReady()`: Checks if processed data available

#### main.js
- `_setupGlobalEventHandlers()`: Binds keyboard shortcuts and events
- `_initializeUIState()`: Sets initial UI state and hides sections

### Concerning Elements (HTML)

#### Settings Panel Structure
```html
<button id="toggleSettings" class="button button--ghost">Expand Settings</button>
<div id="settingsPanel" class="card" style="display: none;">
```
**Issue**: Inline style display:none may conflict with toggle logic

#### Credential Input Fields  
```html
<input type="text" id="digikeyClientId" autocomplete="off" class="input">
<input type="password" id="digikeyClientSecret" autocomplete="off" class="input">
<input type="password" id="mouserApiKey" autocomplete="off" class="input">
```
**Issue**: Password fields may have browser autofill conflicts

#### Status Indicators
```html
<div class="status-indicator" id="digikeyStatus">
    <div class="status-dot status-dot--inactive"></div>
    <span>Inactive</span>
</div>
```
**Function**: Used by updateCredentialStatus() in utils.js

## Solution Plan

### 1. Fix Settings Panel Toggle
- Check DOM element selection in _toggleSettingsPanel()
- Ensure proper event binding timing
- Add debug logging for toggle states

### 2. Enhanced Credential Storage  
- Add storage expiration timestamps
- Implement robust localStorage error handling
- Add credential validation on app startup

### 3. Mouser API Alternative
- Implement client-side API key validation without server calls
- Add warning about CORS limitations
- Provide manual testing option

### 4. Preserve Excel Formatting
- Use XLSX.read() to parse original workbook
- Modify existing worksheet instead of creating new one
- Preserve cell styles, formulas, and formatting
- Use XLSX.write() with original workbook structure
