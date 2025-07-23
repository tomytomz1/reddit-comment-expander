# Reddit Comment Expander Chrome Extension - Enhanced Technical Specification

## Context & Role
You are a senior Chrome Extension developer with expertise in DOM manipulation, asynchronous JavaScript, performance optimization, and web accessibility standards. Build a production-ready Chrome extension that automatically expands all Reddit comments, supporting both legacy and modern Reddit interfaces, with special attention to accessibility and real-world user pain points.

## Project Overview

**Extension Name:** Reddit Comment Expander Pro  
**Version:** 1.0.0  
**Manifest Version:** 3  
**Primary Use Case:** Enable users to expand all comments in Reddit threads for comprehensive searching, screen reader compatibility, and full thread consumption. Critical for users with visual impairments who rely on text-to-speech tools.

## Technical Requirements

### Core Functionality

1. **Comprehensive Expansion Engine**
   - Detect and expand ALL comment types:
     - "Load more comments" (top-level)
     - "X more replies" (nested comments)
     - "Continue this thread →" (deep nesting)
     - "[+]" collapsed comments (downvoted/hidden)
     - **Crowd Control collapsed comments** (new Reddit feature)
     - **Contest mode hidden comments** (randomized threads)
     - "View the rest of the comments" (large threads)
     - **Deleted/removed comments** (show [deleted] content)
   - **Inline loading**: Load "Continue this thread" content directly in page without navigation
   - Handle Reddit's rate limiting with intelligent backoff
   - Process expansion in priority order: visible comments first, then load more

2. **Accessibility First Design**
   - **Screen Reader Compatibility**: 
     - Ensure all expanded content is properly announced by NVDA, JAWS, TalkBack
     - Add ARIA labels to expansion status
     - Announce completion to screen readers
   - **Read Aloud Integration**: Compatible with Speechify, Read Aloud, and browser TTS
   - **Keyboard Navigation**: Full functionality without mouse
   - **Focus Management**: Maintain reading position during expansion

3. **Platform Support**
   - **new.reddit.com**: React-based SPA with dynamic content
   - **old.reddit.com**: Server-rendered with jQuery enhancements  
   - **sh.reddit.com**: New Reddit redesign (2024+)
   - **reddit.com** (redirect handling)
   - **Mobile web view**: Responsive design considerations
   - **Reddit official app webviews**: Handle in-app browsers

4. **Performance Requirements**
   - **No UI freezing**: Use requestIdleCallback and chunking
   - **Large thread handling**: Test with r/AskReddit threads (50,000+ comments)
   - **Memory efficiency**: < 50MB for threads with 10,000+ comments
   - **Batch processing**: 50ms max per batch to maintain 60fps
   - **Intelligent queueing**: Prioritize visible comments
   - **Progress tracking**: Show real-time expansion count

### User Interface

1. **Enhanced Status Overlay**
   ```
   Position: Fixed bottom-right (draggable)
   Content:
   - "Expanding comments..." (with progress bar)
   - Real-time counter: "X of Y elements expanded"
   - Category breakdown: "X comments, Y threads, Z collapsed"
   - Time estimate: "~X seconds remaining"
   - Completion: "✅ All comments expanded (X total)"
   - Error states: "⚠️ Rate limited, retrying in Xs..."
   - Pause/Resume button
   ```

2. **Floating Action Button**
   - Position: Bottom-right (customizable)
   - States: Idle, Expanding (animated), Complete, Error
   - Click to expand all or cancel operation
   - Right-click for quick settings

3. **Controls & Settings**
   - Browser action popup with:
     - "Expand All" with options (comments only, media, etc.)
     - Auto-expand toggles by subreddit
     - Expansion preferences (what to expand)
     - Statistics dashboard
   - Keyboard shortcuts: 
     - Alt+Shift+E: Expand all
     - Alt+Shift+C: Cancel expansion
     - Alt+Shift+S: Toggle auto-expand
   - Context menu options per comment type

### Implementation Architecture

```
reddit-comment-expander/
├── manifest.json
├── src/
│   ├── content/
│   │   ├── content.js          # Main content script
│   │   ├── reddit-detector.js  # Platform detection
│   │   ├── expander.js         # Core expansion logic
│   │   ├── ui-overlay.js       # Status overlay
│   │   └── utils.js            # Helper functions
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── background/
│   │   └── service-worker.js   # Message handling
│   ├── licensing/
│   │   ├── license-manager.js  # License validation
│   │   ├── feature-gates.js    # Feature access control
│   │   └── payment-flow.js     # Stripe integration
│   ├── analytics/
│   │   └── conversion-tracker.js # Privacy-focused analytics
│   └── shared/
│       └── constants.js        # Shared configuration
├── assets/
│   ├── icons/
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   └── styles/
│       ├── overlay.css
│       └── upgrade-prompts.css
├── backend-api/               # Separate repo/service
│   ├── license-server.js      # Node.js/Express API
│   ├── stripe-webhooks.js     # Payment processing
│   └── database-schema.sql    # User/license storage
└── README.md
```

