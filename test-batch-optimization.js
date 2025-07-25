/**
 * Test Script for Adaptive Batch Size Optimization
 * 
 * This script tests the new adaptive batch sizing system in the Reddit Comment Expander.
 * Run this in the browser console on a Reddit page to test the functionality.
 */

console.log('🧪 Testing Adaptive Batch Size Optimization...');

// Test 1: Check if AdaptiveBatchManager is available
function testBatchManagerAvailability() {
  console.log('\n📋 Test 1: Batch Manager Availability');
  
  if (typeof window.redditCommentExpander !== 'undefined') {
    const expander = window.redditCommentExpander;
    if (expander.batchManager) {
      console.log('✅ AdaptiveBatchManager found in expander');
      console.log('   - Current batch size:', expander.batchManager.getBatchSize());
      console.log('   - Target elements/second:', expander.batchManager.targetElementsPerSecond);
      return true;
    } else {
      console.log('❌ AdaptiveBatchManager not found in expander');
      return false;
    }
  } else {
    console.log('❌ RedditCommentExpander not available');
    return false;
  }
}

// Test 2: Test batch size optimization
function testBatchSizeOptimization() {
  console.log('\n📋 Test 2: Batch Size Optimization');
  
  if (typeof window.redditCommentExpander === 'undefined') {
    console.log('❌ RedditCommentExpander not available');
    return false;
  }
  
  const expander = window.redditCommentExpander;
  const batchManager = expander.batchManager;
  
  if (!batchManager) {
    console.log('❌ BatchManager not available');
    return false;
  }
  
  // Simulate different performance scenarios
  console.log('   Simulating performance scenarios...');
  
  // Scenario 1: Fast processing (should increase batch size)
  console.log('   📈 Scenario 1: Fast processing (2.8 elements/second)');
  batchManager.recordBatchPerformance(3, 1000, 3, 3); // 3 elements in 1 second = 3/s
  batchManager.recordBatchPerformance(3, 1000, 3, 3);
  batchManager.recordBatchPerformance(3, 1000, 3, 3);
  
  console.log('   - Batch size after fast processing:', batchManager.getBatchSize());
  
  // Scenario 2: Slow processing (should decrease batch size)
  console.log('   📉 Scenario 2: Slow processing (0.5 elements/second)');
  batchManager.recordBatchPerformance(3, 6000, 3, 3); // 3 elements in 6 seconds = 0.5/s
  batchManager.recordBatchPerformance(3, 6000, 3, 3);
  batchManager.recordBatchPerformance(3, 6000, 3, 3);
  
  console.log('   - Batch size after slow processing:', batchManager.getBatchSize());
  
  // Scenario 3: High error rate (should decrease batch size)
  console.log('   ⚠️ Scenario 3: High error rate (40% errors)');
  batchManager.recordBatchPerformance(5, 2000, 3, 5); // 3 success, 2 failed = 40% error rate
  batchManager.recordBatchPerformance(5, 2000, 3, 5);
  batchManager.recordBatchPerformance(5, 2000, 3, 5);
  
  console.log('   - Batch size after high error rate:', batchManager.getBatchSize());
  
  return true;
}

// Test 3: Test performance statistics
function testPerformanceStats() {
  console.log('\n📋 Test 3: Performance Statistics');
  
  if (typeof window.redditCommentExpander === 'undefined') {
    console.log('❌ RedditCommentExpander not available');
    return false;
  }
  
  const expander = window.redditCommentExpander;
  const batchManager = expander.batchManager;
  
  if (!batchManager) {
    console.log('❌ BatchManager not available');
    return false;
  }
  
  const stats = batchManager.getPerformanceStats();
  console.log('   📊 Current Performance Stats:');
  console.log('   - Current batch size:', stats.currentBatchSize);
  console.log('   - Average elements/second:', stats.avgElementsPerSecond.toFixed(2));
  console.log('   - Average success rate:', (stats.avgSuccessRate * 100).toFixed(1) + '%');
  console.log('   - Average processing time:', stats.avgProcessingTime.toFixed(0) + 'ms');
  console.log('   - Error rate:', (stats.errorRate * 100).toFixed(1) + '%');
  console.log('   - Memory usage:', (stats.memoryUsage * 100).toFixed(1) + '%');
  console.log('   - Total batches processed:', stats.totalBatches);
  
  return true;
}

