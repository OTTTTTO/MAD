/**
 * 时间戳工具函数
 * 统一处理时间格式化和计算
 */

/**
 * 格式化时间戳为中文格式
 * @param {number|string|Date} timestamp - 时间戳
 * @param {boolean} includeSeconds - 是否包含秒
 * @returns {string} 格式化的时间字符串
 */
function formatTimestamp(timestamp, includeSeconds = true) {
  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  if (includeSeconds) {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 计算两个时间戳之间的时长
 * @param {number|string|Date} start - 开始时间
 * @param {number|string|Date} end - 结束时间
 * @returns {string} 时长描述
 */
function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Unknown';
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}天${diffHours % 24}小时`;
  } else if (diffHours > 0) {
    return `${diffHours}小时${diffMins % 60}分钟`;
  } else if (diffMins > 0) {
    return `${diffMins}分钟${diffSecs % 60}秒`;
  } else {
    return `${diffSecs}秒`;
  }
}

/**
 * 获取相对时间描述
 * @param {number|string|Date} timestamp - 时间戳
 * @returns {string} 相对时间描述
 */
function getRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}天前`;

  return formatTimestamp(timestamp, false);
}

/**
 * 解析 ISO 时间字符串
 * @param {string} isoString - ISO 时间字符串
 * @returns {Date} 日期对象
 */
function parseISO(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoString}`);
  }
  return date;
}

/**
 * 获取当前时间戳（毫秒）
 * @returns {number} 时间戳
 */
function now() {
  return Date.now();
}

/**
 * 判断时间戳是否在指定范围内
 * @param {number} timestamp - 时间戳
 * @param {number} rangeMs - 时间范围（毫秒）
 * @returns {boolean} 是否在范围内
 */
function isWithinRange(timestamp, rangeMs) {
  const diff = Math.abs(now() - timestamp);
  return diff <= rangeMs;
}

module.exports = {
  formatTimestamp,
  calculateDuration,
  getRelativeTime,
  parseISO,
  now,
  isWithinRange
};
