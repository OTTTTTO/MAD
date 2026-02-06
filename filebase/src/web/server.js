/**
 * MAD FileBased - Web服务器
 * 
 * 用途：提供HTTP API和Web界面，无需tool对象
 * 
 * 功能：
 * - 静态文件服务
 * - API路由
 * - 读取讨论和消息
 * - 创建新请求
 */

const express = require('express');
const path = require('path');
const FileManager = require('../lib/file-manager.js');
const { defaultConfig } = require('../lib/config.js');

/**
 * Web服务器类
 */
class WebServer {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || 3000;
    this.fm = new FileManager(options.config || defaultConfig);
    
    // 中间件
    this.setupMiddleware();
    
    // 路由
    this.setupRoutes();
  }
  
  /**
   * 设置中间件
   */
  setupMiddleware() {
    // JSON解析
    this.app.use(express.json());
    
    // 静态文件
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    // 日志
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }
  
  /**
   * 设置路由
   */
  setupRoutes() {
    // 健康检查
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        service: 'MAD FileBased Web'
      });
    });
    
    // 统计信息
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.fm.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // 讨论列表
    this.app.get('/api/discussions', async (req, res) => {
      try {
        const { status, limit, offset } = req.query;
        
        const discussions = await this.fm.listDiscussions({
          status: status || null,
          limit: limit ? parseInt(limit) : null,
          offset: offset ? parseInt(offset) : 0
        });
        
        res.json({
          total: discussions.length,
          discussions
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // 单个讨论
    this.app.get('/api/discussions/:id', async (req, res) => {
      try {
        const discussion = await this.fm.getDiscussion(req.params.id);
        res.json(discussion);
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });
    
    // 讨论消息
    this.app.get('/api/discussions/:id/messages', async (req, res) => {
      try {
        const discussion = await this.fm.getDiscussion(req.params.id);
        const messages = await this.fm.getMessages(req.params.id);
        res.json({
          discussion,
          messages,
          total: messages.length
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // 创建请求
    this.app.post('/api/requests', async (req, res) => {
      try {
        const { topic, category, tags, priority, maxRounds } = req.body;

        if (!topic) {
          return res.status(400).json({ error: '主题不能为空' });
        }

        const request = await this.fm.createRequest({
          topic,
          category: category || '需求讨论',
          tags: tags || [],
          priority: priority || 'medium',
          maxRounds: maxRounds || 3
        });

        res.status(201).json({
          success: true,
          request
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 创建讨论（直接创建，无需通过请求队列）
    this.app.post('/api/discussions', async (req, res) => {
      try {
        const { topic, category, tags, priority } = req.body;

        if (!topic) {
          return res.status(400).json({ error: '主题不能为空' });
        }

        const discussion = await this.fm.createDiscussion({
          topic,
          category: category || '需求讨论',
          tags: tags || [],
          priority: priority || 'medium'
        });

        res.status(201).json({
          success: true,
          discussion
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // 待处理请求列表
    this.app.get('/api/requests/pending', async (req, res) => {
      try {
        const requests = await this.fm.listPendingRequests();
        res.json({
          total: requests.length,
          requests
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // 主页重定向
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
    
    // 404
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  }
  
  /**
   * 启动服务器
   */
  async start() {
    try {
      // 初始化FileManager
      await this.fm.initialize();
      
      // 启动HTTP服务器
      this.server = this.app.listen(this.port, () => {
        console.log('\n' + '='.repeat(60));
        console.log('🚀 MAD FileBased - Web服务器');
        console.log('='.repeat(60));
        console.log(`\n✅ 服务器已启动`);
        console.log(`   地址: http://localhost:${this.port}`);
        console.log(`   数据目录: ${this.fm.config.getPath('dataDir')}\n`);
        console.log('📖 API端点:');
        console.log(`   GET  /api/health`);
        console.log(`   GET  /api/stats`);
        console.log(`   GET  /api/discussions`);
        console.log(`   POST /api/discussions`);
        console.log(`   GET  /api/discussions/:id`);
        console.log(`   GET  /api/discussions/:id/messages`);
        console.log(`   POST /api/requests`);
        console.log(`   GET  /api/requests/pending`);
        console.log('\n' + '='.repeat(60) + '\n');
      });
      
    } catch (error) {
      console.error('启动失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止服务器
   */
  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('✅ Web服务器已停止');
          resolve();
        });
      });
    }
  }
}

module.exports = WebServer;
