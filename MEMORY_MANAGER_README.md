# MemoryManager Documentation

## Overview

The `MemoryManager` class provides comprehensive memory management for the Reddit Comment Expander extension. It handles automatic cleanup, observer lifecycle management, memory monitoring, and integration with the CommentExpander.

## Features

### 1. Automatic Cleanup (Every 2 Minutes)
- Automatically cleans up processed elements from WeakSet
- Removes old progress overlays (older than 5 minutes)
- Disconnects orphaned observers
- Configurable cleanup interval (default: 2 minutes)

### 2. Observer Lifecycle Management
- Tracks all active MutationObservers
- Automatically disconnects observers when expansion completes
- Prevents memory leaks from abandoned observers
- Provides context-aware observer registration

### 3. Progress Overlay Cleanup
- Tracks all progress overlays with timestamps
- Automatically removes overlays older than 5 minutes
- Prevents overlay accumulation during long sessions
- Context-aware overlay management

### 4. Memory Usage Monitoring
- Real-time memory usage tracking
- Peak memory usage monitoring
- Memory pressure detection (80% threshold)
- Automatic cleanup triggers on high memory usage
- Memory usage snapshots every 5 minutes

### 5. Page Unload Cleanup
- Automatic cleanup on page unload
- Disconnects all observers
- Removes all progress overlays
- Clears all timers
- Prevents memory leaks on page navigation

### 6. Integration Hooks
- `onExpansionStart()` - Notifies memory manager of expansion start
- `onExpansionComplete()` - Performs post-expansion cleanup
- Automatic observer and overlay cleanup
- Memory statistics reporting

## Usage

### Basic Initialization

```javascript
// Use global instance
const memoryManager = window.memoryManager;

// Or create custom instance
const customManager = new MemoryManager({
  cleanupInterval: 60000, // 1 minute
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  enableMonitoring: true,
  enableAutoCleanup: true,
  logLevel: 'info'
});
```

### Integration with CommentExpander

```javascript
class CommentExpander {
  constructor() {
    this.memoryManager = window.memoryManager;
  }

  async startExpansion(elements) {
    // Notify memory manager
    this.memoryManager.onExpansionStart();
    
    for (const element of elements) {
      // Register element for cleanup
      this.memoryManager.registerProcessedElement(element);
      
      // Create and register observer
      const observer = new MutationObserver(callback);
      this.memoryManager.registerObserver(observer, 'expansion');
      
      // Create and register overlay
      const overlay = this.createProgressOverlay();
      this.memoryManager.registerProgressOverlay(overlay, 'expansion');
      
      // Process element...
    }
    
    // Complete expansion
    this.memoryManager.onExpansionComplete();
  }
}
```

### Memory Monitoring

```javascript
// Get current memory stats
const stats = memoryManager.getMemoryStats();
console.log('Current memory usage:', stats.currentUsageFormatted);
console.log('Peak memory usage:', stats.peakUsageFormatted);
console.log('Active observers:', stats.activeObservers);
console.log('Active overlays:', stats.activeOverlays);

// Get detailed report
const report = memoryManager.getDetailedReport();
console.log('Detailed memory report:', report);
```

### Manual Cleanup

```javascript
// Force immediate cleanup
memoryManager.performCleanup();

// Force full cleanup (disconnects all observers, removes all overlays)
memoryManager.performFullCleanup();

// Reset statistics
memoryManager.resetStats();
```

## API Reference

### Constructor Options

```javascript
const options = {
  cleanupInterval: 120000,        // Auto cleanup interval (ms)
  maxMemoryUsage: 50 * 1024 * 1024, // Max memory usage (bytes)
  enableMonitoring: true,         // Enable memory monitoring
  enableAutoCleanup: true,        // Enable automatic cleanup
  logLevel: 'info'                // Log level: 'debug', 'info', 'warn', 'error'
};
```

### Core Methods

#### `registerProcessedElement(element)`
Registers an element for automatic cleanup.

#### `registerObserver(observer, context)`
Registers a MutationObserver for lifecycle management.

#### `unregisterObserver(observer, context)`
Unregisters and disconnects an observer.

#### `registerProgressOverlay(overlay, context)`
Registers a progress overlay for cleanup.

#### `removeProgressOverlay(overlay, context)`
Removes a progress overlay.

#### `onExpansionStart()`
Notifies memory manager that expansion has started.

#### `onExpansionComplete()`
Notifies memory manager that expansion has completed.

#### `performCleanup()`
Performs standard cleanup (removes old overlays, disconnects orphaned observers).

#### `performFullCleanup()`
Performs full cleanup (disconnects all observers, removes all overlays).

#### `getMemoryStats()`
Returns current memory usage statistics.

#### `getDetailedReport()`
Returns detailed memory report with snapshots.

#### `resetStats()`
Resets all statistics.

#### `destroy()`
Destroys the memory manager and performs full cleanup.

## Memory Statistics

The MemoryManager tracks comprehensive statistics:

```javascript
{
  currentUsage: 1048576,           // Current memory usage (bytes)
  currentUsageFormatted: "1.00 MB", // Formatted current usage
  peakUsage: 2097152,              // Peak memory usage (bytes)
  peakUsageFormatted: "2.00 MB",   // Formatted peak usage
  processedElements: 150,          // Total elements processed
  activeObservers: 5,              // Currently active observers
  activeOverlays: 3,               // Currently active overlays
  totalCleanups: 12,               // Total cleanups performed
  lastCleanup: 1640995200000,      // Timestamp of last cleanup
  memorySnapshots: 24,             // Number of memory snapshots
  isExpanding: false,              // Whether expansion is in progress
  isMonitoring: true               // Whether monitoring is active
}
```

## Best Practices

1. **Always register elements**: Use `registerProcessedElement()` for all processed elements
2. **Register observers**: Use `registerObserver()` for all MutationObservers
3. **Register overlays**: Use `registerProgressOverlay()` for all progress overlays
4. **Use lifecycle hooks**: Call `onExpansionStart()` and `onExpansionComplete()`
5. **Monitor memory usage**: Regularly check `getMemoryStats()`
6. **Handle cleanup**: Use `performCleanup()` when needed
7. **Destroy properly**: Call `destroy()` on page unload

## Integration Example

See `memory-manager-integration-example.js` for a complete integration example showing how to use MemoryManager with CommentExpander.

## Troubleshooting

### High Memory Usage
- Check if observers are being properly disconnected
- Verify overlays are being removed
- Monitor memory snapshots for trends
- Consider reducing cleanup interval

### Memory Leaks
- Ensure all observers are registered with MemoryManager
- Verify `onExpansionComplete()` is called
- Check for orphaned overlays
- Use `performFullCleanup()` for debugging

### Performance Issues
- Adjust cleanup interval based on usage patterns
- Monitor memory snapshots for optimization opportunities
- Consider disabling monitoring in production if not needed
- Use appropriate log levels 