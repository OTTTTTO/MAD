/**
 * Agent 性能分析系统
 * 
 * 每个 Agent 的发言统计
 * 响应时间分析
 * 贡献度评估
 * 性能趋势分析
 * 
 * @module agent-performance
 * @version 2.6.0
 */

class AgentPerformanceAnalyzer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.performanceCache = new Map(); // <agentId, performanceData>
    this.responseTimeTracker = new Map(); // <discussionId, Map<agentId, lastSpeakTime>>
  }

  /**
   * 分析 Agent 性能
   * @param {string} agentName - Agent 名称
   * @param {object} options - 分析选项
   * @returns {object} 性能分析结果
   */
  async analyzePerformance(agentName, options = {}) {
    const {
      discussionId = null,
      timeRange = '30d',
      includeDetails = true
    } = options;

    // 获取相关讨论
    const discussions = this.getDiscussions(agentName, discussionId, timeRange);

    // 提取 Agent 数据
    const agentData = this.extractAgentData(agentName, discussions);

    // 计算性能指标
    const performance = {
      agentName,
      summary: this.calculateSummary(agentData),
      speaking: this.analyzeSpeaking(agentData),
      responsiveness: this.analyzeResponsiveness(agentData),
      contribution: this.analyzeContribution(agentData),
      quality: this.analyzeQuality(agentData),
      trends: includeDetails ? this.analyzeTrends(agentData) : null
    };

    // 缓存结果
    this.performanceCache.set(agentName, performance);

    return performance;
  }

  /**
   * 获取相关讨论
   */
  getDiscussions(agentName, discussionId, timeRange) {
    const allDiscussions = Array.from(this.orchestrator.discussions.values());

    if (discussionId) {
      const discussion = this.orchestrator.discussions.get(discussionId);
      return discussion ? [discussion] : [];
    }

    // 按时间范围过滤
    const now = Date.now();
    const timeRangeMs = this.parseTimeRange(timeRange);

    return allDiscussions.filter(d => {
      const participated = (d.participants || []).some(p => p.role === agentName);
      const inTimeRange = (now - d.createdAt) <= timeRangeMs;
      return participated && inTimeRange;
    });
  }

  /**
   * 提取 Agent 数据
   */
  extractAgentData(agentName, discussions) {
    const messages = [];
    const discussionData = [];

    discussions.forEach(d => {
      const agentMessages = (d.messages || []).filter(m => m.role === agentName);
      
      if (agentMessages.length > 0) {
        messages.push(...agentMessages);
        discussionData.push({
          id: d.id,
          topic: d.topic,
          createdAt: d.createdAt,
          endedAt: d.endedAt,
          messageCount: agentMessages.length,
          duration: d.endedAt ? d.endedAt - d.createdAt : Date.now() - d.createdAt
        });
      }
    });

    return { messages, discussions: discussionData };
  }

  /**
   * 计算摘要统计
   */
  calculateSummary(agentData) {
    const { messages, discussions } = agentData;

    return {
      totalMessages: messages.length,
      totalDiscussions: discussions.length,
      avgMessagesPerDiscussion: discussions.length > 0 
        ? Math.round(messages.length / discussions.length * 10) / 10 
        : 0,
      totalCharacters: messages.reduce((sum, m) => sum + (m.content?.length || 0), 0),
      avgMessageLength: messages.length > 0
        ? Math.round(messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messages.length)
        : 0
    };
  }

  /**
   * 分析发言模式
   */
  analyzeSpeaking(agentData) {
    const { messages, discussions } = agentData;

    if (messages.length === 0) {
      return {
        firstSpeakTime: null,
        lastSpeakTime: null,
        speakingFrequency: 0,
        peakHours: [],
        avgMessagesPerHour: 0
      };
    }

    // 时间分析
    const timestamps = messages.map(m => m.timestamp);
    const firstSpeak = Math.min(...timestamps);
    const lastSpeak = Math.max(...timestamps);

    // 小时分布
    const hourCounts = new Array(24).fill(0);
    timestamps.forEach(ts => {
      const hour = new Date(ts).getHours();
      hourCounts[hour]++;
    });

    // 找出峰值小时
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(item => item.count === maxCount)
      .map(item => item.hour);

    // 计算发言频率（消息/小时）
    const timeSpan = lastSpeak - firstSpeak;
    const hours = Math.max(timeSpan / (1000 * 60 * 60), 1);
    const frequency = messages.length / hours;

    return {
      firstSpeakTime: firstSpeak,
      lastSpeakTime: lastSpeak,
      speakingFrequency: Math.round(frequency * 10) / 10,
      peakHours,
      avgMessagesPerHour: Math.round(frequency * 10) / 10,
      hourDistribution: hourCounts
    };
  }

  /**
   * 分析响应时间
   */
  analyzeResponsiveness(agentData) {
    const { messages } = agentData;

    if (messages.length < 2) {
      return {
        avgResponseTime: null,
        minResponseTime: null,
        maxResponseTime: null,
        responseTimeDistribution: []
      };
    }

    // 计算响应时间（消息间隔）
    const responseTimes = [];
    for (let i = 1; i < messages.length; i++) {
      const diff = messages[i].timestamp - messages[i - 1].timestamp;
      responseTimes.push(diff);
    }

    // 统计
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const min = Math.min(...responseTimes);
    const max = Math.max(...responseTimes);

    // 分布区间（0-30s, 30-60s, 1-5m, 5-10m, >10m）
    const distribution = [
      { label: '< 30s', count: 0, range: [0, 30000] },
      { label: '30s - 1m', count: 0, range: [30000, 60000] },
      { label: '1m - 5m', count: 0, range: [60000, 300000] },
      { label: '5m - 10m', count: 0, range: [300000, 600000] },
      { label: '> 10m', count: 0, range: [600000, Infinity] }
    ];

    responseTimes.forEach(time => {
      const bucket = distribution.find(d => 
        time >= d.range[0] && time < d.range[1]
      );
      if (bucket) bucket.count++;
    });

    return {
      avgResponseTime: Math.round(avg / 1000), // 秒
      minResponseTime: Math.round(min / 1000),
      maxResponseTime: Math.round(max / 1000),
      responseTimeDistribution: distribution
    };
  }

  /**
   * 分析贡献度
   */
  analyzeContribution(agentData) {
    const { messages, discussions } = agentData;

    if (messages.length === 0) {
      return {
        ideaContribution: 0,
        questionContribution: 0,
        consensusContribution: 0,
        totalContribution: 0
      };
    }

    let ideaCount = 0;
    let questionCount = 0;
    let consensusCount = 0;
    let mentionCount = 0;
    let replyCount = 0;

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();

      // 观点贡献
      if (content.includes('建议') || content.includes('提议') || 
          content.includes('认为') || content.includes('suggest') ||
          content.includes('propose')) {
        ideaCount++;
      }

      // 问题贡献
      if (content.includes('?') || content.includes('？') ||
          content.includes('如何') || content.includes('why')) {
        questionCount++;
      }

      // 共识贡献
      if (content.includes('同意') || content.includes('赞同') ||
          content.includes('agree')) {
        consensusCount++;
      }

      // 协作贡献
      if (msg.mentions && msg.mentions.length > 0) {
        mentionCount += msg.mentions.length;
      }
      if (msg.replyTo) {
        replyCount++;
      }
    });

    // 计算贡献度得分（0-1）
    const ideaScore = Math.min(ideaCount / messages.length, 1);
    const questionScore = Math.min(questionCount / messages.length, 1);
    const consensusScore = Math.min(consensusCount / messages.length, 1);
    const collaborationScore = Math.min(
      (mentionCount + replyCount) / (messages.length * 2), 1
    );

    const totalContribution = 
      ideaScore * 0.3 +
      questionScore * 0.2 +
      consensusScore * 0.2 +
      collaborationScore * 0.3;

    return {
      ideaContribution: Math.round(ideaScore * 100),
      questionContribution: Math.round(questionScore * 100),
      consensusContribution: Math.round(consensusScore * 100),
      collaborationContribution: Math.round(collaborationScore * 100),
      totalContribution: Math.round(totalContribution * 100),
      details: {
        ideas: ideaCount,
        questions: questionCount,
        consensus: consensusCount,
        mentions: mentionCount,
        replies: replyCount
      }
    };
  }

  /**
   * 分析质量
   */
  analyzeQuality(agentData) {
    const { messages } = agentData;

    if (messages.length === 0) {
      return {
        avgQuality: 0,
        qualityTrend: 'stable',
        highQualityCount: 0,
        lowQualityCount: 0
      };
    }

    let totalQuality = 0;
    let highQualityCount = 0;
    let lowQualityCount = 0;

    messages.forEach(msg => {
      // 简单质量评估：消息长度 + 关键词
      const length = msg.content?.length || 0;
      const hasKeywords = /\b(建议|分析|认为|建议|优化|改进|suggest|analyze|recommend)\b/i.test(msg.content || '');
      
      let quality = 0;
      if (length > 200) quality += 0.3;
      else if (length > 100) quality += 0.2;
      else if (length > 50) quality += 0.1;

      if (hasKeywords) quality += 0.3;

      // 提及或回复加分
      if (msg.mentions && msg.mentions.length > 0) quality += 0.2;
      if (msg.replyTo) quality += 0.2;

      quality = Math.min(quality, 1);
      totalQuality += quality;

      if (quality >= 0.7) highQualityCount++;
      else if (quality < 0.4) lowQualityCount++;
    });

    const avgQuality = totalQuality / messages.length;

    // 计算趋势（比较前半部分和后半部分）
    let qualityTrend = 'stable';
    if (messages.length >= 10) {
      const mid = Math.floor(messages.length / 2);
      const firstHalf = messages.slice(0, mid);
      const secondHalf = messages.slice(mid);

      const firstQuality = firstHalf.reduce((sum, m) => {
        const length = m.content?.length || 0;
        return sum + Math.min(length / 200, 1);
      }, 0) / firstHalf.length;

      const secondQuality = secondHalf.reduce((sum, m) => {
        const length = m.content?.length || 0;
        return sum + Math.min(length / 200, 1);
      }, 0) / secondHalf.length;

      if (secondQuality > firstQuality * 1.1) qualityTrend = 'improving';
      else if (secondQuality < firstQuality * 0.9) qualityTrend = 'declining';
    }

    return {
      avgQuality: Math.round(avgQuality * 100),
      qualityTrend,
      highQualityCount,
      lowQualityCount,
      qualityRatio: Math.round((highQualityCount / messages.length) * 100)
    };
  }

  /**
   * 分析趋势
   */
  analyzeTrends(agentData) {
    const { messages, discussions } = agentData;

    if (messages.length < 5) {
      return {
        messageTrend: 'stable',
        qualityTrend: 'stable',
        participationTrend: 'stable'
      };
    }

    // 消息数量趋势（按时间分段）
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const recent = messages.filter(m => (now - m.timestamp) < dayMs).length;
    const previous = messages.filter(m => {
      const age = now - m.timestamp;
      return age >= dayMs && age < dayMs * 2;
    }).length;

    let messageTrend = 'stable';
    if (recent > previous * 1.2) messageTrend = 'increasing';
    else if (recent < previous * 0.8) messageTrend = 'decreasing';

    // 质量趋势已在 analyzeQuality 中计算
    const qualityAnalysis = this.analyzeQuality(agentData);

    // 参与度趋势（讨论数量）
    const recentDiscussions = discussions.filter(d => (now - d.createdAt) < dayMs * 7).length;
    const previousDiscussions = discussions.filter(d => {
      const age = now - d.createdAt;
      return age >= dayMs * 7 && age < dayMs * 14;
    }).length;

    let participationTrend = 'stable';
    if (recentDiscussions > previousDiscussions * 1.2) participationTrend = 'increasing';
    else if (recentDiscussions < previousDiscussions * 0.8) participationTrend = 'decreasing';

    return {
      messageTrend,
      qualityTrend: qualityAnalysis.qualityTrend,
      participationTrend
    };
  }

  /**
   * 获取所有 Agent 的性能对比
   */
  async compareAgents(agentNames, options = {}) {
    const performances = [];

    for (const agentName of agentNames) {
      try {
        const perf = await this.analyzePerformance(agentName, options);
        performances.push(perf);
      } catch (error) {
        console.error(`[AgentPerformance] Failed to analyze ${agentName}:`, error);
      }
    }

    // 排序
    performances.sort((a, b) => 
      b.contribution.totalContribution - a.contribution.totalContribution
    );

    return {
      ranking: performances.map((p, index) => ({
        rank: index + 1,
        agentName: p.agentName,
        score: p.contribution.totalContribution,
        summary: p.summary
      })),
      details: performances
    };
  }

  /**
   * 获取性能排行榜
   */
  async getLeaderboard(options = {}) {
    const {
      metric = 'totalContribution',
      limit = 10,
      timeRange = '30d'
    } = options;

    // 获取所有 Agent
    const allDiscussions = Array.from(this.orchestrator.discussions.values());
    const agents = new Set();
    
    allDiscussions.forEach(d => {
      (d.participants || []).forEach(p => agents.add(p.role));
    });

    const agentNames = Array.from(agents);

    // 分析所有 Agent
    const performances = [];
    for (const agentName of agentNames) {
      try {
        const perf = await this.analyzePerformance(agentName, { timeRange, includeDetails: false });
        performances.push(perf);
      } catch (error) {
        console.error(`[AgentPerformance] Failed to analyze ${agentName}:`, error);
      }
    }

    // 根据指标排序
    let getValue;
    switch (metric) {
      case 'totalMessages':
        getValue = p => p.summary.totalMessages;
        break;
      case 'avgQuality':
        getValue = p => p.quality.avgQuality;
        break;
      case 'ideaContribution':
        getValue = p => p.contribution.ideaContribution;
        break;
      default:
        getValue = p => p.contribution.totalContribution;
    }

    performances.sort((a, b) => getValue(b) - getValue(a));

    return performances.slice(0, limit).map((p, index) => ({
      rank: index + 1,
      agentName: p.agentName,
      score: getValue(p),
      details: p
    }));
  }

  /**
   * 解析时间范围
   */
  parseTimeRange(range) {
    const match = range.match(/^(\d+)([dhm])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'm': return value * 60 * 1000;
      }
    }
    // 默认 30 天
    return 30 * 24 * 60 * 60 * 1000;
  }

  /**
   * 清除缓存
   */
  clearCache(agentName = null) {
    if (agentName) {
      this.performanceCache.delete(agentName);
    } else {
      this.performanceCache.clear();
    }
  }
}

module.exports = {
  AgentPerformanceAnalyzer
};
