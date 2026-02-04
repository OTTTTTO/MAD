/**
 * v4.0.3 功能测试
 *
 * 测试内容：
 * 用户交互处理器 - 识别缺失信息并生成问题
 */

const UserInteractionHandler = require('./src/core/v4/user-interaction-handler');

console.log('='.repeat(60));
console.log('MAD v4.0.3 功能测试');
console.log('='.repeat(60));

const handler = new UserInteractionHandler();

// 测试1: 缺失关键信息
console.log('\n【测试1】话题缺少关键信息');
const topic1 = {
  content: '我想做一个网站'
};

const result1 = handler.analyzeMissingInfo(topic1);
console.log('话题:', topic1.content);
console.log('需要提问:', result1.needAsk ? '是' : '否');
console.log('优先级:', result1.priority);
console.log('缺失字段:', result1.questions);
console.log('原因:', result1.reason);

if (result1.needAsk) {
  const questions = handler.generateQuestions(result1.questions);
  console.log('\n生成的问题:');
  questions.forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q.text}`);
    console.log(`     类型: ${q.type}, 必填: ${q.required}`);
  });
}

// 测试2: 包含完整信息
console.log('\n【测试2】话题包含完整信息');
const topic2 = {
  content: '我想为25-35岁的城市白领开发一个在线学习平台，帮助他们提升技能',
  description: '面向职场人士的在线教育平台'
};

const result2 = handler.analyzeMissingInfo(topic2);
console.log('话题:', topic2.content);
console.log('需要提问:', result2.needAsk ? '是' : '否');
console.log('原因:', result2.reason || '信息完整');

// 测试3: 缺失可选信息（超过阈值）
console.log('\n【测试3】话题缺失可选信息');
const topic3 = {
  content: '帮我开发一个APP',
  metadata: {}
};

const result3 = handler.analyzeMissingInfo(topic3);
console.log('话题:', topic3.content);
console.log('需要提问:', result3.needAsk ? '是' : '否');
if (result3.needAsk) {
  console.log('优先级:', result3.priority);
  console.log('缺失字段:', result3.questions);
}

// 测试4: 处理用户回答
console.log('\n【测试4】处理用户回答');
const mockAnswers = {
  '目标用户': '25-35岁的程序员',
  '核心需求': '学习新技术，提升技能'
};

const processed = handler.processAnswers(mockAnswers);
console.log('原始回答:', mockAnswers);
console.log('处理后:', processed);

// 测试5: 检查信息充分性
console.log('\n【测试5】检查信息充分性');
const sufficient = handler.isInfoSufficient(topic1, processed);
console.log('信息是否充分:', sufficient ? '是' : '否');

console.log('\n' + '='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
