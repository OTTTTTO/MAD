#!/usr/bin/env node

/**
 * MAD FileBased - 协调器Agent启动脚本
 *
 * 用途：启动协调器Agent，处理pending的讨论
 */

const CoordinatorAgent = require('./src/coordinator/agent.js');
const { Config } = require('./src/lib/config.js');

async function main() {
  console.log('\n🚀 启动MAD协调器Agent...\n');

  const config = new Config();
  const agent = new CoordinatorAgent({
    config: config,
    pollInterval: 5000,  // 每5秒检查一次pending讨论
    maxRounds: 10        // 最多10轮讨论
  });

  try {
    await agent.start();

    console.log('\n✅ 协调器Agent已启动');
    console.log('   - 轮询间隔: 5秒');
    console.log('   - 最大轮次: 10轮');
    console.log('   - 数据目录:', config.getPath('dataDir'));
    console.log('\n💡 提示: 请确保Web服务器也在运行 (localhost:3000)');
    console.log('   按 Ctrl+C 停止\n');

    // 优雅退出
    process.on('SIGINT', async () => {
      console.log('\n\n收到停止信号，正在关闭Agent...\n');
      await agent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n收到终止信号，正在关闭Agent...\n');
      await agent.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ 启动失败:', error);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error('运行失败:', error);
    process.exit(1);
  });
}

module.exports = { main, CoordinatorAgent };
