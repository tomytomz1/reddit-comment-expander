console.log('Reddit Comment Expander Pro: Popup script loaded');

class PopupController {
  constructor() {
    this.expandBtn = document.getElementById('expandAllBtn');
    this.status = document.getElementById('status');
    this.statusText = document.querySelector('.status-text');
    
    // Settings elements
    this.showFloatingButton = document.getElementById('showFloatingButton');
    this.enableNotifications = document.getElementById('enableNotifications');
    this.batchSize = document.getElementById('batchSize');
    this.delayMs = document.getElementById('delayMs');
    this.expandReplies = document.getElementById('expandReplies');
    this.expandComments = document.getElementById('expandComments');
    this.expandDeleted = document.getElementById('expandDeleted');
    this.expandCrowdControl = document.getElementById('expandCrowdControl');
    this.expandContestMode = document.getElementById('expandContestMode');
    this.viewLogsBtn = document.getElementById('viewLogs');
    
    // Upgrade elements
    this.usageInfo = document.getElementById('usage-info');
    this.upgradeSection = document.getElementById('upgrade-section');
    this.upgradeBtn = document.getElementById('upgrade-btn');
    
    this.init();
  }
  
  init() {
    this.expandBtn.addEventListener('click', () => {
      this.expandComments();
    });
    
    // Load and setup settings
    this.loadSettings();
    this.setupSettingsListeners();
    this.setupDebugListeners();
    this.setupUpgradeListeners();
    
    // Check if we're on a Reddit page
    this.checkCurrentPage();
    
    // Load usage information
    this.loadUsageInfo();
  }
  
