/**
 * MAD Agent Backend - 提供LLM能力的后端服务
 * 在OpenClaw Agent环境中运行，为Web服务器提供LLM调用接口
 */

const path = require('path');
const MAD_ROOT = path.resolve(__dirname, '..');
const { DiscussionOrchestrator } = require(path.join(MAD_ROOT, 'orchestrator.js'));
const http = require('http');
const url = require('url');

class MADAgentBackend {
  constructor(tool) {
    this.tool = tool;
    this.orchestrator = null;
    this.server = null;
    this.port = 18791; // 不同于Web服务器的端口
  }

  async initialize() {
    console.log('[MAD Agent Backend] 初始化中...');

    // 初始化Orchestrator（传入tool）
    this.orchestrator = new DiscussionOrchestrator({
      tool: this.tool  // ← 关键：注入tool！
    });

    await this.orchestrator.initialize();

    console.log('[MAD Agent Backend] ✅ Orchestrator已初始化（含LLM能力）');
    console.log('[MAD Agent Backend] DiscussionEngine状态:', this.orchestrator.discussionEngine ? '✅ 已启用' : '❌ 未启用');
  }

  start() {
    this.server = http.createServer(async (req, res) => {
      // CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;

      // 健康检查
      if (pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          llmEnabled: !!this.orchestrator.discussionEngine,
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // API: 创建LLM讨论
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

            console.log(`[MAD Agent Backend] 接收讨论请求: ${userInput}`);

            // 使用真实LLM创建讨论！
            const result = await this.orchestrator.createLLMDiscussion(userInput, {
              tags: ['Agent创建', '真实LLM'],
              priority: 'high'
            });

            console.log(`[MAD Agent Backend] 讨论创建成功: ${result.discussionId}`);
            console.log(`[MAD Agent Backend] 专家数量: ${result.summary.expertCount}`);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result, null, 2));

          } catch (error) {
            console.error('[MAD Agent Backend] 错误:', error);
            res.writeHead(500);
            res.end(JSON.stringify({
              success: false,
              error: error.message,
              stack: error.stack
            }));
          }
        });
        return;
      }

      // 404
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    this.server.listen(this.port, () => {
      console.log('\n=================================');
      console.log('🤖 MAD Agent Backend 已启动');
      console.log('📍 LLM API: http://localhost:' + this.port);
      console.log('📍 Health: http://localhost:' + this.port + '/health');
      console.log('✅ LLM能力: 已启用');
      console.log('=================================\n');
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('[MAD Agent Backend] 已停止');
    }
  }
}

// 导出工厂函数
module.exports = async function(tool, options = {}) {
  const backend = new MADAgentBackend(tool);
  await backend.initialize();
  backend.start();

  // 返回停止函数
  return {
    stop: () => backend.stop(),
    port: backend.port
  };
};

// 如果直接运行（测试）
if (require.main === module) {
  console.log('[MAD Agent Backend] 需要在OpenClaw Agent环境中运行');
  console.log('[MAD Agent Backend] 请使用: openclaw agent run mad-agent-backend');
}
