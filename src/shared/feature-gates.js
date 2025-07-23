// Feature Gating System for Reddit Comment Expander
class FeatureGates {
  constructor() {
    this.userTier = 'free'; // free, pro, enterprise
    this.usageStats = {
      dailyExpansions: 0,
      lastResetDate: null,
      totalExpansions: 0,
      lastExpansionDate: null
    };
    this.featureLimits = {
      free: {
        dailyExpansions: 5,
        maxCommentsPerThread: 5000,
        autoExpand: false,
        advancedFilters: false,
        exportFeatures: false,
        cloudSync: false,
        customThemes: false,
        detailedStats: false,
        priorityQueue: false,
        backgroundPreloading: false,
        regexFiltering: false,
        commentSearch: false,
        expansionTemplates: false,
        webhooks: false,
        apiAccess: false,
        multiTabOperations: false,
        scheduledExpansion: false,
        subredditRules: false,
        expansionHistory: false,
        customShortcuts: false,
        draggableOverlay: false,
        realTimeProgress: false,
        categoryBreakdown: false,
        performanceMetrics: false,
        advancedAccessibility: false,
        textToSpeechOptimization: false,
        customReadingOrder: false,
        announcementCustomization: false,
        skipNavigation: false,
        inlineThreadContinuation: false,
        crowdControlHandling: false,
        contestModeSupport: false,
        smartFilters: false,
        batchProcessing: false
      },
      pro: {
        dailyExpansions: -1, // unlimited
        maxCommentsPerThread: -1, // unlimited
        autoExpand: true,
        advancedFilters: true,
        exportFeatures: true,
        cloudSync: true,
        customThemes: true,
        detailedStats: true,
        priorityQueue: true,
        backgroundPreloading: true,
        regexFiltering: true,
        commentSearch: true,
        expansionTemplates: true,
        webhooks: true,
        apiAccess: true,
        multiTabOperations: true,
        scheduledExpansion: true,
        subredditRules: true,
        expansionHistory: true,
        customShortcuts: true,
        draggableOverlay: true,
        realTimeProgress: true,
        categoryBreakdown: true,
        performanceMetrics: true,
        advancedAccessibility: true,
        textToSpeechOptimization: true,
        customReadingOrder: true,
        announcementCustomization: true,
        skipNavigation: true,
        inlineThreadContinuation: true,
        crowdControlHandling: true,
        contestModeSupport: true,
        smartFilters: true,
        batchProcessing: true
      },
      enterprise: {
        // All pro features plus enterprise features
        dailyExpansions: -1, // unlimited
        maxCommentsPerThread: -1, // unlimited
        autoExpand: true,
        advancedFilters: true,
        exportFeatures: true,
        cloudSync: true,
        customThemes: true,
        detailedStats: true,
        priorityQueue: true,
        backgroundPreloading: true,
        regexFiltering: true,
        commentSearch: true,
        expansionTemplates: true,
        webhooks: true,
        apiAccess: true,
        multiTabOperations: true,
        scheduledExpansion: true,
        subredditRules: true,
        expansionHistory: true,
        customShortcuts: true,
        draggableOverlay: true,
        realTimeProgress: true,
        categoryBreakdown: true,
        performanceMetrics: true,
        advancedAccessibility: true,
        textToSpeechOptimization: true,
        customReadingOrder: true,
        announcementCustomization: true,
        skipNavigation: true,
        inlineThreadContinuation: true,
        crowdControlHandling: true,
        contestModeSupport: true,
        smartFilters: true,
        batchProcessing: true,
        // Enterprise-specific features
        centralizedManagement: true,
        usageAnalytics: true,
        prioritySupport: true,
        customFeatureRequests: true,
        whiteLabelOptions: true,
        samlSsoIntegration: true
      }
    };
    
    this.init();
  }

  async init() {
    await this.loadUserTier();
    await this.loadUsageStats();
    this.checkDailyReset();
  }

  async loadUserTier() {
    try {
      const result = await chrome.storage.sync.get(['userTier', 'licenseKey']);
      this.userTier = result.userTier || 'free';
      
      // Validate license key if present
      if (result.licenseKey) {
        const isValid = await this.validateLicense(result.licenseKey);
        if (!isValid) {
          this.userTier = 'free';
          await chrome.storage.sync.remove(['licenseKey']);
        }
      }
    } catch (error) {
      console.error('Error loading user tier:', error);
      this.userTier = 'free';
    }
  }

