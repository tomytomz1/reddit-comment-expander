/**
 * Manual Extension Test
 * 
 * Simple test to check if the extension is working.
 * Copy and paste this into the browser console on a Reddit page.
 */

console.log('🔍 Manual Extension Test');

// Check if extension is loaded
if (typeof window.redditCommentExpander === 'undefined') {
  console.log('❌ Extension not found');
  console.log('💡 Make sure:');
  console.log('   1. The extension is installed');
  console.log('   2. The extension is enabled');
  console.log('   3. You\'re on a Reddit page');
  console.log('   4. The page has fully loaded');
} else {
  console.log('✅ Extension found!');
  
  const expander = window.redditCommentExpander;
  
  // Check basic functionality
  console.log('\n📋 Basic Functionality:');
  console.log('  - Type:', typeof expander);
  console.log('  - Is expanding:', expander.isExpanding);
  console.log('  - Is paused:', expander.isPaused);
  
  // Check components
  console.log('\n📋 Components:');
  console.log('  - CommentExpander:', !!expander.expander);
  console.log('  - RedditDetector:', !!expander.detector);
  console.log('  - State Manager:', !!expander.state);
  console.log('  - Accessibility:', !!expander.accessibility);
  
  // Check Reddit detection
  console.log('\n📋 Reddit Detection:');
  if (expander.detector) {
    console.log('  - Version:', expander.detector.version);
    console.log('  - Is comment page:', expander.isCommentPage);
  }
  
  // Check worker support
  console.log('\n📋 Worker Support:');
  if (expander.expander && expander.expander.workerManager) {
    console.log('  - WorkerManager available');
    console.log('  - Initialized:', expander.expander.workerManager.isInitialized);
  } else {
    console.log('  - WorkerManager not available');
  }
  
  // Test expansion
  console.log('\n📋 Expansion Test:');
  console.log('  - Can expand:', typeof expander.expandAllComments === 'function');
  
  if (typeof expander.expandAllComments === 'function') {
    console.log('✅ Extension is ready to use!');
    console.log('💡 You can run: expander.expandAllComments() to test expansion');
  } else {
    console.log('⚠️ Expansion function not available');
  }
}

// Quick test function
window.testExpansion = function() {
  if (window.redditCommentExpander && typeof window.redditCommentExpander.expandAllComments === 'function') {
    console.log('🚀 Starting expansion test...');
    return window.redditCommentExpander.expandAllComments();
  } else {
    console.log('❌ Cannot test expansion - extension not ready');
  }
};

console.log('\n💡 Run testExpansion() to test comment expansion'); 