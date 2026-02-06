/**
 * MAD v0.1.1 - 主协调器
 *
 * 功能：
 * - 分析和拆解用户话题
 * - 匹配相关专家
 * - @专家参与讨论
 * - 控制讨论流程
 * - 生成讨论总结
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = '/home/otto/.openclaw/multi-agent-discuss';
const DISCUSSIONS_DIR = path.join(DATA_DIR, 'discussions');

// 专家配置
const EXPERTS = {
  tech_expert: {
    id: 'tech_expert',
    name: '技术专家',
    keywords: ['技术', '架构', '开发', '实现', '系统', '平台', '框架'],
    topics: ['技术实现', '系统架构', '开发方案', '技术选型']
  },
  product_expert: {
    id: 'product_expert',
    name: '产品专家',
    keywords: ['产品', '用户', '需求', '体验', '功能', '设计', '界面'],
    topics: ['产品功能', '用户需求', '产品设计', '用户体验']
  },
  business_expert: {
    id: 'business_expert',
    name: '商业专家',
    keywords: ['商业', '成本', '收益', '市场', '竞争', '模式', '盈利'],
    topics: ['商业模式', '成本分析', '市场策略', '盈利模式']
  },
  ops_expert: {
    id: 'ops_expert',
    name: '运营专家',
    keywords: ['运营', '推广', '执行', '策略', '活动', '增长', '数据'],
    topics: ['运营策略', '执行方案', '增长策略', '数据运营']
  }
};

/**
 * 主协调器类
 */
class MainCoordinator {
  constructor(tool = null) {
    this.tool = tool; // LLM工具对象
  }

  /**
   * 分析话题并拆解
   */
  async analyzeTopic(topic) {
    console.log(`\n[主协调器] 正在分析话题: ${topic}`);

    if (!this.tool) {
      // Fallback: 简单关键词匹配
      return this.simpleAnalyze(topic);
    }

    try {
      // 使用LLM分析
      const prompt = `你是一个讨论协调器。请分析以下话题，并输出JSON格式结果：

话题：${topic}

请输出JSON格式（必须是有效的JSON）：
{
  "coreQuestions": ["核心问题1", "核心问题2", "核心问题3"],
  "requiredExperts": ["tech_expert", "product_expert"],
  "discussionPlan": [
    {"round": 1, "expert": "tech_expert", "question": "具体问题"},
    {"round": 1, "expert": "product_expert", "question": "具体问题"}
  ]
}

可选的专家ID: ${Object.keys(EXPERTS).join(', ')}`;

      const response = await this.tool.llm({
        messages: [
          { role: 'system', content: '你是一个专业的讨论协调器，擅长分析话题并组织专家讨论。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8
      });

      // 解析LLM响应
      const analysis = this.parseJSONResponse(response.content);

      console.log(`[主协调器] ✅ 分析完成`);
      console.log(`  核心问题: ${analysis.coreQuestions.length}个`);
      console.log(`  需要专家: ${analysis.requiredExperts.join(', ')}`);

      return analysis;

    } catch (error) {
      console.error(`[主协调器] ❌ LLM分析失败: ${error.message}`);
      return this.simpleAnalyze(topic);
    }
  }

  /**
   * 简单分析（Fallback）
   */
  simpleAnalyze(topic) {
    // 关键词匹配
    const matchedExperts = [];
    const coreQuestions = [`关于"${topic}"的问题`];

    for (const [id, expert] of Object.entries(EXPERTS)) {
      const match = expert.keywords.some(kw => topic.includes(kw));
      if (match) {
        matchedExperts.push(id);
      }
    }

    // 如果没有匹配到，默认使用技术专家
    if (matchedExperts.length === 0) {
      matchedExperts.push('tech_expert');
    }

    const discussionPlan = matchedExperts.map(expert => ({
      round: 1,
      expert,
      question: topic
    }));

    return {
      coreQuestions,
      requiredExperts: matchedExperts,
      discussionPlan
    };
  }

  /**
   * 解析JSON响应
   */
  parseJSONResponse(text) {
    // 尝试提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('[主协调器] JSON解析失败，使用默认值');
      }
    }

    // 返回默认值
    return {
      coreQuestions: ['请分析此话题'],
      requiredExperts: ['tech_expert'],
      discussionPlan: []
    };
  }

