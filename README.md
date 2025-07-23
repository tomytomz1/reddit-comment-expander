# Reddit Comment Expander Pro

A Chrome extension that automatically expands all Reddit comments for better browsing experience.

## Features

### 🆓 Free Version
- **Basic Expansion**: Expand standard collapsed comments and "more replies" buttons
- **Multi-Platform Support**: Works on old.reddit.com, new.reddit.com, and sh.reddit.com
- **Essential Accessibility**: Screen reader support and keyboard navigation
- **Floating Action Button**: Convenient floating button with usage tracking
- **Keyboard Shortcuts**: Alt+Shift+E to expand, Alt+Shift+C to cancel
- **Basic Progress Tracking**: Simple progress indicator
- **5 Expansions Per Day**: Daily limit for free users
- **Thread Size Limit**: Up to 5,000 comments per thread

### 💎 Pro Version ($4.99/month)
- **Unlimited Expansions**: No daily limits
- **Advanced Features**: Crowd Control, Contest Mode, and deleted comment handling
- **Smart Filters**: Filter by karma, user, and awards
- **Inline Thread Continuation**: Load content without navigation
- **Real-time Progress**: Detailed progress with time estimates
- **Export Features**: Save threads as Markdown, PDF, or HTML
- **Advanced Settings**: Granular control over expansion behavior
- **Performance Metrics**: Detailed expansion statistics
- **Cloud Sync**: Sync settings across devices
- **Custom Themes**: Personalize the interface
- **Priority Queue**: Optimize expansion order
- **Background Preloading**: Faster expansion for large threads

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this extension folder
4. Navigate to any Reddit comment page on old.reddit.com
5. Look for the floating orange button in the bottom right corner

## Usage

### Floating Action Button
- Navigate to any Reddit comment page (old.reddit.com, new.reddit.com, or sh.reddit.com)
- Click the orange floating button (↕️) in the bottom right corner
- All collapsed comments and "load more" links will be expanded
- Right-click for context menu with additional options

### Keyboard Shortcuts
- **Alt+Shift+E**: Expand all comments
- **Alt+Shift+C**: Cancel current expansion
- **Alt+Shift+S**: Open settings
- **Alt+Shift+H**: Show help dialog
- **Escape**: Cancel any operation

### Extension Popup
- Click the extension icon in your browser toolbar
- Click "Expand All" button in the popup
- Customize settings: batch size, delays, notifications, and expansion preferences
- Works on the currently active Reddit comment page

## File Structure

```
Reddit Comment Expander/
├── manifest.json                 # Extension manifest (Manifest V3)
├── src/
│   ├── content/
│   │   ├── content.js           # Main content script logic
│   │   └── content.css          # Styles for floating button
│   ├── popup/
│   │   ├── popup.html           # Extension popup interface
│   │   ├── popup.css            # Popup styling
│   │   └── popup.js             # Popup functionality
│   ├── background/
│   │   └── background.js        # Service worker (Manifest V3)
│   └── shared/                  # Shared utilities (future use)
└── assets/
    └── icons/                   # Extension icons (placeholder)
```

## How It Works

1. **Platform Detection**: Automatically detects Reddit version (old, new, or shreddit)
2. **Element Scanning**: Uses comprehensive selectors to find all expandable elements
3. **Priority Queue**: Processes elements by priority (visible comments first)
4. **Intelligent Expansion**: Different strategies for each comment type
5. **Rate Limiting**: Adaptive delays to prevent overwhelming Reddit's servers
6. **Progress Tracking**: Real-time updates with time estimates
7. **Accessibility**: Screen reader announcements and keyboard navigation

## Current Limitations

### Free Version
- 5 expansions per day limit
- Maximum 5,000 comments per thread
- Basic expansion only (no advanced features)
- Manual trigger only (no auto-expand)

### Pro Version
- Some dynamically loaded comments may require multiple clicks
- Rate limiting may affect very large comment threads
- Inline thread continuation is planned for future versions

## Development

The extension follows Chrome extension best practices:
- **Manifest V3**: Latest extension manifest version
- **Service Workers**: Modern background script implementation
- **Minimal Permissions**: Uses `activeTab` instead of broad permissions
- **Content Security Policy**: Proper security implementation
- **Performance Monitoring**: Tracks expansion performance with detailed metrics
- **Error Boundaries**: Comprehensive error handling with user feedback
- **Privacy Compliant**: No data collection or transmission
- **Accessibility**: Full WCAG 2.1 AA compliance with screen reader support
- **Modular Architecture**: Clean separation of concerns with reusable components

### Chrome Web Store Compliance
- ✅ Manifest V3
- ✅ Minimal required permissions
- ✅ Privacy policy included
- ✅ Proper error handling
- ✅ Performance monitoring
- ✅ Security best practices
- ✅ Accessibility compliance
- ✅ Keyboard navigation support

## Console Logs

The extension provides detailed console logging:
- Reddit version detection and platform features
- Element scanning with selector fallbacks
- Expansion progress with category breakdown
- Performance metrics and timing
- Error tracking and recovery attempts
- Accessibility announcements

Open browser DevTools (F12) to view these logs while using the extension.