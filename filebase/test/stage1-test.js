#!/usr/bin/env node

/**
 * MAD FileBased - 阶段1测试
 * 
 * 用途：测试文件管理器的基本功能
 * 
 * 测试内容：
 * 1. 配置管理
 * 2. 工具函数
 * 3. 文件管理器
 * - 创建讨论
 * - 添加消息
 * - 列出讨论
 * - 请求管理
 */

const path = require('path');

// 导入模块
const { Config, defaultConfig } = require('../src/lib/config.js');
const {
  generateId,
  generateDiscussionId,
  generateRequestId,
  formatTimestamp,
  formatDate
} = require('../src/lib/utils.js');
const FileManager = require('../src/lib/file-manager.js');

// 测试数据目录（使用临时目录）
const TEST_DATA_DIR = path.join(process.env.TMPDIR || '/tmp', 'mad-filebased-test');

/**
 * 测试配置
 */
async function testConfig() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试1: 配置管理');
  console.log('='.repeat(60));
  
  try {
    // 使用测试数据目录
    const config = new Config({ dataDir: TEST_DATA_DIR });
    
    console.log('\n✅ 配置创建成功');
    console.log(`  数据目录: ${config.getPath('dataDir')}`);
    console.log(`  讨论目录: ${config.getPath('discussionsDir')}`);
    console.log(`  请求目录: ${config.getPath('requestsDir')}`);
    
    // 测试路径生成
    const discussionId = generateDiscussionId();
    console.log(`\n✅ 路径生成测试:`);
    console.log(`  讨论ID: ${discussionId}`);
    console.log(`  讨论目录: ${config.getDiscussionDir(discussionId)}`);
    console.log(`  元数据文件: ${config.getDiscussionFile(discussionId)}`);
    console.log(`  消息文件: ${config.getMessagesFile(discussionId)}`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 配置测试失败:', error.message);
    return false;
  }
}

/**
 * 测试工具函数
 */
async function testUtils() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试2: 工具函数');
  console.log('='.repeat(60));
  
  try {
    // ID生成
    const id1 = generateId('test');
    const discId = generateDiscussionId();
    const reqId = generateRequestId();
    
    console.log('\n✅ ID生成测试:');
    console.log(`  普通ID: ${id1}`);
    console.log(`  讨论ID: ${discId}`);
    console.log(`  请求ID: ${reqId}`);
    
    // 时间格式化
    const now = Date.now();
    const timestamp = formatTimestamp(now);
    const dateStr = formatDate(now);
    
    console.log('\n✅ 时间格式化测试:');
    console.log(`  时间戳: ${timestamp}`);
    console.log(`  本地时间: ${dateStr}`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 工具函数测试失败:', error.message);
    return false;
  }
}

/**
 * 测试文件管理器
 */
async function testFileManager() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试3: 文件管理器');
  console.log('='.repeat(60));
  
  try {
    // 使用测试配置
    const config = new Config({ dataDir: TEST_DATA_DIR });
    const fm = new FileManager(config);
    
    // 初始化
    console.log('\n📁 初始化数据目录...');
    await fm.initialize();
    
    // 创建讨论
    console.log('\n📝 创建讨论...');
    const discussion = await fm.createDiscussion({
      topic: '测试讨论：文件管理器功能验证',
      category: '功能测试',
      tags: ['测试', '文件系统'],
      priority: 'high'
    });
    
    console.log(`\n✅ 讨论创建成功:`);
    console.log(`  ID: ${discussion.id}`);
    console.log(`  主题: ${discussion.topic}`);
    console.log(`  状态: ${discussion.status}`);
    console.log(`  创建时间: ${formatDate(discussion.createdAt)}`);
    
    // 添加消息
    console.log('\n💬 添加消息...');
    const msg1 = await fm.addMessage(discussion.id, {
      role: 'coordinator',
      content: '开始讨论测试...'
    });
    
    const msg2 = await fm.addMessage(discussion.id, {
      role: 'agent',
      agentId: 'test-agent',
      agentName: '测试专家',
      content: '文件管理器工作正常！'
    });
    
    console.log(`\n✅ 消息添加成功:`);
    console.log(`  消息1: ${msg1.id} - ${msg1.content}`);
    console.log(`  消息2: ${msg2.id} - ${msg2.content}`);
    
    // 获取讨论
    console.log('\n📖 读取讨论...');
    const retrieved = await fm.getDiscussion(discussion.id);
    console.log(`\n✅ 讨论读取成功: ${retrieved.topic}`);
    
    // 获取消息
    console.log('\n📜 读取消息...');
    const messages = await fm.getMessages(discussion.id);
    console.log(`\n✅ 消息读取成功: 共${messages.length}条消息`);
    messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}] ${msg.content}`);
    });
    
    // 列出讨论
    console.log('\n📋 列出所有讨论...');
    const discussions = await fm.listDiscussions();
    console.log(`\n✅ 讨论列表: 共${discussions.length}个讨论`);
    discussions.forEach(d => {
      console.log(`  - ${d.id}: ${d.topic} (${d.status})`);
    });
    
    // 创建请求
    console.log('\n📨 创建请求...');
    const request = await fm.createRequest({
      topic: '测试请求：请创建一个新讨论',
      category: '功能测试',
      priority: 'medium',
      maxRounds: 2
    });
    
    console.log(`\n✅ 请求创建成功:`);
    console.log(`  ID: ${request.id}`);
    console.log(`  主题: ${request.topic}`);
    console.log(`  状态: ${request.status}`);
    
    // 列出待处理请求
    console.log('\n📬 列出待处理请求...');
    const pendingRequests = await fm.listPendingRequests();
    console.log(`\n✅ 待处理请求: 共${pendingRequests.length}个请求`);
    pendingRequests.forEach(r => {
      console.log(`  - ${r.id}: ${r.topic}`);
    });
    
    // 获取统计
    console.log('\n📊 获取统计信息...');
    const stats = await fm.getStats();
    console.log('\n✅ 统计信息:');
    console.log(`  总讨论数: ${stats.totalDiscussions}`);
    console.log(`  待处理: ${stats.pendingDiscussions}`);
    console.log(`  进行中: ${stats.activeDiscussions}`);
    console.log(`  已完成: ${stats.completedDiscussions}`);
    console.log(`  总消息数: ${stats.totalMessages}`);
    
    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await fm.deleteDiscussion(discussion.id);
    await fm.processRequest(request.id, { success: true });
    
    console.log('\n✅ 测试数据已清理');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 文件管理器测试失败:', error.message);
    console.error('   错误堆栈:', error.stack);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '🚀'.repeat(30));
  console.log('  MAD FileBased - 阶段1测试');
  console.log('🚀'.repeat(30));
  
  const results = {
    config: false,
    utils: false,
    fileManager: false
  };
  
  // 运行测试
  results.config = await testConfig();
  results.utils = await testUtils();
  results.fileManager = await testFileManager();
  
  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;
  
  console.log(`\n总计: ${total} 项`);
  console.log(`通过: ${passed} 项 ✅`);
  console.log(`失败: ${failed} 项 ❌`);
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！阶段1开发完成。\n');
    console.log('📁 测试数据目录:', TEST_DATA_DIR);
    console.log('💡 提示：可以检查测试数据目录查看生成的文件\n');
    return 0;
  } else {
    console.log('\n⚠️ 部分测试失败，请检查错误信息\n');
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
