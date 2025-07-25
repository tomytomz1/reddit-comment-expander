/**
 * MemoryManager Integration Example
 * 
 * This example shows how to integrate the MemoryManager with CommentExpander
 * to provide automatic memory cleanup and monitoring.
 */

// Example integration with CommentExpander
class CommentExpanderWithMemoryManagement {
  constructor() {
    // Initialize memory manager
    this.memoryManager = window.memoryManager || new window.MemoryManager({
      cleanupInterval: 120000, // 2 minutes
      enableMonitoring: true,
      enableAutoCleanup: true,
      logLevel: 'info'
    });
    
    // Track expansion state
    this.isExpanding = false;
    this.processedElements = new Set();
    this.observers = new Set();
  }

  /**
   * Start expansion process with memory management
   */
  async startExpansion(elements) {
    if (this.isExpanding) {
      console.log('⚠️ Expansion already in progress');
      return;
    }

    console.log('🚀 Starting expansion with memory management...');
    
    // Notify memory manager
    this.memoryManager.onExpansionStart();
    this.isExpanding = true;

    try {
      // Process each element
      for (const element of elements) {
        await this.processElement(element);
      }

      console.log('✅ Expansion completed successfully');
      
    } catch (error) {
      console.error('❌ Expansion failed:', error);
      
    } finally {
      // Always cleanup
      this.completeExpansion();
    }
  }

  /**
   * Process a single element with memory tracking
   */
  async processElement(element) {
    // Register element for cleanup
    this.memoryManager.registerProcessedElement(element);
    this.processedElements.add(element);

    // Create observer for this element
    const observer = new MutationObserver((mutations) => {
      // Handle mutations
      this.handleMutations(mutations);
    });

    // Register observer with memory manager
    this.memoryManager.registerObserver(observer, 'element-processing');
    this.observers.add(observer);

    // Start observing
    observer.observe(element, { 
      childList: true, 
      subtree: true 
    });

    // Create progress overlay
    const overlay = this.createProgressOverlay(element);
    this.memoryManager.registerProgressOverlay(overlay, 'element-processing');

    // Simulate processing
    await this.simulateProcessing(element);

    // Remove overlay when done
    this.memoryManager.removeProgressOverlay(overlay, 'element-complete');
  }

  /**
   * Handle DOM mutations
   */
  handleMutations(mutations) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Handle new nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Process new elements
            this.processNewElement(node);
          }
        }
      }
    }
  }

  /**
   * Process newly added elements
   */
  processNewElement(element) {
    // Register for cleanup
    this.memoryManager.registerProcessedElement(element);
    
    // Create overlay for new element
    const overlay = this.createProgressOverlay(element);
    this.memoryManager.registerProgressOverlay(overlay, 'new-element');
  }

  /**
   * Create a progress overlay
   */
  createProgressOverlay(element) {
    const overlay = document.createElement('div');
    overlay.className = 'expansion-progress-overlay';
    overlay.textContent = 'Expanding...';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 12px;
      z-index: 1000;
    `;
    
    // Add timestamp for cleanup
    overlay.dataset.createdAt = Date.now().toString();
    
    // Position relative to element
    const rect = element.getBoundingClientRect();
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Simulate processing time
   */
  async simulateProcessing(element) {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`✅ Processed element: ${element.tagName}`);
        resolve();
      }, Math.random() * 1000 + 500); // 500-1500ms
    });
  }

  /**
   * Complete expansion and cleanup
   */
  completeExpansion() {
    console.log('🧹 Completing expansion and cleaning up...');
    
    this.isExpanding = false;
    
    // Notify memory manager
    this.memoryManager.onExpansionComplete();
    
    // Get final stats
    const stats = this.memoryManager.getMemoryStats();
    console.log('📊 Final memory stats:', stats);
    
    // Clear local tracking
    this.processedElements.clear();
    this.observers.clear();
  }

  /**
   * Get memory usage report
   */
  getMemoryReport() {
    return this.memoryManager.getDetailedReport();
  }

  /**
   * Force cleanup
   */
  forceCleanup() {
    console.log('🧹 Forcing cleanup...');
    this.memoryManager.performCleanup();
  }

  /**
   * Destroy and cleanup everything
   */
  destroy() {
    console.log('🗑️ Destroying CommentExpander...');
    
    this.completeExpansion();
    this.memoryManager.destroy();
    
    console.log('✅ CommentExpander destroyed');
  }
}

// Example usage:
/*
// Initialize
const expander = new CommentExpanderWithMemoryManagement();

// Start expansion
const elements = document.querySelectorAll('.comment');
expander.startExpansion(elements);

// Monitor memory usage
setInterval(() => {
  const stats = expander.getMemoryReport();
  console.log('Memory usage:', stats.summary.currentUsageFormatted);
}, 30000);

// Force cleanup when needed
expander.forceCleanup();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  expander.destroy();
});
*/

console.log('📚 MemoryManager integration example loaded');
console.log('💡 Use CommentExpanderWithMemoryManagement class for automatic memory management'); 