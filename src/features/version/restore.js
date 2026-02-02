/**
 * Restore Manager - 版本恢复
 */

/**
 * 版本恢复管理器
 */
class RestoreManager {
  constructor(orchestrator, snapshotManager) {
    this.orchestrator = orchestrator;
    this.snapshotManager = snapshotManager;
    this.restoreHistory = new Map(); // <discussionId, [restores]>
  }

  /**
   * 恢复到快照
   */
  async restore(discussionId, snapshotId, options = {}) {
    const snapshot = await this.snapshotManager.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    // 获取当前上下文
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    // 保存恢复前状态
    const beforeRestore = {
      messageCount: context.messages.length,
      topic: context.topic,
      status: context.status,
      timestamp: new Date().toISOString()
    };

    // 执行恢复
    const result = await this.snapshotManager.restoreSnapshot(discussionId, snapshotId);

    // 记录恢复历史
    const restoreRecord = {
      id: `restore-${Date.now()}`,
      discussionId,
      snapshotId,
      snapshotVersion: snapshot.version,
      before: beforeRestore,
      after: {
        messageCount: context.messages.length,
        topic: context.topic,
        status: context.status,
        timestamp: new Date().toISOString()
      },
      mode: options.mode || 'full',
      timestamp: new Date().toISOString()
    };

    if (!this.restoreHistory.has(discussionId)) {
      this.restoreHistory.set(discussionId, []);
    }
    this.restoreHistory.get(discussionId).push(restoreRecord);

    console.log(`[Restore] Restored discussion ${discussionId} to snapshot ${snapshotId}`);
    return { success: true, record: restoreRecord };
  }

  /**
   * 预览恢复效果
   */
  async previewRestore(discussionId, snapshotId) {
    const snapshot = await this.snapshotManager.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const preview = {
      current: {
        messageCount: context.messages.length,
        topic: context.topic,
        status: context.status,
        lastMessage: context.messages.length > 0 
          ? context.messages[context.messages.length - 1] 
          : null
      },
      snapshot: {
        messageCount: snapshot.data.messages.length,
        topic: snapshot.data.context.topic,
        status: snapshot.data.context.status,
        lastMessage: snapshot.data.messages.length > 0
          ? snapshot.data.messages[snapshot.data.messages.length - 1]
          : null,
        timestamp: snapshot.timestamp
      },
      changes: {
        messageDelta: snapshot.data.messages.length - context.messages.length,
        topicChanged: snapshot.data.context.topic !== context.topic,
        statusChanged: snapshot.data.context.status !== context.status,
        willLoseMessages: snapshot.data.messages.length < context.messages.length
      }
    };

    return preview;
  }

  /**
   * 获取恢复历史
   */
  getRestoreHistory(discussionId) {
    return this.restoreHistory.get(discussionId) || [];
  }

  /**
   * 撤销恢复（恢复到恢复前的状态）
   */
  async undoRestore(discussionId, restoreId) {
    const restores = this.restoreHistory.get(discussionId) || [];
    const restoreRecord = restores.find(r => r.id === restoreId);

    if (!restoreRecord) {
      throw new Error(`Restore ${restoreId} not found`);
    }

    // 这里应该有更复杂的逻辑来恢复到恢复前的状态
    // 简化版：只能撤销到最近的一个恢复
    const context = this.orchestrator.contexts.get(discussionId);
    if (context) {
      context.topic = restoreRecord.before.topic;
      context.status = restoreRecord.before.status;
      // 注意：消息无法完全恢复，因为我们没有保存完整的消息历史
    }

    console.log(`[Restore] Undo restore ${restoreId} for discussion ${discussionId}`);
    return { success: true };
  }
}

module.exports = {
  RestoreManager
};
