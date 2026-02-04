/**
 * MAD Agent Server Launcher
 * 在OpenClaw Agent会话中启动HTTP服务器
 *
 * 使用方法：
 * 在Agent任务中：
 * "请执行 node /path/to/launch-agent-server.js 并保持运行"
 */

const path = require('path');

// 设置超时，防止会话超时
if (process.env.OPENCLAW_AGENT_SESSION) {
  console.log('[MAD Agent Server Launcher] 在Agent会话中运行');
  console.log('[MAD Agent Server Launcher] 启动HTTP服务器...');

  // 动态导入agent-server模块
  const MAD_ROOT = path.resolve(__dirname, '..');
  const agentServerPath = path.join(MAD_ROOT, 'scripts', 'agent-server.js');

  // 直接运行agent-server
  require(agentServerPath);

} else {
  console.error('[MAD Agent Server Launcher] 错误：需要在OpenClaw Agent环境中运行');
  process.exit(1);
}
