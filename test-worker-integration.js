/**
 * Automated Test for Web Worker Integration
 * 
 * This script tests the complete web worker integration including:
 * - Worker initialization and health checks
 * - Thread structure analysis
 * - Element parsing and selector optimization
 * - Integration with CommentExpander
 * - Performance monitoring
 * - Fallback mechanisms
 */

console.log('🧪 Starting Web Worker Integration Test Suite...');

class WorkerIntegrationTester {
  constructor() {
    this.testResults = [];
    this.startTime = performance.now();
    this.workerManager = null;
    this.expander = null;
  }

  // Test result tracking
  logTest(name, passed, details = null) {
    const result = {
      name,
      passed,
      details,
      timestamp: Date.now()
    };
    this.testResults.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
    return passed;
  }

  // Test 1: Check if we're on a Reddit page
  testRedditPage() {
    const isReddit = window.location.hostname.includes('reddit.com');
    return this.logTest('Reddit Page Detection', isReddit, {
      hostname: window.location.hostname,
      url: window.location.href
    });
  }

  // Test 2: Check if extension is loaded
  testExtensionLoaded() {
    const hasExpander = typeof window.redditCommentExpander !== 'undefined';
    const hasWorkerManager = typeof window.WorkerManager !== 'undefined';
    
    return this.logTest('Extension Loading', hasExpander && hasWorkerManager, {
      redditCommentExpander: hasExpander,
      WorkerManager: hasWorkerManager
    });
  }

  // Test 3: Test WorkerManager class instantiation
  async testWorkerManagerCreation() {
    try {
      this.workerManager = new WorkerManager({
        maxWorkers: 1,
        taskTimeout: 10000,
        enableFallback: true,
        enablePerformanceTracking: true
      });

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const isInitialized = this.workerManager.isInitialized;
      const healthStatus = this.workerManager.healthStatus;
      
      return this.logTest('WorkerManager Creation', isInitialized, {
        isInitialized,
        healthStatus,
        workerCount: this.workerManager.workers.length
      });
    } catch (error) {
      return this.logTest('WorkerManager Creation', false, {
        error: error.message
      });
    }
  }

  // Test 4: Test worker health check
  async testWorkerHealthCheck() {
    try {
      const healthResult = await this.workerManager.healthCheck();
      
      return this.logTest('Worker Health Check', healthResult.success, {
        status: healthResult.status,
        timestamp: healthResult.timestamp,
        memoryUsage: healthResult.memoryUsage
      });
    } catch (error) {
      return this.logTest('Worker Health Check', false, {
        error: error.message
      });
    }
  }

  // Test 5: Test thread structure analysis
  async testThreadAnalysis() {
    try {
      const htmlContent = document.documentElement.outerHTML;
      const analysis = await this.workerManager.analyzeThreadStructure(htmlContent);
      
      const isValidAnalysis = analysis.success && 
                             typeof analysis.commentCount === 'number' &&
                             typeof analysis.threadComplexity === 'number';
      
      return this.logTest('Thread Structure Analysis', isValidAnalysis, {
        success: analysis.success,
        commentCount: analysis.commentCount,
        threadComplexity: analysis.threadComplexity,
        maxDepth: analysis.maxDepth,
        avgDepth: analysis.avgDepth,
        recommendedBatchSize: analysis.recommendedBatchSize,
        analysisTime: analysis.analysisTime
      });
    } catch (error) {
      return this.logTest('Thread Structure Analysis', false, {
        error: error.message
      });
    }
  }

