/**
 * SelectorFactory for Reddit Comment Expander
 * 
 * Centralizes all Reddit selector patterns to eliminate code duplication
 * and provide a maintainable, type-safe way to manage selectors across
 * different Reddit versions and element categories.
 */

console.log('🔧 [SELECTOR-FACTORY] Loading SelectorFactory...');

class SelectorFactory {
  constructor() {
    this.version = this.detectRedditVersion();
    this.hasSupport = this.detectHasSupport();
    
    // Initialize selector components
    this.initializeSelectorComponents();
    
    // Build complete selector sets
    this.selectors = this.buildSelectors();
    
    console.log(`🔧 [SELECTOR-FACTORY] Initialized for ${this.version} (has: ${this.hasSupport})`);
  }

  /**
   * Detect Reddit version
   */
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

  /**
   * Detect CSS :has() support
   */
  detectHasSupport() {
    return CSS.supports('selector(:has(*))');
  }

  /**
   * Initialize selector components
   */
  initializeSelectorComponents() {
    // Icon selectors
    this.icons = {
      joinOutline: 'svg[icon-name="join-outline"]',
      plus: 'svg[icon-name="plus"]',
      plusOutline: 'svg[icon-name="plus-outline"]',
      expand: 'svg[icon-name="expand"]',
      expandOutline: 'svg[icon-name="expand-outline"]',
      caretDown: 'svg[icon-name="caret-down-outline"]'
    };

    // Button classes
    this.buttonClasses = {
      rpl: '[rpl]',
      small: '.button-small',
      plain: '.button-plain',
      icon: '.icon',
      brand: '.button-brand',
      neutralContent: '.text-neutral-content-strong',
      neutralBackground: '.bg-neutral-background',
      inlineFlex: '.inline-flex'
    };

    // Element types
    this.elements = {
      button: 'button',
      anchor: 'a',
      shredditComment: 'shreddit-comment',
      faceplateButton: 'faceplate-button',
      faceplatePartial: 'faceplate-partial',
      summary: 'summary',
      details: 'details'
    };

    // Attributes
    this.attributes = {
      ariaExpanded: '[aria-expanded="false"]',
      ariaLabel: '[aria-label*="{text}"]',
      dataTestId: '[data-testid="{id}"]',
      slot: '[slot="{name}"]',
      href: '[href*="{text}"]',
      id: '[id*="{text}"]',
      class: '[class*="{text}"]'
    };

    // Reddit-specific components
    this.redditComponents = {
      moreComments: '.morecomments',
      moreChildren: '.morechildren',
      collapsed: '.collapsed',
      comment: '.comment',
      commentArea: '.commentarea'
    };
  }

  /**
   * Build complete selector sets for each Reddit version
   */
  buildSelectors() {
    return {
      newReddit: this.buildNewRedditSelectors(),
      oldReddit: this.buildOldRedditSelectors(),
      shReddit: this.buildShRedditSelectors()
    };
  }

