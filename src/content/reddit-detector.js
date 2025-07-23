// Enhanced Reddit Platform Detection and Element Selectors
class RedditDetector {
  constructor() {
    this.version = this.detectRedditVersion();
    this.selectors = this.getSelectors();
    console.log(`Reddit Comment Expander: Detected ${this.version} interface`);
  }

  detectRedditVersion() {
    // Check for new 2024+ Reddit (shreddit)
    if (document.querySelector('shreddit-app') || 
        document.querySelector('shreddit-comment-tree') ||
        window.location.hostname === 'sh.reddit.com') {
      return 'shReddit';
    }
    
    // Check for new Reddit (React-based)
    if (document.querySelector('#2x-container') || 
        document.querySelector('[data-testid="post-comment-list"]') ||
        document.querySelector('div[data-testid*="comment"]')) {
      return 'newReddit';
    }
    
    // Check for old Reddit
    if (document.querySelector('.reddit-infobar') || 
        document.querySelector('.commentarea') ||
        document.querySelector('.morecomments')) {
      return 'oldReddit';
    }
    
    return 'unknown';
  }

  getSelectors() {
    const baseSelectors = {
      newReddit: {
        moreComments: [
          'button[aria-label*="View more comment"]',
          'button[aria-label*="View Entire Discussion"]',
          'button[aria-label*="View more comments"]',
          'button[aria-label*="View Entire Discussion"]',
          '[data-testid="post-comment-list"] button',
          'div[data-testid*="comment"] button[aria-label*="more"]'
        ],
        moreReplies: [
          'button[aria-label*="more repl"]',
          'button[aria-label*="more replies"]',
          'div[id^="moreComments-"] button',
          '[data-testid*="comment"] button[aria-label*="repl"]'
        ],
        continueThread: [
          'a[href*="/comments/"]',
          'button[aria-label*="Continue this thread"]',
          'a[href*="continue"]'
        ],
        collapsed: [
          'button[aria-expanded="false"]',
          'button[aria-label="Expand comment"]',
          '[data-testid="comment-collapsed"] button',
          'div[data-testid*="comment"] button[aria-expanded="false"]'
        ],
        crowdControl: [
          '[data-testid="comment-crowd-control-collapsed"]',
          'div[data-testid*="comment"][class*="crowd-control"]',
          'button[aria-label*="crowd control"]'
        ],
        contestMode: [
          '[data-testid="comment-hidden-contest-mode"]',
          'div[data-testid*="comment"][class*="contest"]',
          'button[aria-label*="contest mode"]'
        ],
        deleted: [
          '[data-testid="comment-deleted-collapsed"]',
          'div[data-testid*="comment"][class*="deleted"]',
          'button[aria-label*="deleted"]'
        ],
        viewRest: [
          'button[aria-label*="View the rest of the comments"]',
          'button[aria-label*="View all comments"]',
          'a[href*="view"]'
        ]
      },
      oldReddit: {
        moreComments: [
          '.morecomments > a.button',
          'a.morecomments',
          '.morecomments a',
          'a[href*="load more comments"]'
        ],
        moreReplies: [
          '.morechildren > a',
          'a[href*="more repl"]',
          '.morechildren a',
          'a[href*="continue this thread"]'
        ],
        continueThread: [
          'a[href*="Continue this thread"]',
          'a[href*="/comments/"]',
          'a[href*="continue this thread"]'
        ],
        collapsed: [
          '.collapsed > .entry > .tagline > a.expand',
          '.collapsed .expand',
          'a.expand',
          '.collapsed a[onclick*="expand"]'
        ],
        crowdControl: [
          '.comment.crowd-control-collapsed',
          '.comment[class*="crowd-control"]',
          '.collapsed[class*="crowd-control"]'
        ],
        contestMode: [
          '.comment[data-contest-mode="true"]',
          '.comment[class*="contest"]',
          '.collapsed[class*="contest"]'
        ],
        deleted: [
          '.comment.deleted > .entry',
          '.comment[class*="deleted"]',
          '.collapsed[class*="deleted"]'
        ],
        viewRest: [
          'a[href*="View the rest of the comments"]',
          'a[href*="View all comments"]',
          '.morecomments a[href*="View the rest"]'
        ]
      },
      shReddit: {
        moreComments: [
          'shreddit-comment-tree button[slot="more-comments-button"]',
          'shreddit-comment-tree button[aria-label*="more"]',
          'faceplate-button[slot="more-comments-button"]'
        ],
        moreReplies: [
          // Use :has if supported, fallback to JS filtering
          'button:has(svg[icon-name="join-outline"])'
        ],
        continueThread: [
          'faceplate-partial[loading="lazy"]',
          'shreddit-comment-tree faceplate-partial',
          'a[href*="/comments/"]'
        ],
        collapsed: [
          'shreddit-comment[collapsed="true"]',
          'shreddit-comment button[aria-expanded="false"]',
          'faceplate-button[aria-expanded="false"]'
        ],
        crowdControl: [
          'shreddit-comment[collapsed="true"][class*="crowd-control"]',
          'shreddit-comment[data-crowd-control="true"]'
        ],
        contestMode: [
          'shreddit-comment[data-contest-mode="true"]',
          'shreddit-comment[class*="contest"]'
        ],
        deleted: [
          'shreddit-comment[data-deleted="true"]',
          'shreddit-comment[class*="deleted"]'
        ],
        viewRest: [
          'faceplate-button[aria-label*="View the rest"]',
          'shreddit-comment-tree button[aria-label*="View all"]'
        ]
      }
    };

    return baseSelectors[this.version] || baseSelectors.oldReddit;
  }

