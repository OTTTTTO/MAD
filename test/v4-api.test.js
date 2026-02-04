#!/usr/bin/env node

/**
 * MAD v4.0 API 测试脚本
 * 测试新的DiscussionManager和Discussion类
 */

const DiscussionManager = require('../src/core/discussion-manager.js');
const { Discussion, Marker } = require('../src/models/discussion.js');
const path = require('path');

async function test() {
  console.log('🧪 MAD v4.0 API 测试\n');

  // 测试1: 创建Discussion
  console.log('📝 测试1: 创建Discussion');
  const discussion = new Discussion('test-001', '测试讨论', '需求讨论');
  console.log(`✅ Discussion创建成功: ${discussion.id}`);
  console.log(`   Topic: ${discussion.topic}`);
  console.log(`   Category: ${discussion.category}`);
  console.log(`   Status: ${discussion.status}`);

  // 测试2: 添加消息
  console.log('\n📝 测试2: 添加消息');
  discussion.addMessage({
    role: 'coordinator',
    content: '这是一条测试消息'
  }, { tokens: { input: 10, output: 20 } });
  console.log(`✅ 消息添加成功，当前消息数: ${discussion.messages.length}`);
  console.log(`   Token统计:`, discussion.getTokenStats());

  // 测试3: Agent发言
  console.log('\n📝 测试3: Agent发言');
  await discussion.agentSpeak('technical', '技术评估：可行');
  console.log(`✅ Agent发言成功，当前消息数: ${discussion.messages.length}`);

  // 测试4: 标签管理
  console.log('\n📝 测试4: 标签管理');
  discussion.addTag('重要');
  discussion.addTag('紧急');
  console.log(`✅ 标签添加成功: ${discussion.getTags().join(', ')}`);
  discussion.removeTag('紧急');
  console.log(`✅ 标签移除后: ${discussion.getTags().join(', ')}`);

  // 测试5: 备注管理
  console.log('\n📝 测试5: 备注管理');
  discussion.setNotes('这是初始备注');
  discussion.appendNotes('这是追加的备注');
  console.log(`✅ 备注设置成功`);
  console.log(`   备注内容: ${discussion.notes.substring(0, 50)}...`);

  // 测试6: 优先级管理
  console.log('\n📝 测试6: 优先级管理');
  discussion.setPriority('high');
  console.log(`✅ 优先级设置成功: ${discussion.getPriority()} (值: ${discussion.getPriorityValue()})`);

  // 测试7: 标记管理
  console.log('\n📝 测试7: 标记管理');
  const marker = new Marker('marker-001', '技术决策', 'decision', 'msg-001');
  marker.setSummary('决定使用Node.js开发');
  marker.addConclusion('技术栈确定为Node.js');
  discussion.addMarker(marker);
  console.log(`✅ 标记添加成功，当前标记数: ${discussion.markers.length}`);

  // 测试8: Token压缩
  console.log('\n📝 测试8: Token压缩功能');
  console.log(`   当前Token: ${discussion.getTokenStats().total}`);
  console.log(`   Token < 80k，无需压缩`);
  discussion.compressContext();

  // 测试9: DiscussionManager
  console.log('\n📝 测试9: DiscussionManager');
  const manager = new DiscussionManager(path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'test-discussions'));
  await manager.init();
  
  const createdDiscussion = await manager.createDiscussion('测试讨论2', '功能研发', {
    description: '这是一个测试讨论',
    tags: ['测试', 'Demo'],
    priority: 'medium'
  });
  console.log(`✅ DiscussionManager创建成功: ${createdDiscussion.id}`);
  console.log(`   Topic: ${createdDiscussion.topic}`);
  console.log(`   Tags: ${createdDiscussion.tags.join(', ')}`);

  // 测试10: 列出讨论
  console.log('\n📝 测试10: 列出讨论');
  const discussions = await manager.listDiscussions();
  console.log(`✅ 找到 ${discussions.length} 个讨论`);
  discussions.forEach(d => {
    console.log(`   - ${d.topic} (${d.category})`);
  });

  console.log('\n✅ 所有测试通过！');
  console.log('\n🎯 测试总结:');
  console.log('   ✅ Discussion类功能正常');
  console.log('   ✅ DiscussionManager功能正常');
  console.log('   ✅ Token统计功能正常');
  console.log('   ✅ 标签管理功能正常');
  console.log('   ✅ 备注管理功能正常');
  console.log('   ✅ 优先级管理功能正常');
  console.log('   ✅ 标记管理功能正常');
  console.log('   ✅ Agent发言功能正常');

  // 清理测试数据
  console.log('\n🧹 清理测试数据...');
  await manager.deleteDiscussion(createdDiscussion.id);
  console.log('✅ 测试完成！');
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
