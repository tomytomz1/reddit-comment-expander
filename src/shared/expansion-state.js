/**
 * Centralized State Management System for Reddit Comment Expander
 * 
 * Provides:
 * - ExpansionState class with status tracking
 * - Observer pattern for UI updates
 * - State persistence to localStorage
 * - Safe state updates with validation
 * - Progress tracking and error collection
 */

console.log('📦 Loading expansion-state.js');
window.REDDIT_EXPANDER_EXPANSION_STATE_LOADED = true;

/**
 * Expansion Status Enum
 */
const ExpansionStatus = {
  IDLE: 'idle',
  EXPANDING: 'expanding',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

/**
 * Expansion State Event Types
 */
const StateEventTypes = {
  STATUS_CHANGED: 'statusChanged',
  PROGRESS_UPDATED: 'progressUpdated',
  ERROR_ADDED: 'errorAdded',
  STATS_UPDATED: 'statsUpdated',
  STATE_RESET: 'stateReset',
  STATE_RESTORED: 'stateRestored'
};

/**
 * Central ExpansionState class for managing expansion process state
 */
class ExpansionState {
  constructor(options = {}) {
    this.options = {
      enablePersistence: options.enablePersistence !== false,
      persistenceKey: options.persistenceKey || 'reddit-expander-state',
      maxErrorHistory: options.maxErrorHistory || 50,
      enableLogging: options.enableLogging !== false,
      validateUpdates: options.validateUpdates !== false,
      ...options
    };

    // Core state properties
    this.state = this.createInitialState();
    
    // Observer pattern implementation
    this.observers = new Map();
    this.observerIdCounter = 0;
    
    // State validation schema
    this.stateSchema = this.createStateSchema();
    
    // Initialize from persistence if enabled
    if (this.options.enablePersistence) {
      this.restoreFromPersistence();
    }
    
    this.log('ExpansionState initialized', this.state);
  }

  /**
   * Create initial state structure
   */
  createInitialState() {
    return {
      // Core status
      status: ExpansionStatus.IDLE,
      previousStatus: null,
      
      // Progress tracking
      progress: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
        currentCategory: null,
        estimatedTimeRemaining: null,
        startTime: null,
        endTime: null,
        elapsedTime: 0
      },
      
      // Category breakdown
      categories: {
        collapsed: { total: 0, processed: 0, successful: 0, failed: 0 },
        moreReplies: { total: 0, processed: 0, successful: 0, failed: 0 },
        moreComments: { total: 0, processed: 0, successful: 0, failed: 0 },
        continueThread: { total: 0, processed: 0, successful: 0, failed: 0 },
        crowdControl: { total: 0, processed: 0, successful: 0, failed: 0 },
        contestMode: { total: 0, processed: 0, successful: 0, failed: 0 },
        deleted: { total: 0, processed: 0, successful: 0, failed: 0 },
        viewRest: { total: 0, processed: 0, successful: 0, failed: 0 }
      },
      
      // Error collection
      errors: [],
      lastError: null,
      
      // Configuration
      options: {},
      
      // Session info
      sessionId: this.generateSessionId(),
      url: window.location.href,
      redditVersion: null,
      
      // Timestamps
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // Pause/resume state
      pauseReason: null,
      pausedAt: null,
      resumedAt: null,
      
      // Quality metrics
      metrics: {
        averageProcessingTime: 0,
        elementsPerSecond: 0,
        retryRate: 0,
        successRate: 0
      }
    };
  }

  /**
   * Create state validation schema
   */
  createStateSchema() {
    return {
      status: {
        type: 'string',
        required: true,
        enum: Object.values(ExpansionStatus)
      },
      progress: {
        type: 'object',
        required: true,
        properties: {
          total: { type: 'number', min: 0 },
          processed: { type: 'number', min: 0 },
          successful: { type: 'number', min: 0 },
          failed: { type: 'number', min: 0 },
          percentage: { type: 'number', min: 0, max: 100 }
        }
      }
    };
  }

  /**
   * Observer pattern: Subscribe to state changes
   */
  subscribe(eventType, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    const observerId = ++this.observerIdCounter;
    const observer = {
      id: observerId,
      eventType: eventType || '*', // '*' means all events
      callback,
      options: {
        once: options.once || false,
        immediate: options.immediate || false,
        ...options
      },
      createdAt: Date.now()
    };

    if (!this.observers.has(eventType)) {
      this.observers.set(eventType, new Map());
    }
    
    this.observers.get(eventType).set(observerId, observer);

    // Call immediately with current state if requested
    if (observer.options.immediate) {
      try {
        callback(this.getState(), { type: eventType, immediate: true });
      } catch (error) {
        this.log('Error in immediate observer callback:', error);
      }
    }

    this.log(`Observer subscribed: ${eventType} (ID: ${observerId})`);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, observerId);
  }

  /**
   * Observer pattern: Unsubscribe from state changes
   */
  unsubscribe(eventType, observerId) {
    if (this.observers.has(eventType)) {
      const eventObservers = this.observers.get(eventType);
      const removed = eventObservers.delete(observerId);
      
      if (eventObservers.size === 0) {
        this.observers.delete(eventType);
      }
      
      if (removed) {
        this.log(`Observer unsubscribed: ${eventType} (ID: ${observerId})`);
      }
      
      return removed;
    }
    return false;
  }

  /**
   * Notify observers of state changes
   */
  notifyObservers(eventType, eventData = {}) {
    const event = {
      type: eventType,
      state: this.getState(),
      timestamp: Date.now(),
      ...eventData
    };

    // Notify specific event type observers
    if (this.observers.has(eventType)) {
      this.notifyEventObservers(eventType, event);
    }

    // Notify wildcard observers
    if (this.observers.has('*')) {
      this.notifyEventObservers('*', event);
    }

    this.log(`Observers notified: ${eventType}`, event);
  }

  /**
   * Helper to notify observers for a specific event type
   */
  notifyEventObservers(eventType, event) {
    const eventObservers = this.observers.get(eventType);
    const observersToRemove = [];

    eventObservers.forEach((observer, observerId) => {
      try {
        observer.callback(event.state, event);
        
        // Remove one-time observers
        if (observer.options.once) {
          observersToRemove.push(observerId);
        }
      } catch (error) {
        this.log(`Error in observer callback (${eventType}/${observerId}):`, error);
        
        // Optionally remove faulty observers
        if (observer.options.removeOnError) {
          observersToRemove.push(observerId);
        }
      }
    });

    // Clean up one-time and faulty observers
    observersToRemove.forEach(observerId => {
      eventObservers.delete(observerId);
    });
  }

  /**
   * Get current state (immutable copy)
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Get specific state property
   */
  getStatus() {
    return this.state.status;
  }

  getProgress() {
    return { ...this.state.progress };
  }

  getCategories() {
    return JSON.parse(JSON.stringify(this.state.categories));
  }

  getErrors() {
    return [...this.state.errors];
  }

  getMetrics() {
    return { ...this.state.metrics };
  }

  /**
   * Safe state updates with validation
   */
  updateState(updates, eventType = StateEventTypes.STATE_UPDATED) {
    if (this.options.validateUpdates && !this.validateStateUpdate(updates)) {
      throw new Error('Invalid state update');
    }

    const previousState = this.getState();
    
    try {
      // Apply updates
      this.applyStateUpdates(updates);
      
      // Update timestamp
      this.state.updatedAt = Date.now();
      
      // Persist if enabled
      if (this.options.enablePersistence) {
        this.persistState();
      }
      
      // Notify observers
      this.notifyObservers(eventType, {
        previousState,
        updates
      });
      
      this.log('State updated:', updates);
      
    } catch (error) {
      this.log('Error updating state:', error);
      // Rollback on error
      this.state = previousState;
      throw error;
    }
  }

  /**
   * Apply state updates with deep merge
   */
  applyStateUpdates(updates) {
    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
        // Deep merge for objects
        this.state[key] = { ...this.state[key], ...updates[key] };
      } else {
        // Direct assignment for primitives and arrays
        this.state[key] = updates[key];
      }
    });
  }

  /**
   * Validate state updates
   */
  validateStateUpdate(updates) {
    try {
      // Check required fields exist
      if (updates.hasOwnProperty('status') && !Object.values(ExpansionStatus).includes(updates.status)) {
        this.log('Invalid status in state update:', updates.status);
        return false;
      }

      // Validate progress values
      if (updates.progress) {
        const { total, processed, successful, failed } = updates.progress;
        if (total !== undefined && total < 0) return false;
        if (processed !== undefined && processed < 0) return false;
        if (successful !== undefined && successful < 0) return false;
        if (failed !== undefined && failed < 0) return false;
        if (processed !== undefined && successful !== undefined && failed !== undefined) {
          if (successful + failed > processed) return false;
        }
      }

      return true;
    } catch (error) {
      this.log('Error validating state update:', error);
      return false;
    }
  }

  /**
   * Set expansion status
   */
  setStatus(status, reason = null) {
    if (!Object.values(ExpansionStatus).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const previousStatus = this.state.status;
    
    this.updateState({
      previousStatus,
      status,
      ...(status === ExpansionStatus.PAUSED && { pauseReason: reason, pausedAt: Date.now() }),
      ...(status === ExpansionStatus.EXPANDING && previousStatus === ExpansionStatus.PAUSED && { resumedAt: Date.now() }),
      ...(status === ExpansionStatus.EXPANDING && previousStatus === ExpansionStatus.IDLE && { 
        progress: { ...this.state.progress, startTime: Date.now() }
      }),
      ...((status === ExpansionStatus.COMPLETE || status === ExpansionStatus.ERROR || status === ExpansionStatus.CANCELLED) && {
        progress: { ...this.state.progress, endTime: Date.now() }
      })
    }, StateEventTypes.STATUS_CHANGED);
  }

  /**
   * Update progress
   */
  updateProgress(progressUpdate) {
    const currentProgress = this.state.progress;
    const newProgress = { ...currentProgress, ...progressUpdate };
    
    // Calculate percentage
    if (newProgress.total > 0) {
      newProgress.percentage = Math.round((newProgress.processed / newProgress.total) * 100);
    }
    
    // Calculate elapsed time
    if (newProgress.startTime) {
      newProgress.elapsedTime = Date.now() - newProgress.startTime;
    }
    
    // Estimate time remaining
    if (newProgress.processed > 0 && newProgress.total > 0 && newProgress.elapsedTime > 0) {
      const avgTimePerItem = newProgress.elapsedTime / newProgress.processed;
      const remaining = newProgress.total - newProgress.processed;
      newProgress.estimatedTimeRemaining = Math.round(avgTimePerItem * remaining);
    }

    this.updateState({
      progress: newProgress
    }, StateEventTypes.PROGRESS_UPDATED);
  }

  /**
   * Update category progress
   */
  updateCategoryProgress(category, update) {
    if (!this.state.categories[category]) {
      this.log(`Warning: Unknown category ${category}`);
      return;
    }

    const updatedCategories = {
      ...this.state.categories,
      [category]: {
        ...this.state.categories[category],
        ...update
      }
    };

    this.updateState({
      categories: updatedCategories,
      progress: {
        ...this.state.progress,
        currentCategory: category
      }
    }, StateEventTypes.PROGRESS_UPDATED);
  }

  /**
   * Add error to collection
   */
  addError(error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      error: {
        name: error.name || 'UnknownError',
        message: error.message || 'Unknown error occurred',
        stack: error.stack
      },
      context,
      timestamp: Date.now(),
      sessionId: this.state.sessionId
    };

    const updatedErrors = [...this.state.errors, errorEntry];
    
    // Limit error history
    if (updatedErrors.length > this.options.maxErrorHistory) {
      updatedErrors.splice(0, updatedErrors.length - this.options.maxErrorHistory);
    }

    this.updateState({
      errors: updatedErrors,
      lastError: errorEntry
    }, StateEventTypes.ERROR_ADDED);
  }

  /**
   * Update metrics
   */
  updateMetrics(metricsUpdate) {
    const updatedMetrics = {
      ...this.state.metrics,
      ...metricsUpdate
    };

    // Calculate derived metrics
    const { successful, failed, processed } = this.state.progress;
    if (processed > 0) {
      updatedMetrics.successRate = Math.round((successful / processed) * 100);
      updatedMetrics.retryRate = Math.round((failed / processed) * 100);
    }

    if (this.state.progress.elapsedTime > 0 && processed > 0) {
      updatedMetrics.elementsPerSecond = processed / (this.state.progress.elapsedTime / 1000);
      updatedMetrics.averageProcessingTime = this.state.progress.elapsedTime / processed;
    }

    this.updateState({
      metrics: updatedMetrics
    }, StateEventTypes.STATS_UPDATED);
  }

  /**
   * Initialize expansion with elements
   */
  initializeExpansion(elements, options = {}) {
    const categorizedElements = this.categorizeElements(elements);
    const totalElements = elements.length;

    // Reset state for new expansion
    const initialState = {
      status: ExpansionStatus.EXPANDING,
      progress: {
        total: totalElements,
        processed: 0,
        successful: 0,
        failed: 0,
        percentage: 0,
        currentCategory: null,
        estimatedTimeRemaining: null,
        startTime: Date.now(),
        endTime: null,
        elapsedTime: 0
      },
      categories: categorizedElements,
      errors: [],
      lastError: null,
      options: options,
      sessionId: this.generateSessionId(),
      url: window.location.href,
      metrics: {
        averageProcessingTime: 0,
        elementsPerSecond: 0,
        retryRate: 0,
        successRate: 0
      }
    };

    this.updateState(initialState, StateEventTypes.STATUS_CHANGED);
  }

  /**
   * Categorize elements for progress tracking
   */
  categorizeElements(elements) {
    const categories = {
      collapsed: { total: 0, processed: 0, successful: 0, failed: 0 },
      moreReplies: { total: 0, processed: 0, successful: 0, failed: 0 },
      moreComments: { total: 0, processed: 0, successful: 0, failed: 0 },
      continueThread: { total: 0, processed: 0, successful: 0, failed: 0 },
      crowdControl: { total: 0, processed: 0, successful: 0, failed: 0 },
      contestMode: { total: 0, processed: 0, successful: 0, failed: 0 },
      deleted: { total: 0, processed: 0, successful: 0, failed: 0 },
      viewRest: { total: 0, processed: 0, successful: 0, failed: 0 }
    };

    elements.forEach(elementData => {
      const category = elementData.category || 'collapsed';
      if (categories[category]) {
        categories[category].total++;
      }
    });

    return categories;
  }

  /**
   * Record element processing result
   */
  recordElementResult(category, success, error = null) {
    const categories = { ...this.state.categories };
    const progress = { ...this.state.progress };

    if (categories[category]) {
      categories[category].processed++;
      if (success) {
        categories[category].successful++;
        progress.successful++;
      } else {
        categories[category].failed++;
        progress.failed++;
        
        if (error) {
          this.addError(error, { category, element: 'processing' });
        }
      }
    }

    progress.processed++;

    this.updateState({
      categories,
      progress
    }, StateEventTypes.PROGRESS_UPDATED);
  }

  /**
   * Complete expansion
   */
  completeExpansion(finalStats = {}) {
    this.updateState({
      status: ExpansionStatus.COMPLETE,
      progress: {
        ...this.state.progress,
        endTime: Date.now(),
        ...finalStats
      }
    }, StateEventTypes.STATUS_CHANGED);
  }

  /**
   * Reset state to initial values
   */
  reset() {
    const initialState = this.createInitialState();
    this.state = initialState;
    
    if (this.options.enablePersistence) {
      this.persistState();
    }
    
    this.notifyObservers(StateEventTypes.STATE_RESET);
    this.log('State reset to initial values');
  }

  /**
   * State persistence to localStorage
   */
  persistState() {
    if (!this.options.enablePersistence) return;

    try {
      const stateToSave = {
        ...this.state,
        // Don't persist observers or large error stacks
        errors: this.state.errors.map(error => ({
          ...error,
          error: {
            name: error.error.name,
            message: error.error.message
            // Exclude stack trace for storage efficiency
          }
        }))
      };

      localStorage.setItem(this.options.persistenceKey, JSON.stringify(stateToSave));
      this.log('State persisted to localStorage');
    } catch (error) {
      this.log('Error persisting state:', error);
    }
  }

  /**
   * Restore state from localStorage
   */
  restoreFromPersistence() {
    if (!this.options.enablePersistence) return;

    try {
      const saved = localStorage.getItem(this.options.persistenceKey);
      if (saved) {
        const parsedState = JSON.parse(saved);
        
        // Validate and merge with current state
        if (this.isValidPersistedState(parsedState)) {
          this.state = { ...this.state, ...parsedState };
          this.notifyObservers(StateEventTypes.STATE_RESTORED);
          this.log('State restored from localStorage');
        } else {
          this.log('Invalid persisted state, using defaults');
        }
      }
    } catch (error) {
      this.log('Error restoring state from persistence:', error);
    }
  }

  /**
   * Validate persisted state structure
   */
  isValidPersistedState(state) {
    return state && 
           typeof state === 'object' && 
           state.status && 
           Object.values(ExpansionStatus).includes(state.status) &&
           state.progress &&
           typeof state.progress === 'object';
  }

  /**
   * Clear persisted state
   */
  clearPersistedState() {
    if (!this.options.enablePersistence) return;

    try {
      localStorage.removeItem(this.options.persistenceKey);
      this.log('Persisted state cleared');
    } catch (error) {
      this.log('Error clearing persisted state:', error);
    }
  }

  /**
   * Get state summary for debugging
   */
  getStateSummary() {
    return {
      status: this.state.status,
      progress: `${this.state.progress.processed}/${this.state.progress.total} (${this.state.progress.percentage}%)`,
      errors: this.state.errors.length,
      elapsedTime: this.state.progress.elapsedTime,
      sessionId: this.state.sessionId
    };
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging utility
   */
  log(message, data = null) {
    if (!this.options.enableLogging) return;

    if (data) {
      console.log(`[ExpansionState] ${message}`, data);
    } else {
      console.log(`[ExpansionState] ${message}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all observers
    this.observers.clear();
    
    // Clear persisted state if needed
    if (this.options.clearOnDestroy) {
      this.clearPersistedState();
    }
    
    this.log('ExpansionState destroyed');
  }
}

// Export constants and class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExpansionState, ExpansionStatus, StateEventTypes };
} else {
  window.ExpansionState = ExpansionState;
  window.ExpansionStatus = ExpansionStatus;
  window.StateEventTypes = StateEventTypes;
}

// Force global exposure for testing  
console.log('🔧 [ExpansionState] Attempting to expose globally...');
try {
  if (typeof window !== 'undefined') {
    window.ExpansionState = ExpansionState;
    window.expansionState = new ExpansionState();
    console.log('✅ [ExpansionState] Successfully exposed to window.ExpansionState and window.expansionState');
    console.log('🔍 [ExpansionState] Instance status:', window.expansionState.getState().status);
  } else {
    console.error('❌ [ExpansionState] Window object not available');
  }
} catch (error) {
  console.error('❌ [ExpansionState] Failed to expose globally:', error);
}