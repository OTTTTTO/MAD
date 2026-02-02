/**
 * 趋势分析
 * 
 * 分析讨论数据的长期趋势和模式
 */

class TrendsAnalyzer {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
  }

  /**
   * 分析讨论趋势
   * @param {object} options - 分析选项
   */
  async analyzeTrends(options = {}) {
    const {
      timeRange = '30d', // 7d, 30d, 90d, 1y
      granularity = 'day', // hour, day, week, month
      includeProjections = true
    } = options;

    const cacheKey = `trends:${timeRange}:${granularity}`;
    
    // 检查缓存
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const discussions = this.getDiscussionsInRange(timeRange);
    
    const analysis = {
      timeRange,
      granularity,
      period: {
        start: this.getDateRange(timeRange).start,
        end: new Date()
      },
      metrics: this.calculateMetrics(discussions),
      timeline: this.buildTimeline(discussions, granularity),
      patterns: this.detectPatterns(discussions),
      projections: includeProjections ? this.generateProjections(discussions) : null
    };

    // 缓存结果
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: analysis
    });

    return analysis;
  }

  /**
   * 计算指标
   */
  calculateMetrics(discussions) {
    if (discussions.length === 0) {
      return {
        totalDiscussions: 0,
        totalMessages: 0,
        avgMessagesPerDiscussion: 0,
        avgDuration: 0,
        completionRate: 0
      };
    }

    const totalMessages = discussions.reduce((sum, d) => sum + (d.messages?.length || 0), 0);
    const completedDiscussions = discussions.filter(d => d.endedAt);
    const totalDuration = completedDiscussions.reduce((sum, d) => {
      return sum + (d.endedAt - d.createdAt);
    }, 0);

    return {
      totalDiscussions: discussions.length,
      totalMessages,
      avgMessagesPerDiscussion: totalMessages / discussions.length,
      avgDuration: completedDiscussions.length > 0 ? totalDuration / completedDiscussions.length : 0,
      completionRate: completedDiscussions.length / discussions.length,
      uniqueAgents: this.getUniqueAgents(discussions).length,
      mostActiveAgents: this.getMostActiveAgents(discussions, 5)
    };
  }

  /**
   * 构建时间线
   */
  buildTimeline(discussions, granularity) {
    const timeline = [];
    const grouped = this.groupByTime(discussions, granularity);

    for (const [period, items] of Object.entries(grouped)) {
      timeline.push({
        period,
        count: items.length,
        messages: items.reduce((sum, d) => sum + (d.messages?.length || 0), 0),
        avgDuration: this.calculateAvgDuration(items),
        agents: this.getUniqueAgents(items).length
      });
    }

    return timeline.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 检测模式
   */
  detectPatterns(discussions) {
    const patterns = {
      peakHours: this.findPeakHours(discussions),
      peakDays: this.findPeakDays(discussions),
      growthRate: this.calculateGrowthRate(discussions),
      seasonality: this.detectSeasonality(discussions),
      topics: this.analyzeTopicPatterns(discussions)
    };

    return patterns;
  }

  /**
   * 查找高峰时段
   */
  findPeakHours(discussions) {
    const hourCounts = new Array(24).fill(0);

    for (const d of discussions) {
      const hour = new Date(d.createdAt).getHours();
      hourCounts[hour]++;
    }

    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count, percentage: count / discussions.length }))
      .filter(item => item.count === maxCount)
      .map(item => ({ hour: item.hour, percentage: item.percentage }));

    return peakHours;
  }

  /**
   * 查找高峰日期
   */
  findPeakDays(discussions) {
    const dayCounts = new Array(7).fill(0);

    for (const d of discussions) {
      const day = new Date(d.createdAt).getDay();
      dayCounts[day]++;
    }

    const maxCount = Math.max(...dayCounts);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return dayCounts
      .map((count, day) => ({ day: dayNames[day], count, percentage: count / discussions.length }))
      .filter(item => item.count === maxCount);
  }

  /**
   * 计算增长率
   */
  calculateGrowthRate(discussions) {
    if (discussions.length < 2) return null;

    const sorted = [...discussions].sort((a, b) => a.createdAt - b.createdAt);
    const midPoint = Math.floor(sorted.length / 2);
    
    const firstHalf = sorted.slice(0, midPoint);
    const secondHalf = sorted.slice(midPoint);

    const firstPeriodDays = this.getDaysSpan(firstHalf);
    const secondPeriodDays = this.getDaysSpan(secondHalf);

    if (firstPeriodDays === 0 || secondPeriodDays === 0) return null;

    const firstRate = firstHalf.length / firstPeriodDays;
    const secondRate = secondHalf.length / secondPeriodDays;

    return {
      rate: ((secondRate - firstRate) / firstRate) * 100,
      firstPeriod: firstRate,
      secondPeriod: secondRate,
      trend: secondRate > firstRate ? 'increasing' : secondRate < firstRate ? 'decreasing' : 'stable'
    };
  }

  /**
   * 检测季节性
   */
  detectSeasonality(discussions) {
    // 按月份分组
    const monthlyCounts = {};
    
    for (const d of discussions) {
      const month = new Date(d.createdAt).toISOString().slice(0, 7);
      monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    }

    const months = Object.keys(monthlyCounts).sort();
    if (months.length < 2) return null;

    const values = months.map(m => monthlyCounts[m]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    // 检测是否存在明显的周期性
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const isSeasonal = variance > avg * 0.5; // 方差大于平均值的50%认为有季节性

    return {
      isSeasonal,
      monthlyDistribution: months.map(m => ({
        month: m,
        count: monthlyCounts[m],
        deviation: monthlyCounts[m] - avg
      }))
    };
  }

  /**
   * 分析主题模式
   */
  analyzeTopicPatterns(discussions) {
    const topics = discussions.map(d => d.topic || 'Untitled');
    const wordFreq = {};

    for (const topic of topics) {
      const words = topic.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }
    }

    const sortedWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      topKeywords: sortedWords,
      uniqueTopics: new Set(topics).size
    };
  }

  /**
   * 生成预测
   */
  generateProjections(discussions) {
    if (discussions.length < 7) return null;

    // 简单的线性回归预测
    const timeline = this.buildTimeline(discussions, 'day');
    if (timeline.length < 3) return null;

    // 使用最后7天的数据进行预测
    const recentData = timeline.slice(-7);
    const avgDaily = recentData.reduce((sum, d) => sum + d.count, 0) / recentData.length;

    // 计算趋势
    const trend = this.calculateLinearTrend(recentData.map(d => d.count));

    return {
      nextDay: {
        projected: Math.round(Math.max(0, avgDaily + trend.slope)),
        trend: trend.slope > 0 ? 'up' : trend.slope < 0 ? 'down' : 'stable'
      },
      nextWeek: {
        projected: Math.round(Math.max(0, avgDaily * 7 + trend.slope * 7))
      },
      confidence: this.calculateConfidence(recentData)
    };
  }

  /**
   * 计算线性趋势
   */
  calculateLinearTrend(values) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * 计算置信度
   */
  calculateConfidence(data) {
    const values = data.map(d => d.count);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，置信度越高
    const confidence = Math.max(0, Math.min(100, 100 - (stdDev / avg) * 50));
    
    return Math.round(confidence);
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
   * 按时间分组
   */
  groupByTime(discussions, granularity) {
    const groups = {};

    for (const d of discussions) {
      const date = new Date(d.createdAt);
      let key;

      switch (granularity) {
        case 'hour':
          key = date.toISOString().slice(0, 13) + ':00';
          break;
        case 'day':
          key = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          key = date.toISOString().slice(0, 7);
          break;
        default:
          key = date.toISOString().slice(0, 10);
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(d);
    }

    return groups;
  }

  /**
   * 计算平均持续时间
   */
  calculateAvgDuration(discussions) {
    const completed = discussions.filter(d => d.endedAt);
    if (completed.length === 0) return 0;

    const total = completed.reduce((sum, d) => sum + (d.endedAt - d.createdAt), 0);
    return total / completed.length;
  }

  /**
   * 获取唯一 Agent
   */
  getUniqueAgents(discussions) {
    const agents = new Set();
    
    for (const d of discussions) {
      for (const msg of d.messages || []) {
        agents.add(msg.agentName);
      }
    }

    return Array.from(agents);
  }

  /**
   * 获取最活跃的 Agents
   */
  getMostActiveAgents(discussions, limit = 5) {
    const agentCounts = {};

    for (const d of discussions) {
      for (const msg of d.messages || []) {
        agentCounts[msg.agentName] = (agentCounts[msg.agentName] || 0) + 1;
      }
    }

    return Object.entries(agentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  /**
   * 获取天数跨度
   */
  getDaysSpan(discussions) {
    if (discussions.length === 0) return 0;

    const sorted = [...discussions].sort((a, b) => a.createdAt - b.createdAt);
    const ms = sorted[sorted.length - 1].createdAt - sorted[0].createdAt;
    return Math.max(1, ms / (1000 * 60 * 60 * 24));
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { TrendsAnalyzer };
