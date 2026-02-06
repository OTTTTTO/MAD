/**
 * MAD FileBased - 配置管理
 * 
 * 用途：管理项目的所有配置参数
 */

const path = require('path');

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  // 数据目录
  dataDir: path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss'),
  
  // 子目录
  discussionsDir: 'discussions',    // 讨论数据
  requestsDir: 'requests',         // 请求队列
  reportsDir: 'reports',           // 报告
  
  // 文件名
  discussionFile: 'discussion.json',  // 讨论元数据
  messagesFile: 'messages.jsonl',    // 消息流
  
  // 轮询配置
  pollInterval: 3000,               // 3秒
  
  // 讨论配置
  defaultMaxRounds: 3,              // 默认3轮
  defaultCategory: '需求讨论',      // 默认类别
  defaultPriority: 'medium',        // 默认优先级
  
  // 数据保留
  retentionDays: 30,                // 保留30天
  
  // 文件编码
  encoding: 'utf8'
};

/**
 * 配置类
 */
class Config {
  constructor(userConfig = {}) {
    // 合并用户配置
    this.config = {
      ...DEFAULT_CONFIG,
      ...userConfig
    };
    
    // 计算完整路径
    this.paths = {
      dataDir: this.config.dataDir,
      discussionsDir: path.join(this.config.dataDir, this.config.discussionsDir),
      requestsDir: path.join(this.config.dataDir, this.config.requestsDir),
      reportsDir: path.join(this.config.dataDir, this.config.reportsDir),
      processedDir: path.join(this.config.dataDir, this.config.requestsDir, 'processed'),
      failedDir: path.join(this.config.dataDir, this.config.requestsDir, 'failed')
    };
  }
  
  /**
   * 获取配置值
   */
  get(key) {
    return this.config[key];
  }
  
  /**
   * 获取路径
   */
  getPath(name) {
    return this.paths[name];
  }
  
  /**
   * 获取讨论目录路径
   */
  getDiscussionDir(discussionId) {
    return path.join(this.paths.discussionsDir, discussionId);
  }
  
  /**
   * 获取讨论元数据文件路径
   */
  getDiscussionFile(discussionId) {
    return path.join(this.getDiscussionDir(discussionId), this.config.discussionFile);
  }
  
  /**
   * 获取消息文件路径
   */
  getMessagesFile(discussionId) {
    return path.join(this.getDiscussionDir(discussionId), this.config.messagesFile);
  }
  
  /**
   * 获取请求文件路径
   */
  getRequestFile(requestId) {
    return path.join(this.paths.requestsDir, requestId + '.json');
  }
  
  /**
   * 获取已处理请求文件路径
   */
  getProcessedRequestFile(requestId) {
    return path.join(this.paths.processedDir, requestId + '.json');
  }
  
  /**
   * 导出配置
   */
  toJSON() {
    return {
      config: this.config,
      paths: this.paths
    };
  }
}

/**
 * 创建默认配置实例
 */
const defaultConfig = new Config();

module.exports = {
  Config,
  DEFAULT_CONFIG,
  defaultConfig
};
