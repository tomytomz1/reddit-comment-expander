// Enhanced Reddit Platform Detection and Element Selectors
// MIGRATED VERSION - Uses SelectorFactory for centralized selector management
class RedditDetector {
  constructor() {
    // Use SelectorFactory instead of local selector management
    this.selectorFactory = window.selectorFactory;
    
    // Pre-warm the cache with common selectors
    if (window.elementCache) {
      window.elementCache.preWarm([
        'button[rpl]',
        'svg[icon-name="join-outline"]',
        'shreddit-comment',
        '[data-reddit-expander-processed]'
      ]);
      console.log('[RedditDetector] Pre-warmed element cache with common selectors');
    }
    
    console.log(`Reddit Comment Expander: Using SelectorFactory for ${this.selectorFactory.version}`);
  }

  // Simplified element detection using SelectorFactory
  findElements(category) {
    return this.selectorFactory.findElements(category);
  }

  // Enhanced element detection with multiple selector fallbacks
  findElementsWithFallback(category, options = {}) {
    return this.selectorFactory.findElements(category, options);
  }

  // Icon detection using SelectorFactory
  hasIcon(element, iconName) {
    return this.selectorFactory.hasIcon(element, iconName);
  }

  hasAnyIcon(element) {
    return this.selectorFactory.hasAnyIcon(element);
  }

  // Get all available icon names
  getAvailableIcons() {
    return this.selectorFactory.getIconNames();
  }

  // Build custom button selectors
  buildButtonSelector(classes) {
    return this.selectorFactory.buildButtonSelector(classes);
  }

  // Filter elements with caching
  filterElementsWithCache(baseSelector, filterFn) {
    return this.selectorFactory.filterElementsWithCache(baseSelector, filterFn);
  }

  // Get selector statistics
  getSelectorStats() {
    return this.selectorFactory.getStats();
  }

  // Validate selector syntax
  validateSelector(selector) {
    return this.selectorFactory.validateSelector(selector);
  }

  // Debug selector information
  debugSelectors() {
    this.selectorFactory.debug();
  }

  // Legacy methods for backward compatibility
  getSelectors() {
    console.warn('[RedditDetector] getSelectors() is deprecated. Use SelectorFactory methods instead.');
    return this.selectorFactory.getAllSelectors();
  }

  detectRedditVersion() {
    console.warn('[RedditDetector] detectRedditVersion() is deprecated. Use SelectorFactory.version instead.');
    return this.selectorFactory.version;
  }

  // Enhanced element filtering with SelectorFactory integration
  filterElements(elements, category) {
    if (!elements || elements.length === 0) {
      return [];
    }

    const filteredElements = [];
    
    for (const element of elements) {
      // Skip if already processed
      if (element.hasAttribute('data-reddit-expander-processed')) {
        continue;
      }

      // Use SelectorFactory for icon detection
      const hasAnyIcon = this.selectorFactory.hasAnyIcon(element);
      const hasJoinOutline = this.selectorFactory.hasIcon(element, 'joinOutline');
      const hasPlus = this.selectorFactory.hasIcon(element, 'plus');
      const hasPlusOutline = this.selectorFactory.hasIcon(element, 'plusOutline');
      const hasExpand = this.selectorFactory.hasIcon(element, 'expand');
      const hasExpandOutline = this.selectorFactory.hasIcon(element, 'expandOutline');

      let isValid = false;

      switch (category) {
        case 'moreReplies':
          // Enhanced moreReplies detection using SelectorFactory
          isValid = hasJoinOutline || 
                   (element.textContent && element.textContent.toLowerCase().includes('more repl')) ||
                   (element.getAttribute('aria-label') && element.getAttribute('aria-label').toLowerCase().includes('more repl'));
          break;

        case 'moreComments':
          isValid = element.textContent && (
            element.textContent.toLowerCase().includes('view more comment') ||
            element.textContent.toLowerCase().includes('view entire discussion') ||
            element.textContent.toLowerCase().includes('load more comments')
          );
          break;

        case 'collapsed':
          isValid = hasPlus || hasPlusOutline || hasExpand || hasExpandOutline ||
                   element.getAttribute('aria-expanded') === 'false' ||
                   element.getAttribute('aria-label') === 'Expand comment';
          break;

        case 'continueThread':
          isValid = element.href && element.href.includes('/comments/') ||
                   (element.textContent && element.textContent.toLowerCase().includes('continue this thread'));
          break;

        case 'crowdControl':
          isValid = element.classList.contains('crowd-control') ||
                   element.getAttribute('data-crowd-control') === 'true' ||
                   (element.textContent && element.textContent.toLowerCase().includes('crowd control'));
          break;

        case 'contestMode':
          isValid = element.getAttribute('data-contest-mode') === 'true' ||
                   element.classList.contains('contest') ||
                   (element.textContent && element.textContent.toLowerCase().includes('contest mode'));
          break;

        case 'deleted':
          isValid = element.getAttribute('data-deleted') === 'true' ||
                   element.classList.contains('deleted') ||
                   (element.textContent && element.textContent.toLowerCase().includes('deleted'));
          break;

        case 'viewRest':
          isValid = element.textContent && (
            element.textContent.toLowerCase().includes('view the rest') ||
            element.textContent.toLowerCase().includes('view all comments')
          );
          break;

        default:
          isValid = true;
      }

      if (isValid) {
        filteredElements.push(element);
      }
    }

    return filteredElements;
  }

