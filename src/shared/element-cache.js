console.log('🚀 [ELEMENT-CACHE] File loading and executing...');
// Intelligent Element Cache for Reddit Comment Expander
// Features: TTL, LRU, mutation observer, stats, Reddit integration

class ElementCache {
  constructor({ ttl = 30000, cleanupInterval = 10000, maxSize = 100 } = {}) {
    this.ttl = ttl; // 30 seconds
    this.cleanupInterval = cleanupInterval; // 10 seconds
    this.maxSize = maxSize;
    this.cache = new Map(); // key: selector, value: {elements, timestamp, lastAccess}
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      memoryUsage: 0,
      operations: 0,
      timeSaved: 0 // ms
    };
    this.lruOrder = [];
    this._startCleanup();
    this._setupMutationObserver();
    window.addEventListener('beforeunload', () => this.clear());
  }

  _getKey(selector) {
    return selector;
  }

  get(selector) {
    const key = this._getKey(selector);
    const now = Date.now();
    const entry = this.cache.get(key);
    this.stats.operations++;
    if (entry && (now - entry.timestamp < this.ttl)) {
      entry.lastAccess = now;
      this._updateLru(key);
      this.stats.hits++;
      this.stats.timeSaved += entry.queryTime || 0;
      if (this.stats.operations % 50 === 0) {
        this._logStats();
      }
      return entry.elements;
    } else {
      this.stats.misses++;
      if (entry) this.cache.delete(key);
      const t0 = performance.now();
      const elements = Array.from(document.querySelectorAll(selector));
      const t1 = performance.now();
      this.set(selector, elements, t1 - t0);
      if (this.stats.operations % 50 === 0) {
        this._logStats();
      }
      return elements;
    }
  }

  set(selector, elements, queryTime = 0) {
    const key = this._getKey(selector);
    const now = Date.now();
    if (this.cache.size >= this.maxSize) {
      this._evictLru();
    }
    this.cache.set(key, {
      elements,
      timestamp: now,
      lastAccess: now,
      queryTime
    });
    this._updateLru(key);
    this._updateMemoryUsage();
  }

  clear() {
    this.cache.clear();
    this.lruOrder = [];
    this._updateMemoryUsage();
  }

  invalidate() {
    this.clear();
    this.stats.invalidations++;
    if (this.stats.operations % 50 === 0) {
      this._logStats();
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total ? Math.round((this.stats.hits / total) * 100) : 0;
    const missRate = total ? Math.round((this.stats.misses / total) * 100) : 0;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      invalidations: this.stats.invalidations,
      cacheSize: this.cache.size,
      memoryUsage: this.stats.memoryUsage,
      hitRate: hitRate + '%',
      missRate: missRate + '%',
      timeSaved: Math.round(this.stats.timeSaved) + 'ms'
    };
  }

  preWarm(selectors) {
    selectors.forEach(selector => {
      this.set(selector, Array.from(document.querySelectorAll(selector)));
    });
  }

  cachedQuerySelectorAll(selector) {
    return this.get(selector);
  }

  _updateLru(key) {
    const idx = this.lruOrder.indexOf(key);
    if (idx !== -1) this.lruOrder.splice(idx, 1);
    this.lruOrder.push(key);
  }

  _evictLru() {
    const oldest = this.lruOrder.shift();
    if (oldest) this.cache.delete(oldest);
  }

  _startCleanup() {
    this._cleanupTimer = setInterval(() => this._cleanupExpired(), this.cleanupInterval);
  }

  _cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttl) {
        this.cache.delete(key);
        const idx = this.lruOrder.indexOf(key);
        if (idx !== -1) this.lruOrder.splice(idx, 1);
      }
    }
    this._updateMemoryUsage();
  }

  _updateMemoryUsage() {
    // Estimate: 200 bytes per entry + 100 bytes per element
    let usage = 0;
    for (const entry of this.cache.values()) {
      usage += 200 + (entry.elements.length * 100);
    }
    this.stats.memoryUsage = usage;
  }

  _setupMutationObserver() {
    // Only observe Reddit content areas
    const redditContent = document.querySelector('div[data-testid="post-container"], .Comment, .shreddit-comment, #siteTable');
    if (!redditContent) return;
    this._observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
          this.invalidate();
          break;
        }
      }
    });
    this._observer.observe(redditContent, { childList: true, subtree: true });
  }

  _logStats() {
    const stats = this.getStats();
    console.log(`[Cache] Hit rate: ${stats.hitRate} | Miss rate: ${stats.missRate} | Size: ${stats.cacheSize} | Time saved: ${stats.timeSaved}`);
  }
}

console.log('🔍 [DEBUG] ElementCache class before export:', typeof ElementCache);
console.log('🔍 [DEBUG] ElementCache constructor:', ElementCache);
// Export for testing
if (typeof window !== 'undefined') {
  window.ElementCache = ElementCache;
  window.elementCache = new ElementCache();
  console.log('✅ ElementCache loaded and exposed');
} 