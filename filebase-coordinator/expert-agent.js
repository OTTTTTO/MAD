/**
 * MAD v0.1.1 - 专家Agent
 *
 * 功能：
 * - 处理@消息
 * - 生成专家观点
 * - 判断是否需要其他专家协助
 * - @其他专家
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = '/home/otto/.openclaw/multi-agent-discuss';
const DISCUSSIONS_DIR = path.join(DATA_DIR, 'discussions');

// 专家配置（与main-coordinator.js保持一致）
const EXPERTS = {
  tech_expert: {
    id: 'tech_expert',
    name: '技术专家',
    keywords: ['技术', '架构', '开发', '实现', '系统', '平台', '框架', '性能'],
    topics: ['技术实现', '系统架构', '开发方案', '技术选型'],
    collaborate_with: ['product_expert', 'ops_expert'], // 可能需要协作的专家
    prompt: `你是一位技术架构专家。请从技术角度分析讨论主题，包括：
1. 技术可行性
2. 架构设计建议
3. 技术选型
4. 潜在技术风险
5. 实现建议

请用专业但易懂的语言表达，提供具体的技术方案。`
  },
  product_expert: {
    id: 'product_expert',
    name: '产品专家',
    keywords: ['产品', '用户', '需求', '体验', '功能', '设计', '界面', '流程'],
    topics: ['产品功能', '用户需求', '产品设计', '用户体验'],
    collaborate_with: ['tech_expert', 'business_expert'],
    prompt: `你是一位产品经理。请从产品角度分析讨论主题，包括：
1. 用户价值
2. 产品功能设计
3. 用户体验优化
4. 产品差异化
5. 需求优先级

请以用户为中心，提供清晰的产品建议。`
  },
  business_expert: {
    id: 'business_expert',
    name: '商业专家',
    keywords: ['商业', '成本', '收益', '市场', '竞争', '模式', '盈利', 'ROI'],
    topics: ['商业模式', '成本分析', '市场策略', '盈利模式'],
    collaborate_with: ['product_expert', 'ops_expert'],
    prompt: `你是一位商业顾问。请从商业角度分析讨论主题，包括：
1. 商业模式
2. 成本效益分析
3. 市场竞争力
4. 盈利前景
5. 风险评估

请提供务实的商业建议和数据分析。`
  },
  ops_expert: {
    id: 'ops_expert',
    name: '运营专家',
    keywords: ['运营', '推广', '执行', '策略', '活动', '增长', '数据', '渠道'],
    topics: ['运营策略', '执行方案', '增长策略', '数据运营'],
    collaborate_with: ['business_expert', 'tech_expert'],
    prompt: `你是一位运营专家。请从运营角度分析讨论主题，包括：
1. 执行策略
2. 资源需求
3. 时间规划
4. 团队协作
5. 效果评估

请提供可落地的执行方案。`
  }
};

/**
 * 专家Agent类
 */
class ExpertAgent {
  constructor(expertId, tool = null) {
    this.expert = EXPERTS[expertId];
    this.tool = tool;

    if (!this.expert) {
      throw new Error(`未找到专家: ${expertId}`);
    }
  }

  /**
   * 处理@消息
   */
  async handleMention(mentionMessage, discussion, allMessages) {
    console.log(`\n[${this.expert.name}] 收到@: ${mentionMessage.content}`);

    // 构建上下文
    const context = this.buildContext(discussion, allMessages);

    // 生成回答
    const answer = await this.generateAnswer(mentionMessage.content, context);

    // 判断是否需要协作
    const collaboration = await this.assessCollaboration(mentionMessage.content, answer);

    // 创建响应消息
    const responseMessage = {
      id: `msg-${Date.now()}-${this.expert.id}`,
      type: 'EXPERT_RESPONSE',
      from: this.expert.id,
      to: mentionMessage.from,
      content: answer,
      mentions: collaboration.needs || [],
      timestamp: Date.now(),
      metadata: {
        expertName: this.expert.name,
        respondingTo: mentionMessage.id,
        confidence: collaboration.confidence,
        needsCollaboration: collaboration.needs.length > 0,
        collaborationReason: collaboration.reason
      }
    };

    // 标记@消息已响应
    mentionMessage.metadata.responded = true;
    mentionMessage.metadata.respondedBy = this.expert.id;
    mentionMessage.metadata.respondedAt = Date.now();

    console.log(`[${this.expert.name}] ✅ 回复生成完成`);
    if (collaboration.needs.length > 0) {
      console.log(`[${this.expert.name}] 🤝 需要@协作: ${collaboration.needs.join(', ')}`);
    }

    return responseMessage;
  }

  /**
   * 构建上下文
   */
  buildContext(discussion, allMessages) {
    const context = {
      topic: discussion.topic,
      previousMessages: allMessages
        .filter(m => m.type === 'EXPERT_RESPONSE' || m.type === 'MENTION')
        .slice(-5) // 只取最近5条
        .map(m => ({
          from: EXPERTS[m.from]?.name || m.from,
          content: m.content.substring(0, 200) + '...'
        }))
    };

    return context;
  }

