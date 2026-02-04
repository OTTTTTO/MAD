/**
 * v4.0.6 功能测试
 *
 * 测试内容：
 * 专家讨论引擎 - 完整的讨论流程
 */

const DiscussionEngine = require('./src/core/v4/discussion-engine');

async function runTests() {
  console.log('='.repeat(60));
  console.log('MAD v4.0.6 功能测试');
  console.log('='.repeat(60));

  const engine = new DiscussionEngine();

  // 测试1: 单领域讨论（技术）
  console.log('\n【测试1】单领域讨论（技术）');
  const topic1 = {
    content: '我想开发一个高并发的电商系统，需要考虑技术架构和性能优化',
    description: '高并发电商系统'
  };

  const result1 = await engine.startDiscussion(topic1);
  console.log('成功:', result1.success ? '是' : '否');
  if (result1.success) {
    console.log('\n讨论总结:');
    console.log('  话题:', result1.summary.topic);
    console.log('  时长:', result1.summary.duration);
    console.log('  消息数:', result1.summary.messages);
    console.log('  专家参与:', JSON.stringify(result1.summary.experts, null, 2));
    console.log('  策略分布:', JSON.stringify(result1.summary.strategies, null, 2));
  }

  // 测试2: 多领域讨论（技术+产品+商业）
  console.log('\n\n【测试2】多领域讨论（技术+产品+商业）');
  const topic2 = {
    content: '我想开发一个在线教育平台，采用微服务架构，面向职场人士，通过订阅制盈利',
    description: '在线教育平台'
  };

  const result2 = await engine.startDiscussion(topic2);
  console.log('成功:', result2.success ? '是' : '否');
  if (result2.success) {
    console.log('\n讨论总结:');
    console.log('  话题:', result2.summary.topic);
    console.log('  时长:', result2.summary.duration);
    console.log('  消息数:', result2.summary.messages);
    console.log('  专家参与:', JSON.stringify(result2.summary.experts, null, 2));

    // 显示前5条消息
    console.log('\n前5条消息:');
    result2.discussion.messages.slice(0, 5).forEach((msg, idx) => {
      console.log(`\n[${idx + 1}] ${msg.expertName || msg.role}`);
      console.log(`    策略: ${msg.strategy || msg.type}`);
      console.log(`    内容: ${(msg.content || '').substring(0, 80)}...`);
    });
  }

  // 测试3: 模糊话题（默认技术+产品）
  console.log('\n\n【测试3】模糊话题（默认技术+产品）');
  const topic3 = {
    content: '帮我做一个网站',
    description: '简单网站'
  };

  const result3 = await engine.startDiscussion(topic3);
  console.log('成功:', result3.success ? '是' : '否');
  if (result3.success) {
    console.log('\n讨论总结:');
    console.log('  话题:', result3.summary.topic);
    console.log('  专家参与:', Object.keys(result3.summary.experts).join(', '));
  }

  // 显示引擎状态
  console.log('\n\n【引擎状态】');
  const status = engine.getStatus();
  console.log('主协调员:', status.coordinator);
  console.log('@追踪器:', status.mentionTracker);
  console.log('监控器:', status.monitor);

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
