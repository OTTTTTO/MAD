#!/usr/bin/env node

/**
 * MAD FileBased - 协调器Agent入口
 * 
 * 用途：启动协调器Agent，处理请求并生成讨论
 * 
 * 使用方法：
 *   node src/coordinator/index.js
 * 
 * 或者在OpenClaw中作为Agent运行
 */

const CoordinatorAgent = require('./agent.js');
const { defaultConfig } = require('../lib/config.js');

/**
 * 主函数
 */
async function main() {
  const agent = new CoordinatorAgent({
    config: defaultConfig,
    pollInterval: 3000,  // 3秒轮询一次
    maxRounds: Infinity   // 无限轮询（手动停止）
  });
  
  // 优雅退出处理
  process.on('SIGINT', async () => {
    console.log('\n\n收到停止信号，正在优雅退出...');
    await agent.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n\n收到终止信号，正在优雅退出...');
    await agent.stop();
    process.exit(0);
  });
  
  // 启动Agent
  try {
    await agent.start();
  } catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
  }
}

/**
 * 如果作为Agent运行，导出Agent类
 */
if (require.main === module) {
  main().catch(error => {
    console.error('运行失败:', error);
    process.exit(1);
  });
}

module.exports = { CoordinatorAgent, main };
