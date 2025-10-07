# Step Tracking System Revamp
**Date:** October 8, 2025  
**Status:** In Progress

## Problem Analysis

### Current Issues Found:
- **Over-complex implementation**: 41KB step-manager.js with conflicting logic
- **Multiple detection strategies**: Intersection observer, mutation observer, fallback detection all fighting each other
- **Complex state management**: Too many internal variables causing state conflicts
- **Event conflicts**: Multiple event listeners triggering simultaneously

### Root Cause:
The current system tries to handle every possible edge case, creating an over-engineered solution that fails at the basic requirement: reliable step tracking.

## HTML Structure Analysis

### Step Elements Found:
1. **Step 1**: `section.mb-48` (first section, no ID) - File Import
2. **Step 2**: `section#step2` - Sheet Selection  
3. **Step 3**: `section#step3` - Data Range Selection
4. **Step 4**: `section#step4` - Column Mapping
5. **Step 5**: `section#step5` - Scanner Interface

### Step Indicator Structure:
- Located in `.step-indicator` div
- Contains `.step-indicator__item` elements
- Each item has `.step-indicator__number` and span text
- Uses classes: `is-current`, `is-complete`, `is-active`

## New Implementation Strategy

### Core Principles:
1. **Single source of truth** for step state
2. **Event-driven progression** - steps activate other steps
3. **Simple visibility detection** - no complex observers
4. **Clear state transitions** - predictable behavior
5. **Modular design** - separate concerns cleanly

### Key Changes:
1. **Simplified detection**: Use simple DOM queries instead of observers
2. **Event-based**: Steps communicate through custom events
3. **State machine**: Clear states and transitions
4. **Performance focused**: Minimal DOM queries, efficient updates

## Files Being Created/Modified:

### 1. js/qrcode/navigation/step-tracker.js (NEW)
- Core step tracking logic
- Simple, reliable implementation
- ~5KB instead of 41KB

### 2. js/qrcode/navigation/step-navigation.js (NEW) 
- Navigation controls (prev/next buttons)
- Separated from tracking logic

### 3. js/qrcode/navigation/step-indicator.js (NEW)
- Visual indicator management
- Clean UI updates

## Implementation Progress:

- [ ] Create core step tracker
- [ ] Create navigation controls 
- [ ] Create indicator manager
- [ ] Test step progression
- [ ] Push files to GitHub
- [ ] Update main.js integration

---

## Technical Notes:

### Step Detection Logic:
```javascript
// Simple approach - check visibility and current viewport position
// No complex observers needed
const isStepVisible = (stepId) => {
  const element = getStepElement(stepId);
  return element && !element.classList.contains('hidden');
};
```

### Event System:
```javascript
// Steps emit events when they complete
document.dispatchEvent(new CustomEvent('step:completed', {
  detail: { stepId: 1 }
}));
```

### State Management:
```javascript
// Simple state object
const state = {
  current: 1,
  completed: new Set(),
  available: new Set([1])
};
```

---

**Next Step**: Implement core step tracker with clean, focused functionality.