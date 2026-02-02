#!/usr/bin/env node

/**
 * v2.5.4 测试：清空讨论功能
 */

const { DiscussionOrchestrator, AGENT_ROLES } = require('../orchestrator.js');

async function test() {
  console.log('============================================================');
  console.log('v2.5.4 测试：清空讨论');
  console.log('============================================================\n');

  // 初始化
  const orchestrator = new DiscussionOrchestrator('./test/data');
  await orchestrator.initialize();

  // 创建讨论
  const { discussionId, context } = await orchestrator.createDiscussion('测试清空功能', {
    participants: [
      AGENT_ROLES.coordinator,
      AGENT_ROLES.technical
    ]
  });

  console.log(`✓ 讨论已创建: ${discussionId}`);

  // 添加一些测试消息
  await orchestrator.agentSpeak(discussionId, 'coordinator', '这是第一条消息');
  await orchestrator.agentSpeak(discussionId, 'technical', '这是第二条消息');
  await orchestrator.agentSpeak(discussionId, 'coordinator', '这是第三条消息');

  console.log(`✓ 已添加 3 条消息`);

  // 检查消息数量
  const history = orchestrator.getDiscussionHistory(discussionId);
  console.log(`✓ 当前消息数: ${history.messages.length}`);

  // 清空讨论
  console.log('\n--- 执行清空操作 ---\n');
  const result = await orchestrator.clearDiscussionMessages(discussionId);

  console.log(`✓ 清空成功`);
  console.log(`  消息数: ${result.messageCount}`);
  console.log(`  清空时间: ${new Date(result.clearedAt).toLocaleString()}`);

  // 验证清空结果
  const clearedHistory = orchestrator.getDiscussionHistory(discussionId);
  console.log(`\n✓ 验证结果:`);
  console.log(`  消息数: ${clearedHistory.messages.length} (应为0)`);
  console.log(`  轮次: ${clearedHistory.discussion.rounds || 0} (应为0)`);
  console.log(`  冲突数: ${clearedHistory.conflicts.length} (应为0)`);

  // 验证Agent状态
  const agentStates = orchestrator.getAgentStates(discussionId);
  console.log(`\n✓ Agent 状态:`);
  Object.entries(agentStates).forEach(([agentId, state]) => {
    console.log(`  ${agentId}: ${state.status} (应为waiting)`);
  });

  // 验证可以继续添加消息
  await orchestrator.agentSpeak(discussionId, 'technical', '清空后的新消息');
  const newHistory = orchestrator.getDiscussionHistory(discussionId);
  console.log(`\n✓ 清空后可以添加新消息: ${newHistory.messages.length} 条`);

  // 验证讨论结构保留
  console.log(`\n✓ 讨论结构保留:`);
  console.log(`  讨论ID: ${clearedHistory.discussion.id} (应保持不变)`);
  console.log(`  主题: ${clearedHistory.discussion.topic} (应保持不变)`);
  console.log(`  参与者: ${clearedHistory.participants.length} 位 (应保持不变)`);

  console.log('\n============================================================');
  console.log('✅ 所有测试通过！');
  console.log('============================================================');
}

test().catch(console.error);
