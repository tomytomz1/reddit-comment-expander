# Testing Guide for Reddit Comment Expander

This guide covers testing strategies for the three major implementations:
1. **Targeted Error Handling** (replacing global AbortError suppression)
2. **Central Error Boundary System** 
3. **Proper State Management**

## Quick Test Setup

### 1. Load the Extension
```bash
# In Chrome, go to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" and select the extension folder
```

### 2. Open Browser DevTools
```bash
# Press F12 or right-click → Inspect
# Go to Console tab to see logs
# Go to Application → Storage → Local Storage to see state persistence
```

---

## 1. Testing Targeted Error Handling

### Manual Testing

#### Test AbortError Suppression is Removed
1. **Navigate to a Reddit comment page**
2. **Open DevTools Console**
3. **Trigger expansion**: Click the floating button or use Alt+Shift+E
4. **Look for evidence that global suppression is gone**:
   ```javascript
   // You should NOT see this behavior anymore:
   // - Completely silent AbortErrors
   // - Missing error logs that should appear
   
   // You SHOULD see this behavior:
   // - AbortErrors logged at debug level with context
   // - All other errors still visible normally
   ```

#### Test Targeted Error Handling During Expansion
1. **Navigate to a large Reddit thread** (500+ comments)
2. **Open Console and filter for "ExpansionErrorHandler"**
3. **Start expansion**
4. **Verify targeted handling**:
   ```javascript
   // Expected console output:
   // [ExpansionErrorHandler] Started tracking expansion-related errors
   // [ExpansionErrorHandler] AbortError during expansion (expand button click): {count: 1, error: "...", timestamp: "..."}
   // [ExpansionErrorHandler] Expansion complete. Tracked N AbortErrors
   ```

#### Test Error Context Preservation
1. **Simulate a real error** (not AbortError):
   ```javascript
   // In console, inject a test error during expansion:
   window.redditCommentExpander.state.addError(
     new Error("Test error for visibility check"), 
     {operationName: "manual test"}
   );
   ```
2. **Verify the error appears normally** in console with full details
3. **Check error is reported to background script**

### Automated Testing
```javascript
// Test script to run in console
(async function testErrorHandling() {
  console.log("Testing Error Handling Implementation...");
  
  const expander = window.redditCommentExpander;
  if (!expander) {
    console.error("❌ Reddit Comment Expander not found");
    return;
  }
  
  // Test 1: Error handler exists
  if (expander.errorHandler) {
    console.log("✅ ExpansionErrorHandler initialized");
  } else {
    console.error("❌ ExpansionErrorHandler not found");
  }
  
  // Test 2: AbortError detection
  const testAbortError = new DOMException("Test abort", "AbortError");
  const isAbortError = expander.errorHandler.isExpansionAbortError(testAbortError);
  console.log(isAbortError ? "✅ AbortError detection works" : "❌ AbortError detection failed");
  
  // Test 3: Check global suppression is removed
  const originalConsoleError = console.error.toString();
  if (originalConsoleError.includes("AbortError")) {
    console.error("❌ Global AbortError suppression still present");
  } else {
    console.log("✅ Global AbortError suppression removed");
  }
  
  console.log("Error handling tests complete");
})();
```

---

## 2. Testing Central Error Boundary System

### Manual Testing

#### Test Error Boundary Initialization
1. **Check initialization in console**:
   ```javascript
   // Expected logs:
   // 🚀 Initializing Reddit Comment Expander with Error Boundary
   // ✅ Reddit Comment Expander initialized successfully
   ```

#### Test Error Recovery Strategies
1. **Test DOM recovery**: Reload page during loading and trigger expansion
2. **Test rate limit recovery**: Rapidly trigger multiple expansions
3. **Test extension context recovery**: Disable/enable extension while expanding

#### Test User-Friendly Error Messages
1. **Simulate network error**:
   ```javascript
   // In console:
   window.redditExpanderErrorBoundary.showUserFriendlyError(
     new Error("fetch failed"), 
     "comment expansion"
   );
   ```
2. **Verify notification appears** with user-friendly message
3. **Test different error types**:
   ```javascript
   // Test various error types
   const errors = [
     new Error("NetworkError: fetch failed"),
     new Error("reddit server error"),
     new TypeError("Cannot read property 'null'"),
     new Error("rate limit exceeded"),
     new DOMException("Test abort", "AbortError")
   ];
   
   errors.forEach((error, i) => {
     setTimeout(() => {
       window.redditExpanderErrorBoundary.showUserFriendlyError(error, "test operation");
     }, i * 2000);
   });
   ```

#### Test Runtime Error Reporting
1. **Check background script console**:
   ```bash
   # In Chrome: chrome://extensions/
   # Find Reddit Comment Expander
   # Click "background page" or "service worker"
   # Check for error reports: 🛡️ Error Boundary Report
   ```

2. **Verify error storage**:
   ```javascript
   // In console:
   chrome.storage.local.get(['errorReports'], (result) => {
     console.log('Stored error reports:', result.errorReports);
   });
   ```

