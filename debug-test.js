/**
 * Debug Script for Reddit Comment Expander Tests
 * 
 * Run this in the browser console to check what's available
 */

console.log("🔍 Reddit Comment Expander Debug Diagnostic");
console.log("=" .repeat(50));

// Check if we're on Reddit
console.log("📍 Current URL:", window.location.href);
console.log("🌐 Is Reddit:", window.location.href.includes('reddit.com'));

// Check if extension content script is loaded
console.log("📦 Content script loaded:", !!window.REDDIT_EXPANDER_CONTENT_SCRIPT_LOADED);
console.log("📦 Error boundary loaded:", !!window.REDDIT_EXPANDER_ERROR_BOUNDARY_LOADED);
console.log("📦 Expansion state loaded:", !!window.REDDIT_EXPANDER_EXPANSION_STATE_LOADED);
console.log("📦 Expander loaded:", !!window.REDDIT_EXPANDER_EXPANDER_LOADED);

// Check for required classes
const requiredClasses = [
  'ErrorBoundary',
  'ExpansionState', 
  'ExpansionStatus',
  'StateEventTypes',
  'FeatureGates',
  'RedditDetector',
  'AccessibilityManager',
  'CommentExpander',
  'ExpansionErrorHandler',
  'PriorityQueue',
  'AdaptiveRateLimiter'
];

console.log("\n📋 Required Classes Status:");
requiredClasses.forEach(className => {
  const exists = typeof window[className] !== 'undefined';
  console.log(`${exists ? '✅' : '❌'} ${className}: ${exists ? 'Available' : 'Missing'}`);
});

// Check for global objects
console.log("\n🌍 Global Objects Status:");
const globalObjects = [
  'redditCommentExpander',
  'redditExpanderErrorBoundary'
];

globalObjects.forEach(objName => {
  const exists = typeof window[objName] !== 'undefined';
  console.log(`${exists ? '✅' : '❌'} window.${objName}: ${exists ? 'Available' : 'Missing'}`);
  
  if (exists) {
    console.log(`   Type: ${typeof window[objName]}`);
    if (typeof window[objName] === 'object' && window[objName] !== null) {
      console.log(`   Keys: ${Object.keys(window[objName]).slice(0, 10).join(', ')}${Object.keys(window[objName]).length > 10 ? '...' : ''}`);
    }
  }
});

// Check extension state
if (window.redditCommentExpander) {
  console.log("\n🔧 Extension State:");
  const expander = window.redditCommentExpander;
  
  console.log(`   Status: ${expander.state?.getStatus?.() || 'Unknown'}`);
  console.log(`   Is Expanding: ${expander.isExpanding || false}`);
  console.log(`   Is Paused: ${expander.isPaused || false}`);
  console.log(`   Should Cancel: ${expander.shouldCancel || false}`);
  
  if (expander.state) {
    const state = expander.state.getState();
    console.log(`   State Status: ${state.status}`);
    console.log(`   Progress: ${state.progress?.processed || 0}/${state.progress?.total || 0}`);
  }
}

// Check error boundary
if (window.redditExpanderErrorBoundary) {
  console.log("\n🛡️ Error Boundary Status:");
  const errorBoundary = window.redditExpanderErrorBoundary;
  
  const stats = errorBoundary.getErrorStats();
  console.log(`   Total Errors: ${stats.totalErrors}`);
  console.log(`   Last Error Time: ${stats.lastErrorTime}`);
  
  const methods = ['wrap', 'showUserFriendlyError', 'reportToRuntime', 'safeCall'];
  methods.forEach(method => {
    const exists = typeof errorBoundary[method] === 'function';
    console.log(`   ${exists ? '✅' : '❌'} ${method}(): ${exists ? 'Available' : 'Missing'}`);
  });
}

// Check if extension is properly initialized
console.log("\n🚀 Extension Initialization Status:");
if (window.redditCommentExpander && window.redditExpanderErrorBoundary) {
  console.log("✅ Extension appears to be fully initialized");
  
  // Test basic functionality
  try {
    const expander = window.redditCommentExpander;
    const errorBoundary = window.redditExpanderErrorBoundary;
    
    // Test error boundary
    const testResult = await errorBoundary.wrap(
      () => Promise.resolve("test success"),
      { operationName: "debug test", suppressUserNotification: true }
    );
    console.log("✅ Error boundary test passed:", testResult);
    
    // Test state management
    if (expander.state) {
      const currentStatus = expander.state.getStatus();
      console.log("✅ State management test passed. Current status:", currentStatus);
    }
    
  } catch (error) {
    console.error("❌ Basic functionality test failed:", error);
  }
} else {
  console.log("❌ Extension not fully initialized");
  console.log("💡 Try refreshing the page and waiting a few seconds");
}

console.log("\n" + "=" .repeat(50));
console.log("🔍 Debug diagnostic complete"); 