// Reddit Comment Expander Pro - Content Script
console.log('🚀 Reddit Comment Expander Pro: Content script loaded');
console.log('📍 Current URL:', window.location.href);
console.log('📄 Document ready state:', document.readyState);

// Add a visible indicator that the content script is running
window.REDDIT_EXPANDER_CONTENT_SCRIPT_LOADED = true;
console.log('✅ Content script flag set on window object');

class RedditCommentExpander {
  constructor() {
    try {
      console.log('🔧 Initializing RedditCommentExpander...');
      
      // Remove any existing upgrade prompts
      const existingPrompts = document.querySelectorAll('.reddit-expander-upgrade-prompt');
      existingPrompts.forEach(prompt => prompt.remove());
      console.log(`[Init] Removed ${existingPrompts.length} existing upgrade prompts`);
      
      // Initialize enhanced components
      this.detector = new RedditDetector();
      console.log('✅ RedditDetector initialized');
      
      this.accessibility = new AccessibilityManager();
      console.log('✅ AccessibilityManager initialized');
      
      this.expander = new CommentExpander(this.detector, this.accessibility);
      console.log('✅ CommentExpander initialized');
      
      // Set reference to this content manager in the expander
      this.expander.contentManager = this;
      
      // Set up scroll observer for infinite scroll content detection
      this.expander.setupScrollObserver();
      console.log('✅ Scroll observer for infinite scroll set up');
      
      this.featureGates = new FeatureGates();
      console.log('✅ FeatureGates initialized');
      
      // Initialize state management
      this.state = new ExpansionState({
        enablePersistence: true,
        enableLogging: true
      });
      console.log('✅ ExpansionState initialized');
      
      // Initialize error handler
      this.errorHandler = new ExpansionErrorHandler();
      console.log('✅ ExpansionErrorHandler initialized');
    
    this.isCommentPage = this.isOnCommentPage();
    this.settings = {
      showFloatingButton: true,
      enableNotifications: true,
      batchSize: 3,
      delayMs: 200,
      expandReplies: true,
      expandComments: true,
      expandDeleted: true,
      expandCrowdControl: true,
      expandContestMode: true
    };
    this.isExpanding = false;
    this.fab = null;
    this.statusOverlay = null;
    
    console.log(`Detected Reddit version: ${this.detector.version}`);
    console.log(`Is comment page: ${this.isCommentPage}`);
    
    // Always initialize navigation detection, even if not on comment page initially
    this.loadSettings().then(() => {
      this.init();
    });
    
    } catch (error) {
      console.error('❌ Error initializing RedditCommentExpander:', error);
      console.error('Stack trace:', error.stack);
    }
  }
  
  // Legacy method - now handled by RedditDetector
  detectRedditVersion() {
    return this.detector.version;
  }
  
  // Legacy compatibility properties
  get isExpanding() {
    return this.state ? this.state.getStatus() === 'expanding' : false;
  }
  
  get isPaused() {
    return this.state ? this.state.getStatus() === 'paused' : false;
  }
  
  get shouldCancel() {
    return this.state ? this.state.getStatus() === 'cancelled' : false;
  }
  
  // Legacy compatibility methods
  getStats() {
    return this.state ? this.state.getState() : {};
  }
  
  pause(reason = 'User requested') {
    if (this.expander) {
      return this.expander.pause(reason);
    }
    return false;
  }
  
  resume() {
    if (this.expander) {
      return this.expander.resume();
    }
    return false;
  }
  
  cancel() {
    if (this.expander) {
      return this.expander.cancel();
    }
    return false;
  }
  
  isOnCommentPage() {
    const pathname = window.location.pathname;
    
    // Check if we're on a single comment thread page (which we don't want to expand)
    if (pathname.includes('/comment/') && pathname.split('/').length > 5) {
      console.log('Detected single comment thread page - skipping expansion');
      return false;
    }
    
    // STRICT: Only work on actual comment pages with /comments/ in URL
    // Do NOT work on homepage, subreddit pages, or other non-comment pages
    if (pathname.includes('/comments/')) {
      console.log('Detected comment thread page - enabling expansion');
      return true;
    }
    
    // Do NOT enable on homepage or other pages, even if they have expandable-looking elements
    console.log('Not a comment page - skipping expansion for URL:', pathname);
    return false;
  }
  
