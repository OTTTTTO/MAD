/**
 * 分页加载器
 * 用于高效加载大量数据
 */

class PaginatedLoader {
  constructor(items, options = {}) {
    const {
      pageSize = 50,
      totalCount = items.length
    } = options;

    this.items = items;
    this.pageSize = pageSize;
    this.totalCount = totalCount;
    this.currentPage = 0;
  }

  /**
   * 加载下一页
   * @returns {Array} 当前页的数据
   */
  loadNext() {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    const page = this.items.slice(start, end);

    if (page.length > 0) {
      this.currentPage++;
    }

    return {
      data: page,
      page: this.currentPage,
      pageSize: this.pageSize,
      hasMore: end < this.items.length,
      totalItems: this.items.length
    };
  }

  /**
   * 加载上一页
   */
  loadPrevious() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }

    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;

    return {
      data: this.items.slice(start, end),
      page: this.currentPage + 1,
      pageSize: this.pageSize,
      hasMore: this.currentPage > 0,
      totalItems: this.items.length
    };
  }

  /**
   * 加载指定页
   * @param {number} page - 页码（从 1 开始）
   */
  loadPage(page) {
    if (page < 1) page = 1;
    
    const start = (page - 1) * this.pageSize;
    const end = start + this.pageSize;

    return {
      data: this.items.slice(start, end),
      page,
      pageSize: this.pageSize,
      hasMore: end < this.items.length,
      hasPrevious: page > 1,
      totalItems: this.items.length
    };
  }

  /**
   * 获取总页数
   */
  getTotalPages() {
    return Math.ceil(this.items.length / this.pageSize);
  }

  /**
   * 获取当前页码
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * 重置到第一页
   */
  reset() {
    this.currentPage = 0;
  }

  /**
   * 设置页面大小
   */
  setPageSize(size) {
    this.pageSize = size;
    this.currentPage = 0; // 重置到第一页
  }

  /**
   * 获取分页信息
   */
  getPageInfo() {
    const totalPages = this.getTotalPages();
    const currentPage = this.getCurrentPage();

    return {
      currentPage,
      totalPages,
      pageSize: this.pageSize,
      totalItems: this.items.length,
      hasNextPage: currentPage < totalPages - 1,
      hasPreviousPage: currentPage > 0
    };
  }
}

/**
 * 讨论消息分页管理器
 */
class DiscussionMessagePager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.defaultPageSize = 50;
  }

  /**
   * 获取讨论的消息（分页）
   * @param {string} discussionId - 讨论 ID
   * @param {number} page - 页码（从 1 开始）
   * @param {number} pageSize - 每页大小
   * @returns {Object} 分页数据
   */
  async getMessages(discussionId, page = 1, pageSize = this.defaultPageSize) {
    const context = this.orchestrator.contexts.get(discussionId);
    
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const messages = context.messages || [];
    const totalMessages = messages.length;
    const totalPages = Math.ceil(totalMessages / pageSize);

    // 确保页码有效
    if (page < 1) page = 1;
    if (page > totalPages && totalPages > 0) page = totalPages;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = messages.slice(start, end);

    return {
      data: pageData,
      pagination: {
        page,
        pageSize,
        totalItems: totalMessages,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * 按时间范围获取消息
   * @param {string} discussionId - 讨论 ID
   * @param {number} startTime - 开始时间戳
   * @param {number} endTime - 结束时间戳
   * @param {number} limit - 限制数量
   */
  async getMessagesByTimeRange(discussionId, startTime, endTime, limit = 100) {
    const context = this.orchestrator.contexts.get(discussionId);
    
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const messages = (context.messages || []).filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );

    return {
      data: messages.slice(0, limit),
      timeRange: {
        startTime,
        endTime,
        count: messages.length
      }
    };
  }

  /**
   * 按角色过滤消息（分页）
   * @param {string} discussionId - 讨论 ID
   * @param {string} role - 角色
   * @param {number} page - 页码
   * @param {number} pageSize - 每页大小
   */
  async getMessagesByRole(discussionId, role, page = 1, pageSize = this.defaultPageSize) {
    const context = this.orchestrator.contexts.get(discussionId);
    
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const messages = (context.messages || []).filter(m => m.role === role);
    const totalMessages = messages.length;
    const totalPages = Math.ceil(totalMessages / pageSize);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = messages.slice(start, end);

    return {
      data: pageData,
      filter: { role },
      pagination: {
        page,
        pageSize,
        totalItems: totalMessages,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * 获取最新消息
   * @param {string} discussionId - 讨论 ID
   * @param {number} count - 消息数量
   */
  async getLatestMessages(discussionId, count = 20) {
    const context = this.orchestrator.contexts.get(discussionId);
    
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const messages = context.messages || [];
    const latest = messages.slice(-count);

    return {
      data: latest,
      count: latest.length
    };
  }

  /**
   * 获取消息统计
   * @param {string} discussionId - 讨论 ID
   */
  async getMessageStats(discussionId) {
    const context = this.orchestrator.contexts.get(discussionId);
    
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const messages = context.messages || [];
    const roleCounts = new Map();
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);

    messages.forEach(m => {
      roleCounts.set(m.role, (roleCounts.get(m.role) || 0) + 1);
    });

    const roleStats = Array.from(roleCounts.entries()).map(([role, count]) => ({
      role,
      count,
      percentage: (count / messages.length * 100).toFixed(1)
    }));

    return {
      totalMessages: messages.length,
      totalCharacters: totalLength,
      avgMessageLength: Math.round(totalLength / messages.length),
      roleStats,
      firstMessageAt: messages[0]?.timestamp,
      lastMessageAt: messages[messages.length - 1]?.timestamp
    };
  }
}

/**
 * 快照分页管理器
 */
class SnapshotPager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.defaultPageSize = 20;
  }

  /**
   * 获取讨论的快照（分页）
   */
  async getSnapshots(discussionId, page = 1, pageSize = this.defaultPageSize) {
    if (!this.orchestrator.snapshots) {
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    }

    const snapshots = this.orchestrator.snapshots.get(discussionId) || [];
    const totalSnapshots = snapshots.length;
    const totalPages = Math.ceil(totalSnapshots / pageSize);

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = snapshots.slice(start, end);

    return {
      data: pageData,
      pagination: {
        page,
        pageSize,
        totalItems: totalSnapshots,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }
}

module.exports = {
  PaginatedLoader,
  DiscussionMessagePager,
  SnapshotPager
};