### Automated Testing
```javascript
// Test script for error boundary
(async function testErrorBoundary() {
  console.log("Testing Error Boundary Implementation...");
  
  const errorBoundary = window.redditExpanderErrorBoundary;
  if (!errorBoundary) {
    console.error("❌ Error boundary not found");
    return;
  }
  
  // Test 1: Error boundary exists and has methods
  const requiredMethods = ['wrap', 'showUserFriendlyError', 'reportToRuntime'];
  const hasAllMethods = requiredMethods.every(method => 
    typeof errorBoundary[method] === 'function'
  );
  console.log(hasAllMethods ? "✅ Error boundary methods present" : "❌ Missing methods");
  
  // Test 2: Error wrapping
  try {
    await errorBoundary.wrap(
      () => { throw new Error("Test error"); },
      { operationName: "test operation", suppressUserNotification: true }
    );
  } catch (error) {
    console.log("✅ Error boundary catches and rethrows errors");
  }
  
  // Test 3: Retry logic
  let attempts = 0;
  try {
    await errorBoundary.wrap(
      () => {
        attempts++;
        if (attempts < 3) throw new Error("Retryable error");
        return "success";
      },
      { operationName: "retry test", maxRetries: 2, suppressUserNotification: true }
    );
    console.log(`✅ Retry logic works (${attempts} attempts)`);
  } catch (error) {
    console.error("❌ Retry logic failed");
  }
  
  console.log("Error boundary tests complete");
})();
```

---

## 3. Testing Proper State Management

### Manual Testing

#### Test State Initialization
1. **Check state manager initialization**:
   ```javascript
   // In console:
   const expander = window.redditCommentExpander;
   console.log("State manager:", expander.state);
   console.log("Current state:", expander.state.getState());
   console.log("Status:", expander.state.getStatus());
   ```

#### Test State Persistence
1. **Start an expansion**, then **refresh the page mid-expansion**
2. **Check localStorage**:
   ```javascript
   // In console:
   const saved = localStorage.getItem('reddit-expander-state');
   console.log("Persisted state:", JSON.parse(saved));
   ```
3. **Verify state restoration** after page reload

#### Test Observer Pattern
1. **Set up observers**:
   ```javascript
   // In console:
   const expander = window.redditCommentExpander;
   
   // Subscribe to all state changes
   const unsubscribe = expander.state.subscribe('*', (state, event) => {
     console.log(`State event: ${event.type}`, state);
   });
   
   // Subscribe to specific events
   expander.state.subscribe('statusChanged', (state, event) => {
     console.log(`Status changed: ${state.previousStatus} → ${state.status}`);
   });
   
   expander.state.subscribe('progressUpdated', (state, event) => {
     console.log(`Progress: ${state.progress.processed}/${state.progress.total} (${state.progress.percentage}%)`);
   });
   ```

2. **Trigger expansion** and watch observer notifications

#### Test State Transitions
1. **Test all state transitions**:
   ```javascript
   // In console:
   const expander = window.redditCommentExpander;
   
   console.log("Initial state:", expander.state.getStatus());
   
   // Start expansion (idle → expanding)
   expander.expandAllComments();
   
   // Wait a moment, then pause
   setTimeout(() => {
     expander.pause("Testing pause");
     console.log("After pause:", expander.state.getStatus());
   }, 2000);
   
   // Resume
   setTimeout(() => {
     expander.resume();
     console.log("After resume:", expander.state.getStatus());
   }, 4000);
   
   // Cancel
   setTimeout(() => {
     expander.cancel();
     console.log("After cancel:", expander.state.getStatus());
   }, 6000);
   ```

#### Test Legacy Compatibility
1. **Verify legacy properties still work**:
   ```javascript
   // In console:
   const expander = window.redditCommentExpander;
   
   console.log("Legacy isExpanding:", expander.isExpanding);
   console.log("Legacy isPaused:", expander.isPaused);
   console.log("Legacy shouldCancel:", expander.shouldCancel);
   console.log("Legacy stats:", expander.getStats());
   ```

