/**
 * Worker Manager for Reddit Comment Expander
 * 
 * Manages Web Worker pool, task queuing, performance tracking, and fallback mechanisms
 * for heavy DOM processing tasks.
 */

console.log('🔧 Loading WorkerManager...');

class WorkerManager {
  constructor(options = {}) {
    this.options = {
      maxWorkers: options.maxWorkers || 2,
      taskTimeout: options.taskTimeout || 30000, // 30 seconds
      enableFallback: options.enableFallback !== false,
      enablePerformanceTracking: options.enablePerformanceTracking !== false,
      workerScriptPath: options.workerScriptPath || chrome.runtime.getURL('src/workers/dom-processor.worker.js'),
      ...options
    };

    // Worker pool management
    this.workers = [];
    this.availableWorkers = [];
    this.activeWorkers = new Set();
    
    // Task management
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.taskIdCounter = 0;
    
    // Performance tracking
    this.performanceStats = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      fallbackUsed: 0,
      averageTaskTime: 0,
      totalTaskTime: 0,
      workerErrors: 0,
      lastTaskTime: null
    };
    
    // State management
    this.isInitialized = false;
    this.isDestroyed = false;
    this.healthStatus = 'unknown';
    
    // Initialize worker pool
    this._initializeWorkerPool();
  }

  /**
   * Initialize the worker pool
   */
  async _initializeWorkerPool() {
    if (this.isDestroyed) return;
    
    try {
      console.log('🔧 Initializing worker pool...');
      
      for (let i = 0; i < this.options.maxWorkers; i++) {
        const worker = await this._createWorker();
        if (worker) {
          this.workers.push(worker);
          this.availableWorkers.push(worker);
        }
      }
      
      this.isInitialized = this.workers.length > 0;
      this.healthStatus = this.isInitialized ? 'healthy' : 'failed';
      
      console.log(`🔧 Worker pool initialized: ${this.workers.length}/${this.options.maxWorkers} workers`);
      
      if (this.isInitialized) {
        // Perform initial health check
        await this.healthCheck();
      }
    } catch (error) {
      console.error('🔧 Failed to initialize worker pool:', error);
      this.healthStatus = 'failed';
      this.isInitialized = false;
    }
  }

  /**
   * Create a single worker
   */
  async _createWorker() {
    try {
      const worker = new Worker(this.options.workerScriptPath);
      
      // Set up worker event handlers
      worker.onmessage = (event) => this._handleWorkerMessage(event);
      worker.onerror = (error) => this._handleWorkerError(error);
      
      // Test worker with health check
      const healthResult = await this._executeTask(worker, 'healthCheck', {});
      if (healthResult.success) {
        console.log('🔧 Worker created successfully');
        return worker;
      } else {
        console.warn('🔧 Worker health check failed');
        worker.terminate();
        return null;
      }
    } catch (error) {
      console.error('🔧 Failed to create worker:', error);
      return null;
    }
  }

  /**
   * Handle worker messages
   */
  _handleWorkerMessage(event) {
    const { task, result, taskId, timestamp } = event.data;
    
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) {
      console.warn('🔧 Received message for unknown task:', taskId);
      return;
    }
    
    // Calculate task duration
    const taskDuration = timestamp - activeTask.startTime;
    
    // Update performance stats
    this._updatePerformanceStats(taskDuration, result.success, result.fallback);
    
    // Resolve the task promise
    activeTask.resolve(result);
    this.activeTasks.delete(taskId);
    
    // Return worker to available pool
    this._returnWorkerToPool(activeTask.worker);
    
    console.log(`🔧 Task completed: ${task} (${taskDuration.toFixed(2)}ms)`);
  }

  /**
   * Handle worker errors
   */
  _handleWorkerError(error) {
    console.error('🔧 Worker error:', error);
    this.performanceStats.workerErrors++;
    
    // Mark worker as failed and remove from pool
    const failedWorker = error.target;
    this._removeWorkerFromPool(failedWorker);
    
    // Recreate worker if pool is below minimum
    if (this.workers.length < this.options.maxWorkers) {
      this._createWorker().then(worker => {
        if (worker) {
          this.workers.push(worker);
          this.availableWorkers.push(worker);
        }
      });
    }
  }

  /**
   * Execute a task on a worker
   */
  async _executeTask(worker, task, payload) {
    return new Promise((resolve, reject) => {
      const taskId = ++this.taskIdCounter;
      const startTime = Date.now();
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.activeTasks.delete(taskId);
        this._returnWorkerToPool(worker);
        reject(new Error(`Task timeout: ${task}`));
      }, this.options.taskTimeout);
      
      // Store task info
      this.activeTasks.set(taskId, {
        worker,
        task,
        startTime,
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      // Send task to worker
      worker.postMessage({
        task,
        payload,
        taskId
      });
    });
  }

  /**
   * Get an available worker
   */
  _getAvailableWorker() {
    if (this.availableWorkers.length > 0) {
      const worker = this.availableWorkers.pop();
      this.activeWorkers.add(worker);
      return worker;
    }
    return null;
  }

  /**
   * Return worker to available pool
   */
  _returnWorkerToPool(worker) {
    if (this.activeWorkers.has(worker)) {
      this.activeWorkers.delete(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Remove worker from pool
   */
  _removeWorkerFromPool(worker) {
    const workerIndex = this.workers.indexOf(worker);
    if (workerIndex > -1) {
      this.workers.splice(workerIndex, 1);
    }
    
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex > -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }
    
    this.activeWorkers.delete(worker);
    
    try {
      worker.terminate();
    } catch (error) {
      console.warn('🔧 Error terminating worker:', error);
    }
  }

  /**
   * Update performance statistics
   */
  _updatePerformanceStats(taskDuration, success, fallback) {
    this.performanceStats.totalTasks++;
    this.performanceStats.totalTaskTime += taskDuration;
    this.performanceStats.averageTaskTime = this.performanceStats.totalTaskTime / this.performanceStats.totalTasks;
    this.performanceStats.lastTaskTime = Date.now();
    
    if (success) {
      this.performanceStats.successfulTasks++;
    } else {
      this.performanceStats.failedTasks++;
    }
    
    if (fallback) {
      this.performanceStats.fallbackUsed++;
    }
  }

  /**
   * Execute a task with automatic fallback
   */
  async executeTask(task, payload) {
    if (!this.isInitialized) {
      console.warn('🔧 WorkerManager not initialized, using fallback');
      return this._executeFallback(task, payload);
    }
    
    const worker = this._getAvailableWorker();
    if (!worker) {
      console.warn('🔧 No available workers, using fallback');
      return this._executeFallback(task, payload);
    }
    
    try {
      const result = await this._executeTask(worker, task, payload);
      return result;
    } catch (error) {
      console.warn(`🔧 Worker task failed (${task}), using fallback:`, error);
      return this._executeFallback(task, payload);
    }
  }

  /**
   * Execute fallback implementation
   */
  async _executeFallback(task, payload) {
    if (!this.options.enableFallback) {
      throw new Error(`Task failed and fallback disabled: ${task}`);
    }
    
    console.log(`🔧 Executing fallback for task: ${task}`);
    
    try {
      switch (task) {
        case 'analyzeThreadStructure':
          return this._fallbackAnalyzeThreadStructure(payload.html);
        case 'parseExpandableElements':
          return this._fallbackParseExpandableElements(payload.html, payload.selectors);
        case 'optimizeSelectors':
          return this._fallbackOptimizeSelectors(payload.selectors, payload.performance);
        case 'healthCheck':
          return { status: 'fallback', timestamp: Date.now(), success: true };
        default:
          return { error: 'Unknown task', fallback: true, success: false };
      }
    } catch (error) {
      return { error: error.message, fallback: true, success: false };
    }
  }

  /**
   * Fallback implementations
   */
  _fallbackAnalyzeThreadStructure(html) {
    // Simple fallback analysis
    const commentMatches = html.match(/data-testid[^>]*comment[^>]*/g) || [];
    const moreRepliesMatches = html.match(/more-replies|morecomments/gi) || [];
    
    return {
      commentCount: commentMatches.length,
      moreRepliesCount: moreRepliesMatches.length,
      continueThreadCount: 0,
      threadComplexity: Math.min(commentMatches.length / 100, 1),
      maxDepth: 0,
      avgDepth: 0,
      recommendedBatchSize: Math.min(commentMatches.length, 20),
      analysisTime: 0,
      success: true,
      fallback: true
    };
  }

  _fallbackParseExpandableElements(html, selectors) {
    // Simple fallback parsing
    const elements = [];
    let totalFound = 0;
    
    for (const [category, selectorList] of Object.entries(selectors)) {
      const categoryElements = [];
      
      for (const selector of selectorList) {
        const matches = html.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || [];
        if (matches.length > 0) {
          categoryElements.push({
            selector,
            elements: matches.map(match => ({ textContent: match.slice(0, 100) })),
            performance: 0
          });
          totalFound += matches.length;
        }
      }
      
      if (categoryElements.length > 0) {
        elements.push({
          category,
          elements: categoryElements,
          performance: 0,
          totalElements: totalFound
        });
      }
    }
    
    return {
      elements,
      totalFound,
      categories: elements.length,
      selectorPerformance: {},
      processingTime: 0,
      success: true,
      fallback: true
    };
  }

  _fallbackOptimizeSelectors(selectors, performanceData) {
    // Simple fallback optimization
    const optimized = {};
    
    for (const [category, selectorList] of Object.entries(selectors)) {
      optimized[category] = selectorList.slice(0, 2); // Take first 2 selectors
    }
    
    return {
      optimized,
      originalCount: Object.values(selectors).reduce((sum, list) => sum + list.length, 0),
      optimizedCount: Object.values(optimized).reduce((sum, list) => sum + list.length, 0),
      success: true,
      fallback: true
    };
  }

  /**
   * Public API methods
   */
  async analyzeThreadStructure(html) {
    return this.executeTask('analyzeThreadStructure', { html });
  }

  async parseExpandableElements(html, selectors) {
    return this.executeTask('parseExpandableElements', { html, selectors });
  }

  async optimizeSelectors(selectors, performance) {
    return this.executeTask('optimizeSelectors', { selectors, performance });
  }

  async healthCheck() {
    return this.executeTask('healthCheck', {});
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      ...this.performanceStats,
      workerCount: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      activeWorkers: this.activeWorkers.size,
      activeTasks: this.activeTasks.size,
      queueLength: this.taskQueue.length,
      healthStatus: this.healthStatus,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Destroy all workers
   */
  destroy() {
    console.log('🔧 Destroying WorkerManager...');
    
    this.isDestroyed = true;
    
    // Terminate all workers
    this.workers.forEach(worker => {
      try {
        worker.terminate();
      } catch (error) {
        console.warn('🔧 Error terminating worker:', error);
      }
    });
    
    // Clear all collections
    this.workers = [];
    this.availableWorkers = [];
    this.activeWorkers.clear();
    this.activeTasks.clear();
    this.taskQueue = [];
    
    this.isInitialized = false;
    this.healthStatus = 'destroyed';
    
    console.log('🔧 WorkerManager destroyed');
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.WorkerManager = WorkerManager;
  console.log('🔧 WorkerManager loaded successfully');
} 