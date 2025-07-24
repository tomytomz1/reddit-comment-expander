/**
 * Comprehensive Extension Test
 * 
 * This script performs a thorough check of all extension components
 */

console.log("🔍 Comprehensive Extension Test");
console.log("=" .repeat(60));

// Test 1: Environment Check
console.log("\n1️⃣ Environment Check:");
console.log(`📍 URL: ${window.location.href}`);
console.log(`🌐 Is Reddit: ${window.location.href.includes('reddit.com') ? '✅' : '❌'}`);
console.log(`💬 Is Comment Page: ${window.location.href.includes('/comments/') ? '✅' : '❌'}`);
console.log(`📄 Document Ready State: ${document.readyState}`);
console.log(`⏰ Current Time: ${new Date().toISOString()}`);

// Test 2: Chrome Extension API
console.log("\n2️⃣ Chrome Extension API:");
try {
  if (typeof chrome !== 'undefined') {
    console.log("✅ Chrome API available");
    console.log(`✅ Runtime ID: ${chrome.runtime?.id || 'Not available'}`);
    console.log(`✅ Extension URL: ${chrome.runtime?.getURL?.('manifest.json') || 'Not available'}`);
    
    // Test if we can access the extension
    if (chrome.runtime?.id) {
      console.log("✅ Extension is properly installed");
    } else {
      console.log("❌ Extension runtime ID not available");
    }
  } else {
    console.log("❌ Chrome API not available");
  }
} catch (error) {
  console.log(`❌ Chrome API error: ${error.message}`);
}

// Test 3: Extension Flags (Content Script Loading)
console.log("\n3️⃣ Extension Flags (Content Script Loading):");
const flags = [
  'REDDIT_EXPANDER_CONTENT_SCRIPT_LOADED',
  'REDDIT_EXPANDER_ERROR_BOUNDARY_LOADED',
  'REDDIT_EXPANDER_EXPANSION_STATE_LOADED',
  'REDDIT_EXPANDER_EXPANDER_LOADED'
];

let flagsSet = 0;
flags.forEach(flag => {
  const exists = !!window[flag];
  if (exists) flagsSet++;
  console.log(`${exists ? '✅' : '❌'} ${flag}: ${exists ? 'Set' : 'Not set'}`);
});

console.log(`📊 Flags set: ${flagsSet}/${flags.length}`);

