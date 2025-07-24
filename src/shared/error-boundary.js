/**
 * Central Error Boundary System for Reddit Comment Expander
 * 
 * Provides comprehensive error handling with:
 * - Contextual error logging
 * - User-friendly error messages
 * - Error recovery strategies
 * - Runtime error reporting
 */

console.log('📦 Loading error-boundary.js');
window.REDDIT_EXPANDER_ERROR_BOUNDARY_LOADED = true;

class ErrorBoundary {
  constructor(options = {}) {
    this.options = {
      enableUserNotifications: options.enableUserNotifications !== false,
      enableRuntimeReporting: options.enableRuntimeReporting !== false,
      enableConsoleLogging: options.enableConsoleLogging !== false,
      maxRetryAttempts: options.maxRetryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    this.errorStats = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByContext: new Map(),
      lastErrorTime: null,
      errorHistory: []
    };
    
    this.setupGlobalErrorHandlers();
  }

  /**
   * Main error wrapper function - catches and handles errors with context
   */
  async wrap(operation, context = {}) {
    const {
      operationName = 'Unknown Operation',
      retryable = true,
      maxRetries = this.options.maxRetryAttempts,
      onError = null,
      onRetry = null,
      onSuccess = null,
      suppressUserNotification = false
    } = context;

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();
        
        if (onSuccess) {
          await this.safeCall(onSuccess, result);
        }
        
        // Log successful retry if applicable
        if (attempt > 0) {
          this.logInfo(`${operationName} succeeded after ${attempt} retries`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Log the error with context
        this.logError(error, {
          operationName,
          attempt,
          maxRetries,
          ...context
        });
        
        // Update error statistics
        this.updateErrorStats(error, operationName);

        // If this is the last attempt or error is not retryable
        if (attempt > maxRetries || !retryable || !this.isRetryableError(error)) {
          // Handle final error
          await this.handleFinalError(error, {
            operationName,
            attempt,
            suppressUserNotification,
            onError
          });
          
          throw error;
        }
        
        // Prepare for retry
        if (onRetry) {
          await this.safeCall(onRetry, error, attempt);
        }
        
        this.logInfo(`Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries + 1})`);
        await this.delay(this.options.retryDelay * attempt);
      }
    }
  }

  /**
   * Synchronous error wrapper for non-async operations
   */
  wrapSync(operation, context = {}) {
    const {
      operationName = 'Unknown Sync Operation',
      onError = null,
      suppressUserNotification = false
    } = context;

    try {
      return operation();
    } catch (error) {
      this.logError(error, { operationName, ...context });
      this.updateErrorStats(error, operationName);
      
      if (onError) {
        this.safeCall(onError, error);
      }
      
      if (!suppressUserNotification) {
        this.showUserFriendlyError(error, operationName);
      }
      
      this.reportToRuntime(error, { operationName, ...context });
      throw error;
    }
  }

  /**
   * Safe function call wrapper that won't throw
   */
  async safeCall(fn, ...args) {
    try {
      return await fn(...args);
    } catch (error) {
      this.logError(error, { operationName: 'Safe Call', suppressAll: true });
    }
  }

  /**
   * Determine if an error is retryable
   */
  isRetryableError(error) {
    if (!error) return false;

    // Network-related errors are usually retryable
    if (error.name === 'NetworkError' || 
        error.name === 'TimeoutError' ||
        error.message?.includes('fetch') ||
        error.message?.includes('network')) {
      return true;
    }

    // DOM-related errors might be retryable if elements are still loading
    if (error.name === 'TypeError' && 
        (error.message?.includes('null') || 
         error.message?.includes('undefined'))) {
      return true;
    }

    // Rate limiting errors
    if (error.message?.includes('rate limit') || 
        error.message?.includes('too many requests')) {
      return true;
    }

    // AbortErrors are generally not retryable (they're intentional)
    if (error.name === 'AbortError') {
      return false;
    }

    // Syntax errors and type errors in code are not retryable
    if (error.name === 'SyntaxError' || 
        error.name === 'ReferenceError') {
      return false;
    }

    // Default to not retryable for safety
    return false;
  }

