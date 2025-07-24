/**
 * Automated Test for Reddit Comment Expander
 * 
 * This script performs automated checks to identify potential issues
 */

console.log("🤖 Automated Extension Test");
console.log("=" .repeat(50));

// Test 1: Check if we're on a supported page
console.log("\n1️⃣ Page Compatibility Test:");
const url = window.location.href;
const isReddit = url.includes('reddit.com');
const isCommentPage = url.includes('/comments/');
console.log(`📍 URL: ${url}`);
console.log(`🌐 Is Reddit: ${isReddit ? '✅' : '❌'}`);
console.log(`💬 Is Comment Page: ${isCommentPage ? '✅' : '❌'}`);

if (!isReddit) {
  console.log("❌ Not on Reddit - extension won't load");
  return;
}

// Test 2: Check Chrome Extension API
console.log("\n2️⃣ Chrome Extension API Test:");
try {
  if (typeof chrome !== 'undefined') {
    console.log("✅ Chrome API available");
    console.log(`✅ Runtime ID: ${chrome.runtime?.id || 'Not available'}`);
    console.log(`✅ Extension URL: ${chrome.runtime?.getURL?.('manifest.json') || 'Not available'}`);
  } else {
    console.log("❌ Chrome API not available");
  }
} catch (error) {
  console.log(`❌ Chrome API error: ${error.message}`);
}

// Test 3: Check for extension flags
console.log("\n3️⃣ Extension Flags Test:");
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

// Test 4: Check for required classes
console.log("\n4️⃣ Required Classes Test:");
const classes = [
  'ErrorBoundary',
  'ExpansionState',
  'ExpansionStatus',
  'StateEventTypes',
  'FeatureGates',
  'RedditDetector',
  'AccessibilityManager',
  'CommentExpander',
  'ExpansionErrorHandler'
];

let classesAvailable = 0;
classes.forEach(cls => {
  const exists = typeof window[cls] !== 'undefined';
  if (exists) classesAvailable++;
  console.log(`${exists ? '✅' : '❌'} ${cls}: ${exists ? 'Available' : 'Missing'}`);
});

console.log(`📊 Classes available: ${classesAvailable}/${classes.length}`);

// Test 5: Check for global objects
console.log("\n5️⃣ Global Objects Test:");
const objects = [
  'redditCommentExpander',
  'redditExpanderErrorBoundary'
];

let objectsAvailable = 0;
objects.forEach(obj => {
  const exists = typeof window[obj] !== 'undefined';
  if (exists) objectsAvailable++;
  console.log(`${exists ? '✅' : '❌'} window.${obj}: ${exists ? 'Available' : 'Missing'}`);
});

console.log(`📊 Objects available: ${objectsAvailable}/${objects.length}`);

// Test 6: Check for console errors
console.log("\n6️⃣ Console Error Check:");
console.log("💡 Check the console for any red error messages");
console.log("💡 Common errors that prevent extension loading:");
console.log("   - SyntaxError: Unexpected token");
console.log("   - ReferenceError: Cannot read property");
console.log("   - TypeError: Cannot read property");
console.log("   - Uncaught Error: ...");

// Test 7: Check for expected loading messages
console.log("\n7️⃣ Expected Loading Messages:");
const expectedMessages = [
  '📦 Loading error-boundary.js',
  '📦 Loading expansion-state.js',
  '📦 Loading feature-gates.js',
  '📦 Loading reddit-detector.js',
  '📦 Loading accessibility.js',
  '📦 Loading expander.js',
  '🚀 Reddit Comment Expander Pro: Content script loaded'
];

console.log("💡 You should see these messages when the extension loads:");
expectedMessages.forEach(msg => {
  console.log(`   - ${msg}`);
});

// Test 8: Diagnosis
console.log("\n8️⃣ Diagnosis:");
if (flagsSet === 0) {
  console.log("❌ CRITICAL: No extension flags set");
  console.log("🔧 This means the extension content scripts are not loading at all");
  console.log("💡 Possible causes:");
  console.log("   - Extension not enabled in chrome://extensions/");
  console.log("   - Extension needs to be reloaded");
  console.log("   - Syntax error in one of the content scripts");
  console.log("   - Missing files");
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

// Test 9: Recommendations
console.log("\n9️⃣ Recommendations:");
if (flagsSet === 0) {
  console.log("🔧 IMMEDIATE ACTIONS:");
  console.log("1. Go to chrome://extensions/");
  console.log("2. Find 'Reddit Comment Expander Pro'");
  console.log("3. Make sure it's enabled (toggle ON)");
  console.log("4. Click the refresh button (🔄)");
  console.log("5. Refresh this page");
  console.log("6. Wait 5-10 seconds");
  console.log("7. Check console for errors");
} else if (objectsAvailable === 0) {
  console.log("🔧 ACTIONS NEEDED:");
  console.log("1. Check console for JavaScript errors");
  console.log("2. Reload the extension");
  console.log("3. Refresh the page");
} else {
  console.log("✅ Extension appears to be working correctly");
  console.log("💡 If you're still having issues, check the console for errors");
}

console.log("\n" + "=" .repeat(50));
console.log("🤖 Automated test complete"); 