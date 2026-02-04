#!/usr/bin/env node

/**
 * v2.5.0 功能测试
 * 测试全局搜索、缓存管理、分页加载等功能
 */

const { DiscussionOrchestrator } = require('../orchestrator.js');

async function testV250Features() {
  console.log('\n🧪 MAD v2.5.0 功能测试\n');
  console.log('=' .repeat(50));

  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  let passed = 0;
  let failed = 0;
  let testDiscussionId = null; // 用于后续测试的讨论 ID

  // 测试 1: 创建讨论
  console.log('\n📝 测试 1: 创建讨论...');
  try {
    // 使用 AGENT_ROLES 获取角色配置
    const { AGENT_ROLES } = require('../orchestrator.js');
    const { discussionId } = await orchestrator.createDiscussion('测试搜索和分页功能', {
      participants: [AGENT_ROLES.coordinator, AGENT_ROLES.technical, AGENT_ROLES.testing]
    });
    testDiscussionId = discussionId; // 保存 ID 供后续测试使用
    console.log(`✅ 讨论创建成功: ${discussionId}`);
    passed++;

    // 添加一些测试消息
    await orchestrator.agentSpeak(discussionId, 'technical', '这个功能需要实现全文搜索和缓存机制。');
    await orchestrator.agentSpeak(discussionId, 'testing', '我们需要测试分页加载的性能。');
    await orchestrator.agentSpeak(discussionId, 'coordinator', '好的，让我们开始实现这些功能。');

  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 2: 全局搜索
  console.log('\n🔍 测试 2: 全局搜索...');
  try {
    const results = await orchestrator.search('搜索');
    console.log(`✅ 搜索完成，找到 ${results.total} 个结果`);
    console.log(`   - 讨论数: ${results.discussions.length}`);
    console.log(`   - 消息数: ${results.messages.length}`);
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 3: 搜索历史
  console.log('\n📜 测试 3: 搜索历史...');
  try {
    const history = orchestrator.getSearchHistory(10);
    console.log(`✅ 搜索历史: ${history.length} 条记录`);
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 4: 热门关键词
  console.log('\n🔥 测试 4: 热门关键词...');
  try {
    const keywords = orchestrator.getHotKeywords(5);
    console.log(`✅ 热门关键词: ${keywords.length} 个`);
    keywords.forEach(k => console.log(`   - ${k.keyword} (${k.count}次)`));
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 5: 搜索建议
  console.log('\n💡 测试 5: 搜索建议...');
  try {
    const suggestions = orchestrator.getSearchSuggestions('搜', 5);
    console.log(`✅ 搜索建议: ${suggestions.length} 个`);
    suggestions.forEach(s => console.log(`   - ${s}`));
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 6: 搜索统计
  console.log('\n📊 测试 6: 搜索统计...');
  try {
    const stats = orchestrator.getSearchStats();
    console.log(`✅ 搜索统计:`);
    console.log(`   - 总搜索次数: ${stats.totalSearches}`);
    console.log(`   - 唯一查询: ${stats.uniqueQueries}`);
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 7: 缓存统计
  console.log('\n💾 测试 7: 缓存统计...');
  try {
    const stats = orchestrator.getCacheStats();
    console.log(`✅ 缓存统计:`);
    if (stats) {
      console.log(`   - 讨论缓存: ${stats.discussions.size}/${stats.discussions.maxSize}`);
      console.log(`   - 消息缓存: ${stats.messages.size}/${stats.messages.maxSize}`);
    }
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 8: 消息分页
  console.log('\n📄 测试 8: 消息分页...');
  try {
    // 使用测试 1 创建的讨论
    if (testDiscussionId) {
      const result = await orchestrator.getMessagesPaginated(testDiscussionId, 1, 10);
      console.log(`✅ 消息分页:`);
      console.log(`   - 当前页: ${result.pagination.page}`);
      console.log(`   - 消息数: ${result.data.length}`);
      console.log(`   - 总页数: ${result.pagination.totalPages}`);
      passed++;
    } else {
      console.log('⚠️  没有可用的测试讨论');
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 9: 消息统计
  console.log('\n📈 测试 9: 消息统计...');
  try {
    // 使用测试 1 创建的讨论
    if (testDiscussionId) {
      const stats = await orchestrator.getMessageStats(testDiscussionId);
      console.log(`✅ 消息统计:`);
      console.log(`   - 总消息数: ${stats.totalMessages}`);
      console.log(`   - 平均长度: ${stats.avgMessageLength} 字符`);
      passed++;
    } else {
      console.log('⚠️  没有可用的测试讨论');
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 10: 最新消息
  console.log('\n🆕 测试 10: 最新消息...');
  try {
    // 使用测试 1 创建的讨论
    if (testDiscussionId) {
      const result = await orchestrator.getLatestMessages(testDiscussionId, 5);
      console.log(`✅ 最新消息: ${result.count} 条`);
      passed++;
    } else {
      console.log('⚠️  没有可用的测试讨论');
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📊 成功率: ${Math.round(passed / (passed + failed) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log('⚠️  部分测试失败');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
testV250Features().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
