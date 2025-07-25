// Enhanced Reddit Platform Detection and Element Selectors
class RedditDetector {
  constructor() {
    this.version = this.detectRedditVersion();
    this.selectors = this.getSelectors();
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
          'faceplate-button[slot="more-comments-button"]',
          // Main "View more comments" button at bottom of page
          'button:has(svg[icon-name="caret-down-outline"])',
          'button:has(span:contains("View more comments"))',
          'button.button-brand:has(svg[icon-name="caret-down-outline"])',
          '#top-level-more-comments-partial button',
          '#top-level-more-comments-partial',
          'faceplate-partial[id*="more-comments"]',
          'faceplate-partial[class*="top-level"]',
          // Additional selectors for standalone "View more comments" buttons
          'button.button-brand[rpl]',
          'button.button-small.button-brand',
          'button[class*="button-brand"][class*="inline-flex"]'
        ],
        moreReplies: [
          // Use :has if supported, fallback to JS filtering
          'button:has(svg[icon-name="join-outline"])',
          // Additional selectors for new button variations
          'button[rpl]:has(svg[icon-name="join-outline"])',
          'button.button-small:has(svg[icon-name="join-outline"])',
          'button.button-plain:has(svg[icon-name="join-outline"])',
          'button.icon:has(svg[icon-name="join-outline"])',
          // Fallback selectors that don't use :has (for broader browser support)
          'button[rpl]',
          'button.button-small', 
          'button.button-plain',
          'button.icon',
          // More specific selectors for the new button format
          'button.text-neutral-content-strong',
          'button.bg-neutral-background',
          'button.inline-flex',
          // Very specific selector for the exact button format shown by user
          'button[rpl].text-neutral-content-strong.bg-neutral-background.button-small.button-plain.icon.inline-flex',
          // Broader selectors to catch variations
          'button.text-neutral-content-strong.bg-neutral-background',
          'button.button-small.button-plain.icon',
          'button[rpl].inline-flex',
          // NEW: Add support for anchor/link elements that also serve as "more replies"
          'a[slot="more-comments-permalink"]:has(svg[icon-name="join-outline"])',
          'a:has(svg[icon-name="join-outline"]):has(span:contains("More replies"))',
          'a.text-tone-2:has(svg[icon-name="join-outline"])',
          // Fallback anchor selectors
          'a[slot="more-comments-permalink"]',
          'a[id*="comments-permalink"]',
          // NEW: Add support for buttons inside summary/details elements (collapsible sections)
          'summary button:has(svg[icon-name="join-outline"])',
          'details button:has(svg[icon-name="join-outline"])',
          'summary button[rpl]:has(svg[icon-name="join-outline"])',
          'details button[rpl]:has(svg[icon-name="join-outline"])',
          'summary button.text-neutral-content-strong:has(svg[icon-name="join-outline"])',
          'details button.text-neutral-content-strong:has(svg[icon-name="join-outline"])',
          // Fallback selectors for summary/details (without :has support)
          'summary button[rpl]',
          'details button[rpl]',
          'summary button.text-neutral-content-strong',
          'details button.text-neutral-content-strong',
          'summary button.bg-neutral-background',
          'details button.bg-neutral-background'
        ],
        continueThread: [
          'faceplate-partial[loading="lazy"]:not([id*="more-comments"])',
          'faceplate-partial[loading="lazy"]:not(.top-level)',
          'shreddit-comment-tree faceplate-partial:not([id*="more-comments"])',
          'a[href*="/comments/"]'
        ],
        collapsed: [
          'shreddit-comment button:has(svg[icon-name="join-outline"])',
          'shreddit-comment button:has(svg[icon-name="plus"])',
          'shreddit-comment button:has(svg[icon-name="plus-outline"])',
          'shreddit-comment button:has(svg[icon-name="expand"])',
          'shreddit-comment button:has(svg[icon-name="expand-outline"])',
          'shreddit-comment button[aria-expanded="false"]',
          'shreddit-comment button[aria-label="Expand comment"]',
          'faceplate-button[aria-expanded="false"]',
          // Additional selectors for new button variations
          'shreddit-comment button[rpl]:has(svg[icon-name="join-outline"])',
          'shreddit-comment button[rpl]:has(svg[icon-name="plus"])',
          'shreddit-comment button[rpl]:has(svg[icon-name="plus-outline"])',
          'shreddit-comment button.button-small:has(svg[icon-name="join-outline"])',
          'shreddit-comment button.button-small:has(svg[icon-name="plus"])',
          'shreddit-comment button.button-plain:has(svg[icon-name="join-outline"])',
          'shreddit-comment button.button-plain:has(svg[icon-name="plus"])',
          'shreddit-comment button.icon:has(svg[icon-name="join-outline"])',
          'shreddit-comment button.icon:has(svg[icon-name="plus"])',
          // Fallback selectors that don't use :has
          'shreddit-comment button[rpl]',
          'shreddit-comment button.button-small',
          'shreddit-comment button.button-plain',
          'shreddit-comment button.icon',
          // NEW: Specific selectors for collapsed deleted comments
          'shreddit-comment[collapsed] button:has(svg[icon-name="join-outline"])',
          'shreddit-comment[collapsed] button:has(svg[icon-name="plus"])',
          'shreddit-comment[is-author-deleted="true"] button:has(svg[icon-name="join-outline"])',
          'shreddit-comment[is-author-deleted="true"] button:has(svg[icon-name="plus"])',
          'shreddit-comment[collapsed] button.text-neutral-content-strong',
          'shreddit-comment[is-author-deleted="true"] button.text-neutral-content-strong',
          // General selectors for the new button format in collapsed comments
          'shreddit-comment button.text-neutral-content-strong.bg-neutral-background',
          'shreddit-comment button.button-small.button-plain.icon',
          'shreddit-comment button[rpl].inline-flex',
          // Fallback selectors for collapsed comments
          'shreddit-comment[collapsed] button',
          'shreddit-comment[is-author-deleted="true"] button'
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
            elements = Array.from(window.elementCache ? window.elementCache.cachedQuerySelectorAll('button, a') : document.querySelectorAll('button, a')).filter(elem => {
              const hasJoinOutline = elem.querySelector('svg[icon-name="join-outline"]');
              // Accept any button or anchor with join-outline icon, regardless of text content or container
              // This handles both old format (with "X more replies" text) and new format (icon-only)
              // AND handles both buttons in shreddit-comment and standalone buttons
              // AND handles buttons inside summary/details elements
              if (hasJoinOutline) {
                const inSummary = elem.closest('summary') !== null;
                const inDetails = elem.closest('details') !== null;
                console.log('[Detector] Found element with join-outline via manual filtering:', {
                  tagName: elem.tagName,
                  inSummary,
                  inDetails,
                  html: elem.outerHTML.substring(0, 150) + '...'
                });
              }
              return hasJoinOutline;
            });
            if (elements.length > 0) {
              usedSelector = 'manual moreReplies join-outline (updated for new format, standalone buttons, and summary/details)';
              console.log(`Found ${elements.length} moreReplies elements using manual filtering: ${usedSelector}`);
              break;
            }
          }
        }
        
        // Additional fallback specifically for new button/anchor format
        if (category === 'moreReplies' && this.version === 'shReddit' && elements.length === 0) {
          // Try to find the new button/anchor format specifically
          const newFormatElements = Array.from(window.elementCache ? window.elementCache.cachedQuerySelectorAll('button[rpl].text-neutral-content-strong, button.bg-neutral-background.button-small, button.inline-flex.icon, a[slot="more-comments-permalink"], a[id*="comments-permalink"]') : document.querySelectorAll('button[rpl].text-neutral-content-strong, button.bg-neutral-background.button-small, button.inline-flex.icon, a[slot="more-comments-permalink"], a[id*="comments-permalink"]')).filter(elem => {
            const hasJoinOutline = elem.querySelector('svg[icon-name="join-outline"]');
            if (hasJoinOutline) {
              console.log('[Detector] Found new format button/anchor with join-outline:', elem.outerHTML.substring(0, 150) + '...');
            }
            return hasJoinOutline;
          });
          
          // ENHANCED: Also look for standalone buttons with join-outline that might not be in shreddit-comment
          const standaloneButtons = Array.from(window.elementCache ? window.elementCache.cachedQuerySelectorAll('button') : document.querySelectorAll('button')).filter(btn => {
            const hasJoinOutline = btn.querySelector('svg[icon-name="join-outline"]');
            const hasRplAttr = btn.hasAttribute('rpl');
            const hasNewClasses = btn.classList.contains('text-neutral-content-strong') ||
                                  btn.classList.contains('bg-neutral-background') ||
                                  btn.classList.contains('button-small') ||
                                  btn.classList.contains('button-plain') ||
                                  btn.classList.contains('icon') ||
                                  btn.classList.contains('inline-flex');
            
            // IMPORTANT: Filter out Reddit's navigation/UI buttons that aren't comment-related
            const isNavigationButton = btn.id && (
              btn.id.includes('navbar') ||
              btn.id.includes('header-action') ||
              btn.id.includes('user-drawer') ||
              btn.id.includes('nav-expand') ||
              btn.id.includes('nav-collapse') ||
              btn.id.includes('menu-button') ||
              btn.id.includes('chat-button') ||
              btn.id.includes('inbox-button')
            );
            
            // Only include buttons that have join-outline AND are not navigation buttons
            return hasJoinOutline && !isNavigationButton;
          });
          
          if (standaloneButtons.length > 0) {
            console.log(`[Detector] Found ${standaloneButtons.length} standalone buttons with join-outline (filtered out navigation buttons)`);
            elements.push(...standaloneButtons);
          }
          
          // NEW: Specific fallback for anchor elements with slot="children-*" and join-outline icons
          const childrenSlotAnchors = Array.from(window.elementCache ? window.elementCache.cachedQuerySelectorAll('a[slot^="children-"]') : document.querySelectorAll('a[slot^="children-"]')).filter(anchor => {
            const hasJoinOutline = anchor.querySelector('svg[icon-name="join-outline"]');
            const hasMoreRepliesText = anchor.textContent && (
              anchor.textContent.toLowerCase().includes('more reply') ||
              anchor.textContent.toLowerCase().includes('more replies')
            );
            
            if (hasJoinOutline) {
              console.log('[Detector] Found anchor with children-* slot and join-outline:', {
                slot: anchor.getAttribute('slot'),
                hasMoreRepliesText,
                textContent: anchor.textContent?.trim(),
                html: anchor.outerHTML.substring(0, 150) + '...'
              });
            }
            
            // Include anchors with join-outline icon that have children-* slot
            return hasJoinOutline;
          });
          
          if (childrenSlotAnchors.length > 0) {
            console.log(`[Detector] Found ${childrenSlotAnchors.length} anchor elements with children-* slot and join-outline`);
            elements.push(...childrenSlotAnchors);
          }
          
          // Combine all sets of elements
          const allNewFormatElements = [...newFormatElements, ...elements];
          
          if (allNewFormatElements.length > 0) {
            elements = allNewFormatElements;
            usedSelector = 'manual new-format moreReplies (buttons, anchors, children-slot anchors, and standalone)';
            console.log(`Found ${elements.length} moreReplies elements using enhanced new format fallback: ${usedSelector}`);
          }
        }
        
        // Additional fallback for collapsed comments with new button format
        if (category === 'collapsed' && this.version === 'shReddit' && elements.length === 0) {
          // Try to find collapsed comments with the new button format
          const collapsedElements = Array.from(window.elementCache ? window.elementCache.cachedQuerySelectorAll('shreddit-comment[collapsed] button, shreddit-comment[is-author-deleted="true"] button, shreddit-comment button.text-neutral-content-strong.bg-neutral-background') : document.querySelectorAll('shreddit-comment[collapsed] button, shreddit-comment[is-author-deleted="true"] button, shreddit-comment button.text-neutral-content-strong.bg-neutral-background')).filter(btn => {
            const hasJoinOutline = btn.querySelector('svg[icon-name="join-outline"]');
            const hasPlus = btn.querySelector('svg[icon-name="plus"]');
            const hasPlusOutline = btn.querySelector('svg[icon-name="plus-outline"]');
            const hasExpand = btn.querySelector('svg[icon-name="expand"]');
            const hasExpandOutline = btn.querySelector('svg[icon-name="expand-outline"]');
            const hasExpandableIcon = hasJoinOutline || hasPlus || hasPlusOutline || hasExpand || hasExpandOutline;
            
            if (hasExpandableIcon) {
              console.log('[Detector] Found collapsed comment with expandable icon:', {
                joinOutline: hasJoinOutline,
                plus: hasPlus,
                plusOutline: hasPlusOutline,
                expand: hasExpand,
                expandOutline: hasExpandOutline,
                html: btn.outerHTML.substring(0, 150) + '...'
              });
            }
            return hasExpandableIcon;
          });
          
          if (collapsedElements.length > 0) {
            elements = collapsedElements;
            usedSelector = 'manual collapsed comments (new format)';
            console.log(`Found ${elements.length} collapsed elements using new format fallback: ${usedSelector}`);
          }
        }
        
        // Fallback for main "View more comments" button
        if (category === 'moreComments' && this.version === 'shReddit' && selector.includes(':has')) {
          // If :has is not supported, do manual filtering
          if (!CSS.supports('selector(:has(*))')) {
            elements = Array.from(window.elementCache ? window.elementCache.cachedQuerySelectorAll('button') : document.querySelectorAll('button')).filter(btn => {
              const hasCaretIcon = btn.querySelector('svg[icon-name="caret-down-outline"]');
              const hasViewMoreText = /view more comments/i.test(btn.textContent);
              const isBrandButton = btn.classList.contains('button-brand');
              const hasInlineFlexClass = btn.classList.contains('inline-flex');
              
              return (hasCaretIcon && hasViewMoreText) || 
                     (isBrandButton && hasViewMoreText) ||
                     (isBrandButton && hasInlineFlexClass && /more.*comment/i.test(btn.textContent));
            });
            if (elements.length > 0) {
              usedSelector = 'manual moreComments caret-down-outline + brand buttons';
              break;
            }
            continue;
          }
        }
        // For all other selectors, use the cache if available
        const found = window.elementCache ? window.elementCache.cachedQuerySelectorAll(selector) : document.querySelectorAll(selector);
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
    console.log(`[Filter] Starting filterElements for category: ${category}, elements: ${elements.length}`);
    return elements.filter(element => {
      // Debug: log every element that enters filtering
      console.log(`[Filter] Checking element for ${category}:`, element.tagName, element.outerHTML.substring(0, 200) + '...');
      
      // Additional debug logging for new button format
      if (element.tagName === 'BUTTON') {
        const hasRplAttr = element.hasAttribute('rpl');
        const hasJoinOutline = element.querySelector('svg[icon-name="join-outline"]');
        const hasNewClasses = element.classList.contains('button-small') || 
                              element.classList.contains('button-plain') || 
                              element.classList.contains('icon') ||
                              element.classList.contains('text-neutral-content-strong') ||
                              element.classList.contains('bg-neutral-background');
        
        if (hasRplAttr || hasNewClasses) {
          console.log(`[Filter] Found potential new button format for ${category}:`, {
            hasRplAttr,
            hasJoinOutline: !!hasJoinOutline,
            hasNewClasses,
            classList: Array.from(element.classList),
            textContent: element.textContent?.trim()
          });
        }
      }
      
      // Skip already processed elements
      if (element.dataset.redditExpanderProcessed) {
        console.log(`[Filter] Skipping processed element for ${category}`);
        return false;
      }

      // Skip disabled or loading elements
      if (element.disabled || 
          element.textContent.toLowerCase().includes('loading') ||
          element.textContent.toLowerCase().includes('please wait')) {
        console.log(`[Filter] Skipping disabled/loading element for ${category}`);
        return false;
      }

      // Skip navigation links that might cause page changes
      if (element.tagName === 'A' && element.href) {
        const href = element.href.toLowerCase();
        
        // NEW: Allow anchor elements with slot="children-*" and join-outline icons to pass through
        // These are inline expansion links, not navigation links
        const hasChildrenSlot = element.getAttribute('slot') && element.getAttribute('slot').startsWith('children-');
        const hasJoinOutline = element.querySelector('svg[icon-name="join-outline"]');
        
        if (hasChildrenSlot && hasJoinOutline) {
          console.log(`[Filter] Allowing children-slot anchor with join-outline (inline expansion):`, {
            slot: element.getAttribute('slot'),
            href: href,
            category: category
          });
          // Don't skip this element - it's an inline expansion link
        } else if (category !== 'collapsed' && href.includes('/comment/') && href.split('/').length > 5) {
          console.log(`[Filter] Skipping single comment link for ${category}`);
          return false; // Skip single comment links
        }
      }

      // --- PRECISE FILTERING FOR EXPANDABLE ELEMENTS ---
      // Universal skip for forbidden icons, slots, or text
      const forbiddenIconNames = [
        'upvote-outline', 'downvote-outline', 'share', 'award', 'insight', 'overflow'
      ];
      const forbiddenSlotNames = [
        'vote-button', 'comment-share', 'comment-award', 'comment-insight', 'overflow'
      ];
      const forbiddenText = [
        'upvote', 'downvote', 'share', 'award', 'insight', 'open chat', 'chat'
      ];
      // Check for forbidden icon-names
      const hasForbiddenIcon = element.querySelectorAll && Array.from(element.querySelectorAll('svg[icon-name]'))
        .some(svg => forbiddenIconNames.includes(svg.getAttribute('icon-name')));
      // Check for forbidden slot names
      const slot = element.getAttribute && element.getAttribute('slot');
      const hasForbiddenSlot = slot && forbiddenSlotNames.includes(slot);
      // Check for forbidden text (but be more lenient for buttons with join-outline icon)
      const text = element.textContent && element.textContent.toLowerCase();
      const hasJoinOutlineIcon = element.querySelector && element.querySelector('svg[icon-name="join-outline"]');
      const hasForbiddenText = !hasJoinOutlineIcon && forbiddenText.some(word => text && text.includes(word));
      
      if (hasForbiddenIcon || hasForbiddenSlot || hasForbiddenText) {
        console.log(`[Filter] Skipping forbidden icon/slot/text for ${category}`, {
          hasForbiddenIcon,
          hasForbiddenSlot, 
          hasForbiddenText,
          hasJoinOutlineIcon
        });
        return false;
      }

      if (category === 'moreReplies') {
        // Relax the filtering - support both buttons and anchor elements with join-outline icon
        const isButton = element.tagName === 'BUTTON';
        const isAnchor = element.tagName === 'A';
        const hasJoinOutline = element.querySelector && element.querySelector('svg[icon-name="join-outline"]');
        
        // Additional check for new button variations
        const hasRplAttribute = element.hasAttribute('rpl');
        const hasIconClass = element.classList.contains('icon');
        const hasButtonClasses = element.classList.contains('button-small') || 
                                element.classList.contains('button-plain');
        const hasNewClasses = element.classList.contains('text-neutral-content-strong') ||
                              element.classList.contains('bg-neutral-background') ||
                              element.classList.contains('inline-flex');
        
        // Check for anchor-specific attributes
        const hasMoreCommentsSlot = element.getAttribute('slot') === 'more-comments-permalink';
        const hasChildrenSlot = element.getAttribute('slot') && element.getAttribute('slot').startsWith('children-');
        const hasPermalinkId = element.id && element.id.includes('comments-permalink');
        const hasMoreRepliesText = element.textContent && element.textContent.toLowerCase().includes('more replies');
        
        // Debug logging for new button/anchor format
        if ((isButton || isAnchor) && (hasRplAttribute || hasNewClasses || hasMoreCommentsSlot || hasChildrenSlot)) {
          console.log('[Filter] New button/anchor format detected:', {
            tagName: element.tagName,
            hasJoinOutline,
            hasRplAttribute,
            hasIconClass,
            hasButtonClasses,
            hasNewClasses,
            hasMoreCommentsSlot,
            hasChildrenSlot,
            hasPermalinkId,
            hasMoreRepliesText,
            classList: Array.from(element.classList),
            outerHTML: element.outerHTML.substring(0, 200) + '...'
          });
        }
        
        if (!((isButton || isAnchor) && hasJoinOutline)) {
          // More specific logging for new button/anchor format
          if ((isButton || isAnchor) && (hasNewClasses || hasMoreCommentsSlot) && !hasJoinOutline) {
            console.log(`[Filter] New button/anchor format found but missing join-outline icon:`, element.outerHTML.substring(0, 200) + '...');
          }
          console.log(`[Filter] Skipping moreReplies element for ${category} (not button/anchor or no join-outline)`);
          return false;
        }
        
        // Accept buttons and anchors with join-outline icon regardless of text content
        // This handles both old format (with "X more replies" text) and new format (icon-only)
        console.log(`[Filter] Accepting moreReplies button/anchor:`, element.outerHTML.substring(0, 100) + '...');
        return true;
      }
      if (category === 'moreComments') {
        // Allow button with caret-down-outline icon OR faceplate-partial containing such button
        const isButton = element.tagName === 'BUTTON';
        const isFaceplatePartial = element.tagName === 'FACEPLATE-PARTIAL';
        
        if (isButton) {
          const hasCaretDown = element.querySelector && element.querySelector('svg[icon-name="caret-down-outline"]');
          const hasViewMoreText = /view more comments/i.test(element.textContent);
          const isBrandButton = element.classList.contains('button-brand');
          
          // Allow if it has caret-down icon and text, OR if it's a brand button with view more text
          if (!(hasCaretDown && hasViewMoreText) && !(isBrandButton && hasViewMoreText)) {
            console.log(`[Filter] Skipping moreComments button for ${category} (no caret-down+text or not brand+text)`);
            return false;
          }
        } else if (isFaceplatePartial) {
          // For faceplate-partial, check if it's the top-level more comments partial
          const isTopLevelMoreComments = element.id === 'top-level-more-comments-partial' || 
                                       element.classList.contains('top-level') ||
                                       /more.*comments/i.test(element.getAttribute('src') || '');
          if (!isTopLevelMoreComments) {
            console.log(`[Filter] Skipping faceplate-partial for ${category} (not top-level more comments)`);
            return false;
          }
        } else {
          console.log(`[Filter] Skipping moreComments element for ${category} (not button or faceplate-partial)`);
          return false;
        }
      }
      if (category === 'continueThread') {
        // Filter out navigation and non-comment related faceplate-partial elements
        elements = elements.filter(elem => {
          const src = elem.getAttribute('src') || '';
          const name = elem.getAttribute('name') || '';
          
          // Exclude navigation sidebar elements and chat elements
          const isNavigationElement = src.includes('left-nav') || 
                                     src.includes('header-action') ||
                                     src.includes('reddit-chat') ||
                                     src.includes('chat-channel') ||
                                     src.includes('shreddit') ||
                                     name.includes('LeftNav') ||
                                     name.includes('HeaderAction') ||
                                     name.includes('Chat') ||
                                     name.includes('ChatChannel') ||
                                     name.includes('RedditChat');
          
          if (isNavigationElement) {
            console.log('[Filter] Excluding navigation/chat faceplate-partial:', elem.getAttribute('name') || elem.getAttribute('src'));
            return false;
          }
          
          // Only include comment-related faceplate-partial elements
          const isCommentRelated = src.includes('comment') || 
                                   src.includes('more-comments') ||
                                   name.includes('Comment') ||
                                   elem.closest('shreddit-comment');
          
          return isCommentRelated;
        });
      }
      if (category === 'collapsed') {
        // Allow <button> with descendant svg[icon-name="join-outline"] or other expandable icons within shreddit-comment
        const isButton = element.tagName === 'BUTTON';
        const hasJoinOutline = element.querySelector && element.querySelector('svg[icon-name="join-outline"]');
        const hasPlus = element.querySelector && element.querySelector('svg[icon-name="plus"]');
        const hasPlusOutline = element.querySelector && element.querySelector('svg[icon-name="plus-outline"]');
        const hasExpand = element.querySelector && element.querySelector('svg[icon-name="expand"]');
        const hasExpandOutline = element.querySelector && element.querySelector('svg[icon-name="expand-outline"]');
        const hasExpandableIcon = hasJoinOutline || hasPlus || hasPlusOutline || hasExpand || hasExpandOutline;
        
        // Additional check for new button variations
        const hasRplAttribute = element.hasAttribute('rpl');
        const hasIconClass = element.classList.contains('icon');
        const hasButtonClasses = element.classList.contains('button-small') || 
                                element.classList.contains('button-plain');
        const hasNewClasses = element.classList.contains('text-neutral-content-strong') ||
                              element.classList.contains('bg-neutral-background') ||
                              element.classList.contains('inline-flex');
        
        // Check if the button is within a collapsed comment
        const parentComment = element.closest('shreddit-comment');
        const isInCollapsedComment = parentComment && (
          parentComment.hasAttribute('collapsed') ||
          parentComment.getAttribute('is-author-deleted') === 'true'
        );
        
        // Debug logging for collapsed elements
        if (isButton && (hasExpandableIcon || hasNewClasses || isInCollapsedComment)) {
          console.log('[Filter] Collapsed element check:', {
            tagName: element.tagName,
            isButton,
            hasJoinOutline,
            hasPlus,
            hasPlusOutline,
            hasExpand,
            hasExpandOutline,
            hasExpandableIcon,
            hasRplAttribute,
            hasIconClass,
            hasButtonClasses,
            hasNewClasses,
            isInCollapsedComment,
            parentCollapsed: parentComment?.hasAttribute('collapsed'),
            parentDeleted: parentComment?.getAttribute('is-author-deleted'),
            classList: Array.from(element.classList),
            outerHTML: element.outerHTML.substring(0, 200) + '...'
          });
        }
        
        if (!(isButton && hasExpandableIcon)) {
          // More specific logging for collapsed elements
          if (isButton && (hasNewClasses || isInCollapsedComment) && !hasExpandableIcon) {
            console.log(`[Filter] Collapsed button found but missing expandable icon:`, element.outerHTML.substring(0, 200) + '...');
          }
          console.log(`[Filter] Skipping collapsed element for ${category} (not button or no expandable icon)`);
          return false;
        }
        
        // Accept buttons with any expandable icon in collapsed comments
        console.log(`[Filter] Accepting collapsed comment button:`, element.outerHTML.substring(0, 100) + '...');
        return true;
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