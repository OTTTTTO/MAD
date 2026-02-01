#!/usr/bin/env node

/**
 * Multi-Agent Discussion Orchestrator
 * 
 * 核心功能：
 * 1. 创建虚拟讨论组，让多个 Agent 协同讨论
 * 2. Agent 之间可以互相 @ 和回应
 * 3. 动态发言 - Agent 根据上下文判断是否需要发言
 * 4. 冲突检测 - 识别意见分歧并组织辩论
 * 5. 讨论总结 - 综合多方意见形成结论
 * 
 * @module multi-agent-discuss
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * 讨论组配置
 */
class DiscussionConfig {
  constructor(options = {}) {
    this.maxDuration = options.maxDuration || 300000; // 5分钟
    this.maxRounds = options.maxRounds || 10;
    this.minParticipants = options.minParticipants || 2;
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    this.enableConflictDetection = options.enableConflictDetection !== false;
    this.enableDynamicSpeaking = options.enableDynamicSpeaking !== false;
  }
}

/**
 * 讨论上下文（共享状态）
 */
class DiscussionContext {
  constructor(id, topic, participants) {
    this.id = id;
    this.topic = topic;
    this.participants = participants;
    this.messages = [];
    this.status = 'initializing'; // initializing, active, concluding, ended
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.rounds = 0;
    this.conflicts = [];
    this.consensus = new Map();
  }

  addMessage(role, content, metadata = {}) {
    const message = {
      id: `msg-${this.messages.length + 1}`,
      role,
      content,
      timestamp: Date.now(),
      round: this.rounds,
      metadata
    };
    this.messages.push(message);
    this.updatedAt = Date.now();
    return message;
  }

  getMessagesForRole(role) {
    return this.messages.filter(m => m.role === role);
  }

  getRecentMessages(count = 5) {
    return this.messages.slice(-count);
  }

  getAllRoles() {
    return this.participants.map(p => p.role);
  }

  findMentions(targetRole) {
    return this.messages.filter(m => 
      m.content.includes(`@${targetRole}`) || 
      m.content.includes(`@${targetRole.split(' ')[0]}`)
    );
  }
}

/**
 * Agent 定义
 */
class AgentDefinition {
  constructor(config) {
    this.id = config.id;
    this.role = config.role;
    this.emoji = config.emoji || '🤖';
    this.systemPrompt = config.systemPrompt;
    this.agentId = config.agentId || 'main';
    this.triggerKeywords = config.triggerKeywords || [];
    this.responseRequired = config.responseRequired || false;
    this.speakProbability = config.speakProbability || 0.5;
    this.personality = config.personality || 'balanced';
  }
}

/**
 * 预定义的 Agent 角色配置
 */
const AGENT_ROLES = {
  coordinator: {
    id: 'coordinator',
    role: '主协调员',
    emoji: '💡',
    agentId: 'main',
    systemPrompt: '你是讨论协调员，负责引导讨论方向、识别分歧、总结共识',
    responseRequired: false,
    speakProbability: 0.3
  },
  
  market_research: {
    id: 'market_research',
    role: '市场调研',
    emoji: '📊',
    agentId: 'main',
    systemPrompt: '你是市场调研专家，评估商业价值、市场需求、竞争态势',
    triggerKeywords: ['市场', '用户', '价值', '竞争', '需求'],
    speakProbability: 0.6
  },
  
  requirement: {
    id: 'requirement',
    role: '需求分析',
    emoji: '🎯',
    agentId: 'main',
    systemPrompt: '你是需求分析专家，梳理用户需求、功能边界、使用场景',
    triggerKeywords: ['需求', '功能', '场景', '用户'],
    speakProbability: 0.7
  },
  
  technical: {
    id: 'technical',
    role: '技术可行性',
    emoji: '🔧',
    agentId: 'main',
    systemPrompt: '你是技术架构专家，评估技术实现方案、难点、工作量',
    triggerKeywords: ['技术', '实现', '开发', '架构', '代码'],
    speakProbability: 0.7
  },
  
  testing: {
    id: 'testing',
    role: '测试',
    emoji: '🧪',
    agentId: 'main',
    systemPrompt: '你是测试专家，考虑质量保障、测试策略、风险控制',
    triggerKeywords: ['测试', '质量', '风险', '验证'],
    speakProbability: 0.5
  },
  
  documentation: {
    id: 'documentation',
    role: '文档',
    emoji: '📝',
    agentId: 'main',
    systemPrompt: '你是文档专家，整理讨论内容、编写文档、记录决策',
    triggerKeywords: ['文档', '记录', '总结'],
    speakProbability: 0.3
  }
};

