#!/usr/bin/env node

/**
 * MAD v2.6.0 测试套件
 * 
 * 测试所有新功能：
 * 1. 讨论质量评分系统
 * 2. Agent 性能分析
 * 3. 增强导出功能
 * 4. 模板市场
 * 5. 智能建议系统
 */

const { DiscussionOrchestrator } = require('../orchestrator.js');

async function runTests() {
  console.log('🧪 MAD v2.6.0 测试套件\n');

  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // 创建测试讨论
  const result = await orchestrator.createDiscussion('测试讨论：新功能评估', {
    participants: ['coordinator', 'technical', 'testing']
  });

  const { discussionId, context } = result;
  const participants = context.participants || [];

  console.log(`  Participants count: ${participants.length}`);
  participants.forEach(p => {
    console.log(`  - ${p.id} (${p.role})`);
  });

  // 添加测试消息
  const coordinatorId = participants.find(p => p.role === '主协调员')?.id;
  const technicalId = participants.find(p => p.role === '技术可行性')?.id;
  const testingId = participants.find(p => p.role === '测试')?.id;

  if (!coordinatorId || !technicalId || !testingId) {
    throw new Error('无法找到参与者 ID');
  }

  await orchestrator.agentSpeak(discussionId, coordinatorId, '请从技术角度评估这个新功能');
  await orchestrator.agentSpeak(discussionId, technicalId, '从技术实现角度看，这个功能可行，但需要注意性能优化');
  await orchestrator.agentSpeak(discussionId, testingId, '我同意 @技术可行性 的观点，同时建议增加单元测试覆盖率');

  console.log(`✅ 创建测试讨论: ${discussionId}\n`);

  // ========== 测试 1: 讨论质量评分系统 ==========
  console.log('📊 测试 1: 讨论质量评分系统');
  try {
    const scores = await orchestrator.calculateQualityScore(discussionId);
    
    console.log(`  总分: ${scores.total} (${scores.grade.level} ${scores.grade.emoji})`);
    console.log(`  参与度: ${scores.dimensions.participation}`);
    console.log(`  创新性: ${scores.dimensions.innovation}`);
    console.log(`  协作度: ${scores.dimensions.collaboration}`);
    console.log(`  完整性: ${scores.dimensions.completeness}`);

    assert('质量评分计算成功', typeof scores.total === 'number' && scores.total >= 0 && scores.total <= 1);
    assert('评分历史保存成功', orchestrator.getScoreHistory(discussionId).length > 0);

    // 测试趋势图数据
    const trendData = orchestrator.generateScoreTrendData(discussionId);
    assert('趋势图数据生成成功', trendData && trendData.labels && trendData.datasets);

    // 测试雷达图数据
    const radarData = orchestrator.generateScoreRadarData(discussionId);
    assert('雷达图数据生成成功', radarData && radarData.labels && radarData.datasets);

    recordTest('讨论质量评分系统', true);
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    recordTest('讨论质量评分系统', false, error.message);
  }

  // ========== 测试 2: Agent 性能分析 ==========
  console.log('\n🤖 测试 2: Agent 性能分析');
  try {
    // 使用 agent id (coordinator) 而不是 role
    const performance = await orchestrator.analyzeAgentPerformance('coordinator', {
      discussionId,
      includeDetails: true
    });

    console.log(`  总消息数: ${performance.summary.totalMessages}`);
    console.log(`  平均消息长度: ${performance.summary.avgMessageLength} 字符`);
    console.log(`  发言频率: ${performance.speaking.speakingFrequency} 消息/小时`);
    console.log(`  总贡献度: ${performance.contribution.totalContribution}%`);

    assert('性能分析计算成功', performance.summary && performance.speaking);
    assert('发言统计正确', performance.summary.totalMessages > 0);
    assert('贡献度计算正确', typeof performance.contribution.totalContribution === 'number');

    // 测试排行榜
    const leaderboard = await orchestrator.getAgentLeaderboard({ limit: 5 });
    assert('排行榜生成成功', Array.isArray(leaderboard) && leaderboard.length > 0);

    recordTest('Agent 性能分析', true);
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    recordTest('Agent 性能分析', false, error.message);
  }

  // ========== 测试 3: 增强导出功能 ==========
  console.log('\n📦 测试 3: 增强导出功能');
  try {
    // Markdown 导出
    const mdResult = await orchestrator.exportToMarkdown(discussionId, {
      outputPath: './test-export.md'
    });
    console.log(`  ✅ Markdown 导出成功: ${mdResult.size} 字节`);

    // JSON 导出
    const jsonResult = await orchestrator.exportToJSON(discussionId, {
      format: 'pretty'
    });
    console.log(`  ✅ JSON 导出成功: ${jsonResult.size} 字节`);

    // 批量导出
    const batchResult = await orchestrator.batchExportDiscussions([discussionId], {
      format: 'json',
      outputDir: './test-exports'
    });
    console.log(`  ✅ 批量导出成功: ${batchResult.successful}/${batchResult.total} 个讨论`);

    assert('Markdown 导出成功', mdResult.size > 0);
    assert('JSON 导出成功', jsonResult.size > 0);
    assert('批量导出成功', batchResult.successful > 0);

    recordTest('增强导出功能', true);
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    recordTest('增强导出功能', false, error.message);
  }

  // ========== 测试 4: 模板市场 ==========
  console.log('\n🛒 测试 4: 模板市场');
  try {
    // 搜索模板
    const searchResults = await orchestrator.searchTemplates('产品', {
      category: '产品',
      sortBy: 'rating'
    });
    console.log(`  ✅ 搜索到 ${searchResults.length} 个模板`);

    // 获取模板详情
    if (searchResults.length > 0) {
      const template = await orchestrator.getTemplate(searchResults[0].id);
      console.log(`  ✅ 获取模板详情: ${template.name}`);
      
      // 评分模板
      const ratingResult = await orchestrator.rateTemplate(
        searchResults[0].id,
        5,
        '测试评分',
        'TestUser'
      );
      console.log(`  ✅ 模板评分成功: 新评分 ${ratingResult.newRating}`);

      // 分享模板
      const shareResult = await orchestrator.shareTemplate(searchResults[0].id, {
        platform: 'link'
      });
      console.log(`  ✅ 模板分享成功: ${shareResult.url}`);
    }

    // 获取市场统计
    const stats = await orchestrator.getMarketStats();
    console.log(`  ✅ 市场统计: ${stats.totalTemplates} 个模板`);

    assert('模板搜索成功', Array.isArray(searchResults));
    assert('市场统计获取成功', stats && stats.totalTemplates >= 0);

    recordTest('模板市场', true);
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    recordTest('模板市场', false, error.message);
  }

  // ========== 测试 5: 智能建议系统 ==========
  console.log('\n💡 测试 5: 智能建议系统');
  try {
    // 生成建议
    const suggestions = await orchestrator.generateSuggestions(discussionId, {
      type: 'all',
      maxSuggestions: 5
    });

    console.log(`  ✅ 生成 ${suggestions.length} 条建议`);
    suggestions.slice(0, 3).forEach(s => {
      console.log(`    - [${s.priority}] ${s.title}: ${s.description?.slice(0, 50)}...`);
    });

    // 测试忽略建议
    if (suggestions.length > 0) {
      orchestrator.dismissSuggestion(discussionId, suggestions[0].id);
      console.log(`  ✅ 忽略建议成功`);
    }

    // 获取建议统计
    const stats = orchestrator.getSuggestionStats(discussionId);
    console.log(`  ✅ 建议统计: 总计 ${stats?.total || 0} 条`);

    assert('建议生成成功', Array.isArray(suggestions));
    assert('建议统计获取成功', stats !== null);

    recordTest('智能建议系统', true);
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    recordTest('智能建议系统', false, error.message);
  }

  // ========== 测试汇总 ==========
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试汇总');
  console.log('='.repeat(50));
  console.log(`✅ 通过: ${results.passed}`);
  console.log(`❌ 失败: ${results.failed}`);
  console.log(`📈 成功率: ${results.passed / (results.passed + results.failed) * 100}%`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('\n🎉 所有测试通过！\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败\n');
    process.exit(1);
  }

  // ========== 辅助函数 ==========

  function assert(name, condition) {
    if (!condition) {
      throw new Error(`断言失败: ${name}`);
    }
    console.log(`  ✅ ${name}`);
  }

  function recordTest(name, passed, error = null) {
    results.tests.push({ name, passed, error });
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行失败:', error);
  process.exit(1);
});
