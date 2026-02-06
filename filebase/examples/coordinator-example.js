#!/usr/bin/env node

/**
 * MAD FileBased - 协调器Agent使用示例
 * 
 * 用途：展示如何使用协调器Agent处理请求
 */

const path = require('path');
const FileManager = require('../src/lib/file-manager.js');
const CoordinatorAgent = require('../src/coordinator/agent.js');
const { Config } = require('../src/lib/config.js');
const { sleep } = require('../src/lib/utils.js');

/**
 * 示例1：创建请求并让Agent处理
 */
async function example1_agentProcessRequest() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 示例1: 创建请求并让Agent处理');
  console.log('='.repeat(60));
  
  // 使用默认配置
  const fm = new FileManager();
  const config = new Config();
  
  // 创建请求
  console.log('\n📝 创建请求...');
  const request = await fm.createRequest({
    topic: '如何提升开发团队的工作效率',
    category: '团队管理',
    tags: ['效率', '团队', '管理'],
    priority: 'medium'
  });
  
  console.log(`\n✅ 请求已创建: ${request.id}`);
  console.log(`  主题: ${request.topic}`);
  
  // 启动Agent处理请求
  console.log('\n🚀 启动Agent处理请求...');
  const agent = new CoordinatorAgent({
    config: config,
    pollInterval: 2000,
    maxRounds: 10
  });
  
  // 启动Agent（后台运行）
  const agentPromise = agent.start();
  
  // 等待处理完成
  console.log('\n⏳ 等待Agent处理请求（约10秒）...');
  await sleep(10000);
  
  // 停止Agent
  console.log('\n🛑 停止Agent...');
  await agent.stop();
  
  // 查看结果
  console.log('\n📊 处理结果:');
  const stats = agent.getStats();
  console.log(`  处理请求数: ${stats.processedRequests}`);
  console.log(`  运行时间: ${stats.uptime}秒`);
  
  // 查看生成的讨论
  if (stats.processedRequests > 0) {
    const discussions = await fm.listDiscussions();
    const discussion = discussions[0];
    
    console.log(`\n✅ 讨论已生成:`);
    console.log(`  ID: ${discussion.id}`);
    console.log(`  主题: ${discussion.topic}`);
    console.log(`  状态: ${discussion.status}`);
    
    const messages = await fm.getMessages(discussion.id);
    console.log(`  消息数: ${messages.length}`);
  }
}

/**
 * 示例2：批量创建请求
 */
async function example2_batchRequests() {
  console.log('\n' + '='.repeat(60));
  console.log('📖 示例2: 批量创建多个请求');
  console.log('='.repeat(60));
  
  const fm = new FileManager();
  const config = new Config();
  
  // 批量创建请求
  const topics = [
    { topic: 'AI编程助手的商业化路径', category: '商业化' },
    { topic: '如何优化数据库查询性能', category: '技术优化' },
    { topic: '新产品发布的营销策略', category: '市场营销' }
  ];
  
  console.log('\n📝 批量创建请求...');
  const requests = [];
  
  for (const topicData of topics) {
    const request = await fm.createRequest({
      ...topicData,
      priority: 'medium'
    });
    requests.push(request);
    console.log(`  ✅ ${request.id}: ${request.topic}`);
  }
  
  // 启动Agent处理
  console.log('\n🚀 启动Agent批量处理...');
  const agent = new CoordinatorAgent({
    config: config,
    pollInterval: 2000,
    maxRounds: 20
  });
  
  const agentPromise = agent.start();
  
  // 等待处理完成
  console.log('\n⏳ 等待批量处理完成（约30秒）...');
  await sleep(30000);
  
  // 停止Agent
  console.log('\n🛑 停止Agent...');
  await agent.stop();
  
  // 查看结果
  const stats = agent.getStats();
  console.log('\n📊 批量处理结果:');
  console.log(`  总请求数: ${stats.totalRequests}`);
  console.log(`  成功处理: ${stats.processedRequests}`);
  console.log(`  失败处理: ${stats.failedRequests}`);
  
  // 列出所有讨论
  const discussions = await fm.listDiscussions();
  console.log(`\n✅ 生成的讨论: ${discussions.length}个`);
  discussions.forEach((d, i) => {
    console.log(`  ${i + 1}. ${d.topic} (${d.status})`);
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  MAD FileBased - 协调器Agent使用示例');
  console.log('🚀'.repeat(30));
  
  try {
    // 运行示例1
    await example1_agentProcessRequest();
    
    // 询问是否继续示例2
    console.log('\n⚠️ 示例2将批量处理3个请求，需要约30秒');
    console.log('💡 如需运行，请取消注释下面的代码\n');
    
    // await example2_batchRequests();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 示例运行完成！');
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