// Test 4: Test integration with main expander
function testExpanderIntegration() {
  console.log('\n📋 Test 4: Expander Integration');
  
  if (typeof window.redditCommentExpander === 'undefined') {
    console.log('❌ RedditCommentExpander not available');
    return false;
  }
  
  const expander = window.redditCommentExpander;
  const stats = expander.getStats();
  
  if (stats.batchOptimization) {
    console.log('   ✅ Batch optimization stats integrated into expander stats');
    console.log('   - Current batch size:', stats.batchOptimization.currentBatchSize);
    console.log('   - Average elements/second:', stats.batchOptimization.avgElementsPerSecond.toFixed(2));
    console.log('   - Total batches:', stats.batchOptimization.totalBatches);
    return true;
  } else {
    console.log('❌ Batch optimization stats not found in expander stats');
    return false;
  }
}

// Test 5: Test batch manager reset
function testBatchManagerReset() {
  console.log('\n📋 Test 5: Batch Manager Reset');
  
  if (typeof window.redditCommentExpander === 'undefined') {
    console.log('❌ RedditCommentExpander not available');
    return false;
  }
  
  const expander = window.redditCommentExpander;
  const batchManager = expander.batchManager;
  
  if (!batchManager) {
    console.log('❌ BatchManager not available');
    return false;
  }
  
  // Record some performance data
  batchManager.recordBatchPerformance(5, 2000, 5, 5);
  batchManager.recordBatchPerformance(5, 2000, 5, 5);
  
  console.log('   - Before reset - Total batches:', batchManager.getPerformanceStats().totalBatches);
  
  // Reset the batch manager
  batchManager.reset();
  
  console.log('   - After reset - Total batches:', batchManager.getPerformanceStats().totalBatches);
  console.log('   - After reset - Batch size:', batchManager.getBatchSize());
  
  if (batchManager.getPerformanceStats().totalBatches === 0 && batchManager.getBatchSize() === 3) {
    console.log('   ✅ Batch manager reset successful');
    return true;
  } else {
    console.log('   ❌ Batch manager reset failed');
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Adaptive Batch Size Optimization Tests...\n');
  
  const tests = [
    { name: 'Batch Manager Availability', fn: testBatchManagerAvailability },
    { name: 'Batch Size Optimization', fn: testBatchSizeOptimization },
    { name: 'Performance Statistics', fn: testPerformanceStats },
    { name: 'Expander Integration', fn: testExpanderIntegration },
    { name: 'Batch Manager Reset', fn: testBatchManagerReset }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  tests.forEach((test, index) => {
    console.log(`\n🧪 Running Test ${index + 1}/${totalTests}: ${test.name}`);
    try {
      const result = test.fn();
      if (result) {
        passedTests++;
        console.log(`✅ Test ${index + 1} PASSED`);
      } else {
        console.log(`❌ Test ${index + 1} FAILED`);
      }
    } catch (error) {
      console.log(`❌ Test ${index + 1} ERROR:`, error.message);
    }
  });
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Adaptive batch sizing is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the implementation.');
  }
}

// Export test functions for manual testing
window.testAdaptiveBatchSizing = {
  runAllTests,
  testBatchManagerAvailability,
  testBatchSizeOptimization,
  testPerformanceStats,
  testExpanderIntegration,
  testBatchManagerReset
};

console.log('📝 Test functions available as window.testAdaptiveBatchSizing');
console.log('💡 Run window.testAdaptiveBatchSizing.runAllTests() to execute all tests'); 