/**
 * MAD v4.0 - Discussion数据模型
 *
 * 核心概念：
 * - Discussion = 完整讨论，一条连续的消息流
 * - Marker = Agent 自动标记的重要时刻锚点
 * 
 * 从ProjectGroup重构而来，统一概念为Discussion
 */

/**
 * Discussion - 讨论组
 * 
 * 核心数据模型，支持：
 * - 消息流管理
 * - 智能标记
 * - 标签系统
 * - 备注功能
 * - 优先级
 * - Token统计
 * - 状态管理
 */
class Discussion {
  constructor(id, topic, category) {
    this.id = id;
    this.topic = topic;  // 统一使用topic替代name
    this.category = category;  // '需求讨论' | '功能研发' | '功能测试' | '文档编写'
    this.messages = [];
    this.markers = [];
    this.participants = [];
    this.tags = [];  // 讨论标签
    this.notes = ''; // 讨论备注
    this.priority = 'medium'; // 优先级: low, medium, high, critical
    
    // 统计信息
    this.stats = {
      totalMessages: 0,
      totalMarkers: 0,
      totalTokens: 0,
      inputTokens: 0,  // 新增：输入Token
      outputTokens: 0, // 新增：输出Token
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.status = 'active';  // active, completed, archived
    
    // Agent发言状态（新增）
    this.agentStates = new Map();
    this.rounds = 0;  // 讨论轮数
    this.conflicts = [];  // 冲突列表
    this.consensus = new Map();  // 共识记录
  }

  /**
   * 添加消息
   */
  addMessage(message, metadata = {}) {
    message.id = `msg-${Date.now()}-${this.messages.length}`;
    message.timestamp = Date.now();
    this.messages.push(message);
    
    // Token统计（新增）
    if (metadata.tokens) {
      this.stats.inputTokens += metadata.tokens.input || 0;
      this.stats.outputTokens += metadata.tokens.output || 0;
      this.stats.totalTokens = this.stats.inputTokens + this.stats.outputTokens;
      
      // 记录Token历史
      if (!this.stats.tokenHistory) {
        this.stats.tokenHistory = [];
      }
      this.stats.tokenHistory.push({
        timestamp: Date.now(),
        messageId: message.id,
        role: message.role,
        tokens: metadata.tokens
      });
    }
    
    this.stats.totalMessages++;
    this.stats.updatedAt = Date.now();
    
    // 检查是否需要压缩（新增）
    if (this.stats.totalTokens > 80000) {
      this.compressContext();
    }
  }

  /**
   * Agent发言（新增）
   */
  async agentSpeak(agentId, content, options = {}) {
    const message = {
      role: agentId,
      content: content,
      timestamp: Date.now(),
      round: this.rounds,
      isMarker: options.isMarker || false,
      markerData: options.markerData || null
    };

    this.addMessage(message, options.metadata || {});
    
    // 更新Agent状态
    if (this.agentStates) {
      this.agentStates.set(agentId, {
        lastSpoke: Date.now(),
        messageCount: (this.agentStates.get(agentId)?.messageCount || 0) + 1
      });
    }
    
    return message;
  }

  /**
   * 添加标记
   */
  addMarker(marker) {
    this.markers.push(marker);
    this.stats.totalMarkers++;
    this.stats.updatedAt = Date.now();
  }

  /**
   * Token管理：获取Token统计（新增）
   */
  getTokenStats() {
    return {
      total: this.stats.totalTokens || 0,
      input: this.stats.inputTokens || 0,
      output: this.stats.outputTokens || 0,
      avgPerMessage: this.messages.length > 0
        ? Math.round((this.stats.totalTokens || 0) / this.messages.length)
        : 0
    };
  }

  /**
   * Token管理：压缩上下文（新增）
   */
  compressContext() {
    const totalTokens = this.stats.totalTokens || 0;
    
    if (totalTokens < 80000) {
      console.log(`[Discussion] Token使用量 ${totalTokens}，无需压缩`);
      return;
    }

    console.log(`[Discussion] Token使用量 ${totalTokens}，开始压缩...`);

    // 保留最近50条消息
    const recentMessages = this.messages.slice(-50);
    
    // 保留所有标记
    const markerMessages = this.markers.map(m => ({
      role: 'marker',
      content: m.summary || m.title,
      isMarker: true,
      markerType: m.type,
      timestamp: m.timestamp
    }));

    // 生成早期消息摘要
    const earlySummary = this._generateEarlySummary();

    // 重建消息流
    this.messages = [
      { 
        role: 'system', 
        content: `[早期讨论摘要]\n${earlySummary}`,
        timestamp: Date.now()
      },
      ...markerMessages,
      ...recentMessages
    ];

    console.log(`[Discussion] 上下文已压缩，消息数从 ${this.stats.totalMessages} 减少到 ${this.messages.length}`);
  }

  /**
   * 生成早期消息摘要
   */
  _generateEarlySummary() {
    if (this.markers && this.markers.length > 0) {
      return this.markers.map(m => `- ${m.title}: ${m.summary}`).join('\n');
    }
    
    // 简单摘要
    const phases = {};
    this.messages.forEach(msg => {
      const phase = msg.round || 0;
      if (!phases[phase]) {
        phases[phase] = msg;
      }
    });

    return Object.values(phases)
      .map(msg => `[${msg.role}] ${(msg.content || '').slice(0, 100)}...`)
      .join('\n');
  }

  /**
   * 更新Token计数（保留，向后兼容）
   */
  updateTokenCount(tokens) {
    this.stats.totalTokens += tokens;
  }

  /**
   * 标签管理：添加标签
   */
  addTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.stats.updatedAt = Date.now();
    }
  }

  /**
   * 标签管理：移除标签
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag);
    if (index > -1) {
      this.tags.splice(index, 1);
      this.stats.updatedAt = Date.now();
    }
  }

  /**
   * 标签管理：检查是否有标签
   */
  hasTag(tag) {
    return this.tags.includes(tag);
  }

  /**
   * 标签管理：获取所有标签
   */
  getTags() {
    return [...this.tags];
  }

  /**
   * 备注管理：设置备注
   */
  setNotes(notes) {
    this.notes = notes;
    this.stats.updatedAt = Date.now();
  }

  /**
   * 备注管理：获取备注
   */
  getNotes() {
    return this.notes;
  }

  /**
   * 备注管理：追加备注
   */
  appendNotes(text) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const separator = this.notes ? '\n\n' : '';

    this.notes += separator + `--- ${timestamp} ---\n${text}`;
    this.stats.updatedAt = Date.now();
  }

  /**
   * 优先级管理：设置优先级
   */
  setPriority(priority) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      throw new Error(`无效的优先级: ${priority}，必须是 ${validPriorities.join(', ')}`);
    }
    this.priority = priority;
    this.stats.updatedAt = Date.now();
  }

  /**
   * 优先级管理：获取优先级
   */
  getPriority() {
    return this.priority;
  }

  /**
   * 优先级管理：获取优先级数值（用于排序）
   */
  getPriorityValue() {
    const values = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    return values[this.priority] || 2;
  }

  /**
   * 获取所有标记
   */
  getMarkers() {
    return [...this.markers];
  }

  /**
   * 检测冲突（新增）
   */
  detectConflicts() {
    // TODO: 实现冲突检测逻辑
    return this.conflicts || [];
  }

  /**
   * 达成共识（新增）
   */
  buildConsensus() {
    // TODO: 实现共识逻辑
    return this.consensus || new Map();
  }

  /**
   * 检查Agent是否应该发言（新增）
   */
  shouldAgentSpeak(agentId, context) {
    // TODO: 实现智能判断逻辑
    return true;
  }
}

/**
 * Marker - 节点标记
 * 
 * 标记讨论中的重要时刻
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
  Discussion,
  Marker
};