  /**
   * Build selectors for New Reddit
   */
  buildNewRedditSelectors() {
    return {
      moreComments: [
        this.buildAriaLabelSelector('View more comment'),
        this.buildAriaLabelSelector('View Entire Discussion'),
        this.buildAriaLabelSelector('View more comments'),
        `${this.attributes.dataTestId.replace('{id}', 'post-comment-list')} ${this.elements.button}`,
        `div${this.attributes.dataTestId.replace('{id}', 'comment')} ${this.elements.button}${this.attributes.ariaLabel.replace('{text}', 'more')}`
      ],
      moreReplies: [
        this.buildAriaLabelSelector('more repl'),
        this.buildAriaLabelSelector('more replies'),
        `div${this.attributes.id.replace('{text}', 'moreComments-')} ${this.elements.button}`,
        `${this.attributes.dataTestId.replace('{id}', 'comment')} ${this.elements.button}${this.attributes.ariaLabel.replace('{text}', 'repl')}`
      ],
      continueThread: [
        this.buildHrefSelector('/comments/'),
        this.buildAriaLabelSelector('Continue this thread'),
        this.buildHrefSelector('continue')
      ],
      collapsed: [
        this.attributes.ariaExpanded,
        this.buildAriaLabelSelector('Expand comment'),
        `${this.attributes.dataTestId.replace('{id}', 'comment-collapsed')} ${this.elements.button}`,
        `div${this.attributes.dataTestId.replace('{id}', 'comment')} ${this.elements.button}${this.attributes.ariaExpanded}`
      ],
      crowdControl: [
        `${this.attributes.dataTestId.replace('{id}', 'comment-crowd-control-collapsed')}`,
        `div${this.attributes.dataTestId.replace('{id}', 'comment')}${this.attributes.class.replace('{text}', 'crowd-control')}`,
        this.buildAriaLabelSelector('crowd control')
      ],
      contestMode: [
        `${this.attributes.dataTestId.replace('{id}', 'comment-hidden-contest-mode')}`,
        `div${this.attributes.dataTestId.replace('{id}', 'comment')}${this.attributes.class.replace('{text}', 'contest')}`,
        this.buildAriaLabelSelector('contest mode')
      ],
      deleted: [
        `${this.attributes.dataTestId.replace('{id}', 'comment-deleted-collapsed')}`,
        `div${this.attributes.dataTestId.replace('{id}', 'comment')}${this.attributes.class.replace('{text}', 'deleted')}`,
        this.buildAriaLabelSelector('deleted')
      ],
      viewRest: [
        this.buildAriaLabelSelector('View the rest of the comments'),
        this.buildAriaLabelSelector('View all comments'),
        this.buildHrefSelector('view')
      ]
    };
  }

  /**
   * Build selectors for Old Reddit
   */
  buildOldRedditSelectors() {
    return {
      moreComments: [
        `${this.redditComponents.moreComments} > ${this.elements.anchor}.button`,
        `${this.elements.anchor}.morecomments`,
        `${this.redditComponents.moreComments} ${this.elements.anchor}`,
        this.buildHrefSelector('load more comments')
      ],
      moreReplies: [
        `${this.redditComponents.moreChildren} > ${this.elements.anchor}`,
        this.buildHrefSelector('more repl'),
        `${this.redditComponents.moreChildren} ${this.elements.anchor}`,
        this.buildHrefSelector('continue this thread')
      ],
      continueThread: [
        this.buildHrefSelector('Continue this thread'),
        this.buildHrefSelector('/comments/'),
        this.buildHrefSelector('continue this thread')
      ],
      collapsed: [
        `${this.redditComponents.collapsed} > .entry > .tagline > ${this.elements.anchor}.expand`,
        `${this.redditComponents.collapsed} .expand`,
        `${this.elements.anchor}.expand`,
        `${this.redditComponents.collapsed} ${this.elements.anchor}[onclick*="expand"]`
      ],
      crowdControl: [
        `${this.redditComponents.comment}.crowd-control-collapsed`,
        `${this.redditComponents.comment}${this.attributes.class.replace('{text}', 'crowd-control')}`,
        `${this.redditComponents.collapsed}${this.attributes.class.replace('{text}', 'crowd-control')}`
      ],
      contestMode: [
        `${this.redditComponents.comment}[data-contest-mode="true"]`,
        `${this.redditComponents.comment}${this.attributes.class.replace('{text}', 'contest')}`,
        `${this.redditComponents.collapsed}${this.attributes.class.replace('{text}', 'contest')}`
      ],
      deleted: [
        `${this.redditComponents.comment}.deleted > .entry`,
        `${this.redditComponents.comment}${this.attributes.class.replace('{text}', 'deleted')}`,
        `${this.redditComponents.collapsed}${this.attributes.class.replace('{text}', 'deleted')}`
      ],
      viewRest: [
        this.buildHrefSelector('View the rest of the comments'),
        this.buildHrefSelector('View all comments'),
        `${this.redditComponents.moreComments} ${this.elements.anchor}${this.buildHrefSelector('View the rest')}`
      ]
    };
  }

