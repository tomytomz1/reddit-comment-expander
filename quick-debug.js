/**
 * Quick Debug Script
 * 
 * Run this to quickly check extension loading status
 */

(function quickDebug() {
  console.log("🔍 Quick Extension Debug");
  console.log("=" .repeat(40));
  
  // Check loading flags
  const loadingFlags = [
    'REDDIT_EXPANDER_CONTENT_SCRIPT_LOADED',
    'REDDIT_EXPANDER_ERROR_BOUNDARY_LOADED', 
    'REDDIT_EXPANDER_EXPANSION_STATE_LOADED',
    'REDDIT_EXPANDER_EXPANDER_LOADED'
  ];
  
  console.log("📦 Script Loading Status:");
  let scriptsLoaded = 0;
  loadingFlags.forEach(flag => {
    const loaded = window[flag] === true;
    console.log(`${loaded ? '✅' : '❌'} ${flag.replace('REDDIT_EXPANDER_', '').replace('_LOADED', '')}`);
    if (loaded) scriptsLoaded++;
  });
  
  console.log(`Scripts loaded: ${scriptsLoaded}/${loadingFlags.length}`);
  
  // Check classes
  console.log("\n🏗️  Key Classes:");
  const classes = ['ErrorBoundary', 'ExpansionState', 'CommentExpander'];
  classes.forEach(cls => {
    const exists = window[cls] !== undefined;
    console.log(`${exists ? '✅' : '❌'} ${cls}`);
  });
  
  // Check instances
  console.log("\n🔧 Instances:");
  const instances = ['redditCommentExpander', 'redditExpanderErrorBoundary'];
  instances.forEach(inst => {
    const exists = window[inst] !== undefined;
    console.log(`${exists ? '✅' : '❌'} ${inst}`);
  });
  
  // Overall status
  if (scriptsLoaded === 0) {
    console.log("\n🔴 CRITICAL: No scripts loaded - extension not running");
    console.log("   → Check chrome://extensions/");
    console.log("   → Reload extension and refresh page");
  } else if (scriptsLoaded < loadingFlags.length) {
    console.log("\n🟡 PARTIAL: Some scripts missing");
    console.log("   → Check console for JavaScript errors");
  } else {
    console.log("\n🟢 Scripts loaded, checking initialization...");
  }
  
  return {
    scriptsLoaded,
    totalScripts: loadingFlags.length,
    extensionRunning: scriptsLoaded > 0
  };
})();