/**
 * 讨论协调器（核心引擎）
 */
class DiscussionOrchestrator {
  constructor(config = new DiscussionConfig()) {
    this.config = config;
    this.discussions = new Map();
    this.dataDir = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss');
    this.agentStats = new Map(); // Agent 统计
  }

  /**
   * 初始化数据目录
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'discussions'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'logs'), { recursive: true });
      console.log('[Orchestrator] Initialized successfully');
    } catch (error) {
      console.error('[Orchestrator] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 创建新的讨论组
   */
  async createDiscussion(topic, options = {}) {
    const discussionId = `disc-${Date.now()}`;
    
    // 选择参与角色
    const selectedRoles = options.participants || 
      this.selectParticipantsForTopic(topic);
    
    const participants = selectedRoles.map(roleConfig => 
      new AgentDefinition(roleConfig)
    );

    const context = new DiscussionContext(discussionId, topic, participants);
    context.status = 'active';
    
    this.discussions.set(discussionId, context);
    
    // 保存讨论上下文
    await this.saveDiscussion(context);
    
    console.log(`[Orchestrator] Created discussion ${discussionId}`);
    console.log(`[Orchestrator] Topic: ${topic}`);
    console.log(`[Orchestrator] Participants: ${participants.map(p => p.role).join(', ')}`);
    
    return {
      discussionId,
      context,
      participants
    };
  }

  /**
   * 根据主题自动选择参与角色
   */
  selectParticipantsForTopic(topic) {
    const topicLower = topic.toLowerCase();
    const selectedRoles = [AGENT_ROLES.coordinator]; // 始终包含协调员
    
    // 关键词匹配
    for (const [key, role] of Object.entries(AGENT_ROLES)) {
      if (key === 'coordinator') continue;
      
      const hasKeyword = role.triggerKeywords.some(kw => 
        topicLower.includes(kw.toLowerCase())
      );
      
      if (hasKeyword || Math.random() > 0.5) {
        selectedRoles.push(role);
      }
    }
    
    // 确保至少有2个参与者
    if (selectedRoles.length < 2) {
      selectedRoles.push(AGENT_ROLES.requirement);
      selectedRoles.push(AGENT_ROLES.technical);
    }
    
    return selectedRoles;
  }

  /**
   * Agent 发言
   */
  async agentSpeak(discussionId, agentId, content, metadata = {}) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const participant = context.participants.find(p => p.id === agentId);
    if (!participant) {
      throw new Error(`Agent ${agentId} not in discussion`);
    }

    // 添加消息到上下文
    const message = context.addMessage(agentId, content, {
      agentRole: participant.role,
      ...metadata
    });

    // 更新 Agent 统计
    this.updateAgentStats(agentId, 'message');

    // 检查是否 @ 了其他人
    const mentionedAgents = this.extractMentions(content);
    mentionedAgents.forEach(mentionedId => {
      this.updateAgentStats(mentionedId, 'mention');
    });

    // 保存更新
    await this.saveDiscussion(context);
    
    // 检测冲突
    if (this.config.enableConflictDetection) {
      await this.detectConflicts(context);
    }

