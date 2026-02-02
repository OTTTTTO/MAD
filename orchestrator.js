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
const { DiscussionSimilarityDetector } = require('./similarity.js');
const { exportToPDF } = require('./exporters/pdf.js');
const { exportToHTML } = require('./exporters/html.js');
const { exportToCSV } = require('./exporters/csv.js');
const { parseMentions, validateMentions, highlightMentions, extractMentionedAgentIds } = require('./mention.js');
const { createReply, getReplies, getReplyTree, getReplyChain, countReplies, hasReplies, formatReplyQuote, searchMessages } = require('./reply.js');
const { SnapshotManager } = require('./version/snapshot.js');
const { RestoreManager } = require('./version/restore.js');
const { BranchManager } = require('./version/branch.js');
const { RealtimeManager } = require('./realtime.js');

// 加载模板
let templates = null;

async function loadTemplates() {
  if (templates) return templates;
  
  try {
    const templatePath = path.join(__dirname, 'templates.json');
    const data = await fs.readFile(templatePath, 'utf8');
    templates = JSON.parse(data);
    return templates;
  } catch (error) {
    console.error('[Orchestrator] Failed to load templates:', error);
    return { templates: [] };
  }
}

/**
 * Agent 专长标签（用于推荐）
 */
const AGENT_EXPERTISE = {
  'coordinator': ['协调', '组织', '总结', '决策', '规划'],
  'market_research': ['市场', '用户', '需求', '竞品', '趋势', '调研'],
  'requirement': ['需求', '功能', '产品', '用户故事', '验收'],
  'technical': ['技术', '架构', '实现', '开发', '性能', '安全'],
  'testing': ['测试', '质量', '自动化', '验收', 'Bug'],
  'documentation': ['文档', '说明', '手册', '知识库', '归档']
};

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
    // 解析 @提及
    const rawMentions = parseMentions(content);
    const validAgents = this.participants.map(p => ({ id: p.role, name: p.role }));
    const mentions = validateMentions(rawMentions, validAgents);

    const message = {
      id: `msg-${this.messages.length + 1}`,
      role,
      content,
      timestamp: Date.now(),
      round: this.rounds,
      metadata,
      reasoning: metadata.reasoning || null, // 支持思维链数据
      mentions: mentions.filter(m => m.valid), // 只保留有效的提及
      replyTo: metadata.replyTo || null, // 回复信息
      quotes: metadata.quotes || [] // 引用列表
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
    this.similarityDetector = new DiscussionSimilarityDetector(); // 相似度检测器
    this.similarityInitialized = false; // 相似度检测器是否已初始化
    this.contexts = new Map(); // 讨论上下文映射
    this.collaboration = null; // 协作管理器（延迟初始化）
    this.snapshotManager = null; // 快照管理器（延迟初始化）
    this.restoreManager = null; // 恢复管理器（延迟初始化）
    this.branchManager = null; // 分支管理器（延迟初始化）
    this.realtimeManager = null; // 实时管理器（延迟初始化）
  }

  /**
   * 初始化数据目录
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'discussions'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'logs'), { recursive: true });
      this.collaboration = new CollaborationManager(this);
      
      // 初始化版本控制管理器
      this.snapshotManager = new SnapshotManager(this);
      await this.snapshotManager.initialize();
      
      this.restoreManager = new RestoreManager(this, this.snapshotManager);
      
      this.branchManager = new BranchManager(this);
      await this.branchManager.initialize();
      
      this.realtimeManager = new RealtimeManager(this);
      
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
   * 使用模板创建讨论
   */
  async createDiscussionFromTemplate(templateId, params = {}) {
    const templateData = await loadTemplates();
    const template = templateData.templates.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    // 生成主题
    let topic = params.topic || `${template.icon} ${template.name}`;
    if (params.context) {
      topic += `: ${params.context}`;
    }
    
    // 选择参与者
    const selectedRoles = template.participants.map(id => AGENT_ROLES[id] || AGENT_ROLES.coordinator);
    
    // 创建讨论
    const { discussionId, context } = await this.createDiscussion(topic, {
      participants: selectedRoles
    });
    
    // 发送初始消息
    let initialPrompt = template.initialPrompt;
    if (params) {
      Object.keys(params).forEach(key => {
        initialPrompt = initialPrompt.replace(`{${key}}`, params[key]);
      });
    }
    
    if (initialPrompt && template.id !== 'custom') {
      await this.agentSpeak(discussionId, 'coordinator', initialPrompt);
    }
    
    return {
      discussionId,
      context,
      template
    };
  }

  /**
   * 获取所有模板
   */
  async getTemplates() {
    const templateData = await loadTemplates();
    return templateData.templates;
  }

  /**
   * 根据主题自动选择参与角色
   */

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

    // 更新相似度检测器
    if (this.similarityInitialized) {
      this.similarityDetector.updateDiscussion(discussionId, context);
    }

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
   * 删除讨论
   */
  async deleteDiscussion(discussionId) {
    if (!this.discussions.has(discussionId)) {
      return;
    }

    // 从内存中移除
    this.discussions.delete(discussionId);

    // 删除文件
    try {
      const filePath = path.join(this.dataDir, 'discussions', `${discussionId}.json`);
      await fs.unlink(filePath);
      console.log(`[Orchestrator] Discussion ${discussionId} deleted`);
    } catch (error) {
      console.error(`[Orchestrator] Failed to delete discussion file:`, error);
    }
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

  /**
   * 计算讨论质量评分
   */
  calculateDiscussionQuality(context) {
    const messages = context.messages;
    
    if (messages.length === 0) {
      return {
        innovation: 0,
        completeness: 0,
        feasibility: 0,
        value: 0,
        total: 0,
        rating: '无数据'
      };
    }

    // 计算创新性
    const innovation = this.calculateInnovation(messages, context);
    
    // 计算完整性
    const completeness = this.calculateCompleteness(messages);
    
    // 计算可行性
    const feasibility = this.calculateFeasibility(messages);
    
    // 计算价值性
    const value = this.calculateValue(messages);
    
    // 总分（加权平均）
    const total = (
      innovation * 0.3 +
      completeness * 0.25 +
      feasibility * 0.25 +
      value * 0.2
    );
    
    // 评级
    const rating = this.getQualityRating(total);
    
    return {
      innovation: Math.round(innovation * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      feasibility: Math.round(feasibility * 100) / 100,
      value: Math.round(value * 100) / 100,
      total: Math.round(total * 100) / 100,
      rating
    };
  }

  /**
   * 计算创新性
   */
  calculateInnovation(messages, context) {
    const uniqueIdeas = new Set();
    const agentCount = new Set();
    
    messages.forEach(msg => {
      // 提取关键词作为观点
      const words = this.extractKeywords(msg.content);
      words.forEach(word => uniqueIdeas.add(word));
      agentCount.add(msg.role);
    });
    
    // 创新性 = 观点多样性 + Agent 多样性
    const ideaScore = Math.min(uniqueIdeas.size / 20, 1); // 最多 20 个独特观点
    const agentScore = Math.min(agentCount.size / 6, 1); // 最多 6 个 Agent
    
    return (ideaScore * 0.6 + agentScore * 0.4);
  }

  /**
   * 计算完整性
   */
  calculateCompleteness(messages) {
    const content = messages.map(m => m.content).join(' ');
    
    // 检查是否包含关键要素
    const hasProblemDefinition = /问题|需求|目标|挑战/.test(content);
    const hasSolution = /方案|建议|解决|实现/.test(content);
    const hasRiskAssessment = /风险|挑战|难点|注意/.test(content);
    const hasConclusion = /结论|总结|决定|共识/.test(content);
    
    const score = (
      (hasProblemDefinition ? 1 : 0) * 0.3 +
      (hasSolution ? 1 : 0) * 0.3 +
      (hasRiskAssessment ? 1 : 0) * 0.2 +
      (hasConclusion ? 1 : 0) * 0.2
    );
    
    return score;
  }

  /**
   * 计算可行性
   */
  calculateFeasibility(messages) {
    const content = messages.map(m => m.content).join(' ');
    
    // 统计关键词提及次数
    const technicalMentions = (content.match(/技术|实现|可行|开发|代码/g) || []).length;
    const riskMentions = (content.match(/风险|挑战|难点|问题/g) || []).length;
    
    // 有技术考虑 + 有风险识别 = 高可行性
    const technicalScore = Math.min(technicalMentions * 0.1, 0.6);
    const riskScore = Math.min(riskMentions * 0.05, 0.4);
    
    return technicalScore + riskScore;
  }

  /**
   * 计算价值性
   */
  calculateValue(messages) {
    const content = messages.map(m => m.content).join(' ');
    
    // 统计关键词提及次数
    const businessMentions = (content.match(/价值|收益|用户|市场|商业/g) || []).length;
    const actionableItems = (content.match(/下一步|行动|计划|建议/g) || []).length;
    
    const businessScore = Math.min(businessMentions * 0.1, 0.5);
    const actionScore = Math.min(actionableItems * 0.2, 0.5);
    
    return businessScore + actionScore;
  }

  /**
   * 提取关键词
   */
  extractKeywords(content) {
    const stopWords = new Set(['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
    
    return content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !stopWords.has(w));
  }

  /**
   * 获取质量评级
   */
  getQualityRating(score) {
    if (score >= 0.85) return '优秀';
    if (score >= 0.7) return '良好';
    if (score >= 0.5) return '一般';
    return '需改进';
  }

  /**
   * 推荐参与者（基于讨论主题）
   */
  recommendParticipants(topic, currentParticipants = []) {
    const keywords = this.extractKeywords(topic);
    const allAgents = Object.keys(AGENT_EXPERTISE);
    
    const recommendations = allAgents
      .filter(agentId => !currentParticipants.includes(agentId))
      .map(agentId => {
        const expertise = AGENT_EXPERTISE[agentId] || [];
        let score = 0;
        const matchedKeywords = [];
        
        // 基于关键词匹配
        keywords.forEach(keyword => {
          expertise.forEach(exp => {
            if (exp.includes(keyword) || keyword.includes(exp)) {
              score += 0.3;
              matchedKeywords.push(keyword);
            }
          });
        });
        
        // 基于历史参与度（简化版）
        const history = this.getAgentParticipationHistory(agentId);
        score += history.relevance * 0.4;
        
        // 基于可用性（简化版）
        score += 0.3; // 所有 Agent 默认可用
        
        return {
          agentId,
          agentName: this.getAgentDisplayName(agentId),
          score: Math.min(score, 1),
          reason: this.generateRecommendationReason(agentId, matchedKeywords, expertise)
        };
      })
      .filter(rec => rec.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    return recommendations;
  }

  /**
   * 获取 Agent 显示名称
   */
  getAgentDisplayName(agentId) {
    const names = {
      'coordinator': '主协调员',
      'market_research': '市场调研',
      'requirement': '需求分析',
      'technical': '技术可行性',
      'testing': '测试',
      'documentation': '文档'
    };
    return names[agentId] || agentId;
  }

  /**
   * 生成推荐理由
   */
  generateRecommendationReason(agentId, matchedKeywords, expertise) {
    if (matchedKeywords.length > 0) {
      return `主题包含"${matchedKeywords[0]}"等相关内容，该 Agent 在${expertise.slice(0, 2).join('、')}方面有专长`;
    }
    return `该 Agent 在${expertise.slice(0, 2).join('、')}方面具有专业知识，可以为讨论提供价值`;
  }

  /**
   * 获取 Agent 参与历史（简化版）
   */
  getAgentParticipationHistory(agentId) {
    // 在实际实现中，这里应该从数据库或文件中读取历史数据
    // 现在返回默认值
    return {
      relevance: 0.5, // 默认相关性
      participationCount: 0,
      averageRating: 0
    };
  }

  /**
   * 提取待办事项
   */
  extractActionItems(discussion) {
    const actionItems = [];
    
    discussion.messages.forEach(msg => {
      // 识别行动关键词模式
      const actionPatterns = [
        /(?:需要|要|应该|必须)\s*([^，。；！？\n]{1,50})\s*(?:完成|做|实现|开发|编写|测试)/g,
        /下一步[:：]\s*([^，。；！？\n]{1,100})/g,
        /行动项[:：]\s*([^，。；！？\n]{1,100})/g,
        /TODO[:：]\s*([^，。；！？\n]{1,100})/gi,
        /任务[:：]\s*([^，。；！？\n]{1,100})/g
      ];
      
      actionPatterns.forEach(pattern => {
        const matches = msg.content.matchAll(pattern);
        for (const match of matches) {
          const task = match[1] ? match[1].trim() : match[0].trim();
          
          if (task.length > 2) { // 过滤太短的任务
            actionItems.push({
              id: `action-${actionItems.length + 1}`,
              task,
              assignee: this.extractAssignee(msg.content, msg.role),
              deadline: this.extractDeadline(msg.content),
              priority: this.extractPriority(msg.content),
              sourceMessage: msg.id,
              sourceRole: msg.role,
              timestamp: msg.timestamp,
              completed: false
            });
          }
        }
      });
    });
    
    // 去重（基于任务文本相似度）
    return this.deduplicateActions(actionItems);
  }

  /**
   * 提取责任人
   */
  extractAssignee(content, role) {
    // 查找 @ 提及
    const mentionMatch = content.match(/@([^\s@]+)/);
    if (mentionMatch) {
      return mentionMatch[1];
    }
    
    // 默认为当前发言者
    return role;
  }

  /**
   * 提取截止日期
   */
  extractDeadline(content) {
    // 简单的日期提取
    const datePatterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})月(\d{1,2})日/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/
    ];
    
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    // 提取相对时间
    if (content.includes('明天')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (content.includes('下周')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    return null;
  }

  /**
   * 提取优先级
   */
  extractPriority(content) {
    if (content.includes('紧急') || content.includes('重要') || content.includes('优先')) {
      return 'high';
    }
    if (content.includes('一般') || content.includes('普通')) {
      return 'medium';
    }
    return 'medium'; // 默认中等
  }

  /**
   * 去重待办事项
   */
  deduplicateActions(actions) {
    const unique = [];
    const seen = new Set();
    
    actions.forEach(action => {
      // 简单的去重策略：基于任务文本的前 20 个字符
      const key = action.task.substring(0, 20);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(action);
      }
    });
    
    return unique;
  }

  /**
   * 初始化相似度检测器（训练模型）
   */
  async initializeSimilarityDetector() {
    if (this.similarityInitialized) {
      return;
    }

    try {
      // 使用现有讨论训练模型
      if (this.discussions.size > 0) {
        this.similarityDetector.train(this.discussions);
        console.log(`[Orchestrator] Similarity detector trained with ${this.discussions.size} discussions`);
      }

      this.similarityInitialized = true;
    } catch (error) {
      console.error('[Orchestrator] Failed to initialize similarity detector:', error);
    }
  }

  /**
   * 查找相似讨论
   */
  findSimilarDiscussions(discussionId, threshold = 0.1, limit = 10) {
    // 确保相似度检测器已初始化
    if (!this.similarityInitialized) {
      this.initializeSimilarityDetector();
    }

    if (!this.discussions.has(discussionId)) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    return this.similarityDetector.findSimilar(
      discussionId,
      this.discussions,
      threshold,
      limit
    );
  }

  /**
   * 计算两个讨论之间的相似度
   */
  calculateDiscussionSimilarity(id1, id2) {
    // 确保相似度检测器已初始化
    if (!this.similarityInitialized) {
      this.initializeSimilarityDetector();
    }

    return this.similarityDetector.calculateSimilarity(id1, id2);
  }

  /**
   * 合并讨论
   */
  async mergeDiscussions(targetId, sourceIds) {
    if (!this.discussions.has(targetId)) {
      throw new Error(`Target discussion ${targetId} not found`);
    }

    const targetContext = this.discussions.get(targetId);
    const mergedMessages = [];
    const mergedConflicts = [];

    for (const sourceId of sourceIds) {
      if (!this.discussions.has(sourceId)) {
        console.warn(`[Orchestrator] Source discussion ${sourceId} not found, skipping`);
        continue;
      }

      const sourceContext = this.discussions.get(sourceId);

      // 合并消息
      sourceContext.messages.forEach(msg => {
        const newMessage = {
          ...msg,
          id: `msg-${targetContext.messages.length + 1}`,
          metadata: {
            ...msg.metadata,
            mergedFrom: sourceId,
            originalMessageId: msg.id
          }
        };
        targetContext.messages.push(newMessage);
        mergedMessages.push(newMessage);
      });

      // 合并冲突
      sourceContext.conflicts.forEach(conflict => {
        mergedConflicts.push({
          ...conflict,
          sourceDiscussion: sourceId
        });
      });

      // 更新主题
      if (sourceContext.topic && !targetContext.topic.includes(sourceContext.topic)) {
        targetContext.topic += ` | ${sourceContext.topic}`;
      }

      // 删除源讨论
      this.discussions.delete(sourceId);
      await this.deleteDiscussion(sourceId);
    }

    // 更新目标讨论
    targetContext.updatedAt = Date.now();

    // 更新相似度检测器
    if (this.similarityInitialized) {
      this.similarityDetector.updateDiscussion(targetId, targetContext);
      // 移除已删除讨论的向量
      sourceIds.forEach(id => {
        this.similarityDetector.discussionVectors.delete(id);
      });
    }

    // 保存目标讨论
    await this.saveDiscussion(targetContext);

    return {
      targetId,
      mergedMessagesCount: mergedMessages.length,
      mergedConflictsCount: mergedConflicts.length
    };
  }

  /**
   * 获取模板市场
   */
  async getTemplateMarket() {
    try {
      const marketPath = path.join(__dirname, 'templates', 'market.json');
      const data = await fs.readFile(marketPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[Orchestrator] Failed to load template market:', error);
      return { templates: [], categories: [], stats: {} };
    }
  }

  /**
   * 从市场获取单个模板
   */
  async getMarketTemplate(templateId) {
    const market = await this.getTemplateMarket();
    return market.templates.find(t => t.id === templateId) || null;
  }

  /**
   * 搜索市场模板
   */
  async searchMarketTemplates(query, options = {}) {
    const market = await this.getTemplateMarket();
    const { category, tags, minRating } = options;

    return market.templates.filter(template => {
      // 关键词搜索
      if (query) {
        const searchLower = query.toLowerCase();
        const matchName = template.name.toLowerCase().includes(searchLower);
        const matchDesc = template.description.toLowerCase().includes(searchLower);
        const matchTags = template.tags.some(t => t.toLowerCase().includes(searchLower));
        if (!matchName && !matchDesc && !matchTags) {
          return false;
        }
      }

      // 分类过滤
      if (category && template.category !== category) {
        return false;
      }

      // 标签过滤
      if (tags && tags.length > 0) {
        const hasTag = tags.some(tag => template.tags.includes(tag));
        if (!hasTag) {
          return false;
        }
      }

      // 评分过滤
      if (minRating && template.rating < minRating) {
        return false;
      }

      return true;
    });
  }

  /**
   * 对市场模板进行评分
   */
  async rateMarketTemplate(templateId, rating, comment = '', user = 'Anonymous') {
    const marketPath = path.join(__dirname, 'templates', 'market.json');
    const market = await this.getTemplateMarket();
    const template = market.templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // 添加评论
    template.comments.push({
      user,
      rating,
      comment,
      date: new Date().toISOString().split('T')[0]
    });

    // 重新计算平均评分
    const totalRating = template.comments.reduce((sum, c) => sum + c.rating, 0);
    template.rating = Number((totalRating / template.comments.length).toFixed(1));
    template.ratingCount = template.comments.length;

    // 更新统计
    market.stats.averageRating = Number(
      (market.templates.reduce((sum, t) => sum + t.rating, 0) / market.templates.length).toFixed(2)
    );

    // 保存
    await fs.writeFile(marketPath, JSON.stringify(market, null, 2), 'utf8');

    return template;
  }

  /**
   * 增加模板下载次数
   */
  async incrementTemplateDownloads(templateId) {
    const marketPath = path.join(__dirname, 'templates', 'market.json');
    const market = await this.getTemplateMarket();
    const template = market.templates.find(t => t.id === templateId);

    if (template) {
      template.downloads = (template.downloads || 0) + 1;
      market.stats.totalDownloads = (market.stats.totalDownloads || 0) + 1;
      await fs.writeFile(marketPath, JSON.stringify(market, null, 2), 'utf8');
    }
  }

  /**
   * 从市场创建讨论
   */
  async createDiscussionFromMarket(templateId, params = {}) {
    const template = await this.getMarketTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found in market`);
    }

    // 增加下载计数
    await this.incrementTemplateDownloads(templateId);

    // 使用模板配置创建讨论
    const selectedRoles = template.config.participants.map(id => AGENT_ROLES[id] || AGENT_ROLES.coordinator);
    const topic = template.config.topic;

    // 替换参数
    let finalTopic = topic;
    if (params) {
      Object.keys(params).forEach(key => {
        finalTopic = finalTopic.replace(`{${key}}`, params[key]);
      });
    }

    const { discussionId, context } = await this.createDiscussion(finalTopic, {
      participants: selectedRoles
    });

    // 发送初始消息
    let initialPrompt = template.config.initialPrompt;
    if (params) {
      Object.keys(params).forEach(key => {
        initialPrompt = initialPrompt.replace(`{${key}}`, params[key]);
      });
    }

    if (initialPrompt && selectedRoles.length > 0) {
      // 使用第一个参与者发送初始消息
      const firstAgent = selectedRoles[0];
      await this.agentSpeak(discussionId, firstAgent.id, initialPrompt);
    }

    return {
      discussionId,
      context,
      template
    };
  }

  /**
   * 获取自定义 Agent 列表
   */
  async getCustomAgents() {
    try {
      const indexPath = path.join(__dirname, 'agents', 'custom', 'index.json');
      const data = await fs.readFile(indexPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[Orchestrator] Failed to load custom agents:', error);
      return { agents: [], stats: { totalAgents: 0, enabledAgents: 0 } };
    }
  }

  /**
   * 获取单个自定义 Agent
   */
  async getCustomAgent(agentId) {
    const data = await this.getCustomAgents();
    return data.agents.find(a => a.id === agentId) || null;
  }

  /**
   * 创建自定义 Agent
   */
  async createCustomAgent(agentData) {
    const indexPath = path.join(__dirname, 'agents', 'custom', 'index.json');
    const data = await this.getCustomAgents();

    // 生成 ID
    const newId = `custom-${Date.now()}`;

    // 验证数据
    if (!agentData.name || !agentData.systemPrompt) {
      throw new Error('Agent name and systemPrompt are required');
    }

    // 创建 Agent
    const newAgent = {
      id: newId,
      name: agentData.name,
      emoji: agentData.emoji || '🤖',
      agentId: 'main',
      systemPrompt: agentData.systemPrompt,
      triggerKeywords: agentData.triggerKeywords || [],
      expertise: agentData.expertise || [],
      personality: agentData.personality || {
        openness: 0.7,
        rigor: 0.7,
        creativity: 0.7
      },
      responseRequired: agentData.responseRequired || false,
      speakProbability: agentData.speakProbability || 0.5,
      custom: true,
      author: agentData.author || 'User',
      createdAt: new Date().toISOString().split('T')[0],
      enabled: true
    };

    // 添加到列表
    data.agents.push(newAgent);
    data.stats.totalAgents = data.agents.length;
    data.stats.enabledAgents = data.agents.filter(a => a.enabled).length;

    // 保存
    await fs.writeFile(indexPath, JSON.stringify(data, null, 2), 'utf8');

    return newAgent;
  }

  /**
   * 更新自定义 Agent
   */
  async updateCustomAgent(agentId, updates) {
    const indexPath = path.join(__dirname, 'agents', 'custom', 'index.json');
    const data = await this.getCustomAgents();
    const agent = data.agents.find(a => a.id === agentId);

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 更新字段
    Object.keys(updates).forEach(key => {
      if (key !== 'id' && key !== 'createdAt') {
        agent[key] = updates[key];
      }
    });

    // 保存
    await fs.writeFile(indexPath, JSON.stringify(data, null, 2), 'utf8');

    return agent;
  }

  /**
   * 删除自定义 Agent
   */
  async deleteCustomAgent(agentId) {
    const indexPath = path.join(__dirname, 'agents', 'custom', 'index.json');
    const data = await this.getCustomAgents();
    const index = data.agents.findIndex(a => a.id === agentId);

    if (index === -1) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 删除
    data.agents.splice(index, 1);
    data.stats.totalAgents = data.agents.length;
    data.stats.enabledAgents = data.agents.filter(a => a.enabled).length;

    // 保存
    await fs.writeFile(indexPath, JSON.stringify(data, null, 2), 'utf8');

    return { success: true };
  }

  /**
   * 测试 Agent（发送测试消息）
   */
  async testCustomAgent(agentId, testMessage = '请简单介绍一下你自己。') {
    const agent = await this.getCustomAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // 创建临时测试讨论
    const { discussionId } = await this.createDiscussion(`Agent 测试：${agent.name}`, {
      participants: [agent]
    });

    // 发送测试消息
    await this.agentSpeak(discussionId, agentId, testMessage);

    // 获取回复
    const context = this.discussions.get(discussionId);
    const messages = context.messages.filter(m => m.role === agentId);

    // 清理测试讨论
    await this.deleteDiscussion(discussionId);

    return {
      agentId,
      agentName: agent.name,
      testMessage,
      response: messages.length > 0 ? messages[messages.length - 1].content : null
    };
  }

  /**
   * 加载所有可用 Agent（包括自定义）
   */
  async loadAllAgents() {
    const customAgents = await this.getCustomAgents();

    // 合并预定义和自定义 Agent
    const allAgents = {
      ...AGENT_ROLES
    };

    // 添加自定义 Agent
    for (const agent of customAgents.agents) {
      if (agent.enabled) {
        allAgents[agent.id] = {
          id: agent.id,
          role: agent.name,
          emoji: agent.emoji,
          agentId: agent.agentId,
          systemPrompt: agent.systemPrompt,
          triggerKeywords: agent.triggerKeywords,
          responseRequired: agent.responseRequired,
          speakProbability: agent.speakProbability,
          custom: true
        };
      }
    }

    return allAgents;
  }

  /**
   * 导出讨论为 PDF
   */
  async exportToPDF(discussionId, options = {}) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const history = this.getDiscussionHistory(discussionId);
    return exportToPDF(history, options);
  }

  /**
   * 导出讨论为 HTML
   */
  async exportToHTML(discussionId, options = {}) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const history = this.getDiscussionHistory(discussionId);
    return exportToHTML(history, options);
  }

  /**
   * 导出讨论为 CSV
   */
  async exportToCSV(discussionId, options = {}) {
    const context = this.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const history = this.getDiscussionHistory(discussionId);
    return exportToCSV(history, options);
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
 * 标签管理器
 */
class TagManager {
  constructor() {
    this.tagsPath = path.join(__dirname, 'tags', 'index.json');
    this.tags = [];
    this.loadTags();
  }

  /**
   * 加载标签
   */
  async loadTags() {
    try {
      const data = await fs.readFile(this.tagsPath, 'utf8');
      const json = JSON.parse(data);
      this.tags = json.tags || [];
    } catch (error) {
      console.error('[TagManager] Failed to load tags:', error);
      this.tags = [];
    }
  }

  /**
   * 保存标签
   */
  async saveTags() {
    try {
      const data = JSON.stringify({ tags: this.tags }, null, 2);
      await fs.writeFile(this.tagsPath, data, 'utf8');
    } catch (error) {
      console.error('[TagManager] Failed to save tags:', error);
    }
  }

  /**
   * 获取所有标签
   */
  getAllTags() {
    return this.tags;
  }

  /**
   * 根据 ID 获取标签
   */
  getTagById(id) {
    return this.tags.find(tag => tag.id === id);
  }

  /**
   * 创建标签
   */
  async createTag(name, color, icon) {
    const id = `tag-${Date.now()}`;
    const tag = {
      id,
      name,
      color: color || '#6b7280',
      icon: icon || '🏷️',
      usageCount: 0,
      createdAt: new Date().toISOString()
    };
    this.tags.push(tag);
    await this.saveTags();
    return tag;
  }

  /**
   * 更新标签
   */
  async updateTag(id, updates) {
    const index = this.tags.findIndex(tag => tag.id === id);
    if (index === -1) return null;

    this.tags[index] = { ...this.tags[index], ...updates };
    await this.saveTags();
    return this.tags[index];
  }

  /**
   * 删除标签
   */
  async deleteTag(id) {
    const index = this.tags.findIndex(tag => tag.id === id);
    if (index === -1) return false;

    this.tags.splice(index, 1);
    await this.saveTags();
    return true;
  }

  /**
   * 增加标签使用次数
   */
  async incrementUsage(id) {
    const tag = this.getTagById(id);
    if (tag) {
      tag.usageCount++;
      await this.saveTags();
    }
  }

  /**
   * 根据讨论内容建议标签
   */
  suggestTags(content) {
    const suggestions = [];
    const contentLower = content.toLowerCase();

    this.tags.forEach(tag => {
      const tagNameLower = tag.name.toLowerCase();
      if (contentLower.includes(tagNameLower)) {
        suggestions.push(tag);
      }
    });

    return suggestions;
  }
}

/**
 * 收藏夹管理器
 */
class FavoritesManager {
  constructor() {
    this.favoritesPath = path.join(__dirname, 'favorites', 'index.json');
    this.favorites = [];
    this.loadFavorites();
  }

  /**
   * 加载收藏夹
   */
  async loadFavorites() {
    try {
      const data = await fs.readFile(this.favoritesPath, 'utf8');
      const json = JSON.parse(data);
      this.favorites = json.favorites || [];
    } catch (error) {
      console.error('[FavoritesManager] Failed to load favorites:', error);
      this.favorites = [];
    }
  }

  /**
   * 保存收藏夹
   */
  async saveFavorites() {
    try {
      const data = JSON.stringify({ favorites: this.favorites }, null, 2);
      await fs.writeFile(this.favoritesPath, data, 'utf8');
    } catch (error) {
      console.error('[FavoritesManager] Failed to save favorites:', error);
    }
  }

  /**
   * 获取所有收藏夹
   */
  getAllFavorites() {
    return this.favorites;
  }

  /**
   * 根据 ID 获取收藏夹
   */
  getFavoriteById(id) {
    return this.favorites.find(fav => fav.id === id);
  }

  /**
   * 创建收藏夹
   */
  async createFavorite(name, icon, description) {
    const id = `fav-${Date.now()}`;
    const favorite = {
      id,
      name,
      icon: icon || '⭐',
      description: description || '',
      discussions: [],
      createdAt: new Date().toISOString()
    };
    this.favorites.push(favorite);
    await this.saveFavorites();
    return favorite;
  }

  /**
   * 更新收藏夹
   */
  async updateFavorite(id, updates) {
    const index = this.favorites.findIndex(fav => fav.id === id);
    if (index === -1) return null;

    this.favorites[index] = { ...this.favorites[index], ...updates };
    await this.saveFavorites();
    return this.favorites[index];
  }

  /**
   * 删除收藏夹
   */
  async deleteFavorite(id) {
    const index = this.favorites.findIndex(fav => fav.id === id);
    if (index === -1) return false;

    this.favorites.splice(index, 1);
    await this.saveFavorites();
    return true;
  }

  /**
   * 添加讨论到收藏夹
   */
  async addDiscussionToFavorite(favoriteId, discussionId) {
    const favorite = this.getFavoriteById(favoriteId);
    if (!favorite) return false;

    if (!favorite.discussions.includes(discussionId)) {
      favorite.discussions.push(discussionId);
      await this.saveFavorites();
      return true;
    }
    return false;
  }

  /**
   * 从收藏夹移除讨论
   */
  async removeDiscussionFromFavorite(favoriteId, discussionId) {
    const favorite = this.getFavoriteById(favoriteId);
    if (!favorite) return false;

    const index = favorite.discussions.indexOf(discussionId);
    if (index > -1) {
      favorite.discussions.splice(index, 1);
      await this.saveFavorites();
      return true;
    }
    return false;
  }

  /**
   * 检查讨论是否在收藏夹中
   */
  isDiscussionFavorited(discussionId) {
    for (const fav of this.favorites) {
      if (fav.discussions.includes(discussionId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 获取讨论所在的所有收藏夹
   */
  getDiscussionFavorites(discussionId) {
    return this.favorites.filter(fav => fav.discussions.includes(discussionId));
  }
}

/**
 * 协作管理器（@提及和回复）
 */
class CollaborationManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * 获取讨论中的所有 @提及
   */
  getAllMentions(discussionId) {
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) return [];

    const mentions = [];
    context.messages.forEach(message => {
      if (message.mentions && message.mentions.length > 0) {
        message.mentions.forEach(mention => {
          mentions.push({
            messageId: message.id,
            fromAgent: message.role,
            toAgent: mention.agentId,
            toAgentName: mention.agentName,
            text: mention.text,
            timestamp: message.timestamp
          });
        });
      }
    });

    return mentions;
  }

  /**
   * 获取消息的回复
   */
  getMessageReplies(discussionId, messageId) {
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) return [];

    return getReplies(messageId, context.messages);
  }

  /**
   * 获取回复树
   */
  getReplyTree(discussionId, rootMessageId, maxDepth = 3) {
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) return null;

    return getReplyTree(rootMessageId, context.messages, maxDepth);
  }

  /**
   * 搜索消息
   */
  searchDiscussionMessages(discussionId, query, type = 'all') {
    const context = this.orchestrator.contexts.get(discussionId);
    if (!context) return [];

    return searchMessages(context.messages, query, type);
  }

  /**
   * 检查 Agent 是否被提及
   */
  isAgentMentionedInDiscussion(discussionId, agentId) {
    const mentions = this.getAllMentions(discussionId);
    return mentions.some(m => m.toAgent === agentId);
  }

  /**
   * 获取 Agent 收到的提及
   */
  getMentionsForAgent(discussionId, agentId) {
    const mentions = this.getAllMentions(discussionId);
    return mentions.filter(m => m.toAgent === agentId);
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
  TagManager,
  FavoritesManager,
  CollaborationManager,
  SnapshotManager,
  RestoreManager,
  BranchManager,
  RealtimeManager,
  AGENT_ROLES
};
