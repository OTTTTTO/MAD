/**
 * Real-time Manager - 实时协作管理
 * 
 * 基于现有 WebSocket 的实时更新功能
 */

/**
 * 实时更新管理器
 */
class RealtimeManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.connectedClients = new Map(); // <clientId, {discussionId, userId}>
    this.cursors = new Map(); // <discussionId, <userId, {position, selection}>>
  }

  /**
   * 客户端连接
   */
  clientConnect(clientId, discussionId, userId) {
    this.connectedClients.set(clientId, {
      discussionId,
      userId,
      connectedAt: Date.now()
    });

    console.log(`[Realtime] Client ${clientId} connected to discussion ${discussionId}`);
  }

  /**
   * 客户端断开
   */
  clientDisconnect(clientId) {
    const client = this.connectedClients.get(clientId);
    if (!client) return;

    // 清除光标
    this.removeCursor(client.discussionId, client.userId);

    this.connectedClients.delete(clientId);
    console.log(`[Realtime] Client ${clientId} disconnected`);
  }

  /**
   * 更新光标位置
   */
  updateCursor(discussionId, userId, position, selection) {
    if (!this.cursors.has(discussionId)) {
      this.cursors.set(discussionId, new Map());
    }

    this.cursors.get(discussionId).set(userId, {
      position,
      selection: selection || null,
      updatedAt: Date.now()
    });
  }

  /**
   * 移除光标
   */
  removeCursor(discussionId, userId) {
    const discussionCursors = this.cursors.get(discussionId);
    if (discussionCursors) {
      discussionCursors.delete(userId);
    }
  }

  /**
   * 获取讨论的所有光标
   */
  getDiscussionCursors(discussionId) {
    const discussionCursors = this.cursors.get(discussionId);
    if (!discussionCursors) return [];

    return Array.from(discussionCursors.entries()).map(([userId, cursor]) => ({
      userId,
      ...cursor
    }));
  }

  /**
   * 获取讨论的在线用户
   */
  getOnlineUsers(discussionId) {
    const users = [];

    this.connectedClients.forEach((client, clientId) => {
      if (client.discussionId === discussionId) {
        users.push({
          clientId,
          userId: client.userId,
          connectedAt: client.connectedAt
        });
      }
    });

    return users;
  }

  /**
   * 广播消息到讨论的所有客户端
   */
  broadcast(discussionId, message, excludeClient = null) {
    // 这个方法会在 WebSocket 服务器中实现
    // 这里只是定义接口
    console.log(`[Realtime] Broadcasting to discussion ${discussionId}:`, message);
  }
}

module.exports = {
  RealtimeManager
};
