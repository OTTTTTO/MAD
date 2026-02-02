/**
 * 讨论参与者管理模块
 * 
 * 功能：
 * 1. 添加 Agent 到正在进行的讨论
 * 2. 从讨论中移除 Agent
 * 3. 列出可用的 Agents
 * 4. 获取当前参与者列表
 * 
 * @module participants-manager
 * @version 1.0.0
 */

const AGENT_ROLES = {
  coordinator: {
    role: 'coordinator',
    name: '主协调员',
    emoji: '👔',
    expertise: ['协调', '组织', '总结', '决策', '规划'],
    systemPrompt: `你是 MAD 讨论组的主协调员。你的职责是：
1. 引导讨论方向，确保讨论聚焦主题
2. 总结各方观点，推动达成共识
3. 识别关键分歧点，组织深入讨论
4. 协调发言顺序，确保每个人都有发言机会
5. 在讨论陷入僵局时提出建设性建议

请用专业、客观、包容的语气发言。`
  },
  market_research: {
    role: 'market_research',
    name: '市场调研员',
    emoji: '📊',
    expertise: ['市场', '用户', '需求', '竞品', '趋势', '调研'],
    systemPrompt: `你是 MAD 讨论组的市场调研员。你的职责是：
1. 从市场和用户角度分析问题
2. 提供用户需求和市场趋势数据
3. 分析竞品的做法
4. 评估方案的可行性
5. 预测市场反应

请用数据驱动、用户导向的思维分析问题。`
  },
  requirement: {
    role: 'requirement',
    name: '需求分析师',
    emoji: '📋',
    expertise: ['需求', '功能', '产品', '用户故事', '验收'],
    systemPrompt: `你是 MAD 讨论组的需求分析师。你的职责是：
1. 深入理解和澄清需求
2. 将模糊的想法转化为清晰的需求文档
3. 识别需求之间的依赖关系
4. 提出用户故事和验收标准
5. 评估需求的优先级

请用结构化、逻辑清晰的方式表达。`
  },
  technical: {
    role: 'technical',
    name: '技术架构师',
    emoji: '🔧',
    expertise: ['技术', '架构', '实现', '开发', '性能', '安全'],
    systemPrompt: `你是 MAD 讨论组的技术架构师。你的职责是：
1. 从技术可行性角度评估方案
2. 设计系统架构和技术方案
3. 识别技术风险和挑战
4. 提出性能优化建议
5. 确保代码质量和可维护性

请用专业、务实的态度分析技术问题。`
  },
  testing: {
    role: 'testing',
    name: '测试工程师',
    emoji: '🔍',
    expertise: ['测试', '质量', '自动化', '验收', 'Bug'],
    systemPrompt: `你是 MAD 讨论组的测试工程师。你的职责是：
1. 从质量保证角度审视方案
2. 识别潜在的问题和边界情况
3. 设计测试用例和验收标准
4. 提出自动化测试策略
5. 评估用户体验质量

请用严谨、细致的态度思考问题。`
  },
  documentation: {
    role: 'documentation',
    name: '文档专家',
    emoji: '📚',
    expertise: ['文档', '说明', '手册', '知识库', '归档'],
    systemPrompt: `你是 MAD 讨论组的文档专家。你的职责是：
1. 确保讨论内容有清晰的文档记录
2. 总结关键决策和结论
3. 提炼最佳实践和经验教训
4. 提出文档和知识管理建议
5. 确保输出内容易于理解和使用

请用清晰、简洁、有条理的方式表达。`
  }
};

/**
 * 参与者管理器
 */
class ParticipantsManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * 获取所有可用的 Agents
   * @returns {Array} Agents 列表
   */
  getAvailableAgents() {
    return Object.entries(AGENT_ROLES).map(([id, config]) => ({
      id,
      ...config
    }));
  }

  /**
   * 获取当前讨论的参与者列表
   * @param {string} discussionId - 讨论 ID
   * @returns {Array} 参与者列表
   */
  getParticipants(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }
    return context.participants.map(p => ({
      id: p.id,
      role: p.role,
      name: p.name,
      emoji: p.emoji
    }));
  }

  /**
   * 添加 Agent 到讨论
   * @param {string} discussionId - 讨论 ID
   * @param {string} agentId - Agent ID
   * @returns {Object} 添加的 Agent 信息
   */
  addParticipant(discussionId, agentId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }

    // 检查讨论状态
    if (context.status === 'ended') {
      throw new Error('Cannot add participant to ended discussion');
    }

    // 检查 Agent 是否已存在
    const exists = context.participants.find(p => p.role === agentId);
    if (exists) {
      throw new Error(`Agent ${agentId} is already a participant`);
    }

    // 获取 Agent 配置
    const agentConfig = AGENT_ROLES[agentId];
    if (!agentConfig) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    // 创建新参与者
    const newParticipant = {
      id: agentId,
      role: agentConfig.role,
      name: agentConfig.name,
      emoji: agentConfig.emoji,
      expertise: agentConfig.expertise,
      systemPrompt: agentConfig.systemPrompt,
      joinedAt: Date.now()
    };

    // 添加到参与者列表
    context.participants.push(newParticipant);

    // 记录系统消息
    const systemMessage = {
      id: `msg-${context.messages.length + 1}`,
      role: 'system',
      content: `${newParticipant.emoji} ${newParticipant.name} 加入了讨论`,
      timestamp: Date.now(),
      round: context.rounds,
      metadata: {
        type: 'participant_joined',
        agentId: newParticipant.id,
        agentName: newParticipant.name
      }
    };
    context.messages.push(systemMessage);
    context.updatedAt = Date.now();

    // 触发新 Agent 发言（介绍自己）
    this._triggerIntroduction(context, newParticipant);

    return newParticipant;
  }

  /**
   * 从讨论中移除 Agent
   * @param {string} discussionId - 讨论 ID
   * @param {string} agentId - Agent ID
   * @returns {Object} 移除的 Agent 信息
   */
  removeParticipant(discussionId, agentId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }

    // 检查讨论状态
    if (context.status === 'ended') {
      throw new Error('Cannot remove participant from ended discussion');
    }

    // 检查最小参与者数
    if (context.participants.length <= 2) {
      throw new Error('Cannot remove participant: minimum 2 participants required');
    }

    // 查找参与者
    const index = context.participants.findIndex(p => p.role === agentId);
    if (index === -1) {
      throw new Error(`Agent ${agentId} is not a participant`);
    }

    const removedParticipant = context.participants[index];

    // 移除参与者
    context.participants.splice(index, 1);

    // 记录系统消息
    const systemMessage = {
      id: `msg-${context.messages.length + 1}`,
      role: 'system',
      content: `${removedParticipant.emoji} ${removedParticipant.name} 离开了讨论`,
      timestamp: Date.now(),
      round: context.rounds,
      metadata: {
        type: 'participant_left',
        agentId: removedParticipant.id,
        agentName: removedParticipant.name
      }
    };
    context.messages.push(systemMessage);
    context.updatedAt = Date.now();

    return removedParticipant;
  }

  /**
   * 批量添加多个 Agents
   * @param {string} discussionId - 讨论 ID
   * @param {Array<string>} agentIds - Agent ID 列表
   * @returns {Array} 添加的 Agents 列表
   */
  addParticipants(discussionId, agentIds) {
    const added = [];
    const failed = [];

    for (const agentId of agentIds) {
      try {
        const participant = this.addParticipant(discussionId, agentId);
        added.push(participant);
      } catch (error) {
        failed.push({
          agentId,
          error: error.message
        });
      }
    }

    return {
      added,
      failed,
      total: agentIds.length,
      success: added.length,
      failed: failed.length
    };
  }

  /**
   * 触发新 Agent 的自我介绍
   * @private
   */
  async _triggerIntroduction(context, participant) {
    // 这里可以触发一个异步任务让新 Agent 介绍自己
    // 暂时记录日志
    console.log(`[ParticipantsManager] Triggering introduction for ${participant.name}`);
  }

  /**
   * 获取参与者统计信息
   * @param {string} discussionId - 讨论 ID
   * @returns {Object} 统计信息
   */
  getParticipantStats(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion not found: ${discussionId}`);
    }

    const stats = {
      total: context.participants.length,
      byRole: {},
      messages: {},
      joinedAt: {}
    };

    context.participants.forEach(p => {
      stats.byRole[p.role] = (stats.byRole[p.role] || 0) + 1;
      
      // 统计每个参与者的消息数
      stats.messages[p.role] = context.messages.filter(m => m.role === p.role).length;
      
      // 记录加入时间
      stats.joinedAt[p.role] = p.joinedAt || context.createdAt;
    });

    return stats;
  }
}

module.exports = {
  ParticipantsManager,
  AGENT_ROLES
};
