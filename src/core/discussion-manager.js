/**
 * MAD v4.0 - Discussion管理器
 * 负责Discussion的创建、加载、保存、查询
 * 
 * 从ProjectManager重构而来，统一概念为Discussion
 */

const fs = require('fs').promises;
const path = require('path');
const { Discussion } = require('../models/discussion.js');

/**
 * 导出Discussion为Markdown
 */
async function exportDiscussionToMarkdown(discussion, outputPath) {
  const lines = [];

  // 标题
  lines.push(`# ${discussion.topic}\n`);
  lines.push(`**类别:** ${discussion.category}\n`);
  lines.push(`**状态:** ${discussion.status}\n`);
  lines.push(`**创建时间:** ${new Date(discussion.stats.createdAt).toLocaleString('zh-CN')}\n`);
  lines.push(`**更新时间:** ${new Date(discussion.stats.updatedAt).toLocaleString('zh-CN')}\n`);

  if (discussion.description) {
    lines.push(`\n## 描述\n\n${discussion.description}\n`);
  }

  // 标签
  if (discussion.tags && discussion.tags.length > 0) {
    lines.push(`\n**标签:** ${discussion.tags.map(t => `\`${t}\``).join(', ')}\n`);
  }

  // 参与者
  if (discussion.participants && discussion.participants.length > 0) {
    lines.push(`\n## 参与者\n\n`);
    discussion.participants.forEach(p => {
      lines.push(`- ${p.emoji || '👤'} ${p.name} (${p.role})\n`);
    });
  }

  // 统计
  lines.push(`\n## 统计\n\n`);
  lines.push(`- 消息数: ${discussion.stats.totalMessages}\n`);
  lines.push(`- 标记数: ${discussion.stats.totalMarkers}\n`);
  lines.push(`- Tokens: ${discussion.stats.totalTokens || 0}\n`);
  lines.push(`- 进度: ${discussion.stats.progress}%\n`);

  // Token统计
  const tokenStats = discussion.getTokenStats ? discussion.getTokenStats() : null;
  if (tokenStats) {
    lines.push(`\n### Token统计\n\n`);
    lines.push(`- 总Token: ${tokenStats.total}\n`);
    lines.push(`- 输入Token: ${tokenStats.input}\n`);
    lines.push(`- 输出Token: ${tokenStats.output}\n`);
    lines.push(`- 平均每条消息: ${tokenStats.avgPerMessage}\n`);
  }

  // 标记
  if (discussion.markers && discussion.markers.length > 0) {
    lines.push(`\n## 标记\n\n`);
    discussion.markers.forEach(marker => {
      const emoji = {
        'milestone': '🏆',
        'decision': '🎯',
        'problem': '⚠️',
        'solution': '💡'
      }[marker.type] || '📍';

      lines.push(`### ${emoji} ${marker.title}\n`);
      lines.push(`*${new Date(marker.timestamp).toLocaleString('zh-CN')}*\n`);

      if (marker.summary) {
        lines.push(`\n${marker.summary}\n`);
      }

      if (marker.conclusions && marker.conclusions.length > 0) {
        lines.push(`\n**结论:**\n`);
        marker.conclusions.forEach(c => {
          lines.push(`- ${c}\n`);
        });
      }

      if (marker.tags && marker.tags.length > 0) {
        lines.push(`\n**标签:** ${marker.tags.join(', ')}\n`);
      }

      lines.push(`\n`);
    });
  }

  // 消息
  if (discussion.messages && discussion.messages.length > 0) {
    lines.push(`\n## 消息流\n\n`);

    discussion.messages.forEach((msg, index) => {
      const emoji = msg.role === 'system' ? '🤖' :
                    msg.role === 'marker' ? '📍' :
                    msg.isMarker ? '📍' : '💬';

      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : '';
      const role = msg.role || '未知';

      lines.push(`### ${emoji} ${role} ${time ? `*(${time})*` : ''}\n`);
      lines.push(`${msg.content}\n`);
      lines.push(`\n`);
    });
  }

  // 写入文件
  const content = lines.join('');
  await fs.writeFile(outputPath, content, 'utf8');

  return outputPath;
}

/**
 * 导出Discussion为JSON
 */
async function exportDiscussionToJSON(discussion, outputPath) {
  const data = JSON.stringify(discussion, null, 2);
  await fs.writeFile(outputPath, data, 'utf8');
  return outputPath;
}

