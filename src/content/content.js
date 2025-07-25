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
    // Remove the problematic property assignment since isExpanding is a getter
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
    
    // Update state to indicate expansion is starting
    if (this.state) {
      this.state.updateStatus('expanding');
    }
    
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
      
      // Update state to indicate expansion is complete
      if (this.state) {
        this.state.updateStatus('idle');
      }
      
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
      // Update state to indicate expansion failed
      if (this.state) {
        this.state.updateStatus('idle');
      }
      
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

// Bulletproof Error Boundary Initialization System
class ErrorBoundaryManager {
  constructor() {
    this.maxWaitTime = 10000; // 10 seconds max wait
    this.checkInterval = 50; // Check every 50ms
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.errorBoundary = null;
    this.initializationPromise = null;
  }

  async ensureErrorBoundary() {
    if (this.errorBoundary) {
      return this.errorBoundary;
    }

    // Try multiple strategies to get the error boundary
    const strategies = [
      () => this.waitForGlobalErrorBoundary(),
      () => this.createFallbackErrorBoundary(),
      () => this.createMinimalErrorBoundary()
    ];

    for (const strategy of strategies) {
      try {
        this.errorBoundary = await strategy();
        if (this.errorBoundary) {
          console.log('✅ Error boundary established via strategy');
          return this.errorBoundary;
        }
      } catch (error) {
        console.warn('Strategy failed, trying next...', error.message);
      }
    }

    throw new Error('All error boundary strategies failed');
  }

  async waitForGlobalErrorBoundary() {
    const startTime = performance.now();
    
    while (performance.now() - startTime < this.maxWaitTime) {
      // Check for the global instance first
      if (window.redditExpanderErrorBoundary && typeof window.redditExpanderErrorBoundary.wrap === 'function') {
        console.log('✅ Found global error boundary instance');
        return window.redditExpanderErrorBoundary;
      }
      
      // Check for the class definition
      if (window.ErrorBoundary && typeof window.ErrorBoundary === 'function') {
        console.log('✅ Found ErrorBoundary class, creating instance');
        const instance = new window.ErrorBoundary();
        window.redditExpanderErrorBoundary = instance;
        return instance;
      }
      
      // Check for the class in the global scope
      if (typeof ErrorBoundary !== 'undefined' && typeof ErrorBoundary === 'function') {
        console.log('✅ Found ErrorBoundary in global scope, creating instance');
        const instance = new ErrorBoundary();
        window.redditExpanderErrorBoundary = instance;
        return instance;
      }
      
      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
    }
    
    throw new Error('Global error boundary not found within timeout');
  }

  createFallbackErrorBoundary() {
    console.log('🔄 Creating fallback error boundary...');
    
    // Create a minimal but functional error boundary
    const fallbackBoundary = {
      wrap: (fn, context = 'unknown') => {
        try {
          return fn();
        } catch (error) {
          console.error(`[Fallback ErrorBoundary] Error in ${context}:`, error);
          this.reportError(error, context);
          throw error;
        }
      },
      
      reportError: (error, context) => {
        console.error(`[Fallback ErrorBoundary] Error in ${context}:`, error);
        // Send to background script if available
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'ERROR_BOUNDARY_REPORT',
            error: {
              message: error.message,
              stack: error.stack,
              context: context,
              timestamp: Date.now()
            }
          }).catch(() => {
            // Ignore messaging errors
          });
        }
      },
      
      showUserFriendlyError: (error, context) => {
        console.error(`[Fallback ErrorBoundary] User-friendly error for ${context}:`, error.message);
        // Create a simple notification
        this.showNotification(`Extension error: ${error.message}`, 'error');
      },
      
      showNotification: (message, type = 'info') => {
        const notification = document.createElement('div');
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
          background: ${type === 'error' ? '#f44336' : '#2196F3'};
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      }
    };
    
    // Store globally for consistency
    window.redditExpanderErrorBoundary = fallbackBoundary;
    return fallbackBoundary;
  }

  createMinimalErrorBoundary() {
    console.log('🔄 Creating minimal error boundary...');
    
    // Absolute minimal error boundary - just basic error catching
    const minimalBoundary = {
      wrap: (fn, context = 'unknown') => {
        try {
          return fn();
        } catch (error) {
          console.error(`[Minimal ErrorBoundary] Critical error in ${context}:`, error);
          return null;
        }
      }
    };
    
    window.redditExpanderErrorBoundary = minimalBoundary;
    return minimalBoundary;
  }
}

