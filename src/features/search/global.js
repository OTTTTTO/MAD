/**
 * 全局搜索管理器
 * 跨所有讨论、消息、快照进行搜索
 */

class GlobalSearchManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.searchHistory = [];
    this.maxHistorySize = 100;
    this.searchIndex = new Map(); // 搜索索引缓存
  }

  /**
   * 全局搜索
   * @param {string} query - 搜索关键词
   * @param {Object} options - 搜索选项
   * @returns {Object} 搜索结果
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    
    const {
      scope = 'all', // all, discussions, messages, snapshots
      limit = 50,
      offset = 0,
      sortBy = 'relevance' // relevance, date, agent
    } = options;

    // 保存到搜索历史
    this.saveSearchHistory(query, options);

    const results = {
      discussions: [],
      messages: [],
      snapshots: [],
      total: 0,
      query,
      duration: 0
    };

    const lowerQuery = query.toLowerCase();

    // 搜索讨论
    if (scope === 'all' || scope === 'discussions') {
      const discussions = this.orchestrator.listDiscussions();
      results.discussions = discussions
        .filter(d => {
          return d.topic.toLowerCase().includes(lowerQuery) ||
                 (d.description && d.description.toLowerCase().includes(lowerQuery));
        })
        .map(d => ({
          ...d,
          relevanceScore: this.calculateRelevance(d.topic, query)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // 搜索消息
    if (scope === 'all' || scope === 'messages') {
      const discussions = this.orchestrator.listDiscussions();
      
      for (const discussion of discussions) {
        const context = this.orchestrator.contexts.get(discussion.id);
        if (context) {
          const matchingMessages = context.messages
            .filter(m => m.content.toLowerCase().includes(lowerQuery))
            .map(m => ({
              ...m,
              discussionId: discussion.id,
              discussionTopic: discussion.topic,
              relevanceScore: this.calculateRelevance(m.content, query)
            }));

          results.messages.push(...matchingMessages);
        }
      }

      // 按相关性排序
      results.messages.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // 搜索快照
    if (scope === 'all' || scope === 'snapshots') {
      const discussions = this.orchestrator.listDiscussions();
      
      for (const discussion of discussions) {
        if (this.orchestrator.snapshots) {
          const snapshots = this.orchestrator.snapshots.get(discussion.id) || [];
          const matchingSnapshots = snapshots
            .filter(s => 
              s.name.toLowerCase().includes(lowerQuery) ||
              (s.description && s.description.toLowerCase().includes(lowerQuery))
            )
            .map(s => ({
              ...s,
              discussionId: discussion.id,
              discussionTopic: discussion.topic
            }));

          results.snapshots.push(...matchingSnapshots);
        }
      }
    }

    // 计算总数
    results.total = results.discussions.length + results.messages.length + results.snapshots.length;

    // 应用分页
    if (limit) {
      results.discussions = results.discussions.slice(offset, offset + limit);
      results.messages = results.messages.slice(offset, offset + limit);
      results.snapshots = results.snapshots.slice(offset, offset + limit);
    }

    // 计算搜索时间
    results.duration = Date.now() - startTime;

    return results;
  }

  /**
   * 计算相关性分数
   * @param {string} text - 文本
   * @param {string} query - 查询
   * @returns {number} 相关性分数（0-1）
   */
  calculateRelevance(text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // 精确匹配
    if (lowerText === lowerQuery) return 1.0;

    // 包含完整查询
    if (lowerText.includes(lowerQuery)) {
      // 位置越靠前，分数越高
      const position = lowerText.indexOf(lowerQuery);
      return 0.8 + (1 - position / lowerText.length) * 0.2;
    }

    // 部分匹配（查询的每个词）
    const queryWords = lowerQuery.split(/\s+/);
    let matchCount = 0;
    
    queryWords.forEach(word => {
      if (lowerText.includes(word)) matchCount++;
    });

    if (matchCount > 0) {
      return matchCount / queryWords.length * 0.6;
    }

    return 0;
  }

  /**
   * 保存搜索历史
   */
  saveSearchHistory(query, options) {
    const entry = {
      query,
      options,
      timestamp: Date.now(),
      resultsCount: 0 // 将在搜索完成后更新
    };

    this.searchHistory.unshift(entry);

    // 限制历史大小
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(limit = 20) {
    return this.searchHistory.slice(0, limit);
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory() {
    this.searchHistory = [];
  }

  /**
   * 获取热门关键词
   */
  getHotKeywords(limit = 10) {
    const keywordCounts = new Map();

    this.searchHistory.forEach(entry => {
      const words = entry.query.split(/\s+/);
      words.forEach(word => {
        if (word.length > 1) {
          keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
        }
      });
    });

    // 转换为数组并排序
    const sorted = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([keyword, count]) => ({ keyword, count }));

    return sorted;
  }

  /**
   * 获取搜索建议
   */
  getSearchSuggestions(query, limit = 5) {
    if (!query || query.length < 2) {
      return this.getHotKeywords(limit).map(k => k.keyword);
    }

    const lowerQuery = query.toLowerCase();
    const suggestions = new Set();

    // 从搜索历史中查找
    this.searchHistory.forEach(entry => {
      if (entry.query.toLowerCase().startsWith(lowerQuery)) {
        suggestions.add(entry.query);
      }
    });

    // 从讨论主题中查找
    const discussions = this.orchestrator.listDiscussions();
    discussions.forEach(d => {
      if (d.topic.toLowerCase().startsWith(lowerQuery)) {
        suggestions.add(d.topic);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * 获取搜索统计
   */
  getSearchStats() {
    const totalSearches = this.searchHistory.length;
    const uniqueQueries = new Set(this.searchHistory.map(h => h.query)).size;
    const avgQueryLength = this.searchHistory.reduce((sum, h) => 
      sum + h.query.length, 0) / totalSearches || 0;

    return {
      totalSearches,
      uniqueQueries,
      avgQueryLength: Math.round(avgQueryLength * 10) / 10,
      hotKeywords: this.getHotKeywords(5)
    };
  }
}

module.exports = { GlobalSearchManager };