  /**
   * Build selectors for ShReddit
   */
  buildShRedditSelectors() {
    return {
      moreComments: [
        `${this.elements.shredditComment}-tree ${this.elements.button}${this.attributes.slot.replace('{name}', 'more-comments-button')}`,
        `${this.elements.shredditComment}-tree ${this.elements.button}${this.attributes.ariaLabel.replace('{text}', 'more')}`,
        `${this.elements.faceplateButton}${this.attributes.slot.replace('{name}', 'more-comments-button')}`,
        this.buildHasSelector(this.elements.button, this.icons.caretDown),
        `${this.elements.button}${this.attributes.ariaLabel.replace('{text}', 'View more comments')}`,
        `${this.elements.button}${this.buttonClasses.brand}${this.buildHasSelector('', this.icons.caretDown)}`,
        '#top-level-more-comments-partial button',
        '#top-level-more-comments-partial',
        `${this.elements.faceplatePartial}${this.attributes.id.replace('{text}', 'more-comments')}`,
        `${this.elements.faceplatePartial}${this.attributes.class.replace('{text}', 'top-level')}`,
        `${this.elements.button}${this.buttonClasses.brand}${this.buttonClasses.rpl}`,
        `${this.elements.button}${this.buttonClasses.small}${this.buttonClasses.brand}`,
        `${this.elements.button}${this.attributes.class.replace('{text}', 'button-brand')}${this.attributes.class.replace('{text}', 'inline-flex')}`
      ],
      moreReplies: this.buildShRedditMoreRepliesSelectors(),
      continueThread: [
        `${this.elements.faceplatePartial}[loading="lazy"]:not(${this.attributes.id.replace('{text}', 'more-comments')})`,
        `${this.elements.faceplatePartial}[loading="lazy"]:not(.top-level)`,
        `${this.elements.shredditComment}-tree ${this.elements.faceplatePartial}:not(${this.attributes.id.replace('{text}', 'more-comments')})`,
        this.buildHrefSelector('/comments/')
      ],
      collapsed: this.buildShRedditCollapsedSelectors(),
      crowdControl: [
        `${this.elements.shredditComment}[collapsed="true"]${this.attributes.class.replace('{text}', 'crowd-control')}`,
        `${this.elements.shredditComment}[data-crowd-control="true"]`
      ],
      contestMode: [
        `${this.elements.shredditComment}[data-contest-mode="true"]`,
        `${this.elements.shredditComment}${this.attributes.class.replace('{text}', 'contest')}`
      ],
      deleted: [
        `${this.elements.shredditComment}[data-deleted="true"]`,
        `${this.elements.shredditComment}${this.attributes.class.replace('{text}', 'deleted')}`
      ],
      viewRest: [
        `${this.elements.faceplateButton}${this.attributes.ariaLabel.replace('{text}', 'View the rest')}`,
        `${this.elements.shredditComment}-tree ${this.elements.button}${this.attributes.ariaLabel.replace('{text}', 'View all')}`
      ]
    };
  }

