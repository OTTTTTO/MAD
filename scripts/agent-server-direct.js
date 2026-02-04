/**
 * MAD Agent Server - 直接启动版本
 * 在OpenClaw Agent中直接require此文件来启动服务器
 *
 * 使用方法（在Agent任务中）：
 * "请加载并运行 /home/otto/.npm-global/lib/node_modules/openclaw/skills/MAD/scripts/agent-server-direct.js"
 */

// 启动HTTP服务器（同步）
async function startAgentServer(tool) {
  const http = require('http');
  const url = require('url');
  const path = require('path');

  const MAD_ROOT = path.resolve(__dirname, '..');
  const { DiscussionOrchestrator } = require(path.join(MAD_ROOT, 'orchestrator.js'));

  const PORT = 18791;

  console.log('[MAD Agent Server] 初始化中...');

  // 初始化Orchestrator（带tool）
  const orchestrator = new DiscussionOrchestrator({ tool });
  await orchestrator.initialize();

  console.log('[MAD Agent Server] ✅ Orchestrator已初始化（含LLM能力）');
  console.log('[MAD Agent Server] DiscussionEngine状态:', orchestrator.discussionEngine ? '✅ 已启用' : '❌ 未启用');

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const pathname = url.parse(req.url).pathname;

    // 健康检查
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        llmEnabled: !!orchestrator.discussionEngine,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // 创建LLM讨论
    if (pathname === '/api/agent/create-discussion' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { userInput } = JSON.parse(body);

          if (!userInput) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: '缺少 userInput 参数' }));
            return;
          }

          console.log(`[MAD Agent Server] 接收讨论请求: ${userInput}`);

          const result = await orchestrator.createLLMDiscussion(userInput, {
            tags: ['Agent创建', '真实LLM'],
            priority: 'high'
          });

          console.log(`[MAD Agent Server] 讨论创建成功: ${result.discussionId}`);
          console.log(`[MAD Agent Server] 专家数量: ${result.summary.expertCount}`);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result, null, 2));

        } catch (error) {
          console.error('[MAD Agent Server] 错误:', error);
          res.writeHead(500);
          res.end(JSON.stringify({
            success: false,
            error: error.message
          }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🤖 MAD Agent Server 已启动');
    console.log('📍 LLM API: http://localhost:' + PORT);
    console.log('📍 Health: http://localhost:' + PORT + '/health');
    console.log('✅ LLM能力: 已启用');
    console.log('=================================\n');
  });

  return server;
}

// 导出启动函数（供Agent使用）
module.exports = async function(tool) {
  const server = await startAgentServer(tool);

  // 保持运行
  return new Promise((resolve) => {
    // 永不resolve，保持服务器运行
    console.log('[MAD Agent Server] 服务器运行中，按Ctrl+C停止');
  });
};

// 如果直接运行（不应该发生）
if (require.main === module) {
  console.log('[MAD Agent Server] 请在OpenClaw Agent环境中使用require()加载');
}
