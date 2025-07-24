/**
 * Comment Expander for Reddit
 * 
 * This module handles expanding collapsed comments on Reddit pages.
 * 
 * Note: AbortError handling: During rapid comment expansion, Reddit's internal
 * components may abort requests (for user flair, icons, etc.) when the DOM
 * changes rapidly. These AbortErrors are tracked and logged at debug level
 * during expansion operations to prevent console spam while preserving visibility.
 */

console.log('📦 Loading expander.js');
window.REDDIT_EXPANDER_EXPANDER_LOADED = true;

// Utility Classes (defined first to avoid hoisting issues)

// Priority Queue for managing expansion order
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

// Targeted AbortError Handler - only active during expansion operations
class ExpansionErrorHandler {
  constructor() {
    this.isExpansionActive = false;
    this.abortErrorCount = 0;
    this.lastAbortErrorTime = 0;
    this.setupTargetedHandler();
  }

  setupTargetedHandler() {
    // Handle unhandled promise rejections during expansion only
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isExpansionActive && event.reason && event.reason.name === 'AbortError') {
        event.preventDefault();
        this.logAbortError('Unhandled promise rejection', event.reason);
      }
    });
  }

  startExpansion() {
    this.isExpansionActive = true;
    this.abortErrorCount = 0;
    console.debug('[ExpansionErrorHandler] Started tracking expansion-related errors');
  }

  endExpansion() {
    this.isExpansionActive = false;
    if (this.abortErrorCount > 0) {
      console.debug(`[ExpansionErrorHandler] Expansion complete. Tracked ${this.abortErrorCount} AbortErrors`);
    }
  }

  logAbortError(context, error) {
    this.abortErrorCount++;
    this.lastAbortErrorTime = Date.now();
    
    // Log at debug level instead of suppressing completely
    console.debug(`[ExpansionErrorHandler] AbortError during expansion (${context}):`, {
      count: this.abortErrorCount,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
  }

  // Wrapper for operations that might trigger AbortErrors
  async executeWithAbortHandling(operation, context = 'unknown') {
    try {
      return await operation();
    } catch (error) {
      if (this.isExpansionActive && error.name === 'AbortError') {
        this.logAbortError(context, error);
        // Don't rethrow AbortErrors during expansion
        return null;
      }
      // Rethrow all other errors normally
      throw error;
    }
  }

  // Check if error is an expansion-related AbortError
  isExpansionAbortError(error) {
    return this.isExpansionActive && 
           error && 
           (error.name === 'AbortError' || 
            (typeof error === 'string' && error.includes('AbortError')));
  }
}

// Enhanced Comment Expansion Engine
class CommentExpander {
  constructor(detector, accessibility) {
    this.detector = detector;
    this.accessibility = accessibility;
    
    // Initialize centralized state manager
    this.state = new ExpansionState({
      enablePersistence: true,
      persistenceKey: 'reddit-expander-state',
      enableLogging: true,
      maxErrorHistory: 50
    });
    
    // Legacy support properties (computed from state)
    // These will be removed gradually as code is refactored
    
    this.queue = new PriorityQueue();
    this.rateLimiter = new AdaptiveRateLimiter();
    this.processed = new WeakSet();
    this.statusOverlay = null;
    this.errorHandler = new ExpansionErrorHandler(); // Targeted error handling
    this.observers = new Map(); // Initialize observers Map for scroll observer
    
    // Initialize auto-scroll and auto-expansion stats
    this.autoScrollStats = {
      isActive: false,
      isComplete: false,
      startTime: null,
      endTime: null,
      totalScrolls: 0,
      lastScrollTime: null,
      scrollAttempts: 0,
      maxScrollAttempts: 10, // Maximum number of scroll attempts
      noNewContentCount: 0,
      maxNoNewContentCount: 3, // Maximum consecutive scrolls with no new content
      scrollDelay: 2000, // Delay between scrolls in milliseconds
      lastScrollHeight: 0
    };
    
    this.autoExpansionStats = {
      isActive: false,
      isComplete: false,
      sessionStartTime: null,
      totalProcessed: 0,
      lastActivityTime: null,
      currentOverlay: null
    };
    
    // Initialize error boundary if available
    this.errorBoundary = window.redditExpanderErrorBoundary || null;
    if (this.errorBoundary) {
      console.log('✅ CommentExpander integrated with global error boundary');
    }
    
    // Set up state change observers for UI updates
    this.setupStateObservers();
    
    // Set Reddit version in state
    this.state.updateState({
      redditVersion: this.detector.version
    });
    
    console.log('Comment Expander initialized with state manager');
  }

  // Legacy property getters for backward compatibility
  get isExpanding() {
    return this.state.getStatus() === ExpansionStatus.EXPANDING;
  }

  get shouldCancel() {
    return this.state.getStatus() === ExpansionStatus.CANCELLED;
  }

  get isPaused() {
    return this.state.getStatus() === ExpansionStatus.PAUSED;
  }

  get isResuming() {
    const state = this.state.getState();
    return state.status === ExpansionStatus.EXPANDING && 
           state.previousStatus === ExpansionStatus.PAUSED;
  }

  get stats() {
    const stateData = this.state.getState();
    return {
      startTime: stateData.progress.startTime,
      endTime: stateData.progress.endTime,
      expanded: stateData.progress.successful,
      failed: stateData.progress.failed,
      retries: stateData.errors.length,
      categories: stateData.categories
    };
  }

  /**
   * Set up observers for state changes to update UI and handle events
   */
  setupStateObservers() {
    // Subscribe to status changes
    this.state.subscribe(StateEventTypes.STATUS_CHANGED, (state, event) => {
      this.handleStatusChange(state.status, state.previousStatus, event);
    });

    // Subscribe to progress updates
    this.state.subscribe(StateEventTypes.PROGRESS_UPDATED, (state, event) => {
      this.handleProgressUpdate(state.progress, event);
    });

    // Subscribe to errors
    this.state.subscribe(StateEventTypes.ERROR_ADDED, (state, event) => {
      this.handleErrorAdded(state.lastError, event);
    });

    console.log('State observers set up');
  }

  /**
   * Handle status changes
   */
  handleStatusChange(newStatus, previousStatus, event) {
    console.log(`Status changed: ${previousStatus} → ${newStatus}`);
    
    // Update accessibility announcements
    switch (newStatus) {
      case ExpansionStatus.EXPANDING:
        this.accessibility.announceToScreenReader('Comment expansion started');
        this.errorHandler.startExpansion();
        break;
      case ExpansionStatus.PAUSED:
        this.accessibility.announceToScreenReader('Comment expansion paused');
        break;
      case ExpansionStatus.COMPLETE:
        this.accessibility.announceCompletion(this.stats);
        this.errorHandler.endExpansion();
        break;
      case ExpansionStatus.ERROR:
        this.accessibility.announceToScreenReader('Comment expansion encountered an error');
        this.errorHandler.endExpansion();
        break;
      case ExpansionStatus.CANCELLED:
        this.accessibility.announceToScreenReader('Comment expansion cancelled');
        this.errorHandler.endExpansion();
        break;
    }

    // Update UI elements if they exist
    this.updateUIForStatus(newStatus);
  }

  /**
   * Handle progress updates
   */
  handleProgressUpdate(progress, event) {
    // Update persistent progress overlay if it exists
    this.updatePersistentProgress();
    
    // Announce progress to accessibility tools periodically
    if (progress.processed % 10 === 0) { // Every 10 elements
      this.accessibility.announceProgress(
        progress.processed, 
        progress.total, 
        progress.currentCategory || 'comments'
      );
    }
  }

  /**
   * Handle errors being added
   */
  handleErrorAdded(error, event) {
    console.warn('Error added to state:', error);
    
    // Announce error to accessibility tools if it's significant
    if (error.context && !error.context.suppressAccessibility) {
      this.accessibility.announceError(error.error.message, error.context.operationName || 'expansion');
    }
  }

  /**
   * Update UI elements based on status
   */
  updateUIForStatus(status) {
    // Update floating button if it exists
    const fab = document.getElementById('reddit-comment-expander-fab');
    if (fab && this.accessibility) {
      this.accessibility.updateFloatingButtonAccessibility(fab, status);
    }

    // Update status overlay
    if (this.statusOverlay) {
      this.updateStatusOverlay(status);
    }
  }

  /**
   * Pause expansion
   */
  pause(reason = 'User requested') {
    if (this.state.getStatus() === ExpansionStatus.EXPANDING) {
      this.state.setStatus(ExpansionStatus.PAUSED, reason);
      return true;
    }
    return false;
  }

  /**
   * Resume expansion
   */
  resume() {
    if (this.state.getStatus() === ExpansionStatus.PAUSED) {
      this.state.setStatus(ExpansionStatus.EXPANDING);
      return true;
    }
    return false;
  }

  /**
   * Cancel expansion
   */
  cancel() {
    const currentStatus = this.state.getStatus();
    if (currentStatus === ExpansionStatus.EXPANDING || currentStatus === ExpansionStatus.PAUSED) {
      this.state.setStatus(ExpansionStatus.CANCELLED);
      return true;
    }
    return false;
  }

  /**
   * Stop expansion (alias for cancel)
   */
  stop() {
    return this.cancel();
  }

  /**
   * Get expansion statistics
   */
  getStats() {
    return this.stats; // Uses the getter which pulls from state
  }

  /**
   * Get current state summary
   */
  getStateSummary() {
    return this.state.getStateSummary();
  }

  /**
   * Clean up state manager
   */
  cleanup() {
    // Existing cleanup code...
    if (this.accessibility) {
      this.accessibility.cleanup();
    }
    
    // Clean up state manager
    if (this.state) {
      this.state.destroy();
    }
    
    // Remove other elements...
    if (this.fab) {
      this.fab.remove();
      this.fab = null;
    }
    
    if (this.statusOverlay) {
      this.statusOverlay.remove();
      this.statusOverlay = null;
    }
    
    // Cleanup observers...
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }
    
    if (this.navigationCheckTimeout) {
      clearTimeout(this.navigationCheckTimeout);
      this.navigationCheckTimeout = null;
    }
  }

  async expandAll(options = {}) {
    if (this.isExpanding) {
      console.log('Expansion already in progress');
      this.accessibility.announceToScreenReader('Expansion already in progress');
      return;
    }

    // Use error boundary if available for the entire expansion process
    if (this.errorBoundary) {
      return this.errorBoundary.wrap(
        () => this._expandAllInternal(options),
        {
          operationName: 'Comment Expansion Process',
          retryable: false, // Don't auto-retry full expansions
          onError: (error) => {
            this.state.setStatus(ExpansionStatus.ERROR);
            this.state.addError(error, { operationName: 'expansion process' });
          }
        }
      );
    } else {
      return this._expandAllInternal(options);
    }
  }

  async _expandAllInternal(options = {}) {

    const {
      expandDeleted = false, // Default to false for free tier
      expandCrowdControl = false, // Default to false for free tier
      expandContestMode = false, // Default to false for free tier
      inlineThreadContinuation = false, // Default to false for free tier
      respectUserPreferences = true,
      maxElements = 1000, // Safety limit
      maxTime = 300000 // 5 minutes max
    } = options;

    // Scan for expandable elements first
    const expandableElements = this.detector.getAllExpandableElements();
    
    // Initialize expansion using state manager
    this.state.initializeExpansion(expandableElements, options);
    this.processed = new WeakSet();
    this.queue.clear();
    
    // NEW: Reset auto-scroll stats for new expansion session
    this.autoScrollStats = {
      isActive: false,
      scrollAttempts: 0,
      maxScrollAttempts: 10,
      lastScrollHeight: 0,
      noNewContentCount: 0,
      maxNoNewContentCount: 3,
      scrollInterval: null,
      scrollDelay: 2000,
      isComplete: false
    };
    
    // NEW: Reset quality check attempts for new expansion session
    this.qualityCheckAttempts = 0;

    // NEW: Initialize auto-expansion stats for persistent progress window
    this.autoExpansionStats = {
      totalProcessed: 0,
      sessionStartTime: performance.now(),
      currentOverlay: null,
      isActive: true,
      lastActivityTime: performance.now(),
      completionCheckTimer: null,
      currentPhase: 'Initial Expansion',
      phaseStartTime: performance.now()
    };

    // Announce to screen readers
    this.accessibility.announceToScreenReader('Beginning comment expansion');
    this.accessibility.manageFocusDuringExpansion();

    try {
      // Create persistent status overlay that will stay throughout the entire process
      this.statusOverlay = this.createPersistentProgressOverlay();
      this.autoExpansionStats.currentOverlay = this.statusOverlay;
      console.log('[Progress] Progress overlay created in expandAll method');
      
      // Initial scan with priority scoring
      await this.scanAndQueueElements(options);
      
      // Process queue with intelligent batching
      let processedCount = 0;
      const startTime = performance.now();
      
      while (!this.queue.isEmpty() && !this.shouldCancel && processedCount < maxElements) {
        try {
          // Check if we should pause
          await this.checkPauseState();
          
          // Exit if cancelled during pause
          if (this.shouldCancel) break;
          
          const batch = this.queue.dequeueBatch(3); // Further reduced batch size for very conservative expansion
          await this.processBatch(batch, options);
          
          processedCount += batch.length;
          this.autoExpansionStats.totalProcessed += batch.length;
          this.autoExpansionStats.lastActivityTime = performance.now();
          
          // Update progress overlay
          this.updatePersistentProgress();
          
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
      
      // Final scan to catch any remaining elements that appeared after expansions
      console.log('Performing final scan for any remaining expandable elements...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DOM to settle
      await this.scanAndQueueElements();
      
      // Process any remaining elements found in final scan
      if (this.queue.size() > 0) {
        console.log(`Final scan found ${this.queue.size()} additional elements, processing...`);
        while (this.queue.size() > 0 && performance.now() - this.stats.startTime < maxTime) {
          const batch = this.getNextBatch();
          if (batch.length === 0) break;
          
          await this.processBatch(batch);
          this.autoExpansionStats.totalProcessed += batch.length;
          this.autoExpansionStats.lastActivityTime = performance.now();
          this.updatePersistentProgress();
          await this.yieldToBrowser();
        }
      }
      
      // Keep scroll observer running for infinite scroll content
      console.log('Main expansion complete, but scroll observer will continue monitoring for new content...');
      
      // Mark expansion as complete using state manager
      this.state.completeExpansion();
      
      // Note: accessibility announcements are now handled by state observers
      
    } catch (error) {
      // Handle expansion errors, checking if it's an expected AbortError
      if (!this.errorHandler.isExpansionAbortError(error)) {
        console.error('Error during expansion:', error);
        this.state.setStatus(ExpansionStatus.ERROR);
        this.state.addError(error, { operationName: 'expansion main loop' });
      }
    } finally {
      // Ensure we're in a terminal state if not already
      const currentStatus = this.state.getStatus();
      if (currentStatus === ExpansionStatus.EXPANDING) {
        this.state.setStatus(ExpansionStatus.COMPLETE);
      }
      
      // Clean up - accessibility restoration handled by state observers
      this.accessibility.restoreFocusAfterExpansion();
      
      // Don't remove the overlay here - it will be managed by the auto-expansion process
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
        // Debug: log each item before processing
        console.log('[Expander] Processing batch item:', item.category, item.element.outerHTML);
        // Check if we need to pause due to too many AbortErrors
        if (this.shouldPauseForAbortErrors()) {
          console.log('Pausing expansion due to frequent AbortErrors');
          await new Promise(resolve => setTimeout(resolve, 2000));
          this.resetAbortErrorCount();
        }
        // Wait for rate limiter before processing each element
        await this.rateLimiter.waitIfNeeded();
        // Debug: log before calling expandElement
        console.log('[Expander] Calling expandElement for category:', item.category);
        const success = await this.expandElement(item.element, item.category);
        // Debug: log after calling expandElement
        console.log('[Expander] expandElement result:', success, item.category, item.element.outerHTML);
        
        // Record result in state manager
        this.state.recordElementResult(item.category, success);
        
        if (success) {
          this.rateLimiter.onSuccess();
          // Mark as processed to prevent reprocessing
          item.element.dataset.redditExpanderProcessed = 'true';
        } else {
          this.rateLimiter.onFailure();
        }
        results.push({ element: item.element, success });
        // Yield to browser more frequently to prevent blocking
        await this.yieldToBrowser();
      } catch (error) {
        // Handle AbortError silently - this is expected during rapid expansion
        if (error.name === 'AbortError') {
          this.trackAbortError();
          // Record failure in state manager
          this.state.recordElementResult(item.category, false);
          this.rateLimiter.onFailure();
          results.push({ element: item.element, success: false });
          continue;
        }
        // Debug: log any other error
        console.error('[Expander] Error processing batch item:', error, item.category, item.element.outerHTML);
        
        // Record error and failure in state manager
        this.state.addError(error, { 
          operationName: 'element processing',
          category: item.category,
          element: item.element.tagName
        });
        this.state.recordElementResult(item.category, false);
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
    // Debug: log at the start of expandElement
    console.log('[Expander] expandElement called:', category, element.outerHTML);
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
        console.error(`[Expander] Error expanding ${category} element:`, error, element.outerHTML);
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
    
    // Additional safeguard: skip forbidden icons, slots, or text
    const forbiddenIconNames = [
      'upvote-outline', 'downvote-outline', 'share', 'award', 'insight', 'overflow'
    ];
    const forbiddenSlotNames = [
      'vote-button', 'comment-share', 'comment-award', 'comment-insight', 'overflow'
    ];
    const forbiddenText = [
      'upvote', 'downvote', 'share', 'award', 'insight'
    ];
    // Check for forbidden icon-names
    const hasForbiddenIcon = expandButton.querySelectorAll && Array.from(expandButton.querySelectorAll('svg[icon-name]'))
      .some(svg => forbiddenIconNames.includes(svg.getAttribute('icon-name')));
    // Check for forbidden slot names
    const slot = expandButton.getAttribute && expandButton.getAttribute('slot');
    const hasForbiddenSlot = slot && forbiddenSlotNames.includes(slot);
    // Check for forbidden text
    const text = expandButton.textContent && expandButton.textContent.toLowerCase();
    const hasForbiddenText = forbiddenText.some(word => text && text.includes(word));
    if (hasForbiddenIcon || hasForbiddenSlot || hasForbiddenText) {
      return false;
    }
    
    // Only click if the button contains any expandable icon
    const hasJoinOutline = expandButton.querySelector && expandButton.querySelector('svg[icon-name="join-outline"]');
    const hasPlus = expandButton.querySelector && expandButton.querySelector('svg[icon-name="plus"]');
    const hasPlusOutline = expandButton.querySelector && expandButton.querySelector('svg[icon-name="plus-outline"]');
    const hasExpand = expandButton.querySelector && expandButton.querySelector('svg[icon-name="expand"]');
    const hasExpandOutline = expandButton.querySelector && expandButton.querySelector('svg[icon-name="expand-outline"]');
    const hasExpandableIcon = hasJoinOutline || hasPlus || hasPlusOutline || hasExpand || hasExpandOutline;
    
    if (!hasExpandableIcon) {
      console.log('[Expander] Skipping button (no expandable icon):', expandButton.outerHTML);
      return false;
    }
    // Log before clicking
    console.log('[Expander] Attempting to click expand button:', expandButton.outerHTML);
    
    // Add a longer delay before clicking to let Reddit's components settle
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Click the expand button with targeted error handling
    try {
      // Use error handler wrapper for the click operation
      await this.errorHandler.executeWithAbortHandling(async () => {
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
      }, 'expand button click');
      
    } catch (error) {
      // Only log non-AbortError issues
      if (!this.errorHandler.isExpansionAbortError(error)) {
        console.warn('Error during button click:', error);
      }
      return false;
    }
    
    return true;
  }

  async expandMoreComments(element) {
    // Handle "load more comments" buttons/links and faceplate-partial elements
    try {
      return await this.errorHandler.executeWithAbortHandling(async () => {
        if (element.tagName === 'FACEPLATE-PARTIAL') {
          // For faceplate-partial elements (like top-level-more-comments-partial)
          const button = element.querySelector('button');
          if (button) {
            console.log('[Expander] Clicking button inside faceplate-partial:', button.outerHTML);
            button.click();
            await this.waitForExpansion(element, 4000);
            return true;
          }
          // If no button, try to trigger the partial loading directly
          if (element.click) {
            console.log('[Expander] Clicking faceplate-partial directly:', element.outerHTML);
            element.click();
            await this.waitForExpansion(element, 4000);
            return true;
          }
        } else if (element.tagName === 'A') {
          // For anchor links, check if it's a "more replies" or "more comments" link
          const href = element.href;
          const hasJoinOutline = element.querySelector('svg[icon-name="join-outline"]');
          const hasMoreRepliesText = element.textContent && element.textContent.toLowerCase().includes('more replies');
          const hasMoreCommentsSlot = element.getAttribute('slot') === 'more-comments-permalink';
          const hasPermalinkId = element.id && element.id.includes('comments-permalink');
          
          // If it's a "more replies" link (has join-outline icon or specific attributes), click it
          if (hasJoinOutline || hasMoreRepliesText || hasMoreCommentsSlot || hasPermalinkId) {
            console.log('[Expander] Clicking more replies anchor link:', element.outerHTML.substring(0, 150) + '...');
            element.click();
            await this.waitForExpansion(element, 3000);
            return true;
          }
          // For other links, use the original logic (avoid navigation)
          else if (href && !href.includes('/comment/')) {
            console.log('[Expander] Clicking general anchor link:', element.outerHTML.substring(0, 150) + '...');
            element.click();
            await this.waitForExpansion(element);
            return true;
          }
        } else if (element.tagName === 'BUTTON') {
          // Handle standalone buttons with join-outline icons
          const hasJoinOutline = element.querySelector('svg[icon-name="join-outline"]');
          
          if (hasJoinOutline) {
            console.log('[Expander] Clicking standalone button with join-outline:', element.outerHTML.substring(0, 150) + '...');
            element.click();
            await this.waitForExpansion(element, 3000);
            return true;
          } else {
            // Handle other types of buttons (like "View more comments")
            console.log('[Expander] Clicking general button:', element.outerHTML.substring(0, 150) + '...');
            element.click();
            await this.waitForExpansion(element);
            return true;
          }
        }
        return false;
      }, 'more comments expansion');
    } catch (error) {
      // Only log non-AbortError issues
      if (!this.errorHandler.isExpansionAbortError(error)) {
        console.warn('Error during more comments expansion:', error);
      }
    }
    
    return false;
  }

  async expandContinueThread(element) {
    // Handle "Continue this thread" links and faceplate-partial elements
    try {
      return await this.errorHandler.executeWithAbortHandling(async () => {
        if (element.tagName === 'FACEPLATE-PARTIAL') {
          // Check if there's a button inside the faceplate-partial
          const button = element.querySelector('button');
          if (button) {
            button.click();
            await this.waitForExpansion(element, 3000);
            return true;
          }
          // If no button, try to trigger the partial loading
          if (element.click) {
            element.click();
            await this.waitForExpansion(element, 3000);
            return true;
          }
        } else if (element.tagName === 'A' && element.href) {
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
        return false;
      }, 'continue thread expansion');
    } catch (error) {
      // Only log non-AbortError issues
      if (!this.errorHandler.isExpansionAbortError(error)) {
        console.warn('Error during continue thread expansion:', error);
      }
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
      return await this.errorHandler.executeWithAbortHandling(async () => {
        if (element.click) {
          element.click();
          await this.waitForExpansion(element);
          return true;
        }
        return false;
      }, 'generic expansion');
    } catch (error) {
      // Only log non-AbortError issues
      if (!this.errorHandler.isExpansionAbortError(error)) {
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
    // Set up mutation observer to watch for new content during expansion
    if (!this.observers.has('content')) {
      let rescanTimeout = null;
      
      const observer = new MutationObserver((mutations) => {
        // Skip if not currently expanding to avoid interference
        if (!this.isExpanding) return;
        
        let hasNewExpandableContent = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (let node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if new expandable content was added (more specific detection)
                if (node.querySelector && (
                    node.querySelector('button:has(svg[icon-name="join-outline"])') ||
                    node.querySelector('button:has(svg[icon-name="plus"])') ||
                    node.querySelector('button:has(svg[icon-name="plus-outline"])') ||
                    node.querySelector('button:has(svg[icon-name="expand"])') ||
                    node.querySelector('button:has(svg[icon-name="expand-outline"])') ||
                    node.querySelector('button:has(svg[icon-name="caret-down-outline"])') ||
                    node.querySelector('faceplate-partial[id*="more-comments"]') ||
                    // NEW: Also detect summary/details elements with expandable buttons
                    node.querySelector('summary button[rpl]') ||
                    node.querySelector('details button[rpl]') ||
                    node.querySelector('summary button.text-neutral-content-strong') ||
                    node.querySelector('details button.text-neutral-content-strong')
                )) {
                  hasNewExpandableContent = true;
                  console.log('[ContentObserver] New expandable content detected during expansion:', node.tagName, node.outerHTML.substring(0, 200) + '...');
                  break;
                }
              }
            }
          }
        });
        
        if (hasNewExpandableContent) {
          // Debounce rescanning to avoid infinite loops (reduced timeout for faster response)
          if (rescanTimeout) {
            clearTimeout(rescanTimeout);
          }
          
          rescanTimeout = setTimeout(() => {
            console.log('New expandable content detected, rescanning...');
            this.scanAndQueueElements();
            rescanTimeout = null;
          }, 500); // Reduced from 1000ms to 500ms for faster response
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      this.observers.set('content', observer);
    }
    
    // Set up persistent scroll-based observer for infinite scroll content
    this.setupScrollObserver();
  }

  setupScrollObserver() {
    if (this.observers.has('scroll')) return;
    
    let scrollTimeout = null;
    let lastScrollTime = 0;
    
    const scrollObserver = new MutationObserver((mutations) => {
      // CRITICAL: Don't process anything if we're not on a comment page
      if (!this.contentManager || !this.contentManager.isCommentPage) {
        return;
      }
      
      const now = Date.now();
      
      // Only check for new content if we haven't checked recently
      if (now - lastScrollTime < 1000) return; // Reduced from 1500ms to 1000ms for more frequent scanning
      
      let hasNewComments = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if new comment content was added (broader detection for scrolling)
              if (node.querySelector && (
                  node.querySelector('shreddit-comment') ||
                  node.querySelector('button[rpl]') ||
                  node.querySelector('svg[icon-name="join-outline"]') ||
                  node.querySelector('svg[icon-name="plus"]') ||
                  node.querySelector('svg[icon-name="plus-outline"]') ||
                  node.querySelector('svg[icon-name="expand"]') ||
                  node.querySelector('svg[icon-name="expand-outline"]') ||
                  node.querySelector('a[slot*="comments-permalink"]') ||
                  node.querySelector('summary') ||
                  node.querySelector('details') ||
                  node.matches('shreddit-comment') ||
                  node.matches('button[rpl]') ||
                  // NEW: Also detect any element that contains expandable icons
                  (node.innerHTML && (
                    node.innerHTML.includes('join-outline') ||
                    node.innerHTML.includes('plus') ||
                    node.innerHTML.includes('expand')
                  ))
              )) {
                hasNewComments = true;
                console.log('[Expander] New expandable content detected via scroll observer');
                break;
              }
            }
          }
        }
      });
      
      if (hasNewComments) {
        lastScrollTime = now;
        
        // Clear any existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        // Debounce the expansion to avoid too frequent calls
        scrollTimeout = setTimeout(() => {
          console.log('[Expander] Processing new content from scroll...');
          this.scanAndExpandNewContent();
          
          // NEW: Also do a more aggressive re-scan for missed buttons
          this.performAggressiveRescan();
        }, 500); // Reduced delay for faster response
      }
    });
    
    // Observe the entire document for changes
    scrollObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.set('scroll', scrollObserver);
    console.log('[Expander] Scroll observer set up');
  }
  
  performAggressiveRescan() {
    // This method performs a more thorough scan for buttons that might have been missed
    console.log('[Expander] Performing aggressive rescan for missed buttons...');
    
    // Look for any buttons with expandable icons that weren't processed
    const allExpandableButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
      const hasJoinOutline = btn.querySelector('svg[icon-name="join-outline"]');
      const hasPlus = btn.querySelector('svg[icon-name="plus"]');
      const hasPlusOutline = btn.querySelector('svg[icon-name="plus-outline"]');
      const hasExpand = btn.querySelector('svg[icon-name="expand"]');
      const hasExpandOutline = btn.querySelector('svg[icon-name="expand-outline"]');
      const hasExpandableIcon = hasJoinOutline || hasPlus || hasPlusOutline || hasExpand || hasExpandOutline;
      const notProcessed = !btn.dataset.redditExpanderProcessed;
      return hasExpandableIcon && notProcessed;
    });
    
    if (allExpandableButtons.length > 0) {
      console.log(`[Expander] Found ${allExpandableButtons.length} unprocessed expandable buttons during aggressive rescan`);
      
      // Process these buttons immediately
      allExpandableButtons.forEach(async (button, index) => {
        // Add a small delay to avoid overwhelming the page
        setTimeout(async () => {
          console.log(`[Expander] Processing missed button ${index + 1}/${allExpandableButtons.length}:`, button.outerHTML.substring(0, 100) + '...');
          
          // Mark as processed to avoid double-processing
          button.dataset.redditExpanderProcessed = 'true';
          
          // Click the button with targeted error handling
          await this.errorHandler.executeWithAbortHandling(async () => {
            button.click();
            await this.waitForExpansion(button, 3000);
          }, 'missed button processing').catch(error => {
            // Only log non-AbortError issues
            if (!this.errorHandler.isExpansionAbortError(error)) {
              console.log('[Expander] Error processing missed button:', error);
            }
          });
        }, index * 200); // Stagger the clicks
      });
    }
  }

  async scanAndExpandNewContent() {
    // CRITICAL: Don't process anything if we're not on a comment page
    if (!this.contentManager || !this.contentManager.isCommentPage) {
      console.log('[Expander] Skipping scan - not on a comment page');
      return;
    }
    
    // NEW: Start auto-scroll if not already active to ensure we load all content
    if (!this.autoScrollStats.isActive && !this.autoScrollStats.isComplete) {
      console.log('[Expander] Starting auto-scroll to load all content...');
      await this.startAutoScroll();
    }
    
    // Scan for new expandable elements and expand them automatically
    const newElements = this.detector.getAllExpandableElements();
    
    // Filter out already processed elements
    const unprocessedElements = newElements.filter(item => 
      !item.element.dataset.redditExpanderProcessed
    );
    
    if (unprocessedElements.length > 0) {
      console.log(`Found ${unprocessedElements.length} new expandable elements from scroll, processing...`);
      
      // Initialize or update cumulative progress tracking
      if (!this.autoExpansionStats.isActive) {
        this.autoExpansionStats.isActive = true;
        this.autoExpansionStats.sessionStartTime = performance.now();
        this.autoExpansionStats.totalProcessed = 0;
        this.autoExpansionStats.lastActivityTime = performance.now();
        
        // Create the persistent progress overlay if it doesn't exist
        if (!this.autoExpansionStats.currentOverlay) {
          // Check if there's already a progress overlay in the DOM
          const existingOverlay = document.querySelector('[data-reddit-expander-progress]');
          if (existingOverlay) {
            console.log('[Progress] Reusing existing progress overlay');
            this.autoExpansionStats.currentOverlay = existingOverlay;
          } else {
            console.log('[Progress] Creating new progress overlay');
            this.autoExpansionStats.currentOverlay = this.createPersistentProgressOverlay();
          }
        }
        
        // Update persistent progress overlay
        this.updatePersistentPhase(
          'Expanding Comments',
          `Found ${unprocessedElements.length} comments to expand...`,
          'info'
        );
      } else {
        // Update last activity time
        this.autoExpansionStats.lastActivityTime = performance.now();
        
        // Update persistent progress overlay
        this.updatePersistentPhase(
          'Expanding Comments',
          `Processing ${unprocessedElements.length} new comments...`,
          'info'
        );
      }
      
      let batchProcessed = 0;
      const batchStartTime = performance.now();
      
      // Process new elements in small batches to avoid overwhelming Reddit
      for (let i = 0; i < unprocessedElements.length; i += 2) {
        // Check if we should pause
        await this.checkPauseState();
        
        // Exit if cancelled during pause
        if (this.shouldCancel) break;
        
        const batch = unprocessedElements.slice(i, i + 2);
        
        for (const item of batch) {
          try {
            // Check pause state before each element
            await this.checkPauseState();
            if (this.shouldCancel) break;
            
            // Mark as processed first to prevent reprocessing
            item.element.dataset.redditExpanderProcessed = 'true';
            
            const success = await this.expandElement(item.element, item.category);
            if (success) {
              batchProcessed++;
              this.autoExpansionStats.totalProcessed++;
              
              // Add gentle highlight to newly expanded content
              this.highlightNewlyExpanded(item.element);
            }
            
            // Update persistent progress
            this.updatePersistentProgress();
            
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.warn('Error auto-expanding new element:', error);
            }
          }
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Show batch completion (but keep overlay for next batches)
      console.log(`Completed batch: ${batchProcessed} elements processed in ${((performance.now() - batchStartTime) / 1000).toFixed(1)}s`);
    } else if (this.autoExpansionStats.isActive) {
      // No new elements found - check if we should start quality checks
      const timeSinceLastActivity = performance.now() - this.autoExpansionStats.lastActivityTime;
      
      // If no new elements for 10 seconds, start quality checks instead of showing completion
      if (timeSinceLastActivity > 10000) {
        console.log('No new expandable elements found for 10 seconds, starting quality checks');
        
        // Update persistent progress to show we're starting quality checks
        this.updatePersistentPhase(
          'Quality Check',
          'Initial expansion complete, checking for missed comments...',
          'info'
        );
        
        // Start quality checks instead of showing completion
        this.performFinalQualityCheck();
      }
    }
    
    // NEW: Set up completion check timer if auto-expansion is active
    if (this.autoExpansionStats.isActive && !this.autoExpansionStats.completionCheckTimer) {
      this.setupAutoExpansionCompletionCheck();
    }
  }
  


  // NEW: Create persistent progress overlay that stays throughout the entire process
  createPersistentProgressOverlay() {
    console.log('[Progress] Creating persistent progress overlay...');
    
    // Remove any existing progress overlays to prevent duplicates
    const existingOverlays = document.querySelectorAll('[data-reddit-expander-progress]');
    existingOverlays.forEach(existing => {
      console.log('[Progress] Removing existing progress overlay');
      existing.remove();
    });
    
    const overlay = document.createElement('div');
    overlay.setAttribute('data-reddit-expander-progress', 'true');
    overlay.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      padding: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      pointer-events: auto;
    `;
    
    // Initial content
    overlay.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div class="persistent-spinner" style="
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #ff4500;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 12px;
        "></div>
        <span style="font-size: 16px; font-weight: 600; color: #2d3748;">
          Expanding Comments
        </span>
      </div>
      
      <div class="persistent-phase-info" style="
        background: #f8f9fa;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        border: 1px solid rgba(0, 0, 0, 0.05);
      ">
        <div style="font-size: 13px; font-weight: 600; color: #495057; margin-bottom: 4px;">
          Phase: <span class="persistent-phase-text">Initial Expansion</span>
        </div>
        <div class="persistent-detail-text" style="font-size: 12px; color: #6c757d;">
          Starting expansion process...
        </div>
      </div>
      
      <div class="persistent-progress-container" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span class="persistent-progress-text" style="font-size: 13px; color: #495057; font-weight: 500;">0 expanded</span>
          <span class="persistent-progress-time" style="font-size: 13px; color: #6c757d;">0.0s elapsed</span>
        </div>
        <div style="
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        ">
          <div class="persistent-progress-bar" style="
            height: 100%;
            background: linear-gradient(90deg, #ff4500, #ff6b35);
            border-radius: 3px;
            width: 0%;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px;">
        <button class="persistent-pause-btn" style="
          flex: 1;
          background: #ffa500;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1;
          text-transform: none;
          min-height: 44px;
        ">Pause</button>
        <button class="persistent-stop-btn" style="
          flex: 1;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1;
          text-transform: none;
          min-height: 44px;
        ">Stop</button>
      </div>
      
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    // Add event listeners
    const pauseBtn = overlay.querySelector('.persistent-pause-btn');
    const stopBtn = overlay.querySelector('.persistent-stop-btn');
    
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (this.isPaused) {
          this.resume();
        } else {
          this.pause();
        }
      });
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.stop();
      });
    }
    
    document.body.appendChild(overlay);
    console.log('[Progress] Progress overlay added to DOM');
    
    // Animate in
    setTimeout(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0) scale(1)';
      console.log('[Progress] Progress overlay animated in successfully');
    }, 100);
    
    return overlay;
  }

  // NEW: Update the persistent progress overlay
  updatePersistentProgress() {
    // Always try to find the overlay in the DOM first
    let overlay = this.autoExpansionStats.currentOverlay;
    if (!overlay) {
      overlay = document.querySelector('[data-reddit-expander-progress]');
      if (overlay) {
        console.log('[Progress] Found overlay in DOM, reconnecting reference');
        this.autoExpansionStats.currentOverlay = overlay;
      } else {
        console.log('[Progress] No current overlay found, cannot update progress');
        return;
      }
    }
    
    // Verify the overlay is still in the DOM
    if (!document.contains(overlay)) {
      console.log('[Progress] Overlay reference is stale, removing and creating new one');
      this.autoExpansionStats.currentOverlay = null;
      overlay = document.querySelector('[data-reddit-expander-progress]');
      if (!overlay) {
        console.log('[Progress] No overlay in DOM, cannot update progress');
        return;
      }
      this.autoExpansionStats.currentOverlay = overlay;
    }
    
    const totalTime = (performance.now() - this.autoExpansionStats.sessionStartTime) / 1000;
    const phaseTime = (performance.now() - this.autoExpansionStats.phaseStartTime) / 1000;
    
    // Update phase text
    const phaseText = overlay.querySelector('.persistent-phase-text');
    if (phaseText) {
      phaseText.textContent = this.autoExpansionStats.currentPhase;
    }
    
    // Update progress text
    const progressText = overlay.querySelector('.persistent-progress-text');
    if (progressText) {
      progressText.textContent = `${this.autoExpansionStats.totalProcessed} expanded`;
    }
    
    // Update time
    const progressTime = overlay.querySelector('.persistent-progress-time');
    if (progressTime) {
      const rate = this.autoExpansionStats.totalProcessed / totalTime;
      progressTime.textContent = `${totalTime.toFixed(1)}s elapsed • ${rate.toFixed(1)}/s`;
    }
    
    // Update progress bar (simple linear progress based on time)
    const progressBar = overlay.querySelector('.persistent-progress-bar');
    if (progressBar) {
      // Calculate progress based on time (assuming 5 minutes max)
      const maxTime = 300; // 5 minutes
      const progress = Math.min((totalTime / maxTime) * 100, 95); // Cap at 95% until complete
      progressBar.style.width = `${progress}%`;
    }
    
    // Update pause button text
    const pauseBtn = overlay.querySelector('.persistent-pause-btn');
    if (pauseBtn) {
      pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
      pauseBtn.style.background = this.isPaused ? '#28a745' : '#ffa500';
    }
  }

  // NEW: Update phase and detail information
  updatePersistentPhase(phase, detail, statusType = 'info') {
    // Always try to find the overlay in the DOM first
    let overlay = this.autoExpansionStats.currentOverlay;
    if (!overlay) {
      overlay = document.querySelector('[data-reddit-expander-progress]');
      if (overlay) {
        console.log('[Progress] Found overlay in DOM, reconnecting reference for phase update');
        this.autoExpansionStats.currentOverlay = overlay;
      } else {
        console.log('[Progress] No current overlay found, cannot update phase');
        return;
      }
    }
    
    // Verify the overlay is still in the DOM
    if (!document.contains(overlay)) {
      console.log('[Progress] Overlay reference is stale for phase update, removing and creating new one');
      this.autoExpansionStats.currentOverlay = null;
      overlay = document.querySelector('[data-reddit-expander-progress]');
      if (!overlay) {
        console.log('[Progress] No overlay in DOM, cannot update phase');
        return;
      }
      this.autoExpansionStats.currentOverlay = overlay;
    }
    
    this.autoExpansionStats.currentPhase = phase;
    this.autoExpansionStats.phaseStartTime = performance.now();
    
    const detailText = overlay.querySelector('.persistent-detail-text');
    
    if (detailText) {
      detailText.textContent = detail;
      
      // Update color based on status type
      const colors = {
        info: '#6c757d',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
      };
      detailText.style.color = colors[statusType] || colors.info;
    }
    
    // Update the main progress display
    this.updatePersistentProgress();
  }
  
  showAutoExpansionIndicator(count) {
    // Create a subtle notification that doesn't interfere with browsing
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 9999;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    indicator.textContent = `✨ Auto-expanded ${count} comment${count > 1 ? 's' : ''}`;
    document.body.appendChild(indicator);
    
    // Animate in
    requestAnimationFrame(() => {
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
    });
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 2000);
  }
  
  // New: Add gentle highlight to newly expanded content
  highlightNewlyExpanded(element) {
    if (!element) return;
    
    // Add a subtle green glow effect to newly expanded elements
    const originalStyle = element.style.cssText;
    
    element.style.cssText += `
      transition: box-shadow 0.3s ease;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
      border-radius: 4px;
    `;
    
    // Remove the highlight after 2 seconds
    setTimeout(() => {
      element.style.cssText = originalStyle;
    }, 2000);
  }

  // Add visual indicator for expanded elements (legacy method name for compatibility)
  addExpandedIndicator(element) {
    this.highlightNewlyExpanded(element);
  }

  // Clean up observers
  cleanup() {
    this.observers.forEach((observer, name) => {
      observer.disconnect();
      console.log(`Disconnected ${name} observer`);
    });
    this.observers.clear();
    
    // NEW: Stop auto-scroll during cleanup
    this.stopAutoScroll();
  }

  // Manually trigger expansion of new content (useful for testing or manual triggering)
  async expandNewScrollContent() {
    if (!this.isExpanding) {
      console.log('Manually triggered expansion of new scroll content...');
      await this.scanAndExpandNewContent();
    } else {
      console.log('Cannot manually expand - main expansion is still in progress');
    }
  }

  // Get expansion statistics
  getStats() {
    return {
      ...this.stats,
      isExpanding: this.isExpanding,
      queueSize: this.queue.size(),
      observersActive: Array.from(this.observers.keys())
    };
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

  // New: Pause expansion
  pause() {
    if (!this.isExpanding || this.isPaused) {
      console.log('Cannot pause: not expanding or already paused');
      return false;
    }
    
    this.isPaused = true;
    console.log('Expansion paused by user');
    this.accessibility.announceToScreenReader('Expansion paused');
    
    // Update status overlay to show paused state
    if (this.statusOverlay) {
      this.updatePausedStatus();
    }
    
    return true;
  }
  
  // New: Resume expansion
  resume() {
    if (!this.isExpanding || !this.isPaused) {
      console.log('Cannot resume: not expanding or not paused');
      return false;
    }
    
    this.isPaused = false;
    this.isResuming = true;
    console.log('Expansion resumed by user');
    this.accessibility.announceToScreenReader('Expansion resumed');
    
    // Resolve the pause promise to continue execution
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
    
    return true;
  }
  
  // New: Stop expansion completely
  stop() {
    if (!this.isExpanding) {
      console.log('Cannot stop: not expanding');
      return false;
    }
    
    this.shouldCancel = true;
    this.isPaused = false;
    console.log('Expansion stopped by user');
    this.accessibility.announceToScreenReader('Expansion stopped');
    
    // Resolve pause promise if paused
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
    
    // NEW: Stop auto-scroll
    this.stopAutoScroll();
    
    return true;
  }
  
  // New: Check if we should pause and wait
  async checkPauseState() {
    if (this.isPaused && !this.shouldCancel) {
      console.log('Expansion paused, waiting for resume...');
      
      // Create a promise that resolves when resumed
      await new Promise(resolve => {
        this.pauseResolver = resolve;
      });
      
      this.isResuming = false;
      console.log('Expansion resumed, continuing...');
    }
  }
  
  // New: Update status overlay for paused state
  updatePausedStatus() {
    if (!this.statusOverlay) return;
    
    const total = this.queue.size() + this.stats.expanded + this.stats.failed;
    const current = this.stats.expanded;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    const status = {
      message: `⏸️ Expansion paused - ${current} of ${total} (${percentage}%)`,
      progress: { current, total },
      isPaused: true
    };
    
    this.accessibility.updateStatusOverlay(this.statusOverlay, status);
  }

  cancel() {
    this.shouldCancel = true;
    this.isPaused = false; // Clear pause state when cancelling
    
    // Resolve pause promise if paused
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
    
    // NEW: Stop auto-scroll
    this.stopAutoScroll();
    
    console.log('Expansion cancelled');
    this.accessibility.announceToScreenReader('Expansion cancelled');
  }

  stopAutoExpansion() {
    if (this.autoExpansionStats.currentOverlay) {
      // Show final completion state
      const overlay = this.autoExpansionStats.currentOverlay;
      const totalTime = (performance.now() - this.autoExpansionStats.sessionStartTime) / 1000;
      
      // Update to completion state
      const progressText = overlay.querySelector('.auto-progress-text');
      const progressTime = overlay.querySelector('.auto-progress-time');
      const spinner = overlay.querySelector('.auto-spinner div');
      
      if (progressText) progressText.textContent = `${this.autoExpansionStats.totalProcessed} total expanded`;
      if (progressTime) progressTime.textContent = `${totalTime.toFixed(1)}s total session`;
      
      // Replace spinner with checkmark
      if (spinner) {
        spinner.style.animation = 'none';
        spinner.style.background = '#4CAF50';
        spinner.style.border = 'none';
        spinner.innerHTML = '<div style="color: white; font-size: 10px; line-height: 12px;">✓</div>';
      }
      
      // Fade out after showing completion
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateY(-10px) scale(0.95)';
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 300);
      }, 3000);
    }
    
    // Clear completion check timer
    if (this.autoExpansionStats.completionCheckTimer) {
      clearInterval(this.autoExpansionStats.completionCheckTimer);
      this.autoExpansionStats.completionCheckTimer = null;
    }
    
    // Reset auto-expansion stats
    this.autoExpansionStats = {
      totalProcessed: 0,
      sessionStartTime: 0,
      currentOverlay: null,
      isActive: false,
      lastActivityTime: 0,
      completionCheckTimer: null
    };
  }

  // NEW: Auto-scroll methods for comprehensive content loading
  async startAutoScroll() {
    if (this.autoScrollStats.isActive) {
      console.log('[Auto-Scroll] Already active, skipping...');
      return;
    }

    console.log('[Auto-Scroll] Starting auto-scroll to load all content...');
    
    // CRITICAL: Don't auto-scroll if we're not on a comment page
    if (!this.contentManager || !this.contentManager.isCommentPage) {
      console.log('[Auto-Scroll] Skipping auto-scroll - not on a comment page');
      return;
    }

    this.autoScrollStats.isActive = true;
    this.autoScrollStats.scrollAttempts = 0;
    this.autoScrollStats.lastScrollHeight = document.documentElement.scrollHeight;
    this.autoScrollStats.noNewContentCount = 0;
    this.autoScrollStats.isComplete = false;

    // Create the persistent progress overlay if it doesn't exist
    if (!this.autoExpansionStats.currentOverlay) {
      // Check if there's already a progress overlay in the DOM
      const existingOverlay = document.querySelector('[data-reddit-expander-progress]');
      if (existingOverlay) {
        console.log('[Progress] Reusing existing progress overlay in auto-scroll');
        this.autoExpansionStats.currentOverlay = existingOverlay;
      } else {
        console.log('[Progress] Creating new progress overlay in auto-scroll');
        this.autoExpansionStats.currentOverlay = this.createPersistentProgressOverlay();
      }
    }
    
    // Update persistent progress overlay to show auto-scroll phase
    this.updatePersistentPhase(
      'Auto-scrolling',
      'Loading all content by scrolling to bottom...',
      'info'
    );

    // Start the auto-scroll process
    this.performAutoScroll();
  }

  async performAutoScroll() {
    if (!this.autoScrollStats.isActive || this.autoScrollStats.isComplete) {
      return;
    }

    // Check if we've reached the maximum attempts
    if (this.autoScrollStats.scrollAttempts >= this.autoScrollStats.maxScrollAttempts) {
      console.log('[Auto-Scroll] Reached maximum scroll attempts, completing...');
      this.completeAutoScroll();
      return;
    }

    // Check if we've had too many consecutive scrolls with no new content
    if (this.autoScrollStats.noNewContentCount >= this.autoScrollStats.maxNoNewContentCount) {
      console.log('[Auto-Scroll] No new content detected for multiple scrolls, completing...');
      this.completeAutoScroll();
      return;
    }

    this.autoScrollStats.scrollAttempts++;
    console.log(`[Auto-Scroll] Scroll attempt ${this.autoScrollStats.scrollAttempts}/${this.autoScrollStats.maxScrollAttempts}`);

    // Scroll to the bottom of the page
    const currentScrollHeight = document.documentElement.scrollHeight;
    window.scrollTo(0, currentScrollHeight);

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, this.autoScrollStats.scrollDelay));

    // Check if new content was loaded
    const newScrollHeight = document.documentElement.scrollHeight;
    const heightDifference = newScrollHeight - this.autoScrollStats.lastScrollHeight;

    if (heightDifference > 100) { // Significant new content loaded
      console.log(`[Auto-Scroll] New content detected (height increased by ${heightDifference}px)`);
      this.autoScrollStats.lastScrollHeight = newScrollHeight;
      this.autoScrollStats.noNewContentCount = 0;

      // Update persistent progress overlay
      this.updatePersistentPhase(
        `Auto-scrolling (${this.autoScrollStats.scrollAttempts}/${this.autoScrollStats.maxScrollAttempts})`,
        'New content detected, expanding comments...',
        'success'
      );

      // Process any new expandable content that was loaded
      await this.scanAndExpandNewContent();
      
      // Continue scrolling after a longer delay to allow content to fully load
      setTimeout(() => {
        this.performAutoScroll();
      }, 3000);

    } else {
      console.log('[Auto-Scroll] No significant new content detected');
      this.autoScrollStats.noNewContentCount++;

      // Update persistent progress overlay
      this.updatePersistentPhase(
        `Auto-scrolling (${this.autoScrollStats.scrollAttempts}/${this.autoScrollStats.maxScrollAttempts})`,
        `No new content (${this.autoScrollStats.noNewContentCount}/${this.autoScrollStats.maxNoNewContentCount}) - Retrying...`,
        'warning'
      );

      // Try one more time after a longer delay
      setTimeout(() => {
        this.performAutoScroll();
      }, 4000);
    }
  }

  completeAutoScroll() {
    console.log('[Auto-Scroll] Auto-scroll completed, starting final expansion...');
    
    this.autoScrollStats.isComplete = true;
    this.autoScrollStats.isActive = false;

    // Update persistent progress overlay
    this.updatePersistentPhase(
      'Auto-scroll Complete',
      'All content loaded, performing final expansion...',
      'success'
    );

    // Perform a final comprehensive scan and expansion
    setTimeout(async () => {
      await this.scanAndExpandNewContent();
      
      // Start the quality check process
      this.setupAutoExpansionCompletionCheck();
    }, 2000);
  }

  stopAutoScroll() {
    console.log('[Auto-Scroll] Stopping auto-scroll...');
    
    this.autoScrollStats.isActive = false;
    this.autoScrollStats.isComplete = true;
    
    if (this.autoScrollStats.scrollInterval) {
      clearInterval(this.autoScrollStats.scrollInterval);
      this.autoScrollStats.scrollInterval = null;
    }
    
    // Update persistent progress overlay
    this.updatePersistentPhase(
      'Auto-scroll stopped',
      'User stopped auto-scroll process',
      'warning'
    );
    
    // Hide the progress overlay after a delay
    setTimeout(() => {
      this.hideAutoExpansionOverlay();
    }, 3000);
  }

  setupAutoExpansionCompletionCheck() {
    // Set up a timer to periodically check if auto-expansion should be considered complete
    this.autoExpansionStats.completionCheckTimer = setInterval(() => {
      if (!this.autoExpansionStats.isActive) {
        clearInterval(this.autoExpansionStats.completionCheckTimer);
        this.autoExpansionStats.completionCheckTimer = null;
        return;
      }
      
      const timeSinceLastActivity = performance.now() - this.autoExpansionStats.lastActivityTime;
      
      // If no activity for 15 seconds, do a final quality check pass
      if (timeSinceLastActivity > 15000) {
        console.log('Auto-expansion completion detected: no activity for 15 seconds');
        this.updatePersistentPhase(
          'Quality Check',
          'No new activity detected, performing final quality check...',
          'info'
        );
        this.performFinalQualityCheck();
        clearInterval(this.autoExpansionStats.completionCheckTimer);
        this.autoExpansionStats.completionCheckTimer = null;
      }
    }, 5000); // Check every 5 seconds
  }
  
  async performFinalQualityCheck() {
    console.log('🔍 [Quality Check] Starting final pass to catch any missed buttons...');
    
    // NEW: Track quality check attempts to prevent infinite loops
    if (!this.qualityCheckAttempts) {
      this.qualityCheckAttempts = 0;
    }
    this.qualityCheckAttempts++;
    
    // NEW: Prevent infinite quality check loops
    if (this.qualityCheckAttempts > 3) {
              console.log('🔍 [Quality Check] Maximum quality check attempts reached, completing expansion');
        this.updatePersistentPhase(
          'Finalizing',
          'Maximum quality check attempts reached, finalizing...',
          'info'
        );
        // Stop auto-expansion since we've reached max attempts
        this.autoExpansionStats.isActive = false;
        
        // Wait a bit more to ensure all processing is complete
        setTimeout(() => {
          if (this.isAllProcessingComplete()) {
            this.updatePersistentPhase(
              'Complete!',
              'All quality checks finished successfully',
              'success'
            );
            setTimeout(() => this.showAutoExpansionCompletion(), 2000);
          } else {
            console.log('🔍 [Quality Check] Still processing, waiting for completion...');
            // Force stop any remaining processes
            this.autoExpansionStats.isActive = false;
            if (this.autoExpansionStats.completionCheckTimer) {
              clearInterval(this.autoExpansionStats.completionCheckTimer);
              this.autoExpansionStats.completionCheckTimer = null;
            }
            // Check again in 3 seconds
            setTimeout(() => {
              if (this.isAllProcessingComplete()) {
                this.updatePersistentPhase(
                  'Complete!',
                  'All quality checks finished successfully',
                  'success'
                );
                setTimeout(() => this.showAutoExpansionCompletion(), 2000);
              } else {
                // Force completion after timeout
                this.updatePersistentPhase(
                  'Complete!',
                  'All quality checks finished successfully',
                  'success'
                );
                setTimeout(() => this.showAutoExpansionCompletion(), 2000);
              }
            }, 3000);
          }
        }, 3000);
        return;
    }
    
    // NEW: Set a timeout to prevent quality check from running too long
    const qualityCheckTimeout = setTimeout(() => {
      console.log('🔍 [Quality Check] Timeout reached, completing expansion');
      this.updatePersistentPhase(
        'Finalizing',
        'Quality check timeout reached, finalizing...',
        'info'
      );
      // Wait a bit more to ensure all processing is complete
      setTimeout(() => {
        if (this.isAllProcessingComplete()) {
          this.updatePersistentPhase(
            'Complete!',
            'Quality check timeout reached, finishing up...',
            'success'
          );
          setTimeout(() => this.showAutoExpansionCompletion(), 2000);
        } else {
          console.log('🔍 [Quality Check] Still processing after timeout, waiting...');
          // Check again in 3 seconds
          setTimeout(() => {
            if (this.isAllProcessingComplete()) {
              this.updatePersistentPhase(
                'Complete!',
                'Quality check timeout reached, finishing up...',
                'success'
              );
              setTimeout(() => this.showAutoExpansionCompletion(), 2000);
            }
          }, 3000);
        }
      }, 3000);
    }, 30000); // 30 second timeout
    
    // Get all expandable elements again to see if we missed any
    const allElements = this.detector.getAllExpandableElements();
    const missedElements = allElements.filter(item => 
      !item.element.dataset.redditExpanderProcessed
    );
    
    if (missedElements.length > 0) {
      console.log(`🔍 [Quality Check] Found ${missedElements.length} missed elements, processing them now... (attempt ${this.qualityCheckAttempts}/3)`);
      
      // Create the persistent progress overlay if it doesn't exist
      if (!this.autoExpansionStats.currentOverlay) {
        // Check if there's already a progress overlay in the DOM
        const existingOverlay = document.querySelector('[data-reddit-expander-progress]');
        if (existingOverlay) {
          console.log('[Progress] Reusing existing progress overlay in quality check');
          this.autoExpansionStats.currentOverlay = existingOverlay;
        } else {
          console.log('[Progress] Creating new progress overlay in quality check');
          this.autoExpansionStats.currentOverlay = this.createPersistentProgressOverlay();
        }
      }
      
      // Update the persistent progress overlay to show quality check phase
      this.updatePersistentPhase(
        `Quality Check (${this.qualityCheckAttempts}/3)`,
        `Found ${missedElements.length} missed elements, processing them now...`,
        'info'
      );
      
      // NEW: Track processed elements in this quality check to prevent reprocessing
      const processedInThisCheck = new Set();
      
      // Process the missed elements
      let qualityCheckProcessed = 0;
      for (const item of missedElements) {
        try {
          // NEW: Skip if already processed in this quality check
          if (processedInThisCheck.has(item.element)) {
            console.log('🔍 [Quality Check] Skipping already processed element in this check');
            continue;
          }
          
          // Mark as processed first
          item.element.dataset.redditExpanderProcessed = 'true';
          processedInThisCheck.add(item.element);
          
          const success = await this.expandElement(item.element, item.category);
          if (success) {
            qualityCheckProcessed++;
            this.autoExpansionStats.totalProcessed++;
            
            // Add highlight to newly expanded content
            this.highlightNewlyExpanded(item.element);
            
            // Update persistent progress with quality check details
            this.updatePersistentProgress();
            this.updatePersistentPhase(
              `Quality Check (${this.qualityCheckAttempts}/3)`,
              `Processed ${qualityCheckProcessed}/${missedElements.length} missed elements...`,
              'info'
            );
          }
          
          // Small delay between elements
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Error in quality check expansion:', error);
          }
        }
      }
      
      console.log(`🔍 [Quality Check] Completed - processed ${qualityCheckProcessed} additional elements`);
      
      // NEW: Clear the timeout since we're completing successfully
      clearTimeout(qualityCheckTimeout);
      
      // NEW: Only do another check if we actually processed new elements AND we haven't exceeded attempts
      if (qualityCheckProcessed > 0 && this.qualityCheckAttempts < 3) {
        console.log(`🔍 [Quality Check] Scheduling second quality check (attempt ${this.qualityCheckAttempts + 1}/3)`);
        this.updatePersistentPhase(
          'Quality Check',
          `Scheduling second quality check (${this.qualityCheckAttempts + 1}/3)...`,
          'info'
        );
        setTimeout(() => {
          this.performSecondQualityCheck();
        }, 3000);
      } else {
        console.log('🔍 [Quality Check] No more elements to process or max attempts reached, completing expansion');
        this.updatePersistentPhase(
          'Finalizing',
          'No more elements to process, finalizing...',
          'info'
        );
        // Wait a bit more to ensure all processing is complete
        setTimeout(() => {
          if (this.isAllProcessingComplete()) {
            this.updatePersistentPhase(
              'Complete!',
              'All quality checks finished successfully',
              'success'
            );
            setTimeout(() => this.showAutoExpansionCompletion(), 2000);
          } else {
            console.log('🔍 [Quality Check] Still processing, waiting for completion...');
            // Check again in 3 seconds
            setTimeout(() => {
              if (this.isAllProcessingComplete()) {
                this.updatePersistentPhase(
                  'Complete!',
                  'All quality checks finished successfully',
                  'success'
                );
                setTimeout(() => this.showAutoExpansionCompletion(), 2000);
              }
            }, 3000);
          }
        }, 3000);
      }
    } else {
      // NEW: Clear the timeout since we're completing successfully
      clearTimeout(qualityCheckTimeout);
      console.log('🔍 [Quality Check] No missed elements found - expansion is complete');
      this.updatePersistentPhase(
        'Finalizing',
        'No missed elements found, finalizing...',
        'info'
      );
      // Wait a bit more to ensure all processing is complete
      setTimeout(() => {
        if (this.isAllProcessingComplete()) {
          this.updatePersistentPhase(
            'Complete!',
            'All quality checks finished successfully',
            'success'
          );
          setTimeout(() => this.showAutoExpansionCompletion(), 2000);
        } else {
          console.log('🔍 [Quality Check] Still processing, waiting for completion...');
          // Check again in 3 seconds
          setTimeout(() => {
            if (this.isAllProcessingComplete()) {
              this.updatePersistentPhase(
                'Complete!',
                'All quality checks finished successfully',
                'success'
              );
              setTimeout(() => this.showAutoExpansionCompletion(), 2000);
            }
          }, 3000);
        }
      }, 3000);
    }
  }
  
  async performSecondQualityCheck() {
    console.log('🔍 [Final Check] Performing second quality check pass...');
    
    // Update progress to show second quality check starting
    this.updatePersistentPhase(
      'Final Quality Check',
      'Performing final quality check pass...',
      'info'
    );
    
    // NEW: Set a timeout to prevent final check from running too long
    const finalCheckTimeout = setTimeout(() => {
      console.log('🔍 [Final Check] Timeout reached, completing expansion');
      this.updatePersistentPhase(
        'Complete!',
        'Final check timeout reached, finishing up...',
        'success'
      );
      setTimeout(() => this.showAutoExpansionCompletion(), 2000);
    }, 15000); // 15 second timeout for final check
    
    // NEW: Track processed elements in this final check to prevent reprocessing
    const processedInFinalCheck = new Set();
    
    // One final check for any newly loaded content
    const allElements = this.detector.getAllExpandableElements();
    const finalMissedElements = allElements.filter(item => 
      !item.element.dataset.redditExpanderProcessed
    );
    
    if (finalMissedElements.length > 0) {
      console.log(`🔍 [Final Check] Found ${finalMissedElements.length} more missed elements`);
      
      // Update progress to show final check
      this.updatePersistentPhase(
        'Final Quality Check',
        `Found ${finalMissedElements.length} more missed elements, processing...`,
        'info'
      );
      
      // Process these final elements quickly
      for (const item of finalMissedElements) {
        try {
          // NEW: Skip if already processed in this final check
          if (processedInFinalCheck.has(item.element)) {
            console.log('🔍 [Final Check] Skipping already processed element in this check');
            continue;
          }
          
          item.element.dataset.redditExpanderProcessed = 'true';
          processedInFinalCheck.add(item.element);
          
          const success = await this.expandElement(item.element, item.category);
          if (success) {
            this.autoExpansionStats.totalProcessed++;
            this.highlightNewlyExpanded(item.element);
            
            // Update progress during final check
            this.updatePersistentProgress();
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Error in final check expansion:', error);
          }
        }
      }
    }
    
    // NEW: Clear the timeout since we're completing successfully
    clearTimeout(finalCheckTimeout);
    
    console.log('🔍 [Final Check] All quality checks completed');
    this.updatePersistentPhase(
      'Finalizing',
      'All quality checks completed, finalizing...',
      'info'
    );
    // Wait a bit more to ensure all processing is complete
    setTimeout(() => {
      if (this.isAllProcessingComplete()) {
        this.updatePersistentPhase(
          'Complete!',
          'No more missed elements found - all quality checks passed!',
          'success'
        );
        setTimeout(() => this.showAutoExpansionCompletion(), 2000);
      } else {
        console.log('🔍 [Final Check] Still processing, waiting for completion...');
        // Check again in 3 seconds
        setTimeout(() => {
          if (this.isAllProcessingComplete()) {
            this.updatePersistentPhase(
              'Complete!',
              'No more missed elements found - all quality checks passed!',
              'success'
            );
            setTimeout(() => this.showAutoExpansionCompletion(), 2000);
          }
        }, 3000);
      }
    }, 3000);
  }
  
  showAutoExpansionCompletion() {
    if (!this.autoExpansionStats.currentOverlay) return;
    
    // FINAL CHECK: Make sure all processing is truly complete before showing completion
    if (!this.isAllProcessingComplete()) {
      console.log('[Completion] Still processing, delaying completion screen...');
      // Add a timeout fallback to prevent infinite delays
      if (!this.completionTimeout) {
        this.completionTimeout = setTimeout(() => {
          console.log('[Completion] Timeout reached, forcing completion screen');
          this.completionTimeout = null;
          this.forceShowCompletion();
        }, 10000); // 10 second timeout
      }
      setTimeout(() => this.showAutoExpansionCompletion(), 2000);
      return;
    }
    
    // Clear any timeout since we're showing completion
    if (this.completionTimeout) {
      clearTimeout(this.completionTimeout);
      this.completionTimeout = null;
    }
    
    const overlay = this.autoExpansionStats.currentOverlay;
    const totalTime = (performance.now() - this.autoExpansionStats.sessionStartTime) / 1000;
    
    // Update to completion state
    this.updatePersistentPhase(
      'Complete!',
      `All phases finished successfully`,
      'success'
    );
    
    // Create polished completion UI
    overlay.innerHTML = `
      <div style="text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <div style="
            width: 24px; 
            height: 24px; 
            background: linear-gradient(135deg, #4CAF50, #45a049);
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            margin-right: 12px;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
          ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          </div>
          <span style="
            font-size: 16px; 
            font-weight: 600; 
            color: #2d3748;
            letter-spacing: -0.025em;
          ">Complete!</span>
        </div>
        
        <div style="
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          border: 1px solid rgba(0, 0, 0, 0.05);
        ">
          <div style="
            font-size: 24px; 
            font-weight: 700; 
            color: #4CAF50;
            margin-bottom: 4px;
            font-variant-numeric: tabular-nums;
          ">${this.autoExpansionStats.totalProcessed}</div>
          <div style="
            font-size: 13px; 
            color: #6c757d;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Comments Expanded</div>
        </div>
        
        <div style="
          display: flex;
          justify-content: space-between;
          margin: 12px 0;
          padding: 0 8px;
        ">
          <div style="text-align: left;">
            <div style="font-size: 11px; color: #8e9aaf; font-weight: 500;">Duration</div>
            <div style="font-size: 13px; color: #495057; font-weight: 600; font-variant-numeric: tabular-nums;">${totalTime.toFixed(1)}s</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: #8e9aaf; font-weight: 500;">Rate</div>
            <div style="font-size: 13px; color: #495057; font-weight: 600; font-variant-numeric: tabular-nums;">${(this.autoExpansionStats.totalProcessed / totalTime).toFixed(1)}/s</div>
          </div>
        </div>
        
        <button class="auto-close-btn" style="
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          margin-top: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(76, 175, 80, 0.25);
          letter-spacing: 0.025em;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          line-height: 1;
          text-transform: none;
          min-height: 48px;
        ">
          Close
        </button>
      </div>
    `;
    
    // Add proper event listeners (no CSP violations)
    const closeBtn = overlay.querySelector('.auto-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.transform = 'translateY(-1px)';
        closeBtn.style.boxShadow = '0 5px 15px rgba(76, 175, 80, 0.35)';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.transform = 'translateY(0)';
        closeBtn.style.boxShadow = '0 3px 10px rgba(76, 175, 80, 0.25)';
      });
      closeBtn.addEventListener('click', () => {
        overlay.remove();
        // Reset auto-expansion state only when user closes the completion screen
        this.autoExpansionStats.currentOverlay = null;
        this.autoExpansionStats.isActive = false;
        if (this.autoExpansionStats.completionCheckTimer) {
          clearInterval(this.autoExpansionStats.completionCheckTimer);
          this.autoExpansionStats.completionCheckTimer = null;
        }
      });
    }
    
    // Clear completion check timer
    if (this.autoExpansionStats.completionCheckTimer) {
      clearInterval(this.autoExpansionStats.completionCheckTimer);
      this.autoExpansionStats.completionCheckTimer = null;
    }
    
    // Don't reset auto-expansion state here - let the completion screen handle it
    // The overlay will be cleaned up when the user clicks close or after auto-hide
    
    // Auto-hide after 30 seconds (longer to give user time to see results)
    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          // Reset auto-expansion state after auto-hide
          this.autoExpansionStats.currentOverlay = null;
          this.autoExpansionStats.isActive = false;
          
          // Clear any remaining timers
          if (this.autoExpansionStats.completionCheckTimer) {
            clearInterval(this.autoExpansionStats.completionCheckTimer);
            this.autoExpansionStats.completionCheckTimer = null;
          }
        }, 300);
      }
    }, 30000);
  }
  
  hideAutoExpansionOverlay() {
    if (this.autoExpansionStats.currentOverlay) {
      const overlay = this.autoExpansionStats.currentOverlay;
      overlay.style.opacity = '0';
      overlay.style.transform = 'translateY(-10px) scale(0.95)';
      
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
      
      // Reset stats
      this.autoExpansionStats = {
        totalProcessed: 0,
        sessionStartTime: 0,
        currentOverlay: null,
        isActive: false,
        lastActivityTime: 0,
        completionCheckTimer: null
      };
    }
  }

  // NEW: Method to check if all processing is truly complete
  isAllProcessingComplete() {
    // Check if there are any active timers or ongoing processes
    const hasActiveCompletionTimer = this.autoExpansionStats.completionCheckTimer !== null;
    const hasActiveScrollTimer = this.autoScrollStats.scrollInterval !== null;
    const hasActiveQualityChecks = this.qualityCheckAttempts > 0 && this.qualityCheckAttempts < 3;
    
    // Check if there are any unprocessed elements
    const allElements = this.detector.getAllExpandableElements();
    const unprocessedElements = allElements.filter(item => 
      !item.element.dataset.redditExpanderProcessed
    );
    
    // Check if auto-expansion is still active
    const isAutoExpansionActive = this.autoExpansionStats.isActive;
    
    console.log('[Completion Check] Status:', {
      hasActiveCompletionTimer,
      hasActiveScrollTimer,
      hasActiveQualityChecks,
      unprocessedElementsCount: unprocessedElements.length,
      qualityCheckAttempts: this.qualityCheckAttempts,
      isAutoExpansionActive
    });
    
    // Only consider complete if no timers, no quality checks, no unprocessed elements, and auto-expansion is not active
    return !hasActiveCompletionTimer && !hasActiveScrollTimer && !hasActiveQualityChecks && unprocessedElements.length === 0 && !isAutoExpansionActive;
  }

  // NEW: Force show completion screen after timeout
  forceShowCompletion() {
    console.log('[Completion] Force showing completion screen');
    
    // Force stop all processes
    this.autoExpansionStats.isActive = false;
    if (this.autoExpansionStats.completionCheckTimer) {
      clearInterval(this.autoExpansionStats.completionCheckTimer);
      this.autoExpansionStats.completionCheckTimer = null;
    }
    if (this.autoScrollStats.scrollInterval) {
      clearInterval(this.autoScrollStats.scrollInterval);
      this.autoScrollStats.scrollInterval = null;
    }
    
    // Show completion screen
    if (this.autoExpansionStats.currentOverlay) {
      const overlay = this.autoExpansionStats.currentOverlay;
      const totalTime = (performance.now() - this.autoExpansionStats.sessionStartTime) / 1000;
      
      // Update to completion state
      this.updatePersistentPhase(
        'Complete!',
        `All phases finished successfully`,
        'success'
      );
      
      // Create polished completion UI
      overlay.innerHTML = `
        <div style="text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <div style="
              width: 24px; 
              height: 24px; 
              background: linear-gradient(135deg, #4CAF50, #45a049);
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              margin-right: 12px;
              box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
            ">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
            </div>
            <span style="
              font-size: 16px; 
              font-weight: 600; 
              color: #2d3748;
              letter-spacing: -0.025em;
            ">Complete!</span>
          </div>
          
          <div style="
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            border: 1px solid rgba(0, 0, 0, 0.05);
          ">
            <div style="
              font-size: 24px; 
              font-weight: 700; 
              color: #4CAF50;
              margin-bottom: 4px;
              font-variant-numeric: tabular-nums;
            ">${this.autoExpansionStats.totalProcessed}</div>
            <div style="
              font-size: 13px; 
              color: #6c757d;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Comments Expanded</div>
          </div>
          
          <div style="
            display: flex;
            justify-content: space-between;
            margin: 12px 0;
            padding: 0 8px;
          ">
            <div style="text-align: left;">
              <div style="font-size: 11px; color: #8e9aaf; font-weight: 500;">Duration</div>
              <div style="font-size: 13px; color: #495057; font-weight: 600; font-variant-numeric: tabular-nums;">${totalTime.toFixed(1)}s</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: #8e9aaf; font-weight: 500;">Rate</div>
              <div style="font-size: 13px; color: #495057; font-weight: 600; font-variant-numeric: tabular-nums;">${(this.autoExpansionStats.totalProcessed / totalTime).toFixed(1)}/s</div>
            </div>
          </div>
          
          <button class="auto-close-btn" style="
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 14px 28px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-top: 8px;
            transition: all 0.2s ease;
            box-shadow: 0 3px 10px rgba(76, 175, 80, 0.25);
            letter-spacing: 0.025em;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            line-height: 1;
            text-transform: none;
            min-height: 48px;
          ">
            Close
          </button>
        </div>
      `;
      
      // Add proper event listeners (no CSP violations)
      const closeBtn = overlay.querySelector('.auto-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('mouseenter', () => {
          closeBtn.style.transform = 'translateY(-1px)';
          closeBtn.style.boxShadow = '0 5px 15px rgba(76, 175, 80, 0.35)';
        });
        closeBtn.addEventListener('mouseleave', () => {
          closeBtn.style.transform = 'translateY(0)';
          closeBtn.style.boxShadow = '0 3px 10px rgba(76, 175, 80, 0.25)';
        });
        closeBtn.addEventListener('click', () => {
          overlay.remove();
          // Reset auto-expansion state only when user closes the completion screen
          this.autoExpansionStats.currentOverlay = null;
          this.autoExpansionStats.isActive = false;
          if (this.autoExpansionStats.completionCheckTimer) {
            clearInterval(this.autoExpansionStats.completionCheckTimer);
            this.autoExpansionStats.completionCheckTimer = null;
          }
        });
      }
      
      // Auto-hide after 30 seconds (longer to give user time to see results)
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.style.opacity = '0';
          overlay.style.transform = 'translateY(10px) scale(0.95)';
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
            // Reset auto-expansion state after auto-hide
            this.autoExpansionStats.currentOverlay = null;
            this.autoExpansionStats.isActive = false;
            
            // Clear any remaining timers
            if (this.autoExpansionStats.completionCheckTimer) {
              clearInterval(this.autoExpansionStats.completionCheckTimer);
              this.autoExpansionStats.completionCheckTimer = null;
            }
          }, 300);
        }
      }, 30000);
    }
  }
}

// Priority Queue implementation
// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommentExpander, PriorityQueue, AdaptiveRateLimiter, ExpansionErrorHandler };
} else {
  window.CommentExpander = CommentExpander;
  window.PriorityQueue = PriorityQueue;
  window.AdaptiveRateLimiter = AdaptiveRateLimiter;
  window.ExpansionErrorHandler = ExpansionErrorHandler;
} 