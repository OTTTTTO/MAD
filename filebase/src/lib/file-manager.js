/**
 * MAD FileBased - 文件管理器
 * 
 * 用途：管理所有数据文件的读写操作
 * 
 * 功能：
 * - 讨论数据管理
 * - 消息流管理
 * - 请求队列管理
 */

const fs = require('fs').promises;
const path = require('path');

const { defaultConfig } = require('./config.js');
const {
  generateId,
  generateDiscussionId,
  generateRequestId,
  formatTimestamp,
  ensureDir,
  readJSON,
  writeJSON,
  appendJSONL,
  readJSONL,
  createError
} = require('./utils.js');

/**
 * 文件管理器类
 */
class FileManager {
  constructor(config = defaultConfig) {
    this.config = config;
  }
  
  /**
   * 初始化数据目录
   */
  async initialize() {
    console.log('[FileManager] 初始化数据目录...');
    
    const dirs = [
      this.config.getPath('dataDir'),
      this.config.getPath('discussionsDir'),
      this.config.getPath('requestsDir'),
      this.config.getPath('reportsDir'),
      this.config.getPath('processedDir'),
      this.config.getPath('failedDir')
    ];
    
    for (const dir of dirs) {
      const success = await ensureDir(dir);
      if (!success) {
        throw createError(`初始化目录失败: ${dir}`, 'DIR_INIT_ERROR');
      }
    }
    
    console.log('[FileManager] ✅ 数据目录初始化完成');
    console.log(`[FileManager] 📁 数据目录: ${this.config.getPath('dataDir')}`);
  }
  
  // ========== 讨论管理 ==========
  
  /**
   * 创建新讨论
   */
  async createDiscussion(params) {
    const {
      topic,
      category = this.config.get('defaultCategory'),
      tags = [],
      priority = this.config.get('defaultPriority'),
      participants = []
    } = params;
    
    if (!topic) {
      throw createError('讨论主题不能为空', 'MISSING_TOPIC');
    }
    
    // 生成讨论ID
    const discussionId = generateDiscussionId();
    const discussionDir = this.config.getDiscussionDir(discussionId);
    
    // 创建讨论元数据
    const discussion = {
      id: discussionId,
      topic,
      category,
      tags,
      priority,
      participants,
      status: 'pending',
      createdAt: Date.now(),
      createdBy: 'system',
      messages: []
    };
    
    // 保存讨论元数据
    await writeJSON(
      this.config.getDiscussionFile(discussionId),
      discussion
    );
    
    // 创建空的消息文件
    const messagesPath = this.config.getMessagesFile(discussionId);
    await ensureDir(path.dirname(messagesPath));
    await fs.writeFile(messagesPath, '', 'utf8');
    
    console.log(`[FileManager] ✅ 讨论已创建: ${discussionId}`);
    
    return discussion;
  }
  
  /**
   * 获取讨论
   */
  async getDiscussion(discussionId) {
    const discussionPath = this.config.getDiscussionFile(discussionId);
    
    const discussion = await readJSON(discussionPath);
    
    if (!discussion) {
      throw createError(`讨论不存在: ${discussionId}`, 'DISCUSSION_NOT_FOUND', { discussionId });
    }
    
    return discussion;
  }
  
  /**
   * 更新讨论
   */
  async updateDiscussion(discussionId, updates) {
    const discussion = await this.getDiscussion(discussionId);
    
    // 合并更新
    const updated = {
      ...discussion,
      ...updates,
      updatedAt: Date.now()
    };
    
    await writeJSON(
      this.config.getDiscussionFile(discussionId),
      updated
    );
    
    console.log(`[FileManager] ✅ 讨论已更新: ${discussionId}`);
    
    return updated;
  }
  