    console.log(`[Orchestrator] ${participant.role} spoke in ${discussionId}`);
    
    return message;
  }

  /**
   * 判断 Agent 是否应该发言
   */
  shouldAgentSpeak(context, agentId) {
    if (!this.config.enableDynamicSpeaking) {
      return true;
    }

    const participant = context.participants.find(p => p.id === agentId);
    if (!participant) return false;

    // 如果被 @，必须回应
    const mentions = context.findMentions(agentId);
    const recentMentions = mentions.filter(m => 
      Date.now() - m.timestamp < 60000 // 1分钟内的@
    );
    
    if (recentMentions.length > 0) {
      return true;
    }

    // 检查是否是必须回应的 Agent
    if (participant.responseRequired) {
      return true;
    }

    // 基于发言概率随机决定
    if (Math.random() < participant.speakProbability) {
      return true;
    }

    // 检查触发关键词
    const recentMessages = context.getRecentMessages(3);
    const hasTriggerKeyword = recentMessages.some(m => 
      participant.triggerKeywords.some(kw => 
        m.content.toLowerCase().includes(kw.toLowerCase())
      )
    );

    return hasTriggerKeyword;
  }

  /**
   * 检测冲突
   */
  async detectConflicts(context) {
    const conflicts = [];
    
    // 简化的冲突检测：寻找观点对立的陈述
    const oppositionPatterns = [
      { positive: ['值得做', '可行', '支持'], negative: ['不值得', '不可行', '反对'] },
      { positive: ['技术难度低', '容易实现'], negative: ['技术难度高', '很难实现'] },
      { positive: ['市场需求大', '有价值'], negative: ['市场需求小', '没价值'] }
    ];

    for (const pattern of oppositionPatterns) {
      const positiveMessages = context.messages.filter(m => 
        pattern.positive.some(p => m.content.includes(p))
      );
      const negativeMessages = context.messages.filter(m => 
        pattern.negative.some(n => m.content.includes(n))
      );

      if (positiveMessages.length > 0 && negativeMessages.length > 0) {
        conflicts.push({
          type: 'opinion_divergence',
          positiveAgents: [...new Set(positiveMessages.map(m => m.role))],
          negativeAgents: [...new Set(negativeMessages.map(m => m.role))],
          pattern
        });
      }
    }

    context.conflicts = conflicts;
    return conflicts;
  }

  /**
   * 获取讨论摘要
   */
  getDiscussionSummary(discussionId) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    return {
      id: context.id,
      topic: context.topic,
      status: context.status,
      participants: context.participants.map(p => ({
        id: p.id,
        role: p.role,
        emoji: p.emoji
      })),
      messageCount: context.messages.length,
      rounds: context.rounds,
      conflicts: context.conflicts.length,
      duration: Date.now() - context.createdAt,
      recentMessages: context.getRecentMessages(5)
    };
  }

  /**
   * 获取完整讨论历史
   */
  getDiscussionHistory(discussionId) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    return {
      discussion: {
        id: context.id,
        topic: context.topic,
        status: context.status,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt
      },
      participants: context.participants,
      messages: context.messages,
      conflicts: context.conflicts,
      summary: this.generateSummary(context)
    };
  }

  /**
   * 生成讨论总结
   */
  generateSummary(context) {
    const keyPoints = [];
    const decisions = [];
    const openQuestions = [];

    // 分析消息提取关键点
    context.messages.forEach(msg => {
      // 查找"建议"、"我认为"等关键词
      if (msg.content.includes('建议') || msg.content.includes('认为')) {
        keyPoints.push({
          agent: msg.role,
          point: msg.content
        });
      }
      
      // 查找共识标记
      if (msg.content.includes('同意') || msg.content.includes('达成共识')) {
        decisions.push({
          agent: msg.role,
          decision: msg.content
        });
      }
      
      // 查找问题
      if (msg.content.includes('?') || msg.content.includes('？')) {
        openQuestions.push({
          agent: msg.role,
          question: msg.content
        });
      }
    });

    return {
      keyPoints: keyPoints.slice(-5), // 最近5个关键点
      decisions,
      openQuestions: openQuestions.slice(-3),
      participantCount: context.participants.length,
      messageCount: context.messages.length
    };
  }

  /**
   * 保存讨论上下文到磁盘
   */
  async saveDiscussion(context) {
    const filepath = path.join(
      this.dataDir, 
      'discussions', 
      `${context.id}.json`
    );
    
    try {
      await fs.writeFile(
        filepath, 
        JSON.stringify(context, null, 2), 
        'utf8'
      );
    } catch (error) {
      console.error(`[Orchestrator] Failed to save discussion:`, error);
    }
  }

  /**
   * 加载讨论上下文
   */
  async loadDiscussion(discussionId) {
    const filepath = path.join(
      this.dataDir, 
      'discussions', 
      `${discussionId}.json`
    );
    
    try {
      const data = await fs.readFile(filepath, 'utf8');
      const context = JSON.parse(data);
      
      // 恢复原型方法
      Object.setPrototypeOf(context, DiscussionContext.prototype);
      
      this.discussions.set(discussionId, context);
      return context;
    } catch (error) {
      console.error(`[Orchestrator] Failed to load discussion:`, error);
      return null;
    }
  }

  /**
   * 列出所有讨论
   */
  listDiscussions() {
    return Array.from(this.discussions.values()).map(ctx => ({
      id: ctx.id,
      topic: ctx.topic,
      status: ctx.status,
      participants: ctx.participants.length,
      messageCount: ctx.messages.length,
      createdAt: ctx.createdAt
    }));
  }

  /**
   * 结束讨论
   */
  async endDiscussion(discussionId) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    context.status = 'ended';
    context.endedAt = Date.now();
    
    await this.saveDiscussion(context);
    
    console.log(`[Orchestrator] Discussion ${discussionId} ended`);
    
    return this.getDiscussionHistory(discussionId);
  }

  /**
   * 清理过期讨论
   */
  async cleanupOldDiscussions(maxAge = 86400000) { // 24小时
    const now = Date.now();
    const toDelete = [];
    
    for (const [id, context] of this.discussions.entries()) {
      if (now - context.createdAt > maxAge) {
        toDelete.push(id);
      }
    }
    
    for (const id of toDelete) {
      this.discussions.delete(id);
      
      const filepath = path.join(
        this.dataDir, 
        'discussions', 
        `${id}.json`
      );
      
      try {
        await fs.unlink(filepath);
        console.log(`[Orchestrator] Cleaned up discussion ${id}`);
      } catch (error) {
        console.error(`[Orchestrator] Failed to cleanup ${id}:`, error);
      }
    }
    
    return toDelete.length;
  }

  /**
   * 更新 Agent 统计
   */
  updateAgentStats(agentId, action, data = {}) {
    if (!this.agentStats.has(agentId)) {
      this.agentStats.set(agentId, new AgentStats(agentId));
    }
    
    const stats = this.agentStats.get(agentId);
    stats.update(action, data);
  }

  /**
   * 获取 Agent 统计
   */
  getAgentStats(agentId) {
    if (!this.agentStats.has(agentId)) {
      return null;
    }
    return this.agentStats.get(agentId).getSummary();
  }

  /**
   * 获取所有 Agent 统计
   */
  getAllAgentStats() {
    const stats = {};
    for (const [id, agentStats] of this.agentStats.entries()) {
      stats[id] = agentStats.getSummary();
    }
    return stats;
  }

  /**
   * 提取消息中的 @mentions
   */
  extractMentions(content) {
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  /**
   * 导出讨论为 Markdown
   */
  exportToMarkdown(discussionId) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const lines = [];
    
    // 标题
    lines.push(`# 讨论记录：${context.topic}`);
    lines.push('');
    
    // 元信息
    const createdAt = new Date(context.createdAt).toLocaleString('zh-CN');
    const endedAt = context.endedAt ? new Date(context.endedAt).toLocaleString('zh-CN') : '进行中';
    
    lines.push(`**开始时间：** ${createdAt}`);
    lines.push(`**结束时间：** ${endedAt}`);
    lines.push(`**参与者：** ${context.participants.map(p => `${p.emoji} ${p.role}`).join('、')}`);
    lines.push(`**消息数：** ${context.messages.length} 条`);
    lines.push('');
    
    // 冲突信息
    if (context.conflicts.length > 0) {
      lines.push('**识别到的冲突：**');
      context.conflicts.forEach((conflict, i) => {
        lines.push(`${i + 1}. ${conflict.type}`);
      });
      lines.push('');
    }
    
    lines.push('---');
    lines.push('');
    
    // 消息内容
    context.messages.forEach(msg => {
      const participant = context.participants.find(p => p.id === msg.role);
      const emoji = participant ? participant.emoji : '🤖';
      const role = participant ? participant.role : msg.role;
      const time = new Date(msg.timestamp).toLocaleString('zh-CN');
      
      lines.push(`## ${emoji} ${role}`);
      lines.push(`*${time}*`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    });
    
    // 总结
    if (context.messages.length > 0) {
      const summary = this.generateSummary(context);
      
      lines.push('## 📊 讨论总结');
      lines.push('');
      
      if (summary.keyPoints.length > 0) {
        lines.push('### 关键观点');
        summary.keyPoints.forEach(point => {
          lines.push(`- **${point.agent}:** ${point.point.substring(0, 100)}...`);
        });
        lines.push('');
      }
      
      if (summary.decisions.length > 0) {
        lines.push('### 达成的决策');
        summary.decisions.forEach(decision => {
          lines.push(`- ${decision.decision.substring(0, 100)}...`);
        });
        lines.push('');
      }
      
      if (summary.openQuestions.length > 0) {
        lines.push('### 待解决问题');
        summary.openQuestions.forEach(q => {
          lines.push(`- ${q.question}`);
        });
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }

  /**
   * 导出讨论为 JSON
   */
  exportToJson(discussionId) {
    const history = this.getDiscussionHistory(discussionId);
    return JSON.stringify(history, null, 2);
  }

  /**
   * 搜索讨论
   */
  searchDiscussions(query, options = {}) {
    const results = {
      discussions: [],
      messages: []
    };

    const queryLower = query.toLowerCase();

    // 搜索讨论标题
    for (const [id, context] of this.discussions.entries()) {
      if (context.topic.toLowerCase().includes(queryLower)) {
        results.discussions.push({
          id,
          topic: context.topic,
          status: context.status,
          messageCount: context.messages.length,
          participants: context.participants.map(p => p.role)
        });
      }

      // 搜索消息内容
      const matchingMessages = context.messages.filter(msg =>
        msg.content.toLowerCase().includes(queryLower)
      );

      matchingMessages.forEach(msg => {
        const participant = context.participants.find(p => p.id === msg.role);
        results.messages.push({
          discussionId: id,
          discussionTopic: context.topic,
          messageId: msg.id,
          role: msg.role,
          roleName: participant ? participant.role : msg.role,
          emoji: participant ? participant.emoji : '🤖',
          content: msg.content,
          timestamp: msg.timestamp,
          highlight: this.highlightText(msg.content, query)
        });
      });
    }

    // 排序：最新的在前
    results.messages.sort((a, b) => b.timestamp - a.timestamp);

    // 应用过滤
    if (options.status) {
      results.discussions = results.discussions.filter(d => d.status === options.status);
    }

    if (options.role) {
      results.messages = results.messages.filter(m => m.role === options.role);
    }

    return results;
  }

  /**
   * 高亮文本
   */
  highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  /**
   * 获取讨论统计
   */
  getDiscussionStats(discussionId) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    // 基础统计
    const stats = {
      discussionId,
      topic: context.topic,
      status: context.status,
      messageCount: context.messages.length,
      participantCount: context.participants.length,
      duration: context.endedAt 
        ? context.endedAt - context.createdAt 
        : Date.now() - context.createdAt,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt
    };

    // Agent 统计
    stats.agentStats = {};
    context.participants.forEach(p => {
      const agentMessages = context.getMessagesForRole(p.id);
      stats.agentStats[p.id] = {
        id: p.id,
        role: p.role,
        emoji: p.emoji,
        messageCount: agentMessages.length,
        percentage: context.messages.length > 0 
          ? (agentMessages.length / context.messages.length * 100).toFixed(1)
          : 0
      };
    });

    // 最活跃的 Agent
    const sortedAgents = Object.values(stats.agentStats)
      .sort((a, b) => b.messageCount - a.messageCount);
    stats.mostActiveAgent = sortedAgents[0] || null;

    // 时间分布
    stats.timeDistribution = this.calculateTimeDistribution(context.messages);

    // 关键词频率
    stats.keywordFrequency = this.calculateKeywordFrequency(context.messages);

    return stats;
  }

  /**
   * 计算时间分布
   */
  calculateTimeDistribution(messages) {
    if (messages.length === 0) return {};

    const distribution = {};
    
    messages.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours();
      const key = `${hour}:00`;
      distribution[key] = (distribution[key] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 计算关键词频率
   */
  calculateKeywordFrequency(messages, topN = 10) {
    const frequency = {};
    const stopWords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);

    messages.forEach(msg => {
      // 简单的分词（按空格和标点）
      const words = msg.content
        .toLowerCase()
        .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 1 && !stopWords.has(w));

      words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });
    });

    // 返回前 N 个
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .reduce((obj, [word, count]) => {
        obj[word] = count;
        return obj;
      }, {});
  }
}

