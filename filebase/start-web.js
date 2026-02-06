#!/usr/bin/env node

/**
 * MAD FileBased - Web服务器启动脚本
 * 
 * 用途：启动Web界面服务器
 */

const WebServer = require('./src/web/server.js');

async function main() {
  console.log('\n🚀 启动MAD Web服务器...\n');

  const server = new WebServer({
    port: 3000
  });

  try {
    await server.start();

    // 优雅退出
    process.on('SIGINT', async () => {
      console.log('\n\n收到停止信号，正在关闭服务器...\n');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n收到终止信号，正在关闭服务器...\n');
      await server.stop();
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

module.exports = { main, WebServer };
