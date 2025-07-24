/**
 * Simple Extension Load Test
 * 
 * This script checks if the extension is being loaded at all
 */

console.log("🔍 Extension Load Test");
console.log("=" .repeat(40));

// Check if we're on a supported page
console.log("📍 URL:", window.location.href);
console.log("🌐 Is Reddit:", window.location.href.includes('reddit.com'));

// Check for any extension-related console messages
console.log("\n📋 Looking for extension console messages...");
console.log("💡 Check the console for messages starting with:");
console.log("   - 📦 Loading...");
console.log("   - 🚀 Reddit Comment Expander Pro...");
console.log("   - ✅ Content script flag set...");

// Check if extension is in the list
console.log("\n🔧 Extension Status Check:");
console.log("1. Go to chrome://extensions/");
console.log("2. Look for 'Reddit Comment Expander Pro'");
console.log("3. Make sure it's enabled (toggle ON)");
console.log("4. Check if there are any error messages");

// Check for common issues
console.log("\n🚨 Common Issues:");
console.log("❌ Extension not enabled");
console.log("❌ Extension not reloaded after changes");
console.log("❌ Wrong permissions");
console.log("❌ Manifest errors");

// Test if we can access extension APIs
console.log("\n🧪 Testing Extension API Access:");
try {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log("✅ Chrome extension API available");
    console.log("✅ Runtime ID:", chrome.runtime.id);
  } else {
    console.log("❌ Chrome extension API not available");
  }
} catch (error) {
  console.log("❌ Error accessing extension API:", error.message);
}

console.log("\n" + "=" .repeat(40));
console.log("🔍 Load test complete"); 