  /**
   * 列出所有讨论
   */
  async listDiscussions(options = {}) {
    const {
      status = null,
      limit = null,
      offset = 0
    } = options;
    
    const discussionsDir = this.config.getPath('discussionsDir');
    
    try {
      const entries = await fs.readdir(discussionsDir, { withFileTypes: true });
      
      let discussions = [];
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const discussionPath = path.join(discussionsDir, entry.name, 'discussion.json');
        
        try {
          const discussion = await readJSON(discussionPath);
          
          // 过滤状态
          if (status && discussion.status !== status) {
            continue;
          }
          
          discussions.push(discussion);
          
        } catch (error) {
          console.error(`[FileManager] 读取讨论失败 (${entry.name}):`, error.message);
        }
      }
      
      // 按创建时间倒序
      discussions.sort((a, b) => b.createdAt - a.createdAt);
      
      // 分页
      if (offset > 0) {
        discussions = discussions.slice(offset);
      }
      
      if (limit && limit > 0) {
        discussions = discussions.slice(0, limit);
      }
      
      return discussions;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * 删除讨论
   */
  async deleteDiscussion(discussionId) {
    const discussionDir = this.config.getDiscussionDir(discussionId);
    
    try {
      await fs.rm(discussionDir, { recursive: true });
      console.log(`[FileManager] ✅ 讨论已删除: ${discussionId}`);
      return true;
    } catch (error) {
      console.error(`[FileManager] 删除讨论失败 (${discussionId}):`, error.message);
      return false;
    }
  }
  
  // ========== 消息管理 ==========
  
  /**
   * 添加消息到讨论
   */
  async addMessage(discussionId, message) {
    const msg = {
      id: generateId('msg'),
      timestamp: Date.now(),
      ...message
    };
    
    // 追加到消息文件
    await appendJSONL(
      this.config.getMessagesFile(discussionId),
      msg
    );
    
    // 更新讨论的消息列表（可选，用于快速访问）
    const discussion = await this.getDiscussion(discussionId);
    discussion.messages.push(msg.id);
    discussion.updatedAt = Date.now();
    await writeJSON(
      this.config.getDiscussionFile(discussionId),
      discussion
    );
    
    console.log(`[FileManager] ✅ 消息已添加: ${msg.id} → ${discussionId}`);
    
    return msg;
  }
  
  /**
   * 获取讨论的所有消息
   */
  async getMessages(discussionId) {
    const messagesPath = this.config.getMessagesFile(discussionId);
    
    const messages = await readJSONL(messagesPath);
    
    return messages;
  }
  
  /**
   * 获取讨论的最新消息
   */
  async getLatestMessage(discussionId) {
    const messages = await this.getMessages(discussionId);
    
    if (messages.length === 0) {
      return null;
    }
    
    return messages[messages.length - 1];
  }
  
  // ========== 请求管理 ==========
  
  /**
   * 创建请求
   */
  async createRequest(params) {
    const {
      topic,
      category,
      tags = [],
      priority = 'medium',
      maxRounds = 3
    } = params;
    
    if (!topic) {
      throw createError('请求主题不能为空', 'MISSING_TOPIC');
    }
    
    // 生成请求ID
    const requestId = generateRequestId('pending');
    
    const request = {
      id: requestId,
      topic,
      category,
      tags,
      priority,
      maxRounds,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    // 保存请求
    await writeJSON(
      this.config.getRequestFile(requestId),
      request
    );
    
    console.log(`[FileManager] ✅ 请求已创建: ${requestId}`);
    
    return request;
  }
  
  /**
   * 获取请求
   */
  async getRequest(requestId) {
    const requestPath = this.config.getRequestFile(requestId);
    
    const request = await readJSON(requestPath);
    
    if (!request) {
      throw createError(`请求不存在: ${requestId}`, 'REQUEST_NOT_FOUND', { requestId });
    }
    
    return request;
  }
  
  /**
   * 列出待处理请求
   */
  async listPendingRequests() {
    const requestsDir = this.config.getPath('requestsDir');
    
    try {
      const files = await fs.readdir(requestsDir);
      
      const pendingFiles = files.filter(f => 
        f.startsWith('pending-') && f.endsWith('.json')
      );
      
      const requests = [];
      
      for (const filename of pendingFiles) {
        try {
          const requestPath = path.join(requestsDir, filename);
          const request = await readJSON(requestPath);
          requests.push(request);
        } catch (error) {
          console.error(`[FileManager] 读取请求失败 (${filename}):`, error.message);
        }
      }
      
      // 按创建时间排序
      requests.sort((a, b) => a.createdAt - b.createdAt);
      
      return requests;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * 处理请求（移动到processed目录）
   */
  async processRequest(requestId, result) {
    const request = await this.getRequest(requestId);
    
    // 标记为已处理
    request.status = 'processed';
    request.processedAt = Date.now();
    request.result = result;
    
    // 保存处理结果
    await writeJSON(
      this.config.getProcessedRequestFile(requestId),
      request
    );
    
    // 删除原请求
    const oldPath = this.config.getRequestFile(requestId);
    await fs.unlink(oldPath);
    
    console.log(`[FileManager] ✅ 请求已处理: ${requestId}`);
    
    return request;
  }
  
  /**
   * 标记请求失败
   */
  async failRequest(requestId, error) {
    const request = await this.getRequest(requestId);
    
    request.status = 'failed';
    request.failedAt = Date.now();
    request.error = error.message || error;
    
    // 移动到failed目录
    const failedPath = path.join(this.config.getPath('failedDir'), requestId);
    await writeJSON(failedPath, request);
    
    // 删除原请求
    const oldPath = this.config.getRequestFile(requestId);
    await fs.unlink(oldPath);
    
    console.log(`[FileManager] ❌ 请求失败: ${requestId}`);
    
    return request;
  }
  
  // ========== 统计管理 ==========
  
  /**
   * 获取统计信息
   */
  async getStats() {
    const discussions = await this.listDiscussions();
    
    const stats = {
      totalDiscussions: discussions.length,
      pendingDiscussions: discussions.filter(d => d.status === 'pending').length,
      activeDiscussions: discussions.filter(d => d.status === 'active').length,
      completedDiscussions: discussions.filter(d => d.status === 'completed').length,
      totalMessages: 0,
      dataDir: this.config.getPath('dataDir')
    };
    
    // 计算总消息数
    for (const discussion of discussions) {
      try {
        const messages = await this.getMessages(discussion.id);
        stats.totalMessages += messages.length;
      } catch (error) {
        // 忽略错误
      }
    }
    
    return stats;
  }
}

module.exports = FileManager;
