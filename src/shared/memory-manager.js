/**
 * Memory Manager for Reddit Comment Expander
 * 
 * Provides comprehensive memory management including:
 * - Automatic cleanup of processed elements
 * - Observer lifecycle management
 * - Progress overlay cleanup
 * - Memory usage monitoring and reporting
 * - Page unload cleanup
 * - Integration hooks for CommentExpander
 */

console.log('🧠 [MEMORY-MANAGER] Loading MemoryManager...');

class MemoryManager {
  constructor(options = {}) {
    this.options = {
      cleanupInterval: options.cleanupInterval || 120000, // 2 minutes
      maxMemoryUsage: options.maxMemoryUsage || 50 * 1024 * 1024, // 50MB
      enableMonitoring: options.enableMonitoring !== false,
      enableAutoCleanup: options.enableAutoCleanup !== false,
      logLevel: options.logLevel || 'info', // 'debug', 'info', 'warn', 'error'
      ...options
    };

    // Core memory tracking
    this.processedElements = new WeakSet();
    this.activeObservers = new Set();
    this.progressOverlays = new Set();
    this.cleanupTimers = new Set();
    this.memorySnapshots = [];
    
    // Statistics and monitoring
    this.stats = {
      totalElementsProcessed: 0,
      totalObserversCreated: 0,
      totalObserversDisconnected: 0,
      totalOverlaysCreated: 0,
      totalOverlaysRemoved: 0,
      totalCleanupsPerformed: 0,
      totalMemoryFreed: 0,
      lastCleanupTime: null,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0
    };

    // State management
    this.isExpanding = false;
    this.isMonitoring = false;
    this.cleanupTimer = null;

    // Initialize
    this._initialize();
  }

  /**
   * Initialize the memory manager
   */
  _initialize() {
    console.log('🧠 [MEMORY-MANAGER] Initializing...');
    
    if (this.options.enableAutoCleanup) {
      this._startAutoCleanup();
    }
    
    if (this.options.enableMonitoring) {
      this._startMemoryMonitoring();
    }
    
    this._setupPageUnloadCleanup();
    this._log('MemoryManager initialized', this.options);
  }

