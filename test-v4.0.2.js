/**
 * v4.0.2 功能测试
 *
 * 测试内容：
 * 1. @追踪器 - 防止无限循环
 * 2. 讨论监控器 - 深度控制
 */

const MentionTracker = require('./src/core/v4/mention-tracker');
const DiscussionMonitor = require('./src/core/v4/discussion-monitor');

console.log('='.repeat(60));
console.log('MAD v4.0.2 功能测试');
console.log('='.repeat(60));

// 测试1: @追踪器
console.log('\n【测试1】@追踪器');
const tracker = new MentionTracker({ maxChainLength: 5 });

console.log('测试场景：专家A@专家B，专家B@专家A（乒乓效应）');

// 第一次@：允许
let result = tracker.canMention('A', 'B', '需要B的意见');
console.log('A@B:', result.allowed ? '✅ 允许' : '❌ 拒绝', result.message || '');
if (result.allowed) tracker.recordMention('A', 'B', '需要B的意见');

// 第二次@：允许
result = tracker.canMention('B', 'A', '需要A的意见');
console.log('B@A:', result.allowed ? '✅ 允许' : '❌ 拒绝', result.message || '');
if (result.allowed) tracker.recordMention('B', 'A', '需要A的意见');

// 第三次@：应该拒绝（乒乓检测）
result = tracker.canMention('A', 'B', '再次需要B的意见');
console.log('A@B (第3次):', result.allowed ? '✅ 允许' : '❌ 拒绝', result.message);

console.log('\n@链状态:', tracker.getStatus());

// 测试2: 讨论监控器
console.log('\n【测试2】讨论监控器');
const monitor = new DiscussionMonitor({
  maxExpertRounds: 3,
  maxTotalRounds: 10
});

// 模拟讨论
const discussion = {
  messages: [
    { expert: 'A', content: '这是我的观点', type: 'ANSWER' },
    { expert: 'B', content: '这是我的观点', type: 'ANSWER' },
    { expert: 'A', content: '需要B的意见', type: 'MENTION', mention: ['B'] },
    { expert: 'B', content: '需要A的意见', type: 'MENTION', mention: ['A'] },
    { expert: 'A', content: '再次需要B的意见', type: 'MENTION', mention: ['B'] }
  ]
};

result = monitor.checkIntervention(discussion);
console.log('介入检查:', result.intervene ? '⚠️ 需要介入' : '✅ 继续讨论');
if (result.intervene) {
  console.log('原因:', result.reason);
  console.log('说明:', result.message);
}

console.log('\n统计信息:', monitor.getStats());

console.log('\n' + '='.repeat(60));
console.log('测试完成！');
console.log('='.repeat(60));
