/**
 * Class Loading Test Script
 * 
 * Run this in console to check if all required classes are loaded
 */

(function classLoadingTest() {
  console.log("🔍 Testing Class Loading...");
  console.log("=" .repeat(40));
  
  const requiredClasses = [
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
  
  let allLoaded = true;
  
  requiredClasses.forEach(className => {
    const isLoaded = window[className] !== undefined;
    const type = typeof window[className];
    
    console.log(`${isLoaded ? '✅' : '❌'} ${className}: ${isLoaded ? `Loaded (${type})` : 'Missing'}`);
    
    if (!isLoaded) {
      allLoaded = false;
    }
  });
  
  console.log("=" .repeat(40));
  console.log(`Overall: ${allLoaded ? '✅ All classes loaded' : '❌ Some classes missing'}`);
  
  if (allLoaded) {
    console.log("\n🧪 Testing instantiation...");
    
    try {
      const errorBoundary = new ErrorBoundary();
      console.log("✅ ErrorBoundary can be instantiated");
    } catch (e) {
      console.error("❌ ErrorBoundary instantiation failed:", e.message);
    }
    
    try {
      const state = new ExpansionState();
      console.log("✅ ExpansionState can be instantiated");
    } catch (e) {
      console.error("❌ ExpansionState instantiation failed:", e.message);
    }
    
    try {
      const detector = new RedditDetector();
      console.log("✅ RedditDetector can be instantiated");
    } catch (e) {
      console.error("❌ RedditDetector instantiation failed:", e.message);
    }
    
    try {
      const accessibility = new AccessibilityManager();
      console.log("✅ AccessibilityManager can be instantiated");
    } catch (e) {
      console.error("❌ AccessibilityManager instantiation failed:", e.message);
    }
    
    try {
      const errorHandler = new ExpansionErrorHandler();
      console.log("✅ ExpansionErrorHandler can be instantiated");
    } catch (e) {
      console.error("❌ ExpansionErrorHandler instantiation failed:", e.message);
    }
  }
  
  return allLoaded;
})();