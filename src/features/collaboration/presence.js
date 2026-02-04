/**
 * 在线状态管理
 * 
 * 追踪和管理用户的在线状态
 */

class PresenceManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.presence = new Map(); // userId -> presence data
    this.discussionPresence = new Map(); // discussionId -> Set of userIds
    this.expireTimeout = 5 * 60 * 1000; // 5分钟不活动视为离线
    this.cleanupInterval = null;
    
    this.start();
  }

  /**
   * 启动在线状态管理
   */
  start() {
    // 定期清理过期的在线状态
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟检查一次
    
    console.log('[Presence Manager] Started');
  }

  /**
   * 停止在线状态管理
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('[Presence Manager] Stopped');
  }

  /**
   * 更新用户在线状态
   * @param {string} userId - 用户ID
   * @param {object} data - 在线数据
   */
  updatePresence(userId, data = {}) {
    const presence = {
      userId,
      status: 'online',
      lastSeen: Date.now(),
      ...data
    };

    this.presence.set(userId, presence);

    // 如果用户在讨论中，更新讨论的在线用户列表
    if (data.discussionId) {
      this.addToDiscussion(data.discussionId, userId);
    }

    return presence;
  }

  /**
   * 添加用户到讨论
   * @param {string} discussionId - 讨论ID
   * @param {string} userId - 用户ID
   */
  addToDiscussion(discussionId, userId) {
    if (!this.discussionPresence.has(discussionId)) {
      this.discussionPresence.set(discussionId, new Set());
    }
    this.discussionPresence.get(discussionId).add(userId);
  }

  /**
   * 从讨论中移除用户
   * @param {string} discussionId - 讨论ID
   * @param {string} userId - 用户ID
   */
  removeFromDiscussion(discussionId, userId) {
    const presenceSet = this.discussionPresence.get(discussionId);
    if (presenceSet) {
      presenceSet.delete(userId);
      
      // 如果没有在线用户了，删除讨论的在线列表
      if (presenceSet.size === 0) {
        this.discussionPresence.delete(discussionId);
      }
    }

    // 更新用户的在线状态
    const presence = this.presence.get(userId);
    if (presence && presence.discussionId === discussionId) {
      presence.discussionId = null;
      presence.status = 'online';
    }
  }

  /**
   * 获取用户在线状态
   * @param {string} userId - 用户ID
   */
  getPresence(userId) {
    const presence = this.presence.get(userId);
    
    if (!presence) {
      return { userId, status: 'offline' };
    }

    // 检查是否过期
    const timeSinceLastSeen = Date.now() - presence.lastSeen;
    if (timeSinceLastSeen > this.expireTimeout) {
      return { userId, status: 'offline', lastSeen: presence.lastSeen };
    }

    // 检查是否空闲
    if (timeSinceLastSeen > 60000) { // 1分钟无活动
      return { ...presence, status: 'idle' };
    }

    return presence;
  }

  /**
   * 获取讨论的在线用户
   * @param {string} discussionId - 讨论ID
   */
  getDiscussionPresence(discussionId) {
    const userIds = this.discussionPresence.get(discussionId);
    
    if (!userIds || userIds.size === 0) {
      return [];
    }

    return Array.from(userIds)
      .map(userId => this.getPresence(userId))
      .filter(p => p.status !== 'offline');
  }

  /**
   * 获取所有在线用户
   */
  getOnlineUsers() {
    const now = Date.now();
    const online = [];

    for (const [userId, presence] of this.presence.entries()) {
      if (now - presence.lastSeen < this.expireTimeout) {
        online.push(presence);
      }
    }

    return online;
  }

  /**
   * 批量获取用户在线状态
   * @param {string[]} userIds - 用户ID列表
   */
  getBatchPresence(userIds) {
    return userIds.map(userId => this.getPresence(userId));
  }

  /**
   * 设置用户状态
   * @param {string} userId - 用户ID
   * @param {string} status - 状态（online, idle, busy, offline）
   */
  setUserStatus(userId, status) {
    const presence = this.presence.get(userId);
    
    if (presence) {
      presence.status = status;
      presence.lastSeen = Date.now();
      return presence;
    }

    return this.updatePresence(userId, { status });
  }

  /**
   * 设置用户正在输入
   * @param {string} userId - 用户ID
   * @param {string} discussionId - 讨论ID
   * @param {boolean} isTyping - 是否正在输入
   */
  setTyping(userId, discussionId, isTyping = true) {
    const presence = this.presence.get(userId);
    
    if (presence) {
      presence.discussionId = discussionId;
      presence.isTyping = isTyping;
      presence.lastSeen = Date.now();
      
      if (isTyping) {
        this.addToDiscussion(discussionId, userId);
      }
      
      return presence;
    }

    return this.updatePresence(userId, {
      discussionId,
      isTyping
    });
  }

  /**
   * 获取正在输入的用户
   * @param {string} discussionId - 讨论ID
   */
  getTypingUsers(discussionId) {
    const typing = [];

    for (const [userId, presence] of this.presence.entries()) {
      if (presence.isTyping && presence.discussionId === discussionId) {
        // 检查是否过期（5秒内有输入）
        if (Date.now() - presence.lastSeen < 5000) {
          typing.push(userId);
        } else {
          // 清除过期的输入状态
          presence.isTyping = false;
        }
      }
    }

    return typing;
  }

  /**
   * 用户登出
   * @param {string} userId - 用户ID
   */
  logout(userId) {
    const presence = this.presence.get(userId);
    
    if (presence && presence.discussionId) {
      this.removeFromDiscussion(presence.discussionId, userId);
    }

    this.presence.delete(userId);
  }

  /**
   * 清理过期的在线状态
   */
  cleanup() {
    const now = Date.now();
    const toRemove = [];

    for (const [userId, presence] of this.presence.entries()) {
      if (now - presence.lastSeen > this.expireTimeout) {
        toRemove.push(userId);
      }
    }

    for (const userId of toRemove) {
      this.logout(userId);
    }

    if (toRemove.length > 0) {
      console.log(`[Presence Manager] Cleaned up ${toRemove.length} expired presences`);
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    return {
      totalUsers: this.presence.size,
      onlineUsers: this.getOnlineUsers().length,
      discussionsWithUsers: this.discussionPresence.size,
      usersPerDiscussion: Array.from(this.discussionPresence.entries())
        .map(([id, users]) => ({ discussionId: id, count: users.size }))
    };
  }

  /**
   * 导出在线状态数据
   */
  exportData() {
    return {
      presence: Array.from(this.presence.values()),
      discussionPresence: Array.from(this.discussionPresence.entries())
        .map(([id, users]) => ({ discussionId: id, users: Array.from(users) }))
    };
  }

  /**
   * 导入在线状态数据
   */
  importData(data) {
    this.presence.clear();
    this.discussionPresence.clear();

    for (const presence of data.presence) {
      this.presence.set(presence.userId, presence);
    }

    for (const { discussionId, users } of data.discussionPresence) {
      this.discussionPresence.set(discussionId, new Set(users));
    }
  }
}

module.exports = { PresenceManager };
