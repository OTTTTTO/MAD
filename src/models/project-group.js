/**
 * MAD v3.0 - 项目组数据模型
 *
 * 核心概念：
 * - 项目组 = 完整项目，一条连续的消息流
 * - 节点 = Agent 自动标记的重要时刻锚点
 */

/**
 * 项目组
 */
class ProjectGroup {
  constructor(id, name, category) {
    this.id = id;
    this.name = name;
    this.category = category;  // '需求讨论' | '功能研发' | '功能测试' | '文档编写'
    this.messages = [];
    this.markers = [];
    this.participants = [];
    this.tags = [];  // 项目标签
    this.stats = {
      totalMessages: 0,
      totalMarkers: 0,
      totalTokens: 0,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.status = 'active';  // active, completed, archived
  }

  addMessage(message) {
    message.id = `msg-${Date.now()}-${this.messages.length}`;
    message.timestamp = Date.now();
    this.messages.push(message);
    this.stats.totalMessages++;
    this.stats.updatedAt = Date.now();
  }

  addMarker(marker) {
    this.markers.push(marker);
    this.stats.totalMarkers++;
    this.stats.updatedAt = Date.now();
  }

  updateTokenCount(tokens) {
    this.stats.totalTokens += tokens;
  }

  /**
   * 添加标签
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.stats.updatedAt = Date.now();
    }
  }

  /**
   * 移除标签
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.stats.updatedAt = Date.now();
    }
  }

  /**
   * 检查是否有标签
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * 获取所有标签
   */
  getTags() {
    return [...this.tags];
  }
}

/**
 * 节点标记
 */
class Marker {
  constructor(id, title, type, messageId) {
    this.id = id;
    this.title = title;
    this.type = type;  // 'milestone' | 'decision' | 'problem' | 'solution'
    this.messageId = messageId;
    this.summary = '';
    this.conclusions = [];
    this.tags = [];
    this.timestamp = Date.now();
    this.tokens = 0;
  }

  setSummary(summary) {
    this.summary = summary;
  }

  addConclusion(conclusion) {
    this.conclusions.push(conclusion);
  }

  addTag(tag) {
    this.tags.push(tag);
  }
}

module.exports = {
  ProjectGroup,
  Marker
};
