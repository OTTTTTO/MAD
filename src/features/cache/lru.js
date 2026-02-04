/**
 * LRU (Least Recently Used) 缓存实现
 * 用于缓存讨论、搜索结果等数据
 */

class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，如果不存在返回 null
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    // 移到最后（最近使用）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    this.hits++;
    return value;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   */
  set(key, value) {
    // 删除旧的（如果存在）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 设置新的
    this.cache.set(key, value);

    // 检查容量
    if (this.cache.size > this.maxSize) {
      // 删除最久未使用的（第一个）
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 获取缓存大小
   * @returns {number} 当前缓存项数量
   */
  size() {
    return this.cache.size;
  }

  /**
   * 获取缓存统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      utilization: this.cache.size / this.maxSize
    };
  }

  /**
   * 获取所有缓存键
   * @returns {Array} 缓存键数组（从最久未使用到最近使用）
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有缓存值
   * @returns {Array} 缓存值数组
   */
  values() {
    return Array.from(this.cache.values());
  }

  /**
   * 批量设置
   * @param {Array} items - [{key, value}, ...]
   */
  setMany(items) {
    items.forEach(({ key, value }) => {
      this.set(key, value);
    });
  }

  /**
   * 批量获取
   * @param {Array} keys - 键数组
   * @returns {Map} 键值对映射
   */
  getMany(keys) {
    const result = new Map();
    keys.forEach(key => {
      result.set(key, this.get(key));
    });
    return result;
  }
}

/**
 * 讨论缓存管理器
 */
class DiscussionCacheManager {
  constructor(maxSize = 50) {
    this.discussions = new LRUCache(maxSize);
    this.messages = new LRUCache(maxSize * 10); // 消息缓存更大
    this.searchResults = new LRUCache(30);
  }

  /**
   * 缓存讨论
   */
  cacheDiscussion(discussionId, data) {
    this.discussions.set(`discussion:${discussionId}`, data);
  }

  /**
   * 获取缓存的讨论
   */
  getDiscussion(discussionId) {
    return this.discussions.get(`discussion:${discussionId}`);
  }

  /**
   * 缓存消息
   */
  cacheMessages(discussionId, page, messages) {
    const key = `messages:${discussionId}:${page}`;
    this.messages.set(key, messages);
  }

  /**
   * 获取缓存的消息
   */
  getMessages(discussionId, page) {
    return this.messages.get(`messages:${discussionId}:${page}`);
  }

  /**
   * 缓存搜索结果
   */
  cacheSearchResults(query, results) {
    const key = `search:${query}`;
    this.searchResults.set(key, results);
  }

  /**
   * 获取缓存的搜索结果
   */
  getSearchResults(query) {
    return this.searchResults.get(`search:${query}`);
  }

  /**
   * 清除特定讨论的缓存
   */
  clearDiscussionCache(discussionId) {
    this.discussions.delete(`discussion:${discussionId}`);
    
    // 清除该讨论的所有消息缓存
    const messageKeys = this.messages.keys().filter(k => 
      k.startsWith(`messages:${discussionId}:`)
    );
    messageKeys.forEach(key => this.messages.delete(key));
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    this.discussions.clear();
    this.messages.clear();
    this.searchResults.clear();
  }

  /**
   * 获取整体缓存统计
   */
  getStats() {
    return {
      discussions: this.discussions.getStats(),
      messages: this.messages.getStats(),
      searchResults: this.searchResults.getStats()
    };
  }
}

module.exports = { LRUCache, DiscussionCacheManager };
