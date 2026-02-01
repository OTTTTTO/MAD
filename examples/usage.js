#!/usr/bin/env node

/**
 * MAD 使用示例
 * 
 * 展示如何使用 MAD 进行多 Agent 讨论
 */

const { DiscussionOrchestrator } = require('../orchestrator.js');

async function example1() {
  console.log('\n=== 示例 1: 创建并管理讨论 ===\n');
  
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();
  
  // 创建讨论
  const { discussionId, context, participants } = await orchestrator.createDiscussion(
    '评估开发"智能客服"功能的可行性'
  );
  
  console.log(`✅ 讨论已创建: ${discussionId}`);
  console.log(`   主题: ${context.topic}`);
  console.log(`   参与者: ${participants.map(p => p.role).join(', ')}`);
  
  // Agent 发言
  await orchestrator.agentSpeak(discussionId, 'market_research', `
## 📊 市场分析

智能客服是一个成熟市场，但仍有差异化机会：
- 竞品：很多，但大多数是基于规则的
- 机会：AI驱动的智能客服，更自然的对话
- 建议：聚焦特定垂直领域（如技术支持）
  `);
  
  await orchestrator.agentSpeak(discussionId, 'technical', `
## 🔧 技术可行性

技术上完全可行：
- LLM API（OpenAI、Claude等）
- 向量数据库（知识库）
- 对话管理框架

推荐方案：LLM + RAG + 对话历史
  `);
  
  // 获取讨论历史
  const history = orchestrator.getDiscussionHistory(discussionId);
  console.log(`\n💬 消息数: ${history.messages.length}`);
  
  // 结束讨论
  const summary = await orchestrator.endDiscussion(discussionId);
  console.log(`\n📝 讨论已结束`);
  
  // 导出 Markdown
  const markdown = orchestrator.exportToMarkdown(discussionId);
  console.log(`\n📄 Markdown 长度: ${markdown.length} 字符`);
}

async function example2() {
  console.log('\n=== 示例 2: Agent 统计 ===\n');
  
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();
  
  const { discussionId } = await orchestrator.createDiscussion('测试讨论');
  
  // Agent 多次发言
  await orchestrator.agentSpeak(discussionId, 'market_research', '第一次发言');
  await orchestrator.agentSpeak(discussionId, 'market_research', '第二次发言');
  await orchestrator.agentSpeak(discussionId, 'technical', '我的观点');
  
  // 获取统计
  const stats = orchestrator.getAllAgentStats();
  console.log('Agent 统计:');
  console.log(JSON.stringify(stats, null, 2));
}

async function example3() {
  console.log('\n=== 示例 3: 搜索功能 ===\n');
  
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();
  
  const { discussionId } = await orchestrator.createDiscussion('关于 AI 安全的讨论');
  
  await orchestrator.agentSpeak(discussionId, 'technical', 'AI 安全是重要话题');
  await orchestrator.agentSpeak(discussionId, 'market_research', '安全需求很高');
  
  // 搜索
  const results = orchestrator.searchDiscussions('安全');
  console.log(`\n🔍 搜索结果: ${results.messages.length} 条`);
  results.messages.forEach(msg => {
    console.log(`  - [${msg.roleName}] ${msg.content.substring(0, 50)}...`);
  });
}

// 运行所有示例
async function runAll() {
  try {
    await example1();
    await example2();
    await example3();
    
    console.log('\n✅ 所有示例运行完成！');
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  }
}

if (require.main === module) {
  runAll();
}

module.exports = { example1, example2, example3 };
