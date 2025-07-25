# SelectorFactory Migration Guide

## Overview

This guide shows how to refactor the existing `reddit-detector.js` to use the new `SelectorFactory` class, eliminating ~500+ lines of duplicated selector code.

## Before vs After Comparison

### Before: Duplicated Selector Code

```javascript
// In reddit-detector.js - 500+ lines of duplicated selectors
class RedditDetector {
  getSelectors() {
    const baseSelectors = {
      newReddit: {
        moreComments: [
          'button[aria-label*="View more comment"]',
          'button[aria-label*="View Entire Discussion"]',
          // ... 50+ more selectors
        ],
        moreReplies: [
          'button[aria-label*="more repl"]',
          'button[aria-label*="more replies"]',
          // ... 40+ more selectors
        ],
        // ... 6 more categories with 200+ more selectors
      },
      oldReddit: {
        // ... 200+ more selectors
      },
      shReddit: {
        // ... 300+ more selectors
      }
    };
    return baseSelectors[this.version] || baseSelectors.oldReddit;
  }

  findElements(category) {
    const selectors = this.selectors[category];
    // ... complex filtering logic repeated multiple times
    elements = Array.from(document.querySelectorAll('button, a')).filter(elem => {
      const hasJoinOutline = elem.querySelector('svg[icon-name="join-outline"]');
      const hasPlus = elem.querySelector('svg[icon-name="plus"]');
      // ... repeated icon checking logic
    });
  }
}
```

### After: Clean SelectorFactory Usage

```javascript
// In reddit-detector.js - Clean and maintainable
class RedditDetector {
  constructor() {
    this.selectorFactory = window.selectorFactory;
    console.log(`Reddit Comment Expander: Using SelectorFactory for ${this.selectorFactory.version}`);
  }

  findElements(category) {
    return this.selectorFactory.findElements(category);
  }

  hasIcon(element, iconName) {
    return this.selectorFactory.hasIcon(element, iconName);
  }

  hasAnyIcon(element) {
    return this.selectorFactory.hasAnyIcon(element);
  }
}
```

## Step-by-Step Migration

### Step 1: Update Constructor

**Before:**
```javascript
constructor() {
  this.version = this.detectRedditVersion();
  this.selectors = this.getSelectors();
  // ... other initialization
}
```

**After:**
```javascript
constructor() {
  this.selectorFactory = window.selectorFactory;
  // Remove version detection and selector building
  // ... other initialization
}
```

### Step 2: Remove getSelectors() Method

**Delete the entire `getSelectors()` method** - it's now handled by SelectorFactory.

### Step 3: Simplify findElements() Method

**Before:**
```javascript
findElements(category) {
  const selectors = this.selectors[category];
  if (!selectors) {
    console.warn(`No selectors found for category: ${category}`);
    return [];
  }

  let elements = [];
  let usedSelector = null;
  
  // Try each selector in order until we find elements
  for (const selector of selectors) {
    try {
      // Complex fallback logic for :has support
      if (category === 'moreReplies' && this.version === 'shReddit' && selector.includes(':has')) {
        if (!CSS.supports('selector(:has(*))')) {
          elements = Array.from(window.elementCache ? 
            window.elementCache.cachedQuerySelectorAll('button, a') : 
            document.querySelectorAll('button, a')
          ).filter(elem => {
            const hasJoinOutline = elem.querySelector('svg[icon-name="join-outline"]');
            // ... 50+ lines of complex filtering logic
          });
        }
      }
      // ... more complex logic
    } catch (error) {
      console.warn(`Error with selector "${selector}":`, error);
    }
  }
  
  return elements;
}
```

**After:**
```javascript
findElements(category) {
  return this.selectorFactory.findElements(category);
}
```

### Step 4: Replace Icon Detection Logic

**Before:**
```javascript
// Repeated throughout the code
const hasJoinOutline = element.querySelector('svg[icon-name="join-outline"]');
const hasPlus = element.querySelector('svg[icon-name="plus"]');
const hasPlusOutline = element.querySelector('svg[icon-name="plus-outline"]');
const hasExpand = element.querySelector('svg[icon-name="expand"]');
const hasExpandOutline = element.querySelector('svg[icon-name="expand-outline"]');
```

**After:**
```javascript
// Use SelectorFactory methods
const hasJoinOutline = this.selectorFactory.hasIcon(element, 'joinOutline');
const hasPlus = this.selectorFactory.hasIcon(element, 'plus');
const hasPlusOutline = this.selectorFactory.hasIcon(element, 'plusOutline');
const hasExpand = this.selectorFactory.hasIcon(element, 'expand');
const hasExpandOutline = this.selectorFactory.hasIcon(element, 'expandOutline');

// Or check for any icon
const hasAnyIcon = this.selectorFactory.hasAnyIcon(element);
```

### Step 5: Replace Element Filtering Logic

**Before:**
```javascript
// Repeated pattern throughout the code
elements = Array.from(window.elementCache ? 
  window.elementCache.cachedQuerySelectorAll('button, a') : 
  document.querySelectorAll('button, a')
).filter(elem => {
  // Complex filtering logic repeated multiple times
});
```

