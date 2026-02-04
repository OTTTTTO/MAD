/**
 * Snapshot Manager - 讨论快照管理
 */

const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * 快照管理器
 */
class SnapshotManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.snapshotsDir = path.join(orchestrator.dataDir, 'snapshots');
    this.snapshots = new Map(); // <discussionId, [snapshots]>
  }

  /**
   * 初始化
   */
  async initialize() {
    try {
      await fs.mkdir(this.snapshotsDir, { recursive: true });
      console.log('[Snapshot] Initialized successfully');
    } catch (error) {
      console.error('[Snapshot] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 创建快照
   */
  async createSnapshot(discussionId, options = {}) {
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const snapshotId = `snap-${Date.now()}`;
    const snapshot = {
      id: snapshotId,
      discussionId,
      version: this.getNextVersion(discussionId),
      timestamp: new Date().toISOString(),
      type: options.type || 'manual',
      description: options.description || '手动快照',
      tags: options.tags || [],
      messageCount: context.messages.length,
      participants: context.participants.map(p => p.role),
      data: {
        messages: context.messages,
        context: {
          topic: context.topic,
          status: context.status,
          rounds: context.rounds,
          conflicts: context.conflicts,
          consensus: Array.from(context.consensus.entries())
        }
      }
    };

    // 压缩数据
    const compressed = await gzip(JSON.stringify(snapshot.data));
    snapshot.compression = 'gzip';
    snapshot.size = compressed.length;

    // 保存到文件
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.json.gz`);
    await fs.writeFile(snapshotPath, compressed);

    // 添加到内存
    if (!this.snapshots.has(discussionId)) {
      this.snapshots.set(discussionId, []);
    }
    this.snapshots.get(discussionId).push(snapshot);

    console.log(`[Snapshot] Created snapshot ${snapshotId} for discussion ${discussionId}`);
    return snapshot;
  }

  /**
   * 获取讨论的所有快照
   */
  async getSnapshots(discussionId) {
    if (!this.snapshots.has(discussionId)) {
      // 从磁盘加载
      await this.loadSnapshots(discussionId);
    }

    return this.snapshots.get(discussionId) || [];
  }

  /**
   * 获取快照详情
   */
  async getSnapshot(snapshotId) {
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.json.gz`);
    
    try {
      const compressed = await fs.readFile(snapshotPath);
      const data = await gunzip(compressed);
      const snapshot = JSON.parse(data);
      return snapshot;
    } catch (error) {
      console.error(`[Snapshot] Failed to load snapshot ${snapshotId}:`, error);
      return null;
    }
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(snapshotId) {
    const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.json.gz`);
    
    try {
      await fs.unlink(snapshotPath);
      
      // 从内存中移除
      this.snapshots.forEach((snapshots, discussionId) => {
        const index = snapshots.findIndex(s => s.id === snapshotId);
        if (index > -1) {
          snapshots.splice(index, 1);
        }
      });

      console.log(`[Snapshot] Deleted snapshot ${snapshotId}`);
      return true;
    } catch (error) {
      console.error(`[Snapshot] Failed to delete snapshot ${snapshotId}:`, error);
      return false;
    }
  }

  /**
   * 恢复快照
   */
  async restoreSnapshot(discussionId, snapshotId) {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    // 恢复消息
    context.messages = snapshot.data.messages;
    
    // 恢复上下文
    context.topic = snapshot.data.context.topic;
    context.status = snapshot.data.context.status;
    context.rounds = snapshot.data.context.rounds;
    context.conflicts = snapshot.data.context.conflicts;
    context.consensus = new Map(snapshot.data.context.consensus);

    console.log(`[Snapshot] Restored snapshot ${snapshotId} to discussion ${discussionId}`);
    return { success: true, restoredMessages: context.messages.length };
  }

  /**
   * 加载讨论的快照
   */
  async loadSnapshots(discussionId) {
    const files = await fs.readdir(this.snapshotsDir);
    const snapshotFiles = files.filter(f => f.endsWith('.json.gz'));

    const snapshots = [];
    for (const file of snapshotFiles) {
      try {
        const snapshotPath = path.join(this.snapshotsDir, file);
        const compressed = await fs.readFile(snapshotPath);
        const data = await gunzip(compressed);
        const snapshot = JSON.parse(data);

        if (snapshot.discussionId === discussionId) {
          snapshots.push(snapshot);
        }
      } catch (error) {
        console.error(`[Snapshot] Failed to load snapshot from ${file}:`, error);
      }
    }

    // 按版本排序
    snapshots.sort((a, b) => a.version - b.version);
    this.snapshots.set(discussionId, snapshots);

    return snapshots;
  }

  /**
   * 获取下一个版本号
   */
  getNextVersion(discussionId) {
    const snapshots = this.snapshots.get(discussionId) || [];
    return snapshots.length + 1;
  }

  /**
   * 自动创建快照
   */
  async autoSnapshot(discussionId, trigger) {
    const description = {
      end: '讨论结束',
      consensus: '达成共识',
      conflict: '冲突解决',
      timer: '定时快照'
    }[trigger] || '自动快照';

    const tags = [trigger];

    return await this.createSnapshot(discussionId, {
      type: 'auto',
      description,
      tags
    });
  }
}

module.exports = {
  SnapshotManager
};
