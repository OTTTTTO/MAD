/**
 * 讨论建议系统
 * 
 * 基于历史的智能建议
 * 最佳实践提示
 * 改进建议
 * 
 * @module suggestions
 * @version 2.6.0
 */

class DiscussionSuggestionSystem {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.suggestionHistory = new Map();
    this.patterns = new Map();
    this.bestPractices = this.initializeBestPractices();
  }

  /**
   * 初始化最佳实践
   */
  initializeBestPractices() {
    return {
      participation: [
        {
          id: 'balanced-speaking',
          title: '保持发言均衡',
          description: '确保每个 Agent 都有发言机会，避免少数 Agent 主导讨论',
          priority: 'high',
          category: 'participation'
        },
        {
          id: 'early-consensus',
          title: '早期达成共识',
          description: '在讨论早期就关键问题达成共识，避免后期返工',
          priority: 'medium',
          category: 'efficiency'
        }
      ],
      quality: [
        {
          id: 'specific-questions',
          title: '提出具体问题',
          description: '避免模糊的问题，具体化问题可以获得更好的答案',
          priority: 'high',
          category: 'quality'
        },
        {
          id: 'provide-context',
          title: '提供充分背景',
          description: '在讨论开始时提供足够的背景信息，帮助 Agent 理解上下文',
          priority: 'high',
          category: 'quality'
        },
        {
          id: 'constructive-feedback',
          title: '提供建设性反馈',
          description: '批评时要具体，并提供改进建议',
          priority: 'medium',
          category: 'quality'
        }
      ],
      collaboration: [
        {
          id: 'use-mentions',
          title: '善用 @提及',
          description: '使用 @提及来邀请特定 Agent 参与讨论',
          priority: 'high',
          category: 'collaboration'
        },
        {
          id: 'build-on-ideas',
          title: '基于他人观点',
          description: '在他人观点基础上扩展，而不是重复',
          priority: 'medium',
          category: 'collaboration'
        },
        {
          id: 'acknowledge-agreement',
          title: '确认共识',
          description: '明确表示同意或不同意，并说明理由',
          priority: 'medium',
          category: 'collaboration'
        }
      ],
      timing: [
        {
          id: 'set-timebox',
          title: '设置时间限制',
          description: '为讨论设置合理的时长限制，提高效率',
          priority: 'medium',
          category: 'timing'
        },
        {
          id: 'regular-breaks',
          title: '定期总结',
          description: '每几个轮次后总结当前进展，确保讨论在正轨上',
          priority: 'low',
          category: 'timing'
        }
      ]
    };
  }

  /**
   * 为讨论生成建议
   * @param {string} discussionId - 讨论 ID
   * @param {object} options - 选项
   * @returns {Array} 建议列表
   */
  async generateSuggestions(discussionId, options = {}) {
    const {
      type = 'all', // 'all' | 'improvement' | 'best-practice' | 'pattern'
      maxSuggestions = 5,
      includeDismissed = false
    } = options;

    const discussion = this.orchestrator.discussions.get(discussionId);
    if (!discussion) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const suggestions = [];

    // 分析讨论状态
    const analysis = await this.analyzeDiscussion(discussion);

    // 生成改进建议
    if (type === 'all' || type === 'improvement') {
      const improvements = await this.generateImprovementSuggestions(discussion, analysis);
      suggestions.push(...improvements);
    }

    // 生成最佳实践建议
    if (type === 'all' || type === 'best-practice') {
      const practices = await this.generateBestPracticeSuggestions(discussion, analysis);
      suggestions.push(...practices);
    }

    // 生成模式建议
    if (type === 'all' || type === 'pattern') {
      const patternSuggestions = await this.generatePatternSuggestions(discussion, analysis);
      suggestions.push(...patternSuggestions);
    }

    // 过滤已忽略的建议
    const history = this.suggestionHistory.get(discussionId) || {};
    const filtered = suggestions.filter(s => 
      includeDismissed || !history[s.id]?.dismissed
    );

    // 按优先级排序
    filtered.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return filtered.slice(0, maxSuggestions);
  }

  /**
   * 分析讨论
   */
  async analyzeDiscussion(discussion) {
    const messages = discussion.messages || [];
    const participants = discussion.participants || [];

    const analysis = {
      messageCount: messages.length,
      participantCount: participants.length,
      duration: Date.now() - discussion.createdAt,
      status: discussion.status,
      round: discussion.rounds || 0,
      
      // 发言分布
      messageDistribution: this.analyzeMessageDistribution(messages, participants),
      
      // 协作指标
      collaboration: this.analyzeCollaboration(messages),
      
      // 质量指标
      quality: this.analyzeQuality(messages),
      
      // 时间模式
      timing: this.analyzeTiming(messages, discussion.createdAt)
    };

    return analysis;
  }

  /**
   * 分析消息分布
   */
  analyzeMessageDistribution(messages, participants) {
    const distribution = {};
    let total = 0;

    participants.forEach(p => {
      const count = messages.filter(m => m.agentName === p.role).length;
      distribution[p.role] = count;
      total += count;
    });

    // 计算均衡度
    const avg = total / participants.length;
    let variance = 0;
    Object.values(distribution).forEach(count => {
      variance += Math.pow(count - avg, 2);
    });
    variance /= participants.length;

    return {
      distribution,
      average: avg,
      balance: 1 - Math.min(variance / (avg * avg), 1), // 0-1, 1 是完全均衡
      dominantAgent: Object.entries(distribution)
        .sort(([,a], [,b]) => b - a)[0]?.[0]
    };
  }

  /**
   * 分析协作
   */
  analyzeCollaboration(messages) {
    let mentionCount = 0;
    let replyCount = 0;
    let consensusCount = 0;

    messages.forEach(msg => {
      if (msg.mentions && msg.mentions.length > 0) {
        mentionCount += msg.mentions.length;
      }
      if (msg.replyTo) {
        replyCount++;
      }
      if (msg.content && /\b(同意|赞同|支持|agree|support)\b/i.test(msg.content)) {
        consensusCount++;
      }
    });

    return {
      mentionRate: messages.length > 0 ? mentionCount / messages.length : 0,
      replyRate: messages.length > 0 ? replyCount / messages.length : 0,
      consensusRate: messages.length > 0 ? consensusCount / messages.length : 0
    };
  }

  /**
   * 分析质量
   */
  analyzeQuality(messages) {
    if (messages.length === 0) {
      return { avgLength: 0, questionRate: 0, ideaRate: 0 };
    }

    let totalLength = 0;
    let questionCount = 0;
    let ideaCount = 0;

    messages.forEach(msg => {
      const length = msg.content?.length || 0;
      totalLength += length;

      if (msg.content && /[?？]/.test(msg.content)) {
        questionCount++;
      }

      if (msg.content && /\b(建议|提议|认为|suggest|propose)\b/i.test(msg.content)) {
        ideaCount++;
      }
    });

    return {
      avgLength: totalLength / messages.length,
      questionRate: questionCount / messages.length,
      ideaRate: ideaCount / messages.length
    };
  }

  /**
   * 分析时间模式
   */
  analyzeTiming(messages, startTime) {
    if (messages.length === 0) {
      return { avgInterval: 0, firstResponseTime: null };
    }

    const intervals = [];
    for (let i = 1; i < messages.length; i++) {
      intervals.push(messages[i].timestamp - messages[i - 1].timestamp);
    }

    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 0;

    const firstResponseTime = messages.length > 1
      ? messages[1].timestamp - messages[0].timestamp
      : null;

    return {
      avgInterval,
      firstResponseTime,
      totalDuration: messages[messages.length - 1].timestamp - startTime
    };
  }

  /**
   * 生成改进建议
   */
  async generateImprovementSuggestions(discussion, analysis) {
    const suggestions = [];

    // 检查发言均衡
    if (analysis.messageDistribution.balance < 0.5) {
      suggestions.push({
        id: 'improve-balance',
        type: 'improvement',
        category: 'participation',
        priority: 'high',
        title: '发言不均衡',
        description: `"${analysis.messageDistribution.dominantAgent}" 发言过多，建议邀请其他 Agent 更多参与`,
        action: '使用 @提及邀请沉默的 Agent',
        metric: {
          current: Math.round(analysis.messageDistribution.balance * 100),
          target: 70
        }
      });
    }

    // 检查协作率
    if (analysis.collaboration.mentionRate < 0.2) {
      suggestions.push({
        id: 'increase-mentions',
        type: 'improvement',
        category: 'collaboration',
        priority: 'medium',
        title: '增加互动',
        description: 'Agent 之间缺乏互动，建议使用 @提及和回复功能',
        action: '在发言中使用 @提及其他 Agent',
        metric: {
          current: Math.round(analysis.collaboration.mentionRate * 100),
          target: 30
        }
      });
    }

    // 检查问题率
    if (analysis.quality.questionRate < 0.1) {
      suggestions.push({
        id: 'ask-questions',
        type: 'improvement',
        category: 'quality',
        priority: 'medium',
        title: '增加提问',
        description: '讨论中缺乏问题，建议 Agent 多提出问题以深化讨论',
        action: '鼓励 Agent 提出探索性问题',
        metric: {
          current: Math.round(analysis.quality.questionRate * 100),
          target: 15
        }
      });
    }

    // 检查消息长度
    if (analysis.quality.avgLength < 50) {
      suggestions.push({
        id: 'elongate-messages',
        type: 'improvement',
        category: 'quality',
        priority: 'low',
        title: '增加消息详细度',
        description: '消息偏短，建议 Agent 提供更详细的观点和理由',
        action: '要求 Agent 详细说明观点',
        metric: {
          current: Math.round(analysis.quality.avgLength),
          target: 100
        }
      });
    }

    return suggestions;
  }

  /**
   * 生成最佳实践建议
   */
  async generateBestPracticeSuggestions(discussion, analysis) {
    const suggestions = [];

    // 根据讨论状态推荐最佳实践
    if (analysis.status === 'initializing' || analysis.round < 2) {
      suggestions.push({
        id: 'bp-set-clear-goals',
        type: 'best-practice',
        category: 'setup',
        priority: 'high',
        title: '设定清晰目标',
        description: '在讨论开始时明确讨论目标和预期结果',
        action: '在初始消息中明确说明讨论目的',
        reference: this.bestPractices.quality.find(bp => bp.id === 'provide-context')
      });
    }

    if (analysis.messageCount > 5 && analysis.collaboration.consensusRate < 0.1) {
      suggestions.push({
        id: 'bp-build-consensus',
        type: 'best-practice',
        category: 'collaboration',
        priority: 'medium',
        title: '建立共识',
        description: '讨论进行了一段时间，建议开始总结共识',
        action: '让协调员总结当前达成的共识',
        reference: this.bestPractices.collaboration.find(bp => bp.id === 'acknowledge-agreement')
      });
    }

    return suggestions;
  }

  /**
   * 生成模式建议
   */
  async generatePatternSuggestions(discussion, analysis) {
    const suggestions = [];

    // 基于历史讨论的模式
    const history = await this.analyzeHistory(discussion);

    if (history.patterns.includes('low_participation')) {
      suggestions.push({
        id: 'pattern-low-participation',
        type: 'pattern',
        category: 'historical',
        priority: 'high',
        title: '参与度偏低模式',
        description: '这类讨论通常参与度较低，建议主动邀请更多 Agent',
        action: '增加 @提及，设置更短的发言间隔',
        pattern: 'low_participation',
        confidence: 0.8
      });
    }

    if (history.patterns.includes('quick_conclusion')) {
      suggestions.push({
        id: 'pattern-quick-conclusion',
        type: 'pattern',
        category: 'historical',
        priority: 'medium',
        title: '快速结论模式',
        description: '这类讨论通常能快速达成结论，可以设置更短的时长',
        action: '将讨论时长缩短到 3-5 分钟',
        pattern: 'quick_conclusion',
        confidence: 0.7
      });
    }

    return suggestions;
  }

  /**
   * 分析历史模式
   */
  async analyzeHistory(discussion) {
    // 查找相似的历史讨论
    const similar = this.orchestrator.findSimilarDiscussions 
      ? this.orchestrator.findSimilarDiscussions(discussion.id, 0.3, 10)
      : [];

    const patterns = [];

    // 分析相似讨论的模式
    similar.forEach(sim => {
      const d = this.orchestrator.discussions.get(sim.id);
      if (!d) return;

      const messages = d.messages || [];
      const participants = d.participants || [];

      // 低参与度模式
      const participationRatio = messages.length / participants.length;
      if (participationRatio < 2) {
        patterns.push('low_participation');
      }

      // 快速结论模式
      const duration = d.endedAt 
        ? d.endedAt - d.createdAt 
        : Date.now() - d.createdAt;
      if (duration < 60000 && messages.length > 3) {
        patterns.push('quick_conclusion');
      }
    });

    return { patterns };
  }

  /**
   * 忽略建议
   */
  dismissSuggestion(discussionId, suggestionId) {
    if (!this.suggestionHistory.has(discussionId)) {
      this.suggestionHistory.set(discussionId, {});
    }

    const history = this.suggestionHistory.get(discussionId);
    history[suggestionId] = {
      dismissed: true,
      dismissedAt: Date.now()
    };
  }

  /**
   * 应用建议
   */
  async applySuggestion(discussionId, suggestionId) {
    if (!this.suggestionHistory.has(discussionId)) {
      this.suggestionHistory.set(discussionId, {});
    }

    const history = this.suggestionHistory.get(discussionId);
    history[suggestionId] = {
      applied: true,
      appliedAt: Date.now()
    };

    // 根据建议类型执行相应操作
    const discussion = this.orchestrator.discussions.get(discussionId);
    if (!discussion) return;

    // 这里可以根据 suggestionId 执行具体操作
    // 例如：增加 @提及、调整配置等
  }

  /**
   * 获取建议统计
   */
  getSuggestionStats(discussionId) {
    const history = this.suggestionHistory.get(discussionId) || {};

    const stats = {
      total: Object.keys(history).length,
      dismissed: 0,
      applied: 0,
      byType: {
        improvement: 0,
        bestPractice: 0,
        pattern: 0
      }
    };

    Object.values(history).forEach(record => {
      if (record.dismissed) stats.dismissed++;
      if (record.applied) stats.applied++;
    });

    return stats;
  }

  /**
   * 清除建议历史
   */
  clearHistory(discussionId = null) {
    if (discussionId) {
      this.suggestionHistory.delete(discussionId);
    } else {
      this.suggestionHistory.clear();
    }
  }
}

module.exports = {
  DiscussionSuggestionSystem
};