// Test 4: Required Classes (Shared Scripts)
console.log("\n4️⃣ Required Classes (Shared Scripts):");
const classes = [
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

let classesAvailable = 0;
classes.forEach(cls => {
  const exists = typeof window[cls] !== 'undefined';
  if (exists) classesAvailable++;
  console.log(`${exists ? '✅' : '❌'} ${cls}: ${exists ? 'Available' : 'Missing'}`);
});

console.log(`📊 Classes available: ${classesAvailable}/${classes.length}`);

// Test 5: Global Objects (Main Extension)
console.log("\n5️⃣ Global Objects (Main Extension):");
const objects = [
  'redditCommentExpander',
  'redditExpanderErrorBoundary'
];

let objectsAvailable = 0;
objects.forEach(obj => {
  const exists = typeof window[obj] !== 'undefined';
  if (exists) objectsAvailable++;
  console.log(`${exists ? '✅' : '❌'} window.${obj}: ${exists ? 'Available' : 'Missing'}`);
  
  if (exists) {
    const objInstance = window[obj];
    console.log(`   Type: ${typeof objInstance}`);
    if (typeof objInstance === 'object' && objInstance !== null) {
      const keys = Object.keys(objInstance).slice(0, 5);
      console.log(`   Keys: ${keys.join(', ')}${Object.keys(objInstance).length > 5 ? '...' : ''}`);
    }
  }
});

console.log(`📊 Objects available: ${objectsAvailable}/${objects.length}`);

// Test 6: Extension Functionality (if available)
if (window.redditCommentExpander) {
  console.log("\n6️⃣ Extension Functionality Test:");
  const expander = window.redditCommentExpander;
  
  try {
    // Test state management
    if (expander.state) {
      const status = expander.state.getStatus();
      console.log(`✅ State Status: ${status}`);
      
      const state = expander.state.getState();
      console.log(`✅ State Structure: ${Object.keys(state).length} properties`);
    } else {
      console.log("❌ State manager not available");
    }
    
    // Test error handler
    if (expander.errorHandler) {
      console.log("✅ Error handler available");
    } else {
      console.log("❌ Error handler not available");
    }
    
    // Test legacy properties
    console.log(`✅ isExpanding: ${typeof expander.isExpanding === 'boolean' ? 'Available' : 'Missing'}`);
    console.log(`✅ isPaused: ${typeof expander.isPaused === 'boolean' ? 'Available' : 'Missing'}`);
    console.log(`✅ shouldCancel: ${typeof expander.shouldCancel === 'boolean' ? 'Available' : 'Missing'}`);
    
  } catch (error) {
    console.log(`❌ Functionality test error: ${error.message}`);
  }
}

// Test 7: Error Boundary (if available)
if (window.redditExpanderErrorBoundary) {
  console.log("\n7️⃣ Error Boundary Test:");
  const errorBoundary = window.redditExpanderErrorBoundary;
  
  try {
    const stats = errorBoundary.getErrorStats();
    console.log(`✅ Error Stats: ${stats.totalErrors} total errors`);
    
    const methods = ['wrap', 'showUserFriendlyError', 'reportToRuntime', 'safeCall'];
    methods.forEach(method => {
      const exists = typeof errorBoundary[method] === 'function';
      console.log(`${exists ? '✅' : '❌'} ${method}(): ${exists ? 'Available' : 'Missing'}`);
    });
    
  } catch (error) {
    console.log(`❌ Error boundary test error: ${error.message}`);
  }
}

// Test 8: Console Messages Check
console.log("\n8️⃣ Console Messages Check:");
console.log("💡 Expected loading messages:");
const expectedMessages = [
  '📦 Loading error-boundary.js',
  '📦 Loading expansion-state.js',
  '📦 Loading feature-gates.js',
  '📦 Loading reddit-detector.js',
  '📦 Loading accessibility.js',
  '📦 Loading expander.js',
  '🚀 Reddit Comment Expander Pro: Content script loaded'
];

expectedMessages.forEach(msg => {
  console.log(`   - ${msg}`);
});

// Test 9: Diagnosis and Recommendations
console.log("\n9️⃣ Diagnosis:");
if (flagsSet === 0) {
  console.log("❌ CRITICAL: No extension flags set");
  console.log("🔧 This means the extension content scripts are not loading at all");
  console.log("💡 Possible causes:");
  console.log("   - Extension not enabled in chrome://extensions/");
  console.log("   - Extension needs to be reloaded");
  console.log("   - Syntax error in one of the content scripts");
  console.log("   - Missing files");
  console.log("   - Manifest error");
} else if (flagsSet < flags.length) {
  console.log("⚠️ PARTIAL: Some extension flags set");
  console.log("🔧 This means some scripts are loading but not all");
  console.log("💡 Check for errors in the console");
} else {
  console.log("✅ GOOD: All extension flags set");
}

if (classesAvailable === 0) {
  console.log("❌ CRITICAL: No required classes available");
  console.log("🔧 This means the shared scripts are not loading");
} else if (classesAvailable < classes.length) {
  console.log("⚠️ PARTIAL: Some required classes missing");
  console.log("🔧 This means some shared scripts failed to load");
} else {
  console.log("✅ GOOD: All required classes available");
}

if (objectsAvailable === 0) {
  console.log("❌ CRITICAL: No global objects available");
  console.log("🔧 This means the main content script failed to initialize");
} else if (objectsAvailable < objects.length) {
  console.log("⚠️ PARTIAL: Some global objects missing");
  console.log("🔧 This means partial initialization");
} else {
  console.log("✅ GOOD: All global objects available");
}

// Test 10: Recommendations
console.log("\n🔟 Recommendations:");
if (flagsSet === 0) {
  console.log("🔧 IMMEDIATE ACTIONS:");
  console.log("1. Go to chrome://extensions/");
  console.log("2. Find 'Reddit Comment Expander Pro'");
  console.log("3. Make sure it's enabled (toggle ON)");
  console.log("4. Check for any error messages (red text)");
  console.log("5. Click the refresh button (🔄)");
  console.log("6. Refresh this page");
  console.log("7. Wait 5-10 seconds");
  console.log("8. Check console for errors");
} else if (objectsAvailable === 0) {
  console.log("🔧 ACTIONS NEEDED:");
  console.log("1. Check console for JavaScript errors");
  console.log("2. Reload the extension");
  console.log("3. Refresh the page");
} else {
  console.log("✅ Extension appears to be working correctly");
  console.log("💡 If you're still having issues, check the console for errors");
}

console.log("\n" + "=" .repeat(60));
console.log("🔍 Comprehensive test complete"); 