#!/usr/bin/env node

/**
 * MAD FileBased - 使用示例
 * 
 * 用途：展示如何使用文件管理器
 */

const path = require('path');
const FileManager = require('../src/lib/file-manager.js');
const { defaultConfig } = require('../src/lib/config.js');

/**
 * 示例1：创建讨论
 */
async function example1_createDiscussion() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 示例1: 创建讨论并添加消息');
  console.log('='.repeat(60));
  
  // 使用默认配置
  const fm = new FileManager(defaultConfig);
  
  // 初始化
  await fm.initialize();
  
  // 创建讨论
  const discussion = await fm.createDiscussion({
    topic: '如何设计一个高可用的系统架构',
    category: '技术讨论',
    tags: ['架构', '高可用'],
    priority: 'high'
  });
  
  console.log(`\n✅ 讨论已创建: ${discussion.id}`);
  
  // 添加消息
  await fm.addMessage(discussion.id, {
    role: 'coordinator',
    content: '欢迎各位专家参与讨论！'
  });
  
  await fm.addMessage(discussion.id, {
    role: 'agent',
    agentId: 'technical',
    agentName: '技术专家',
    content: '我认为应该采用微服务架构，配合负载均衡。'
  });
  
  await fm.addMessage(discussion.id, {
    role: 'agent',
    agentId: 'product',
    agentName: '产品专家',
    content: '从产品角度看，需要考虑用户体验和数据一致性。'
  });
  
  // 读取并展示讨论
  const retrieved = await fm.getDiscussion(discussion.id);
  const messages = await fm.getMessages(discussion.id);
  
  console.log(`\n📋 讨论详情:`);
  console.log(`  主题: ${retrieved.topic}`);
  console.log(`  状态: ${retrieved.status}`);
  console.log(`  消息数: ${messages.length}`);
  
  console.log(`\n💬 讨论内容:`);
  messages.forEach((msg, i) => {
    const sender = msg.agentName || msg.role;
    console.log(`  ${i + 1}. 【${sender}】`);
    console.log(`     ${msg.content}\n`);
  });
  
  return discussion.id;
}

/**
 * 示例2：列出讨论
 */
async function example2_listDiscussions() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 示例2: 列出所有讨论');
  console.log('='.repeat(60));
  
  const fm = new FileManager(defaultConfig);
  
  // 列出所有讨论
  const discussions = await fm.listDiscussions();
  
  console.log(`\n📋 共找到 ${discussions.length} 个讨论:\n`);
  
  discussions.forEach((d, i) => {
    console.log(`${i + 1}. ${d.id}`);
    console.log(`   主题: ${d.topic}`);
    console.log(`   类别: ${d.category}`);
    console.log(`   状态: ${d.status}`);
    console.log(`   创建时间: ${new Date(d.createdAt).toLocaleString('zh-CN')}`);
    console.log('');
  });
}

/**
 * 示例3：创建请求
 */
async function example3_createRequest() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 示例3: 创建处理请求');
  console.log('='.repeat(60));
  
  const fm = new FileManager(defaultConfig);
  
  // 创建请求
  const request = await fm.createRequest({
    topic: '请帮我评估AI编程助手的开发成本',
    category: '需求评估',
    tags: ['成本', 'AI'],
    priority: 'high',
    maxRounds: 5
  });
  
  console.log(`\n✅ 请求已创建: ${request.id}`);
  console.log(`   主题: ${request.topic}`);
  console.log(`   类别: ${request.category}`);
  console.log(`   优先级: ${request.priority}`);
  console.log(`   最大轮次: ${request.maxRounds}`);
  
  // 列出待处理请求
  const pending = await fm.listPendingRequests();
  
  console.log(`\n📬 待处理请求: ${pending.length}个`);
  pending.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.id}: ${r.topic}`);
  });
}

/**
 * 示例4：获取统计信息
 */
async function example4_getStats() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 示例4: 获取统计信息');
  console.log('='.repeat(60));
  
  const fm = new FileManager(defaultConfig);
  
  const stats = await fm.getStats();
  
  console.log('\n📊 系统统计:');
  console.log(`  数据目录: ${stats.dataDir}`);
  console.log(`  总讨论数: ${stats.totalDiscussions}`);
  console.log(`  状态分布:`);
  console.log(`    - 待处理: ${stats.pendingDiscussions}`);
  console.log(`    - 进行中: ${stats.activeDiscussions}`);
  console.log(`    - 已完成: ${stats.completedDiscussions}`);
  console.log(`  总消息数: ${stats.totalMessages}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  MAD FileBased - 使用示例');
  console.log('🚀'.repeat(30));
  
  try {
    // 运行示例
    await example1_createDiscussion();
    await example2_listDiscussions();
    await example3_createRequest();
    await example4_getStats();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有示例运行完成！');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ 运行失败:', error.message);
    console.error('   错误堆栈:', error.stack);
  }
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
