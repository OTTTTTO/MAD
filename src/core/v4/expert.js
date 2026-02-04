/**
 * 专家类 - 宽领域专家的智能@决策
 *
 * 功能：
 * 1. 宽领域专家定义（技术、产品、商业、运营）
 * 2. 置信度评估（关键词40% + 领域30% + 上下文30%）
 * 3. @决策逻辑
 *
 * @version 4.0.4
 */

class Expert {
  constructor(config = {}) {
    this.id = config.id || 'unknown';
    this.name = config.name || '未知专家';
    this.domain = config.domain || 'general';
    this.expertise = config.expertise || [];
    this.keywords = config.keywords || [];

    // 置信度阈值
    this.confidenceThreshold = {
      high: config.highThreshold || 0.8,
      low: config.lowThreshold || 0.5
    };
  }

  /**
   * 评估问题置信度
   * @param {Object} question - 问题对象
   * @returns {number} 置信度（0-1）
   */
  evaluateConfidence(question) {
    let confidence = 0;

    // 1. 关键词匹配（40%权重）
    const keywordScore = this.matchKeywords(question.content || '');
    confidence += keywordScore * 0.4;

    // 2. 领域相关性（30%权重）
    const domainScore = this.matchDomain(question.content || '');
    confidence += domainScore * 0.3;

    // 3. 上下文理解（30%权重）
    const contextScore = this.understandContext(question);
    confidence += contextScore * 0.3;

    return Math.min(confidence, 1.0);
  }

  /**
   * 关键词匹配
   * @param {string} content - 问题内容
   * @returns {number} 匹配分数（0-1）
   */
  matchKeywords(content) {
    if (!this.keywords || this.keywords.length === 0) {
      return 0.5;
    }

    const lowerContent = content.toLowerCase();
    let matchCount = 0;

    for (const keyword of this.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    return matchCount / this.keywords.length;
  }

  /**
   * 领域相关性匹配
   * @param {string} content - 问题内容
   * @returns {number} 相关性分数（0-1）
   */
  matchDomain(content) {
    const domainKeywords = {
      technical: ['技术', '架构', '性能', '安全', '开发', '系统', '接口', '数据库', '服务器'],
      product: ['产品', '用户', '体验', '功能', '需求', '交互', '设计', '界面'],
      business: ['商业', '市场', '盈利', '成本', '投资', '竞争', '模式', '定价'],
      operations: ['运营', '增长', '营销', '推广', '数据', '客户', '渠道', '活动']
    };

    const keywords = domainKeywords[this.domain] || [];
    const lowerContent = content.toLowerCase();

    let matchCount = 0;
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        matchCount++;
      }
    }

    return Math.min(matchCount / 3, 1.0);
  }

  /**
   * 理解上下文
   * @param {Object} question - 问题对象
   * @returns {number} 上下文理解分数（0-1）
   */
  understandContext(question) {
    if (!question.history || question.history.length === 0) {
      return 0.5;
    }

    const recentHistory = question.history.slice(-5);
    let relevantCount = 0;

    for (const msg of recentHistory) {
      if (msg.content && this.matchKeywords(msg.content) > 0.3) {
        relevantCount++;
      }
    }

    return relevantCount / recentHistory.length;
  }

  /**
   * 决定是否回答问题
   * @param {Object} question - 问题对象
   * @returns {Object} 决策结果
   */
  decideResponse(question) {
    const confidence = this.evaluateConfidence(question);

    if (confidence >= this.confidenceThreshold.high) {
      return {
        shouldAnswer: true,
        confidence,
        strategy: 'DIRECT',
        message: `【${this.name}】我有信心直接回答这个问题（置信度：${confidence.toFixed(2)}）`
      };
    } else if (confidence >= this.confidenceThreshold.low) {
      return {
        shouldAnswer: true,
        confidence,
        strategy: 'ANSWER_WITH_MENTION',
        message: `【${this.name}】我可以回答，但建议@其他专家补充（置信度：${confidence.toFixed(2)}）`
      };
    } else {
      return {
        shouldAnswer: false,
        confidence,
        strategy: 'REDIRECT',
        message: `【${this.name}】这个问题超出我的专业领域，建议@其他专家（置信度：${confidence.toFixed(2)}）`
      };
    }
  }

  /**
   * 获取专家信息
   * @returns {Object} 专家信息
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      domain: this.domain,
      expertise: this.expertise,
      keywords: this.keywords,
      confidenceThreshold: this.confidenceThreshold
    };
  }
}

/**
 * 创建专家实例
 * @param {string} domain - 领域类型
 * @returns {Expert} 专家实例
 */
function createExpert(domain) {
  const definitions = {
    technical: {
      id: 'technical',
      name: '技术专家',
      domain: 'technical',
      expertise: ['技术架构', '性能优化', '安全防护', '技术可行性'],
      keywords: ['技术', '架构', '性能', '安全', '开发', '系统']
    },
    product: {
      id: 'product',
      name: '产品专家',
      domain: 'product',
      expertise: ['用户需求', '产品设计', '用户体验', '功能规划'],
      keywords: ['产品', '用户', '体验', '功能', '需求', '交互']
    },
    business: {
      id: 'business',
      name: '商业专家',
      domain: 'business',
      expertise: ['商业模式', '市场分析', '竞争策略', '盈利模式'],
      keywords: ['商业', '市场', '盈利', '成本', '投资', '竞争']
    },
    operations: {
      id: 'operations',
      name: '运营专家',
      domain: 'operations',
      expertise: ['运营策略', '用户增长', '数据分析', '营销推广'],
      keywords: ['运营', '增长', '营销', '推广', '数据', '客户']
    }
  };

  const def = definitions[domain];
  return def ? new Expert(def) : null;
}

module.exports = Expert;
module.exports.createExpert = createExpert;
