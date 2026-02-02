#!/usr/bin/env node

/**
 * MAD Web Server - 可视化讨论界面
 * 
 * 提供 Web 界面让用户查看讨论组内容
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { DiscussionOrchestrator } = require('../orchestrator.js');

const PORT = 18790;
const WEB_DIR = path.join(__dirname, 'public');

/**
 * 创建 Web 服务器
 */
async function createServer() {
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // 路由处理
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
      // 静态文件
      if (url.pathname === '/' || url.pathname === '/index.html') {
        const html = await fs.readFile(path.join(WEB_DIR, 'index.html'), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(200);
        res.end(html);
        return;
      }

      // CSS
      if (url.pathname === '/style.css') {
        const css = await fs.readFile(path.join(WEB_DIR, 'style.css'), 'utf8');
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.writeHead(200);
        res.end(css);
        return;
      }

      // JavaScript
      if (url.pathname === '/app.js') {
        const js = await fs.readFile(path.join(WEB_DIR, 'app.js'), 'utf8');
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.writeHead(200);
        res.end(js);
        return;
      }

      // API: 列出所有讨论
      if (url.pathname === '/api/discussions') {
        const discussions = orchestrator.listDiscussions();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(discussions, null, 2));
        return;
      }

      // API: 获取讨论详情
      if (url.pathname.startsWith('/api/discussion/')) {
        const discussionId = url.pathname.split('/')[3];
        const history = orchestrator.getDiscussionHistory(discussionId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(history, null, 2));
        return;
      }

      // API: 获取所有 Agent 统计
      if (url.pathname === '/api/agents') {
        const stats = orchestrator.getAllAgentStats();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      // API: 获取单个 Agent 统计
      if (url.pathname.startsWith('/api/agent/')) {
        const agentId = url.pathname.split('/')[3];
        const stats = orchestrator.getAgentStats(agentId);
        if (!stats) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Agent not found' }));
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      // API: 导出讨论为 Markdown
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/export\/markdown/)) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const markdown = orchestrator.exportToMarkdown(discussionId);
          res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="discussion-${discussionId}.md"`);
          res.writeHead(200);
          res.end(markdown);
          return;
        } catch (error) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 导出讨论为 JSON
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/export\/json/)) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const json = orchestrator.exportToJson(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="discussion-${discussionId}.json"`);
          res.writeHead(200);
          res.end(json);
          return;
        } catch (error) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 搜索
      if (url.pathname === '/api/search') {
        const query = url.searchParams.get('q') || '';
        const status = url.searchParams.get('status') || null;
        const role = url.searchParams.get('role') || null;
        
        if (!query) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
          return;
        }
        
        const results = orchestrator.searchDiscussions(query, { status, role });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(results, null, 2));
        return;
      }

      // API: 获取讨论统计
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/stats')) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const stats = orchestrator.getDiscussionStats(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(stats, null, 2));
          return;
        } catch (error) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 获取讨论质量评分
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/quality')) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const context = orchestrator.discussions.get(discussionId);
          if (!context) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Discussion not found' }));
            return;
          }
          const quality = orchestrator.calculateDiscussionQuality(context);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(quality, null, 2));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // 404
        const query = url.searchParams.get('q') || '';
        const status = url.searchParams.get('status') || null;
        const role = url.searchParams.get('role') || null;
        
        if (!query) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
          return;
        }
        
        const results = orchestrator.searchDiscussions(query, { status, role });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(results, null, 2));
        return;
      }

      // 404
        const discussionId = url.pathname.split('/')[3];
        try {
          const json = orchestrator.exportToJson(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="discussion-${discussionId}.json"`);
          res.writeHead(200);
          res.end(json);
          return;
        } catch (error) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 获取所有模板
      if (url.pathname === '/api/templates') {
        const templates = await orchestrator.getTemplates();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(templates, null, 2));
        return;
      }

      // API: 使用模板创建讨论
      if (url.pathname === '/api/discussion/from-template') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { templateId, params } = JSON.parse(body);
            const result = await orchestrator.createDiscussionFromTemplate(templateId, params);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify(result, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // 404
      res.writeHead(404);
      res.end('Not Found');

    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  server.listen(PORT, () => {
    console.log(`\n🌐 MAD Web Server started!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/discussions`);
    console.log(`\n按 Ctrl+C 停止服务器\n`);
  });

  return server;
}

// 启动服务器
if (require.main === module) {
  createServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { createServer };