**After:**
```javascript
// Use SelectorFactory's cached filtering
elements = this.selectorFactory.filterElementsWithCache('button, a', (elem) => {
  // Your custom filtering logic
  return this.selectorFactory.hasAnyIcon(elem);
});
```

### Step 6: Remove Version Detection

**Delete the `detectRedditVersion()` method** - it's now handled by SelectorFactory.

## Complete Refactored RedditDetector

```javascript
// Enhanced Reddit Platform Detection and Element Selectors
class RedditDetector {
  constructor() {
    this.selectorFactory = window.selectorFactory;
    
    // Pre-warm the cache with common selectors
    if (window.elementCache) {
      window.elementCache.preWarm([
        'button[rpl]',
        'svg[icon-name="join-outline"]',
        'shreddit-comment',
        '[data-reddit-expander-processed]'
      ]);
      console.log('[RedditDetector] Pre-warmed element cache with common selectors');
    }
    
    console.log(`Reddit Comment Expander: Using SelectorFactory for ${this.selectorFactory.version}`);
  }

  // Simplified element detection using SelectorFactory
  findElements(category) {
    return this.selectorFactory.findElements(category);
  }

  // Enhanced element detection with multiple selector fallbacks
  findElementsWithFallback(category, options = {}) {
    return this.selectorFactory.findElements(category, options);
  }

  // Icon detection using SelectorFactory
  hasIcon(element, iconName) {
    return this.selectorFactory.hasIcon(element, iconName);
  }

  hasAnyIcon(element) {
    return this.selectorFactory.hasAnyIcon(element);
  }

  // Get all available icon names
  getAvailableIcons() {
    return this.selectorFactory.getIconNames();
  }

  // Build custom button selectors
  buildButtonSelector(classes) {
    return this.selectorFactory.buildButtonSelector(classes);
  }

  // Filter elements with caching
  filterElementsWithCache(baseSelector, filterFn) {
    return this.selectorFactory.filterElementsWithCache(baseSelector, filterFn);
  }

  // Get selector statistics
  getSelectorStats() {
    return this.selectorFactory.getStats();
  }

  // Validate selector syntax
  validateSelector(selector) {
    return this.selectorFactory.validateSelector(selector);
  }

  // Debug selector information
  debugSelectors() {
    this.selectorFactory.debug();
  }

  // Legacy methods for backward compatibility
  getSelectors() {
    console.warn('[RedditDetector] getSelectors() is deprecated. Use SelectorFactory methods instead.');
    return this.selectorFactory.getAllSelectors();
  }

  detectRedditVersion() {
    console.warn('[RedditDetector] detectRedditVersion() is deprecated. Use SelectorFactory.version instead.');
    return this.selectorFactory.version;
  }

  // ... rest of the existing methods remain the same
}
```

## Benefits of Migration

### 1. **Code Reduction**
- **Before**: ~500+ lines of selector code
- **After**: ~50 lines using SelectorFactory
- **Reduction**: ~90% less code

### 2. **Maintainability**
- **Before**: Selectors scattered across multiple methods
- **After**: Centralized in SelectorFactory
- **Benefit**: Update selectors in one place

### 3. **Type Safety**
- **Before**: String-based selectors prone to typos
- **After**: Method-based selector generation
- **Benefit**: Compile-time error detection

### 4. **Performance**
- **Before**: Repeated selector compilation
- **After**: Cached and optimized selectors
- **Benefit**: Better performance

### 5. **Testability**
- **Before**: Hard to unit test selector logic
- **After**: Isolated SelectorFactory with clear API
- **Benefit**: Easier testing

### 6. **Extensibility**
- **Before**: Adding new selectors requires code changes
- **After**: Extensible SelectorFactory architecture
- **Benefit**: Easy to add new selector patterns

## Migration Checklist

- [ ] Update constructor to use SelectorFactory
- [ ] Remove `getSelectors()` method
- [ ] Simplify `findElements()` method
- [ ] Replace icon detection logic
- [ ] Replace element filtering logic
- [ ] Remove `detectRedditVersion()` method
- [ ] Update all icon checking calls
- [ ] Update all element filtering calls
- [ ] Add backward compatibility methods
- [ ] Test all functionality
- [ ] Update documentation

## Testing the Migration

```javascript
// Test that the refactored RedditDetector works correctly
const detector = new RedditDetector();

// Test element finding
const moreReplies = detector.findElements('moreReplies');
console.log('Found more replies:', moreReplies.length);

// Test icon detection
const testElement = document.createElement('button');
testElement.innerHTML = '<svg icon-name="join-outline"></svg>';
const hasIcon = detector.hasIcon(testElement, 'joinOutline');
console.log('Has join outline icon:', hasIcon);

// Test selector statistics
const stats = detector.getSelectorStats();
console.log('Selector stats:', stats);
```

## Rollback Plan

If issues arise during migration, you can easily rollback by:

1. Keeping the old `getSelectors()` method as a fallback
2. Adding a feature flag to switch between old and new implementations
3. Gradually migrating methods one at a time

```javascript
// Rollback mechanism
findElements(category) {
  if (this.useSelectorFactory) {
    return this.selectorFactory.findElements(category);
  } else {
    // Fallback to old implementation
    return this.findElementsLegacy(category);
  }
}
```

This migration will significantly improve code maintainability while preserving all existing functionality. 