  // Test 6: Test element parsing
  async testElementParsing() {
    try {
      const htmlContent = document.documentElement.outerHTML;
      
      // Create sample selectors for testing
      const selectors = {
        comments: [
          '[data-testid*="comment"]',
          '.comment',
          '.Comment'
        ],
        moreReplies: [
          '[data-testid*="more-replies"]',
          '.morecomments',
          '.MoreComments'
        ]
      };
      
      const parseResult = await this.workerManager.parseExpandableElements(htmlContent, selectors);
      
      const isValidParsing = parseResult.success && 
                            typeof parseResult.totalFound === 'number' &&
                            Array.isArray(parseResult.elements);
      
      return this.logTest('Element Parsing', isValidParsing, {
        success: parseResult.success,
        totalFound: parseResult.totalFound,
        categories: parseResult.categories,
        processingTime: parseResult.processingTime,
        fallback: parseResult.fallback
      });
    } catch (error) {
      return this.logTest('Element Parsing', false, {
        error: error.message
      });
    }
  }

  // Test 7: Test selector optimization
  async testSelectorOptimization() {
    try {
      const selectors = {
        comments: [
          '[data-testid*="comment"]',
          '.comment',
          '.Comment',
          'div[class*="comment"]'
        ],
        moreReplies: [
          '[data-testid*="more-replies"]',
          '.morecomments',
          '.MoreComments'
        ]
      };
      
      const performanceData = {
        comments: {
          '[data-testid*="comment"]': { avgTime: 5 },
          '.comment': { avgTime: 3 },
          '.Comment': { avgTime: 8 },
          'div[class*="comment"]': { avgTime: 12 }
        }
      };
      
      const optimization = await this.workerManager.optimizeSelectors(selectors, performanceData);
      
      const isValidOptimization = optimization.success && 
                                 optimization.optimizedCount < optimization.originalCount;
      
      return this.logTest('Selector Optimization', isValidOptimization, {
        success: optimization.success,
        originalCount: optimization.originalCount,
        optimizedCount: optimization.optimizedCount,
        fallback: optimization.fallback
      });
    } catch (error) {
      return this.logTest('Selector Optimization', false, {
        error: error.message
      });
    }
  }

  // Test 8: Test CommentExpander integration
  async testExpanderIntegration() {
    try {
      if (!window.redditCommentExpander) {
        return this.logTest('Expander Integration', false, {
          error: 'redditCommentExpander not available'
        });
      }

      this.expander = window.redditCommentExpander;
      
      // Test worker initialization
      await this.expander.initializeWorkerSupport();
      
      const hasWorkerManager = this.expander.workerManager !== null;
      
      return this.logTest('Expander Integration', hasWorkerManager, {
        hasWorkerManager,
        workerManagerType: typeof this.expander.workerManager
      });
    } catch (error) {
      return this.logTest('Expander Integration', false, {
        error: error.message
      });
    }
  }

  // Test 9: Test performance testing method
  async testPerformanceTesting() {
    try {
      if (!this.expander) {
        return this.logTest('Performance Testing', false, {
          error: 'Expander not available'
        });
      }

      const performanceResult = await this.expander.testWorkerPerformance();
      
      const isValidPerformance = performanceResult && 
                                !performanceResult.error &&
                                performanceResult.threadAnalysis &&
                                performanceResult.elementParsing;
      
      return this.logTest('Performance Testing', isValidPerformance, {
        threadAnalysis: performanceResult.threadAnalysis,
        elementParsing: performanceResult.elementParsing,
        workerHealth: performanceResult.workerHealth,
        totalWorkerTime: performanceResult.totalWorkerTime
      });
    } catch (error) {
      return this.logTest('Performance Testing', false, {
        error: error.message
      });
    }
  }

  // Test 10: Test worker statistics
  async testWorkerStatistics() {
    try {
      if (!this.workerManager) {
        return this.logTest('Worker Statistics', false, {
          error: 'WorkerManager not available'
        });
      }

      const stats = this.workerManager.getStats();
      
      const hasValidStats = stats && 
                           typeof stats.totalTasks === 'number' &&
                           typeof stats.successfulTasks === 'number' &&
                           typeof stats.workerCount === 'number';
      
      return this.logTest('Worker Statistics', hasValidStats, {
        totalTasks: stats.totalTasks,
        successfulTasks: stats.successfulTasks,
        failedTasks: stats.failedTasks,
        fallbackUsed: stats.fallbackUsed,
        workerCount: stats.workerCount,
        healthStatus: stats.healthStatus
      });
    } catch (error) {
      return this.logTest('Worker Statistics', false, {
        error: error.message
      });
    }
  }

