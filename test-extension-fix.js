// Test script to verify extension fixes
console.log('🧪 Testing extension fixes...');

// Function to check all possible extension names
function checkExtensionAvailability() {
  const possibleNames = [
    'redditCommentExpander',
    'redditExpander', 
    'RedditCommentExpander'
  ];
  
  console.log('🔍 Checking all possible extension names...');
  
  for (const name of possibleNames) {
    const available = typeof window[name] !== 'undefined';
    console.log(`${name}: ${available ? '✅ Available' : '❌ Not found'}`);
    
    if (available) {
      console.log(`  Type: ${typeof window[name]}`);
      console.log(`  Methods: ${Object.getOwnPropertyNames(window[name])}`);
    }
  }
  
  // Return the first available extension
  for (const name of possibleNames) {
    if (typeof window[name] !== 'undefined') {
      return { name, instance: window[name] };
    }
  }
  
  return null;
}

// Wait a moment for extension to initialize
setTimeout(() => {
  console.log('🔍 Checking extension availability...');
  
  const extension = checkExtensionAvailability();
  
  if (extension) {
    console.log(`✅ Extension found as: ${extension.name}`);
    
    // Test basic functionality
    if (typeof extension.instance.expandAllComments === 'function') {
      console.log('✅ expandAllComments method available');
    } else {
      console.log('❌ expandAllComments method missing');
    }
    
    if (typeof extension.instance.getStats === 'function') {
      console.log('✅ getStats method available');
    } else {
      console.log('❌ getStats method missing');
    }
    
    // Test worker functionality if available
    if (extension.instance.expander && 
        extension.instance.expander.workerManager) {
      console.log('✅ Worker manager available');
      
      // Test worker performance
      extension.instance.expander.testWorkerPerformance()
        .then(results => {
          console.log('🔧 Worker performance test results:', results);
        })
        .catch(error => {
          console.log('❌ Worker test failed:', error);
        });
    } else {
      console.log('⚠️ Worker manager not available');
    }
    
    // Test expansion
    console.log('🚀 Testing expansion...');
    try {
      extension.instance.expandAllComments();
      console.log('✅ Expansion started successfully');
    } catch (error) {
      console.log('❌ Expansion failed:', error);
    }
    
  } else {
    console.log('❌ Extension not found in any global name');
    console.log('Available window properties:', Object.keys(window).filter(key => key.includes('reddit')));
  }
}, 2000);

// Also check immediately
console.log('🔍 Immediate check - Extension loaded:', checkExtensionAvailability() !== null); 