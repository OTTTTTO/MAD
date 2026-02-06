/**
 * MAD FileBase Coordinator Skill
 *
 * 功能：
 * - 轮询pending讨论
 * - 调用LLM生成多专家观点
 * - 保存消息到文件
 * - 更新讨论状态
 */

const fs = require('fs').promises;
const path = require('path');

// 数据目录配置
const DATA_DIR = '/home/otto/.openclaw/multi-agent-discuss';
const DISCUSSIONS_DIR = path.join(DATA_DIR, 'discussions');

// 专家配置
const EXPERTS = {
  tech_expert: {
    name: '技术专家',
    role: 'tech_expert',
    prompt: `你是一位技术架构专家。请从技术角度分析讨论主题，包括：
1. 技术可行性
2. 架构设计建议
3. 技术选型
4. 潜在技术风险
5. 实现建议

请用专业但易懂的语言表达，提供具体的技术方案。`
  },
  product_expert: {
    name: '产品专家',
    role: 'product_expert',
    prompt: `你是一位产品经理。请从产品角度分析讨论主题，包括：
1. 用户价值
2. 产品功能设计
3. 用户体验优化
4. 产品差异化
5. 需求优先级

请以用户为中心，提供清晰的产品建议。`
  },
  business_expert: {
    name: '商业专家',
    role: 'business_expert',
    prompt: `你是一位商业顾问。请从商业角度分析讨论主题，包括：
1. 商业模式
2. 成本效益分析
3. 市场竞争力
4. 盈利前景
5. 风险评估

请提供务实的商业建议和数据分析。`
  },
  ops_expert: {
    name: '运营专家',
    role: 'ops_expert',
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
 * 读取讨论数据
 */
async function readDiscussion(discussionId) {
  const discussionFile = path.join(DISCUSSIONS_DIR, discussionId, 'discussion.json');

  try {
    const content = await fs.readFile(discussionFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取讨论失败: ${error.message}`);
    return null;
  }
}

/**
 * 写入讨论数据
 */
async function writeDiscussion(discussionId, discussion) {
  const discussionFile = path.join(DISCUSSIONS_DIR, discussionId, 'discussion.json');

  try {
    await fs.writeFile(discussionFile, JSON.stringify(discussion, null, 2), 'utf-8');
    console.log(`✅ 讨论已更新: ${discussionId}`);
    return true;
  } catch (error) {
    console.error(`写入讨论失败: ${error.message}`);
    return false;
  }
}

/**
 * 添加消息到讨论
 */
async function addMessage(discussionId, message) {
  const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');

  try {
    const line = JSON.stringify(message) + '\n';
    await fs.appendFile(messagesFile, line, 'utf-8');
    console.log(`✅ 消息已添加: ${message.role} → ${discussionId}`);
    return true;
  } catch (error) {
    console.error(`添加消息失败: ${error.message}`);
    return false;
  }
}

/**
 * 获取所有pending状态的讨论
 */
async function getPendingDiscussions() {
  try {
    const entries = await fs.readdir(DISCUSSIONS_DIR, { withFileTypes: true });
    const pendingDiscussions = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const discussion = await readDiscussion(entry.name);
      if (discussion && discussion.status === 'pending') {
        pendingDiscussions.push(discussion);
      }
    }

    return pendingDiscussions;
  } catch (error) {
    console.error(`获取pending讨论失败: ${error.message}`);
    return [];
  }
}

/**
 * 生成专家观点
 */
async function generateExpertOpinion(expertKey, topic, context, tool) {
  const expert = EXPERTS[expertKey];

  if (!expert) {
    throw new Error(`未找到专家: ${expertKey}`);
  }

  const systemPrompt = expert.prompt;
  const userPrompt = `请针对以下主题提供你的专业观点：

主题：${topic}

${context ? `背景信息：\n${context}\n` : ''}

请以${expert.name}的身份，从你的专业角度提供详细的分析和建议。`;

  try {
    // 调用LLM生成观点
    const response = await tool.llm({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    });

    return response.content;
  } catch (error) {
    console.error(`生成${expert.name}观点失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理单个讨论
 */
async function processDiscussion(discussion, tool) {
  console.log(`\n🎯 开始处理讨论: ${discussion.id}`);
  console.log(`📝 主题: ${discussion.topic}`);

  // 更新状态为in_progress
  discussion.status = 'in_progress';
  discussion.updatedAt = Date.now();
  await writeDiscussion(discussion.id, discussion);

  // 收集所有专家的观点
  const expertOpinions = [];
  const expertKeys = Object.keys(EXPERTS);

  // 为每个专家生成观点
  for (const expertKey of expertKeys) {
    const expert = EXPERTS[expertKey];

    try {
      console.log(`\n🤖 正在生成${expert.name}观点...`);

      const opinion = await generateExpertOpinion(
        expertKey,
        discussion.topic,
        discussion.category ? `分类：${discussion.category}` : '',
        tool
      );

      // 创建消息对象
      const message = {
        id: `msg-${Date.now()}-${expertKey}`,
        role: expert.role,
        name: expert.name,
        content: opinion,
        timestamp: Date.now(),
        expert: expertKey
      };

      // 保存消息
      await addMessage(discussion.id, message);

      // 添加到消息列表
      discussion.messages.push(message.id);
      expertOpinions.push(message);

      console.log(`✅ ${expert.name}观点已生成`);

      // 短暂延迟，避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ ${expert.name}生成失败: ${error.message}`);

      // 添加错误消息
      const errorMessage = {
        id: `msg-${Date.now()}-${expertKey}-error`,
        role: expert.role,
        name: expert.name,
        content: `[错误] ${expert.name}观点生成失败: ${error.message}`,
        timestamp: Date.now(),
        expert: expertKey,
        error: true
      };

      await addMessage(discussion.id, errorMessage);
      discussion.messages.push(errorMessage.id);
    }
  }

  // 更新状态为completed
  discussion.status = 'completed';
  discussion.updatedAt = Date.now();
  discussion.completedAt = Date.now();
  await writeDiscussion(discussion.id, discussion);

  console.log(`\n✅ 讨论 ${discussion.id} 处理完成`);
  console.log(`📊 生成专家观点: ${expertOpinions.length}条`);

  return {
    success: true,
    discussionId: discussion.id,
    opinionsCount: expertOpinions.length
  };
}

/**
 * 主处理函数
 */
async function main(tool) {
  console.log('\n🚀 MAD协调器启动\n');
  console.log(`📁 数据目录: ${DATA_DIR}`);

  // 获取pending讨论
  const pendingDiscussions = await getPendingDiscussions();

  if (pendingDiscussions.length === 0) {
    console.log('\n✅ 没有pending讨论，无需处理');
    return {
      success: true,
      message: '没有pending讨论',
      processed: 0
    };
  }

  console.log(`\n📋 发现 ${pendingDiscussions.length} 个pending讨论\n`);

  // 处理每个讨论
  const results = [];
  for (const discussion of pendingDiscussions) {
    try {
      const result = await processDiscussion(discussion, tool);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ 处理讨论失败: ${discussion.id}`);
      console.error(`错误: ${error.message}`);

      // 更新状态为failed
      discussion.status = 'failed';
      discussion.error = error.message;
      discussion.updatedAt = Date.now();
      await writeDiscussion(discussion.id, discussion);
    }
  }

  // 汇总结果
  const successCount = results.filter(r => r.success).length;
  const totalOpinions = results.reduce((sum, r) => sum + (r.opinionsCount || 0), 0);

  console.log('\n' + '='.repeat(60));
  console.log('📊 处理完成统计');
  console.log('='.repeat(60));
  console.log(`总讨论数: ${pendingDiscussions.length}`);
  console.log(`成功处理: ${successCount}`);
  console.log(`失败处理: ${pendingDiscussions.length - successCount}`);
  console.log(`总观点数: ${totalOpinions}`);
  console.log('='.repeat(60) + '\n');

  return {
    success: true,
    message: `处理完成`,
    processed: pendingDiscussions.length,
    successCount,
    totalOpinions
  };
}

module.exports = { main };
