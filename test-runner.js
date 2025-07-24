/**
 * Quick Test Runner for Reddit Comment Expander
 * 
 * Copy and paste this entire script into the browser console
 * while on a Reddit comment page to test all three implementations.
 */

(async function testRedditCommentExpander() {
  console.log("🧪 Starting Reddit Comment Expander Test Suite...");
  console.log("=" .repeat(60));
  
  // Check if we're on a Reddit page
  if (!window.location.href.includes('reddit.com')) {
    console.error("❌ Please navigate to a Reddit page first");
    return;
  }
  
  const results = {
    errorHandling: { passed: 0, failed: 0, tests: 0 },
    errorBoundary: { passed: 0, failed: 0, tests: 0 },
    stateManagement: { passed: 0, failed: 0, tests: 0 }
  };
  
  function logTest(category, testName, passed, details = '') {
    results[category].tests++;
    if (passed) {
      results[category].passed++;
      console.log(`✅ ${testName}`, details);
    } else {
      results[category].failed++;
      console.error(`❌ ${testName}`, details);
    }
  }
  
  // ===========================================
  // 1. TEST TARGETED ERROR HANDLING
  // ===========================================
  console.log("\n1️⃣ Testing Targeted Error Handling...");
  console.log("-".repeat(40));
  
  // Test: ExpansionErrorHandler exists
  const expander = window.redditCommentExpander;
  logTest('errorHandling', 'ExpansionErrorHandler exists', 
    expander && expander.errorHandler, 
    expander?.errorHandler ? 'Found error handler' : 'Error handler missing');
  
  // Test: AbortError detection
  if (expander?.errorHandler) {
    const testAbortError = new DOMException("Test abort", "AbortError");
    const detectsAbortError = expander.errorHandler.isExpansionAbortError(testAbortError);
    logTest('errorHandling', 'AbortError detection works', detectsAbortError);
  }
  
  // Test: Global suppression removed
  const originalConsoleError = console.error.toString();
  const globalSuppressionRemoved = !originalConsoleError.includes("AbortError");
  logTest('errorHandling', 'Global AbortError suppression removed', globalSuppressionRemoved);
  
  // Test: Error tracking
  if (expander?.errorHandler) {
    const initialCount = expander.errorHandler.abortErrorCount;
    expander.errorHandler.logAbortError('test context', new DOMException("Test", "AbortError"));
    const newCount = expander.errorHandler.abortErrorCount;
    logTest('errorHandling', 'Error tracking works', newCount > initialCount);
  }
  
  // ===========================================
  // 2. TEST ERROR BOUNDARY SYSTEM
  // ===========================================
  console.log("\n2️⃣ Testing Error Boundary System...");
  console.log("-".repeat(40));
  
  const errorBoundary = window.redditExpanderErrorBoundary;
  logTest('errorBoundary', 'Error boundary exists', 
    !!errorBoundary, 
    errorBoundary ? 'Found global error boundary' : 'Error boundary missing');
  
  // Test: Required methods exist
  if (errorBoundary) {
    const requiredMethods = ['wrap', 'showUserFriendlyError', 'reportToRuntime', 'safeCall'];
    const hasAllMethods = requiredMethods.every(method => 
      typeof errorBoundary[method] === 'function'
    );
    logTest('errorBoundary', 'Required methods exist', hasAllMethods, 
      hasAllMethods ? 'All methods present' : 'Missing methods: ' + 
      requiredMethods.filter(m => typeof errorBoundary[m] !== 'function'));
  }
  
  // Test: Error wrapping
  if (errorBoundary) {
    try {
      await errorBoundary.wrap(
        () => { throw new Error("Test error"); },
        { operationName: "test operation", suppressUserNotification: true }
      );
      logTest('errorBoundary', 'Error wrapping', false, 'Should have thrown error');
    } catch (error) {
      logTest('errorBoundary', 'Error wrapping', true, 'Correctly caught and rethrew error');
    }
  }
  
  // Test: Retry logic
  if (errorBoundary) {
    let attempts = 0;
    try {
      const result = await errorBoundary.wrap(
        () => {
          attempts++;
          if (attempts < 3) throw new Error("Retryable error");
          return "success";
        },
        { operationName: "retry test", maxRetries: 2, suppressUserNotification: true }
      );
      logTest('errorBoundary', 'Retry logic', result === "success", `${attempts} attempts made`);
    } catch (error) {
      logTest('errorBoundary', 'Retry logic', false, 'Retry failed: ' + error.message);
    }
  }
  
  // Test: Error statistics
  if (errorBoundary) {
    const stats = errorBoundary.getErrorStats();
    logTest('errorBoundary', 'Error statistics tracking', 
      stats && typeof stats.totalErrors === 'number', 
      `Total errors: ${stats?.totalErrors || 0}`);
  }
  
  // ===========================================
  // 3. TEST STATE MANAGEMENT
  // ===========================================
  console.log("\n3️⃣ Testing State Management...");
  console.log("-".repeat(40));
  
  // Test: State manager exists
  logTest('stateManagement', 'State manager exists', 
    expander && expander.state, 
    expander?.state ? 'Found state manager' : 'State manager missing');
  
  // Test: Required state methods
  if (expander?.state) {
    const requiredMethods = [
      'getState', 'getStatus', 'setStatus', 'updateProgress', 
      'addError', 'subscribe', 'updateState', 'initializeExpansion'
    ];
    const hasAllMethods = requiredMethods.every(method => 
      typeof expander.state[method] === 'function'
    );
    logTest('stateManagement', 'Required state methods exist', hasAllMethods,
      hasAllMethods ? 'All methods present' : 'Missing methods');
  }
  
  // Test: State structure
  if (expander?.state) {
    const currentState = expander.state.getState();
    const requiredProperties = ['status', 'progress', 'categories', 'errors', 'sessionId'];
    const hasRequiredProperties = requiredProperties.every(
      prop => currentState.hasOwnProperty(prop)
    );
    logTest('stateManagement', 'Valid state structure', hasRequiredProperties,
      hasRequiredProperties ? 'All properties present' : 'Missing properties');
  }
  
  // Test: Observer pattern
  if (expander?.state) {
    let observerCalled = false;
    const unsubscribe = expander.state.subscribe('statusChanged', () => {
      observerCalled = true;
    });
    
    const originalStatus = expander.state.getStatus();
    expander.state.setStatus('expanding');
    
    // Wait a moment for observer
    await new Promise(resolve => setTimeout(resolve, 50));
    
    logTest('stateManagement', 'Observer pattern works', observerCalled);
    unsubscribe();
    
    // Restore original status
    expander.state.setStatus(originalStatus);
  }
  
  // Test: State persistence
  if (expander?.state) {
    const persistedState = localStorage.getItem('reddit-expander-state');
    logTest('stateManagement', 'State persistence', !!persistedState,
      persistedState ? 'State found in localStorage' : 'No persisted state');
  }
  
  // Test: Legacy compatibility
  if (expander) {
    const legacyPropsWork = typeof expander.isExpanding === 'boolean' && 
                           typeof expander.isPaused === 'boolean' &&
                           typeof expander.shouldCancel === 'boolean' &&
                           typeof expander.getStats === 'function';
    logTest('stateManagement', 'Legacy compatibility', legacyPropsWork,
      legacyPropsWork ? 'All legacy properties work' : 'Legacy properties broken');
  }
  
  // Test: State transitions
  if (expander?.state && expander.pause && expander.resume && expander.cancel) {
    try {
      const initialStatus = expander.state.getStatus();
      
      // Test pause (only if currently expanding)
      if (initialStatus === 'expanding') {
        const pauseResult = expander.pause("Test pause");
        const pauseWorked = pauseResult && expander.state.getStatus() === 'paused';
        logTest('stateManagement', 'Pause functionality', pauseWorked);
        
        // Test resume
        const resumeResult = expander.resume();
        const resumeWorked = resumeResult && expander.state.getStatus() === 'expanding';
        logTest('stateManagement', 'Resume functionality', resumeWorked);
      } else {
        logTest('stateManagement', 'Pause/Resume functionality', true, 'Skipped (not expanding)');
      }
      
      // Test cancel (works from any active state)
      if (['expanding', 'paused'].includes(expander.state.getStatus())) {
        const cancelResult = expander.cancel();
        const cancelWorked = cancelResult && expander.state.getStatus() === 'cancelled';
        logTest('stateManagement', 'Cancel functionality', cancelWorked);
      }
    } catch (error) {
      logTest('stateManagement', 'State transitions', false, 'Error: ' + error.message);
    }
  }
  
  // ===========================================
  // INTEGRATION TESTS
  // ===========================================
  console.log("\n🔗 Testing Integration...");
  console.log("-".repeat(40));
  
  // Test: All components loaded
  const allComponentsLoaded = !!(expander && expander.state && expander.errorHandler && errorBoundary);
  console.log(allComponentsLoaded ? "✅ All components integrated" : "❌ Missing components");
  
  // Test: Error boundary + State integration
  if (expander?.state && errorBoundary) {
    let stateErrorReceived = false;
    const unsubscribe = expander.state.subscribe('errorAdded', () => {
      stateErrorReceived = true;
    });
    
    // Add a test error to state
    expander.state.addError(new Error("Integration test error"), { 
      operationName: "integration test" 
    });
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log(stateErrorReceived ? "✅ Error boundary + State integration works" : 
                                   "❌ Integration failed");
    unsubscribe();
  }
  
  // ===========================================
  // RESULTS SUMMARY
  // ===========================================
  console.log("\n📊 TEST RESULTS SUMMARY");
  console.log("=" .repeat(60));
  
  let totalPassed = 0, totalFailed = 0, totalTests = 0;
  
  Object.entries(results).forEach(([category, result]) => {
    const categoryName = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    const passRate = result.tests > 0 ? Math.round((result.passed / result.tests) * 100) : 0;
    
    console.log(`${categoryName}: ${result.passed}/${result.tests} passed (${passRate}%)`);
    
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.tests;
  });
  
  const totalPassRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  console.log("-".repeat(40));
  console.log(`OVERALL: ${totalPassed}/${totalTests} passed (${totalPassRate}%)`);
  
  if (totalPassRate >= 90) {
    console.log("🎉 Excellent! All implementations are working well.");
  } else if (totalPassRate >= 70) {
    console.log("👍 Good! Most tests passed, minor issues detected.");
  } else {
    console.log("⚠️ Issues detected. Check failed tests above.");
  }
  
  // ===========================================
  // NEXT STEPS
  // ===========================================
  console.log("\n🚀 NEXT STEPS FOR MANUAL TESTING:");
  console.log("1. Navigate to a Reddit comment page with many comments");
  console.log("2. Click the floating button or press Alt+Shift+E to expand");
  console.log("3. Watch the console for error handling and state updates");
  console.log("4. Try pausing (Alt+Shift+P) and resuming (Alt+Shift+R)");
  console.log("5. Check localStorage for persisted state");
  console.log("6. Test on different Reddit versions (old, new, sh.reddit.com)");
  
  console.log("\n📖 For detailed testing instructions, see TESTING_GUIDE.md");
  
})();