  async checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url.includes('reddit.com') && tab.url.includes('/comments/')) {
        this.updateStatus('Ready to expand comments', 'ready');
      } else if (tab.url.includes('reddit.com')) {
        this.updateStatus('Navigate to a Reddit comment page', 'warning');
        this.expandBtn.disabled = true;
        this.expandBtn.classList.add('loading');
      } else {
        this.updateStatus('Not on Reddit - extension inactive', 'error');
        this.expandBtn.disabled = true;
        this.expandBtn.classList.add('loading');
      }
    } catch (error) {
      console.error('Error checking current page:', error);
      this.updateStatus('Error checking page', 'error');
    }
  }
  
  async expandComments() {
    this.updateStatus('Expanding comments...', 'loading');
    this.expandBtn.classList.add('loading');
    this.expandBtn.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject and execute the expansion script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: this.triggerExpansion
      });
      
      // Wait a moment for the expansion to process
      setTimeout(() => {
        this.updateStatus('Comments expanded successfully!', 'success');
        this.expandBtn.classList.remove('loading');
        this.expandBtn.disabled = false;
        
        // Reset status after a few seconds
        setTimeout(() => {
          this.updateStatus('Ready to expand comments', 'ready');
        }, 3000);
      }, 1000);
    } catch (error) {
    console.error('Error expanding comments:', error);
    this.updateStatus('Error expanding comments', 'error');
    this.expandBtn.classList.remove('loading');
    this.expandBtn.disabled = false;
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
    
    // Set default values if not found
    this.showFloatingButton.checked = result.showFloatingButton !== false;
    this.enableNotifications.checked = result.enableNotifications !== false;
    this.batchSize.value = result.batchSize || '5';
    this.delayMs.value = result.delayMs || '200';
    this.expandReplies.checked = result.expandReplies !== false;
    this.expandComments.checked = result.expandComments !== false;
    this.expandDeleted.checked = result.expandDeleted !== false;
    this.expandCrowdControl.checked = result.expandCrowdControl !== false;
    this.expandContestMode.checked = result.expandContestMode !== false;
    
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

setupSettingsListeners() {
  // Save settings when changed
  this.showFloatingButton.addEventListener('change', () => {
    this.saveSettings();
  });
  
  this.enableNotifications.addEventListener('change', () => {
    this.saveSettings();
  });
  
  this.batchSize.addEventListener('change', () => {
    this.saveSettings();
  });
  
  this.delayMs.addEventListener('change', () => {
    this.saveSettings();
  });
  
  this.expandReplies.addEventListener('change', () => {
    this.saveSettings();
  });
  
  this.expandComments.addEventListener('change', () => {
    this.saveSettings();
  });
}

async saveSettings() {
  try {
    const settings = {
      showFloatingButton: this.showFloatingButton.checked,
      enableNotifications: this.enableNotifications.checked,
      batchSize: parseInt(this.batchSize.value),
      delayMs: parseInt(this.delayMs.value),
      expandReplies: this.expandReplies.checked,
      expandComments: this.expandComments.checked,
      expandDeleted: this.expandDeleted.checked,
      expandCrowdControl: this.expandCrowdControl.checked,
      expandContestMode: this.expandContestMode.checked
    };
    
    await chrome.storage.sync.set(settings);
    console.log('Settings saved:', settings);
    
    // Notify content script of settings change
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url.includes('reddit.com')) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings: settings
      }).catch(() => {
        // Content script might not be loaded yet
      });
    }
    
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}
  
  // This function will be injected into the content page
  triggerExpansion() {
    try {
      // Look for the Reddit Comment Expander instance
      const fab = document.getElementById('reddit-comment-expander-fab');
      if (fab) {
        fab.click();
        console.log('Triggered expansion via popup');
        return;
      }
      
      console.log('Reddit Comment Expander not found on page, using fallback');
      
      // Fallback: try to expand comments directly
      const collapsedComments = document.querySelectorAll('.collapsed .expand');
      const loadMoreLinks = document.querySelectorAll('a.morecomments');
      
      let expandedCount = 0;
      
      collapsedComments.forEach(button => {
        try {
          button.click();
          expandedCount++;
        } catch (e) {
          console.error('Error clicking collapsed comment:', e);
        }
      });
      
      loadMoreLinks.forEach(link => {
        try {
          link.click();
          expandedCount++;
        } catch (e) {
          console.error('Error clicking load more link:', e);
        }
      });
      
      console.log(`Fallback expansion: expanded ${expandedCount} items`);
    } catch (error) {
      console.error('Error in triggerExpansion:', error);
    }
  }
  
  updateStatus(message, type) {
    this.statusText.textContent = message;
    
    // Remove existing status classes
    this.status.classList.remove('success', 'error', 'loading', 'warning');
    
    // Add new status class
    if (type && type !== 'ready') {
      this.status.classList.add(type);
    }
  }
  
  setupDebugListeners() {
    this.viewLogsBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/popup/logs.html')
      });
    });
  }
  
  setupUpgradeListeners() {
    if (this.upgradeBtn) {
      this.upgradeBtn.addEventListener('click', () => {
        chrome.tabs.create({
          url: 'https://reddit-comment-expander.com/upgrade'
        });
      });
    }
  }
  
  async loadUsageInfo() {
    try {
      const result = await chrome.storage.local.get(['usageStats']);
      const usageStats = result.usageStats || { dailyExpansions: 0, totalExpansions: 0 };
      
      // Get user tier
      const tierResult = await chrome.storage.sync.get(['userTier']);
      const userTier = tierResult.userTier || 'free';
      
      if (userTier === 'free') {
        const remaining = Math.max(0, 5 - usageStats.dailyExpansions);
        this.usageInfo.innerHTML = `
          <p class="version">v1.0.0 - Free Tier</p>
          <p class="usage-text">${remaining}/5 expansions remaining today</p>
          <p class="total-usage">Total expansions: ${usageStats.totalExpansions}</p>
        `;
        
        // Show upgrade section if low on expansions
        if (remaining <= 2) {
          this.upgradeSection.style.display = 'block';
        }
      } else {
        this.usageInfo.innerHTML = `
          <p class="version">v1.0.0 - Pro Version</p>
          <p class="total-usage">Total expansions: ${usageStats.totalExpansions}</p>
        `;
      }
    } catch (error) {
      console.error('Error loading usage info:', error);
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});