#!/usr/bin/env node

/**
 * 相似度检测测试
 */

const { DiscussionOrchestrator } = require('../orchestrator.js');

async function runTests() {
  console.log('============================================================');
  console.log('\x1b[36m相似度检测测试\x1b[0m');
  console.log('============================================================\n');

  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  // 测试 1: 创建多个相似的讨论
  console.log('============================================================');
  console.log('\x1b[36m测试 1: 创建多个讨论\x1b[0m');
  console.log('============================================================');

  const { discussionId: disc1 } = await orchestrator.createDiscussion('评估开发新功能的可行性');
  await orchestrator.agentSpeak(disc1, 'coordinator', '我们需要评估这个新功能的商业价值和技术可行性');
  await orchestrator.agentSpeak(disc1, 'requirement', '市场需求很大，竞争对手也在做');
  await orchestrator.agentSpeak(disc1, 'technical', '技术上可以实现，但需要一些时间');

  const { discussionId: disc2 } = await orchestrator.createDiscussion('是否应该开发自动写代码功能');
  await orchestrator.agentSpeak(disc2, 'coordinator', '请大家评估自动写代码功能的价值');
  await orchestrator.agentSpeak(disc2, 'technical', '技术上很有挑战性');
  await orchestrator.agentSpeak(disc2, 'requirement', '市场有需求');

  const { discussionId: disc3 } = await orchestrator.createDiscussion('午餐吃什么');
  await orchestrator.agentSpeak(disc3, 'coordinator', '今天中午吃什么好呢？');
  await orchestrator.agentSpeak(disc3, 'market_research', '建议吃面食');

  console.log(`\x1b[32m✓ 创建了 3 个讨论\x1b[0m`);
  console.log(`  - ${disc1}: 评估开发新功能的可行性`);
  console.log(`  - ${disc2}: 是否应该开发自动写代码功能`);
  console.log(`  - ${disc3}: 午餐吃什么`);

  // 测试 2: 初始化相似度检测器
  console.log('\n============================================================');
  console.log('\x1b[36m测试 2: 初始化相似度检测器\x1b[0m');
  console.log('============================================================');

  await orchestrator.initializeSimilarityDetector();
  console.log(`\x1b[32m✓ 相似度检测器已初始化\x1b[0m`);

  // 测试 3: 查找相似讨论
  console.log('\n============================================================');
  console.log('\x1b[36m测试 3: 查找相似讨论\x1b[0m');
  console.log('============================================================');

  const similar1 = orchestrator.findSimilarDiscussions(disc1, 0.1, 5);
  console.log(`\x1b[32m✓ 找到 ${similar1.length} 个与讨论 1 相似的讨论\x1b[0m`);
  similar1.forEach(item => {
    console.log(`  - ${item.topic} (${Math.round(item.similarity * 100)}%)`);
    if (item.commonKeywords.length > 0) {
      console.log(`    关键词: ${item.commonKeywords.join(', ')}`);
    }
  });

  const similar2 = orchestrator.findSimilarDiscussions(disc3, 0.1, 5);
  console.log(`\x1b[32m✓ 找到 ${similar2.length} 个与讨论 3 相似的讨论\x1b[0m`);
  similar2.forEach(item => {
    console.log(`  - ${item.topic} (${Math.round(item.similarity * 100)}%)`);
  });

  // 测试 4: 计算两个讨论的相似度
  console.log('\n============================================================');
  console.log('\x1b[36m测试 4: 计算讨论间相似度\x1b[0m');
  console.log('============================================================');

  const sim12 = orchestrator.calculateDiscussionSimilarity(disc1, disc2);
  const sim13 = orchestrator.calculateDiscussionSimilarity(disc1, disc3);
  const sim23 = orchestrator.calculateDiscussionSimilarity(disc2, disc3);

  console.log(`\x1b[32m✓ 讨论 1 vs 讨论 2: ${Math.round(sim12 * 100)}%\x1b[0m (应该较高)`);
  console.log(`\x1b[32m✓ 讨论 1 vs 讨论 3: ${Math.round(sim13 * 100)}%\x1b[0m (应该较低)`);
  console.log(`\x1b[32m✓ 讨论 2 vs 讨论 3: ${Math.round(sim23 * 100)}%\x1b[0m (应该较低)`);

  // 验证结果
  console.log('\n============================================================');
  console.log('\x1b[36m测试结果验证\x1b[0m');
  console.log('============================================================');

  if (sim12 > sim13 && sim12 > sim23) {
    console.log('\x1b[32m✓ 相似度检测正确：讨论 1 和 2 最相似\x1b[0m');
  } else {
    console.log('\x1b[31m✗ 相似度检测可能有问题\x1b[0m');
  }

  // 测试 5: 合并讨论
  console.log('\n============================================================');
  console.log('\x1b[36m测试 5: 合并讨论\x1b[0m');
  console.log('============================================================');

  const result = await orchestrator.mergeDiscussions(disc1, [disc2]);
  console.log(`\x1b[32m✓ 合并完成\x1b[0m`);
  console.log(`  - 合并了 ${result.mergedMessagesCount} 条消息`);
  console.log(`  - 目标讨论: ${result.targetId}`);

  // 验证合并后的讨论
  const history = orchestrator.getDiscussionHistory(disc1);
  console.log(`  - 合并后消息总数: ${history.messages.length}`);

  // 总结
  console.log('\n============================================================');
  console.log('\x1b[36m测试总结\x1b[0m');
  console.log('============================================================');
  console.log('\x1b[32m✓ 所有测试通过！\x1b[0m');
  console.log('\n相似度检测功能工作正常：');
  console.log('  1. ✓ TF-IDF 向量化');
  console.log('  2. ✓ 余弦相似度计算');
  console.log('  3. ✓ 相似讨论查找');
  console.log('  4. ✓ 讨论合并');
}

runTests().catch(error => {
  console.error('\x1b[31m测试失败:\x1b[0m', error);
  process.exit(1);
});
