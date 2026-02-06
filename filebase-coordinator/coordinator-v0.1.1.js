/**
 * MAD v0.1.1 - 协作式协调器
 *
 * 功能：
 * - 主协调器分析拆解话题
 * - @对应专家参与讨论
 * - 专家互相@协作
 * - 讨论收敛判断
 * - 主协调器总结
 */

const { MainCoordinator } = require('./main-coordinator.js');
const { ExpertAgent } = require('./expert-agent.js');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = '/home/otto/.openclaw/multi-agent-discuss';
const DISCUSSIONS_DIR = path.join(DATA_DIR, 'discussions');

/**
 * 协作式讨论引擎
 */
class CollaborativeEngine {
  constructor(tool = null) {
    this.tool = tool;
    this.coordinator = new MainCoordinator(tool);
    this.maxRounds = 5; // 最大讨论轮次
  }

  /**
   * 处理pending讨论
   */
  async processPendingDiscussions() {
    console.log('\n🚀 MAD v0.1.1 协作式协调器启动\n');

    // 获取pending讨论
    const pendingDiscussions = await this.getPendingDiscussions();

    if (pendingDiscussions.length === 0) {
      console.log('✅ 没有pending讨论\n');
      return { success: true, processed: 0 };
    }

    console.log(`📋 发现 ${pendingDiscussions.length} 个pending讨论\n`);

    // 处理每个讨论
    const results = [];
    for (const discussion of pendingDiscussions) {
      try {
        const result = await this.processDiscussion(discussion);
        results.push(result);
      } catch (error) {
        console.error(`\n❌ 处理讨论失败: ${discussion.id}`);
        console.error(`错误: ${error.message}`);
        await this.markAsFailed(discussion, error.message);
      }
    }

    // 汇总结果
    const successCount = results.filter(r => r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('📊 处理完成统计');
    console.log('='.repeat(60));
    console.log(`总讨论数: ${pendingDiscussions.length}`);
    console.log(`成功处理: ${successCount}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      processed: pendingDiscussions.length,
      successCount
    };
  }

  /**
   * 处理单个讨论（完整流程）
   */
  async processDiscussion(discussion) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 开始处理讨论: ${discussion.id}`);
    console.log(`📝 主题: ${discussion.topic}`);
    console.log(`${'='.repeat(60)}\n`);

    // 初始化讨论状态
    discussion.status = 'in_progress';
    discussion.phase = {
      current: 'analyzing',
      round: 1,
      maxRounds: this.maxRounds
    };
    discussion.participants = {
      coordinator: { role: '主协调器', joinedAt: Date.now() },
      experts: {}
    };
    await this.coordinator.saveDiscussion(discussion.id, discussion);

    // === 阶段1: 主协调器分析话题 ===
    console.log(`📍 阶段1: 主协调器分析话题...`);
    const analysis = await this.coordinator.analyzeTopic(discussion.topic);

    console.log(`  ✅ 核心问题: ${analysis.coreQuestions.length}个`);
    console.log(`  ✅ 需要专家: ${analysis.requiredExperts.join(', ')}`);

    discussion.analysis = analysis;
    discussion.phase.current = 'discussing';
    await this.coordinator.saveDiscussion(discussion.id, discussion);

    // === 阶段2: 主协调器@第一批专家 ===
    console.log(`\n📍 阶段2: 主协调器@专家...`);
    const mentionMessages = [];

    for (const expertId of analysis.requiredExperts) {
      const question = analysis.coreQuestions[0] || discussion.topic;
      const mentionMsg = await this.coordinator.mentionExpert(
        expertId,
        question,
        discussion.id
      );
      mentionMessages.push(mentionMsg);

      // 记录参与者
      discussion.participants.experts[expertId] = {
        mentioned: true,
        mentionedAt: Date.now(),
        responded: false
      };
    }

    await this.coordinator.saveDiscussion(discussion.id, discussion);

    // === 阶段3: 专家响应和协作 ===
    console.log(`\n📍 阶段3: 专家协作讨论...`);

    let round = 1;
    let hasNewMentions = true;

    while (round <= this.maxRounds && hasNewMentions) {
      console.log(`\n  🔄 第${round}轮讨论...`);

      // 获取所有未响应的@消息
      const pendingMentions = await this.getPendingMentions(discussion.id);

      if (pendingMentions.length === 0) {
        console.log(`  ✅ 没有@pending，讨论收敛`);
        hasNewMentions = false;
        break;
      }

      console.log(`  📨 待处理@: ${pendingMentions.length}条`);

      // 处理每个@
      const newMentions = [];
      for (const mention of pendingMentions) {
        const response = await this.handleMention(discussion, mention);

        // 如果专家@了其他专家，记录新的@消息
        if (response.mentions && response.mentions.length > 0) {
          for (const expertId of response.mentions) {
            const collabMention = await this.createCollaborationMention(
              discussion,
              response,
              expertId
            );
            newMentions.push(collabMention);

            // 记录新的专家参与者
            if (!discussion.participants.experts[expertId]) {
              discussion.participants.experts[expertId] = {
                mentioned: true,
                mentionedAt: Date.now(),
                responded: false
              };
            }
          }
        }
      }

      // 更新轮次
      discussion.phase.round = round + 1;
      await this.coordinator.saveDiscussion(discussion.id, discussion);

      // 检查是否有新的@
      hasNewMentions = newMentions.length > 0;
      round++;
    }

    // === 阶段4: 主协调器总结 ===
    console.log(`\n📍 阶段4: 主协调器生成总结...`);

    discussion.phase.current = 'concluding';

    // 读取所有消息
    const allMessages = await this.coordinator.readMessages?.(discussion.id) ||
                        await this.readMessages(discussion.id);

    // 生成总结
    const summary = await this.coordinator.generateSummary({
      topic: discussion.topic,
      messages: allMessages
    });

    discussion.summary = summary;
    discussion.status = 'completed';
    discussion.phase.current = 'completed';
    discussion.completedAt = Date.now();

    await this.coordinator.saveDiscussion(discussion.id, discussion);

    console.log(`\n✅ 讨论 ${discussion.id} 完成！`);
    console.log(`  📊 总轮次: ${round - 1}`);
    console.log(`  👥 参与专家: ${Object.keys(discussion.participants.experts).length}个`);

    return {
      success: true,
      discussionId: discussion.id,
      rounds: round - 1,
      expertsCount: Object.keys(discussion.participants.experts).length
    };
  }

  /**
   * 处理@消息
   */
  async handleMention(discussion, mentionMessage) {
    const expertId = mentionMessage.to;
    const expert = new ExpertAgent(expertId, this.tool);

    // 读取所有消息作为上下文
    const allMessages = await expert.readMessages(discussion.id);

    // 处理@并生成回复
    const response = await expert.handleMention(mentionMessage, discussion, allMessages);

    // 保存响应消息
    await expert.addMessage(discussion.id, response);

    // 更新讨论状态
    discussion = await expert.readDiscussion(discussion.id);
    if (discussion.participants.experts[expertId]) {
      discussion.participants.experts[expertId].responded = true;
      discussion.participants.experts[expertId].respondedAt = Date.now();
    }
    await expert.saveDiscussion(discussion.id, discussion);

    return response;
  }

  /**
   * 创建协作@消息
   */
  async createCollaborationMention(discussion, fromResponse, toExpertId) {
    const toExpert = require('./expert-agent.js').EXPERTS[toExpertId];

    const mention = {
      id: `msg-${Date.now()}-collab`,
      type: 'COLLABORATION',
      from: fromResponse.from,
      to: toExpertId,
      content: `@${toExpert.name} ${fromResponse.from}邀请你协助：${discussion.topic}`,
      mentions: [toExpertId],
      timestamp: Date.now(),
      metadata: {
        expertName: toExpert.name,
        triggeredBy: fromResponse.id,
        reason: fromResponse.metadata?.collaborationReason || '专家协作邀请'
      }
    };

    await this.coordinator.addMessage(discussion.id, mention);

    return mention;
  }

  /**
   * 获取pending@消息
   */
  async getPendingMentions(discussionId) {
    const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');

    try {
      const content = await fs.readFile(messagesFile, 'utf-8');
      const lines = content.trim().split('\n');

      return lines
        .map(line => JSON.parse(line))
        .filter(msg =>
          (msg.type === 'MENTION' || msg.type === 'COLLABORATION') &&
          !msg.metadata?.responded
        );
    } catch (error) {
      console.error(`获取消息失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取pending讨论
   */
  async getPendingDiscussions() {
    try {
      const entries = await fs.readdir(DISCUSSIONS_DIR, { withFileTypes: true });
      const pendingDiscussions = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const discussionFile = path.join(DISCUSSIONS_DIR, entry.name, 'discussion.json');
        try {
          const content = await fs.readFile(discussionFile, 'utf-8');
          const discussion = JSON.parse(content);

          if (discussion.status === 'pending') {
            pendingDiscussions.push(discussion);
          }
        } catch (error) {
          // 忽略无法读取的讨论
        }
      }

      return pendingDiscussions;
    } catch (error) {
      console.error(`获取pending讨论失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 标记讨论为失败
   */
  async markAsFailed(discussion, error) {
    discussion.status = 'failed';
    discussion.error = error;
    discussion.updatedAt = Date.now();

    const discussionFile = path.join(DISCUSSIONS_DIR, discussion.id, 'discussion.json');
    await fs.writeFile(discussionFile, JSON.stringify(discussion, null, 2), 'utf-8');
  }

  /**
   * 读取消息（兼容方法）
   */
  async readMessages(discussionId) {
    const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');

    try {
      const content = await fs.readFile(messagesFile, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      return [];
    }
  }
}

/**
 * 主函数
 */
async function main(tool) {
  const engine = new CollaborativeEngine(tool);
  return await engine.processPendingDiscussions();
}

module.exports = { main, CollaborativeEngine };