/**
 * Discussion管理器
 */
class DiscussionManager {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'discussions');
    this.discussions = new Map();
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this.loadAllDiscussions();
  }

  /**
   * 创建新Discussion
   */
  async createDiscussion(topic, category, options = {}) {
    const discussion = new Discussion(
      options.id || `disc-${Date.now()}`,
      topic,
      category
    );

    if (options.description) {
      discussion.description = options.description;
    }

    if (options.participants) {
      discussion.participants = options.participants;
    }

    if (options.tags) {
      discussion.tags = options.tags;
    }

    if (options.priority) {
      discussion.priority = options.priority;
    }

    this.discussions.set(discussion.id, discussion);
    await this.saveDiscussion(discussion);

    console.log(`[DiscussionManager] 创建讨论: ${discussion.id} - ${topic}`);
    return discussion;
  }

  /**
   * 获取Discussion
   */
  async getDiscussion(discussionId) {
    if (this.discussions.has(discussionId)) {
      return this.discussions.get(discussionId);
    }

    // 尝试从磁盘加载
    return await this.loadDiscussion(discussionId);
  }

  /**
   * 获取所有Discussion
   */
  async listDiscussions(filters = {}) {
    let discussions = Array.from(this.discussions.values());

    // 按类别过滤
    if (filters.category) {
      discussions = discussions.filter(d => d.category === filters.category);
    }

    // 按状态过滤
    if (filters.status) {
      discussions = discussions.filter(d => d.status === filters.status);
    }

    // 按标签过滤
    if (filters.tag) {
      discussions = discussions.filter(d => d.tags && d.tags.includes(filters.tag));
    }

    return discussions;
  }

  /**
   * 按类别分组
   */
  async getDiscussionsByCategory() {
    const discussions = await this.listDiscussions();
    const grouped = {};

    discussions.forEach(discussion => {
      if (!grouped[discussion.category]) {
        grouped[discussion.category] = [];
      }
      grouped[discussion.category].push(discussion);
    });

    return grouped;
  }

  /**
   * 保存Discussion到磁盘
   */
  async saveDiscussion(discussion) {
    const discussionDir = path.join(this.dataDir, discussion.id);
    await fs.mkdir(discussionDir, { recursive: true });

    const filePath = path.join(discussionDir, 'discussion.json');
    await fs.writeFile(filePath, JSON.stringify(discussion, null, 2));
  }

  /**
   * 从磁盘加载Discussion
   */
  async loadDiscussion(discussionId) {
    const filePath = path.join(this.dataDir, discussionId, 'discussion.json');

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const dataObj = JSON.parse(data);

      // 转换为Discussion实例
      const discussion = new Discussion(dataObj.id, dataObj.topic, dataObj.category);
      Object.assign(discussion, dataObj);

      // 确保agentStates是Map
      if (discussion.agentStates && !(discussion.agentStates instanceof Map)) {
        discussion.agentStates = new Map(Object.entries(discussion.agentStates));
      }
      
      // 确保consensus是Map
      if (discussion.consensus && !(discussion.consensus instanceof Map)) {
        discussion.consensus = new Map(Object.entries(discussion.consensus));
      }

      this.discussions.set(discussionId, discussion);
      return discussion;
    } catch (error) {
      console.error(`[DiscussionManager] 加载讨论失败: ${discussionId}`, error);
      return null;
    }
  }

  /**
   * 加载所有Discussion
   */
  async loadAllDiscussions() {
    try {
      const files = await fs.readdir(this.dataDir);
      const discussionDirs = files.filter(f => f.startsWith('disc-') || f.startsWith('group-') || f.match(/^\d+$/));

      for (const dir of discussionDirs) {
        await this.loadDiscussion(dir);
      }

      console.log(`[DiscussionManager] 已加载 ${this.discussions.size} 个讨论`);
    } catch (error) {
      console.error('[DiscussionManager] 加载讨论失败:', error);
    }
  }

  /**
   * 更新Discussion
   */
  async updateDiscussion(discussionId, updates) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    Object.assign(discussion, updates);
    await this.saveDiscussion(discussion);
    return discussion;
  }

  /**
   * 删除Discussion
   */
  async deleteDiscussion(discussionId) {
    this.discussions.delete(discussionId);

    const discussionDir = path.join(this.dataDir, discussionId);
    await fs.rm(discussionDir, { recursive: true, force: true });

    console.log(`[DiscussionManager] 已删除讨论: ${discussionId}`);
  }

  /**
   * 搜索Discussion
   */
  async searchDiscussions(keyword, options = {}) {
    const discussions = await this.listDiscussions();
    const lowerKeyword = keyword.toLowerCase();
    const results = [];

    for (const discussion of discussions) {
      let score = 0;
      const highlights = [];

      // 搜索topic
      if (discussion.topic.toLowerCase().includes(lowerKeyword)) {
        score += 10;
        highlights.push({ field: 'topic', text: discussion.topic });
      }

      // 搜索描述
      if (discussion.description && discussion.description.toLowerCase().includes(lowerKeyword)) {
        score += 5;
        highlights.push({ field: 'description', text: discussion.description });
      }

      // 搜索类别
      if (discussion.category.toLowerCase().includes(lowerKeyword)) {
        score += 3;
        highlights.push({ field: 'category', text: discussion.category });
      }

      // 搜索标记
      if (discussion.markers && discussion.markers.length > 0) {
        for (const marker of discussion.markers) {
          if (marker.title && marker.title.toLowerCase().includes(lowerKeyword)) {
            score += 2;
            highlights.push({ field: 'marker', text: marker.title });
          }
          if (marker.summary && marker.summary.toLowerCase().includes(lowerKeyword)) {
            score += 1;
            highlights.push({ field: 'marker', text: marker.summary });
          }
        }
      }

      // 只返回有匹配的结果
      if (score > 0) {
        results.push({
          discussion,
          score,
          highlights
        });
      }
    }

    // 按得分排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    const limit = options.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * 获取统计信息
   */
  async getStatistics() {
    const discussions = await this.listDiscussions();
    const stats = {
      total: discussions.length,
      byStatus: {},
      byCategory: {},
      totalMessages: 0,
      totalMarkers: 0,
      totalParticipants: 0,
      totalTokens: 0,
      activeDiscussions: 0
    };

    for (const discussion of discussions) {
      // 按状态统计
      if (!stats.byStatus[discussion.status]) {
        stats.byStatus[discussion.status] = 0;
      }
      stats.byStatus[discussion.status]++;

      // 按类别统计
      if (!stats.byCategory[discussion.category]) {
        stats.byCategory[discussion.category] = 0;
      }
      stats.byCategory[discussion.category]++;

      // 统计消息数
      stats.totalMessages += discussion.messages?.length || 0;

      // 统计标记数
      stats.totalMarkers += discussion.markers?.length || 0;

      // 统计参与者数
      stats.totalParticipants += discussion.participants?.length || 0;

      // 统计Token
      stats.totalTokens += discussion.stats?.totalTokens || 0;

      // 统计活跃讨论（最近 24 小时内有更新）
      const lastUpdate = discussion.stats?.updatedAt || 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastUpdate > oneDayAgo) {
        stats.activeDiscussions++;
      }
    }

    return stats;
  }

  /**
   * 按标签搜索Discussion
   */
  async findDiscussionsByTag(tag) {
    const discussions = await this.listDiscussions();
    return discussions.filter(d => d.tags && d.tags.includes(tag));
  }

  /**
   * 获取所有标签
   */
  async getAllTags() {
    const discussions = await this.listDiscussions();
    const tagMap = new Map();

    for (const discussion of discussions) {
      if (discussion.tags && discussion.tags.length > 0) {
        for (const tag of discussion.tags) {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, 0);
          }
          tagMap.set(tag, tagMap.get(tag) + 1);
        }
      }
    }

    // 转换为数组并按使用次数排序
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 添加标签到Discussion
   */
  async addTagToDiscussion(discussionId, tag) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    if (!discussion.tags) {
      discussion.tags = [];
    }

    discussion.addTag(tag);
    await this.saveDiscussion(discussion);

    return discussion;
  }

  /**
   * 从Discussion移除标签
   */
  async removeTagFromDiscussion(discussionId, tag) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    if (!discussion.tags) {
      discussion.tags = [];
    }

    discussion.removeTag(tag);
    await this.saveDiscussion(discussion);

    return discussion;
  }

  /**
   * 导出Discussion
   */
  async exportDiscussion(discussionId, format = 'markdown', outputDir = null) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    // 确定输出目录
    const dir = outputDir || path.join(this.dataDir, 'exports');
    await fs.mkdir(dir, { recursive: true });

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeName = discussion.topic.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 30);
    const baseFilename = `${safeName}-${timestamp}`;

    let outputPath;
    if (format === 'json') {
      outputPath = path.join(dir, `${baseFilename}.json`);
      await exportDiscussionToJSON(discussion, outputPath);
    } else {
      // 默认 markdown
      outputPath = path.join(dir, `${baseFilename}.md`);
      await exportDiscussionToMarkdown(discussion, outputPath);
    }

    return {
      path: outputPath,
      format,
      discussionId: discussion.id,
      topic: discussion.topic
    };
  }

  /**
   * 批量导出Discussion
   */
  async exportAllDiscussions(format = 'markdown', outputDir = null) {
    const discussions = await this.listDiscussions();
    const results = [];

    for (const discussion of discussions) {
      try {
        const result = await this.exportDiscussion(discussion.id, format, outputDir);
        results.push(result);
      } catch (error) {
        console.error(`[DiscussionManager] 导出讨论失败: ${discussion.id}`, error);
        results.push({
          discussionId: discussion.id,
          topic: discussion.topic,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 归档Discussion
   */
  async archiveDiscussion(discussionId) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    if (discussion.status === 'archived') {
      throw new Error(`讨论已归档: ${discussionId}`);
    }

    discussion.status = 'archived';
    discussion.stats.updatedAt = Date.now();

    await this.saveDiscussion(discussion);

    console.log(`[DiscussionManager] 已归档讨论: ${discussionId}`);

    return discussion;
  }

  /**
   * 取消归档Discussion
   */
  async unarchiveDiscussion(discussionId) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    if (discussion.status !== 'archived') {
      throw new Error(`讨论未归档: ${discussionId}`);
    }

    discussion.status = 'active';
    discussion.stats.updatedAt = Date.now();

    await this.saveDiscussion(discussion);

    console.log(`[DiscussionManager] 已取消归档讨论: ${discussionId}`);

    return discussion;
  }

  /**
   * 获取已归档的Discussion
   */
  async getArchivedDiscussions() {
    return await this.listDiscussions({ status: 'archived' });
  }

  /**
   * 获取活跃的Discussion
   */
  async getActiveDiscussions() {
    return await this.listDiscussions({ status: 'active' });
  }

  /**
   * 获取已完成的Discussion
   */
  async getCompletedDiscussions() {
    return await this.listDiscussions({ status: 'completed' });
  }

  /**
   * 克隆Discussion
   */
  async cloneDiscussion(discussionId, newTopic = null) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    // 创建新Discussion
    const clonedDiscussion = new Discussion(
      `disc-${Date.now()}`,
      newTopic || `${discussion.topic} (副本)`,
      discussion.category
    );

    // 复制属性
    clonedDiscussion.description = discussion.description;
    clonedDiscussion.tags = [...(discussion.tags || [])];
    clonedDiscussion.participants = [...(discussion.participants || [])];

    // 不复制消息和标记
    clonedDiscussion.messages = [];
    clonedDiscussion.markers = [];

    // 重置统计
    clonedDiscussion.stats = {
      totalMessages: 0,
      totalMarkers: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 设置为活跃状态
    clonedDiscussion.status = 'active';

    // 保存
    this.discussions.set(clonedDiscussion.id, clonedDiscussion);
    await this.saveDiscussion(clonedDiscussion);

    console.log(`[DiscussionManager] 已克隆讨论: ${discussionId} -> ${clonedDiscussion.id}`);

    return clonedDiscussion;
  }

  /**
   * 设置Discussion备注
   */
  async setDiscussionNotes(discussionId, notes) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    discussion.setNotes(notes);
    await this.saveDiscussion(discussion);

    return discussion;
  }

  /**
   * 追加Discussion备注
   */
  async appendDiscussionNotes(discussionId, text) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    discussion.appendNotes(text);
    await this.saveDiscussion(discussion);

    return discussion;
  }

  /**
   * 获取Discussion备注
   */
  async getDiscussionNotes(discussionId) {
    const discussion = await this.getDiscussion(discussionId);
    if (!discussion) {
      throw new Error(`讨论不存在: ${discussionId}`);
    }

    return discussion.getNotes();
  }
}

module.exports = DiscussionManager;
