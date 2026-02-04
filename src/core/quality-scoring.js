/**
 * 讨论质量评分系统
 * 
 * 多维度评分：参与度、创新性、协作度、完整性
 * 实时评分反馈
 * 评分趋势图表
 * 
 * @module quality-scoring
 * @version 2.6.0
 */

class QualityScorer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.scoreHistory = new Map(); // <discussionId, [{ timestamp, scores }]>
    this.weights = {
      participation: 0.25,    // 参与度权重
      innovation: 0.30,       // 创新性权重
      collaboration: 0.25,    // 协作度权重
      completeness: 0.20      // 完整性权重
    };
  }

  /**
   * 计算讨论质量评分
   * @param {string} discussionId - 讨论 ID
   * @returns {object} 评分结果
   */
  async calculateScore(discussionId) {
    const discussion = this.orchestrator.discussions.get(discussionId);
    if (!discussion) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const messages = discussion.messages || [];
    const participants = discussion.participants || [];

    // 计算各维度得分
    const participationScore = this.calculateParticipation(messages, participants);
    const innovationScore = this.calculateInnovation(messages);
    const collaborationScore = this.calculateCollaboration(messages, participants);
    const completenessScore = this.calculateCompleteness(discussion, messages);

    // 计算总分
    const totalScore = 
      participationScore * this.weights.participation +
      innovationScore * this.weights.innovation +
      collaborationScore * this.weights.collaboration +
      completenessScore * this.weights.completeness;

    // 评级
    const grade = this.getGrade(totalScore);

    const scores = {
      total: Math.round(totalScore * 100) / 100,
      grade,
      dimensions: {
        participation: Math.round(participationScore * 100) / 100,
        innovation: Math.round(innovationScore * 100) / 100,
        collaboration: Math.round(collaborationScore * 100) / 100,
        completeness: Math.round(completenessScore * 100) / 100
      },
      timestamp: Date.now()
    };

    // 保存评分历史
    this.saveScoreHistory(discussionId, scores);

    return scores;
  }

  /**
   * 计算参与度得分
   * 考虑因素：
   * - 参与者发言比例
   * - 消息数量
   * - 讨论轮次
   * - 发言均衡度
   */
  calculateParticipation(messages, participants) {
    if (!participants || participants.length === 0) return 0;
    if (!messages || messages.length === 0) return 0;

    const participantCount = participants.length;
    const messageCount = messages.length;

    // 参与者发言比例 (40%)
    const speakingParticipants = new Set(messages.map(m => m.agentName));
    const participationRatio = speakingParticipants.size / participantCount;

    // 消息数量得分 (20%)
    const idealMessages = participantCount * 5; // 理想每人5条消息
    const messageScore = Math.min(messageCount / idealMessages, 1);

    // 发言均衡度 (40%)
    const messagesPerAgent = {};
    messages.forEach(m => {
      messagesPerAgent[m.agentName] = (messagesPerAgent[m.agentName] || 0) + 1;
    });
    const avgMessages = messageCount / participantCount;
    let variance = 0;
    Object.values(messagesPerAgent).forEach(count => {
      variance += Math.pow(count - avgMessages, 2);
    });
    variance /= participantCount;
    const balanceScore = Math.max(0, 1 - variance / (avgMessages * avgMessages));

    return participationRatio * 0.4 + messageScore * 0.2 + balanceScore * 0.4;
  }

  /**
   * 计算创新性得分
   * 考虑因素：
   * - 新观点数量
   * - 提问数量
   * - 观点多样性
   * - 关键词创新度
   */
  calculateInnovation(messages) {
    if (!messages || messages.length === 0) return 0;

    let newIdeaCount = 0;
    let questionCount = 0;
    const concepts = new Set();
    const innovationKeywords = [
      '创新', '新', '改进', '优化', '突破', '独特', '原创', 
      '新颖', '创造', '发现', '发明', '改进方案', '替代方案',
      'innovative', 'new', 'novel', 'creative', 'unique', 'breakthrough'
    ];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // 检测新观点标记
      if (content.includes('建议') || content.includes('提议') || 
          content.includes('认为') || content.includes('idea') ||
          content.includes('suggest')) {
        newIdeaCount++;
      }

      // 检测问题
      if (content.includes('?') || content.includes('？') ||
          content.includes('如何') || content.includes('怎样') ||
          content.includes('why') || content.includes('how')) {
        questionCount++;
      }

      // 提取概念（简单关键词提取）
      const words = content.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          concepts.add(word);
        }
      });
    });

    // 新观点得分 (40%)
    const idealIdeas = messages.length * 0.3;
    const ideaScore = Math.min(newIdeaCount / idealIdeas, 1);

    // 问题得分 (20%)
    const idealQuestions = messages.length * 0.2;
    const questionScore = Math.min(questionCount / idealQuestions, 1);

    // 概念多样性得分 (20%)
    const conceptScore = Math.min(concepts.size / (messages.length * 2), 1);

    // 创新关键词得分 (20%)
    let innovationKeywordCount = 0;
    messages.forEach(msg => {
      innovationKeywords.forEach(keyword => {
        if (msg.content.toLowerCase().includes(keyword.toLowerCase())) {
          innovationKeywordCount++;
        }
      });
    });
    const keywordScore = Math.min(innovationKeywordCount / messages.length, 1);

    return ideaScore * 0.4 + questionScore * 0.2 + 
           conceptScore * 0.2 + keywordScore * 0.2;
  }

  /**
   * 计算协作度得分
   * 考虑因素：
   * - @提及数量
   * - 回复数量
   * - 观点引用
   * - 共识形成
   */
  calculateCollaboration(messages, participants) {
    if (!messages || messages.length === 0) return 0;
    if (!participants || participants.length < 2) return 0;

    let mentionCount = 0;
    let replyCount = 0;
    let consensusCount = 0;
    const collaborationKeywords = [
      '同意', '赞同', '支持', '认可', '确认', '补充', '完善',
      'agree', 'support', 'confirm', 'acknowledge', 'add'
    ];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();

      // 统计 @提及
      if (msg.mentions && msg.mentions.length > 0) {
        mentionCount += msg.mentions.length;
      }

      // 统计回复
      if (msg.replyTo) {
        replyCount++;
      }

      // 统计共识
      collaborationKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          consensusCount++;
        }
      });
    });

    // @提及得分 (30%)
    const idealMentions = messages.length * 0.5;
    const mentionScore = Math.min(mentionCount / idealMentions, 1);

    // 回复得分 (30%)
    const idealReplies = messages.length * 0.3;
    const replyScore = Math.min(replyCount / idealReplies, 1);

    // 共识得分 (40%)
    const idealConsensus = messages.length * 0.2;
    const consensusScore = Math.min(consensusCount / idealConsensus, 1);

    return mentionScore * 0.3 + replyScore * 0.3 + consensusScore * 0.4;
  }

  /**
   * 计算完整性得分
   * 考虑因素：
   * - 讨论状态
   * - 结论质量
   * - 时间利用率
   * - 目标达成度
   */
  calculateCompleteness(discussion, messages) {
    if (!discussion) return 0;

    let score = 0;

    // 讨论状态 (30%)
    if (discussion.status === 'ended') {
      score += 0.3;
    } else if (discussion.status === 'concluding') {
      score += 0.2;
    } else if (discussion.status === 'active') {
      score += 0.1;
    }

    // 结论质量 (40%)
    if (discussion.consensus && discussion.consensus.size > 0) {
      const consensusCount = discussion.consensus.size;
      const participantCount = discussion.participants.length;
      const consensusRatio = consensusCount / participantCount;
      score += Math.min(consensusRatio, 1) * 0.4;
    }

    // 时间利用率 (15%)
    if (discussion.maxDuration) {
      const duration = Date.now() - discussion.createdAt;
      const utilization = Math.min(duration / discussion.maxDuration, 1);
      score += utilization * 0.15;
    }

    // 目标达成度 (15%)
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.agentName === 'coordinator' && 
          (lastMessage.content.includes('结论') || 
           lastMessage.content.includes('总结') ||
           lastMessage.content.includes('consensus'))) {
        score += 0.15;
      }
    }

    return Math.min(score, 1);
  }

  /**
   * 获取评级
   */
  getGrade(score) {
    if (score >= 0.9) return { level: '优秀', emoji: '🌟', color: '#10b981' };
    if (score >= 0.75) return { level: '良好', emoji: '👍', color: '#3b82f6' };
    if (score >= 0.6) return { level: '一般', emoji: '😐', color: '#f59e0b' };
    return { level: '需改进', emoji: '⚠️', color: '#ef4444' };
  }

  /**
   * 保存评分历史
   */
  saveScoreHistory(discussionId, scores) {
    if (!this.scoreHistory.has(discussionId)) {
      this.scoreHistory.set(discussionId, []);
    }
    const history = this.scoreHistory.get(discussionId);
    history.push(scores);
    
    // 保留最近 100 条记录
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * 获取评分历史
   */
  getScoreHistory(discussionId) {
    return this.scoreHistory.get(discussionId) || [];
  }

  /**
   * 获取评分趋势
   */
  getScoreTrend(discussionId) {
    const history = this.getScoreHistory(discussionId);
    if (history.length < 2) {
      return { trend: 'stable', change: 0 };
    }

    const latest = history[history.length - 1].total;
    const previous = history[history.length - 2].total;
    const change = latest - previous;

    let trend = 'stable';
    if (change > 0.05) trend = 'improving';
    else if (change < -0.05) trend = 'declining';

    return { trend, change };
  }

  /**
   * 获取评分统计
   */
  getScoreStatistics(discussionId) {
    const history = this.getScoreHistory(discussionId);
    if (history.length === 0) {
      return null;
    }

    const scores = history.map(h => h.total);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const latest = scores[scores.length - 1];

    return {
      average: Math.round(avg * 100) / 100,
      max: Math.round(max * 100) / 100,
      min: Math.round(min * 100) / 100,
      latest: Math.round(latest * 100) / 100,
      sampleSize: scores.length
    };
  }

  /**
   * 设置权重
   */
  setWeights(weights) {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * 获取权重
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * 清除评分历史
   */
  clearHistory(discussionId = null) {
    if (discussionId) {
      this.scoreHistory.delete(discussionId);
    } else {
      this.scoreHistory.clear();
    }
  }
}

/**
 * 实时评分反馈系统
 */
class RealtimeFeedback {
  constructor(qualityScorer) {
    this.qualityScorer = qualityScorer;
    this.listeners = new Map(); // <discussionId, Set<callback>>
    this.updateInterval = 5000; // 5秒更新一次
    this.timers = new Map();
  }

  /**
   * 启动实时评分
   */
  start(discussionId, callback) {
    if (!this.listeners.has(discussionId)) {
      this.listeners.set(discussionId, new Set());
    }
    this.listeners.get(discussionId).add(callback);

    // 启动定时器
    if (!this.timers.has(discussionId)) {
      const timer = setInterval(async () => {
        const scores = await this.qualityScorer.calculateScore(discussionId);
        this.notify(discussionId, scores);
      }, this.updateInterval);
      this.timers.set(discussionId, timer);
    }

    return () => this.stop(discussionId, callback);
  }

  /**
   * 停止实时评分
   */
  stop(discussionId, callback) {
    if (this.listeners.has(discussionId)) {
      this.listeners.get(discussionId).delete(callback);
      
      if (this.listeners.get(discussionId).size === 0) {
        this.listeners.delete(discussionId);
        
        if (this.timers.has(discussionId)) {
          clearInterval(this.timers.get(discussionId));
          this.timers.delete(discussionId);
        }
      }
    }
  }

  /**
   * 通知监听器
   */
  notify(discussionId, scores) {
    if (this.listeners.has(discussionId)) {
      this.listeners.get(discussionId).forEach(callback => {
        try {
          callback(scores);
        } catch (error) {
          console.error('[RealtimeFeedback] Callback error:', error);
        }
      });
    }
  }

  /**
   * 停止所有实时评分
   */
  stopAll() {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    this.listeners.clear();
  }
}

/**
 * 评分可视化工具
 */
class ScoreVisualizer {
  /**
   * 生成评分趋势图数据
   */
  generateTrendData(history) {
    if (!history || history.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = history.map(h => 
      new Date(h.timestamp).toLocaleTimeString()
    );

    const datasets = [
      {
        label: '总分',
        data: history.map(h => h.total),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: '参与度',
        data: history.map(h => h.dimensions.participation),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: '创新性',
        data: history.map(h => h.dimensions.innovation),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      },
      {
        label: '协作度',
        data: history.map(h => h.dimensions.collaboration),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4
      },
      {
        label: '完整性',
        data: history.map(h => h.dimensions.completeness),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }
    ];

    return { labels, datasets };
  }

  /**
   * 生成雷达图数据
   */
  generateRadarData(scores) {
    if (!scores || !scores.dimensions) {
      return { labels: [], datasets: [] };
    }

    const labels = ['参与度', '创新性', '协作度', '完整性'];
    const data = [
      scores.dimensions.participation,
      scores.dimensions.innovation,
      scores.dimensions.collaboration,
      scores.dimensions.completeness
    ];

    return {
      labels,
      datasets: [{
        label: '讨论质量',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3b82f6'
      }]
    };
  }

  /**
   * 生成等级分布数据
   */
  generateGradeDistribution(allScores) {
    const distribution = {
      '优秀': 0,
      '良好': 0,
      '一般': 0,
      '需改进': 0
    };

    allScores.forEach(score => {
      if (score >= 0.9) distribution['优秀']++;
      else if (score >= 0.75) distribution['良好']++;
      else if (score >= 0.6) distribution['一般']++;
      else distribution['需改进']++;
    });

    return {
      labels: Object.keys(distribution),
      data: Object.values(distribution),
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
    };
  }
}

module.exports = {
  QualityScorer,
  RealtimeFeedback,
  ScoreVisualizer
};
