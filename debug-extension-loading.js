/**
 * Debug Extension Loading
 * 
 * This script helps diagnose why the extension isn't being detected.
 * Run this in the browser console on a Reddit page.
 */

console.log('🔍 Debugging Extension Loading...');

// Check 1: Basic extension detection
console.log('📋 Check 1: Extension Detection');
console.log('window.redditCommentExpander:', typeof window.redditCommentExpander);
console.log('window.WorkerManager:', typeof window.WorkerManager);

// Check 2: Look for any extension-related objects
console.log('\n📋 Check 2: Extension-related Objects');
const extensionObjects = Object.keys(window).filter(key => 
  key.toLowerCase().includes('reddit') || 
  key.toLowerCase().includes('expander') ||
  key.toLowerCase().includes('worker')
);
console.log('Extension-related objects:', extensionObjects);

// Check 3: Check for content scripts
console.log('\n📋 Check 3: Content Script Detection');
const scripts = Array.from(document.scripts);
const extensionScripts = scripts.filter(script => 
  script.src && (
    script.src.includes('reddit') ||
    script.src.includes('expander') ||
    script.src.includes('chrome-extension')
  )
);
console.log('Extension scripts found:', extensionScripts.length);
extensionScripts.forEach(script => console.log('  -', script.src));

// Check 4: Check for extension manifest
console.log('\n📋 Check 4: Extension Manifest');
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('Chrome extension API available');
  console.log('Extension ID:', chrome.runtime.id);
} else {
  console.log('Chrome extension API not available');
}

// Check 5: Check for any errors in console
console.log('\n📋 Check 5: Recent Console Errors');
console.log('Check the console for any red error messages above this point.');

// Check 6: Test basic functionality
console.log('\n📋 Check 6: Basic Functionality Test');
try {
  // Test if we can create a simple worker
  if (typeof Worker !== 'undefined') {
    console.log('✅ Web Workers supported');
    const testWorker = new Worker('data:text/javascript,self.onmessage=function(e){self.postMessage("test");}');
    testWorker.onmessage = (e) => {
      console.log('✅ Worker communication working');
      testWorker.terminate();
    };
    testWorker.postMessage('test');
  } else {
    console.log('❌ Web Workers not supported');
  }
} catch (error) {
  console.log('❌ Worker test failed:', error.message);
}

// Check 7: Check page context
console.log('\n📋 Check 7: Page Context');
console.log('Current URL:', window.location.href);
console.log('Is Reddit page:', window.location.hostname.includes('reddit.com'));
console.log('Page ready state:', document.readyState);

// Check 8: Look for any global variables that might be the extension
console.log('\n📋 Check 8: Global Variables Search');
const globalVars = Object.keys(window).filter(key => {
  try {
    const value = window[key];
    return value && typeof value === 'object' && (
      value.constructor && value.constructor.name.includes('Expander') ||
      value.constructor && value.constructor.name.includes('Worker') ||
      value.constructor && value.constructor.name.includes('Manager')
    );
  } catch (e) {
    return false;
  }
});
console.log('Potential extension objects:', globalVars);

console.log('\n🎯 DIAGNOSIS COMPLETE');
console.log('=====================================');
console.log('If you see "undefined" for redditCommentExpander, the extension is not loaded.');
console.log('If you see "function" for redditCommentExpander, the extension is loaded.');
console.log('Check the browser\'s extension management page to ensure the extension is enabled.'); 