  init() {
    console.log('Initializing Reddit Comment Expander');
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupExpander();
      });
    } else {
      this.setupExpander();
    }
    
    // Handle navigation in SPAs (especially new Reddit)
    this.setupNavigationDetection();
  }
  
  setupNavigationDetection() {
    // Watch for URL changes (for SPA navigation)
    let currentUrl = window.location.href;
    
    // Check for URL changes every second
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        console.log('URL changed, checking if we need to reinitialize');
        currentUrl = window.location.href;
        
        // Check if we're now on a comment page
        const wasOnCommentPage = this.isCommentPage;
        this.isCommentPage = this.isOnCommentPage();
        
        if (!wasOnCommentPage && this.isCommentPage) {
          console.log('Navigated to comment page, initializing expander');
          this.setupExpander();
        } else if (wasOnCommentPage && !this.isCommentPage) {
          console.log('Navigated away from comment page, cleaning up');
          this.cleanup();
        }
      }
    }, 1000);
    
    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      console.log('Popstate event detected');
      setTimeout(() => {
        const wasOnCommentPage = this.isCommentPage;
        this.isCommentPage = this.isOnCommentPage();
        
        if (!wasOnCommentPage && this.isCommentPage) {
          console.log('Navigated to comment page via popstate, initializing expander');
          this.setupExpander();
        } else if (wasOnCommentPage && !this.isCommentPage) {
          console.log('Navigated away from comment page via popstate, cleaning up');
          this.cleanup();
        }
      }, 100);
    });
    
    // For new Reddit, also watch for route changes
    if (this.detector.version === 'newReddit' || this.detector.version === 'shReddit') {
      // Watch for navigation events in React Router
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      const self = this;
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        setTimeout(() => {
          const wasOnCommentPage = self.isCommentPage;
          self.isCommentPage = self.isOnCommentPage();
          
          if (!wasOnCommentPage && self.isCommentPage) {
            console.log('Navigated to comment page via pushState, initializing expander');
            self.setupExpander();
          } else if (wasOnCommentPage && !self.isCommentPage) {
            console.log('Navigated away from comment page via pushState, cleaning up');
            self.cleanup();
          }
        }, 100);
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        setTimeout(() => {
          const wasOnCommentPage = self.isCommentPage;
          self.isCommentPage = self.isOnCommentPage();
          
          if (!wasOnCommentPage && self.isCommentPage) {
            console.log('Navigated to comment page via replaceState, initializing expander');
            self.setupExpander();
          } else if (wasOnCommentPage && !self.isCommentPage) {
            console.log('Navigated away from comment page via replaceState, cleaning up');
            self.cleanup();
          }
        }, 100);
      };
      
      // Also use MutationObserver to detect content changes
      this.setupContentObserver();
    }
  }
  
  setupContentObserver() {
    // Watch for significant DOM changes that might indicate navigation
    const observer = new MutationObserver((mutations) => {
      let hasSignificantChange = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if new content suggests we're on a comment page
          for (let node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Look for comment-related elements
              if (node.querySelector && (
                node.querySelector('[data-testid*="comment"]') ||
                node.querySelector('.comment') ||
                node.querySelector('.Comment') ||
                node.querySelector('shreddit-comment')
              )) {
                hasSignificantChange = true;
                break;
              }
            }
          }
        }
      });
      
      if (hasSignificantChange) {
        // Debounce the check to avoid multiple rapid calls
        clearTimeout(this.navigationCheckTimeout);
        this.navigationCheckTimeout = setTimeout(() => {
          const wasOnCommentPage = this.isCommentPage;
          this.isCommentPage = this.isOnCommentPage();
          
          if (!wasOnCommentPage && this.isCommentPage) {
            console.log('Content change detected, initializing expander');
            this.setupExpander();
          }
        }, 500);
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.contentObserver = observer;
  }
  
  setupExpander() {
    // Re-check if we should show the button, in case expandable comments loaded after initial check
    if (!this.isCommentPage) {
      this.isCommentPage = this.isOnCommentPage();
    }
    
    if (this.isCommentPage && this.settings.showFloatingButton) {
      this.createFloatingButton();
    }
    
    // NEW: If we're on a comment page, start an initial scan for expandable content
    if (this.isCommentPage && this.expander) {
      console.log('Starting initial scan for expandable content...');
      // Small delay to let the page fully load
      setTimeout(() => {
        this.expander.scanAndExpandNewContent();
      }, 1000);
    }
    
    // Set up event listeners for keyboard shortcuts
    this.setupEventListeners();
    
    // Set up message listener for settings updates
    this.setupMessageListener();
  }
  
  createFloatingButton() {
    // Remove existing button if it exists
    const existingButton = document.getElementById('reddit-comment-expander-fab');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Ensure document.body exists
    if (!document.body) {
      console.error('Document body not available');
      return;
    }
    
    // Create accessible floating button
    this.fab = this.accessibility.createAccessibleFloatingButton();
    this.fab.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: #ff4500;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 20px;
      color: white;
      transition: all 0.3s ease;
      user-select: none;
      border: none;
    `;
    
    this.fab.addEventListener('mouseenter', () => {
      this.fab.style.transform = 'scale(1.1)';
      this.fab.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
    });
    
    this.fab.addEventListener('mouseleave', () => {
      this.fab.style.transform = 'scale(1)';
      this.fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    });
    
    this.fab.addEventListener('click', () => {
      if (this.isExpanding) {
        this.showNotification('Expansion in progress...', 'warning');
        return;
      }
      this.expandAllComments();
    });
    
    // Add right-click context menu
    this.fab.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e);
    });
    
    document.body.appendChild(this.fab);
    
    // Update button with usage info for free tier
    this.updateFloatingButtonUsage();
    
    console.log('Floating action button created and added to page');
  }
  
  updateFloatingButtonUsage() {
    if (!this.fab) return;
    
    const tierInfo = this.featureGates.getTierInfo();
    
    if (tierInfo.tier === 'free') {
      const remaining = tierInfo.remainingExpansions;
      this.fab.title = `Expand All Comments (Alt+Shift+E) - ${remaining} expansions remaining today`;
      
      // Add usage indicator for free tier
      if (remaining <= 2) {
        this.fab.style.background = '#ff9800'; // Orange warning
      } else if (remaining === 0) {
        this.fab.style.background = '#f44336'; // Red for no expansions left
        this.fab.innerHTML = '🔒';
      }
    } else {
      this.fab.title = 'Expand All Comments (Alt+Shift+E) - Pro Version';
    }
  }
  
  async expandAllComments() {
    if (this.isExpanding) {
      this.showNotification('Expansion already in progress...', 'warning');
      return;
    }
    
    // Check if user can expand (daily limits for free tier)
    if (!this.featureGates.canExpand()) {
      this.featureGates.showUpgradePrompt('dailyExpansions');
      return;
    }
    
    // Check thread size limits for free tier
    const commentCount = this.detector.getAllExpandableElements().length;
    if (!this.featureGates.isThreadSizeAllowed(commentCount)) {
      this.featureGates.showUpgradePrompt('maxCommentsPerThread', `Thread has ${commentCount} comments`);
      return;
    }
    
    this.isExpanding = true;
    
    // Update floating button state
    if (this.fab) {
      this.accessibility.updateFloatingButtonAccessibility(this.fab, 'expanding');
      this.fab.innerHTML = '⏳';
      this.fab.style.background = '#FFA500';
    }
    
    console.log('Starting to expand all comments');
    this.showNotification('Starting comment expansion...', 'info');
    
    // Record expansion for usage tracking
    this.featureGates.recordExpansion();
    
    // Check feature availability for advanced options
    const expansionOptions = {
      expandDeleted: this.settings.expandDeleted && this.featureGates.isFeatureAvailable('smartFilters'),
      expandCrowdControl: this.settings.expandCrowdControl && this.featureGates.isFeatureAvailable('crowdControlHandling'),
      expandContestMode: this.settings.expandContestMode && this.featureGates.isFeatureAvailable('contestModeSupport'),
      inlineThreadContinuation: this.featureGates.isFeatureAvailable('inlineThreadContinuation'),
      respectUserPreferences: true
    };
    
    // Use enhanced expansion engine with persistent progress window
    this.expander.expandAll(expansionOptions).then(async () => {
      // Start auto-scroll to load all content on the page
      console.log('Starting auto-scroll to load all content...');
      await this.expander.startAutoScroll();
      
      this.isExpanding = false;
      
      // Update floating button state
      if (this.fab) {
        this.accessibility.updateFloatingButtonAccessibility(this.fab, 'complete');
        this.fab.innerHTML = '✓';
        this.fab.style.background = '#4CAF50';
        
        setTimeout(() => {
          this.accessibility.updateFloatingButtonAccessibility(this.fab, 'idle');
          this.fab.innerHTML = '↕️';
          this.fab.style.background = '#ff4500';
        }, 3000);
      }
      
      // Show completion notification with tier info
      const stats = this.expander.getStats();
      const tierInfo = this.featureGates.getTierInfo();
      
      let message = `Expanded ${stats.expanded} comments successfully!`;
      if (tierInfo.tier === 'free') {
        const remaining = tierInfo.remainingExpansions;
        message += ` (${remaining} expansions remaining today)`;
      }
      
      this.showNotification(message, 'success');
      
      // Update floating button usage info
      this.updateFloatingButtonUsage();
      
    }).catch((error) => {
      console.error('Expansion failed:', error);
      this.isExpanding = false;
      
      // Update floating button state
      if (this.fab) {
        this.accessibility.updateFloatingButtonAccessibility(this.fab, 'error');
        this.fab.innerHTML = '⚠️';
        this.fab.style.background = '#f44336';
        
        setTimeout(() => {
          this.accessibility.updateFloatingButtonAccessibility(this.fab, 'idle');
          this.fab.innerHTML = '↕️';
          this.fab.style.background = '#ff4500';
        }, 3000);
      }
      
      this.showNotification('Error during expansion', 'error');
    });
  }

  async expandScrollContent() {
    // Manually trigger expansion of new content loaded from scrolling
    if (this.expander) {
      console.log('Manual expansion of scroll content triggered');
      this.showNotification('Scanning for new scroll content...', 'info');
      
      try {
        await this.expander.expandNewScrollContent();
        this.showNotification('New scroll content expanded!', 'success');
      } catch (error) {
        console.error('Error expanding scroll content:', error);
        this.showNotification('Error expanding scroll content', 'error');
      }
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'showFloatingButton', 
        'enableNotifications', 
        'batchSize', 
        'delayMs',
        'expandReplies',
        'expandComments',
        'expandDeleted',
        'expandCrowdControl',
        'expandContestMode'
      ]);
      
      this.settings = {
        showFloatingButton: result.showFloatingButton !== false,
        enableNotifications: result.enableNotifications !== false,
        batchSize: result.batchSize || 3,
        delayMs: result.delayMs || 200,
        expandReplies: result.expandReplies !== false,
        expandComments: result.expandComments !== false,
        expandDeleted: result.expandDeleted !== false,
        expandCrowdControl: result.expandCrowdControl !== false,
        expandContestMode: result.expandContestMode !== false
      };
      
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  setupEventListeners() {
    // Listen for keyboard shortcut events
    document.addEventListener('redditExpander:expandAll', () => {
      this.expandAllComments();
    });
    
    document.addEventListener('redditExpander:cancel', () => {
      if (this.isExpanding) {
        this.expander.cancel();
      }
    });
    
    document.addEventListener('redditExpander:pause', () => {
      if (this.isExpanding) {
        const success = this.expander.pause();
        if (success) {
          this.showNotification('Expansion paused', 'info');
        }
      }
    });
    
    document.addEventListener('redditExpander:resume', () => {
      if (this.isExpanding) {
        const success = this.expander.resume();
        if (success) {
          this.showNotification('Expansion resumed', 'info');
        }
      }
    });
    
    document.addEventListener('redditExpander:stop', () => {
      if (this.isExpanding) {
        const success = this.expander.stop();
        if (success) {
          this.showNotification('Expansion stopped', 'warning');
        }
      }
    });
    
    document.addEventListener('redditExpander:openSettings', () => {
      // Open settings via popup or show settings dialog
      this.showSettingsDialog();
    });
    
    document.addEventListener('redditExpander:openHelp', () => {
      this.accessibility.createHelpDialog();
    });
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        console.log('Settings updated:', message.settings);
        this.settings = { ...this.settings, ...message.settings };
        
        // Update floating button visibility
        if (this.settings.showFloatingButton && !this.fab) {
          this.createFloatingButton();
        } else if (!this.settings.showFloatingButton && this.fab) {
          this.fab.remove();
          this.fab = null;
        }
      }
    });
  }
  
  showContextMenu(event) {
    // Create context menu for floating button
    const menu = document.createElement('div');
    menu.className = 'reddit-expander-context-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${event.clientY}px;
      left: ${event.clientX}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10001;
      padding: 4px 0;
    `;
    
    const tierInfo = this.featureGates.getTierInfo();
    const menuItems = [
      { text: 'Expand All Comments', action: () => this.expandAllComments() },
      { text: 'Expand New Scroll Content', action: () => this.expandScrollContent() },
      { text: 'Settings', action: () => this.showSettingsDialog() },
      { text: 'Help', action: () => this.accessibility.createHelpDialog() },
      { text: 'Cancel Expansion', action: () => this.expander.cancel() }
    ];
    
    // Add usage info for free tier
    if (tierInfo.tier === 'free') {
      const remaining = tierInfo.remainingExpansions;
      menuItems.splice(1, 0, { 
        text: `Usage: ${remaining}/5 expansions today`, 
        action: () => {},
        disabled: true 
      });
    }
    
    // Add upgrade option for free tier
    if (tierInfo.tier === 'free') {
      menuItems.push({ text: 'Upgrade to Pro', action: () => this.featureGates.openUpgradePage() });
    }
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.textContent = item.text;
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: ${item.disabled ? 'default' : 'pointer'};
        font-size: 14px;
        color: ${item.disabled ? '#999' : '#333'};
        ${item.text.includes('Upgrade') ? 'background: #f0f8ff; font-weight: 600;' : ''}
      `;
      
      if (!item.disabled) {
        menuItem.addEventListener('mouseenter', () => {
          if (!item.text.includes('Upgrade')) {
            menuItem.style.background = '#f0f0f0';
          }
        });
        menuItem.addEventListener('mouseleave', () => {
          if (!item.text.includes('Upgrade')) {
            menuItem.style.background = 'white';
          }
        });
        menuItem.addEventListener('click', () => {
          item.action();
          document.body.removeChild(menu);
        });
      }
      
      menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // Remove menu when clicking outside
    const removeMenu = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
      document.removeEventListener('click', removeMenu);
    };
    
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 100);
  }
  
  showSettingsDialog() {
    // Create a simple settings dialog
    const dialog = document.createElement('div');
    dialog.className = 'reddit-expander-settings-dialog';
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
    
    const tierInfo = this.featureGates.getTierInfo();
    const isPro = tierInfo.tier === 'pro' || tierInfo.tier === 'enterprise';
    
    dialog.innerHTML = `
      <h2>Reddit Comment Expander Settings</h2>
      ${tierInfo.tier === 'free' ? `
        <div style="background: #f0f8ff; padding: 12px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #4CAF50;">
          <strong>Free Version</strong> - ${tierInfo.remainingExpansions} expansions remaining today
          <br><small>Upgrade to Pro for unlimited expansions and advanced features</small>
        </div>
      ` : ''}
      <div style="margin: 16px 0;">
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="setting-expandDeleted" ${this.settings.expandDeleted ? 'checked' : ''} ${!isPro ? 'disabled' : ''}>
          Expand author-deleted comments
          ${!isPro ? '<span style="color: #999; font-size: 12px;"> (Pro feature)</span>' : ''}
          <br><small style="color: #666; font-size: 11px; margin-left: 20px;">Shows comments where the author deleted their account but content remains</small>
        </label>
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="setting-expandCrowdControl" ${this.settings.expandCrowdControl ? 'checked' : ''} ${!isPro ? 'disabled' : ''}>
          Expand crowd control comments
          ${!isPro ? '<span style="color: #999; font-size: 12px;"> (Pro feature)</span>' : ''}
        </label>
        <label style="display: block; margin: 8px 0;">
          <input type="checkbox" id="setting-expandContestMode" ${this.settings.expandContestMode ? 'checked' : ''} ${!isPro ? 'disabled' : ''}>
          Expand contest mode comments
          ${!isPro ? '<span style="color: 999; font-size: 12px;"> (Pro feature)</span>' : ''}
        </label>
      </div>
      <div style="text-align: right;">
        ${tierInfo.tier === 'free' ? `
          <button id="upgrade-to-pro" style="margin-right: 8px; background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
            Upgrade to Pro
          </button>
        ` : ''}
        <button id="settings-save" style="margin-right: 8px;">Save</button>
        <button id="settings-cancel">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    dialog.querySelector('#settings-save').addEventListener('click', () => {
      this.settings.expandDeleted = dialog.querySelector('#setting-expandDeleted').checked;
      this.settings.expandCrowdControl = dialog.querySelector('#setting-expandCrowdControl').checked;
      this.settings.expandContestMode = dialog.querySelector('#setting-expandContestMode').checked;
      
      // Save to storage
      chrome.storage.sync.set({
        expandDeleted: this.settings.expandDeleted,
        expandCrowdControl: this.settings.expandCrowdControl,
        expandContestMode: this.settings.expandContestMode
      });
      
      document.body.removeChild(dialog);
      this.showNotification('Settings saved', 'success');
    });
    
    dialog.querySelector('#settings-cancel').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    if (tierInfo.tier === 'free') {
      dialog.querySelector('#upgrade-to-pro').addEventListener('click', () => {
        this.featureGates.openUpgradePage();
        document.body.removeChild(dialog);
      });
    }
    
    // Close on escape
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.body.removeChild(dialog);
      }
    });
  }
  
  showNotification(message, type = 'info') {
    if (!this.settings.enableNotifications) return;
    
    // Remove existing notifications to prevent overlap
    const existingNotifications = document.querySelectorAll('.reddit-expander-notification');
    existingNotifications.forEach(notification => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
    
    const notification = document.createElement('div');
    notification.className = 'reddit-expander-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 10001;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      opacity: 1;
    `;
    
    // Set background color based on type
    switch (type) {
      case 'success':
        notification.style.background = '#4CAF50';
        break;
      case 'error':
        notification.style.background = '#f44336';
        break;
      case 'warning':
        notification.style.background = '#ff9800';
        break;
      default:
        notification.style.background = '#2196F3';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
  

  
  cleanup() {
    // Cleanup accessibility features
    if (this.accessibility) {
      this.accessibility.cleanup();
    }
    
    // Cleanup expander
    if (this.expander) {
      this.expander.cleanup();
    }
    
    // Remove floating button
    if (this.fab) {
      this.fab.remove();
      this.fab = null;
    }
    
    // Remove status overlay
    if (this.statusOverlay) {
      this.statusOverlay.remove();
      this.statusOverlay = null;
    }
    

    
    // Cleanup observers
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }
    
    if (this.navigationCheckTimeout) {
      clearTimeout(this.navigationCheckTimeout);
      this.navigationCheckTimeout = null;
    }
  }
}

// Initialize global error boundary with safety check
let globalErrorBoundary = null;

function initializeErrorBoundary() {
  if (typeof ErrorBoundary !== 'undefined') {
    try {
      globalErrorBoundary = new ErrorBoundary({
        enableUserNotifications: true,
        enableRuntimeReporting: true,
        enableConsoleLogging: true,
        maxRetryAttempts: 2,
        retryDelay: 1000
      });
      console.log('✅ Error boundary initialized');
      return true;
    } catch (error) {
      console.error('❌ Error boundary initialization failed:', error);
      return false;
    }
  } else {
    console.error('❌ ErrorBoundary class not found - check script loading order');
    return false;
  }
}

// Try to initialize error boundary
initializeErrorBoundary();

// Initialize Reddit Comment Expander with comprehensive checks
function initializeExpander() {
  try {
    console.log('🚀 Initializing Reddit Comment Expander');
    
    // Check if required classes are available with detailed logging
    const requiredClasses = {
      'ExpansionState': ExpansionState,
      'RedditDetector': RedditDetector, 
      'AccessibilityManager': AccessibilityManager,
      'CommentExpander': CommentExpander,
      'ExpansionErrorHandler': ExpansionErrorHandler
    };
    
    const missingClasses = [];
    Object.entries(requiredClasses).forEach(([name, cls]) => {
      if (typeof cls === 'undefined') {
        missingClasses.push(name);
        console.error(`❌ Missing required class: ${name}`);
      } else {
        console.log(`✅ Found required class: ${name}`);
      }
    });
    
    if (missingClasses.length > 0) {
      throw new Error(`Missing required classes: ${missingClasses.join(', ')}`);
    }
    
    // Create the main expander instance
    console.log('📦 Creating RedditCommentExpander instance...');
    const expander = new RedditCommentExpander();
    
    // Verify the expander was created properly
    if (!expander) {
      throw new Error('Failed to create RedditCommentExpander instance');
    }
    
    // Verify critical components exist on the expander
    const criticalComponents = {
      'state': 'State manager',
      'errorHandler': 'Error handler', 
      'detector': 'Reddit detector',
      'accessibility': 'Accessibility manager',
      'expander': 'Comment expander'
    };
    
    Object.entries(criticalComponents).forEach(([prop, description]) => {
      if (expander[prop]) {
        console.log(`✅ ${description} initialized`);
      } else {
        console.warn(`⚠️  ${description} missing from expander instance`);
      }
    });
    
    // Store references on window for testing and debugging
    window.redditCommentExpander = expander;
    
    // Also ensure error boundary is accessible
    if (globalErrorBoundary) {
      window.redditExpanderErrorBoundary = globalErrorBoundary;
      console.log('✅ Error boundary assigned to window');
    }
    
    // Verify window assignments worked
    if (window.redditCommentExpander === expander) {
      console.log('✅ Main expander assigned to window.redditCommentExpander');
    } else {
      console.error('❌ Failed to assign expander to window');
    }
    
    console.log('✅ Reddit Comment Expander initialized successfully');
    
    return expander;
    
  } catch (error) {
    console.error('❌ Failed to initialize Reddit Comment Expander:', error);
    console.error('Error stack:', error.stack);
    
    // Try to show user-friendly error
    if (globalErrorBoundary) {
      globalErrorBoundary.showUserFriendlyError(error, 'extension initialization');
    } else {
      // Fallback notification without error boundary
      console.error('💥 Critical initialization failure - no error boundary available');
    }
    
    throw error;
  }
}

// Wait for all required classes to be loaded
async function waitForClasses(maxWaitMs = 5000, checkIntervalMs = 100) {
  const requiredClasses = [
    'ErrorBoundary',
    'ExpansionState',
    'ExpansionStatus',
    'StateEventTypes', 
    'FeatureGates',
    'RedditDetector',
    'AccessibilityManager',
    'CommentExpander',
    'ExpansionErrorHandler',
    'PriorityQueue',
    'AdaptiveRateLimiter'
  ];
  
  const startTime = performance.now();
  
  while (performance.now() - startTime < maxWaitMs) {
    const missingClasses = requiredClasses.filter(className => 
      typeof window[className] === 'undefined'
    );
    
    if (missingClasses.length === 0) {
      console.log(`✅ All ${requiredClasses.length} classes loaded in ${Math.round(performance.now() - startTime)}ms`);
      return true;
    }
    
    console.log(`⏳ Waiting for classes: ${missingClasses.join(', ')}`);
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  const stillMissing = requiredClasses.filter(className => 
    typeof window[className] === 'undefined'
  );
  
  console.error(`❌ Timeout waiting for classes. Still missing: ${stillMissing.join(', ')}`);
  return false;
}

// Retry mechanism for initialization with class loading wait
async function initializeWithRetry(maxAttempts = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Initialization attempt ${attempt}/${maxAttempts}`);
      
      // Wait for all classes to be loaded
      const classesLoaded = await waitForClasses(attempt === 1 ? 2000 : 5000);
      if (!classesLoaded) {
        throw new Error('Required classes not loaded within timeout');
      }
      
      const expander = initializeExpander();
      console.log(`✅ Initialization succeeded on attempt ${attempt}`);
      return expander;
      
    } catch (error) {
      console.error(`❌ Initialization attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxAttempts) {
        console.error('💥 All initialization attempts failed');
        throw error;
      } else {
        console.log(`🔄 Will retry in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
}

// Main initialization orchestrator
function startInitialization() {
  console.log(`📄 Document ready state: ${document.readyState}`);
  console.log(`⏰ Initializing at: ${performance.now()}ms`);
  
  if (globalErrorBoundary) {
    globalErrorBoundary.wrap(
      () => initializeWithRetry(3, 500),
      {
        operationName: 'Reddit Comment Expander Initialization',
        retryable: true,
        maxRetries: 1, // Error boundary provides additional retry
        onError: async (error) => {
          console.error('❌ Error boundary caught initialization failure');
        },
        onRetry: async (error, attempt) => {
          console.log(`🔄 Error boundary retrying initialization (attempt ${attempt})`);
        }
      }
    ).catch(error => {
      console.error('💥 Final initialization failure with error boundary:', error);
    });
  } else {
    // Fallback initialization without error boundary
    initializeWithRetry(3, 500).catch(error => {
      console.error('💥 Direct initialization failed after retries:', error);
    });
  }
}

// Wait for DOM to be ready if needed
if (document.readyState === 'loading') {
  console.log('📄 DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', startInitialization);
} else {
  console.log('📄 DOM already ready, starting initialization immediately');
  startInitialization();
}

// Export error boundary for use by other parts of the extension
window.redditExpanderErrorBoundary = globalErrorBoundary;