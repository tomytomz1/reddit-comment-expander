// Enhanced DOM Processor Worker for Reddit Comment Expander
// Handles heavy DOM processing tasks off the main thread

self.onmessage = function(event) {
  const { task, payload, taskId } = event.data;
  let result;

  try {
    switch (task) {
      case 'analyzeThreadStructure':
        result = analyzeThreadStructure(payload.html);
        break;
      case 'parseExpandableElements':
        result = parseExpandableElements(payload.html, payload.selectors);
        break;
      case 'optimizeSelectors':
        result = optimizeSelectors(payload.selectors, payload.performance);
        break;
      case 'healthCheck':
        result = healthCheck();
        break;
      case 'parseHtml':
        result = parseHtml(payload.html);
        break;
      case 'transformNodes':
        result = transformNodes(payload.nodes);
        break;
      default:
        result = { error: 'Unknown task', task };
    }
  } catch (error) {
    result = { 
      error: error.message, 
      stack: error.stack,
      task,
      fallback: true
    };
  }

  self.postMessage({ 
    task, 
    result, 
    taskId,
    timestamp: Date.now()
  });
};

/**
 * Analyze thread structure and complexity
 */
function analyzeThreadStructure(html) {
  const startTime = performance.now();
  
  try {
    // Parse HTML to analyze structure
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Count comments and analyze structure
    const commentElements = doc.querySelectorAll('[data-testid*="comment"], .comment, .Comment');
    const moreRepliesElements = doc.querySelectorAll('[data-testid*="more-replies"], .morecomments, .MoreComments');
    const continueThreadElements = doc.querySelectorAll('[data-testid*="continue-thread"], .continue-thread');
    
    // Analyze depth and complexity
    const depthAnalysis = analyzeCommentDepth(doc);
    const complexityScore = calculateComplexityScore(commentElements.length, depthAnalysis);
    
    // Recommend optimal batch size based on complexity
    const recommendedBatchSize = calculateOptimalBatchSize(complexityScore, commentElements.length);
    
    const analysisTime = performance.now() - startTime;
    
    return {
      commentCount: commentElements.length,
      moreRepliesCount: moreRepliesElements.length,
      continueThreadCount: continueThreadElements.length,
      threadComplexity: complexityScore,
      maxDepth: depthAnalysis.maxDepth,
      avgDepth: depthAnalysis.avgDepth,
      recommendedBatchSize,
      analysisTime,
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      fallback: true,
      success: false
    };
  }
}

/**
 * Parse expandable elements with priority scoring
 */
function parseExpandableElements(html, selectors) {
  const startTime = performance.now();
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const elements = [];
    const selectorPerformance = {};
    
    // Test each selector and measure performance
    for (const [category, selectorList] of Object.entries(selectors)) {
      const categoryStart = performance.now();
      const foundElements = [];
      
      for (const selector of selectorList) {
        try {
          const selectorStart = performance.now();
          const matches = doc.querySelectorAll(selector);
          const selectorTime = performance.now() - selectorStart;
          
          if (matches.length > 0) {
            foundElements.push({
              selector,
              elements: Array.from(matches).map(el => ({
                tagName: el.tagName,
                className: el.className,
                textContent: el.textContent?.slice(0, 100),
                attributes: getRelevantAttributes(el)
              })),
              performance: selectorTime
            });
            
            // Track selector performance
            if (!selectorPerformance[selector]) {
              selectorPerformance[selector] = { count: 0, totalTime: 0 };
            }
            selectorPerformance[selector].count++;
            selectorPerformance[selector].totalTime += selectorTime;
          }
        } catch (error) {
          console.warn(`Selector failed: ${selector}`, error);
        }
      }
      
      const categoryTime = performance.now() - categoryStart;
      
      if (foundElements.length > 0) {
        elements.push({
          category,
          elements: foundElements,
          performance: categoryTime,
          totalElements: foundElements.reduce((sum, item) => sum + item.elements.length, 0)
        });
      }
    }
    
    const totalTime = performance.now() - startTime;
    
    return {
      elements,
      totalFound: elements.reduce((sum, cat) => sum + cat.totalElements, 0),
      categories: elements.length,
      selectorPerformance,
      processingTime: totalTime,
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      fallback: true,
      success: false
    };
  }
}