/**
 * Agent 统计数据
 */
class AgentStats {
  constructor(agentId) {
    this.agentId = agentId;
    this.messageCount = 0;
    this.mentionsReceived = 0;
    this.conflictsResolved = 0;
    this.consensusReached = 0;
    this.lastActive = null;
    this.karma = 0;
    this.verified = false;
  }

  /**
   * 更新统计
   */
  update(action, data = {}) {
    switch (action) {
      case 'message':
        this.messageCount++;
        this.lastActive = Date.now();
        this.karma += 1;
        break;
      case 'mention':
        this.mentionsReceived++;
        this.karma += 2;
        break;
      case 'conflict_resolved':
        this.conflictsResolved++;
        this.karma += 5;
        break;
      case 'consensus':
        this.consensusReached++;
        this.karma += 3;
        break;
      case 'quality_bonus':
        this.karma += data.bonus || 0;
        break;
    }
  }

  /**
   * 获取统计摘要
   */
  getSummary() {
    return {
      agentId: this.agentId,
      messageCount: this.messageCount,
      mentionsReceived: this.mentionsReceived,
      conflictsResolved: this.conflictsResolved,
      consensusReached: this.consensusReached,
      lastActive: this.lastActive,
      karma: this.karma,
      verified: this.verified,
      level: this.calculateLevel()
    };
  }

  /**
   * 计算等级
   */
  calculateLevel() {
    if (this.karma < 50) return '🌱 新手';
    if (this.karma < 150) return '🌿 进阶';
    if (this.karma < 300) return '🌳 熟练';
    if (this.karma < 500) return '🏆 专家';
    return '👑 大师';
  }
}

/**
 * 导出
 */
module.exports = {
  DiscussionOrchestrator,
  DiscussionConfig,
  DiscussionContext,
  AgentDefinition,
  AgentStats,
  AGENT_ROLES
};
