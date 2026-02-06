/**
 * MAD v0.1.1 测试脚本
 *
 * 测试内容：
 * 1. 创建测试讨论
 * 2. 运行协作引擎
 * 3. 验证消息类型
 * 4. 检查讨论收敛
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = '/home/otto/.openclaw/multi-agent-discuss';
const DISCUSSIONS_DIR = path.join(DATA_DIR, 'discussions');

/**
 * 创建测试讨论
 */
async function createTestDiscussion(topic) {
  const discussionId = `disc-${Date.now()}`;

  const discussion = {
    id: discussionId,
    topic: topic,
    status: 'pending',
    category: '技术架构',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    phase: {
      current: 'pending',
      round: 0,
      maxRounds: 5
    }
  };

  // 创建目录
  const discussionDir = path.join(DISCUSSIONS_DIR, discussionId);
  await fs.mkdir(discussionDir, { recursive: true });

  // 保存讨论
  const discussionFile = path.join(discussionDir, 'discussion.json');
  await fs.writeFile(discussionFile, JSON.stringify(discussion, null, 2), 'utf-8');

  // 创建空消息文件
  const messagesFile = path.join(discussionDir, 'messages.jsonl');
  await fs.writeFile(messagesFile, '', 'utf-8');

  console.log(`✅ 测试讨论已创建: ${discussionId}`);
  console.log(`   主题: ${topic}\n`);

  return discussionId;
}

/**
 * 读取讨论消息
 */
async function readMessages(discussionId) {
  const messagesFile = path.join(DISCUSSIONS_DIR, discussionId, 'messages.jsonl');

  try {
    const content = await fs.readFile(messagesFile, 'utf-8');
    if (!content.trim()) return [];

    const lines = content.trim().split('\n');
    return lines.map(line => JSON.parse(line));
  } catch (error) {
    console.error(`读取消息失败: ${error.message}`);
    return [];
  }
}

/**
 * 读取讨论
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
 * 分析消息类型分布
 */
function analyzeMessages(messages) {
  const typeCount = {};
  const fromCount = {};

  messages.forEach(msg => {
    typeCount[msg.type] = (typeCount[msg.type] || 0) + 1;
    fromCount[msg.from] = (fromCount[msg.from] || 0) + 1;
  });

  return { typeCount, fromCount };
}

/**
 * 打印消息摘要
 */
function printMessageSummary(messages) {
  console.log('\n📨 消息摘要：\n');

  messages.forEach((msg, index) => {
    const icon = getMessageIcon(msg.type);
    const from = msg.metadata?.expertName || msg.from;
    const preview = msg.content.substring(0, 50) + '...';

    console.log(`${index + 1}. ${icon} [${msg.type}] ${from}`);
    console.log(`   ${preview}\n`);
  });
}

/**
 * 获取消息图标
 */
function getMessageIcon(type) {
  const icons = {
    SYSTEM: 'ℹ️',
    TOPIC: '💬',
    MENTION: '📢',
    EXPERT_RESPONSE: '💬',
    COLLABORATION: '🤝',
    SUMMARY: '📋'
  };
  return icons[type] || '📄';
}

/**
 * 验证讨论流程
 */
function validateDiscussion(discussion, messages) {
  console.log('\n✅ 验证结果：\n');

  const issues = [];

  // 检查状态
  if (discussion.status !== 'completed') {
    issues.push(`讨论状态未完成: ${discussion.status}`);
  }

  // 检查消息类型
  const { typeCount, fromCount } = analyzeMessages(messages);

  if (!typeCount.MENTION) {
    issues.push('缺少MENTION消息');
  }

  if (!typeCount.EXPERT_RESPONSE) {
    issues.push('缺少EXPERT_RESPONSE消息');
  }

  if (!typeCount.SUMMARY) {
    issues.push('缺少SUMMARY消息');
  }

  // 检查总结
  if (!discussion.summary) {
    issues.push('缺少总结内容');
  }

  if (issues.length > 0) {
    console.log('❌ 发现问题：');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }

  console.log('✅ 讨论流程完整！');
  console.log(`\n📊 统计信息：`);
  console.log(`   总消息数: ${messages.length}`);
  console.log(`   消息类型分布: ${JSON.stringify(typeCount, null, 2)}`);
  console.log(`   专家参与: ${JSON.stringify(fromCount, null, 2)}`);
  console.log(`   讨论轮次: ${discussion.phase?.round || 0}`);
  console.log(`   参与专家: ${Object.keys(discussion.participants?.experts || {}).length}个`);

  if (discussion.summary) {
    console.log(`\n📋 总结预览：`);
    console.log(`   ${discussion.summary.content?.substring(0, 100)}...`);
  }

  return true;
}

/**
 * 主测试函数
 */
async function test() {
  console.log('🧪 MAD v0.1.1 协作式讨论系统测试\n');
  console.log('='.repeat(60));

  // 测试话题
  const testTopics = [
    '如何设计一个高可用的微服务架构？',
    '如何提升用户留存率？',
    '如何评估一个SaaS产品的商业价值？'
  ];

  // 选择第一个话题进行测试
  const topic = testTopics[0];
  console.log(`\n📝 测试话题: ${topic}\n`);

  // 步骤1: 创建测试讨论
  console.log('步骤1: 创建测试讨论');
  console.log('-'.repeat(60));
  const discussionId = await createTestDiscussion(topic);

  // 步骤2: 等待协调器处理
  console.log('\n步骤2: 等待协调器处理');
  console.log('-'.repeat(60));
  console.log('请在OpenClaw中说：启动MAD协调器');
  console.log('或者等待协调器自动处理pending讨论...\n');

  // 等待5秒后检查
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 步骤3: 读取并分析消息
  console.log('\n步骤3: 分析讨论结果');
  console.log('-'.repeat(60));

  const discussion = await readDiscussion(discussionId);
  const messages = await readMessages(discussionId);

  if (!discussion) {
    console.error('❌ 无法读取讨论');
    return;
  }

  console.log(`\n讨论状态: ${discussion.status}`);
  console.log(`消息数量: ${messages.length}\n`);

  if (messages.length > 0) {
    printMessageSummary(messages);
  }

  // 步骤4: 验证
  if (messages.length > 0) {
    validateDiscussion(discussion, messages);
  } else {
    console.log('\n⚠️  暂无消息生成');
    console.log('可能原因：');
    console.log('   - 协调器尚未启动');
    console.log('   - LLM配置缺失');
    console.log('   - 数据目录路径错误\n');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 测试完成！\n');

  return {
    discussionId,
    discussion,
    messages,
    success: discussion.status === 'completed'
  };
}

// 运行测试
test().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});

module.exports = { test, createTestDiscussion, readDiscussion, readMessages };
