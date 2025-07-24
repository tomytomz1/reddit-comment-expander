/**
 * Extension Diagnostic Script
 * 
 * Paste this in the console to diagnose initialization issues
 */

(function diagnosticScript() {
  console.log("🔍 Reddit Comment Expander Diagnostic");
  console.log("=" .repeat(50));
  
  // Check if we're on Reddit
  const isOnReddit = window.location.href.includes('reddit.com');
  console.log(`📍 On Reddit: ${isOnReddit} (${window.location.href})`);
  
  // Check if we're on a comment page
  const isCommentPage = window.location.pathname.includes('/comments/');
  console.log(`💬 Comment page: ${isCommentPage}`);
  
  // Check for script loading
  console.log("\n📦 Script Loading Check:");
  
  const expectedClasses = [
    'ErrorBoundary',
    'ExpansionState', 
    'ExpansionStatus',
    'StateEventTypes',
    'FeatureGates',
    'RedditDetector',
    'AccessibilityManager'
  ];
  
  expectedClasses.forEach(className => {
    const exists = window[className] !== undefined;
    console.log(`${exists ? '✅' : '❌'} ${className}: ${exists ? 'Loaded' : 'Missing'}`);
  });
  
  // Check for instances
  console.log("\n🏗️ Instance Check:");
  
  const instances = [
    'redditCommentExpander',
    'redditExpanderErrorBoundary'
  ];
  
  instances.forEach(instanceName => {
    const exists = window[instanceName] !== undefined;
    console.log(`${exists ? '✅' : '❌'} ${instanceName}: ${exists ? 'Found' : 'Missing'}`);
    
    if (exists) {
      const instance = window[instanceName];
      console.log(`   Type: ${typeof instance}`);
      if (instanceName === 'redditCommentExpander') {
        console.log(`   Has state: ${!!instance.state}`);
        console.log(`   Has errorHandler: ${!!instance.errorHandler}`);
      }
    }
  });
  
  // Check console for errors
  console.log("\n🚨 Console Error Check:");
  console.log("Look above for any red error messages during extension loading");
  
  // Check extension status
  console.log("\n🔧 Next Steps:");
  console.log("1. Check chrome://extensions/ for any extension errors");
  console.log("2. Look for red error messages in console during page load");
  console.log("3. Try refreshing the page");
  console.log("4. Check if extension is enabled");
  
  // Content script injection check
  const scripts = Array.from(document.querySelectorAll('script')).filter(s => 
    s.src && s.src.includes('extension')
  );
  
  console.log(`\n📝 Extension scripts found: ${scripts.length}`);
  scripts.forEach(script => {
    console.log(`   ${script.src}`);
  });
  
})();