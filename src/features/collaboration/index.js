/**
 * 实时协作系统
 * 
 * 提供多人实时协作编辑讨论的能力
 */

const { PresenceManager } = require('./presence');
const { CursorManager } = require('./cursor');
const { ConflictResolver, ConflictError } = require('./conflict');

/**
 * 初始化协作系统
 * @param {object} orchestrator - Orchestrator 实例
 * @returns {object}
 */
function initializeCollaboration(orchestrator) {
  const presence = new PresenceManager(orchestrator);
  const cursor = new CursorManager(orchestrator);
  const conflict = new ConflictResolver(orchestrator);

  return {
    presence,
    cursor,
    conflict,

    // 在线状态
    updatePresence: (userId, data) => presence.updatePresence(userId, data),
    
    getPresence: (userId) => presence.getPresence(userId),
    
    getBatchPresence: (userIds) => presence.getBatchPresence(userIds),
    
    getDiscussionPresence: (discussionId) => presence.getDiscussionPresence(discussionId),
    
    getOnlineUsers: () => presence.getOnlineUsers(),
    
    setUserStatus: (userId, status) => presence.setUserStatus(userId, status),
    
    setTyping: (userId, discussionId, isTyping) => presence.setTyping(userId, discussionId, isTyping),
    
    getTypingUsers: (discussionId) => presence.getTypingUsers(discussionId),
    
    logout: (userId) => presence.logout(userId),

    // 光标同步
    updateCursor: (discussionId, userId, cursor) => cursor.updateCursor(discussionId, userId, cursor),
    
    getDiscussionCursors: (discussionId, excludeUserId) => cursor.getDiscussionCursors(discussionId, excludeUserId),
    
    getUserCursor: (discussionId, userId) => cursor.getUserCursor(discussionId, userId),
    
    removeCursor: (discussionId, userId) => cursor.removeCursor(discussionId, userId),
    
    detectConflicts: (discussionId, myCursor) => cursor.detectConflicts(discussionId, myCursor),
    
    getCursorContext: (discussionId, position, contextLength) => cursor.getCursorContext(discussionId, position, contextLength),

    // 冲突解决
    applyOperation: (discussionId, operation) => conflict.applyOperation(discussionId, operation),
    
    resolveConflict: (discussionId, conflictId, resolution, mergedOperation) => 
      conflict.resolveConflict(discussionId, conflictId, resolution, mergedOperation),
    
    getConflictHistory: (discussionId) => conflict.getConflictHistory(discussionId),

    // 统计信息
    getStatistics: () => ({
      presence: presence.getStatistics(),
      cursor: cursor.getStatistics(),
      conflict: conflict.getStatistics()
    }),

    // 清理
    cleanup: (discussionId) => {
      conflict.cleanup(discussionId);
      cursor.clearDiscussionCursors(discussionId);
    },

    // 停止
    stop: () => {
      presence.stop();
      cursor.stop();
    }
  };
}

module.exports = {
  // 核心类
  PresenceManager,
  CursorManager,
  ConflictResolver,
  
  // 错误类
  ConflictError,

  // 初始化函数
  initializeCollaboration
};
