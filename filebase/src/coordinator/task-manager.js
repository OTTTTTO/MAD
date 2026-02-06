/**
 * MAD FileBased - 任务文件管理器
 * 
 * 用途：管理主协调器和subAgent之间的任务通信
 * 
 * 功能：
 * - 写入任务文件
 * - 读取任务文件
 * - 写入响应文件
 * - 读取响应文件
 * - 等待响应完成
 */

const fs = require('fs').promises;
const path = require('path');
const { 
  ensureDir, 
  readJSON, 
  writeJSON, 
  sleep,
  generateId,
  createError
} = require('../lib/utils.js');

/**
 * 任务文件管理器类
 */
class TaskManager {
  constructor(config) {
    this.config = config;
    this.tasksDir = path.join(this.config.getPath('dataDir'), 'tasks');
    this.responsesDir = path.join(this.config.getPath('dataDir'), 'responses');
  }
  
  /**
   * 初始化目录
   */
  async initialize() {
    await ensureDir(this.tasksDir);
    await ensureDir(this.responsesDir);
  }
  
  /**
   * 写入任务文件
   */
  async writeTask(discussionId, task) {
    const taskFile = path.join(this.tasksDir, `${discussionId}.json`);
    
    const taskData = {
      id: discussionId,
      type: 'expert_analysis',
      topic: task.topic,
      category: task.category,
      context: task.context || {},
      requirements: task.requirements || [],
      createdAt: Date.now(),
      status: 'pending'
    };
    
    await writeJSON(taskFile, taskData);
    
    console.log(`[TaskManager] ✅ 任务已写入: ${discussionId}.json`);
    
    return taskFile;
  }
  
  /**
   * 读取任务文件
   */
  async readTask(discussionId) {
    const taskFile = path.join(this.tasksDir, `${discussionId}.json`);
    
    const task = await readJSON(taskFile);
    
    if (!task) {
      throw createError(`任务不存在: ${discussionId}`, 'TASK_NOT_FOUND');
    }
    
    return task;
  }
  
  /**
   * 写入专家响应
   */
  async writeResponse(discussionId, expertId, response) {
    const responseFile = path.join(this.responsesDir, `${discussionId}-${expertId}.json`);
    
    const responseData = {
      discussionId,
      expertId,
      response,
      timestamp: Date.now()
    };
    
    await writeJSON(responseFile, responseData);
    
    console.log(`[TaskManager] ✅ 响应已写入: ${expertId}`);
    
    return responseFile;
  }
  
  /**
   * 读取专家响应
   */
  async readResponse(discussionId, expertId) {
    const responseFile = path.join(this.responsesDir, `${discussionId}-${expertId}.json`);
    
    const response = await readJSON(responseFile);
    
    if (!response) {
      throw createError(`响应不存在: ${expertId}`, 'RESPONSE_NOT_FOUND');
    }
    
    return response;
  }
  
  /**
   * 读取所有响应
   */
  async readAllResponses(discussionId) {
    const pattern = `${discussionId}-*.json`;
    
    try {
      const files = await fs.readdir(this.responsesDir);
      
      const responseFiles = files.filter(f => 
        f.startsWith(`${discussionId}-`) && f.endsWith('.json')
      );
      
      const responses = [];
      
      for (const filename of responseFiles) {
        try {
          const filepath = path.join(this.responsesDir, filename);
          const response = await readJSON(filepath);
          responses.push(response);
        } catch (error) {
          console.error(`[TaskManager] 读取响应失败 (${filename}):`, error.message);
        }
      }
      
      return responses;
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * 等待所有专家响应
   */
  async waitForResponses(discussionId, expertCount, timeoutMs = 60000) {
    const startTime = Date.now();
    const checkInterval = 1000; // 每秒检查一次
    
    console.log(`[TaskManager] ⏳ 等待 ${expertCount} 个专家响应...`);
    
    while (Date.now() - startTime < timeoutMs) {
      const responses = await this.readAllResponses(discussionId);
      
      if (responses.length >= expertCount) {
        console.log(`[TaskManager] ✅ 所有响应已收到 (${responses.length}/${expertCount})`);
        return responses;
      }
      
      console.log(`[TaskManager] 等待中... (${responses.length}/${expertCount})`);
      await sleep(checkInterval);
    }
    
    throw createError('等待响应超时', 'TIMEOUT', {
      discussionId,
      expected: expertCount,
      received: responses.length
    });
  }
  
  /**
   * 清理任务和响应文件
   */
  async cleanup(discussionId) {
    try {
      const taskFile = path.join(this.tasksDir, `${discussionId}.json`);
      await fs.unlink(taskFile);
      
      const responseFiles = await fs.readdir(this.responsesDir);
      for (const filename of responseFiles) {
        if (filename.startsWith(`${discussionId}-`)) {
          const filepath = path.join(this.responsesDir, filename);
          await fs.unlink(filepath);
        }
      }
      
      console.log(`[TaskManager] ✅ 已清理任务文件: ${discussionId}`);
      
    } catch (error) {
      console.error(`[TaskManager] 清理失败:`, error.message);
    }
  }
}

module.exports = TaskManager;