  // Enhanced element detection with multiple selector fallbacks
  findElements(category) {
    const selectors = this.selectors[category];
    if (!selectors) {
      console.warn(`No selectors found for category: ${category}`);
      return [];
    }

    let elements = [];
    let usedSelector = null;
    // Try each selector in order until we find elements
    for (const selector of selectors) {
      try {
        // Fallback for :has support
        if (category === 'moreReplies' && this.version === 'shReddit' && selector.includes(':has')) {
          // If :has is not supported, do manual filtering
          if (!CSS.supports('selector(:has(*))')) {
            elements = Array.from(document.querySelectorAll('button')).filter(btn =>
              btn.querySelector('svg[icon-name="join-outline"]') &&
              /more replies/i.test(btn.textContent)
            );
            if (elements.length > 0) {
              usedSelector = 'manual moreReplies join-outline';
              break;
            }
            continue;
          }
        }
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          elements = Array.from(found);
          usedSelector = selector;
          break;
        }
      } catch (error) {
        continue;
      }
    }
    if (usedSelector) {
      console.log(`Found ${elements.length} ${category} elements using selector: ${usedSelector}`);
    }
    // Additional filtering for better accuracy
    elements = this.filterElements(elements, category);
    
    return elements;
  }

  filterElements(elements, category) {
    return elements.filter(element => {
      // Skip already processed elements
      if (element.dataset.redditExpanderProcessed) {
        return false;
      }

      // Skip disabled or loading elements
      if (element.disabled || 
          element.textContent.toLowerCase().includes('loading') ||
          element.textContent.toLowerCase().includes('please wait')) {
        return false;
      }

      // Skip navigation links that might cause page changes
      if (element.tagName === 'A' && element.href) {
        const href = element.href.toLowerCase();
        if (href.includes('/comment/') && href.split('/').length > 5) {
          return false; // Skip single comment links
        }
      }

      // --- PRECISE FILTERING FOR EXPANDABLE ELEMENTS ---
      if (category === 'moreReplies') {
        // Only allow button with svg[icon-name="join-outline"] and text 'more replies'
        const isButton = element.tagName === 'BUTTON';
        const hasJoinOutline = element.querySelector && element.querySelector('svg[icon-name="join-outline"]');
        const hasText = /more replies/i.test(element.textContent);
        if (!(isButton && hasJoinOutline && hasText)) {
          return false;
        }
      }
      if (category === 'moreComments') {
        // Only allow button with svg[icon-name="caret-down-outline"] and text 'view more comments'
        const isButton = element.tagName === 'BUTTON';
        const hasCaretDown = element.querySelector && element.querySelector('svg[icon-name="caret-down-outline"]');
        const hasText = /view more comments/i.test(element.textContent);
        if (!(isButton && hasCaretDown && hasText)) {
          return false;
        }
      }
      // --- END PRECISE FILTERING ---

      return true;
    });
  }

  // Detect special Reddit features
  detectFeatures() {
    const features = {
      crowdControl: false,
      contestMode: false,
      hasDeletedComments: false,
      isLiveThread: false,
      isQuarantined: false,
      isNSFW: false
    };

    // Check for Crowd Control
    if (this.findElements('crowdControl').length > 0) {
      features.crowdControl = true;
    }

    // Check for Contest Mode
    if (this.findElements('contestMode').length > 0 || 
        document.querySelector('[data-contest-mode="true"]')) {
      features.contestMode = true;
    }

    // Check for deleted comments
    if (this.findElements('deleted').length > 0) {
      features.hasDeletedComments = true;
    }

    // Check for live threads
    if (document.querySelector('.live-timestamp') || 
        window.location.pathname.includes('/live/')) {
      features.isLiveThread = true;
    }

    // Check for quarantined subreddits
    if (document.querySelector('.quarantine-notice') ||
        document.querySelector('[data-testid="quarantine-notice"]')) {
      features.isQuarantined = true;
    }

    // Check for NSFW content
    if (document.querySelector('.over18') ||
        document.querySelector('[data-testid="nsfw-badge"]')) {
      features.isNSFW = true;
    }

    return features;
  }

  // Get all expandable elements with priority scoring
  getAllExpandableElements() {
    const elements = {
      moreComments: this.findElements('moreComments'),
      moreReplies: this.findElements('moreReplies'),
      continueThread: this.findElements('continueThread'),
      collapsed: this.findElements('collapsed'),
      crowdControl: this.findElements('crowdControl'),
      contestMode: this.findElements('contestMode'),
      deleted: this.findElements('deleted'),
      viewRest: this.findElements('viewRest')
    };

    // Add priority scores for queue processing
    const scoredElements = [];
    
    // High priority: visible collapsed comments
    elements.collapsed.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'collapsed',
        priority: 10,
        visible: this.isElementVisible(el)
      });
    });

    // Medium priority: more replies
    elements.moreReplies.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'moreReplies',
        priority: 8,
        visible: this.isElementVisible(el)
      });
    });

    // Medium priority: more comments
    elements.moreComments.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'moreComments',
        priority: 7,
        visible: this.isElementVisible(el)
      });
    });

    // Lower priority: continue thread
    elements.continueThread.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'continueThread',
        priority: 5,
        visible: this.isElementVisible(el)
      });
    });

    // Special handling for crowd control and contest mode
    elements.crowdControl.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'crowdControl',
        priority: 6,
        visible: this.isElementVisible(el)
      });
    });

    elements.contestMode.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'contestMode',
        priority: 6,
        visible: this.isElementVisible(el)
      });
    });

    // Deleted comments (lowest priority)
    elements.deleted.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'deleted',
        priority: 3,
        visible: this.isElementVisible(el)
      });
    });

    // View rest of comments
    elements.viewRest.forEach(el => {
      scoredElements.push({
        element: el,
        category: 'viewRest',
        priority: 4,
        visible: this.isElementVisible(el)
      });
    });

    // Sort by priority (highest first), then by visibility
    scoredElements.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.visible - a.visible;
    });

    return scoredElements;
  }

  isElementVisible(element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           rect.top < window.innerHeight &&
           rect.bottom > 0;
  }

  // Mark element as processed
  markAsProcessed(element) {
    if (element) {
      element.dataset.redditExpanderProcessed = 'true';
    }
  }

  // Reset processed markers (useful for re-scanning)
  resetProcessedMarkers() {
    document.querySelectorAll('[data-reddit-expander-processed]').forEach(el => {
      delete el.dataset.redditExpanderProcessed;
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RedditDetector;
} else {
  window.RedditDetector = RedditDetector;
} 