  /**
   * 创建@消息
   */
  async mentionExpert(expertId, question, discussionId) {
    const expert = EXPERTS[expertId];
    if (!expert) {
      throw new Error(`专家不存在: ${expertId}`);
    }

    const message = {
      id: `msg-${Date.now()}-mention`,
      type: 'MENTION',
      from: 'coordinator',
      to: expertId,
      content: `@${expert.name} 请回答：${question}`,
      mentions: [expertId],
      timestamp: Date.now(),
      metadata: {
        expertName: expert.name,
        question
      }
    };

    // 保存消息
    await this.addMessage(discussionId, message);

    console.log(`[主协调器] @${expert.name}: ${question}`);

    return message;
  }

  /**
   * 判断是否应该结束讨论
   */
  async shouldConclude(discussion) {
    const maxRounds = discussion.phase?.maxRounds || 5;
    const currentRound = discussion.phase?.round || 1;

    // 条件1：达到最大轮次
    if (currentRound >= maxRounds) {
      console.log(`[主协调器] 达到最大轮次(${maxRounds})，准备总结`);
      return true;
    }

    // 条件2：所有@都已响应
    const pendingMentions = discussion.messages.filter(m =>
      m.type === 'MENTION' && !m.metadata?.responded
    );

    if (pendingMentions.length === 0 && currentRound > 1) {
      console.log(`[主协调器] 所有@已响应，准备总结`);
      return true;
    }

    return false;
  }

  /**
   * 生成总结
   */
  async generateSummary(discussion) {
    console.log(`\n[主协调器] 正在生成讨论总结...`);

    // 收集所有专家观点
    const expertMessages = discussion.messages.filter(m =>
      m.type === 'EXPERT_RESPONSE'
    );

    if (expertMessages.length === 0) {
      return {
        content: '本次讨论尚未收到专家回复。',
        keyPoints: [],
        participants: []
      };
    }

    if (!this.tool) {
      // Fallback: 简单总结
      return this.simpleSummary(discussion, expertMessages);
    }

    try {
      // 构建上下文
      const context = expertMessages.map(m =>
        `【${m.metadata?.expertName || m.from}】\n${m.content}\n`
      ).join('\n');

      const prompt = `请总结以下多专家讨论，输出JSON格式：

话题：${discussion.topic}

讨论内容：
${context}

请输出JSON格式（必须是有效的JSON）：
{
  "content": "总结内容（3-5句话）",
  "keyPoints": ["关键点1", "关键点2", "关键点3"],
  "recommendations": ["建议1", "建议2"],
  "participants": ["技术专家", "产品专家"]
}`;

      const response = await this.tool.llm({
        messages: [
          { role: 'system', content: '你是一个专业的讨论总结员，擅长综合多方观点形成结构化结论。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5
      });

      const summary = this.parseJSONResponse(response.content);

      console.log(`[主协调器] ✅ 总结生成完成`);
      console.log(`  关键点: ${summary.keyPoints.length}个`);

      return summary;

    } catch (error) {
      console.error(`[主协调器] ❌ 总结生成失败: ${error.message}`);
      return this.simpleSummary(discussion, expertMessages);
    }
  }

  /**
   * 简单总结（Fallback）
   */
  simpleSummary(discussion, expertMessages) {
    const participants = [...new Set(expertMessages.map(m => m.metadata?.expertName || m.from))];
    const keyPoints = expertMessages.slice(0, 3).map(m => {
      const lines = m.content.split('\n').filter(l => l.trim());
      return lines[0]?.substring(0, 50) + '...';
    });

    return {
      content: `本次讨论邀请了${participants.join('、')}等专家参与。各位专家从不同角度提供了专业建议。`,
      keyPoints,
      recommendations: ['建议根据实际情况进一步细化方案'],
      participants
    };
  }

  /**
   * 添加消息到讨论
   */
  async addMessage(discussionId, message) {
    const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');
    const line = JSON.stringify(message) + '\n';
    await fs.appendFile(messagesFile, line, 'utf-8');
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
   * 保存讨论
   */
  async saveDiscussion(discussionId, discussion) {
    const discussionFile = path.join(DISCUSSIONS_DIR, discussionId, 'discussion.json');
    await fs.writeFile(discussionFile, JSON.stringify(discussion, null, 2), 'utf-8');
  }
}

module.exports = { MainCoordinator, EXPERTS };
