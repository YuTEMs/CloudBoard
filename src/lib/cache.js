/**
 * Application-level caching utilities
 * Provides in-memory caching with TTL and LRU eviction
 */

class CacheEntry {
  constructor(value, ttl) {
    this.value = value
    this.expiresAt = Date.now() + ttl
    this.lastAccessed = Date.now()
  }

  isExpired() {
    return Date.now() > this.expiresAt
  }

  touch() {
    this.lastAccessed = Date.now()
  }
}

class Cache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100
    this.defaultTTL = options.defaultTTL || 60000 // 1 minute default
    this.cache = new Map()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return undefined
    }

    if (entry.isExpired()) {
      this.cache.delete(key)
      this.misses++
      return undefined
    }

    entry.touch()
    this.hits++
    return entry.value
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, new CacheEntry(value, ttl))
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (entry.isExpired()) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    const total = this.hits + this.misses
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%'
    }
  }

  /**
   * Evict oldest/least recently used entries
   */
  evictOldest() {
    let oldestKey = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key)
        return
      }
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const toDelete = []
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        toDelete.push(key)
      }
    }
    toDelete.forEach(key => this.cache.delete(key))
  }
}

// Create cache instances for different data types
export const boardsCache = new Cache({
  maxSize: 200,
  defaultTTL: 30000 // 30 seconds for board lists
})

export const boardCache = new Cache({
  maxSize: 100,
  defaultTTL: 60000 // 1 minute for individual boards
})

export const userCache = new Cache({
  maxSize: 500,
  defaultTTL: 300000 // 5 minutes for user data
})

export const queryCache = new Cache({
  maxSize: 50,
  defaultTTL: 60000 // 1 minute for query results
})

// Periodic cleanup (run every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    boardsCache.cleanup()
    boardCache.cleanup()
    userCache.cleanup()
    queryCache.cleanup()
  }, 300000) // 5 minutes
}

/**
 * Helper function to wrap async operations with caching
 * @param {string} key - Cache key
 * @param {Function} fn - Async function to execute on cache miss
 * @param {Cache} cache - Cache instance to use
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<*>} Cached or fresh value
 */
export async function withCache(key, fn, cache = queryCache, ttl = undefined) {
  // Check cache first
  const cached = cache.get(key)
  if (cached !== undefined) {
    return cached
  }

  // Execute function on cache miss
  const result = await fn()

  // Cache the result
  cache.set(key, result, ttl)

  return result
}

/**
 * Generate cache key for board queries
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {string} Cache key
 */
export function getBoardsCacheKey(userId, options = {}) {
  return `boards:${userId}:${JSON.stringify(options)}`
}

/**
 * Generate cache key for single board
 * @param {string} boardId - Board ID
 * @returns {string} Cache key
 */
export function getBoardCacheKey(boardId) {
  return `board:${boardId}`
}

/**
 * Invalidate all board caches for a user
 * @param {string} userId - User ID
 */
export function invalidateUserBoards(userId) {
  // Clear all board list caches for this user
  for (const key of boardsCache.cache.keys()) {
    if (key.startsWith(`boards:${userId}`)) {
      boardsCache.delete(key)
    }
  }
}

/**
 * Invalidate specific board cache
 * @param {string} boardId - Board ID
 */
export function invalidateBoardCache(boardId) {
  boardCache.delete(getBoardCacheKey(boardId))

  // Also invalidate any board lists that might contain this board
  // This is a simple approach - clear all board list caches
  boardsCache.clear()
}

/**
 * Get all cache statistics
 * @returns {object} All cache stats
 */
export function getAllCacheStats() {
  return {
    boards: boardsCache.getStats(),
    board: boardCache.getStats(),
    user: userCache.getStats(),
    query: queryCache.getStats()
  }
}

export default {
  boardsCache,
  boardCache,
  userCache,
  queryCache,
  withCache,
  getBoardsCacheKey,
  getBoardCacheKey,
  invalidateUserBoards,
  invalidateBoardCache,
  getAllCacheStats
}