  /**
   * Start automatic cleanup timer
   */
  _startAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.options.cleanupInterval);
    
    this._log(`Auto cleanup started (${this.options.cleanupInterval}ms interval)`);
  }

  /**
   * Stop automatic cleanup timer
   */
  _stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this._log('Auto cleanup stopped');
    }
  }

  /**
   * Start memory usage monitoring
   */
  _startMemoryMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this._monitorMemoryUsage();
    this._log('Memory monitoring started');
  }

  /**
   * Stop memory usage monitoring
   */
  _stopMemoryMonitoring() {
    this.isMonitoring = false;
    this._log('Memory monitoring stopped');
  }

  /**
   * Monitor memory usage periodically
   */
  _monitorMemoryUsage() {
    if (!this.isMonitoring) return;
    
    const usage = this._getMemoryUsage();
    this.stats.currentMemoryUsage = usage;
    
    if (usage > this.stats.peakMemoryUsage) {
      this.stats.peakMemoryUsage = usage;
    }
    
    // Take snapshot every 5 minutes
    if (this.memorySnapshots.length === 0 || 
        Date.now() - this.memorySnapshots[this.memorySnapshots.length - 1].timestamp > 300000) {
      this.memorySnapshots.push({
        timestamp: Date.now(),
        usage: usage,
        processedElements: this.stats.totalElementsProcessed,
        activeObservers: this.activeObservers.size,
        activeOverlays: this.progressOverlays.size
      });
      
      // Keep only last 24 snapshots (2 hours)
      if (this.memorySnapshots.length > 24) {
        this.memorySnapshots.shift();
      }
    }
    
    // Check for memory pressure
    if (usage > this.options.maxMemoryUsage * 0.8) {
      this._log(`Memory usage high: ${this._formatBytes(usage)}`, 'warn');
      this.performCleanup();
    }
    
    // Schedule next monitoring
    setTimeout(() => this._monitorMemoryUsage(), 30000); // Every 30 seconds
  }

  /**
   * Get current memory usage estimate
   */
  _getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    
    // Fallback estimation
    let estimatedUsage = 0;
    
    // Estimate based on processed elements (roughly 1KB per element)
    estimatedUsage += this.stats.totalElementsProcessed * 1024;
    
    // Estimate based on active observers (roughly 2KB per observer)
    estimatedUsage += this.activeObservers.size * 2048;
    
    // Estimate based on progress overlays (roughly 5KB per overlay)
    estimatedUsage += this.progressOverlays.size * 5120;
    
    return estimatedUsage;
  }

  /**
   * Setup page unload cleanup
   */
  _setupPageUnloadCleanup() {
    const cleanup = () => {
      this._log('Page unloading, performing final cleanup');
      this.performFullCleanup();
    };
    
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    window.addEventListener('unload', cleanup);
    
    this._log('Page unload cleanup handlers registered');
  }

  /**
   * Log message with appropriate level
   */
  _log(message, level = 'info', data = null) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.options.logLevel] || 1;
    const messageLevel = levels[level] || 1;
    
    if (messageLevel >= currentLevel) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const prefix = `🧠 [MEMORY-MANAGER] [${timestamp}]`;
      
      if (data) {
        console[level](`${prefix} ${message}`, data);
      } else {
        console[level](`${prefix} ${message}`);
      }
    }
  }

  /**
   * Format bytes to human readable format
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Register a processed element for cleanup
   */
  registerProcessedElement(element) {
    if (!element || !(element instanceof Element)) {
      this._log('Invalid element provided to registerProcessedElement', 'warn');
      return;
    }
    
    this.processedElements.add(element);
    this.stats.totalElementsProcessed++;
    
    this._log(`Element registered for cleanup (total: ${this.stats.totalElementsProcessed})`, 'debug');
  }

  /**
   * Register an observer for lifecycle management
   */
  registerObserver(observer, context = '') {
    if (!observer || typeof observer.disconnect !== 'function') {
      this._log('Invalid observer provided to registerObserver', 'warn');
      return;
    }
    
    this.activeObservers.add(observer);
    this.stats.totalObserversCreated++;
    
    this._log(`Observer registered (${context}) - total: ${this.activeObservers.size}`, 'debug');
  }

  /**
   * Unregister and disconnect an observer
   */
  unregisterObserver(observer, context = '') {
    if (!observer) return;
    
    if (this.activeObservers.has(observer)) {
      this.activeObservers.delete(observer);
      this.stats.totalObserversDisconnected++;
      
      try {
        observer.disconnect();
        this._log(`Observer disconnected (${context}) - remaining: ${this.activeObservers.size}`, 'debug');
      } catch (error) {
        this._log(`Error disconnecting observer: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Register a progress overlay for cleanup
   */
  registerProgressOverlay(overlay, context = '') {
    if (!overlay || !(overlay instanceof Element)) {
      this._log('Invalid overlay provided to registerProgressOverlay', 'warn');
      return;
    }
    
    this.progressOverlays.add(overlay);
    this.stats.totalOverlaysCreated++;
    
    this._log(`Progress overlay registered (${context}) - total: ${this.progressOverlays.size}`, 'debug');
  }

  /**
   * Remove a progress overlay
   */
  removeProgressOverlay(overlay, context = '') {
    if (!overlay) return;
    
    if (this.progressOverlays.has(overlay)) {
      this.progressOverlays.delete(overlay);
      this.stats.totalOverlaysRemoved++;
      
      try {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        this._log(`Progress overlay removed (${context}) - remaining: ${this.progressOverlays.size}`, 'debug');
      } catch (error) {
        this._log(`Error removing overlay: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Perform standard cleanup
   */
  performCleanup() {
    this._log('Performing standard cleanup...');
    
    const startTime = performance.now();
    let elementsCleaned = 0;
    let overlaysCleaned = 0;
    
    // Clean up old progress overlays (older than 5 minutes)
    const now = Date.now();
    for (const overlay of this.progressOverlays) {
      if (overlay.dataset.createdAt) {
        const age = now - parseInt(overlay.dataset.createdAt);
        if (age > 300000) { // 5 minutes
          this.removeProgressOverlay(overlay, 'auto-cleanup');
          overlaysCleaned++;
        }
      }
    }
    
    // Clean up orphaned observers (no longer observing valid elements)
    for (const observer of this.activeObservers) {
      try {
        // Check if observer is still valid
        if (!observer._targets || observer._targets.length === 0) {
          this.unregisterObserver(observer, 'auto-cleanup');
        }
      } catch (error) {
        // Observer is invalid, remove it
        this.unregisterObserver(observer, 'auto-cleanup');
      }
    }
    
    // Update statistics
    this.stats.totalCleanupsPerformed++;
    this.stats.lastCleanupTime = now;
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this._log(`Cleanup completed in ${duration.toFixed(2)}ms - Elements: ${elementsCleaned}, Overlays: ${overlaysCleaned}`);
  }

  /**
   * Perform full cleanup (called on page unload)
   */
  performFullCleanup() {
    this._log('Performing full cleanup...');
    
    // Stop monitoring and auto-cleanup
    this._stopMemoryMonitoring();
    this._stopAutoCleanup();
    
    // Disconnect all observers
    for (const observer of this.activeObservers) {
      try {
        observer.disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.activeObservers.clear();
    
    // Remove all progress overlays
    for (const overlay of this.progressOverlays) {
      try {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.progressOverlays.clear();
    
    // Clear all timers
    for (const timer of this.cleanupTimers) {
      try {
        clearTimeout(timer);
        clearInterval(timer);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.cleanupTimers.clear();
    
    this._log('Full cleanup completed');
  }

  /**
   * Notify that expansion has started
   */
  onExpansionStart() {
    this.isExpanding = true;
    this._log('Expansion started - enabling enhanced monitoring');
    
    // Start enhanced monitoring during expansion
    if (this.options.enableMonitoring) {
      this._startMemoryMonitoring();
    }
  }

  /**
   * Notify that expansion has completed
   */
  onExpansionComplete() {
    this.isExpanding = false;
    this._log('Expansion completed - performing post-expansion cleanup');
    
    // Disconnect all observers
    for (const observer of this.activeObservers) {
      this.unregisterObserver(observer, 'expansion-complete');
    }
    
    // Remove all progress overlays
    for (const overlay of this.progressOverlays) {
      this.removeProgressOverlay(overlay, 'expansion-complete');
    }
    
    // Perform immediate cleanup
    this.performCleanup();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const currentUsage = this._getMemoryUsage();
    
    return {
      currentUsage: currentUsage,
      currentUsageFormatted: this._formatBytes(currentUsage),
      peakUsage: this.stats.peakMemoryUsage,
      peakUsageFormatted: this._formatBytes(this.stats.peakMemoryUsage),
      processedElements: this.stats.totalElementsProcessed,
      activeObservers: this.activeObservers.size,
      activeOverlays: this.progressOverlays.size,
      totalCleanups: this.stats.totalCleanupsPerformed,
      lastCleanup: this.stats.lastCleanupTime,
      memorySnapshots: this.memorySnapshots.length,
      isExpanding: this.isExpanding,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get detailed memory report
   */
  getDetailedReport() {
    const stats = this.getMemoryStats();
    const report = {
      summary: stats,
      snapshots: this.memorySnapshots,
      options: this.options,
      timestamp: Date.now()
    };
    
    return report;
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.stats = {
      totalElementsProcessed: 0,
      totalObserversCreated: 0,
      totalObserversDisconnected: 0,
      totalOverlaysCreated: 0,
      totalOverlaysRemoved: 0,
      totalCleanupsPerformed: 0,
      totalMemoryFreed: 0,
      lastCleanupTime: null,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0
    };
    
    this.memorySnapshots = [];
    this._log('Statistics reset');
  }

  /**
   * Destroy the memory manager
   */
  destroy() {
    this._log('Destroying MemoryManager...');
    
    this.performFullCleanup();
    this.resetStats();
    
    this._log('MemoryManager destroyed');
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MemoryManager = MemoryManager;
  
  // Create global instance
  if (!window.memoryManager) {
    window.memoryManager = new MemoryManager();
    console.log('🧠 [MEMORY-MANAGER] Global instance created');
  }
}

console.log('🧠 [MEMORY-MANAGER] MemoryManager loaded successfully'); 