  /**
   * Build complex ShReddit more replies selectors
   */
  buildShRedditMoreRepliesSelectors() {
    const baseSelectors = [
      // Primary selectors with :has support
      this.buildHasSelector(this.elements.button, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.button}${this.buttonClasses.rpl}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.button}${this.buttonClasses.small}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.button}${this.buttonClasses.plain}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.button}${this.buttonClasses.icon}`, this.icons.joinOutline),
      
      // Fallback selectors without :has
      `${this.elements.button}${this.buttonClasses.rpl}`,
      `${this.elements.button}${this.buttonClasses.small}`,
      `${this.elements.button}${this.buttonClasses.plain}`,
      `${this.elements.button}${this.buttonClasses.icon}`,
      
      // Specific button format selectors
      `${this.elements.button}${this.buttonClasses.neutralContent}`,
      `${this.elements.button}${this.buttonClasses.neutralBackground}`,
      `${this.elements.button}${this.buttonClasses.inlineFlex}`,
      
      // Complex combinations
      `${this.elements.button}${this.buttonClasses.rpl}${this.buttonClasses.neutralContent}${this.buttonClasses.neutralBackground}${this.buttonClasses.small}${this.buttonClasses.plain}${this.buttonClasses.icon}${this.buttonClasses.inlineFlex}`,
      `${this.elements.button}${this.buttonClasses.neutralContent}${this.buttonClasses.neutralBackground}`,
      `${this.elements.button}${this.buttonClasses.small}${this.buttonClasses.plain}${this.buttonClasses.icon}`,
      `${this.elements.button}${this.buttonClasses.rpl}${this.buttonClasses.inlineFlex}`,
      
      // Anchor elements
      `${this.elements.anchor}${this.attributes.slot.replace('{name}', 'more-comments-permalink')}${this.buildHasSelector('', this.icons.joinOutline)}`,
      this.buildHasSelector(this.elements.anchor, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.anchor}.text-tone-2`, this.icons.joinOutline),
      `${this.elements.anchor}${this.attributes.slot.replace('{name}', 'more-comments-permalink')}`,
      `${this.elements.anchor}${this.attributes.id.replace('{text}', 'comments-permalink')}`,
      
      // Summary/Details elements
      this.buildHasSelector(`${this.elements.summary} ${this.elements.button}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.details} ${this.elements.button}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.summary} ${this.elements.button}${this.buttonClasses.rpl}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.details} ${this.elements.button}${this.buttonClasses.rpl}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.summary} ${this.elements.button}${this.buttonClasses.neutralContent}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.details} ${this.elements.button}${this.buttonClasses.neutralContent}`, this.icons.joinOutline),
      
      // Fallback summary/details selectors
      `${this.elements.summary} ${this.elements.button}${this.buttonClasses.rpl}`,
      `${this.elements.details} ${this.elements.button}${this.buttonClasses.rpl}`,
      `${this.elements.summary} ${this.elements.button}${this.buttonClasses.neutralContent}`,
      `${this.elements.details} ${this.elements.button}${this.buttonClasses.neutralContent}`,
      `${this.elements.summary} ${this.elements.button}${this.buttonClasses.neutralBackground}`,
      `${this.elements.details} ${this.elements.button}${this.buttonClasses.neutralBackground}`
    ];

    return baseSelectors;
  }

  /**
   * Build complex ShReddit collapsed selectors
   */
  buildShRedditCollapsedSelectors() {
    const baseSelectors = [
      // Primary selectors with :has support
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}`, this.icons.plus),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}`, this.icons.plusOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}`, this.icons.expand),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}`, this.icons.expandOutline),
      
      // Aria attributes
      `${this.elements.shredditComment} ${this.elements.button}${this.attributes.ariaExpanded}`,
      `${this.elements.shredditComment} ${this.elements.button}${this.buildAriaLabelSelector('Expand comment')}`,
      `${this.elements.faceplateButton}${this.attributes.ariaExpanded}`,
      
      // Button variations with :has
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.rpl}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.rpl}`, this.icons.plus),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.rpl}`, this.icons.plusOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.small}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.small}`, this.icons.plus),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.plain}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.plain}`, this.icons.plus),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.icon}`, this.icons.joinOutline),
      this.buildHasSelector(`${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.icon}`, this.icons.plus),
      
      // Fallback selectors without :has
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.rpl}`,
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.small}`,
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.plain}`,
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.icon}`,
      
      // Specific collapsed comment selectors
      `${this.elements.shredditComment}[collapsed] ${this.elements.button}${this.buildHasSelector('', this.icons.joinOutline)}`,
      `${this.elements.shredditComment}[collapsed] ${this.elements.button}${this.buildHasSelector('', this.icons.plus)}`,
      `${this.elements.shredditComment}[is-author-deleted="true"] ${this.elements.button}${this.buildHasSelector('', this.icons.joinOutline)}`,
      `${this.elements.shredditComment}[is-author-deleted="true"] ${this.elements.button}${this.buildHasSelector('', this.icons.plus)}`,
      `${this.elements.shredditComment}[collapsed] ${this.elements.button}${this.buttonClasses.neutralContent}`,
      `${this.elements.shredditComment}[is-author-deleted="true"] ${this.elements.button}${this.buttonClasses.neutralContent}`,
      
      // General button format selectors
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.neutralContent}${this.buttonClasses.neutralBackground}`,
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.small}${this.buttonClasses.plain}${this.buttonClasses.icon}`,
      `${this.elements.shredditComment} ${this.elements.button}${this.buttonClasses.rpl}${this.buttonClasses.inlineFlex}`,
      
      // Fallback collapsed selectors
      `${this.elements.shredditComment}[collapsed] ${this.elements.button}`,
      `${this.elements.shredditComment}[is-author-deleted="true"] ${this.elements.button}`
    ];

    return baseSelectors;
  }

  /**
   * Build :has() selector with fallback
   */
  buildHasSelector(element, child) {
    if (this.hasSupport) {
      return `${element}:has(${child})`;
    }
    return `${element}`; // Fallback without :has
  }

  /**
   * Build aria-label selector
   */
  buildAriaLabelSelector(text) {
    return this.attributes.ariaLabel.replace('{text}', text);
  }

  /**
   * Build href selector
   */
  buildHrefSelector(text) {
    return this.attributes.href.replace('{text}', text);
  }

  /**
   * Get selectors for a specific category and version
   */
  getSelectors(category, version = null) {
    const targetVersion = version || this.version;
    const versionSelectors = this.selectors[targetVersion];
    
    if (!versionSelectors) {
      console.warn(`[SelectorFactory] No selectors found for version: ${targetVersion}`);
      return [];
    }
    
    const categorySelectors = versionSelectors[category];
    if (!categorySelectors) {
      console.warn(`[SelectorFactory] No selectors found for category: ${category} in version: ${targetVersion}`);
      return [];
    }
    
    return categorySelectors;
  }

  /**
   * Get all selectors for current version
   */
  getAllSelectors(version = null) {
    const targetVersion = version || this.version;
    return this.selectors[targetVersion] || {};
  }

  /**
   * Check if element has specific icon
   */
  hasIcon(element, iconName) {
    if (!element || !element.querySelector) return false;
    
    const iconSelector = this.icons[iconName];
    if (!iconSelector) {
      console.warn(`[SelectorFactory] Unknown icon: ${iconName}`);
      return false;
    }
    
    return !!element.querySelector(iconSelector);
  }

  /**
   * Check if element has any of the known icons
   */
  hasAnyIcon(element) {
    if (!element || !element.querySelector) return false;
    
    return Object.values(this.icons).some(iconSelector => 
      !!element.querySelector(iconSelector)
    );
  }

  /**
   * Get all icon names
   */
  getIconNames() {
    return Object.keys(this.icons);
  }

  /**
   * Build button selector with classes
   */
  buildButtonSelector(classes = []) {
    if (!Array.isArray(classes)) {
      classes = [classes];
    }
    
    const classSelectors = classes
      .map(cls => this.buttonClasses[cls])
      .filter(Boolean)
      .join('');
    
    return `${this.elements.button}${classSelectors}`;
  }

  /**
   * Filter elements using cached querySelectorAll
   */
  filterElementsWithCache(baseSelector, filterFn) {
    const elements = window.elementCache ? 
      window.elementCache.cachedQuerySelectorAll(baseSelector) : 
      document.querySelectorAll(baseSelector);
    
    return Array.from(elements).filter(filterFn);
  }

  /**
   * Find elements for a category with fallback logic
   */
  findElements(category, options = {}) {
    const {
      version = this.version,
      useCache = true,
      fallbackToGeneric = true
    } = options;

    const selectors = this.getSelectors(category, version);
    if (!selectors || selectors.length === 0) {
      console.warn(`[SelectorFactory] No selectors available for category: ${category}`);
      return [];
    }

    let elements = [];
    let usedSelector = null;
    let selectorErrors = [];

    // Try each selector until we find elements
    for (const selector of selectors) {
      try {
        if (useCache && window.elementCache) {
          elements = window.elementCache.cachedQuerySelectorAll(selector);
        } else {
          elements = document.querySelectorAll(selector);
        }

        if (elements.length > 0) {
          usedSelector = selector;
          break;
        }
      } catch (error) {
        selectorErrors.push({ selector, error: error.message });
        continue;
      }
    }

    // Log which selector was used
    if (usedSelector) {
      console.log(`[SelectorFactory] Found ${elements.length} elements for "${category}" using: ${usedSelector}`);
    } else {
      // Log detailed debugging information
      console.warn(`[SelectorFactory] No elements found for "${category}" in version "${version}"`);
      console.warn(`[SelectorFactory] Tried ${selectors.length} selectors, ${selectorErrors.length} had errors`);
      
      if (selectorErrors.length > 0) {
        console.warn(`[SelectorFactory] Selector errors:`, selectorErrors.slice(0, 3)); // Show first 3 errors
      }
      
      if (fallbackToGeneric) {
        console.log(`[SelectorFactory] Trying smart fallback for "${category}"`);
        elements = this.findElementsWithSmartFallback(category);
      }
    }

    return Array.from(elements);
  }

  /**
   * Smart fallback that looks for elements with specific attributes or text content
   */
  findElementsWithSmartFallback(category) {
    const smartSelectors = {
      moreComments: [
        'button[aria-label*="more comment"]',
        'button[aria-label*="View more"]',
        'a[href*="more"]',
        'button:has(svg[icon-name="caret-down-outline"])',
        'button[class*="button-brand"]',
        'button[class*="brand"]'
      ],
      moreReplies: [
        'button[aria-label*="more repl"]',
        'button[aria-label*="replies"]',
        'button:has(svg[icon-name="join-outline"])',
        'button[class*="rpl"]',
        'button[class*="small"]',
        'button[class*="plain"]'
      ],
      collapsed: [
        'button[aria-expanded="false"]',
        'button[aria-label*="Expand"]',
        'button:has(svg[icon-name="join-outline"])',
        'button:has(svg[icon-name="plus"])',
        'button[class*="neutral"]'
      ],
      continueThread: [
        'a[href*="/comments/"]',
        'a[href*="continue"]',
        'faceplate-partial[loading="lazy"]'
      ],
      crowdControl: [
        'button[aria-label*="crowd"]',
        'div[class*="crowd"]',
        'shreddit-comment[collapsed="true"]'
      ],
      contestMode: [
        'button[aria-label*="contest"]',
        'div[class*="contest"]',
        'shreddit-comment[data-contest-mode]'
      ],
      deleted: [
        'button[aria-label*="deleted"]',
        'div[class*="deleted"]',
        'shreddit-comment[data-deleted]'
      ],
      viewRest: [
        'button[aria-label*="View the rest"]',
        'button[aria-label*="View all"]',
        'a[href*="view"]'
      ]
    };

    const selectors = smartSelectors[category] || ['button', 'a'];
    let elements = [];

    for (const selector of selectors) {
      try {
        if (window.elementCache) {
          elements = window.elementCache.cachedQuerySelectorAll(selector);
        } else {
          elements = document.querySelectorAll(selector);
        }
        
        if (elements.length > 0) {
          console.log(`[SelectorFactory] Using smart fallback: ${selector} (found ${elements.length} elements)`);
          break;
        }
      } catch (error) {
        console.warn(`[SelectorFactory] Error with smart selector "${selector}":`, error);
      }
    }

    // If smart fallback fails, try very basic selectors
    if (elements.length === 0) {
      const basicSelectors = {
        moreComments: ['button', 'a'],
        moreReplies: ['button', 'a'],
        collapsed: ['button'],
        continueThread: ['a'],
        crowdControl: ['button', 'div'],
        contestMode: ['button', 'div'],
        deleted: ['button', 'div'],
        viewRest: ['button', 'a']
      };

      const basicSelector = basicSelectors[category] || ['button', 'a'];
      
      for (const selector of basicSelector) {
        try {
          if (window.elementCache) {
            elements = window.elementCache.cachedQuerySelectorAll(selector);
          } else {
            elements = document.querySelectorAll(selector);
          }
          
          if (elements.length > 0) {
            console.log(`[SelectorFactory] Using basic fallback: ${selector} (found ${elements.length} elements)`);
            break;
          }
        } catch (error) {
          console.warn(`[SelectorFactory] Error with basic selector "${selector}":`, error);
        }
      }
    }

    return Array.from(elements);
  }

  /**
   * Get factory statistics
   */
  getStats() {
    const totalSelectors = Object.values(this.selectors).reduce((total, version) => {
      return total + Object.values(version).reduce((sum, category) => sum + category.length, 0);
    }, 0);

    return {
      version: this.version,
      hasSupport: this.hasSupport,
      totalSelectors,
      iconCount: Object.keys(this.icons).length,
      buttonClassCount: Object.keys(this.buttonClasses).length,
      elementTypeCount: Object.keys(this.elements).length
    };
  }

  /**
   * Validate selector syntax
   */
  validateSelector(selector) {
    // Basic validation checks
    if (!selector || typeof selector !== 'string') {
      return false;
    }
    
    // Simple validation - just check for the specific failing case
    if (selector === 'button[') {
      return false;
    }
    
    // Try document.querySelector as validation
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get debug information
   */
  debug() {
    console.log('[SelectorFactory] Debug Information:', {
      version: this.version,
      hasSupport: this.hasSupport,
      stats: this.getStats(),
      icons: this.icons,
      buttonClasses: this.buttonClasses,
      elements: this.elements
    });
    
    // Also log what elements are actually available on the page
    this.debugPageElements();
  }

  /**
   * Debug what elements are available on the current page
   */
  debugPageElements() {
    console.log('[SelectorFactory] Page Element Analysis:');
    
    // Count different types of elements
    const elementCounts = {
      buttons: document.querySelectorAll('button').length,
      anchors: document.querySelectorAll('a').length,
      shredditComments: document.querySelectorAll('shreddit-comment').length,
      faceplateButtons: document.querySelectorAll('faceplate-button').length,
      faceplatePartials: document.querySelectorAll('faceplate-partial').length
    };
    
    console.log('[SelectorFactory] Element counts:', elementCounts);
    
    // Look for elements with specific attributes
    const elementsWithAriaLabel = document.querySelectorAll('[aria-label]');
    const elementsWithDataTestId = document.querySelectorAll('[data-testid]');
    const elementsWithRpl = document.querySelectorAll('[rpl]');
    
    console.log('[SelectorFactory] Elements with aria-label:', elementsWithAriaLabel.length);
    console.log('[SelectorFactory] Elements with data-testid:', elementsWithDataTestId.length);
    console.log('[SelectorFactory] Elements with rpl attribute:', elementsWithRpl.length);
    
    // Show some examples of aria-labels
    if (elementsWithAriaLabel.length > 0) {
      const ariaLabels = Array.from(elementsWithAriaLabel)
        .map(el => el.getAttribute('aria-label'))
        .filter(label => label && (label.includes('more') || label.includes('expand') || label.includes('repl')))
        .slice(0, 5);
      
      if (ariaLabels.length > 0) {
        console.log('[SelectorFactory] Relevant aria-labels found:', ariaLabels);
      }
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.SelectorFactory = SelectorFactory;
  
  // Create global instance
  if (!window.selectorFactory) {
    window.selectorFactory = new SelectorFactory();
    console.log('🔧 [SELECTOR-FACTORY] Global instance created');
  }
}

console.log('🔧 [SELECTOR-FACTORY] SelectorFactory loaded successfully'); 