/**
 * v2.5.2 - 讨论历史记录和清理
 * 
 * 功能：管理讨论历史，包括查看、清理和归档
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 讨论历史管理器
 */
class DiscussionHistoryManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.dataDir = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'archive');
  }

  /**
   * 初始化
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log('[History] Initialized successfully');
    } catch (error) {
      console.error('[History] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 获取讨论历史统计
   */
  getHistoryStats() {
    const discussions = this.orchestrator.listDiscussions();
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const stats = {
      total: discussions.length,
      active: 0,
      ended: 0,
      last24h: 0,
      last7days: 0,
      last30days: 0,
      older: 0,
      totalMessages: 0,
      totalSize: 0
    };

    discussions.forEach(d => {
      // 状态统计
      if (d.status === 'active') stats.active++;
      else if (d.status === 'ended') stats.ended++;

      // 时间统计
      const age = now - d.createdAt;
      if (age < day) stats.last24h++;
      else if (age < 7 * day) stats.last7days++;
      else if (age < 30 * day) stats.last30days++;
      else stats.older++;

      // 消息统计
      const context = this.orchestrator.contexts.get(d.id);
      if (context) {
        stats.totalMessages += context.messages.length;
        stats.totalSize += JSON.stringify(context).length;
      }
    });

    return stats;
  }

  /**
   * 获取旧讨论列表
   * @param {number} days - 天数阈值
   */
  getOldDiscussions(days = 30) {
    const discussions = this.orchestrator.listDiscussions();
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

    return discussions.filter(d => d.createdAt < threshold).map(d => ({
      ...d,
      age: Math.round((Date.now() - d.createdAt) / (24 * 60 * 60 * 1000)),
      size: this.getDiscussionSize(d.id)
    }));
  }

  /**
   * 获取讨论大小
   */
  getDiscussionSize(discussionId) {
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) return 0;
    return JSON.stringify(context).length;
  }

  /**
   * 归档讨论
   * @param {string} discussionId - 讨论 ID
   */
  async archiveDiscussion(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const archivePath = path.join(this.dataDir, `${discussionId}.json`);

    try {
      // 保存到归档目录
      await fs.writeFile(
        archivePath,
        JSON.stringify(context, null, 2),
        'utf8'
      );

      // 从内存中删除
      this.orchestrator.discussions.delete(discussionId);
      this.orchestrator.contexts.delete(discussionId);

      // 删除原文件
      const originalPath = path.join(
        this.orchestrator.dataDir,
        'discussions',
        `${discussionId}.json`
      );
      
      try {
        await fs.unlink(originalPath);
      } catch (e) {
        // 文件可能不存在
      }

      console.log(`[History] Archived discussion ${discussionId}`);
      
      return {
        success: true,
        archivePath,
        discussionId
      };
    } catch (error) {
      console.error(`[History] Failed to archive discussion:`, error);
      throw error;
    }
  }

  /**
   * 批量归档
   * @param {number} days - 天数阈值
   */
  async archiveOldDiscussions(days = 30) {
    const oldDiscussions = this.getOldDiscussions(days);
    const results = [];

    for (const discussion of oldDiscussions) {
      try {
        const result = await this.archiveDiscussion(discussion.id);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          discussionId: discussion.id,
          error: error.message
        });
      }
    }

    return {
      total: oldDiscussions.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * 删除讨论（永久）
   * @param {string} discussionId - 讨论 ID
   */
  async deleteDiscussion(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    // 从内存中删除
    this.orchestrator.discussions.delete(discussionId);
    this.orchestrator.contexts.delete(discussionId);

    // 删除文件
    const filePath = path.join(
      this.orchestrator.dataDir,
      'discussions',
      `${discussionId}.json`
    );

    try {
      await fs.unlink(filePath);
    } catch (e) {
      // 文件可能不存在
    }

    console.log(`[History] Deleted discussion ${discussionId}`);
    
    return {
      success: true,
      discussionId
    };
  }

  /**
   * 清理所有已结束的讨论
   */
  async clearEndedDiscussions() {
    const discussions = this.orchestrator.listDiscussions();
    const ended = discussions.filter(d => d.status === 'ended');

    const results = [];
    for (const discussion of ended) {
      try {
        const result = await this.deleteDiscussion(discussion.id);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          discussionId: discussion.id,
          error: error.message
        });
      }
    }

    return {
      total: ended.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * 获取归档列表
   */
  async getArchiveList() {
    try {
      const files = await fs.readdir(this.dataDir);
      const archives = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.dataDir, file);
          const stats = await fs.stat(filePath);
          
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const discussion = JSON.parse(content);
            
            archives.push({
              id: discussion.id,
              topic: discussion.topic,
              createdAt: discussion.createdAt,
              archivedAt: stats.mtime.getTime(),
              size: stats.size,
              messageCount: discussion.messages?.length || 0
            });
          } catch (e) {
            // 跳过损坏的文件
          }
        }
      }

      return archives.sort((a, b) => b.archivedAt - a.archivedAt);
    } catch (error) {
      console.error('[History] Failed to list archives:', error);
      return [];
    }
  }

  /**
   * 恢复归档的讨论
   * @param {string} discussionId - 讨论 ID
   */
  async restoreFromArchive(discussionId) {
    const archivePath = path.join(this.dataDir, `${discussionId}.json`);

    try {
      const content = await fs.readFile(archivePath, 'utf8');
      const context = JSON.parse(content);

      // 恢复到内存
      this.orchestrator.discussions.set(discussionId, context);
      this.orchestrator.contexts.set(discussionId, context);

      // 保存到正常位置
      await this.orchestrator.saveDiscussion(context);

      // 删除归档
      await fs.unlink(archivePath);

      console.log(`[History] Restored discussion ${discussionId}`);
      
      return {
        success: true,
        discussionId,
        context
      };
    } catch (error) {
      console.error('[History] Failed to restore discussion:', error);
      throw error;
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage() {
    let totalSize = 0;
    let discussionCount = 0;
    let archiveCount = 0;
    let discussionSize = 0;
    let archiveSize = 0;

    // 讨论目录
    const discussionDir = path.join(this.orchestrator.dataDir, 'discussions');
    try {
      const files = await fs.readdir(discussionDir);
      discussionCount = files.length;
      
      for (const file of files) {
        const filePath = path.join(discussionDir, file);
        const stats = await fs.stat(filePath);
        discussionSize += stats.size;
      }
    } catch (e) {
      // 目录可能不存在
    }

    // 归档目录
    try {
      const files = await fs.readdir(this.dataDir);
      archiveCount = files.length;
      
      for (const file of files) {
        const filePath = path.join(this.dataDir, file);
        const stats = await fs.stat(filePath);
        archiveSize += stats.size;
      }
    } catch (e) {
      // 目录可能不存在
    }

    totalSize = discussionSize + archiveSize;

    return {
      totalSize,
      discussionCount,
      archiveCount,
      discussionSize,
      archiveSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      discussionSizeFormatted: this.formatBytes(discussionSize),
      archiveSizeFormatted: this.formatBytes(archiveSize)
    };
  }

  /**
   * 格式化字节数
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = { DiscussionHistoryManager };
