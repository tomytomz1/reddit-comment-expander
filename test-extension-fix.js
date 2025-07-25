// Test script to verify extension fixes
console.log('🧪 Testing extension fixes...');

// Wait a moment for extension to initialize
setTimeout(() => {
  console.log('🔍 Checking extension availability...');
  console.log('Extension object type:', typeof window.redditCommentExpander);
  console.log('Extension loaded:', window.redditCommentExpander !== undefined);
  
  if (window.redditCommentExpander) {
    console.log('✅ Extension found!');
    console.log('Available methods:', Object.getOwnPropertyNames(window.redditCommentExpander));
    
    // Test basic functionality
    if (typeof window.redditCommentExpander.expandAllComments === 'function') {
      console.log('✅ expandAllComments method available');
    } else {
      console.log('❌ expandAllComments method missing');
    }
    
    if (typeof window.redditCommentExpander.getStats === 'function') {
      console.log('✅ getStats method available');
    } else {
      console.log('❌ getStats method missing');
    }
    
    // Test worker functionality if available
    if (window.redditCommentExpander.expander && 
        window.redditCommentExpander.expander.workerManager) {
      console.log('✅ Worker manager available');
      
      // Test worker performance
      window.redditCommentExpander.expander.testWorkerPerformance()
        .then(results => {
          console.log('🔧 Worker performance test results:', results);
        })
        .catch(error => {
          console.log('❌ Worker test failed:', error);
        });
    } else {
      console.log('⚠️ Worker manager not available');
    }
    
  } else {
    console.log('❌ Extension not found');
    console.log('Available window properties:', Object.keys(window).filter(key => key.includes('reddit')));
  }
}, 2000);

// Also check immediately
console.log('🔍 Immediate check - Extension loaded:', window.redditCommentExpander !== undefined); 