// Global error boundary manager
const errorBoundaryManager = new ErrorBoundaryManager();

// Bulletproof initialization function
async function bulletproofInitialization() {
  try {
    console.log('🛡️ Starting bulletproof initialization...');
    
    // Step 1: Ensure error boundary is available
    const errorBoundary = await errorBoundaryManager.ensureErrorBoundary();
    console.log('✅ Error boundary secured');
    
    // Step 2: Wait for all required classes with timeout
    const requiredClasses = [
      'ExpansionState',
      'RedditDetector', 
      'AccessibilityManager',
      'CommentExpander',
      'ExpansionErrorHandler',
      'FeatureGates'
    ];
    
    const classWaitStart = performance.now();
    const classWaitTimeout = 5000; // 5 seconds
    
    while (performance.now() - classWaitStart < classWaitTimeout) {
      const missingClasses = requiredClasses.filter(className => 
        typeof window[className] === 'undefined'
      );
      
      if (missingClasses.length === 0) {
        console.log('✅ All required classes loaded');
        break;
      }
      
      console.log(`⏳ Waiting for classes: ${missingClasses.join(', ')}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 3: Initialize with error boundary protection
    return errorBoundary.wrap(() => {
      console.log('🚀 Creating RedditCommentExpander with error boundary protection');
      const expander = new RedditCommentExpander();
      
      // Verify critical components
      const criticalChecks = [
        { prop: 'state', name: 'State Manager' },
        { prop: 'errorHandler', name: 'Error Handler' },
        { prop: 'detector', name: 'Reddit Detector' },
        { prop: 'accessibility', name: 'Accessibility Manager' },
        { prop: 'expander', name: 'Comment Expander' }
      ];
      
      criticalChecks.forEach(check => {
        if (expander[check.prop]) {
          console.log(`✅ ${check.name} initialized`);
        } else {
          console.warn(`⚠️ ${check.name} missing from expander`);
        }
      });
      
      // Store globally for testing with multiple access points
      window.redditCommentExpander = expander;
      window.redditExpander = expander; // Alternative name
      window.RedditCommentExpander = expander; // Class name
      
      // Make it non-configurable to prevent accidental deletion
      try {
        Object.defineProperty(window, 'redditCommentExpander', {
          value: expander,
          writable: false,
          configurable: false
        });
      } catch (e) {
        console.warn('Could not make extension non-configurable:', e);
      }
      
      console.log('✅ RedditCommentExpander created and stored globally');
      console.log('🔍 Global extension object:', typeof window.redditCommentExpander);
      console.log('🔍 Extension methods available:', Object.getOwnPropertyNames(window.redditCommentExpander));
      console.log('🔍 Available global names: redditCommentExpander, redditExpander, RedditCommentExpander');
      
      return expander;
    }, 'main-initialization');
    
  } catch (error) {
    console.error('💥 Bulletproof initialization failed:', error);
    
    // Last resort: try to create expander without error boundary
    try {
      console.log('🔄 Attempting fallback initialization without error boundary...');
      const expander = new RedditCommentExpander();
      window.redditCommentExpander = expander;
      window.redditExpander = expander;
      window.RedditCommentExpander = expander;
      console.log('✅ Fallback initialization succeeded');
      console.log('🔍 Fallback extension object:', typeof window.redditCommentExpander);
      return expander;
    } catch (fallbackError) {
      console.error('💥 Even fallback initialization failed:', fallbackError);
      throw fallbackError;
    }
  }
}

// Main initialization entry point
function startBulletproofInitialization() {
  console.log('🛡️ Starting bulletproof initialization system...');
  
  // Start the bulletproof initialization
  bulletproofInitialization()
    .then(expander => {
      console.log('🎉 Bulletproof initialization completed successfully');
    })
    .catch(error => {
      console.error('💥 Bulletproof initialization completely failed:', error);
      
      // Show user-friendly error message
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #f44336;
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 400px;
        text-align: center;
      `;
      errorDiv.innerHTML = `
        <h3>Extension Initialization Failed</h3>
        <p>The Reddit Comment Expander failed to initialize properly.</p>
        <p>Please refresh the page and try again.</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: white; color: #f44336; border: none; border-radius: 4px; cursor: pointer;">
          Refresh Page
        </button>
      `;
      document.body.appendChild(errorDiv);
    });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  console.log('📄 DOM loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', startBulletproofInitialization);
} else {
  console.log('📄 DOM ready, starting bulletproof initialization immediately');
  startBulletproofInitialization();
}