/**
 * Optimize selectors based on performance data
 */
function optimizeSelectors(selectors, performanceData) {
  try {
    const optimized = {};
    
    for (const [category, selectorList] of Object.entries(selectors)) {
      const categoryPerformance = performanceData[category] || {};
      const optimizedSelectors = [];
      
      // Sort selectors by performance (fastest first)
      const sortedSelectors = selectorList.sort((a, b) => {
        const aPerf = categoryPerformance[a]?.avgTime || 999;
        const bPerf = categoryPerformance[b]?.avgTime || 999;
        return aPerf - bPerf;
      });
      
      // Take the top 3 fastest selectors
      optimizedSelectors.push(...sortedSelectors.slice(0, 3));
      
      optimized[category] = optimizedSelectors;
    }
    
    return {
      optimized,
      originalCount: Object.values(selectors).reduce((sum, list) => sum + list.length, 0),
      optimizedCount: Object.values(optimized).reduce((sum, list) => sum + list.length, 0),
      success: true
    };
  } catch (error) {
    return {
      error: error.message,
      fallback: true,
      success: false
    };
  }
}

/**
 * Worker health check
 */
function healthCheck() {
  return {
    status: 'healthy',
    timestamp: Date.now(),
    memoryUsage: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null,
    success: true
  };
}

/**
 * Analyze comment depth and nesting
 */
function analyzeCommentDepth(doc) {
  const depths = [];
  let maxDepth = 0;
  
  // Find comment containers and measure their depth
  const commentContainers = doc.querySelectorAll('[data-testid*="comment"], .comment, .Comment');
  
  commentContainers.forEach(container => {
    let depth = 0;
    let parent = container.parentElement;
    
    while (parent && parent !== doc.body) {
      if (parent.matches('[data-testid*="comment"], .comment, .Comment')) {
        depth++;
      }
      parent = parent.parentElement;
    }
    
    depths.push(depth);
    maxDepth = Math.max(maxDepth, depth);
  });
  
  const avgDepth = depths.length > 0 ? depths.reduce((sum, d) => sum + d, 0) / depths.length : 0;
  
  return {
    maxDepth,
    avgDepth,
    depthDistribution: depths.reduce((acc, depth) => {
      acc[depth] = (acc[depth] || 0) + 1;
      return acc;
    }, {})
  };
}

/**
 * Calculate thread complexity score
 */
function calculateComplexityScore(commentCount, depthAnalysis) {
  const baseScore = Math.min(commentCount / 100, 1); // 0-1 based on comment count
  const depthScore = Math.min(depthAnalysis.maxDepth / 10, 1); // 0-1 based on max depth
  const avgDepthScore = Math.min(depthAnalysis.avgDepth / 5, 1); // 0-1 based on avg depth
  
  // Weighted complexity score
  return (baseScore * 0.4 + depthScore * 0.4 + avgDepthScore * 0.2);
}

/**
 * Calculate optimal batch size based on complexity
 */
function calculateOptimalBatchSize(complexityScore, commentCount) {
  if (commentCount < 50) return 5;
  if (commentCount < 200) return 10;
  if (commentCount < 1000) return 15;
  
  // For large threads, adjust based on complexity
  const baseSize = 20;
  const complexityAdjustment = Math.round(complexityScore * 10);
  
  return Math.max(10, Math.min(50, baseSize + complexityAdjustment));
}

/**
 * Get relevant attributes from an element
 */
function getRelevantAttributes(element) {
  const relevant = {};
  const relevantAttrs = ['data-testid', 'class', 'id', 'aria-label', 'title'];
  
  relevantAttrs.forEach(attr => {
    if (element.hasAttribute(attr)) {
      relevant[attr] = element.getAttribute(attr);
    }
  });
  
  return relevant;
}

/**
 * Legacy functions for backward compatibility
 */
function parseHtml(html) {
  return { 
    length: html.length, 
    preview: html.slice(0, 100),
    success: true
  };
}

function transformNodes(nodes) {
  return { 
    count: Array.isArray(nodes) ? nodes.length : 0,
    success: true
  };
} 