  /**
   * 生成回答
   */
  async generateAnswer(question, context) {
    if (!this.tool) {
      // Fallback: 简单回答
      return this.simpleAnswer(question);
    }

    try {
      // 构建上下文字符串
      const contextStr = context.previousMessages.length > 0
        ? `\n之前的讨论：\n${context.previousMessages.map(m =>
            `【${m.from}】${m.content}`
          ).join('\n\n')}`
        : '';

      const prompt = `你是${this.expert.name}。请回答以下问题：

话题背景：${context.topic}${contextStr}

@你的问题：${question}

请以${this.expert.name}的身份，从你的专业角度提供详细的分析和建议。`;

      const response = await this.tool.llm({
        messages: [
          { role: 'system', content: this.expert.prompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      });

      return response.content;

    } catch (error) {
      console.error(`[${this.expert.name}] ❌ LLM调用失败: ${error.message}`);
      return this.simpleAnswer(question);
    }
  }

  /**
   * 简单回答（Fallback）
   */
  simpleAnswer(question) {
    return `【${this.expert.name}回复】

关于"${question}"的问题，从${this.expert.topics[0]}角度，我的建议如下：

1. **核心要点**：需要深入分析具体需求和场景
2. **关键因素**：考虑可行性、成本和效果
3. **建议方案**：建议先明确目标，再制定执行计划

（注：当前为预设回复，需配置LLM以获取真实专家观点）`;
  }

  /**
   * 评估是否需要协作
   */
  async assessCollaboration(question, myAnswer) {
    if (!this.tool) {
      // Fallback: 简单关键词匹配
      return this.simpleAssess(question);
    }

    try {
      const prompt = `你是${this.expert.name}。请评估你的回答是否需要其他专家的协助。

你的问题：${question}

你的回答：${myAnswer.substring(0, 500)}...

可选协作专家：
- 技术专家 (tech_expert)：技术架构、实现方案
- 产品专家 (product_expert)：产品功能、用户体验
- 商业专家 (business_expert)：商业模式、成本分析
- 运营专家 (ops_expert)：运营策略、执行方案

请输出JSON格式（必须是有效的JSON）：
{
  "needs": ["tech_expert"],
  "reason": "需要技术专家确认可行性",
  "confidence": 0.7
}

如果不需要协作，返回: {"needs": [], "reason": "可以独立回答", "confidence": 0.9}`;

      const response = await this.tool.llm({
        messages: [
          { role: 'system', content: '你是一个专业的协作评估员。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
      });

      const result = this.parseJSONResponse(response.content);

      // 过滤：只能@预定义的协作专家
      if (result.needs) {
        result.needs = result.needs.filter(id =>
          this.expert.collaborate_with.includes(id)
        );
      }

      return result;

    } catch (error) {
      console.error(`[${this.expert.name}] ❌ 协作评估失败: ${error.message}`);
      return this.simpleAssess(question);
    }
  }

  /**
   * 简单协作评估（Fallback）
   */
  simpleAssess(question) {
    // 关键词匹配判断
    const needs = [];

    for (const [expertId, expert] of Object.entries(EXPERTS)) {
      // 跳过自己
      if (expertId === this.expert.id) continue;

      // 只检查可协作的专家
      if (!this.expert.collaborate_with.includes(expertId)) continue;

      // 检查关键词
      const hasKeyword = expert.keywords.some(kw => question.includes(kw));
      if (hasKeyword) {
        needs.push(expertId);
      }
    }

    const confidence = needs.length > 0 ? 0.6 : 0.9;
    const reason = needs.length > 0
      ? `问题涉及${EXPERTS[needs[0]].name}领域，建议协作`
      : '可以独立回答';

    return { needs, reason, confidence };
  }

  /**
   * 解析JSON响应
   */
  parseJSONResponse(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn(`[${this.expert.name}] JSON解析失败`);
      }
    }

    return { needs: [], reason: '解析失败', confidence: 0.5 };
  }

  /**
   * 读取讨论
   */
  async readDiscussion(discussionId) {
    const discussionFile = path.join(DISCUSSIONS_DIR, discussionId, 'discussion.json');
    const content = await fs.readFile(discussionFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 读取讨论消息
   */
  async readMessages(discussionId) {
    const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');

    try {
      const content = await fs.readFile(messagesFile, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      console.error(`读取消息失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 添加消息
   */
  async addMessage(discussionId, message) {
    const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');
    const line = JSON.stringify(message) + '\n';
    await fs.appendFile(messagesFile, line, 'utf-8');
  }

  /**
   * 保存讨论
   */
  async saveDiscussion(discussionId, discussion) {
    const discussionFile = path.join(DISCUSSIONS_DIR, discussionId, 'discussion.json');
    await fs.writeFile(discussionFile, JSON.stringify(discussion, null, 2), 'utf-8');
  }
}

module.exports = { ExpertAgent, EXPERTS };