  async loadUsageStats() {
    try {
      const result = await chrome.storage.local.get(['usageStats']);
      if (result.usageStats) {
        this.usageStats = { ...this.usageStats, ...result.usageStats };
      }
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  }

  async saveUsageStats() {
    try {
      await chrome.storage.local.set({ usageStats: this.usageStats });
    } catch (error) {
      console.error('Error saving usage stats:', error);
    }
  }

  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.usageStats.lastResetDate !== today) {
      this.usageStats.dailyExpansions = 0;
      this.usageStats.lastResetDate = today;
      this.saveUsageStats();
    }
  }

  // Check if a feature is available for current user tier
  isFeatureAvailable(featureName) {
    const limits = this.featureLimits[this.userTier];
    if (!limits) {
      console.warn(`Unknown user tier: ${this.userTier}`);
      return false;
    }

    const isAvailable = limits[featureName];
    
    // Special handling for usage-based limits
    if (featureName === 'dailyExpansions') {
      return limits.dailyExpansions === -1 || this.usageStats.dailyExpansions < limits.dailyExpansions;
    }

    return isAvailable === true;
  }

  // Check if expansion is allowed (considers daily limits)
  canExpand() {
    if (this.userTier === 'pro' || this.userTier === 'enterprise') {
      return true; // Unlimited for paid tiers
    }

    this.checkDailyReset();
    return this.usageStats.dailyExpansions < this.featureLimits.free.dailyExpansions;
  }

  // Record an expansion
  recordExpansion() {
    this.usageStats.dailyExpansions++;
    this.usageStats.totalExpansions++;
    this.usageStats.lastExpansionDate = new Date().toISOString();
    this.saveUsageStats();
  }

  // Get remaining expansions for free tier
  getRemainingExpansions() {
    if (this.userTier === 'pro' || this.userTier === 'enterprise') {
      return -1; // Unlimited
    }

    this.checkDailyReset();
    const limit = this.featureLimits.free.dailyExpansions;
    return Math.max(0, limit - this.usageStats.dailyExpansions);
  }

  // Get feature limits for current tier
  getFeatureLimits() {
    return this.featureLimits[this.userTier] || this.featureLimits.free;
  }

  // Check if thread size is within limits
  isThreadSizeAllowed(commentCount) {
    const limits = this.getFeatureLimits();
    return limits.maxCommentsPerThread === -1 || commentCount <= limits.maxCommentsPerThread;
  }

  // Show upgrade prompt for restricted features
  showUpgradePrompt(featureName, context = '') {
    const message = this.getUpgradeMessage(featureName, context);
    
    // Create upgrade prompt
    const prompt = document.createElement('div');
    prompt.className = 'reddit-expander-upgrade-prompt premium';
    prompt.innerHTML = `
      <div class="premium-upgrade-popup">
        <div class="premium-upgrade-header">
          <span class="premium-crown">👑</span>
          <h3>Upgrade to Pro</h3>
        </div>
        <p class="premium-upgrade-message">${message}</p>
        <div class="premium-upgrade-actions">
          <button id="upgrade-now" class="premium-upgrade-btn">Upgrade Now</button>
          <button id="upgrade-later" class="premium-later-btn">Maybe Later</button>
        </div>
        <p class="premium-upgrade-footer">Free trial available &bull; Cancel anytime</p>
      </div>
    `;
    document.body.appendChild(prompt);
    
    // Add event listeners
    prompt.querySelector('#upgrade-now').addEventListener('click', () => {
      this.openUpgradePage();
      document.body.removeChild(prompt);
    });
    prompt.querySelector('#upgrade-later').addEventListener('click', () => {
      document.body.removeChild(prompt);
    });
    prompt.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        document.body.removeChild(prompt);
      }
    });
    setTimeout(() => {
      prompt.querySelector('#upgrade-now').focus();
    }, 100);
  }

  getUpgradeMessage(featureName, context = '') {
    const messages = {
      dailyExpansions: 'You\'ve reached your daily expansion limit. Upgrade to Pro for unlimited expansions.',
      maxCommentsPerThread: 'This thread is too large for the free version. Upgrade to Pro to handle threads of any size.',
      autoExpand: 'Auto-expand on page load is a Pro feature. Upgrade to enable automatic expansion.',
      advancedFilters: 'Advanced filtering options are available in Pro. Upgrade to filter by karma, user, and more.',
      exportFeatures: 'Export features are available in Pro. Upgrade to save threads as Markdown, PDF, or HTML.',
      cloudSync: 'Cloud sync is a Pro feature. Upgrade to sync your settings across devices.',
      customThemes: 'Custom themes are available in Pro. Upgrade to personalize your experience.',
      detailedStats: 'Detailed statistics are available in Pro. Upgrade to see comprehensive expansion metrics.',
      priorityQueue: 'Priority queue customization is a Pro feature. Upgrade to optimize expansion order.',
      backgroundPreloading: 'Background preloading is a Pro feature. Upgrade for faster expansion.',
      regexFiltering: 'Regex-based filtering is a Pro feature. Upgrade for advanced comment filtering.',
      commentSearch: 'Comment search and highlight is a Pro feature. Upgrade to find specific content.',
      expansionTemplates: 'Expansion templates are a Pro feature. Upgrade to save and reuse expansion settings.',
      webhooks: 'Webhook integration is a Pro feature. Upgrade for automation capabilities.',
      apiAccess: 'API access is a Pro feature. Upgrade for programmatic access.',
      multiTabOperations: 'Multi-tab operations are a Pro feature. Upgrade to expand across multiple tabs.',
      scheduledExpansion: 'Scheduled expansion is a Pro feature. Upgrade for automated expansion.',
      subredditRules: 'Subreddit-specific rules are a Pro feature. Upgrade for customized behavior.',
      expansionHistory: 'Expansion history is a Pro feature. Upgrade to track your expansion activity.',
      customShortcuts: 'Custom keyboard shortcuts are a Pro feature. Upgrade to personalize your workflow.',
      draggableOverlay: 'Draggable status overlay is a Pro feature. Upgrade for customizable UI.',
      realTimeProgress: 'Real-time progress with ETA is a Pro feature. Upgrade for detailed progress tracking.',
      categoryBreakdown: 'Category breakdown display is a Pro feature. Upgrade for detailed expansion stats.',
      performanceMetrics: 'Performance metrics are a Pro feature. Upgrade to monitor expansion performance.',
      advancedAccessibility: 'Advanced accessibility features are available in Pro. Upgrade for enhanced screen reader support.',
      textToSpeechOptimization: 'Text-to-speech optimization is a Pro feature. Upgrade for better TTS integration.',
      customReadingOrder: 'Custom reading order is a Pro feature. Upgrade to personalize content flow.',
      announcementCustomization: 'Announcement customization is a Pro feature. Upgrade to customize screen reader announcements.',
      skipNavigation: 'Skip navigation links are a Pro feature. Upgrade for enhanced accessibility.',
      inlineThreadContinuation: 'Inline thread continuation is a Pro feature. Upgrade to load content without navigation.',
      crowdControlHandling: 'Crowd Control handling is a Pro feature. Upgrade to expand moderated comments.',
      contestModeSupport: 'Contest Mode support is a Pro feature. Upgrade to expand contest threads.',
      smartFilters: 'Smart expansion filters are a Pro feature. Upgrade for intelligent comment filtering.',
      batchProcessing: 'Batch processing for large threads is a Pro feature. Upgrade to handle massive threads.'
    };
    
    return messages[featureName] || 'This feature is available in Pro. Upgrade to unlock all features.';
  }

  openUpgradePage() {
    // Open upgrade page in new tab
    chrome.tabs.create({
      url: 'https://reddit-comment-expander.com/upgrade'
    });
  }

  async validateLicense(licenseKey) {
    // This would validate the license with the backend
    // For now, we'll use a simple check
    try {
      const response = await fetch('https://api.reddit-comment-expander.com/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.valid;
      }
    } catch (error) {
      console.error('License validation error:', error);
    }
    
    return false;
  }

  // Get current tier info
  getTierInfo() {
    return {
      tier: this.userTier,
      remainingExpansions: this.getRemainingExpansions(),
      totalExpansions: this.usageStats.totalExpansions,
      features: this.getFeatureLimits()
    };
  }

  // Check if user is on free trial
  isOnFreeTrial() {
    // This would check trial status from backend
    return false;
  }

  // Get trial days remaining
  getTrialDaysRemaining() {
    // This would calculate trial days from backend
    return 0;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeatureGates;
} else {
  window.FeatureGates = FeatureGates;
} 