  /**
   * Handle final error after all retries exhausted
   */
  async handleFinalError(error, context) {
    const { operationName, attempt, suppressUserNotification, onError } = context;

    if (onError) {
      await this.safeCall(onError, error);
    }

    if (!suppressUserNotification) {
      this.showUserFriendlyError(error, operationName);
    }

    this.reportToRuntime(error, { 
      operationName, 
      finalAttempt: attempt,
      ...context 
    });
  }

  /**
   * Show user-friendly error messages
   */
  showUserFriendlyError(error, operationName = 'operation') {
    if (!this.options.enableUserNotifications) return;

    const message = this.getUserFriendlyMessage(error, operationName);
    const severity = this.getErrorSeverity(error);
    
    this.showNotification(message, severity);
  }

  /**
   * Get user-friendly error message based on error type
   */
  getUserFriendlyMessage(error, operationName) {
    const errorType = error.name || 'UnknownError';
    const errorMessage = error.message || 'An unknown error occurred';

    // Network-related errors
    if (errorType === 'NetworkError' || errorMessage.includes('fetch')) {
      return `Connection issue while ${operationName}. Please check your internet connection and try again.`;
    }

    // Reddit-specific errors
    if (errorMessage.includes('reddit') || errorMessage.includes('Reddit')) {
      return `Reddit encountered an issue during ${operationName}. This is usually temporary - please try again in a moment.`;
    }

    // DOM/Element errors
    if (errorType === 'TypeError' && errorMessage.includes('null')) {
      return `Page elements not fully loaded during ${operationName}. Please wait for the page to finish loading and try again.`;
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return `Permission denied during ${operationName}. Please refresh the page and try again.`;
    }

    // Rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return `Rate limited during ${operationName}. Please wait a moment before trying again.`;
    }

    // Extension-specific errors
    if (errorMessage.includes('extension') || errorMessage.includes('chrome')) {
      return `Extension error during ${operationName}. Try reloading the extension or page.`;
    }

    // Timeout errors
    if (errorType === 'TimeoutError' || errorMessage.includes('timeout')) {
      return `Operation timed out during ${operationName}. The page may be loading slowly - please try again.`;
    }

    // AbortError - usually not shown to user as it's intentional
    if (errorType === 'AbortError') {
      return null; // Don't show to user
    }

