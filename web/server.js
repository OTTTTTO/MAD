#!/usr/bin/env node

/**
 * MAD Web Server - 可视化讨论界面
 * 
 * 提供 Web 界面让用户查看讨论组内容
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { DiscussionOrchestrator, TagManager, FavoritesManager, SnapshotManager, RestoreManager, BranchManager } = require('../orchestrator.js');
const { parseMentions, validateMentions, highlightMentions } = require('../src/core/mention.js');
const { createReply, getReplies, getReplyTree } = require('../src/core/reply.js');
const { compareSnapshots, formatDiffHTML } = require('../src/features/version/diff.js');

const PORT = 18790;
const WEB_DIR = path.join(__dirname, 'public');

/**
 * 创建 Web 服务器
 */
async function createServer() {
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  const tagManager = new TagManager();
  const favoritesManager = new FavoritesManager();

  // 版本管理器（已在 orchestrator 中初始化）
  const snapshotManager = orchestrator.snapshotManager;
  const restoreManager = orchestrator.restoreManager;
  const branchManager = orchestrator.branchManager;

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

      // v3.0 项目组视图
      if (url.pathname === '/project-view' || url.pathname === '/project-view.html') {
        const html = await fs.readFile(path.join(WEB_DIR, 'project-view.html'), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.writeHead(200);
        res.end(html);
        return;
      }

      // v3.0 原型界面
      if (url.pathname === '/index-v3' || url.pathname === '/index-v3.html') {
        const html = await fs.readFile(path.join(WEB_DIR, 'index-v3.html'), 'utf8');
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

      // Shortcuts.css
      if (url.pathname === '/shortcuts.css') {
        const css = await fs.readFile(path.join(WEB_DIR, 'shortcuts.css'), 'utf8');
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

      // Shortcuts.js
      if (url.pathname === '/shortcuts.js') {
        const js = await fs.readFile(path.join(__dirname, 'shortcuts.js'), 'utf8');
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

      // API: 获取讨论详情（必须是纯 /api/discussion/:id 格式，不能有其他路径段）
      // 这个路由放在最后，避免拦截其他 /api/discussion/:id/* 路由
      // 移到文件末尾处理

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

      // v2.5.3: API: 获取讨论中所有 Agent 的状态
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/agent-states/)) {
        const discussionId = url.pathname.split('/')[3];
        const states = orchestrator.getAgentStates(discussionId);
        if (!states) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Discussion not found' }));
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(states, null, 2));
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

      // API: 导出讨论为 PDF
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/export\/pdf/)) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const result = await orchestrator.exportToPDF(discussionId);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="discussion-${discussionId}.pdf"`);
          res.setHeader('Content-Length', result.size);
          res.writeHead(200);
          res.end(result.data);
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 导出讨论为 HTML
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/export\/html/)) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const result = await orchestrator.exportToHTML(discussionId);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="discussion-${discussionId}.html"`);
          res.setHeader('Content-Length', result.size);
          res.writeHead(200);
          res.end(result.data);
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 导出讨论为 CSV
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/export\/csv/)) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const result = await orchestrator.exportToCSV(discussionId);
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="discussion-${discussionId}.csv"`);
          res.setHeader('Content-Length', result.size);
          res.writeHead(200);
          res.end(result.data);
          return;
        } catch (error) {
          res.writeHead(500);
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

      // ==================== 参与者管理 API ====================

      // API: 获取所有可用的 Agents
      if (url.pathname === '/api/agents') {
        try {
          const agents = orchestrator.getAvailableAgents();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(agents, null, 2));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 获取当前讨论的参与者列表
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/participants')) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const participants = orchestrator.getParticipants(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(participants, null, 2));
          return;
        } catch (error) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 添加 Agent 到讨论
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.includes('/participants/') && req.method === 'POST') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const agentId = parts[5];
        try {
          const result = orchestrator.addParticipant(discussionId, agentId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, participant: result }, null, 2));
          return;
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: error.message }));
          return;
        }
      }

      // API: 从讨论中移除 Agent
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.includes('/participants/') && req.method === 'DELETE') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const agentId = parts[5];
        try {
          const result = orchestrator.removeParticipant(discussionId, agentId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, participant: result }, null, 2));
          return;
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: error.message }));
          return;
        }
      }

      // API: 获取参与者统计信息
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/participant-stats')) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const stats = orchestrator.getParticipantStats(discussionId);
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

      // ==================== 质量评分 API ====================

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

      // API: 推荐参与者
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/recommendations')) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const context = orchestrator.discussions.get(discussionId);
          if (!context) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Discussion not found' }));
            return;
          }
          
          const currentParticipants = context.participants.map(p => p.role);
          const recommendations = orchestrator.recommendParticipants(context.topic, currentParticipants);
          
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(recommendations, null, 2));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 获取待办事项
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/actions')) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const context = orchestrator.discussions.get(discussionId);
          if (!context) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Discussion not found' }));
            return;
          }
          
          const actionItems = orchestrator.extractActionItems(context);
          
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(actionItems, null, 2));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 获取相似讨论
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/similar')) {
        const discussionId = url.pathname.split('/')[3];
        const threshold = parseFloat(url.searchParams.get('threshold')) || 0.1;
        const limit = parseInt(url.searchParams.get('limit')) || 10;

        try {
          const similar = await orchestrator.findSimilarDiscussions(discussionId, threshold, limit);

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(similar, null, 2));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // API: 合并讨论
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/merge')) {
        const discussionId = url.pathname.split('/')[3];
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { sourceIds } = JSON.parse(body);
            
            if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'sourceIds is required and must be a non-empty array' }));
              return;
            }
            
            const result = await orchestrator.mergeDiscussions(discussionId, sourceIds);
            
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

      // API: 全局搜索
      if (url.pathname.startsWith('/api/search')) {
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

      // API: 导出讨论为 JSON
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/export')) {
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

      // API: 获取模板市场
      if (url.pathname === '/api/market') {
        const market = await orchestrator.getTemplateMarket();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(market, null, 2));
        return;
      }

      // API: 搜索市场模板
      if (url.pathname === '/api/market/search') {
        const query = url.searchParams.get('q') || '';
        const category = url.searchParams.get('category') || null;
        const tags = url.searchParams.get('tags')?.split(',') || null;
        const minRating = parseFloat(url.searchParams.get('minRating')) || 0;

        const results = await orchestrator.searchMarketTemplates(query, { category, tags, minRating });
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(results, null, 2));
        return;
      }

      // API: 获取市场模板详情
      if (url.pathname.startsWith('/api/market/')) {
        const templateId = url.pathname.split('/')[3];
        const template = await orchestrator.getMarketTemplate(templateId);
        
        if (!template) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Template not found' }));
          return;
        }
        
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(template, null, 2));
        return;
      }

      // API: 对市场模板评分
      if (url.pathname.startsWith('/api/market/') && url.pathname.endsWith('/rate')) {
        const templateId = url.pathname.split('/')[3];
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { rating, comment, user } = JSON.parse(body);
            
            if (rating < 1 || rating > 5) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'Rating must be between 1 and 5' }));
              return;
            }
            
            const template = await orchestrator.rateMarketTemplate(templateId, rating, comment, user);
            
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify(template, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 从市场创建讨论
      if (url.pathname === '/api/discussion/from-market') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { templateId, params } = JSON.parse(body);
            const result = await orchestrator.createDiscussionFromMarket(templateId, params);

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

      // API: 获取自定义 Agent 列表
      if (url.pathname === '/api/agents/custom') {
        const data = await orchestrator.getCustomAgents();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(data, null, 2));
        return;
      }

      // API: 获取单个自定义 Agent
      if (url.pathname.startsWith('/api/agents/custom/')) {
        const agentId = url.pathname.split('/')[4];
        const agent = await orchestrator.getCustomAgent(agentId);

        if (!agent) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Agent not found' }));
          return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(agent, null, 2));
        return;
      }

      // API: 创建自定义 Agent
      if (url.pathname === '/api/agents/custom' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const agentData = JSON.parse(body);
            const agent = await orchestrator.createCustomAgent(agentData);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(201);
            res.end(JSON.stringify(agent, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 更新自定义 Agent
      if (url.pathname.startsWith('/api/agents/custom/') && req.method === 'PUT') {
        const agentId = url.pathname.split('/')[4];

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const updates = JSON.parse(body);
            const agent = await orchestrator.updateCustomAgent(agentId, updates);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify(agent, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 删除自定义 Agent
      if (url.pathname.startsWith('/api/agents/custom/') && req.method === 'DELETE') {
        const agentId = url.pathname.split('/')[4];

        try {
          const result = await orchestrator.deleteCustomAgent(agentId);

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 测试 Agent
      if (url.pathname.startsWith('/api/agents/custom/') && url.pathname.endsWith('/test')) {
        const agentId = url.pathname.split('/')[4];

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { testMessage } = JSON.parse(body);
            const result = await orchestrator.testCustomAgent(agentId, testMessage);

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

      // API: 获取所有可用 Agent
      if (url.pathname === '/api/agents/all') {
        const allAgents = await orchestrator.loadAllAgents();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(allAgents, null, 2));
        return;
      }

      // ===== 标签系统 API =====

      // API: 获取所有标签
      if (url.pathname === '/api/tags' && req.method === 'GET') {
        const tags = tagManager.getAllTags();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(tags, null, 2));
        return;
      }

      // API: 创建标签
      if (url.pathname === '/api/tags' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { name, color, icon } = JSON.parse(body);
            const tag = await tagManager.createTag(name, color, icon);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(201);
            res.end(JSON.stringify(tag, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 更新标签
      if (url.pathname.startsWith('/api/tags/') && req.method === 'PUT') {
        const tagId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const updates = JSON.parse(body);
            const tag = await tagManager.updateTag(tagId, updates);
            if (!tag) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'Tag not found' }));
              return;
            }
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify(tag, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 删除标签
      if (url.pathname.startsWith('/api/tags/') && req.method === 'DELETE') {
        const tagId = url.pathname.split('/')[3];
        const success = await tagManager.deleteTag(tagId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success }, null, 2));
        return;
      }

      // API: 获取讨论的建议标签
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/suggest-tags') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const history = orchestrator.getDiscussionHistory(discussionId);
        const content = history.messages.map(m => m.content).join(' ');
        const suggestions = tagManager.suggestTags(content);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(suggestions, null, 2));
        return;
      }

      // ===== 收藏夹 API =====

      // API: 获取所有收藏夹
      if (url.pathname === '/api/favorites' && req.method === 'GET') {
        const favorites = favoritesManager.getAllFavorites();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(favorites, null, 2));
        return;
      }

      // API: 创建收藏夹
      if (url.pathname === '/api/favorites' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { name, icon, description } = JSON.parse(body);
            const favorite = await favoritesManager.createFavorite(name, icon, description);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(201);
            res.end(JSON.stringify(favorite, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 更新收藏夹
      if (url.pathname.startsWith('/api/favorites/') && req.method === 'PUT') {
        const favId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const updates = JSON.parse(body);
            const favorite = await favoritesManager.updateFavorite(favId, updates);
            if (!favorite) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'Favorite not found' }));
              return;
            }
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify(favorite, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 删除收藏夹
      if (url.pathname.startsWith('/api/favorites/') && req.method === 'DELETE') {
        const favId = url.pathname.split('/')[3];
        const success = await favoritesManager.deleteFavorite(favId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success }, null, 2));
        return;
      }

      // API: 添加讨论到收藏夹
      if (url.pathname.startsWith('/api/favorites/') && url.pathname.endsWith('/add') && req.method === 'POST') {
        const favId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { discussionId } = JSON.parse(body);
            const success = await favoritesManager.addDiscussionToFavorite(favId, discussionId);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify({ success }, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 从收藏夹移除讨论
      if (url.pathname.startsWith('/api/favorites/') && url.pathname.endsWith('/remove') && req.method === 'POST') {
        const favId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { discussionId } = JSON.parse(body);
            const success = await favoritesManager.removeDiscussionFromFavorite(favId, discussionId);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(200);
            res.end(JSON.stringify({ success }, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 检查讨论是否收藏
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/favorited') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const isFavorited = favoritesManager.isDiscussionFavorited(discussionId);
        const favorites = favoritesManager.getDiscussionFavorites(discussionId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ isFavorited, favorites }, null, 2));
        return;
      }

      // API: 从模板创建讨论
      if (url.pathname.startsWith('/api/templates/') && url.pathname.endsWith('/create') && req.method === 'POST') {
        const templateId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const params = JSON.parse(body);
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

      // ===== v2.5.0 全局搜索 API =====

      // API: 全局搜索
      if (url.pathname === '/api/search' && req.method === 'GET') {
        const query = url.searchParams.get('q') || '';
        const scope = url.searchParams.get('scope') || 'all';
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        const sortBy = url.searchParams.get('sortBy') || 'relevance';

        if (!query) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Query parameter "q" is required' }));
          return;
        }

        const results = await orchestrator.search(query, { scope, limit, offset, sortBy });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(results, null, 2));
        return;
      }

      // API: 获取搜索历史
      if (url.pathname === '/api/search/history' && req.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const history = orchestrator.getSearchHistory(limit);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(history, null, 2));
        return;
      }

      // API: 清除搜索历史
      if (url.pathname === '/api/search/history' && req.method === 'DELETE') {
        if (orchestrator.searchManager) {
          orchestrator.searchManager.clearSearchHistory();
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }, null, 2));
        return;
      }

      // API: 获取热门关键词
      if (url.pathname === '/api/search/hot' && req.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit')) || 10;
        const keywords = orchestrator.getHotKeywords(limit);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(keywords, null, 2));
        return;
      }

      // API: 获取搜索建议
      if (url.pathname === '/api/search/suggestions' && req.method === 'GET') {
        const query = url.searchParams.get('q') || '';
        const limit = parseInt(url.searchParams.get('limit')) || 5;
        const suggestions = orchestrator.getSearchSuggestions(query, limit);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(suggestions, null, 2));
        return;
      }

      // API: 获取搜索统计
      if (url.pathname === '/api/search/stats' && req.method === 'GET') {
        const stats = orchestrator.getSearchStats();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      // ===== v2.5.0 缓存管理 API =====

      // API: 获取缓存统计
      if (url.pathname === '/api/cache/stats' && req.method === 'GET') {
        const stats = orchestrator.getCacheStats();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      // API: 清除所有缓存
      if (url.pathname === '/api/cache' && req.method === 'DELETE') {
        orchestrator.clearCache();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }, null, 2));
        return;
      }

      // API: 清除特定讨论的缓存
      if (url.pathname.startsWith('/api/cache/discussion/') && req.method === 'DELETE') {
        const discussionId = url.pathname.split('/')[4];
        orchestrator.clearDiscussionCache(discussionId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }, null, 2));
        return;
      }

      // ===== v2.5.2 历史管理 API =====

      // API: 获取历史统计
      if (url.pathname === '/api/history/stats' && req.method === 'GET') {
        const stats = orchestrator.getHistoryStats();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
        return;
      }

      // API: 获取旧讨论列表
      if (url.pathname === '/api/history/old' && req.method === 'GET') {
        const days = parseInt(url.searchParams.get('days')) || 30;
        const discussions = orchestrator.getOldDiscussions(days);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(discussions, null, 2));
        return;
      }

      // API: 归档讨论
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/archive') && req.method === 'POST') {
        const discussionId = url.pathname.split('/')[3];
        try {
          const result = await orchestrator.archiveDiscussion(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 批量归档旧讨论
      if (url.pathname === '/api/history/archive-batch' && req.method === 'POST') {
        const days = parseInt(url.searchParams.get('days')) || 30;
        try {
          const result = await orchestrator.archiveOldDiscussions(days);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 删除讨论
      if (url.pathname.startsWith('/api/discussion/') && req.method === 'DELETE') {
        const discussionId = url.pathname.split('/')[3];
        try {
          const result = await orchestrator.deleteDiscussion(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // v2.5.4: API: 清空讨论消息
      if (url.pathname.match(/\/api\/discussion\/[^/]+\/clear/) && req.method === 'POST') {
        const discussionId = url.pathname.split('/')[3];
        try {
          const result = await orchestrator.clearDiscussionMessages(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 清理已结束的讨论
      if (url.pathname === '/api/history/clear-ended' && req.method === 'POST') {
        try {
          const result = await orchestrator.clearEndedDiscussions();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 获取归档列表
      if (url.pathname === '/api/history/archives' && req.method === 'GET') {
        try {
          const archives = await orchestrator.getArchiveList();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(archives, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 恢复归档
      if (url.pathname.startsWith('/api/history/restore/') && req.method === 'POST') {
        const discussionId = url.pathname.split('/')[4];
        try {
          const result = await orchestrator.restoreFromArchive(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 获取存储使用情况
      if (url.pathname === '/api/history/storage' && req.method === 'GET') {
        try {
          const usage = await orchestrator.getStorageUsage();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(usage, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // ===== v2.5.0 分页加载 API =====

      // API: 获取讨论消息（分页）
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/messages') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 50;

        try {
          const result = await orchestrator.getMessagesPaginated(discussionId, page, pageSize);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 按时间范围获取消息
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/messages/time-range') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const startTime = parseInt(url.searchParams.get('startTime'));
        const endTime = parseInt(url.searchParams.get('endTime'));
        const limit = parseInt(url.searchParams.get('limit')) || 100;

        try {
          const result = await orchestrator.getMessagesByTimeRange(discussionId, startTime, endTime, limit);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 按角色获取消息（分页）
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.includes('/messages/role/') && req.method === 'GET') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const role = parts[5];
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 50;

        try {
          const result = await orchestrator.getMessagesByRole(discussionId, role, page, pageSize);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 获取最新消息
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/messages/latest') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const count = parseInt(url.searchParams.get('count')) || 20;

        try {
          const result = await orchestrator.getLatestMessages(discussionId, count);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 获取消息统计
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/messages/stats') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];

        try {
          const stats = await orchestrator.getMessageStats(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(stats, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // API: 获取快照（分页）
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/snapshots-paged') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 20;

        try {
          const result = await orchestrator.getSnapshotsPaginated(discussionId, page, pageSize);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(result, null, 2));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
        }
        return;
      }

      // ===== @提及和回复 API =====

      // API: 获取讨论中的所有 @提及
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/mentions') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const mentions = orchestrator.collaboration.getAllMentions(discussionId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(mentions, null, 2));
        return;
      }

      // API: 获取消息的回复
      if (url.pathname.startsWith('/api/message/') && url.pathname.endsWith('/replies') && req.method === 'GET') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const messageId = parts[4];
        const replies = orchestrator.collaboration.getMessageReplies(discussionId, messageId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(replies, null, 2));
        return;
      }

      // API: 获取回复树
      if (url.pathname.startsWith('/api/message/') && url.pathname.endsWith('/tree') && req.method === 'GET') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const messageId = parts[4];
        const maxDepth = parseInt(url.searchParams.get('maxDepth') || '3');
        const tree = orchestrator.collaboration.getReplyTree(discussionId, messageId, maxDepth);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(tree, null, 2));
        return;
      }

      // API: 搜索消息
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/search') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const query = url.searchParams.get('q') || '';
        const type = url.searchParams.get('type') || 'all';
        const results = orchestrator.collaboration.searchDiscussionMessages(discussionId, query, type);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(results, null, 2));
        return;
      }

      // API: 检查 Agent 是否被提及
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.includes('/mentioned/') && req.method === 'GET') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const agentId = parts[5];
        const isMentioned = orchestrator.collaboration.isAgentMentionedInDiscussion(discussionId, agentId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ isMentioned }, null, 2));
        return;
      }

      // API: 获取 Agent 收到的提及
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.includes('/mentions-for/') && req.method === 'GET') {
        const parts = url.pathname.split('/');
        const discussionId = parts[3];
        const agentId = parts[5];
        const mentions = orchestrator.collaboration.getMentionsForAgent(discussionId, agentId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(mentions, null, 2));
        return;
      }

      // ===== 版本控制 API =====

      // API: 创建快照
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/snapshot') && req.method === 'POST') {
        const discussionId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { description, tags, type } = JSON.parse(body);
            const snapshot = await orchestrator.snapshotManager.createSnapshot(discussionId, {
              description,
              tags,
              type
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(201);
            res.end(JSON.stringify(snapshot, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 获取快照列表
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/snapshots') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const snapshots = await orchestrator.snapshotManager.getSnapshots(discussionId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(snapshots, null, 2));
        return;
      }

      // API: 获取快照详情
      if (url.pathname.startsWith('/api/snapshot/') && req.method === 'GET') {
        const snapshotId = url.pathname.split('/')[3];
        const snapshot = await orchestrator.snapshotManager.getSnapshot(snapshotId);
        if (!snapshot) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Snapshot not found' }));
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(snapshot, null, 2));
        return;
      }

      // API: 删除快照
      if (url.pathname.startsWith('/api/snapshot/') && req.method === 'DELETE') {
        const snapshotId = url.pathname.split('/')[3];
        const success = await orchestrator.snapshotManager.deleteSnapshot(snapshotId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success }, null, 2));
        return;
      }

      // API: 比较版本
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/compare') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const fromSnapshotId = url.searchParams.get('from');
        const toSnapshotId = url.searchParams.get('to');

        if (!fromSnapshotId || !toSnapshotId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Missing from or to parameter' }));
          return;
        }

        const snapshot1 = await orchestrator.snapshotManager.getSnapshot(fromSnapshotId);
        const snapshot2 = await orchestrator.snapshotManager.getSnapshot(toSnapshotId);

        if (!snapshot1 || !snapshot2) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Snapshot not found' }));
          return;
        }

        const changes = compareSnapshots(snapshot1, snapshot2);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(changes, null, 2));
        return;
      }

      // API: 恢复快照
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/restore') && req.method === 'POST') {
        const discussionId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { snapshotId, mode } = JSON.parse(body);
            const result = await orchestrator.restoreManager.restore(discussionId, snapshotId, { mode });
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

      // API: 创建分支
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/branch') && req.method === 'POST') {
        const discussionId = url.pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { name, description, snapshotId } = JSON.parse(body);
            const branch = await orchestrator.branchManager.createBranch(discussionId, {
              name,
              description,
              snapshotId
            });
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.writeHead(201);
            res.end(JSON.stringify(branch, null, 2));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
          }
        });
        return;
      }

      // API: 获取分支列表
      if (url.pathname.startsWith('/api/discussion/') && url.pathname.endsWith('/branches') && req.method === 'GET') {
        const discussionId = url.pathname.split('/')[3];
        const branches = await orchestrator.branchManager.getBranches(discussionId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify(branches, null, 2));
        return;
      }

      // API: 删除分支
      if (url.pathname.startsWith('/api/branch/') && req.method === 'DELETE') {
        const branchId = url.pathname.split('/')[3];
        const success = await orchestrator.branchManager.deleteBranch(branchId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.writeHead(200);
        res.end(JSON.stringify({ success }, null, 2));
        return;
      }

      // API: 获取讨论详情（必须是纯 /api/discussion/:id 格式，不能有其他路径段）
      // 放在所有特定路由之后，避免拦截 /stats、/participants 等路由
      if (url.pathname.match(/^\/api\/discussion\/[^/]+$/)) {
        const discussionId = url.pathname.split('/')[3];
        try {
          const history = orchestrator.getDiscussionHistory(discussionId);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.writeHead(200);
          res.end(JSON.stringify(history, null, 2));
          return;
        } catch (error) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }

      // ==================== v3.6.0 项目组 API ====================
      
      // API: 列出所有项目组
      if (url.pathname === '/api/projects' || url.pathname === '/api/projects/list') {
        try {
          const ProjectManager = require('../src/core/project-manager.js');
          const pm = new ProjectManager();
          await pm.init();
          const projects = await pm.listProjects();
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify(projects));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }
      
      // API: 获取项目统计
      if (url.pathname.startsWith('/api/projects/statistics')) {
        try {
          const ProjectManager = require('../src/core/project-manager.js');
          const pm = new ProjectManager();
          await pm.init();
          const stats = await pm.getStatistics();
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify(stats));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }
      
      // API: 搜索项目
      if (url.pathname.startsWith('/api/projects/search')) {
        try {
          const ProjectManager = require('../src/core/project-manager.js');
          const pm = new ProjectManager();
          await pm.init();
          const query = url.searchParams.get('q') || '';
          const limit = parseInt(url.searchParams.get('limit')) || 10;
          const results = await pm.searchProjects(query, { limit });
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify(results));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }
      
      // API: 获取项目详情
      if (url.pathname.match(/^\/api\/project\/[^/]+$/)) {
        try {
          const projectId = url.pathname.split('/')[3];
          const ProjectManager = require('../src/core/project-manager.js');
          const pm = new ProjectManager();
          await pm.init();
          const project = await pm.loadProject(projectId);
          if (!project) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Project not found' }));
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify(project));
          return;
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: error.message }));
          return;
        }
      }
      
      // ==================== v3.6.0 项目组 API 结束 ====================

      // 404
      res.writeHead(404);
      res.end('Not Found');

    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 MAD Web Server started!`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 Network: http://0.0.0.0:${PORT}`);
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
