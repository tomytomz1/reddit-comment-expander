/**
 * Enhanced Extension Diagnostic Script
 * 
 * Paste this in the console to diagnose initialization issues
 */

(function enhancedDiagnostic() {
  console.log("🔍 Enhanced Reddit Comment Expander Diagnostic");
  console.log("=" .repeat(60));
  
  // Check if we're on Reddit
  const isOnReddit = window.location.href.includes('reddit.com');
  console.log(`📍 On Reddit: ${isOnReddit} (${window.location.href})`);
  
  // Check if we're on a comment page
  const isCommentPage = window.location.pathname.includes('/comments/');
  console.log(`💬 Comment page: ${isCommentPage}`);
  
  // Script loading order check
  console.log("\n📦 Script Loading Order Check:");
  const expectedScripts = [
    'error-boundary.js',
    'expansion-state.js', 
    'feature-gates.js',
    'reddit-detector.js',
    'accessibility.js',
    'expander.js',
    'content.js'
  ];
  
  expectedScripts.forEach((script, index) => {
    console.log(`${index + 1}. ${script}`);
  });
  
  // Check for classes with detailed info
  console.log("\n🏗️ Class Definition Check:");
  
  const expectedClasses = [
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
  
  expectedClasses.forEach(className => {
    const exists = window[className] !== undefined;
    const type = typeof window[className];
    console.log(`${exists ? '✅' : '❌'} ${className}: ${exists ? `Found (${type})` : 'Missing'}`);
    
    if (exists && type === 'function') {
      try {
        // Test if it's a proper constructor
        const isConstructor = window[className].prototype && window[className].prototype.constructor === window[className];
        console.log(`   Constructor: ${isConstructor ? 'Yes' : 'No'}`);
      } catch (e) {
        console.log(`   Constructor test failed: ${e.message}`);
      }
    }
  });
  
  // Check for instances with detailed status
  console.log("\n🔧 Instance Status Check:");
  
  console.log("1. Global Error Boundary:");
  const errorBoundary = window.redditExpanderErrorBoundary;
  if (errorBoundary) {
    console.log("   ✅ Found");
    console.log(`   Type: ${typeof errorBoundary}`);
    console.log(`   Has wrap method: ${typeof errorBoundary.wrap === 'function'}`);
    console.log(`   Has showUserFriendlyError: ${typeof errorBoundary.showUserFriendlyError === 'function'}`);
  } else {
    console.log("   ❌ Missing");
  }
  
  console.log("\n2. Main Reddit Comment Expander:");
  const expander = window.redditCommentExpander;
  if (expander) {
    console.log("   ✅ Found");
    console.log(`   Type: ${typeof expander}`);
    console.log(`   Has state: ${!!expander.state}`);
    console.log(`   Has errorHandler: ${!!expander.errorHandler}`);
    console.log(`   Has detector: ${!!expander.detector}`);
    console.log(`   Has accessibility: ${!!expander.accessibility}`);
    console.log(`   Has expander: ${!!expander.expander}`);
    
    if (expander.state) {
      console.log(`   State type: ${typeof expander.state}`);
      console.log(`   State methods: ${Object.getOwnPropertyNames(expander.state.constructor.prototype).filter(name => name !== 'constructor').join(', ')}`);
    }
    
    if (expander.errorHandler) {
      console.log(`   Error handler type: ${typeof expander.errorHandler}`);
      console.log(`   Error handler methods: ${Object.getOwnPropertyNames(expander.errorHandler.constructor.prototype).filter(name => name !== 'constructor').join(', ')}`);
    }
  } else {
    console.log("   ❌ Missing");
  }
  
  // Check for initialization errors in console
  console.log("\n🚨 Console Error Analysis:");
  console.log("Look above in the console for:");
  console.log("• Red error messages during page load");
  console.log("• 'ReferenceError' or 'is not defined' messages");
  console.log("• 'Failed to initialize' messages");
  console.log("• Script loading errors");
  
  // Check extension status
  console.log("\n🔧 Extension Status Check:");
  try {
    if (chrome && chrome.runtime) {
      console.log(`✅ Chrome extension API available`);
      console.log(`Extension ID: ${chrome.runtime.id}`);
    } else {
      console.log(`❌ Chrome extension API not available`);
    }
  } catch (e) {
    console.log(`❌ Extension API error: ${e.message}`);
  }
  
  // Check for manifest and script injection
  console.log("\n📋 Content Script Injection Check:");
  const contentScripts = Array.from(document.querySelectorAll('script')).filter(s => 
    s.src && (s.src.includes('extension') || s.src.includes('chrome-extension'))
  );
  
  console.log(`Extension scripts found: ${contentScripts.length}`);
  contentScripts.forEach((script, index) => {
    console.log(`${index + 1}. ${script.src}`);
    console.log(`   Loaded: ${script.readyState || 'unknown'}`);
  });
  
  // Timing analysis
  console.log("\n⏰ Timing Analysis:");
  console.log(`Document ready state: ${document.readyState}`);
  console.log(`Page load time: ${performance.now()}ms`);
  
  // Manual initialization test
  console.log("\n🧪 Manual Initialization Test:");
  console.log("Attempting to create instances manually...");
  
  try {
    if (window.ErrorBoundary) {
      const testErrorBoundary = new ErrorBoundary();
      console.log("✅ ErrorBoundary can be instantiated");
    } else {
      console.log("❌ ErrorBoundary class not available");
    }
  } catch (e) {
    console.log(`❌ ErrorBoundary instantiation failed: ${e.message}`);
  }
  
  try {
    if (window.ExpansionState) {
      const testState = new ExpansionState();
      console.log("✅ ExpansionState can be instantiated");
    } else {
      console.log("❌ ExpansionState class not available");
    }
  } catch (e) {
    console.log(`❌ ExpansionState instantiation failed: ${e.message}`);
  }
  
  try {
    if (window.RedditDetector) {
      const testDetector = new RedditDetector();
      console.log("✅ RedditDetector can be instantiated");
    } else {
      console.log("❌ RedditDetector class not available");
    }
  } catch (e) {
    console.log(`❌ RedditDetector instantiation failed: ${e.message}`);
  }
  
  console.log("\n🎯 Recommendations:");
  
  if (!errorBoundary && !expander) {
    console.log("🔴 Critical: No components loaded at all");
    console.log("   → Check chrome://extensions/ for extension errors");
    console.log("   → Verify extension is enabled");
    console.log("   → Reload extension and refresh page");
  } else if (!errorBoundary) {
    console.log("🟡 Warning: Error boundary missing");
    console.log("   → Check error-boundary.js loading");
  } else if (!expander) {
    console.log("🟡 Warning: Main expander missing");
    console.log("   → Check content.js initialization");
  } else if (expander && (!expander.state || !expander.errorHandler)) {
    console.log("🟡 Warning: Partial initialization");
    console.log("   → Check class dependencies and loading order");
  }
  
  console.log("\n✨ Re-run this diagnostic after making changes");
  
})();