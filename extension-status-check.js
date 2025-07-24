/**
 * Extension Status Check
 * 
 * Run this in console to check if the extension is loading at all
 */

(function extensionStatusCheck() {
  console.log("🔍 Extension Status Check");
  console.log("=" .repeat(50));
  
  // Check if we're on Reddit
  console.log(`📍 URL: ${window.location.href}`);
  console.log(`📍 On Reddit: ${window.location.href.includes('reddit.com')}`);
  console.log(`📍 Comment page: ${window.location.pathname.includes('/comments/')}`);
  
  // Check Chrome extension API
  console.log("\n🌐 Chrome Extension API:");
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      console.log(`✅ Chrome extension API available`);
      console.log(`Extension ID: ${chrome.runtime.id}`);
      
      try {
        const manifest = chrome.runtime.getManifest();
        console.log(`Extension name: ${manifest.name}`);
        console.log(`Extension version: ${manifest.version}`);
      } catch (e) {
        console.log(`⚠️  Cannot access manifest: ${e.message}`);
      }
    } else {
      console.log(`❌ Chrome extension API not available`);
    }
  } catch (e) {
    console.log(`❌ Extension API error: ${e.message}`);
  }
  
  // Check for extension scripts in DOM
  console.log("\n📦 Extension Scripts in DOM:");
  const allScripts = Array.from(document.querySelectorAll('script'));
  const extensionScripts = allScripts.filter(s => 
    s.src && (s.src.includes('chrome-extension') || s.src.includes('extension'))
  );
  
  console.log(`Total scripts: ${allScripts.length}`);
  console.log(`Extension scripts: ${extensionScripts.length}`);
  
  if (extensionScripts.length > 0) {
    extensionScripts.forEach((script, index) => {
      console.log(`${index + 1}. ${script.src}`);
      console.log(`   Loaded: ${script.readyState || 'unknown'}`);
    });
  } else {
    console.log("❌ No extension scripts found in DOM");
  }
  
  // Check for any Reddit expander related global variables
  console.log("\n🔍 Global Variables Check:");
  const globalVars = [
    'redditCommentExpander',
    'redditExpanderErrorBoundary',
    'ErrorBoundary',
    'ExpansionState',
    'RedditDetector',
    'CommentExpander'
  ];
  
  let foundAny = false;
  globalVars.forEach(varName => {
    const exists = window[varName] !== undefined;
    if (exists) {
      console.log(`✅ ${varName}: Found (${typeof window[varName]})`);
      foundAny = true;
    } else {
      console.log(`❌ ${varName}: Missing`);
    }
  });
  
  if (!foundAny) {
    console.log("🔴 No extension variables found in global scope");
  }
  
  // Check console for initialization messages
  console.log("\n📋 Look in console history for:");
  console.log("• '🚀 Reddit Comment Expander Pro: Content script loaded'");
  console.log("• '🔧 Initializing RedditCommentExpander...'");
  console.log("• '✅ All classes loaded in XXXms'");
  console.log("• Any red error messages during page load");
  
  // Extension status recommendations
  console.log("\n🎯 Recommendations:");
  
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log("🔴 Chrome extension API not available");
    console.log("   → Extension may not be installed or enabled");
    console.log("   → Check chrome://extensions/");
  } else if (extensionScripts.length === 0) {
    console.log("🔴 No extension scripts injected");
    console.log("   → Content scripts may not be running");
    console.log("   → Check manifest.json content_scripts configuration");
    console.log("   → Try reloading extension and refreshing page");
  } else if (!foundAny) {
    console.log("🔴 Scripts loaded but no globals found");
    console.log("   → Scripts may have syntax errors");
    console.log("   → Check console for JavaScript errors");
    console.log("   → Check file paths in manifest.json");
  }
  
  console.log("\n🔧 Next Steps:");
  console.log("1. Check chrome://extensions/ - is extension enabled?");
  console.log("2. Click 'Reload' on the extension");
  console.log("3. Refresh this page");
  console.log("4. Look for red errors in console during page load");
  console.log("5. Check extension's background page for errors");
  
})();