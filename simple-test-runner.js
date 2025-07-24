/**
 * Simple Test Runner for Reddit Comment Expander
 * 
 * This version waits for the extension to be fully loaded before running tests
 */

(async function simpleTestRunner() {
  console.log("🧪 Simple Reddit Comment Expander Test Runner");
  console.log("=" .repeat(50));
  
  // Check if we're on Reddit
  if (!window.location.href.includes('reddit.com')) {
    console.error("❌ Please navigate to a Reddit page first");
    return;
  }
  
  // Wait for extension to be ready
  console.log("⏳ Waiting for extension to be ready...");
  
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max wait
  
  while (attempts < maxAttempts) {
    if (window.redditCommentExpander && window.redditExpanderErrorBoundary) {
      console.log("✅ Extension ready!");
      break;
    }
    
    attempts++;
    console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for extension...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (!window.redditCommentExpander || !window.redditExpanderErrorBoundary) {
    console.error("❌ Extension not ready after 30 seconds");
    console.log("💡 Try refreshing the page and running the test again");
    return;
  }
  
  const expander = window.redditCommentExpander;
  const errorBoundary = window.redditExpanderErrorBoundary;
  
  console.log("\n🔍 Running Basic Tests...");
  console.log("-".repeat(30));
  
  let passedTests = 0;
  let totalTests = 0;
  
  function runTest(testName, testFunction) {
    totalTests++;
    try {
      const result = testFunction();
      if (result) {
        passedTests++;
        console.log(`✅ ${testName}`);
      } else {
        console.log(`❌ ${testName}`);
      }
    } catch (error) {
      console.log(`❌ ${testName} - Error: ${error.message}`);
    }
  }
  
  // Test 1: Basic object existence
  runTest("Expander object exists", () => !!expander);
  runTest("Error boundary object exists", () => !!errorBoundary);
  
  // Test 2: Required properties
  runTest("Expander has state property", () => !!expander.state);
  runTest("Expander has errorHandler property", () => !!expander.errorHandler);
  runTest("Expander has detector property", () => !!expander.detector);
  runTest("Expander has accessibility property", () => !!expander.accessibility);
  runTest("Expander has expander property", () => !!expander.expander);
  
  // Test 3: State management
  if (expander.state) {
    runTest("State has getStatus method", () => typeof expander.state.getStatus === 'function');
    runTest("State has getState method", () => typeof expander.state.getState === 'function');
    runTest("State has subscribe method", () => typeof expander.state.subscribe === 'function');
    
    const currentState = expander.state.getState();
    runTest("State has valid structure", () => 
      currentState && 
      typeof currentState.status === 'string' &&
      typeof currentState.progress === 'object'
    );
  }
  
  // Test 4: Error boundary methods
  runTest("Error boundary has wrap method", () => typeof errorBoundary.wrap === 'function');
  runTest("Error boundary has showUserFriendlyError method", () => typeof errorBoundary.showUserFriendlyError === 'function');
  runTest("Error boundary has getErrorStats method", () => typeof errorBoundary.getErrorStats === 'function');
  
  // Test 5: Legacy compatibility
  runTest("Expander has isExpanding property", () => typeof expander.isExpanding === 'boolean');
  runTest("Expander has isPaused property", () => typeof expander.isPaused === 'boolean');
  runTest("Expander has shouldCancel property", () => typeof expander.shouldCancel === 'boolean');
  runTest("Expander has getStats method", () => typeof expander.getStats === 'function');
  
  // Test 6: Control methods
  runTest("Expander has pause method", () => typeof expander.pause === 'function');
  runTest("Expander has resume method", () => typeof expander.resume === 'function');
  runTest("Expander has cancel method", () => typeof expander.cancel === 'function');
  
  // Test 7: Error handling
  if (expander.errorHandler) {
    runTest("Error handler has isExpansionAbortError method", () => typeof expander.errorHandler.isExpansionAbortError === 'function');
    runTest("Error handler has logAbortError method", () => typeof expander.errorHandler.logAbortError === 'function');
  }
  
  // Test 8: Basic functionality
  try {
    const stats = errorBoundary.getErrorStats();
    runTest("Error boundary stats work", () => stats && typeof stats.totalErrors === 'number');
  } catch (error) {
    console.log("❌ Error boundary stats work - Error: " + error.message);
  }
  
  if (expander.state) {
    try {
      const status = expander.state.getStatus();
      runTest("State status retrieval works", () => typeof status === 'string');
    } catch (error) {
      console.log("❌ State status retrieval works - Error: " + error.message);
    }
  }
  
  // Test 9: Observer pattern
  if (expander.state && expander.state.subscribe) {
    try {
      let observerCalled = false;
      const unsubscribe = expander.state.subscribe('statusChanged', () => {
        observerCalled = true;
      });
      
      // Trigger a status change
      const originalStatus = expander.state.getStatus();
      expander.state.setStatus('idle');
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      runTest("Observer pattern works", () => observerCalled);
      
      // Cleanup
      unsubscribe();
      expander.state.setStatus(originalStatus);
    } catch (error) {
      console.log("❌ Observer pattern works - Error: " + error.message);
    }
  }
  
  // Test 10: Error boundary wrapping
  try {
    const result = await errorBoundary.wrap(
      () => Promise.resolve("test success"),
      { operationName: "test operation", suppressUserNotification: true }
    );
    runTest("Error boundary wrapping works", () => result === "test success");
  } catch (error) {
    console.log("❌ Error boundary wrapping works - Error: " + error.message);
  }
  
  // Results
  console.log("\n📊 Test Results");
  console.log("=" .repeat(30));
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Extension is working correctly.");
  } else if (passedTests >= totalTests * 0.8) {
    console.log("👍 Most tests passed. Extension is working well with minor issues.");
  } else {
    console.log("⚠️ Several tests failed. There may be issues with the extension.");
  }
  
  console.log("\n🚀 Next Steps:");
  console.log("1. Try expanding comments on this page");
  console.log("2. Use Alt+Shift+E to start expansion");
  console.log("3. Use Alt+Shift+P to pause and Alt+Shift+R to resume");
  console.log("4. Check the console for any error messages");
  
})(); 