/**
 * Extension Detection Test
 * 
 * This script checks if the extension is being detected by Chrome
 */

console.log("🔍 Extension Detection Test");
console.log("=" .repeat(40));

// Check if we're on a supported page
console.log("📍 URL:", window.location.href);
console.log("🌐 Is Reddit:", window.location.href.includes('reddit.com'));

// Check for extension API
console.log("\n🔧 Chrome Extension API:");
try {
  if (typeof chrome !== 'undefined') {
    console.log("✅ Chrome API available");
    console.log("✅ Runtime ID:", chrome.runtime?.id || 'Not available');
    console.log("✅ Extension URL:", chrome.runtime?.getURL?.('manifest.json') || 'Not available');
  } else {
    console.log("❌ Chrome API not available");
  }
} catch (error) {
  console.log("❌ Error accessing Chrome API:", error.message);
}

// Check for any extension-related console messages
console.log("\n📋 Console Messages Check:");
console.log("💡 Look for these messages in the console:");
console.log("   - 📦 Loading error-boundary.js");
console.log("   - 📦 Loading expansion-state.js");
console.log("   - 🚀 Reddit Comment Expander Pro: Content script loaded");
console.log("   - ✅ Content script flag set on window object");

// Check for extension flags
console.log("\n🏁 Extension Flags:");
const flags = [
  'REDDIT_EXPANDER_CONTENT_SCRIPT_LOADED',
  'REDDIT_EXPANDER_ERROR_BOUNDARY_LOADED',
  'REDDIT_EXPANDER_EXPANSION_STATE_LOADED',
  'REDDIT_EXPANDER_EXPANDER_LOADED'
];

flags.forEach(flag => {
  const exists = !!window[flag];
  console.log(`${exists ? '✅' : '❌'} ${flag}: ${exists ? 'Set' : 'Not set'}`);
});

// Check for extension objects
console.log("\n🌍 Extension Objects:");
const objects = [
  'redditCommentExpander',
  'redditExpanderErrorBoundary'
];

objects.forEach(obj => {
  const exists = typeof window[obj] !== 'undefined';
  console.log(`${exists ? '✅' : '❌'} window.${obj}: ${exists ? 'Available' : 'Missing'}`);
});

// Check for required classes
console.log("\n📚 Required Classes:");
const classes = [
  'ErrorBoundary',
  'ExpansionState',
  'ExpansionStatus',
  'StateEventTypes'
];

classes.forEach(cls => {
  const exists = typeof window[cls] !== 'undefined';
  console.log(`${exists ? '✅' : '❌'} ${cls}: ${exists ? 'Available' : 'Missing'}`);
});

// Troubleshooting steps
console.log("\n🔧 Troubleshooting Steps:");
console.log("1. Go to chrome://extensions/");
console.log("2. Find 'Reddit Comment Expander Pro'");
console.log("3. Make sure it's enabled (toggle ON)");
console.log("4. Click the refresh button (🔄)");
console.log("5. Refresh this Reddit page");
console.log("6. Wait 5-10 seconds");
console.log("7. Check console for loading messages");

console.log("\n" + "=" .repeat(40));
console.log("🔍 Detection test complete"); 