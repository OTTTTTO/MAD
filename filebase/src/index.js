/**
 * MAD FileBased - 库入口
 * 
 * 用途：统一导出所有公共模块
 */

// 配置
const { Config, defaultConfig, DEFAULT_CONFIG } = require('./lib/config.js');

// 工具
const {
  generateId,
  generateDiscussionId,
  generateRequestId,
  formatTimestamp,
  formatDate,
  getTodayRange,
  getYesterdayRange,
  isDiscussionId,
  isRequestId,
  deepClone,
  safeJSONParse,
  sleep,
  ensureDir,
  readJSON,
  writeJSON,
  appendJSONL,
  readJSONL,
  MADFileError,
  createError
} = require('./lib/utils.js');

// 文件管理器
const FileManager = require('./lib/file-manager.js');

module.exports = {
  // 配置
  Config,
  defaultConfig,
  DEFAULT_CONFIG,
  
  // 工具
  generateId,
  generateDiscussionId,
  generateRequestId,
  formatTimestamp,
  formatDate,
  getTodayRange,
  getYesterdayRange,
  isDiscussionId,
  isRequestId,
  deepClone,
  safeJSONParse,
  sleep,
  ensureDir,
  readJSON,
  writeJSON,
  appendJSONL,
  readJSONL,
  MADFileError,
  createError,
  
  // 文件管理器
  FileManager
};
