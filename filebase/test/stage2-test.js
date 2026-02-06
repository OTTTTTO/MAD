#!/usr/bin/env node

/**
 * MAD FileBased - 阶段2测试
 * 
 * 用途：测试协调器Agent的功能
 * 
 * 测试内容：
 * 1. 创建测试请求
 * 2. 启动协调器Agent
 * 3. 处理请求
 * 4. 验证生成的讨论
 */

const path = require('path');
const fs = require('fs').promises;

const FileManager = require('../src/lib/file-manager.js');
const CoordinatorAgent = require('../src/coordinator/agent.js');
const { Config, defaultConfig } = require('../src/lib/config.js');
const { sleep } = require('../src/lib/utils.js');

// 测试数据目录
const TEST_DATA_DIR = path.join(process.env.TMPDIR || '/tmp', 'mad-stage2-test');

/**
 * 测试协调器Agent
 */
async function testCoordinatorAgent() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试: 协调器Agent');
  console.log('='.repeat(60));
  
  try {
    // 使用测试配置
    const testConfig = new Config({ dataDir: TEST_DATA_DIR });
    const fm = new FileManager(testConfig);
    
    // 初始化
    console.log('\n📁 初始化测试环境...');
    await fm.initialize();
    
    // 创建测试请求
    console.log('\n📝 创建测试请求...');
    const request = await fm.createRequest({
      topic: '如何设计一个高性能的微服务架构',
      category: '技术架构',
      tags: ['微服务', '性能', '架构'],
      priority: 'high',
      maxRounds: 3
    });
    
    console.log(`\n✅ 测试请求已创建: ${request.id}`);
    console.log(`  主题: ${request.topic}`);
    console.log(`  类别: ${request.category}`);
    
    // 启动协调器Agent
    console.log('\n🚀 启动协调器Agent...');
    const agent = new CoordinatorAgent({
      config: testConfig,
      pollInterval: 1000,  // 1秒轮询
      maxRounds: 10        // 最多10轮
    });
    
    // 启动Agent（在后台运行）
    const agentPromise = agent.start();
    
    // 等待请求处理（最多等待15秒）
    console.log('\n⏳ 等待请求处理...');
    let processed = false;
    let attempts = 0;
    const maxAttempts = 15;
    
    while (!processed && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;
      
      // 检查是否有已处理的请求
      const processedPath = path.join(TEST_DATA_DIR, 'requests', 'processed', request.id);
      try {
        await fs.access(processedPath);
        processed = true;
        console.log(`\n✅ 请求已在第${attempts}秒处理完成`);
      } catch (error) {
        // 还未处理
        if (attempts % 3 === 0) {
          console.log(`  等待中... (${attempts}秒)`);
        }
      }
    }
    
    // 停止Agent
    console.log('\n🛑 停止Agent...');
    await agent.stop();
    
    // 验证结果
    console.log('\n📊 验证结果...');
    
    // 检查讨论是否创建
    const discussions = await fm.listDiscussions();
    console.log(`\n✅ 讨论数量: ${discussions.length}`);
    
    if (discussions.length > 0) {
      const discussion = discussions[0];
      console.log(`\n📋 讨论详情:`);
      console.log(`  ID: ${discussion.id}`);
      console.log(`  主题: ${discussion.topic}`);
      console.log(`  状态: ${discussion.status}`);
      console.log(`  参与者: ${discussion.participants.length}个`);
      
      // 获取消息
      const messages = await fm.getMessages(discussion.id);
      console.log(`\n💬 消息数量: ${messages.length}`);
      
      console.log(`\n📜 讨论内容:`);
      messages.forEach((msg, i) => {
        const sender = msg.agentName || msg.role;
        console.log(`\n  ${i + 1}. 【${sender}】`);
        console.log(`     ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
      });
      
      // 检查请求是否处理
      const processedPath = path.join(TEST_DATA_DIR, 'requests', 'processed', request.id);
      try {
        await fs.access(processedPath);
        console.log(`\n✅ 请求已处理: ${request.id}`);
      } catch (error) {
        console.log(`\n⚠️ 请求处理文件未找到`);
      }
    } else {
      console.log('\n⚠️ 未找到讨论');
      return false;
    }
    
    // 获取统计信息
    const stats = agent.getStats();
    console.log('\n📊 Agent统计:');
    console.log(`  总请求数: ${stats.totalRequests}`);
    console.log(`  成功处理: ${stats.processedRequests}`);
    console.log(`  失败处理: ${stats.failedRequests}`);
    console.log(`  运行时间: ${stats.uptime}秒`);
    
    // 验证检查清单
    console.log('\n' + '='.repeat(60));
    console.log('✅ 验证清单');
    console.log('='.repeat(60));
    
    const checks = [
      { name: '请求创建', pass: request !== null },
      { name: '讨论创建', pass: discussions.length > 0 },
      { name: '讨论状态', pass: discussions[0]?.status === 'completed' },
      { name: '消息生成', pass: discussions[0]?.messages.length > 0 },
      { name: '请求处理', pass: stats.processedRequests === 1 }
    ];
    
    checks.forEach(check => {
      console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
    });
    
    const allPassed = checks.every(c => c.pass);
    
    if (allPassed) {
      console.log('\n🎉 所有检查通过！阶段2测试成功。\n');
      return true;
    } else {
      console.log('\n⚠️ 部分检查未通过，请检查日志。\n');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('   错误堆栈:', error.stack);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  MAD FileBased - 阶段2测试');
  console.log('  协调器Agent功能验证');
  console.log('🚀'.repeat(30));
  
  const success = await testCoordinatorAgent();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('\n✅ 阶段2测试通过！\n');
    console.log('📁 测试数据目录:', TEST_DATA_DIR);
    console.log('💡 提示：可以检查测试数据目录查看生成的文件\n');
    return 0;
  } else {
    console.log('\n❌ 阶段2测试失败，请检查错误信息\n');
    return 1;
  }
}

// 运行测试
runTests()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('\n❌ 测试执行失败:', error);
    process.exit(1);
  });
