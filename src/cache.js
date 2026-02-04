/**
 * 讨论缓存系统
 * 用于提高读取性能
 */

const fs = require('fs');
const path = require('path');

class DiscussionCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || 'data/cache';
    this.maxAge = options.maxAge || 300000; // 5 分钟
    this.maxSize = options.maxSize || 100; // 最多缓存 100 个
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // 确保缓存目录存在
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // 生成缓存键
  _generateKey(discussionId, type = 'discussion') {
    return `${type}:${discussionId}`;
  }

  // 获取缓存文件路径
  _getCachePath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.cacheDir, `${safeKey}.json`);
  }

  // 检查缓存是否过期
  _isExpired(entry) {
    if (!entry.timestamp) return true;
    return Date.now() - entry.timestamp > this.maxAge;
  }

  // 清理内存缓存
  _cleanMemoryCache() {
    if (this.memoryCache.size > this.maxSize) {
      // 删除最旧的条目
      const sorted = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toDelete = sorted.slice(0, sorted.length - this.maxSize);
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  // 获取缓存（内存 + 磁盘）
  get(discussionId, type = 'discussion') {
    const key = this._generateKey(discussionId, type);

    // 1. 检查内存缓存
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this._isExpired(memEntry)) {
      this.stats.hits++;
      return memEntry.data;
    }

    // 2. 检查磁盘缓存
    const cachePath = this._getCachePath(key);
    if (fs.existsSync(cachePath)) {
      try {
        const content = fs.readFileSync(cachePath, 'utf8');
        const entry = JSON.parse(content);
        
        if (!this._isExpired(entry)) {
          // 加载到内存
          this.memoryCache.set(key, entry);
          this._cleanMemoryCache();
          this.stats.hits++;
          return entry.data;
        } else {
          // 过期，删除
          fs.unlinkSync(cachePath);
        }
      } catch (err) {
        console.error(`Cache read error: ${err.message}`);
      }
    }

    this.stats.misses++;
    return null;
  }

  // 设置缓存
  set(discussionId, data, type = 'discussion') {
    const key = this._generateKey(discussionId, type);
    const entry = {
      data,
      timestamp: Date.now()
    };

    // 1. 写入内存
    this.memoryCache.set(key, entry);
    this._cleanMemoryCache();

    // 2. 写入磁盘
    const cachePath = this._getCachePath(key);
    try {
      fs.writeFileSync(cachePath, JSON.stringify(entry), 'utf8');
    } catch (err) {
      console.error(`Cache write error: ${err.message}`);
    }

    this.stats.sets++;
  }

  // 删除缓存
  delete(discussionId, type = 'discussion') {
    const key = this._generateKey(discussionId, type);

    // 从内存删除
    this.memoryCache.delete(key);

    // 从磁盘删除
    const cachePath = this._getCachePath(key);
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }

    this.stats.deletes++;
  }

  // 清空所有缓存
  clear() {
    // 清空内存
    this.memoryCache.clear();

    // 清空磁盘
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      });
    }

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();

    // 清理内存
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this._isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // 清理磁盘
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const cachePath = path.join(this.cacheDir, file);
          try {
            const content = fs.readFileSync(cachePath, 'utf8');
            const entry = JSON.parse(content);
            
            if (this._isExpired(entry)) {
              fs.unlinkSync(cachePath);
            }
          } catch (err) {
            // 删除损坏的缓存文件
            fs.unlinkSync(cachePath);
          }
        }
      });
    }
  }

  // 获取统计信息
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100)
      : 0;

    return {
      ...this.stats,
      hitRate,
      memorySize: this.memoryCache.size,
      diskSize: fs.existsSync(this.cacheDir)
        ? fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json')).length
        : 0
    };
  }

  // 预热缓存
  async warmup(orchestrator) {
    const discussions = orchestrator.getAllDiscussions();
    
    for (const discussion of discussions) {
      const data = {
        discussion,
        messages: orchestrator.getDiscussionHistory(discussion.id).messages,
        participants: discussion.participants
      };
      this.set(discussion.id, data);
    }

    return discussions.length;
  }
}

module.exports = { DiscussionCache };
