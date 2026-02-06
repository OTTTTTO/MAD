/**
 * MAD FileBased - 工具函数
 * 
 * 用途：提供通用的辅助函数
 */

const fs = require('fs').promises;

/**
 * 生成唯一ID
 */
function generateId(prefix = 'id') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * 生成讨论ID
 */
function generateDiscussionId() {
  return `disc-${Date.now()}`;
}

/**
 * 生成请求ID
 */
function generateRequestId(type = 'pending') {
  return `${type}-${Date.now()}`;
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return date.toISOString();
}

/**
 * 格式化时间为本地字符串
 */
function formatDate(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 解析时间范围（今天的开始和结束）
 */
function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  return {
    start: start.getTime(),
    end: end.getTime()
  };
}

/**
 * 解析时间范围（昨天的开始和结束）
 */
function getYesterdayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
  
  return {
    start: start.getTime(),
    end: end.getTime()
  };
}

/**
 * 检查ID是否为讨论ID
 */
function isDiscussionId(id) {
  return id && id.startsWith('disc-');
}

/**
 * 检查ID是否为请求ID
 */
function isRequestId(id) {
  return id && (id.startsWith('pending-') || id.startsWith('processed-'));
}

/**
 * 深度克隆对象
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 安全的JSON解析
 */
function safeJSONParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 睡眠函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 确保目录存在
 */
async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    return true;
  } catch (error) {
    console.error(`创建目录失败 (${dir}):`, error.message);
    return false;
  }
}

/**
 * 读取JSON文件
 */
async function readJSON(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * 写入JSON文件
 */
async function writeJSON(filepath, data) {
  const path = require('path');
  await ensureDir(path.dirname(filepath));
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filepath, content, 'utf8');
}

/**
 * 追加JSONL文件
 */
async function appendJSONL(filepath, data) {
  const path = require('path');
  await ensureDir(path.dirname(filepath));
  const line = JSON.stringify(data) + '\n';
  await fs.appendFile(filepath, line, 'utf8');
}

/**
 * 读取JSONL文件
 */
async function readJSONL(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    const lines = content.trim().split('\n');
    return lines
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * 错误类
 */
class MADFileError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'MADFileError';
    this.code = code;
    this.details = details;
  }
}

/**
 * 创建错误
 */
function createError(message, code, details) {
  return new MADFileError(message, code, details);
}

module.exports = {
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
};
