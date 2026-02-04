/**
 * v4.0.4 功能测试
 *
 * 测试内容：
 * 专家类 - 置信度评估和@决策
 */

const Expert = require('./src/core/v4/expert');

console.log('='.repeat(60));
console.log('MAD v4.0.4 功能测试');
console.log('='.repeat(60));

// 创建技术专家
const techExpert = new Expert({
  id: 'technical',
  name: '技术专家',
  domain: 'technical',
  expertise: ['技术架构', '性能优化', '安全防护'],
  keywords: ['技术', '架构', '性能', '安全', '开发', '系统']
});

console.log('\n【专家信息】');
console.log(techExpert.getInfo());

// 测试1: 高置信度问题
console.log('\n【测试1】高置信度问题（完全匹配）');
const question1 = {
  content: '这个系统的技术架构应该如何设计？需要考虑哪些性能问题？'
};

const conf1 = techExpert.evaluateConfidence(question1);
console.log('问题:', question1.content);
console.log('置信度:', conf1.toFixed(2));

const decision1 = techExpert.decideResponse(question1);
console.log('决策:', decision1.strategy);
console.log('说明:', decision1.message);

// 测试2: 中置信度问题
console.log('\n【测试2】中置信度问题（部分匹配）');
const question2 = {
  content: '这个产品应该如何设计？',
  history: [
    { content: '我们需要考虑技术架构问题' },
    { content: '性能优化很重要' }
  ]
};

const conf2 = techExpert.evaluateConfidence(question2);
console.log('问题:', question2.content);
console.log('置信度:', conf2.toFixed(2));

const decision2 = techExpert.decideResponse(question2);
console.log('决策:', decision2.strategy);
console.log('说明:', decision2.message);

// 测试3: 低置信度问题
console.log('\n【测试3】低置信度问题（完全不匹配）');
const question3 = {
  content: '这个产品的商业模式应该如何设计？市场定位是什么？'
};

const conf3 = techExpert.evaluateConfidence(question3);
console.log('问题:', question3.content);
console.log('置信度:', conf3.toFixed(2));

const decision3 = techExpert.decideResponse(question3);
console.log('决策:', decision3.strategy);
console.log('说明:', decision3.message);

// 测试4: 使用工厂函数创建专家
console.log('\n【测试4】使用工厂函数创建专家');
const productExpert = Expert.createExpert('product');
console.log('产品专家:', productExpert ? productExpert.name : '创建失败');

const businessExpert = Expert.createExpert('business');
console.log('商业专家:', businessExpert ? businessExpert.name : '创建失败');

const opsExpert = Expert.createExpert('operations');
console.log('运营专家:', opsExpert ? opsExpert.name : '创建失败');

// 测试5: 跨领域问题
console.log('\n【测试5】产品专家回答技术问题');
if (productExpert) {
  const question5 = {
    content: '数据库应该如何设计？'
  };

  const conf5 = productExpert.evaluateConfidence(question5);
  const decision5 = productExpert.decideResponse(question5);

  console.log('问题:', question5.content);
  console.log('置信度:', conf5.toFixed(2));
  console.log('决策:', decision5.strategy);
  console.log('说明:', decision5.message);
}

console.log('\n' + '='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
