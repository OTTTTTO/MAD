/**
 * 行为分析
 * 
 * 分析 Agent 的发言模式、协作行为和影响力
 */

class BehaviorAnalyzer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.cache = new Map();
  }

  /**
   * 分析 Agent 行为
   * @param {object} options - 分析选项
   */
  async analyzeAgentBehavior(options = {}) {
    const {
      agentName = null,
      timeRange = '30d',
      includeCollaboration = true
    } = options;

    const discussions = this.getDiscussionsInRange(timeRange);

    if (agentName) {
      return this.analyzeSingleAgent(agentName, discussions, includeCollaboration);
    } else {
      return this.analyzeAllAgents(discussions, includeCollaboration);
    }
  }

  /**
   * 分析单个 Agent
   */
  analyzeSingleAgent(agentName, discussions, includeCollaboration) {
    const agentData = this.extractAgentData(agentName, discussions);

    const analysis = {
      agentName,
      overview: this.generateAgentOverview(agentData),
      speakingPatterns: this.analyzeSpeakingPatterns(agentData),
      collaboration: includeCollaboration ? this.analyzeAgentCollaboration(agentName, discussions) : null,
      topics: this.analyzeAgentTopics(agentData),
      timeline: this.buildAgentTimeline(agentData),
      influence: this.calculateAgentInfluence(agentName, discussions)
    };

    return analysis;
  }

  /**
   * 分析所有 Agents
   */
  analyzeAllAgents(discussions, includeCollaboration) {
    const agents = this.getAllAgents(discussions);
    const analyses = {};

    for (const agentName of agents) {
      analyses[agentName] = this.analyzeSingleAgent(agentName, discussions, includeCollaboration);
    }

    // 添加整体比较
    analyses._comparison = this.generateComparison(analyses);

    return analyses;
  }

  /**
   * 提取 Agent 数据
   */
  extractAgentData(agentName, discussions) {
    const messages = [];
    const participatedDiscussions = [];

    for (const discussion of discussions) {
      const agentMessages = (discussion.messages || []).filter(m => m.agentName === agentName);
      
      if (agentMessages.length > 0) {
        messages.push(...agentMessages);
        participatedDiscussions.push({
          id: discussion.id,
          topic: discussion.topic,
          createdAt: discussion.createdAt,
          endedAt: discussion.endedAt,
          agentMessages: agentMessages.length
        });
      }
    }

    return { messages, discussions: participatedDiscussions };
  }

  /**
   * 生成 Agent 概览
   */
  generateAgentOverview(agentData) {
    const { messages, discussions } = agentData;

    if (messages.length === 0) {
      return {
        totalMessages: 0,
        totalDiscussions: 0,
        avgMessagesPerDiscussion: 0,
        avgResponseTime: 0,
        participationRate: 0
      };
    }

    // 计算平均回复时间
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const discussion of discussions) {
      const sortedMessages = discussion.agentMessages ? 
        messages.filter(m => m.discussionId === discussion.id).sort((a, b) => a.timestamp - b.timestamp) :
        [];

      for (let i = 1; i < sortedMessages.length; i++) {
        totalResponseTime += sortedMessages[i].timestamp - sortedMessages[i-1].timestamp;
        responseCount++;
      }
    }

    return {
      totalMessages: messages.length,
      totalDiscussions: discussions.length,
      avgMessagesPerDiscussion: messages.length / discussions.length,
      avgResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      firstSeen: messages[0]?.timestamp,
      lastSeen: messages[messages.length - 1]?.timestamp
    };
  }

  /**
   * 分析发言模式
   */
  analyzeSpeakingPatterns(agentData) {
    const { messages } = agentData;

    if (messages.length === 0) return null;

    // 分析消息长度
    const lengths = messages.map(m => m.content?.length || 0);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    // 分析发言时间分布
    const hourlyDistribution = new Array(24).fill(0);
    for (const msg of messages) {
      const hour = new Date(msg.timestamp).getHours();
      hourlyDistribution[hour]++;
    }

    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));

    return {
      avgMessageLength: avgLength,
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths),
      peakHour,
      hourlyDistribution: hourlyDistribution.map((count, hour) => ({
        hour,
        count,
        percentage: count / messages.length
      })),
      verbosity: avgLength > 500 ? 'verbose' : avgLength > 200 ? 'moderate' : 'concise'
    };
  }

  /**
   * 分析协作行为
   */
  analyzeAgentCollaboration(agentName, discussions) {
    const collaborations = {
      partners: new Map(),
      coOccurrences: 0,
      soloParticipations: 0
    };

    for (const discussion of discussions) {
      const agents = this.getAgentsInDiscussion(discussion);
      
      if (!agents.includes(agentName)) continue;

      const otherAgents = agents.filter(a => a !== agentName);

      if (otherAgents.length === 0) {
        collaborations.soloParticipations++;
      } else {
        collaborations.coOccurrences++;

        for (const other of otherAgents) {
          collaborations.partners.set(other, (collaborations.partners.get(other) || 0) + 1);
        }
      }
    }

    // 转换为数组并排序
    const topPartners = Array.from(collaborations.partners.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([agent, count]) => ({ agent, count }));

    return {
      topPartners,
      coOccurrences: collaborations.coOccurrences,
      soloParticipations: collaborations.soloParticipations,
      collaborationRate: collaborations.coOccurrences / (collaborations.coOccurrences + collaborations.soloParticipations),
      networkSize: collaborations.partners.size
    };
  }

  /**
   * 分析 Agent 主题偏好
   */
  analyzeAgentTopics(agentData) {
    const { discussions } = agentData;
    const topics = discussions.map(d => d.topic || 'Untitled');

    // 分析关键词
    const wordFreq = {};
    for (const topic of topics) {
      const words = topic.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }
    }

    const topKeywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      topTopics: topics.slice(0, 5),
      topKeywords,
      topicDiversity: new Set(topics).size
    };
  }

  /**
   * 构建 Agent 时间线
   */
  buildAgentTimeline(agentData) {
    const { messages } = agentData;

    if (messages.length === 0) return [];

    const dailyActivity = {};

    for (const msg of messages) {
      const day = new Date(msg.timestamp).toISOString().slice(0, 10);
      if (!dailyActivity[day]) {
        dailyActivity[day] = { count: 0, totalLength: 0 };
      }
      dailyActivity[day].count++;
      dailyActivity[day].totalLength += msg.content?.length || 0;
    }

    return Object.entries(dailyActivity)
      .map(([day, data]) => ({
        day,
        messages: data.count,
        avgLength: data.totalLength / data.count
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  /**
   * 计算 Agent 影响力
   */
  calculateAgentInfluence(agentName, discussions) {
    const agentData = this.extractAgentData(agentName, discussions);
    const { messages, discussions: participated } = agentData;

    if (messages.length === 0) {
      return { score: 0, factors: {} };
    }

    const factors = {};

    // 因子1: 参与度
    factors.participation = participated.length / discussions.length;

    // 因子2: 发言量
    const allMessages = discussions.reduce((sum, d) => sum + (d.messages?.length || 0), 0);
    factors.activity = messages.length / allMessages;

    // 因子3: 发起讨论
    const initiated = participated.filter(d => d.agentMessages > 0 && 
      d.agentMessages === (d.messages?.length || 0)).length;
    factors.initiation = initiated / participated.length;

    // 因子4: 持续性
    const timeSpan = (agentData.overview?.lastSeen || 0) - (agentData.overview?.firstSeen || 0);
    factors.consistency = timeSpan > 0 ? messages.length / (timeSpan / (1000 * 60 * 60 * 24)) : 0;

    // 计算加权得分
    const weights = {
      participation: 0.2,
      activity: 0.3,
      initiation: 0.3,
      consistency: 0.2
    };

    const score = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (factors[key] || 0) * weight;
    }, 0);

    return {
      score: Math.min(100, score * 100),
      factors,
      rank: this.calculatePercentile(score)
    };
  }

  /**
   * 生成比较分析
   */
  generateComparison(analyses) {
    const agents = Object.entries(analyses)
      .filter(([name]) => name !== '_comparison')
      .map(([name, data]) => ({
        name,
        messages: data.overview.totalMessages,
        discussions: data.overview.totalDiscussions,
        influence: data.influence.score
      }))
      .sort((a, b) => b.influence - a.influence);

    return {
      mostActive: agents[0],
      mostInfluential: agents[0],
      topCollaborators: agents.slice(0, 5),
      averageStats: {
        messages: agents.reduce((sum, a) => sum + a.messages, 0) / agents.length,
        discussions: agents.reduce((sum, a) => sum + a.discussions, 0) / agents.length,
        influence: agents.reduce((sum, a) => sum + a.influence, 0) / agents.length
      }
    };
  }

  /**
   * 构建协作网络图
   */
  buildCollaborationNetwork(discussions) {
    const nodes = new Map();
    const edges = new Map();

    for (const discussion of discussions) {
      const agents = this.getAgentsInDiscussion(discussion);

      // 添加节点
      for (const agent of agents) {
        if (!nodes.has(agent)) {
          nodes.set(agent, {
            id: agent,
            connections: 0,
            discussions: 0
          });
        }
        nodes.get(agent).discussions++;
      }

      // 添加边
      for (let i = 0; i < agents.length; i++) {
        for (let j = i + 1; j < agents.length; j++) {
          const edge = [agents[i], agents[j]].sort().join('-');
          edges.set(edge, (edges.get(edge) || 0) + 1);
        }
      }
    }

    // 更新连接数
    for (const [edge, count] of edges.entries()) {
      const [agent1, agent2] = edge.split('-');
      nodes.get(agent1).connections++;
      nodes.get(agent2).connections++;
    }

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.entries()).map(([key, weight]) => ({
        source: key.split('-')[0],
        target: key.split('-')[1],
        weight
      }))
    };
  }

  // 辅助方法

  /**
   * 获取时间范围内的讨论
   */
  getDiscussionsInRange(timeRange) {
    const { start } = this.getDateRange(timeRange);
    
    return Array.from(this.orchestrator.discussions.values())
      .filter(d => d.createdAt >= start);
  }

  /**
   * 获取日期范围
   */
  getDateRange(timeRange) {
    const end = new Date();
    const start = new Date();

    const match = timeRange.match(/^(\d+)([dMy])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'd': start.setDate(start.getDate() - value); break;
        case 'M': start.setMonth(start.getMonth() - value); break;
        case 'y': start.setFullYear(start.getFullYear() - value); break;
      }
    }

    return { start, end };
  }

  /**
   * 获取所有 Agents
   */
  getAllAgents(discussions) {
    const agents = new Set();
    
    for (const discussion of discussions) {
      for (const msg of discussion.messages || []) {
        agents.add(msg.agentName);
      }
    }

    return Array.from(agents);
  }

  /**
   * 获取讨论中的 Agents
   */
  getAgentsInDiscussion(discussion) {
    const agents = new Set();
    for (const msg of discussion.messages || []) {
      agents.add(msg.agentName);
    }
    return Array.from(agents);
  }

  /**
   * 计算百分位
   */
  calculatePercentile(value) {
    if (value < 20) return 'low';
    if (value < 40) return 'below-average';
    if (value < 60) return 'average';
    if (value < 80) return 'above-average';
    return 'high';
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { BehaviorAnalyzer };
