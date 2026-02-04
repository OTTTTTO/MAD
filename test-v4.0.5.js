/**
 * v4.0.5 功能测试
 *
 * 测试内容：
 * 主协调员 - 话题拆解和专家匹配
 */

const MainCoordinator = require('./src/core/v4/main-coordinator');

async function runTests() {
  console.log('='.repeat(60));
  console.log('MAD v4.0.5 功能测试');
  console.log('='.repeat(60));

  const coordinator = new MainCoordinator();

  // 测试1: 技术类话题
  console.log('\n【测试1】技术类话题');
  const topic1 = {
    content: '我想开发一个高并发的电商系统，需要考虑技术架构、性能优化和安全性',
    description: '高并发电商系统开发'
  };

  const result1 = await coordinator.processTopic(topic1);
  console.log('话题:', topic1.content);
  console.log('成功:', result1.success ? '是' : '否');
  console.log('识别的领域:', result1.domains);
  console.log('匹配的专家数:', result1.experts.length);
  result1.experts.forEach(expert => {
    console.log(`  - ${expert.expertName} (${expert.domain})`);
    console.log(`    问题数: ${expert.questions.length}`);
  });

  // 测试2: 产品类话题
  console.log('\n【测试2】产品类话题');
  const topic2 = {
    content: '我想做一个面向大学生的在线学习平台，帮助他们提升技能',
    description: '大学生在线学习平台'
  };

  const result2 = await coordinator.processTopic(topic2);
  console.log('话题:', topic2.content);
  console.log('成功:', result2.success ? '是' : '否');
  console.log('识别的领域:', result2.domains);
  console.log('匹配的专家数:', result2.experts.length);
  result2.experts.forEach(expert => {
    console.log(`  - ${expert.expertName} (${expert.domain})`);
  });

  // 测试3: 商业类话题
  console.log('\n【测试3】商业类话题');
  const topic3 = {
    content: '我想开发一个SaaS产品，通过订阅制盈利，目标市场是中小企业',
    description: 'SaaS产品商业计划'
  };

  const result3 = await coordinator.processTopic(topic3);
  console.log('话题:', topic3.content);
  console.log('成功:', result3.success ? '是' : '否');
  console.log('识别的领域:', result3.domains);
  console.log('匹配的专家数:', result3.experts.length);
  result3.experts.forEach(expert => {
    console.log(`  - ${expert.expertName} (${expert.domain})`);
  });

  // 测试4: 运营类话题
  console.log('\n【测试4】运营类话题');
  const topic4 = {
    content: '我们需要制定用户增长策略，通过营销活动获取新用户，提升留存率',
    description: '用户增长和运营策略'
  };

  const result4 = await coordinator.processTopic(topic4);
  console.log('话题:', topic4.content);
  console.log('成功:', result4.success ? '是' : '否');
  console.log('识别的领域:', result4.domains);
  console.log('匹配的专家数:', result4.experts.length);

  // 测试5: 综合类话题（多个领域）
  console.log('\n【测试5】综合类话题（技术+产品+商业）');
  const topic5 = {
    content: '我想开发一个在线教育平台，采用微服务架构，面向职场人士，通过订阅制盈利',
    description: '综合型在线教育平台'
  };

  const result5 = await coordinator.processTopic(topic5);
  console.log('话题:', topic5.content);
  console.log('成功:', result5.success ? '是' : '否');
  console.log('识别的领域:', result5.domains);
  console.log('匹配的专家数:', result5.experts.length);
  result5.experts.forEach(expert => {
    console.log(`  - ${expert.expertName} (${expert.domain})`);
    console.log(`    专业领域: ${expert.expertise.join('、')}`);
  });

  // 测试6: 模糊话题（默认处理）
  console.log('\n【测试6】模糊话题（默认匹配技术+产品）');
  const topic6 = {
    content: '帮我做一个项目',
    description: '模糊话题'
  };

  const result6 = await coordinator.processTopic(topic6);
  console.log('话题:', topic6.content);
  console.log('成功:', result6.success ? '是' : '否');
  console.log('识别的领域:', result6.domains);
  console.log('说明: 未识别出明确领域，默认使用技术+产品');

  // 显示协调员状态
  console.log('\n【协调员状态】');
  const status = coordinator.getStatus();
  console.log('可用领域:', status.availableDomains.join(', '));
  console.log('专家数量:', status.expertCount);

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