  // Detect Reddit features using SelectorFactory
  detectFeatures() {
    const features = {
      hasCSSHasSupport: this.selectorFactory.hasSupport,
      version: this.selectorFactory.version,
      totalSelectors: this.selectorFactory.getStats().totalSelectors,
      iconCount: this.selectorFactory.getStats().iconCount,
      buttonClassCount: this.selectorFactory.getStats().buttonClassCount,
      elementTypeCount: this.selectorFactory.getStats().elementTypeCount
    };

    console.log('[RedditDetector] Detected features:', features);
    return features;
  }

  // Get all expandable elements using SelectorFactory
  getAllExpandableElements() {
    const categories = ['moreComments', 'moreReplies', 'collapsed', 'continueThread', 'crowdControl', 'contestMode', 'deleted', 'viewRest'];
    const allElements = [];

    for (const category of categories) {
      const elements = this.selectorFactory.findElements(category);
      allElements.push(...elements);
    }

    // Remove duplicates
    const uniqueElements = [...new Set(allElements)];
    
    console.log(`[RedditDetector] Found ${uniqueElements.length} unique expandable elements across all categories`);
    return uniqueElements;
  }

  // Check if element is visible
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  // Mark element as processed
  markAsProcessed(element) {
    if (element) {
      element.setAttribute('data-reddit-expander-processed', 'true');
    }
  }

  // Reset processed markers
  resetProcessedMarkers() {
    const processedElements = document.querySelectorAll('[data-reddit-expander-processed]');
    processedElements.forEach(element => {
      element.removeAttribute('data-reddit-expander-processed');
    });
    console.log(`[RedditDetector] Reset ${processedElements.length} processed markers`);
  }

  // Enhanced element finding with advanced filtering
  findElementsAdvanced(category, options = {}) {
    const {
      useCache = true,
      filterVisible = true,
      excludeProcessed = true,
      customFilter = null
    } = options;

    // Get elements using SelectorFactory
    let elements = this.selectorFactory.findElements(category, { useCache });

    // Apply filters
    if (excludeProcessed) {
      elements = elements.filter(element => !element.hasAttribute('data-reddit-expander-processed'));
    }

    if (filterVisible) {
      elements = elements.filter(element => this.isElementVisible(element));
    }

    if (customFilter) {
      elements = elements.filter(customFilter);
    }

    // Apply category-specific filtering
    elements = this.filterElements(elements, category);

    console.log(`[RedditDetector] Found ${elements.length} ${category} elements with advanced filtering`);
    return elements;
  }

  // Get performance statistics
  getPerformanceStats() {
    const stats = this.selectorFactory.getStats();
    return {
      ...stats,
      cacheEnabled: !!window.elementCache,
      processedElements: document.querySelectorAll('[data-reddit-expander-processed]').length,
      totalElements: document.querySelectorAll('button, a').length
    };
  }

  // Validate all selectors for current version
  validateAllSelectors() {
    const allSelectors = this.selectorFactory.getAllSelectors();
    const validationResults = {};

    for (const [category, selectors] of Object.entries(allSelectors)) {
      validationResults[category] = {
        total: selectors.length,
        valid: 0,
        invalid: 0,
        invalidSelectors: []
      };

      for (const selector of selectors) {
        const isValid = this.selectorFactory.validateSelector(selector);
        if (isValid) {
          validationResults[category].valid++;
        } else {
          validationResults[category].invalid++;
          validationResults[category].invalidSelectors.push(selector);
        }
      }
    }

    console.log('[RedditDetector] Selector validation results:', validationResults);
    return validationResults;
  }

  // Cleanup method
  destroy() {
    this.resetProcessedMarkers();
    console.log('[RedditDetector] Cleanup completed');
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.RedditDetector = RedditDetector;
  console.log('🔍 [REDDIT-DETECTOR] Migrated RedditDetector loaded successfully');
} 