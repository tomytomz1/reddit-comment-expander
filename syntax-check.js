/**
 * Syntax Check for Content Scripts
 * 
 * This script checks if there are any syntax errors preventing the extension from loading
 */

console.log("🔍 Syntax Check for Content Scripts");
console.log("=" .repeat(50));

// Check if we're on Reddit
console.log("📍 URL:", window.location.href);
console.log("🌐 Is Reddit:", window.location.href.includes('reddit.com'));

// Check for any JavaScript errors in the console
console.log("\n🚨 Check for JavaScript Errors:");
console.log("💡 Look in the console for any red error messages");
console.log("💡 Common errors that prevent extension loading:");
console.log("   - SyntaxError: Unexpected token");
console.log("   - ReferenceError: Cannot read property");
console.log("   - TypeError: Cannot read property");
console.log("   - Uncaught Error: ...");

// Check for extension loading messages
console.log("\n📦 Expected Extension Loading Messages:");
console.log("💡 You should see these messages when the extension loads:");
console.log("   - 📦 Loading error-boundary.js");
console.log("   - 📦 Loading expansion-state.js");
console.log("   - 📦 Loading feature-gates.js");
console.log("   - 📦 Loading reddit-detector.js");
console.log("   - 📦 Loading accessibility.js");
console.log("   - 📦 Loading expander.js");
console.log("   - 🚀 Reddit Comment Expander Pro: Content script loaded");

// Check for any console messages
console.log("\n📋 Current Console Messages:");
console.log("💡 Check if you see any of the expected messages above");

// Check for extension flags
console.log("\n🏁 Extension Flags Status:");
const flags = [
  'REDDIT_EXPANDER_CONTENT_SCRIPT_LOADED',
  'REDDIT_EXPANDER_ERROR_BOUNDARY_LOADED',
  'REDDIT_EXPANDER_EXPANSION_STATE_LOADED',
  'REDDIT_EXPANDER_EXPANDER_LOADED'
];

let anyFlagsSet = false;
flags.forEach(flag => {
  const exists = !!window[flag];
  if (exists) anyFlagsSet = true;
  console.log(`${exists ? '✅' : '❌'} ${flag}: ${exists ? 'Set' : 'Not set'}`);
});

if (!anyFlagsSet) {
  console.log("\n❌ No extension flags are set - extension is not loading");
  console.log("🔧 Troubleshooting steps:");
  console.log("1. Go to chrome://extensions/");
  console.log("2. Find 'Reddit Comment Expander Pro'");
  console.log("3. Check if it's enabled");
  console.log("4. Check for any error messages (red text)");
  console.log("5. Click the refresh button (🔄)");
  console.log("6. Refresh this page");
  console.log("7. Check console for errors");
} else {
  console.log("\n✅ Some extension flags are set - extension is partially loading");
}

console.log("\n" + "=" .repeat(50));
console.log("🔍 Syntax check complete"); 