/**
 * 光标同步
 * 
 * 实现多人协作时的光标位置同步
 */

class CursorManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.cursors = new Map(); // discussionId -> Map of userId -> cursor data
    this.expireTimeout = 10000; // 10秒无更新认为光标过期
    this.cleanupInterval = null;
    
    this.start();
  }

  /**
   * 启动光标管理
   */
  start() {
    // 定期清理过期的光标
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5000); // 每5秒检查一次
    
    console.log('[Cursor Manager] Started');
  }

  /**
   * 停止光标管理
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('[Cursor Manager] Stopped');
  }

  /**
   * 更新光标位置
   * @param {string} discussionId - 讨论ID
   * @param {string} userId - 用户ID
   * @param {object} cursor - 光标数据
   */
  updateCursor(discussionId, userId, cursor) {
    if (!this.cursors.has(discussionId)) {
      this.cursors.set(discussionId, new Map());
    }

    const cursorData = {
      userId,
      position: cursor.position || 0,
      selection: cursor.selection || null,
      color: cursor.color || this.generateColor(userId),
      label: cursor.label || userId,
      timestamp: Date.now()
    };

    this.cursors.get(discussionId).set(userId, cursorData);

    return cursorData;
  }

  /**
   * 获取讨论的所有光标
   * @param {string} discussionId - 讨论ID
   * @param {string} excludeUserId - 要排除的用户ID（通常是当前用户）
   */
  getDiscussionCursors(discussionId, excludeUserId = null) {
    const cursors = this.cursors.get(discussionId);
    
    if (!cursors) {
      return [];
    }

    const now = Date.now();
    const result = [];

    for (const [userId, cursor] of cursors.entries()) {
      // 排除当前用户和过期的光标
      if (userId !== excludeUserId && (now - cursor.timestamp) < this.expireTimeout) {
        result.push(cursor);
      }
    }

    return result;
  }

  /**
   * 获取用户光标
   * @param {string} discussionId - 讨论ID
   * @param {string} userId - 用户ID
   */
  getUserCursor(discussionId, userId) {
    const cursors = this.cursors.get(discussionId);
    
    if (!cursors) {
      return null;
    }

    const cursor = cursors.get(userId);
    
    // 检查是否过期
    if (cursor && (Date.now() - cursor.timestamp) < this.expireTimeout) {
      return cursor;
    }

    return null;
  }

  /**
   * 移除用户光标
   * @param {string} discussionId - 讨论ID
   * @param {string} userId - 用户ID
   */
  removeCursor(discussionId, userId) {
    const cursors = this.cursors.get(discussionId);
    
    if (cursors) {
      return cursors.delete(userId);
    }

    return false;
  }

  /**
   * 清除讨论的所有光标
   * @param {string} discussionId - 讨论ID
   */
  clearDiscussionCursors(discussionId) {
    return this.cursors.delete(discussionId);
  }

  /**
   * 生成用户颜色
   * @param {string} userId - 用户ID
   */
  generateColor(userId) {
    // 基于用户ID生成一致的颜色
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // 转换为 HSL 颜色，使用高饱和度和亮度以确保可见性
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 50%)`;
  }

  /**
   * 检测光标冲突
   * @param {string} discussionId - 讨论ID
   * @param {object} myCursor - 当前用户的光标
   */
  detectConflicts(discussionId, myCursor) {
    const cursors = this.getDiscussionCursors(discussionId, myCursor.userId);
    const conflicts = [];

    for (const cursor of cursors) {
      // 检查光标位置是否接近
      const distance = Math.abs(cursor.position - myCursor.position);
      
      if (distance < 50) { // 50个字符内认为冲突
        conflicts.push({
          userId: cursor.userId,
          label: cursor.label,
          color: cursor.color,
          distance
        });
      }
    }

    return conflicts;
  }

  /**
   * 获取光标附近的内容
   * @param {string} discussionId - 讨论ID
   * @param {number} position - 光标位置
   * @param {number} contextLength - 上下文长度
   */
  getCursorContext(discussionId, position, contextLength = 100) {
    const discussion = this.orchestrator.discussions.get(discussionId);
    
    if (!discussion || !discussion.transcript) {
      return null;
    }

    const transcript = discussion.transcript;
    const start = Math.max(0, position - contextLength);
    const end = Math.min(transcript.length, position + contextLength);

    return {
      before: transcript.substring(start, position),
      after: transcript.substring(position, end),
      full: transcript.substring(start, end)
    };
  }

  /**
   * 清理过期光标
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [discussionId, cursors] of this.cursors.entries()) {
      const toRemove = [];

      for (const [userId, cursor] of cursors.entries()) {
        if ((now - cursor.timestamp) > this.expireTimeout) {
          toRemove.push(userId);
        }
      }

      for (const userId of toRemove) {
        cursors.delete(userId);
        cleaned++;
      }

      // 如果讨论没有光标了，删除讨论的记录
      if (cursors.size === 0) {
        this.cursors.delete(discussionId);
      }
    }

    if (cleaned > 0) {
      console.log(`[Cursor Manager] Cleaned up ${cleaned} expired cursors`);
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    let totalCursors = 0;

    for (const cursors of this.cursors.values()) {
      totalCursors += cursors.size;
    }

    return {
      totalCursors,
      discussionsWithCursors: this.cursors.size,
      cursorsPerDiscussion: Array.from(this.cursors.entries())
        .map(([id, cursors]) => ({ discussionId: id, count: cursors.size }))
    };
  }

  /**
   * 导出光标数据
   */
  exportData() {
    return Array.from(this.cursors.entries())
      .map(([discussionId, cursors]) => ({
        discussionId,
        cursors: Array.from(cursors.values())
      }));
  }

  /**
   * 导入光标数据
   */
  importData(data) {
    this.cursors.clear();

    for (const { discussionId, cursors } of data) {
      const cursorMap = new Map();
      for (const cursor of cursors) {
        cursorMap.set(cursor.userId, cursor);
      }
      this.cursors.set(discussionId, cursorMap);
    }
  }
}

module.exports = { CursorManager };
