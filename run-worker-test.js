/**
 * Simple Test Runner for Web Worker Integration
 * 
 * This script loads and runs the automated test suite.
 * To use: Copy this script and paste it into the browser console on a Reddit page.
 */

console.log('🚀 Starting Web Worker Integration Test Runner...');

// Function to load and run the test
async function runWorkerTest() {
  try {
    // Check if we're on Reddit
    if (!window.location.hostname.includes('reddit.com')) {
      console.error('❌ This test must be run on a Reddit page');
      return;
    }

    // Check if extension is loaded
    if (typeof window.redditCommentExpander === 'undefined') {
      console.error('❌ Reddit Comment Expander extension not found');
      console.log('💡 Make sure the extension is installed and enabled');
      return;
    }

    // Check if WorkerManager is available
    if (typeof window.WorkerManager === 'undefined') {
      console.error('❌ WorkerManager not found');
      console.log('💡 Make sure the extension is properly loaded');
      return;
    }

    console.log('✅ Prerequisites met, starting test...\n');

    // Create and run the test
    const tester = new WorkerIntegrationTester();
    const results = await tester.runAllTests();

    // Display results in a more readable format
    console.log('\n📋 DETAILED RESULTS');
    console.log('===================');
    
    results.results.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.name}`);
      if (test.details) {
        console.log(`   ${JSON.stringify(test.details)}`);
      }
    });

    // Final recommendation
    console.log('\n🎯 RECOMMENDATION');
    console.log('================');
    
    if (results.successRate >= 80) {
      console.log('✅ Web Worker integration is working excellently!');
      console.log('🚀 You can now use the extension with enhanced performance.');
    } else if (results.successRate >= 60) {
      console.log('⚠️ Web Worker integration has some issues but is functional.');
      console.log('🔧 Consider checking the failed tests above.');
    } else {
      console.log('❌ Web Worker integration needs attention.');
      console.log('🔧 Please review the failed tests and check extension loading.');
    }

    return results;

  } catch (error) {
    console.error('❌ Test runner failed:', error);
    return null;
  }
}

// Auto-run the test
setTimeout(runWorkerTest, 1000);

// Also make it available for manual execution
window.runWorkerTest = runWorkerTest;
console.log('💡 You can also run the test manually with: runWorkerTest()'); 