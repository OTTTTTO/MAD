/**
 * MAD 工具库入口
 * 导出所有通用工具
 */

const logger = require('./logger.js');
const errors = require('./errors.js');
const config = require('./config.js');

module.exports = {
  // 日志
  ...logger,

  // 错误处理
  ...errors,

  // 配置管理
  ...config
};
