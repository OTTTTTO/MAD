#!/usr/bin/env node

/**
 * 快速开始脚本
 * 
 * 运行方式：
 * node quick-start.js
 */

const { DiscussionOrchestrator } = require('./orchestrator.js');

async function quickStart() {
  console.log('🚀 Multi-Agent Discussion - 快速开始\n');
  console.log('='.repeat(60));

  // 1. 初始化
  console.log('\n📋 步骤 1: 初始化协调器...');
  const orchestrator = new DiscussionOrchestrator({
    maxDuration: 120000,  // 2分钟
    maxRounds: 5,
    enableConflictDetection: true,
    enableDynamicSpeaking: true
  });
  
  await orchestrator.initialize();
  console.log('✅ 协调器已初始化\n');

  // 2. 创建讨论
  console.log('📋 步骤 2: 创建讨论组...');
  const { discussionId, context, participants } = 
    await orchestrator.createDiscussion('演示：如何使用 Multi-Agent Discussion');
  
  console.log(`✅ 讨论组已创建: ${discussionId}`);
  console.log(`   主题: ${context.topic}`);
  console.log(`   参与者: ${participants.map(p => p.role).join(', ')}\n`);

  // 3. 模拟讨论
  console.log('📋 步骤 3: Agent 开始讨论...\n');
  
  const participantIds = participants.filter(p => p.id !== 'coordinator').map(p => p.id);
  
  // 模拟几个发言
  const sampleMessages = [
    { role: participantIds[0], content: '👋 大家好！这个功能很有价值，可以帮助团队更好地协作。' },
    { role: participantIds[1] || participantIds[0], content: '💡 确实，通过多 Agent 协同，可以产生更全面的解决方案。' },
    { role: participantIds[2] || participantIds[0], content: '🔧 技术上已经实现，测试也全部通过了。' },
  ];

  for (const msg of sampleMessages) {
    if (msg.role) {
      const participant = participants.find(p => p.id === msg.role);
      console.log(`   [${participant?.role || msg.role}] ${msg.content}`);
      await orchestrator.agentSpeak(discussionId, msg.role, msg.content);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 4. 查看讨论历史
  console.log('\n📋 步骤 4: 查看讨论历史...');
  const history = orchestrator.getDiscussionHistory(discussionId);
  console.log(`✅ 共有 ${history.messages.length} 条消息\n`);

  // 5. 结束讨论
  console.log('📋 步骤 5: 结束讨论并生成总结...');
  const summary = await orchestrator.endDiscussion(discussionId);
  console.log('✅ 讨论已结束\n');

  // 6. 显示总结
  console.log('='.repeat(60));
  console.log('📊 讨论总结\n');
  console.log(`讨论主题: ${summary.discussion.topic}`);
  console.log(`消息数量: ${summary.messages.length}`);
  console.log(`讨论时长: ${Math.round((summary.discussion.endedAt - summary.discussion.createdAt) / 1000)} 秒`);
  console.log('\n参与角色:');
  summary.participants.forEach(p => {
    if (p.id !== 'coordinator') {
      console.log(`  - ${p.emoji} ${p.role}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✨ 演示完成！\n');
  
  console.log('接下来你可以：');
  console.log('1. 运行测试: node test/basic.test.js');
  console.log('2. 阅读文档: cat README.md');
  console.log('3. 查看代码: cat orchestrator.js');
  console.log('4. 集成到你的 Agent 中\n');
}

// 运行
if (require.main === module) {
  quickStart().catch(error => {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  });
}

module.exports = { quickStart };