### Detailed Technical Specifications

#### 1. Element Detection Strategy

```javascript
// Enhanced selectors for all Reddit versions and features
const SELECTORS = {
  newReddit: {
    moreComments: '[data-testid="post-comment-list"] button:has-text("View Entire Discussion")',
    moreReplies: 'div[id^="moreComments-"] button',
    continueThread: 'a:has-text("Continue this thread")',
    collapsed: 'button[aria-label="Expand comment"]',
    crowdControl: '[data-testid="comment-crowd-control-collapsed"]',
    contestMode: '[data-testid="comment-hidden-contest-mode"]',
    deleted: '[data-testid="comment-deleted-collapsed"]'
  },
  oldReddit: {
    moreComments: '.morecomments > a.button',
    moreReplies: '.morechildren > a',
    continueThread: 'a:contains("Continue this thread")',
    collapsed: '.collapsed > .entry > .tagline > a.expand',
    crowdControl: '.comment.crowd-control-collapsed',
    contestMode: '.comment[data-contest-mode="true"]',
    deleted: '.comment.deleted > .entry'
  },
  shReddit: { // New 2024+ Reddit
    moreComments: 'shreddit-comment-tree button[slot="more-comments-button"]',
    continueThread: 'faceplate-partial[loading="lazy"]',
    collapsed: 'shreddit-comment[collapsed="true"]'
  }
};

// Intelligent platform detection
function detectRedditVersion() {
  if (document.querySelector('shreddit-app')) return 'shReddit';
  if (document.querySelector('#2x-container')) return 'newReddit';
  if (document.querySelector('.reddit-infobar')) return 'oldReddit';
  return 'unknown';
}
```

#### 2. Enhanced Expansion Algorithm

```javascript
class CommentExpander {
  constructor() {
    this.queue = new PriorityQueue(); // Visible items first
    this.processed = new WeakSet();
    this.stats = { 
      expanded: 0, 
      failed: 0, 
      retries: 0,
      crowdControl: 0,
      contestMode: 0,
      continuedThreads: 0
    };
    this.rateLimiter = new ExponentialBackoff(100, 5000);
    this.observers = new Map(); // Track multiple observers
  }

  async expandAll(options = {}) {
    const {
      expandDeleted = true,
      expandCrowdControl = true,
      expandContestMode = true,
      inlineThreadContinuation = true,
      respectUserPreferences = true
    } = options;

    // 1. Announce to screen readers
    this.announceToScreenReader('Beginning comment expansion');
    
    // 2. Initial scan with priority scoring
    await this.scanAndQueueElements();
    
    // 3. Process queue with intelligent batching
    while (!this.queue.isEmpty() || this.hasActiveObservers()) {
      const batch = this.queue.dequeueBatch(10); // Adaptive batch size
      await this.processBatch(batch);
      
      // 4. Handle inline thread continuation
      if (inlineThreadContinuation) {
        await this.loadContinuedThreadsInline();
      }
      
      // 5. Update UI and check for new elements
      await this.updateProgress();
      await this.checkForNewElements();
      
      // 6. Yield to browser for smooth performance
      await this.yieldToBrowser();
    }
    
    // 7. Final announcement
    this.announceToScreenReader(`Expansion complete. ${this.stats.expanded} comments expanded.`);
  }

  async loadContinuedThreadsInline() {
    // Fetch and inject continued threads without navigation
    const continuedLinks = document.querySelectorAll(SELECTORS[this.redditVersion].continueThread);
    
    for (const link of continuedLinks) {
      if (this.processed.has(link)) continue;
      
      try {
        const response = await fetch(link.href, { credentials: 'include' });
        const html = await response.text();
        const comments = this.extractCommentsFromHTML(html);
        
        // Inject comments directly after the link
        this.injectCommentsInline(link, comments);
        this.stats.continuedThreads++;
      } catch (error) {
        console.error('Failed to load continued thread:', error);
      }
    }
  }

  setupAccessibilityFeatures() {
    // Create live region for screen reader announcements
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'reddit-expander-sr-only';
    document.body.appendChild(this.liveRegion);
  }

  announceToScreenReader(message) {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
      // Clear after announcement
      setTimeout(() => this.liveRegion.textContent = '', 1000);
    }
  }
}
```

#### 3. Enhanced Error Handling & Edge Cases

