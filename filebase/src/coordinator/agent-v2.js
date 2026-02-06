/**
 * MAD FileBased - 协调器Agent（重构版）
 * 
 * 用途：主协调逻辑，使用真实的subAgent
 * 
 * 变更：
 * - 接收tool参数并传递给RequestHandler
 * - 使用新的RequestHandler（handler-v2.js）
 */

const FileManager = require('../lib/file-manager.js');
const { defaultConfig } = require('../lib/config.js');
const RequestHandler = require('./handler-v2.js');
const { sleep, formatDate } = require('../lib/utils.js');

/**
 * 协调器Agent类（重构版）
 */
class CoordinatorAgent {
  constructor(options = {}) {
    this.config = options.config || defaultConfig;
    this.fm = new FileManager(this.config);
    this.handler = new RequestHandler(this.fm);
    this.tool = options.tool || null; // OpenClaw tool对象
    
    // 运行状态
    this.running = false;
    this.stopped = false;
    
    // 配置
    this.pollInterval = options.pollInterval || this.config.get('pollInterval');
    this.maxRounds = options.maxRounds || 100;
    
    // 统计
    this.stats = {
      totalRequests: 0,
      processedRequests: 0,
      failedRequests: 0,
      startTime: null,
      endTime: null
    };
  }
  
  /**
   * 设置tool（必须在start之前调用）
   */
  setTool(tool) {
    this.tool = tool;
    this.handler.setTool(tool);
    console.log('[Coordinator] ✅ Tool已设置');
  }
  
  /**
   * 启动Agent
   */
  async start() {
    if (this.running) {
      console.log('[Coordinator] Agent已在运行中');
      return;
    }
    
    if (!this.tool) {
      throw new Error('未设置tool对象，请使用setTool()方法设置');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MAD FileBased - 协调器Agent启动（重构版）');
    console.log('='.repeat(60));
    
    this.running = true;
    this.stopped = false;
    this.stats.startTime = Date.now();
    
    try {
      // 初始化文件管理器
      console.log('\n[Coordinator] 初始化文件管理器...');
      await this.fm.initialize();
      console.log('[Coordinator] ✅ 文件管理器初始化完成');
      
      // 显示配置
      console.log('\n[Coordinator] 配置信息:');
      console.log(`  数据目录: ${this.config.getPath('dataDir')}`);
      console.log(`  轮询间隔: ${this.pollInterval}ms`);
      console.log(`  最大轮次: ${this.maxRounds}`);
      console.log(`  SubAgent: 真实AI模式 (使用tool.sessions_spawn)`);
      
      // 开始轮询
      await this.pollLoop();
      
    } catch (error) {
      console.error('\n[Coordinator] ❌ 启动失败:', error.message);
      this.running = false;
      throw error;
    }
  }
  
  /**
   * 轮询循环
   */
  async pollLoop() {
    console.log('\n[Coordinator] 开始轮询请求...');
    console.log('[Coordinator] 提示: 使用 Ctrl+C 停止\n');
    
    let round = 0;
    
    while (this.running && round < this.maxRounds) {
      round++;
      
      try {
        // 检查是否有pending请求
        const pendingRequests = await this.fm.listPendingRequests();
        
        if (pendingRequests.length > 0) {
          console.log(`\n[Coordinator] 发现 ${pendingRequests.length} 个待处理请求`);
          
          // 处理每个请求
          for (const request of pendingRequests) {
            if (!this.running) break;
            
            await this.processRequest(request);
          }
        } else {
          // 无请求，显示等待提示
          if (round % 10 === 0) {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            console.log(`[Coordinator] 等待请求... (运行时间: ${uptime}秒, 轮次: ${round})`);
          }
        }
        
        // 等待下一次轮询
        if (this.running) {
          await sleep(this.pollInterval);
        }
        
      } catch (error) {
        console.error(`\n[Coordinator] ❌ 轮询错误 (轮次 ${round}):`, error.message);
        
        // 继续运行，不因为单次错误而停止
        if (this.running) {
          await sleep(this.pollInterval);
        }
      }
    }
    
    // 退出轮询
    this.stopped = true;
    this.stats.endTime = Date.now();
    
    console.log('\n' + '='.repeat(60));
    console.log('🛑 协调器Agent已停止');
    console.log('='.repeat(60));
    
    this.printStats();
  }
  
  /**
   * 处理单个请求
   */
  async processRequest(request) {
    this.stats.totalRequests++;
    
    console.log(`\n[Coordinator] 处理请求 ${this.stats.totalRequests}: ${request.id}`);
    console.log(`[Coordinator] 主题: ${request.topic}`);
    
    try {
      // 使用handler处理请求（现在会调用真实subAgent）
      const result = await this.handler.processRequest(request);
      
      // 标记请求为已处理
      await this.fm.processRequest(request.id, result);
      
      this.stats.processedRequests++;
      
      console.log(`[Coordinator] ✅ 请求处理成功: ${request.id}`);
      console.log(`[Coordinator] 讨论ID: ${result.discussionId}`);
      
    } catch (error) {
      console.error(`[Coordinator] ❌ 请求处理失败: ${request.id}`);
      console.error(`[Coordinator] 错误: ${error.message}`);
      
      // 标记请求为失败
      await this.fm.failRequest(request.id, error);
      
      this.stats.failedRequests++;
    }
  }
  
  /**
   * 停止Agent
   */
  async stop() {
    if (!this.running) {
      console.log('[Coordinator] Agent未在运行');
      return;
    }
    
    console.log('\n[Coordinator] 正在停止...');
    this.running = false;
    
    // 等待轮询循环结束
    while (!this.stopped) {
      await sleep(100);
    }
    
    console.log('[Coordinator] ✅ 已停止');
  }
  
  /**
   * 打印统计信息
   */
  printStats() {
    const uptime = this.stats.endTime 
      ? Math.floor((this.stats.endTime - this.stats.startTime) / 1000)
      : 0;
    
    console.log('\n📊 运行统计:');
    console.log(`  运行时间: ${uptime}秒`);
    console.log(`  总请求数: ${this.stats.totalRequests}`);
    console.log(`  成功处理: ${this.stats.processedRequests}`);
    console.log(`  失败处理: ${this.stats.failedRequests}`);
    
    if (this.stats.totalRequests > 0) {
      const successRate = (this.stats.processedRequests / this.stats.totalRequests * 100).toFixed(1);
      console.log(`  成功率: ${successRate}%`);
    }
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      uptime: this.stats.endTime 
        ? Math.floor((this.stats.endTime - this.stats.startTime) / 1000)
        : Math.floor((Date.now() - this.stats.startTime) / 1000),
      running: this.running
    };
  }
}

module.exports = CoordinatorAgent;
