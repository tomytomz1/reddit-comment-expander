// Enhanced Accessibility Features for Reddit Comment Expander
class AccessibilityManager {
  constructor() {
    this.liveRegion = null;
    this.focusManager = null;
    this.keyboardNav = null;
    this.setupAccessibility();
  }

  setupAccessibility() {
    this.createLiveRegion();
    this.setupFocusManager();
    this.setupKeyboardNavigation();
    this.announceToScreenReader('Reddit Comment Expander loaded. Press Alt+Shift+E to expand all comments.');
  }

  createLiveRegion() {
    // Create live region for screen reader announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'reddit-expander-sr-only';
    this.liveRegion.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.liveRegion);
  }

  announceToScreenReader(message, priority = 'polite') {
    if (!this.liveRegion) return;

    // Change aria-live based on priority
    this.liveRegion.setAttribute('aria-live', priority);
    
    // Clear previous message
    this.liveRegion.textContent = '';
    
    // Set new message
    setTimeout(() => {
      this.liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        this.liveRegion.textContent = '';
      }, 1000);
    }, 100);
  }

  setupFocusManager() {
    this.focusManager = {
      lastFocusedElement: null,
      saveFocus() {
        this.lastFocusedElement = document.activeElement;
      },
      restoreFocus() {
        if (this.lastFocusedElement && this.lastFocusedElement.focus) {
          this.lastFocusedElement.focus();
        }
      },
      focusElement(element) {
        if (element && element.focus) {
          element.focus();
        }
      }
    };
  }

  setupKeyboardNavigation() {
    this.keyboardNav = {
      isEnabled: true,
      shortcuts: {
        'Alt+Shift+E': 'expandAll',
        'Alt+Shift+C': 'cancelExpansion',
        'Alt+Shift+S': 'toggleSettings',
        'Alt+Shift+H': 'toggleHelp',
        'Escape': 'cancelOperation'
      }
    };

    // Add keyboard event listener
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
    });
  }

  handleKeyboardShortcut(event) {
    if (!this.keyboardNav.isEnabled) return;

    const key = this.getKeyCombo(event);
    const action = this.keyboardNav.shortcuts[key];

    if (action) {
      event.preventDefault();
      event.stopPropagation();
      this.executeKeyboardAction(action);
    }
  }

  getKeyCombo(event) {
    const modifiers = [];
    if (event.altKey) modifiers.push('Alt');
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Meta');

    const key = event.key.toUpperCase();
    return [...modifiers, key].join('+');
  }

  executeKeyboardAction(action) {
    switch (action) {
      case 'expandAll':
        this.announceToScreenReader('Starting comment expansion');
        // Trigger expansion via custom event
        document.dispatchEvent(new CustomEvent('redditExpander:expandAll'));
        break;
      case 'cancelExpansion':
        this.announceToScreenReader('Cancelling expansion');
        document.dispatchEvent(new CustomEvent('redditExpander:cancel'));
        break;
      case 'toggleSettings':
        this.announceToScreenReader('Opening settings');
        document.dispatchEvent(new CustomEvent('redditExpander:openSettings'));
        break;
      case 'toggleHelp':
        this.announceToScreenReader('Opening help');
        document.dispatchEvent(new CustomEvent('redditExpander:openHelp'));
        break;
      case 'cancelOperation':
        this.announceToScreenReader('Operation cancelled');
        document.dispatchEvent(new CustomEvent('redditExpander:cancel'));
        break;
    }
  }

  // Enhanced ARIA labels for expansion elements
  addAriaLabels(element, category, count) {
    if (!element) return;

    const labels = {
      moreComments: `Load ${count} more comments`,
      moreReplies: `Load ${count} more replies`,
      continueThread: 'Continue this thread',
      collapsed: 'Expand collapsed comment',
      crowdControl: 'Expand crowd control hidden comment',
      contestMode: 'Expand contest mode hidden comment',
      deleted: 'Show deleted comment',
      viewRest: 'View the rest of the comments'
    };

    const label = labels[category] || 'Expand element';
    
    // Add or update ARIA attributes
    element.setAttribute('aria-label', label);
    element.setAttribute('aria-expanded', 'false');
    element.setAttribute('role', 'button');
    
    // Add data attribute for tracking
    element.setAttribute('data-reddit-expander-category', category);
  }

  // Update ARIA labels after expansion
  updateAriaLabels(element, expanded = true) {
    if (!element) return;

    element.setAttribute('aria-expanded', expanded.toString());
    
    if (expanded) {
      const category = element.getAttribute('data-reddit-expander-category');
      const expandedLabels = {
        moreComments: 'More comments loaded',
        moreReplies: 'More replies loaded',
        continueThread: 'Thread continued',
        collapsed: 'Comment expanded',
        crowdControl: 'Crowd control comment expanded',
        contestMode: 'Contest mode comment expanded',
        deleted: 'Deleted comment shown',
        viewRest: 'Rest of comments loaded'
      };
      
      const label = expandedLabels[category] || 'Element expanded';
      element.setAttribute('aria-label', label);
    }
  }

  // Announce expansion progress
  announceProgress(current, total, category) {
    const percentage = Math.round((current / total) * 100);
    const message = `Expanding ${category}: ${current} of ${total} (${percentage}%)`;
    this.announceToScreenReader(message, 'polite');
  }

  // Announce completion
  announceCompletion(stats) {
    const { expanded, failed, categories } = stats;
    let message = `Expansion complete. ${expanded} elements expanded.`;
    
    if (failed > 0) {
      message += ` ${failed} elements failed to expand.`;
    }
    
    if (categories && Object.keys(categories).length > 0) {
      const categoryBreakdown = Object.entries(categories)
        .filter(([_, count]) => count > 0)
        .map(([category, count]) => `${count} ${category}`)
        .join(', ');
      message += ` Breakdown: ${categoryBreakdown}.`;
    }
    
    this.announceToScreenReader(message, 'assertive');
  }

  // Announce errors
  announceError(error, context) {
    const message = `Error during expansion: ${error}. Context: ${context}`;
    this.announceToScreenReader(message, 'assertive');
  }

  // Handle focus during expansion
  manageFocusDuringExpansion() {
    // Save current focus
    this.focusManager.saveFocus();
    
    // Announce that focus will be managed
    this.announceToScreenReader('Managing focus during expansion. Press Escape to cancel.');
  }

  // Restore focus after expansion
  restoreFocusAfterExpansion() {
    // Restore previous focus
    this.focusManager.restoreFocus();
    
    // Announce focus restoration
    this.announceToScreenReader('Focus restored. Expansion complete.');
  }

  // Create accessible status overlay
  createAccessibleStatusOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'reddit-expander-status-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-atomic', 'true');
    overlay.className = 'reddit-expander-status-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(overlay);
    return overlay;
  }

  // Update status overlay with accessible content
  updateStatusOverlay(overlay, status) {
    if (!overlay) return;

    const { message, progress, category, timeRemaining } = status;
    
    let content = `<div class="status-message">${message}</div>`;
    
    if (progress) {
      const { current, total } = progress;
      const percentage = Math.round((current / total) * 100);
      content += `
        <div class="status-progress" role="progressbar" aria-valuenow="${current}" aria-valuemin="0" aria-valuemax="${total}">
          <div class="progress-bar" style="width: ${percentage}%"></div>
          <span class="progress-text">${current} of ${total} (${percentage}%)</span>
        </div>
      `;
    }
    
    if (category) {
      content += `<div class="status-category">Category: ${category}</div>`;
    }
    
    if (timeRemaining) {
      content += `<div class="status-time">Estimated time: ${timeRemaining}</div>`;
    }
    
    overlay.innerHTML = content;
    
    // Announce to screen reader
    this.announceToScreenReader(message);
  }

  // Create accessible floating action button
  createAccessibleFloatingButton() {
    const button = document.createElement('button');
    button.id = 'reddit-expander-fab';
    button.setAttribute('aria-label', 'Expand all Reddit comments');
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.innerHTML = '↕️';
    button.title = 'Expand All Comments (Alt+Shift+E)';
    
    // Add keyboard event listeners
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
    
    return button;
  }

  // Update floating button accessibility
  updateFloatingButtonAccessibility(button, state) {
    if (!button) return;

    const states = {
      idle: {
        'aria-label': 'Expand all Reddit comments',
        'aria-pressed': 'false',
        title: 'Expand All Comments (Alt+Shift+E)'
      },
      expanding: {
        'aria-label': 'Expanding comments in progress',
        'aria-pressed': 'true',
        title: 'Expansion in progress...'
      },
      complete: {
        'aria-label': 'Comments expanded successfully',
        'aria-pressed': 'false',
        title: 'Comments expanded successfully'
      },
      error: {
        'aria-label': 'Error during expansion',
        'aria-pressed': 'false',
        title: 'Error during expansion'
      }
    };

    const buttonState = states[state] || states.idle;
    
    Object.entries(buttonState).forEach(([attr, value]) => {
      button.setAttribute(attr, value);
    });
  }

  // Create accessible help dialog
  createHelpDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'reddit-expander-help';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-labelledby', 'help-title');
    dialog.setAttribute('aria-describedby', 'help-content');
    dialog.className = 'reddit-expander-help-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      z-index: 10001;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    dialog.innerHTML = `
      <h2 id="help-title">Reddit Comment Expander Help</h2>
      <div id="help-content">
        <h3>Keyboard Shortcuts</h3>
        <ul>
          <li><strong>Alt+Shift+E:</strong> Expand all comments</li>
          <li><strong>Alt+Shift+C:</strong> Cancel expansion</li>
          <li><strong>Alt+Shift+S:</strong> Open settings</li>
          <li><strong>Alt+Shift+H:</strong> Show this help</li>
          <li><strong>Escape:</strong> Cancel current operation</li>
        </ul>
        
        <h3>Features</h3>
        <ul>
          <li>Expand collapsed comments</li>
          <li>Load more comments and replies</li>
          <li>Continue thread discussions</li>
          <li>Handle crowd control and contest mode</li>
          <li>Screen reader compatible</li>
        </ul>
        
        <h3>Accessibility</h3>
        <p>This extension is designed to work with screen readers and keyboard navigation. All operations are announced to assistive technology.</p>
      </div>
      <button id="help-close" aria-label="Close help dialog">Close</button>
    `;
    
    // Add close functionality
    const closeButton = dialog.querySelector('#help-close');
    closeButton.addEventListener('click', () => {
      dialog.remove();
      this.announceToScreenReader('Help dialog closed');
    });
    
    // Add escape key to close
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        dialog.remove();
        this.announceToScreenReader('Help dialog closed');
      }
    });
    
    document.body.appendChild(dialog);
    
    // Focus the close button
    closeButton.focus();
    
    this.announceToScreenReader('Help dialog opened. Press Escape or click Close to exit.');
    
    return dialog;
  }

  // Cleanup accessibility features
  cleanup() {
    if (this.liveRegion) {
      this.liveRegion.remove();
      this.liveRegion = null;
    }
    
    // Remove help dialog if open
    const helpDialog = document.getElementById('reddit-expander-help');
    if (helpDialog) {
      helpDialog.remove();
    }
    
    // Remove status overlay if exists
    const statusOverlay = document.getElementById('reddit-expander-status-overlay');
    if (statusOverlay) {
      statusOverlay.remove();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityManager;
} else {
  window.AccessibilityManager = AccessibilityManager;
} 