### Automated Testing
```javascript
// Comprehensive state management test
(async function testStateManagement() {
  console.log("Testing State Management Implementation...");
  
  const expander = window.redditCommentExpander;
  if (!expander || !expander.state) {
    console.error("❌ State manager not found");
    return;
  }
  
  const state = expander.state;
  
  // Test 1: State manager exists with required methods
  const requiredMethods = [
    'getState', 'getStatus', 'setStatus', 'updateProgress', 
    'addError', 'subscribe', 'updateState'
  ];
  const hasAllMethods = requiredMethods.every(method => 
    typeof state[method] === 'function'
  );
  console.log(hasAllMethods ? "✅ State manager methods present" : "❌ Missing state methods");
  
  // Test 2: Initial state structure
  const currentState = state.getState();
  const hasRequiredProperties = ['status', 'progress', 'categories', 'errors'].every(
    prop => currentState.hasOwnProperty(prop)
  );
  console.log(hasRequiredProperties ? "✅ State structure valid" : "❌ Invalid state structure");
  
  // Test 3: Observer pattern
  let observerCalled = false;
  const unsubscribe = state.subscribe('statusChanged', () => {
    observerCalled = true;
  });
  
  state.setStatus('expanding');
  setTimeout(() => {
    console.log(observerCalled ? "✅ Observer pattern works" : "❌ Observer pattern failed");
    unsubscribe();
    
    // Test 4: State persistence
    const persistedState = localStorage.getItem('reddit-expander-state');
    console.log(persistedState ? "✅ State persistence works" : "❌ State persistence failed");
    
    // Test 5: Legacy compatibility
    const legacyWorks = typeof expander.isExpanding === 'boolean' && 
                       typeof expander.getStats === 'function';
    console.log(legacyWorks ? "✅ Legacy compatibility maintained" : "❌ Legacy compatibility broken");
    
    console.log("State management tests complete");
  }, 100);
})();
```

---

## Integration Testing

### Test All Three Systems Together
```javascript
// Comprehensive integration test
(async function integrationTest() {
  console.log("Running Integration Tests...");
  
  const expander = window.redditCommentExpander;
  const errorBoundary = window.redditExpanderErrorBoundary;
  
  if (!expander || !errorBoundary) {
    console.error("❌ Components not available for integration test");
    return;
  }
  
  // Test 1: Error boundary + State management
  console.log("Testing error boundary + state integration...");
  
  let stateErrorReceived = false;
  expander.state.subscribe('errorAdded', () => {
    stateErrorReceived = true;
  });
  
  try {
    await errorBoundary.wrap(
      () => { throw new Error("Integration test error"); },
      { operationName: "integration test", suppressUserNotification: true }
    );
  } catch (error) {
    // Expected
  }
  
  setTimeout(() => {
    console.log(stateErrorReceived ? "✅ Error boundary + state integration works" : "❌ Integration failed");
    
    // Test 2: Full expansion with all systems
    console.log("Testing full expansion with all systems...");
    
    // Navigate to a Reddit comment page first, then run:
    if (window.location.href.includes('reddit.com') && window.location.href.includes('/comments/')) {
      expander.expandAllComments().then(() => {
        console.log("✅ Full expansion with all systems completed");
        console.log("Final state:", expander.state.getStateSummary());
      }).catch(error => {
        console.log("✅ Error handled by all systems:", error.message);
      });
    } else {
      console.log("ℹ️ Navigate to a Reddit comment page to test full expansion");
    }
  }, 100);
})();
```

---

## Performance Testing

### Memory Usage
```javascript
// Monitor memory usage during expansion
(function monitorMemory() {
  if (!performance.memory) {
    console.log("Memory monitoring not available");
    return;
  }
  
  const startMemory = performance.memory.usedJSHeapSize;
  console.log("Starting memory usage:", (startMemory / 1024 / 1024).toFixed(2), "MB");
  
  // Monitor during expansion
  const interval = setInterval(() => {
    const currentMemory = performance.memory.usedJSHeapSize;
    const delta = currentMemory - startMemory;
    console.log("Memory delta:", (delta / 1024 / 1024).toFixed(2), "MB");
  }, 1000);
  
  // Stop monitoring after 30 seconds
  setTimeout(() => {
    clearInterval(interval);
    const endMemory = performance.memory.usedJSHeapSize;
    const totalDelta = endMemory - startMemory;
    console.log("Final memory delta:", (totalDelta / 1024 / 1024).toFixed(2), "MB");
  }, 30000);
})();
```

---

## Debugging Tips

### Enable Debug Logging
```javascript
// Enable verbose logging
localStorage.setItem('reddit-expander-debug', 'true');

// Reload page and run expansion to see detailed logs
```

### State Inspector
```javascript
// Add to console for real-time state monitoring
(function stateInspector() {
  const expander = window.redditCommentExpander;
  if (!expander) return;
  
  setInterval(() => {
    console.clear();
    console.log("=== State Inspector ===");
    console.log("Status:", expander.state.getStatus());
    console.log("Progress:", expander.state.getProgress());
    console.log("Errors:", expander.state.getErrors().length);
    console.log("Stats:", expander.getStateSummary());
  }, 2000);
})();
```

### Error Report Viewer
```javascript
// View all error reports
chrome.storage.local.get(['errorReports'], (result) => {
  console.table(result.errorReports || []);
});
```

---

## Test Scenarios by Reddit Version

### Old Reddit (old.reddit.com)
- Test with collapsed comments
- Test with "load more comments" links
- Test with nested comment threads

### New Reddit (www.reddit.com)
- Test with React-based components
- Test with dynamic loading
- Test with infinite scroll

### Shreddit (sh.reddit.com)
- Test with web components
- Test with new button formats
- Test with faceplate-partial elements

Run the same test suite on all three Reddit versions to ensure compatibility.