    // Generic fallback
    return `An error occurred during ${operationName}. Please try refreshing the page.`;
  }

  /**
   * Determine error severity for UI display
   */
  getErrorSeverity(error) {
    const errorType = error.name || 'UnknownError';
    const errorMessage = error.message || '';

    // Critical errors
    if (errorType === 'SecurityError' || 
        errorMessage.includes('security') ||
        errorMessage.includes('permission denied')) {
      return 'critical';
    }

    // High severity
    if (errorType === 'ReferenceError' || 
        errorType === 'SyntaxError' ||
        errorMessage.includes('extension')) {
      return 'high';
    }

    // Low severity (expected/recoverable)
    if (errorType === 'AbortError' || 
        errorType === 'TimeoutError' ||
        errorMessage.includes('rate limit')) {
      return 'low';
    }

    // Default to medium
    return 'medium';
  }

  /**
   * Show notification to user
   */
  showNotification(message, severity = 'medium') {
    if (!message) return;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `reddit-expander-error-notification severity-${severity}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 350px;
      padding: 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 10002;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      cursor: pointer;
    `;

    // Set background color based on severity
    const colors = {
      low: '#2196F3',      // Blue
      medium: '#ff9800',   // Orange  
      high: '#f44336',     // Red
      critical: '#9c27b0'  // Purple
    };
    notification.style.background = colors[severity] || colors.medium;

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 16px;">⚠️</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">Reddit Comment Expander</div>
          <div>${message}</div>
        </div>
        <div style="cursor: pointer; font-size: 18px; line-height: 1;">&times;</div>
      </div>
    `;

    // Auto-remove and click-to-dismiss
    const remove = () => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
      }
    };

    notification.addEventListener('click', remove);
    setTimeout(remove, severity === 'critical' ? 10000 : 5000);

    document.body.appendChild(notification);
  }

  /**
   * Log error with context
   */
  logError(error, context = {}) {
    if (!this.options.enableConsoleLogging) return;

    const { operationName, suppressAll } = context;
    
    if (suppressAll) {
      return; // Completely suppress logging
    }

    const errorInfo = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    console.group(`🔴 Error in ${operationName || 'Unknown Operation'}`);
    console.error('Error details:', error);
    console.log('Context:', context);
    console.log('Full error info:', errorInfo);
    console.groupEnd();
  }

  /**
   * Log informational messages
   */
  logInfo(message, context = {}) {
    if (!this.options.enableConsoleLogging) return;
    console.log(`ℹ️ [ErrorBoundary] ${message}`, context);
  }

  /**
   * Update error statistics
   */
  updateErrorStats(error, operationName) {
    this.errorStats.totalErrors++;
    this.errorStats.lastErrorTime = Date.now();

    // Track by error type
    const errorType = error.name || 'UnknownError';
    this.errorStats.errorsByType.set(
      errorType, 
      (this.errorStats.errorsByType.get(errorType) || 0) + 1
    );

    // Track by operation context
    this.errorStats.errorsByContext.set(
      operationName, 
      (this.errorStats.errorsByContext.get(operationName) || 0) + 1
    );

    // Keep error history (last 50 errors)
    this.errorStats.errorHistory.unshift({
      error: {
        name: error.name,
        message: error.message
      },
      operationName,
      timestamp: Date.now()
    });

    if (this.errorStats.errorHistory.length > 50) {
      this.errorStats.errorHistory = this.errorStats.errorHistory.slice(0, 50);
    }
  }

  /**
   * Report errors to chrome.runtime for logging
   */
  reportToRuntime(error, context = {}) {
    if (!this.options.enableRuntimeReporting) return;

    try {
      chrome.runtime.sendMessage({
        type: 'ERROR_BOUNDARY_REPORT',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context,
        timestamp: Date.now(),
        url: window.location.href,
        stats: {
          totalErrors: this.errorStats.totalErrors,
          errorsByType: Object.fromEntries(this.errorStats.errorsByType),
          errorsByContext: Object.fromEntries(this.errorStats.errorsByContext)
        }
      }).catch(runtimeError => {
        // Background script might not be available - fail silently
        console.debug('Failed to report error to runtime:', runtimeError);
      });
    } catch (runtimeError) {
      // Chrome APIs might not be available - fail silently
      console.debug('Chrome runtime not available for error reporting');
    }
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.wrap(() => {
        throw event.error;
      }, {
        operationName: 'Global Error Handler',
        suppressUserNotification: true, // Don't show UI for global errors
        retryable: false
      }).catch(() => {
        // Error already handled by wrap
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      // Only handle if it's not an AbortError (which is handled elsewhere)
      if (event.reason && event.reason.name !== 'AbortError') {
        this.wrap(() => {
          throw event.reason;
        }, {
          operationName: 'Unhandled Promise Rejection',
          suppressUserNotification: true,
          retryable: false
        }).catch(() => {
          // Error already handled by wrap
        });
      }
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      errorsByType: Object.fromEntries(this.errorStats.errorsByType),
      errorsByContext: Object.fromEntries(this.errorStats.errorsByContext)
    };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByContext: new Map(),
      lastErrorTime: null,
      errorHistory: []
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a recovery strategy for common operations
   */
  createRecoveryStrategy(strategyName) {
    const strategies = {
      'dom-element-not-found': async () => {
        // Wait for DOM to be ready
        if (document.readyState !== 'complete') {
          await new Promise(resolve => {
            if (document.readyState === 'complete') {
              resolve();
            } else {
              window.addEventListener('load', resolve, { once: true });
            }
          });
        }
        // Additional delay for dynamic content
        await this.delay(1000);
      },

      'reddit-rate-limit': async () => {
        // Exponential backoff for rate limiting
        const backoffTime = Math.min(5000 * Math.pow(2, this.errorStats.totalErrors), 30000);
        await this.delay(backoffTime);
      },

      'extension-context-lost': async () => {
        // Try to re-establish extension context
        try {
          await chrome.runtime.sendMessage({ type: 'PING' });
        } catch (error) {
          // Extension context might be lost - suggest page reload
          this.showNotification(
            'Extension needs to be reloaded. Please refresh the page.',
            'high'
          );
          throw new Error('Extension context lost');
        }
      }
    };

    return strategies[strategyName] || (() => Promise.resolve());
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorBoundary;
} else {
  window.ErrorBoundary = ErrorBoundary;
}