  // Test 11: Test fallback mechanism
  async testFallbackMechanism() {
    try {
      if (!this.workerManager) {
        return this.logTest('Fallback Mechanism', false, {
          error: 'WorkerManager not available'
        });
      }

      // Force fallback by using invalid task
      const fallbackResult = await this.workerManager.executeTask('invalidTask', {});
      
      const hasFallback = fallbackResult && fallbackResult.fallback;
      
      return this.logTest('Fallback Mechanism', hasFallback, {
        fallback: fallbackResult.fallback,
        error: fallbackResult.error
      });
    } catch (error) {
      return this.logTest('Fallback Mechanism', false, {
        error: error.message
      });
    }
  }

  // Test 12: Test memory management
  async testMemoryManagement() {
    try {
      if (!this.workerManager) {
        return this.logTest('Memory Management', false, {
          error: 'WorkerManager not available'
        });
      }

      // Perform multiple operations to test memory usage
      const htmlContent = document.documentElement.outerHTML;
      
      for (let i = 0; i < 5; i++) {
        await this.workerManager.analyzeThreadStructure(htmlContent);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const stats = this.workerManager.getStats();
      const hasMemoryInfo = stats && stats.workerCount > 0;
      
      return this.logTest('Memory Management', hasMemoryInfo, {
        workerCount: stats.workerCount,
        totalTasks: stats.totalTasks,
        averageTaskTime: stats.averageTaskTime
      });
    } catch (error) {
      return this.logTest('Memory Management', false, {
        error: error.message
      });
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Running Web Worker Integration Test Suite...\n');
    
    const tests = [
      () => this.testRedditPage(),
      () => this.testExtensionLoaded(),
      () => this.testWorkerManagerCreation(),
      () => this.testWorkerHealthCheck(),
      () => this.testThreadAnalysis(),
      () => this.testElementParsing(),
      () => this.testSelectorOptimization(),
      () => this.testExpanderIntegration(),
      () => this.testPerformanceTesting(),
      () => this.testWorkerStatistics(),
      () => this.testFallbackMechanism(),
      () => this.testMemoryManagement()
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      try {
        const result = await test();
        if (result) passedTests++;
      } catch (error) {
        console.error('❌ Test failed with error:', error);
      }
    }

    // Generate summary
    const totalTime = performance.now() - this.startTime;
    const successRate = (passedTests / totalTests) * 100;

    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);

    if (successRate >= 80) {
      console.log('\n🎉 Web Worker Integration Test: PASSED');
      console.log('✅ The web worker integration is working correctly!');
    } else if (successRate >= 60) {
      console.log('\n⚠️ Web Worker Integration Test: PARTIAL SUCCESS');
      console.log('⚠️ Some features may not be working optimally.');
    } else {
      console.log('\n❌ Web Worker Integration Test: FAILED');
      console.log('❌ The web worker integration needs attention.');
    }

    // Cleanup
    if (this.workerManager) {
      this.workerManager.destroy();
    }

    return {
      passed: passedTests,
      total: totalTests,
      successRate,
      results: this.testResults,
      totalTime
    };
  }
}

// Auto-run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const tester = new WorkerIntegrationTester();
        tester.runAllTests();
      }, 1000); // Give extension time to load
    });
  } else {
    setTimeout(() => {
      const tester = new WorkerIntegrationTester();
      tester.runAllTests();
    }, 1000);
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.WorkerIntegrationTester = WorkerIntegrationTester;
  console.log('🧪 WorkerIntegrationTester loaded. Run: new WorkerIntegrationTester().runAllTests()');
} 