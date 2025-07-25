/**
 * Test Extension Ready State
 * 
 * This script waits for the extension to be fully loaded before running tests.
 * Run this in the browser console on a Reddit page.
 */

console.log('🔍 Testing Extension Ready State...');

// Function to wait for extension to be ready
async function waitForExtension(maxWaitTime = 10000) {
  const startTime = Date.now();
  
  console.log('⏳ Waiting for extension to be ready...');
  
  while (Date.now() - startTime < maxWaitTime) {
    if (window.redditCommentExpander && typeof window.redditCommentExpander === 'object') {
      console.log('✅ Extension found!');
      
      // Check if key components are available
      const expander = window.redditCommentExpander;
      const checks = [
        { name: 'expander', value: expander.expander },
        { name: 'detector', value: expander.detector },
        { name: 'state', value: expander.state },
        { name: 'accessibility', value: expander.accessibility }
      ];
      
      let allReady = true;
      checks.forEach(check => {
        if (check.value) {
          console.log(`✅ ${check.name} component ready`);
        } else {
          console.log(`❌ ${check.name} component missing`);
          allReady = false;
        }
      });
      
      if (allReady) {
        console.log('🎉 Extension is fully ready!');
        return true;
      }
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('⏰ Timeout waiting for extension');
  return false;
}

// Function to run basic extension tests
async function testExtensionBasic() {
  console.log('\n🧪 Running Basic Extension Tests...');
  
  const expander = window.redditCommentExpander;
  
  // Test 1: Basic functionality
  console.log('📋 Test 1: Basic Functionality');
  console.log('  - expander object:', typeof expander);
  console.log('  - isExpanding getter:', typeof expander.isExpanding);
  console.log('  - getStats method:', typeof expander.getStats);
  
  // Test 2: Component availability
  console.log('\n📋 Test 2: Component Availability');
  console.log('  - CommentExpander:', typeof expander.expander);
  console.log('  - RedditDetector:', typeof expander.detector);
  console.log('  - ExpansionState:', typeof expander.state);
  console.log('  - AccessibilityManager:', typeof expander.accessibility);
  
  // Test 3: Worker support
  console.log('\n📋 Test 3: Worker Support');
  if (expander.expander && expander.expander.workerManager) {
    console.log('  - WorkerManager available:', typeof expander.expander.workerManager);
    console.log('  - Worker initialized:', expander.expander.workerManager.isInitialized);
  } else {
    console.log('  - WorkerManager not available yet');
  }
  
  // Test 4: State management
  console.log('\n📋 Test 4: State Management');
  if (expander.state) {
    console.log('  - Current status:', expander.state.getStatus());
    console.log('  - State object:', typeof expander.state.getState());
  } else {
    console.log('  - State manager not available');
  }
  
  // Test 5: Reddit detection
  console.log('\n📋 Test 5: Reddit Detection');
  if (expander.detector) {
    console.log('  - Reddit version:', expander.detector.version);
    console.log('  - Is comment page:', expander.isCommentPage);
  } else {
    console.log('  - Detector not available');
  }
  
  return true;
}

// Function to test worker functionality
async function testWorkerFunctionality() {
  console.log('\n🔧 Testing Worker Functionality...');
  
  const expander = window.redditCommentExpander;
  
  if (!expander.expander || !expander.expander.workerManager) {
    console.log('❌ WorkerManager not available');
    return false;
  }
  
  try {
    // Test worker initialization
    console.log('📋 Test 1: Worker Initialization');
    await expander.expander.initializeWorkerSupport();
    console.log('  - Worker initialized:', expander.expander.workerManager.isInitialized);
    
    // Test worker health check
    console.log('\n📋 Test 2: Worker Health Check');
    const healthResult = await expander.expander.workerManager.healthCheck();
    console.log('  - Health check result:', healthResult);
    
    // Test thread analysis
    console.log('\n📋 Test 3: Thread Analysis');
    const htmlContent = document.documentElement.outerHTML;
    const analysis = await expander.expander.workerManager.analyzeThreadStructure(htmlContent);
    console.log('  - Thread analysis:', analysis);
    
    // Test performance
    console.log('\n📋 Test 4: Performance Test');
    const performanceResult = await expander.expander.testWorkerPerformance();
    console.log('  - Performance test:', performanceResult);
    
    return true;
  } catch (error) {
    console.error('❌ Worker test failed:', error);
    return false;
  }
}

// Main test function
async function runExtensionTests() {
  console.log('🚀 Starting Extension Tests...\n');
  
  // Step 1: Wait for extension to be ready
  const extensionReady = await waitForExtension(15000); // Wait up to 15 seconds
  
  if (!extensionReady) {
    console.error('❌ Extension not ready after timeout');
    console.log('💡 Try refreshing the page and running the test again');
    return false;
  }
  
  // Step 2: Run basic tests
  const basicTestsPassed = await testExtensionBasic();
  
  // Step 3: Run worker tests
  const workerTestsPassed = await testWorkerFunctionality();
  
  // Step 4: Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Extension Ready: ${extensionReady ? '✅' : '❌'}`);
  console.log(`Basic Tests: ${basicTestsPassed ? '✅' : '❌'}`);
  console.log(`Worker Tests: ${workerTestsPassed ? '✅' : '❌'}`);
  
  if (extensionReady && basicTestsPassed && workerTestsPassed) {
    console.log('\n🎉 All tests passed! Extension is working correctly.');
    console.log('🚀 You can now use the extension features.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the output above for details.');
  }
  
  return extensionReady && basicTestsPassed && workerTestsPassed;
}

// Auto-run the test
setTimeout(runExtensionTests, 1000);

// Also make it available for manual execution
window.runExtensionTests = runExtensionTests;
console.log('💡 You can also run the test manually with: runExtensionTests()'); 