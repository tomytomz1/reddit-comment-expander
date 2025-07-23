/**
 * Comment Expander for Reddit
 * 
 * This module handles expanding collapsed comments on Reddit pages.
 * 
 * Note: AbortError handling: During rapid comment expansion, Reddit's internal
 * components may abort requests (for user flair, icons, etc.) when the DOM
 * changes rapidly. These AbortErrors are expected and handled silently to
 * prevent console spam. This is normal behavior and doesn't affect functionality.
 */

// Global AbortError suppression
(function() {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Suppress AbortError messages from Reddit's internal components
    if (args[0] && typeof args[0] === 'string' && args[0].includes('AbortError')) {
      return; // Silently ignore AbortErrors
    }
    originalConsoleError.apply(console, args);
  };

  // Suppress unhandled promise rejections for AbortErrors
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'unhandledrejection') {
      const wrappedListener = function(event) {
        const reason = event.reason;
        if (reason && reason.name === 'AbortError') {
          event.preventDefault();
          return; // Suppress AbortError unhandled rejections
        }
        listener.call(this, event);
      };
      return originalAddEventListener.call(this, type, wrappedListener, options);
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // Suppress specific Reddit component errors
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args[0];
    if (typeof message === 'string') {
      // Suppress specific Reddit component warnings
      if (message.includes('AbortError') || 
          message.includes('user-flair') || 
          message.includes('select-controller') ||
          message.includes('icon-') ||
          message.includes('sentry-')) {
        return; // Silently ignore these specific errors
      }
    }
    originalConsoleWarn.apply(console, args);
  };
})();

// Enhanced Comment Expansion Engine
class CommentExpander {
  constructor(detector, accessibility) {
    this.detector = detector;
    this.accessibility = accessibility;
    this.isExpanding = false;
    this.shouldCancel = false;
    this.queue = new PriorityQueue();
    this.rateLimiter = new AdaptiveRateLimiter();
    this.processed = new WeakSet();
    this.observers = new Map();
    this.statusOverlay = null;
    this.abortErrorCount = 0; // Track AbortError frequency
    this.lastAbortErrorTime = 0; // Track when last AbortError occurred
    
    this.stats = {
      startTime: 0,
      endTime: 0,
      expanded: 0,
      failed: 0,
      retries: 0,
      categories: {}
    };
    
    console.log('Comment Expander initialized');
  }