- **Rate Limiting**: 
  - Detect 429/503 responses and Reddit's "you're doing that too much"
  - Implement adaptive backoff based on response headers
  - Show user-friendly countdown in overlay
- **Crowd Control**: 
  - Detect and handle special collapsed state
  - Notify users about restricted comments
  - Respect subreddit moderation settings
- **Contest Mode**:
  - Identify randomized threads
  - Expand all hidden comments despite random ordering
  - Maintain position after expansion
- **Infinite Loops**: 
  - Track clicked elements with WeakSet
  - Detect circular "Continue this thread" references
  - Maximum depth limiting
- **Memory Management**:
  - Clean up observers on navigation
  - Garbage collect processed elements
  - Limit queue size for mega-threads
- **React/SPA Navigation**:
  - Detect soft navigation in new Reddit
  - Reinitialize on route changes
  - Preserve expansion state when possible
- **Authentication**:
  - Detect login walls for NSFW/quarantined content
  - Gracefully handle 403 errors
  - Suggest login for full access
- **Deleted/Removed Content**:
  - Expand to show [deleted] or [removed]
  - Handle moderator-removed vs user-deleted
- **Reddit API Changes**: 
  - Feature detection over version detection
  - Fallback selectors for each element type
  - Self-healing selector updates

### Accessibility Features (Critical)

1. **Screen Reader Support**:
   - ARIA live regions for status updates
   - Proper heading structure for expanded content
   - Skip links for navigation
   - Compatibility with NVDA, JAWS, TalkBack, VoiceOver

2. **Text-to-Speech Integration**:
   - Compatible with Read Aloud, Speechify, Natural Reader
   - Preserve reading order after expansion
   - Add pauses between comment sections

3. **Visual Accessibility**:
   - High contrast mode support
   - Respect prefers-reduced-motion
   - Clear visual indicators for expansion state
   - Focus indicators meeting WCAG 2.1 AA

### User-Requested Features

1. **Smart Expansion Options**:
   - Expand only comments with positive karma
   - Skip heavily downvoted threads (optional)
   - Expand only from specific users
   - Expand only gilded/awarded comments

2. **Subreddit-Specific Settings**:
   - Auto-expand rules per subreddit
   - Remember expansion preferences
   - Contest mode handling per sub
   - Crowd control respect options

3. **Integration Features**:
   - Reddit Enhancement Suite compatibility
   - Work with Reddit moderator toolbox
   - Preserve RES tags during expansion
   - Compatible with old.reddit redirect extensions

4. **Advanced Options**:
   - Export expanded thread to markdown
   - Save expansion state locally
   - Bulk operations across multiple tabs
   - Expansion history/statistics

### Security Considerations

1. **Permissions** (minimal required):
   ```json
   "permissions": ["activeTab", "storage", "idle"],
   "host_permissions": ["*://*.reddit.com/*", "*://*.redd.it/*"]
   ```

2. **Content Security Policy**:
   - No inline scripts or eval()
   - No external dependencies
   - Sanitize injected HTML content
   - XSS prevention for inline thread loading

3. **Privacy**:
   - No data collection or analytics
   - All processing client-side
   - Local storage only for user preferences
   - No external API calls except Reddit

### Testing Requirements

1. **Real-World Test Scenarios**:
   - r/AskReddit mega-threads (50,000+ comments)
   - r/WritingPrompts with deep nesting
   - Contest mode threads (r/photoshopbattles)
   - Crowd control heavy subs (r/science)
   - NSFW/Quarantined subreddits
   - Live threads during events
   - Threads with heavy moderation

2. **Accessibility Testing**:
   - NVDA on Windows (most common)
   - JAWS compatibility
   - VoiceOver on macOS
   - Read Aloud extension interaction
   - Keyboard-only navigation

3. **Performance Testing**:
   - Memory profiling on 10K+ comment threads
   - CPU usage monitoring
   - Frame rate analysis during expansion
   - Battery impact on laptops

4. **Cross-Platform Testing**:
   - Chrome, Edge, Brave, Opera
   - Different Reddit interfaces
   - Mobile browsers (responsive)
   - Reddit app webviews

### Performance Benchmarks (User-Validated)

- Small thread (< 100 comments): < 1 second
- Medium thread (100-1,000 comments): < 5 seconds  
- Large thread (1,000-10,000 comments): < 30 seconds
- Mega thread (10,000+ comments): < 2 minutes with progress
- Memory overhead: < 10MB base + 3KB per 100 comments
- CPU usage: < 50% on single core
- No dropped frames during expansion

### Implementation Priorities

