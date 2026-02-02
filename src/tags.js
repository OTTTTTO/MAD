/**
 * 讨论标签系统
 * 用于分类和组织讨论
 */

const fs = require('fs');
const path = require('path');

class TagManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || 'data/tags';
    this.tagsFile = path.join(this.dataDir, 'tags.json');
    this.taggingsFile = path.join(this.dataDir, 'taggings.json');

    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // 加载数据
    this.tags = this._loadTags();
    this.taggings = this._loadTaggings();
  }

  // 加载标签定义
  _loadTags() {
    if (fs.existsSync(this.tagsFile)) {
      try {
        const content = fs.readFileSync(this.tagsFile, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error('Failed to load tags:', err.message);
      }
    }

    // 默认标签
    return [
      { id: 'brainstorm', name: '头脑风暴', color: '#3498db', icon: '💡' },
      { id: 'technical', name: '技术讨论', color: '#e74c3c', icon: '🔧' },
      { id: 'product', name: '产品规划', color: '#2ecc71', icon: '📦' },
      { id: 'research', name: '用户研究', color: '#9b59b6', icon: '👥' },
      { id: 'decision', name: '决策会议', color: '#f39c12', icon: '🎯' },
      { id: 'review', name: '代码审查', color: '#1abc9c', icon: '👀' }
    ];
  }

  // 加载标签关联
  _loadTaggings() {
    if (fs.existsSync(this.taggingsFile)) {
      try {
        const content = fs.readFileSync(this.taggingsFile, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error('Failed to load taggings:', err.message);
      }
    }
    return {};
  }

  // 保存标签定义
  _saveTags() {
    fs.writeFileSync(this.tagsFile, JSON.stringify(this.tags, null, 2), 'utf8');
  }

  // 保存标签关联
  _saveTaggings() {
    fs.writeFileSync(this.taggingsFile, JSON.stringify(this.taggings, null, 2), 'utf8');
  }

  // 获取所有标签
  getAllTags() {
    return this.tags;
  }

  // 获取单个标签
  getTag(tagId) {
    return this.tags.find(t => t.id === tagId);
  }

  // 创建标签
  createTag(tagData) {
    const { name, color = '#3498db', icon = '🏷️' } = tagData;
    const id = name.toLowerCase().replace(/\s+/g, '-');

    if (this.tags.find(t => t.id === id)) {
      throw new Error(`Tag "${id}" already exists`);
    }

    const newTag = { id, name, color, icon };
    this.tags.push(newTag);
    this._saveTags();

    return newTag;
  }

  // 更新标签
  updateTag(tagId, updates) {
    const index = this.tags.findIndex(t => t.id === tagId);
    if (index === -1) {
      throw new Error(`Tag "${tagId}" not found`);
    }

    this.tags[index] = { ...this.tags[index], ...updates };
    this._saveTags();

    return this.tags[index];
  }

  // 删除标签
  deleteTag(tagId) {
    const index = this.tags.findIndex(t => t.id === tagId);
    if (index === -1) {
      throw new Error(`Tag "${tagId}" not found`);
    }

    this.tags.splice(index, 1);
    this._saveTags();

    // 删除所有关联
    for (const discussionId in this.taggings) {
      this.taggings[discussionId] = this.taggings[discussionId].filter(t => t !== tagId);
    }
    this._saveTags();
  }

  // 给讨论添加标签
  addTagToDiscussion(discussionId, tagId) {
    if (!this.taggings[discussionId]) {
      this.taggings[discussionId] = [];
    }

    if (!this.taggings[discussionId].includes(tagId)) {
      this.taggings[discussionId].push(tagId);
      this._saveTaggings();
    }
  }

  // 从讨论移除标签
  removeTagFromDiscussion(discussionId, tagId) {
    if (!this.taggings[discussionId]) return;

    this.taggings[discussionId] = this.taggings[discussionId].filter(t => t !== tagId);
    this._saveTaggings();
  }

  // 获取讨论的标签
  getDiscussionTags(discussionId) {
    const tagIds = this.taggings[discussionId] || [];
    return tagIds.map(id => this.getTag(id)).filter(Boolean);
  }

  // 设置讨论的标签（覆盖）
  setDiscussionTags(discussionId, tagIds) {
    this.taggings[discussionId] = tagIds;
    this._saveTaggings();
  }

  // 获取标签下的所有讨论
  getDiscussionsByTag(tagId) {
    const discussions = [];
    for (const [discussionId, tags] of Object.entries(this.taggings)) {
      if (tags.includes(tagId)) {
        discussions.push(discussionId);
      }
    }
    return discussions;
  }

  // 获取标签统计
  getTagStats() {
    const stats = {};

    for (const tag of this.tags) {
      stats[tag.id] = {
        ...tag,
        discussionCount: 0
      };
    }

    for (const tagIds of Object.values(this.taggings)) {
      for (const tagId of tagIds) {
        if (stats[tagId]) {
          stats[tagId].discussionCount++;
        }
      }
    }

    return Object.values(stats);
  }

  // 根据讨论内容自动推荐标签
  suggestTags(topic, messages = []) {
    const suggestions = [];
    const text = (topic + ' ' + messages.map(m => m.content).join(' ')).toLowerCase();

    // 简单的关键词匹配
    const keywords = {
      'brainstorm': ['想法', '创新', '头脑风暴', 'brainstorm', 'idea', '创新'],
      'technical': ['技术', '代码', '架构', '实现', 'bug', '修复', 'technical'],
      'product': ['产品', '功能', '需求', '用户', '体验', 'product'],
      'research': ['研究', '调研', '分析', '数据', '用户', 'research'],
      'decision': ['决策', '决定', '选择', '方案', 'decision'],
      'review': ['审查', '代码', 'review', '检查']
    };

    for (const [tagId, words] of Object.entries(keywords)) {
      const matchCount = words.filter(w => text.includes(w)).length;
      if (matchCount > 0) {
        const tag = this.getTag(tagId);
        if (tag) {
          suggestions.push({ ...tag, score: matchCount });
        }
      }
    }

    return suggestions.sort((a, b) => b.score - a.score);
  }

  // 导出标签数据
  exportTags() {
    return {
      tags: this.tags,
      taggings: this.taggings,
      exportedAt: new Date().toISOString()
    };
  }

  // 导入标签数据
  importTags(data) {
    if (data.tags) {
      this.tags = data.tags;
      this._saveTags();
    }

    if (data.taggings) {
      this.taggings = data.taggings;
      this._saveTaggings();
    }
  }
}

module.exports = { TagManager };
