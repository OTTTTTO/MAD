/**
 * 专家类 - 宽领域专家的智能@决策 + 真实LLM调用
 *
 * 功能：
 * 1. 宽领域专家定义（技术、产品、商业、运营）
 * 2. 置信度评估（关键词40% + 领域30% + 上下文30%）
 * 3. @决策逻辑
 * 4. 真实LLM调用（v4.0.8新增）
 *
 * @version 4.0.8
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
   * 使用LLM生成专家意见（v4.0.8新增）
   * @param {Object} question - 问题对象
   * @param {Object} tool - OpenClaw工具注入
   * @returns {Object} 响应结果
   */
  async respondWithLLM(question, tool) {
    if (!tool || !tool.sessions_spawn) {
      throw new Error('tool.sessions_spawn 不可用，无法调用LLM');
    }

    console.log(`[${this.name}] 正在调用LLM分析...`);

    // 构建专家system prompt
    const systemPrompt = this.buildSystemPrompt();

    // 构建完整的问题
    const fullQuestion = `${systemPrompt}\n\n请分析以下问题：\n\n${question.content}`;

    // 使用sessions_spawn创建专家sub-agent
    const result = await tool.sessions_spawn({
      task: fullQuestion,
      label: `MAD-${this.name}`,
      runTimeoutSeconds: 180, // 3分钟超时
      cleanup: 'keep' // 保留会话用于debug
    });

    if (result.status !== 'accepted') {
      throw new Error(`Spawn ${this.name} 失败: ${result.error || '未知错误'}`);
    }

    console.log(`[${this.name}] LLM任务已提交 (Run ID: ${result.runId})`);

    // 返回pending状态，稍后获取结果
    return {
      expert: this.name,
      domain: this.domain,
      runId: result.runId,
      childSessionKey: result.childSessionKey,
      status: 'pending',
      timestamp: Date.now()
    };
  }

  /**
   * 等待LLM响应并获取结果
   * @param {string} runId - 任务ID
   * @param {Object} tool - OpenClaw工具注入
   * @returns {string} LLM生成的响应
   */
  async waitForLLMResponse(runId, tool) {
    if (!tool || !tool.sessions_history) {
      throw new Error('tool.sessions_history 不可用');
    }

    // 等待一段时间让LLM生成
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 获取历史记录
    const history = await tool.sessions_history({
      sessionKey: `agent:pm-dev:subagent:${runId}`,
      limit: 20
    });

    if (!history.messages || history.messages.length === 0) {
      return '(专家正在思考中...)';
    }

    // 获取最后一条assistant消息
    const lastAssistantMessage = history.messages
      .filter(m => m.role === 'assistant')
      .pop();

    return lastAssistantMessage?.content || '(无响应)';
  }

  /**
   * 构建专家的system prompt
   * @returns {string} System prompt
   */
  buildSystemPrompt() {
    const prompts = {
      technical: `你是一位资深技术专家，拥有20年以上的软件开发经验。

核心职责：
- 评估技术可行性和技术选型
- 识别技术风险和安全问题
- 分析性能瓶颈和优化空间
- 给出具体的技术实施建议

回答格式：
1. 技术判断：[你的技术可行性评估]
2. 详细分析：[架构、技术点、风险]
3. 实施建议：[具体可执行方案]
4. 其他专家：[如需其他专家配合请说明]

请专业、简洁、直奔主题。`,

      product: `你是一位资深产品专家，拥有10年以上的产品设计经验。

核心职责：
- 分析目标用户和使用场景
- 挖掘核心需求和痛点
- 设计产品功能和交互流程
- 评估用户体验和优先级

回答格式：
1. 用户分析：[目标用户、使用场景]
2. 需求分析：[核心需求、痛点]
3. 产品设计：[功能描述、交互流程]
4. 其他专家：[如需其他专家配合请说明]

请从用户视角思考，用用户故事描述问题。`,

      business: `你是一位资深商业专家，拥有丰富的创业和商业管理经验。

核心职责：
- 设计商业模式和盈利模式
- 评估市场规模和潜力
- 分析竞争格局和差异化策略
- 规划商业化路径

回答格式：
1. 商业模式：[价值主张、盈利方式]
2. 市场分析：[规模、竞争、趋势]
3. 商业路径：[从0到1的步骤]
4. 其他专家：[如需其他专家配合请说明]

请用数据支撑你的观点，关注可持续性。`,

      operations: `你是一位资深运营专家，拥有丰富的用户增长和运营管理经验。

核心职责：
- 制定用户增长策略
- 规划运营活动和内容
- 分析运营数据和指标
- 优化获客和留存

回答格式：
1. 增长目标：[关键指标、用户路径]
2. 运营策略：[获客、激活、留存]
3. 具体方案：[活动、渠道、内容]
4. 其他专家：[如需其他专家配合请说明]

请数据驱动，给出可执行的具体方案。`
    };

    return prompts[this.domain] || `你是一位${this.name}。`;
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