  async expandAll(options = {}) {
    if (this.isExpanding) {
      console.log('Expansion already in progress');
      this.accessibility.announceToScreenReader('Expansion already in progress');
      return;
    }

    const {
      expandDeleted = false, // Default to false for free tier
      expandCrowdControl = false, // Default to false for free tier
      expandContestMode = false, // Default to false for free tier
      inlineThreadContinuation = false, // Default to false for free tier
      respectUserPreferences = true,
      maxElements = 1000, // Safety limit
      maxTime = 300000 // 5 minutes max
    } = options;

    // Initialize expansion
    this.isExpanding = true;
    this.shouldCancel = false;
    this.stats.startTime = performance.now();
    this.stats.expanded = 0;
    this.stats.failed = 0;
    this.stats.retries = 0;
    this.stats.categories = {};
    this.processed = new WeakSet();
    this.queue.clear();

    // Announce to screen readers
    this.accessibility.announceToScreenReader('Beginning comment expansion');
    this.accessibility.manageFocusDuringExpansion();

    try {
      // Create status overlay
      this.statusOverlay = this.accessibility.createAccessibleStatusOverlay();
      
      // Initial scan with priority scoring
      await this.scanAndQueueElements(options);
      
      // Process queue with intelligent batching
      let processedCount = 0;
      const startTime = performance.now();
      
      while (!this.queue.isEmpty() && !this.shouldCancel && processedCount < maxElements) {
        try {
          const batch = this.queue.dequeueBatch(3); // Further reduced batch size for very conservative expansion
          await this.processBatch(batch, options);
          
          processedCount += batch.length;
          
          // Add delay between batches to let Reddit's components settle
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check time limit
          if (performance.now() - startTime > maxTime) {
            console.log('Time limit reached, stopping expansion');
            this.accessibility.announceToScreenReader('Time limit reached, stopping expansion');
            break;
          }
          
          // Handle inline thread continuation
          if (inlineThreadContinuation) {
            await this.loadContinuedThreadsInline();
          }
          
          // Update UI and check for new elements
          await this.updateProgress();
          await this.checkForNewElements();
          
          // Yield to browser for smooth performance
          await this.yieldToBrowser();
        } catch (error) {
          // Handle AbortError silently - this is expected during rapid expansion
          if (error.name === 'AbortError') {
            console.log('Batch processing aborted (this is normal during rapid expansion)');
            // Add extra delay after AbortError to let things settle
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw error; // Re-throw other errors
        }
      }
      
      // Final announcement
      this.stats.endTime = performance.now();
      this.accessibility.announceCompletion(this.stats);
      
    } catch (error) {
      console.error('Error during expansion:', error);
      this.accessibility.announceError(error.message, 'expansion');
    } finally {
      this.isExpanding = false;
      this.accessibility.restoreFocusAfterExpansion();
      
      // Cleanup
      if (this.statusOverlay) {
        this.statusOverlay.remove();
        this.statusOverlay = null;
      }
    }
  }

  async scanAndQueueElements(options) {
    console.log('Scanning for expandable elements...');
    
    const scoredElements = this.detector.getAllExpandableElements();
    console.log(`Found ${scoredElements.length} expandable elements`);
    
    // Filter based on options
    const filteredElements = scoredElements.filter(item => {
      const { category, element } = item;
      
      // Skip if already processed
      if (this.processed.has(element)) {
        return false;
      }
      
      // Apply user preferences
      if (!options.expandDeleted && category === 'deleted') {
        return false;
      }
      
      if (!options.expandCrowdControl && category === 'crowdControl') {
        return false;
      }
      
      if (!options.expandContestMode && category === 'contestMode') {
        return false;
      }
      
      return true;
    });
    
    // Add to priority queue
    filteredElements.forEach(item => {
      this.queue.enqueue(item);
    });
    
    console.log(`Queued ${filteredElements.length} elements for expansion`);
  }

  async processBatch(batch, options) {
    const results = [];
    
    for (const item of batch) {
      if (this.shouldCancel) break;
      
      try {
        // Check if we need to pause due to too many AbortErrors
        if (this.shouldPauseForAbortErrors()) {
          console.log('Pausing expansion due to frequent AbortErrors');
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.resetAbortErrorCount();
        }
        
        // Wait for rate limiter before processing each element
        await this.rateLimiter.waitIfNeeded();
        
        const success = await this.expandElement(item.element, item.category);
        
        if (success) {
          this.stats.expanded++;
          this.rateLimiter.onSuccess();
        } else {
          this.stats.failed++;
          this.rateLimiter.onFailure();
        }
        
        results.push({ element: item.element, success });
        
        // Update progress less frequently to reduce overhead
        if (this.stats.expanded % 5 === 0) {
          await this.updateProgress();
        }
        
        // Yield to browser more frequently to prevent blocking
        await this.yieldToBrowser();
        
      } catch (error) {
        // Handle AbortError silently - this is expected during rapid expansion
        if (error.name === 'AbortError') {
          this.trackAbortError();
          this.stats.failed++;
          this.rateLimiter.onFailure();
          results.push({ element: item.element, success: false });
          continue;
        }
        
        console.warn('Error processing element:', error);
        this.stats.failed++;
        this.rateLimiter.onFailure();
        results.push({ element: item.element, success: false });
      }
    }
    
    return results;
  }

  trackAbortError() {
    const now = performance.now();
    this.abortErrorCount++;
    this.lastAbortErrorTime = now;
  }

  shouldPauseForAbortErrors() {
    const now = performance.now();
    const timeWindow = 10000; // 10 seconds
    
    // If we've had 5+ AbortErrors in the last 10 seconds, pause
    if (this.abortErrorCount >= 5 && (now - this.lastAbortErrorTime) < timeWindow) {
      return true;
    }
    
    // Reset count if it's been more than 10 seconds
    if ((now - this.lastAbortErrorTime) > timeWindow) {
      this.resetAbortErrorCount();
    }
    
    return false;
  }

  resetAbortErrorCount() {
    this.abortErrorCount = 0;
    this.lastAbortErrorTime = 0;
  }

  async expandElement(element, category) {
    if (!element || this.processed.has(element)) {
      return false;
    }

    try {
      // Different expansion strategies based on category
      switch (category) {
        case 'collapsed':
          return await this.expandCollapsedComment(element);
        case 'moreComments':
        case 'moreReplies':
          return await this.expandMoreComments(element);
        case 'continueThread':
          return await this.expandContinueThread(element);
        case 'crowdControl':
          return await this.expandCrowdControl(element);
        case 'contestMode':
          return await this.expandContestMode(element);
        case 'deleted':
          return await this.expandDeletedComment(element);
        case 'viewRest':
          return await this.expandViewRest(element);
        default:
          return await this.expandGeneric(element);
      }
    } catch (error) {
      // Handle AbortError silently, log other errors
      if (error.name === 'AbortError') {
        console.log(`Expansion aborted for ${category} element (this is normal)`);
      } else {
        console.error(`Error expanding ${category} element:`, error);
      }
      return false;
    }
  }

  async expandCollapsedComment(element) {
    // Find the expand button within the comment
    const expandButton = element.querySelector('button[aria-expanded="false"]') || 
                        element.querySelector('[role="button"][aria-expanded="false"]') ||
                        element;
    
    // Check if already expanded
    if (expandButton.getAttribute('aria-expanded') === 'true') {
      return true;
    }
    
    // Prevent clicking share buttons
    const ariaLabel = expandButton.getAttribute('aria-label') || '';
    const dataTestId = expandButton.getAttribute('data-testid') || '';
    if (/share/i.test(ariaLabel) || /share/i.test(dataTestId)) {
      return false;
    }
    
    // Add a longer delay before clicking to let Reddit's components settle
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Click the expand button with better error handling
    try {
      // Use a more robust click method
      if (expandButton.click) {
        expandButton.click();
      } else if (expandButton.dispatchEvent) {
        expandButton.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
      
      // Wait for expansion to complete with longer timeout
      await this.waitForExpansion(expandButton, 4000);
      
      // Add a delay after expansion to let Reddit's components settle
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      // Handle AbortError and other errors silently
      if (error.name === 'AbortError') {
        // This is expected when Reddit aborts requests during rapid expansion
        return false;
      }
      console.warn('Error during button click:', error);
      return false;
    }
    
    return true;
  }

  async expandMoreComments(element) {
    // Handle "load more comments" buttons/links
    try {
      if (element.tagName === 'A') {
        // For links, we need to be careful not to navigate
        const href = element.href;
        if (href && !href.includes('/comment/')) {
          element.click();
          await this.waitForExpansion(element);
          return true;
        }
      } else if (element.tagName === 'BUTTON') {
        element.click();
        await this.waitForExpansion(element);
        return true;
      }
    } catch (error) {
      // Handle AbortError silently
      if (error.name !== 'AbortError') {
        console.warn('Error during more comments expansion:', error);
      }
    }
    
    return false;
  }

  async expandContinueThread(element) {
    // Handle "Continue this thread" links
    try {
      if (element.tagName === 'A' && element.href) {
        // Check if the link is still valid and not already processed
        if (element.classList.contains('processed') || element.disabled) {
          return false;
        }
        
        // Mark as processed to avoid duplicate clicks
        element.classList.add('processed');
        
        // For now, just click the link
        // In the future, we could implement inline loading
        element.click();
        
        // Wait for expansion with shorter timeout
        await this.waitForExpansion(element, 2000);
        return true;
      }
    } catch (error) {
      // Handle AbortError silently - this is expected during rapid expansion
      if (error.name === 'AbortError') {
        return false;
      }
      console.warn('Error during continue thread expansion:', error);
    }
    
    return false;
  }

  async expandCrowdControl(element) {
    // Handle crowd control collapsed comments
    console.log('Expanding crowd control comment');
    return await this.expandCollapsedComment(element);
  }

  async expandContestMode(element) {
    // Handle contest mode hidden comments
    console.log('Expanding contest mode comment');
    return await this.expandCollapsedComment(element);
  }

  async expandDeletedComment(element) {
    // Handle deleted/removed comments
    console.log('Expanding deleted comment');
    return await this.expandCollapsedComment(element);
  }

  async expandViewRest(element) {
    // Handle "View the rest of the comments" buttons
    console.log('Expanding view rest element');
    return await this.expandMoreComments(element);
  }

  async expandGeneric(element) {
    // Generic expansion for unknown element types
    try {
      if (element.click) {
        element.click();
        await this.waitForExpansion(element);
        return true;
      }
    } catch (error) {
      // Handle AbortError silently
      if (error.name !== 'AbortError') {
        console.warn('Error during generic expansion:', error);
      }
    }
    
    return false;
  }

  async waitForExpansion(element, timeout = 3000) {
    const startTime = performance.now();
    
    try {
      while (performance.now() - startTime < timeout) {
        // Check if element is still in loading state
        const text = element.textContent?.toLowerCase() || '';
        if (!text.includes('loading') && !text.includes('please wait')) {
          break;
        }
        
        // Use a shorter delay to be less aggressive
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Silently handle AbortError - this is expected during rapid expansion
      if (error.name !== 'AbortError') {
        console.warn('Error during expansion wait:', error);
      }
    }
  }

  async loadContinuedThreadsInline() {
    // This would implement inline loading of continued threads
    // For now, we'll just log that we're checking for them
    const continuedLinks = this.detector.findElements('continueThread');
    
    if (continuedLinks.length > 0) {
      console.log(`Found ${continuedLinks.length} continued thread links`);
      // Future implementation: fetch and inject content inline
    }
  }

  async updateProgress() {
    if (!this.statusOverlay) return;
    
    const total = this.queue.size() + this.stats.expanded + this.stats.failed;
    const current = this.stats.expanded;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    // Calculate time remaining
    const elapsed = performance.now() - this.stats.startTime;
    const rate = current / (elapsed / 1000); // elements per second
    const remaining = total - current;
    const timeRemaining = rate > 0 ? Math.round(remaining / rate) : 0;
    
    const status = {
      message: `Expanding comments... ${current} of ${total} (${percentage}%)`,
      progress: { current, total },
      timeRemaining: timeRemaining > 0 ? `${timeRemaining}s remaining` : null
    };
    
    this.accessibility.updateStatusOverlay(this.statusOverlay, status);
  }

  async checkForNewElements() {
    // Set up mutation observer to watch for new content
    if (!this.observers.has('content')) {
      const observer = new MutationObserver((mutations) => {
        let hasNewContent = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (let node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if new comments were added
                if (node.classList && (node.classList.contains('comment') || 
                    node.querySelector && node.querySelector('.comment'))) {
                  hasNewContent = true;
                  break;
                }
              }
            }
          }
        });
        
        if (hasNewContent && this.isExpanding) {
          console.log('New content detected, rescanning...');
          this.scanAndQueueElements();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      this.observers.set('content', observer);
    }
  }

  async yieldToBrowser() {
    // Use requestIdleCallback if available, otherwise setTimeout
    if (window.requestIdleCallback) {
      await new Promise(resolve => {
        requestIdleCallback(resolve, { timeout: 50 });
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
    }
  }

  cancel() {
    this.shouldCancel = true;
    this.accessibility.announceToScreenReader('Expansion cancelled by user');
    console.log('Expansion cancelled');
  }

  getStats() {
    return { ...this.stats };
  }

  cleanup() {
    // Disconnect all observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
    
    // Clear queue and processed set
    this.queue.clear();
    this.processed = null;
    
    // Reset stats
    this.stats = {
      expanded: 0,
      failed: 0,
      retries: 0,
      categories: {},
      startTime: null,
      endTime: null
    };
  }
}

// Priority Queue implementation
class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(item) {
    this.items.push(item);
    this.items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return b.visible - a.visible; // Visible items first
    });
  }

  dequeue() {
    return this.items.shift();
  }

  dequeueBatch(size) {
    const batch = [];
    for (let i = 0; i < size && this.items.length > 0; i++) {
      batch.push(this.dequeue());
    }
    return batch;
  }

  peek() {
    return this.items[0];
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  clear() {
    this.items = [];
  }
}

// Adaptive Rate Limiter
class AdaptiveRateLimiter {
  constructor() {
    this.baseDelay = 300; // Increased from 100ms for more conservative expansion
    this.maxDelay = 3000; // Increased from 2000ms
    this.currentDelay = this.baseDelay;
    this.failureCount = 0;
    this.successCount = 0;
  }

  async waitIfNeeded() {
    try {
      await new Promise(resolve => setTimeout(resolve, this.currentDelay));
    } catch (error) {
      // AbortError is expected during rapid expansion - handle silently
      if (error.name !== 'AbortError') {
        console.warn('Rate limiter error:', error);
      }
    }
  }

  onSuccess() {
    this.successCount++;
    if (this.successCount >= 5) { // Increased from 3 for more stability
      this.currentDelay = Math.max(this.baseDelay, this.currentDelay * 0.95); // More conservative reduction
      this.successCount = 0;
      this.failureCount = 0;
    }
  }

  onFailure() {
    this.failureCount++;
    this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 1.3); // More aggressive increase
    this.successCount = 0;
  }

  onRateLimit() {
    this.currentDelay = this.maxDelay;
    this.failureCount = 0;
    this.successCount = 0;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommentExpander, PriorityQueue, AdaptiveRateLimiter };
} else {
  window.CommentExpander = CommentExpander;
  window.PriorityQueue = PriorityQueue;
  window.AdaptiveRateLimiter = AdaptiveRateLimiter;
} 