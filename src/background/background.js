console.log('Reddit Comment Expander Pro: Background service worker loaded');

// Background service worker for Manifest V3
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      autoExpand: false,
      showFloatingButton: true,
      enableNotifications: true
    });
  }
  
  // Note: Context menu removed to follow Chrome best practices
  // Users can access functionality via popup or floating button
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'EXPANSION_COMPLETE':
      console.log(`Expansion complete: ${message.count} comments expanded`);
      break;
      
    case 'EXPANSION_ERROR':
      console.error('Expansion error:', message.error);
      console.error('Error details:', message.details);
      break;
      
    case 'CONTENT_SCRIPT_ERROR':
      console.error('Content script error:', message.error);
      console.error('Error stack:', message.stack);
      console.error('Error location:', message.location);
      break;
      
    case 'INITIALIZATION_ERROR':
      console.error('Initialization error:', message.error);
      break;
      
    case 'ERROR_BOUNDARY_REPORT':
      // Handle error boundary reports with detailed logging
      console.group('🛡️ Error Boundary Report');
      console.error('Error:', message.error);
      console.log('Context:', message.context);
      console.log('URL:', message.url);
      console.log('Timestamp:', new Date(message.timestamp).toISOString());
      if (message.stats) {
        console.log('Error Statistics:', message.stats);
      }
      console.groupEnd();
      
      // Store error for analytics (optional)
      try {
        chrome.storage.local.get(['errorReports'], (result) => {
          const reports = result.errorReports || [];
          reports.push({
            ...message,
            reportedAt: Date.now()
          });
          
          // Keep only last 100 error reports
          if (reports.length > 100) {
            reports.splice(0, reports.length - 100);
          }
          
          chrome.storage.local.set({ errorReports: reports });
        });
      } catch (storageError) {
        console.warn('Failed to store error report:', storageError);
      }
      break;
      
    case 'PING':
      // Health check for extension context
      sendResponse({ status: 'ok', timestamp: Date.now() });
      break;
      
    case 'GET_SETTINGS':
      chrome.storage.sync.get(['autoExpand', 'showFloatingButton', 'enableNotifications'], (result) => {
        sendResponse(result);
      });
      return true; // Keep message channel open for async response
      
    case 'UPDATE_SETTINGS':
      chrome.storage.sync.set(message.settings, () => {
        sendResponse({ success: true });
      });
      return true;
      
    default:
      console.log('Unknown message type:', message.type);
  }
});

// Context menu functionality removed to follow Chrome best practices
// Users can access functionality via popup or floating button