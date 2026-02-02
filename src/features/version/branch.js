/**
 * Branch Manager - 讨论分支管理
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 分支管理器
 */
class BranchManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.branchesDir = path.join(orchestrator.dataDir, 'branches');
    this.branches = new Map(); // <discussionId, [branches]>
  }

  /**
   * 初始化
   */
  async initialize() {
    try {
      await fs.mkdir(this.branchesDir, { recursive: true });
      console.log('[Branch] Initialized successfully');
    } catch (error) {
      console.error('[Branch] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 创建分支
   */
  async createBranch(sourceDiscussionId, options = {}) {
    const sourceContext = this.orchestrator.contexts.get(sourceDiscussionId);
    if (!sourceContext) {
      throw new Error(`Source discussion ${sourceDiscussionId} not found`);
    }

    const branchId = `branch-${Date.now()}`;
    const branch = {
      id: branchId,
      sourceDiscussionId,
      name: options.name || `分支 ${this.getNextBranchNumber(sourceDiscussionId)}`,
      description: options.description || '',
      createdAt: new Date().toISOString(),
      snapshotId: options.snapshotId || null,
      data: {
        messages: [...sourceContext.messages],
        context: {
          topic: sourceContext.topic,
          status: sourceContext.status,
          rounds: sourceContext.rounds,
          participants: [...sourceContext.participants]
        }
      }
    };

    // 保存到文件
    const branchPath = path.join(this.branchesDir, `${branchId}.json`);
    await fs.writeFile(branchPath, JSON.stringify(branch, null, 2));

    // 添加到内存
    if (!this.branches.has(sourceDiscussionId)) {
      this.branches.set(sourceDiscussionId, []);
    }
    this.branches.get(sourceDiscussionId).push(branch);

    console.log(`[Branch] Created branch ${branchId} from discussion ${sourceDiscussionId}`);
    return branch;
  }

  /**
   * 获取讨论的所有分支
   */
  async getBranches(discussionId) {
    if (!this.branches.has(discussionId)) {
      await this.loadBranches(discussionId);
    }

    return this.branches.get(discussionId) || [];
  }

  /**
   * 获取分支详情
   */
  async getBranch(branchId) {
    const branchPath = path.join(this.branchesDir, `${branchId}.json`);

    try {
      const data = await fs.readFile(branchPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`[Branch] Failed to load branch ${branchId}:`, error);
      return null;
    }
  }

  /**
   * 删除分支
   */
  async deleteBranch(branchId) {
    const branchPath = path.join(this.branchesDir, `${branchId}.json`);

    try {
      await fs.unlink(branchPath);

      // 从内存中移除
      this.branches.forEach((branches, discussionId) => {
        const index = branches.findIndex(b => b.id === branchId);
        if (index > -1) {
          branches.splice(index, 1);
        }
      });

      console.log(`[Branch] Deleted branch ${branchId}`);
      return true;
    } catch (error) {
      console.error(`[Branch] Failed to delete branch ${branchId}:`, error);
      return false;
    }
  }

  /**
   * 合并分支到源讨论
   */
  async mergeBranch(branchId, options = {}) {
    const branch = await this.getBranch(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const targetContext = this.orchestrator.contexts.get(branch.sourceDiscussionId);
    if (!targetContext) {
      throw new Error(`Target discussion ${branch.sourceDiscussionId} not found`);
    }

    // 简化版：直接追加消息
    // 实际应用中应该有更复杂的合并策略和冲突解决
    let mergedCount = 0;
    const existingMessageIds = new Set(targetContext.messages.map(m => m.id));

    branch.data.messages.forEach(msg => {
      if (!existingMessageIds.has(msg.id)) {
        targetContext.messages.push(msg);
        mergedCount++;
      }
    });

    console.log(`[Branch] Merged branch ${branchId} into discussion ${branch.sourceDiscussionId}`);
    return { success: true, mergedCount };
  }

  /**
   * 比较分支和源讨论
   */
  async compareBranch(branchId) {
    const branch = await this.getBranch(branchId);
    if (!branch) {
      throw new Error(`Branch ${branchId} not found`);
    }

    const targetContext = this.orchestrator.contexts.get(branch.sourceDiscussionId);
    if (!targetContext) {
      throw new Error(`Target discussion ${branch.sourceDiscussionId} not found`);
    }

    const { compareMessageLists } = require('./diff.js');
    const changes = compareMessageLists(targetContext.messages, branch.data.messages);

    return {
      branch,
      target: {
        discussionId: branch.sourceDiscussionId,
        messageCount: targetContext.messages.length,
        topic: targetContext.topic
      },
      changes
    };
  }

  /**
   * 加载讨论的分支
   */
  async loadBranches(discussionId) {
    const files = await fs.readdir(this.branchesDir);
    const branchFiles = files.filter(f => f.endsWith('.json'));

    const branches = [];
    for (const file of branchFiles) {
      try {
        const branchPath = path.join(this.branchesDir, file);
        const data = await fs.readFile(branchPath, 'utf8');
        const branch = JSON.parse(data);

        if (branch.sourceDiscussionId === discussionId) {
          branches.push(branch);
        }
      } catch (error) {
        console.error(`[Branch] Failed to load branch from ${file}:`, error);
      }
    }

    // 按创建时间排序
    branches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    this.branches.set(discussionId, branches);

    return branches;
  }

  /**
   * 获取下一个分支编号
   */
  getNextBranchNumber(discussionId) {
    const branches = this.branches.get(discussionId) || [];
    return branches.length + 1;
  }
}

module.exports = {
  BranchManager
};
