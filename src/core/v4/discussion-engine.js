/**
 * 专家讨论引擎 - 驱动专家讨论流程
 *
 * 功能：
 * 1. 整合所有模块
 * 2. 专家并行讨论
 * 3. @流转机制
 * 4. 监控与介入
 *
 * @version 4.0.6
 */

const MainCoordinator = require('./main-coordinator');
const Expert = require('./expert');
const MentionTracker = require('./mention-tracker');
const DiscussionMonitor = require('./discussion-monitor');

class DiscussionEngine {
  constructor(config = {}) {
    this.config = config;

    // 初始化组件
    this.coordinator = new MainCoordinator(config);
    this.mentionTracker = new MentionTracker(config.mentionTracker);
    this.monitor = new DiscussionMonitor(config.monitor);
  }

  /**
   * 启动讨论（主入口）
   * @param {Object} topic - 话题对象
   * @returns {Object} 讨论结果
   */
  async startDiscussion(topic) {
    console.log(`[DiscussionEngine] 启动讨论: ${topic.content || topic.description}`);

    // 初始化讨论
    const discussion = {
      topic: topic,
      messages: [],
      metadata: {
        startTime: Date.now(),
        hasNewInsights: false
      }
    };

    try {
      // 阶段1：主协调员拆解话题
      console.log('\n[阶段1] 拆解话题...');
      const decomposition = await this.coordinator.processTopic(topic);

      if (!decomposition.success) {
        throw new Error(decomposition.error);
      }

      console.log(`识别的领域: ${decomposition.domains.join(', ')}`);
      console.log(`匹配的专家: ${decomposition.experts.map(e => e.expertName).join(', ')}`);

      // 阶段2：并行专家发言
      console.log('\n[阶段2] 并行专家发言...');
      await this.parallelExpertSpeak(discussion, decomposition);

      // 阶段3：专家协作（@流转）
      console.log('\n[阶段3] 专家协作...');
      await this.collaborativeDiscussion(discussion, decomposition);

      // 阶段4：汇总结果
      console.log('\n[阶段4] 汇总结果...');
      const summary = this.generateSummary(discussion);

      return {
        success: true,
        discussion,
        summary
      };

    } catch (error) {
      console.error('[DiscussionEngine] 讨论失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 并行专家发言（v4.0.8：集成真实LLM）
   * @param {Object} discussion - 讨论对象
   * @param {Object} decomposition - 拆解结果
   */
  async parallelExpertSpeak(discussion, decomposition) {
    const { experts } = decomposition;
    const tool = this.config.tool; // OpenClaw工具注入

    if (!tool || !tool.sessions_spawn) {
      throw new Error('tool.sessions_spawn 不可用，无法启动LLM专家');
    }

    console.log('[消息] 开始并行LLM专家调用...');

    // 并行处理所有专家的第一次发言（使用LLM）
    const llmTasks = experts.map(async (assignment) => {
      const expert = Expert.createExpert(assignment.domain);
      if (!expert) return null;

      // 取第一个问题
      const question = {
        content: assignment.questions[0],
        context: discussion.topic,
        history: []
      };

      console.log(`[消息] ${assignment.expertName}: 调用LLM...`);

      // 使用LLM生成专家意见
      try {
        const llmResponse = await expert.respondWithLLM(question, tool);

        return {
          expertId: assignment.expertId,
          expertName: assignment.expertName,
          domain: assignment.domain,
          llmResponse: llmResponse,
          question: question.content
        };
      } catch (error) {
        console.error(`[错误] ${assignment.expertName} LLM调用失败:`, error.message);
        return {
          expertId: assignment.expertId,
          expertName: assignment.expertName,
          domain: assignment.domain,
          error: error.message,
          question: question.content
        };
      }
    });

    // 等待所有LLM调用完成
    const responses = await Promise.all(llmTasks);

    // 记录所有发言（先记录pending状态）
    for (const response of responses) {
      if (!response) continue;

      if (response.error) {
        // LLM调用失败
        this.addMessage(discussion, {
          type: 'EXPERT_ERROR',
          expert: response.expertId,
          expertName: response.expertName,
          domain: response.domain,
          content: `LLM调用失败: ${response.error}`,
          question: response.question
        });
      } else {
        // LLM调用成功，先记录pending
        this.addMessage(discussion, {
          type: 'EXPERT_THINKING',
          expert: response.expertId,
          expertName: response.expertName,
          domain: response.domain,
          content: '(专家正在思考中...)',
          runId: response.llmResponse.runId,
          childSessionKey: response.llmResponse.childSessionKey,
          question: response.question,
          status: 'pending'
        });
      }
    }

    // 等待LLM生成完成并更新消息
    console.log('\n[等待] 等待LLM生成内容...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 等待5秒

    for (let i = 0; i < discussion.messages.length; i++) {
      const msg = discussion.messages[i];
      if (msg.type === 'EXPERT_THINKING' && msg.status === 'pending') {
        try {
          const expert = Expert.createExpert(msg.domain);
          const realResponse = await expert.waitForLLMResponse(msg.runId, tool);

          // 更新消息内容
          msg.type = 'EXPERT_RESPONSE';
          msg.content = realResponse;
          msg.status = 'completed';
          msg.llmGenerated = true;

          console.log(`[完成] ${msg.expertName}: LLM响应已接收`);
        } catch (error) {
          msg.type = 'EXPERT_ERROR';
          msg.content = `获取LLM响应失败: ${error.message}`;
          msg.status = 'failed';
        }
      }
    }
  }

  /**
   * 专家协作（@流转）
   * @param {Object} discussion - 讨论对象
   * @param {Object} decomposition - 拆解结果
   */
  async collaborativeDiscussion(discussion, decomposition) {
    const maxRounds = 5;
    let round = 0;

    while (round < maxRounds) {
      round++;

      // 检查是否需要介入
      const intervention = this.monitor.checkIntervention(discussion);
      if (intervention.intervene) {
        console.log(`\n[主协调员介入] ${intervention.reason}: ${intervention.message}`);
        this.addMessage(discussion, {
          type: 'COORDINATOR_INTERVENTION',
          role: '主协调员',
          content: intervention.message,
          reason: intervention.reason
        });
        break;
      }

      // 查找需要@的消息
      const mentionsToProcess = this.findMentions(discussion);
      if (mentionsToProcess.length === 0) {
        console.log('\n[协作结束] 没有@待处理');
        break;
      }

      // 处理@
      await this.processMentions(discussion, mentionsToProcess, decomposition);
    }

    console.log(`\n[协作完成] 进行了${round}轮`);
  }

  /**
   * 查找需要@的消息
   * @param {Object} discussion - 讨论对象
   * @returns {Array} 需要@的消息列表
   */
  findMentions(discussion) {
    return discussion.messages.filter(msg =>
      !msg.processed && msg.strategy === 'ANSWER_WITH_MENTION'
    );
  }

  /**
   * 处理@流转
   * @param {Object} discussion - 讨论对象
   * @param {Array} mentions - 需要处理的消息
   * @param {Object} decomposition - 拆解结果
   */
  async processMentions(discussion, mentions, decomposition) {
    for (const mentionMsg of mentions) {
      console.log(`\n[处理@] ${mentionMsg.expertName} 建议咨询其他专家`);

      // 识别需要@的领域
      const domainsToMention = this.identifyDomainsToMention(mentionMsg, decomposition);

      for (const domain of domainsToMention) {
        // 检查是否允许@
        const canMention = this.mentionTracker.canMention(
          mentionMsg.expert,
          domain,
          '需要补充意见'
        );

        if (!canMention.allowed) {
          console.log(`[@被阻止] ${canMention.message}`);
          continue;
        }

        // 创建被@的专家
        const mentionedExpert = Expert.createExpert(domain);
        if (!mentionedExpert) continue;

        // 被@的专家回答
        const question = {
          content: `针对"${mentionMsg.content}"，请从你的专业角度补充意见`,
          context: discussion.topic,
          history: discussion.messages
        };

        const decision = mentionedExpert.decideResponse(question);

        this.addMessage(discussion, {
          type: 'EXPERT_RESPONSE',
          expert: domain,
          expertName: mentionedExpert.name,
          domain: domain,
          content: decision.message,
          strategy: decision.strategy,
          confidence: decision.confidence,
          triggeredBy: mentionMsg.expert
        });

        // 记录@
        this.mentionTracker.recordMention(mentionMsg.expert, domain, '需要补充意见');
      }

      // 标记为已处理
      mentionMsg.processed = true;
    }
  }

  /**
   * 识别需要@的领域
   * @param {Object} message - 消息对象
   * @param {Object} decomposition - 拆解结果
   * @returns {Array} 领域列表
   */
  identifyDomainsToMention(message, decomposition) {
    const currentDomain = message.domain;
    const allDomains = decomposition.domains;

    // 返回除了当前领域之外的所有领域
    return allDomains.filter(d => d !== currentDomain);
  }

  /**
   * 生成讨论总结
   * @param {Object} discussion - 讨论对象
   * @returns {Object} 总结
   */
  generateSummary(discussion) {
    const messages = discussion.messages;

    // 统计
    const stats = {
      totalMessages: messages.length,
      expertParticipation: {},
      strategyDistribution: {},
      duration: Date.now() - discussion.metadata.startTime
    };

    messages.forEach(msg => {
      if (msg.expert) {
        stats.expertParticipation[msg.expert] = (stats.expertParticipation[msg.expert] || 0) + 1;
      }
      if (msg.strategy) {
        stats.strategyDistribution[msg.strategy] = (stats.strategyDistribution[msg.strategy] || 0) + 1;
      }
    });

    return {
      topic: discussion.topic.content || discussion.topic.description,
      duration: Math.round(stats.duration / 1000) + '秒',
      messages: stats.totalMessages,
      experts: stats.expertParticipation,
      strategies: stats.strategyDistribution
    };
  }

  /**
   * 添加消息到讨论
   * @param {Object} discussion - 讨论对象
   * @param {Object} message - 消息对象
   */
  addMessage(discussion, message) {
    discussion.messages.push({
      ...message,
      timestamp: Date.now()
    });

    console.log(`[消息] ${message.expertName || message.role}: ${message.strategy || message.type}`);
  }

  /**
   * 获取引擎状态
   * @returns {Object} 状态
   */
  getStatus() {
    return {
      coordinator: this.coordinator.getStatus(),
      mentionTracker: this.mentionTracker.getStatus(),
      monitor: this.monitor.getStats()
    };
  }
}

module.exports = DiscussionEngine;