1. **Phase 1 (MVP - Week 1)**:
   - Basic expansion for all comment types
   - Old Reddit support (simpler DOM)
   - Screen reader compatibility
   - Progress indicator
   - **Free tier limitations implementation**
   - **Basic usage tracking**

2. **Phase 2 (Accessibility & Monetization - Week 2)**:
   - Full ARIA implementation
   - Keyboard navigation
   - Text-to-speech optimization
   - **License validation system**
   - **Stripe payment integration**
   - **Upgrade prompts UI**

3. **Phase 3 (Performance & Pro Features - Week 3)**:
   - New Reddit (React) support  
   - Crowd Control handling
   - Contest mode support
   - Advanced queueing system
   - **Pro-only features implementation**
   - **Analytics integration**

4. **Phase 4 (Polish & Backend - Week 4)**:
   - Subreddit-specific settings
   - RES integration
   - Export features
   - **Backend API deployment**
   - **Subscription management**
   - **Team/Enterprise features**

## Backend Requirements (Separate Service)

### API Endpoints
```javascript
// License Management API
POST   /api/validate          // Validate license key
POST   /api/activate          // Activate new license
GET    /api/subscription      // Get subscription details
POST   /api/usage            // Track usage metrics

// Payment API  
POST   /api/create-checkout   // Create Stripe session
POST   /api/webhook          // Stripe webhook handler
GET    /api/pricing          // Get current pricing
POST   /api/apply-discount   // Apply edu/bulk discount

// Analytics API
POST   /api/analytics        // Event tracking
GET    /api/metrics         // Conversion metrics (admin)
```

### Database Schema
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  stripe_customer_id VARCHAR(255)
);

-- Licenses table
CREATE TABLE licenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  key VARCHAR(255) UNIQUE NOT NULL,
  tier ENUM('free', 'pro', 'team', 'enterprise'),
  status ENUM('active', 'expired', 'cancelled'),
  expires_at TIMESTAMP,
  device_limit INTEGER DEFAULT 5
);

-- Usage tracking
CREATE TABLE usage_events (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES licenses(id),
  event_type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Infrastructure Requirements
- Node.js/Express server
- PostgreSQL database
- Redis for caching
- Stripe account
- SSL certificate
- CDN for assets
- Monitoring (Sentry)
- Analytics (privacy-focused)

## Implementation Best Practices

- **Start with old.reddit.com** (cleaner DOM, easier testing)
- **Use MutationObserver carefully** (disconnect after X mutations)
- **Implement "stop" functionality** (users need escape hatch)
- **Test with screen readers early** (accessibility is critical)
- **Profile memory usage** on r/AskReddit threads
- **Handle soft navigation** in new Reddit SPA
- **Respect user preferences** (some collapse for a reason)
- **Consider battery impact** on mobile devices

## Code Architecture

```javascript
// Modular architecture for maintainability
const RedditExpander = {
  core: {
    detector: new PlatformDetector(),
    expander: new CommentExpander(),
    queue: new PriorityQueue(),
    rateLimiter: new AdaptiveRateLimiter()
  },
  
  ui: {
    overlay: new StatusOverlay(),
    fab: new FloatingActionButton(),
    settings: new SettingsManager(),
    upgradePrompts: new UpgradePromptManager()
  },
  
  accessibility: {
    announcer: new ScreenReaderAnnouncer(),
    keyboardNav: new KeyboardNavigator(),
    focusManager: new FocusManager()
  },
  
  integration: {
    res: new RESCompatibility(),
    tts: new TextToSpeechBridge()
  },
  
  monetization: {
    license: new LicenseManager(),
    features: new FeatureGatekeeper(),
    payments: new PaymentManager(),
    analytics: new ConversionAnalytics()
  }
};
```

## Success Metrics & KPIs

### User Acquisition
- Free tier adoption rate
- Chrome Web Store rating (target: 4.5+)
- Weekly active users
- Retention rate (7-day, 30-day)

### Monetization
- Free to paid conversion rate (target: 3-5%)
- Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)
- Churn rate (target: <5% monthly)

### Feature Usage
- Daily expansions per user
- Most used Pro features
- Accessibility feature adoption
- Export feature usage

### Technical Performance
- Expansion success rate (>99%)
- Average expansion time by thread size
- Memory usage percentiles
- Crash rate (<0.1%)

---

**Critical Success Factors**:
1. Must work reliably with screen readers (many users are visually impaired)
2. Must not freeze the browser on large threads
3. Must handle Reddit's various comment hiding mechanisms
4. Must provide clear value in free tier while incentivizing upgrades
5. Must be resilient to Reddit DOM changes
6. Must respect user privacy while tracking necessary metrics

**Begin implementation with accessibility-first approach and clear free/paid feature separation from the start.**