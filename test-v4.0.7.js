/**
 * v4.0.7 功能测试
 *
 * 测试内容：
 * 结果汇总器 - 完整的讨论和总结流程
 */

const DiscussionEngine = require('./src/core/v4/discussion-engine');
const DiscussionSummarizer = require('./src/core/v4/discussion-summarizer');

async function runTests() {
  console.log('='.repeat(60));
  console.log('MAD v4.0.7 功能测试 - 完整流程');
  console.log('='.repeat(60));

  const engine = new DiscussionEngine();
  const summarizer = new DiscussionSummarizer();

  // 测试：完整的讨论和总结流程
  console.log('\n【测试】完整流程：讨论 → 总结');
  const topic = {
    content: '我想开发一个在线教育平台，采用微服务架构，面向职场人士，通过订阅制盈利，需要考虑技术架构、用户体验和商业模式',
    description: '综合型在线教育平台'
  };

  // 步骤1：启动讨论
  console.log('\n[步骤1] 启动讨论...');
  const discussionResult = await engine.startDiscussion(topic);

  if (!discussionResult.success) {
    console.log('❌ 讨论失败:', discussionResult.error);
    return;
  }

  console.log('✅ 讨论完成');
  console.log('  消息数:', discussionResult.discussion.messages.length);
  console.log('  参与专家:', Object.keys(discussionResult.summary.experts).join(', '));

  // 步骤2：生成总结
  console.log('\n[步骤2] 生成总结...');
  const decomposition = {
    domains: ['technical', 'product', 'business'],
    experts: []
  };

  const report = summarizer.summarize(discussionResult.discussion, decomposition);

  console.log('✅ 总结完成');
  console.log('  共识数量:', report.consensus.length);
  console.log('  分歧数量:', report.disagreements.length);
  console.log('  建议数量:', report.recommendations.length);

  // 显示详细结果
  console.log('\n' + '='.repeat(60));
  console.log('【详细结果】');
  console.log('='.repeat(60));

  console.log('\n[执行摘要]');
  console.log(report.executiveSummary);

  console.log('\n[共识观点]');
  if (report.consensus.length > 0) {
    report.consensus.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.domain}领域 (${item.expert})`);
      console.log(`   ${item.point}`);
    });
  } else {
    console.log('无');
  }

  console.log('\n[分歧观点]');
  if (report.disagreements.length > 0) {
    report.disagreements.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${item.domain}领域 (${item.expert})`);
      console.log(`   原因: ${item.reason}`);
    });
  } else {
    console.log('无');
  }

  console.log('\n[行动建议]');
  if (report.recommendations.length > 0) {
    report.recommendations.forEach((item, idx) => {
      const priority = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
      console.log(`\n${priority} ${idx + 1}. ${item.action}（${item.category}）`);
      console.log(`   ${item.details}`);
    });
  } else {
    console.log('无');
  }

  console.log('\n[统计信息]');
  console.log('  总消息数:', report.statistics.totalMessages);
  console.log('  讨论时长:', report.statistics.duration);
  console.log('  专家参与:');
  for (const [expert, count] of Object.entries(report.statistics.expertParticipation)) {
    console.log(`    ${expert}: ${count}次`);
  }

  // 生成Markdown报告
  console.log('\n' + '='.repeat(60));
  console.log('[Markdown报告预览]');
  console.log('='.repeat(60));
  const markdown = summarizer.formatMarkdown(report);
  console.log(markdown.substring(0, 500) + '...\n[报告已截断，完整报告可保存为文件]');

  console.log('\n' + '='.repeat(60));
  console.log('测试完成！');
  console.log('='.repeat(60));
}

// 运行测试
runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});
