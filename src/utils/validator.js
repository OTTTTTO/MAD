/**
 * 消息验证工具
 * 验证消息格式和内容的完整性
 */

/**
 * 验证消息对象的基本结构
 * @param {object} message - 消息对象
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateMessage(message) {
  const errors = [];

  if (!message) {
    return { valid: false, errors: ['消息对象为空'] };
  }

  // 检查必需字段
  if (!message.role || typeof message.role !== 'string') {
    errors.push('role 字段缺失或无效');
  }

  if (!message.content || typeof message.content !== 'string') {
    errors.push('content 字段缺失或无效');
  }

  // 检查时间戳
  if (!message.timestamp) {
    errors.push('timestamp 字段缺失');
  } else if (isNaN(new Date(message.timestamp).getTime())) {
    errors.push('timestamp 格式无效');
  }

  // 检查消息类型（如果存在）
  if (message.type && typeof message.type !== 'string') {
    errors.push('type 字段必须是字符串');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证消息数组
 * @param {array} messages - 消息数组
 * @returns {object} { valid: boolean, errorCount: number, errors: object[] }
 */
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return {
      valid: false,
      errorCount: 1,
      errors: [{ index: -1, errors: ['输入不是数组'] }]
    };
  }

  const errors = [];
  let invalidCount = 0;

  messages.forEach((msg, index) => {
    const result = validateMessage(msg);
    if (!result.valid) {
      invalidCount++;
      errors.push({
        index,
        role: msg.role,
        errors: result.errors
      });
    }
  });

  return {
    valid: invalidCount === 0,
    errorCount: invalidCount,
    errors
  };
}

/**
 * 验证讨论配置
 * @param {object} config - 配置对象
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
  const errors = [];

  if (!config) {
    return { valid: false, errors: ['配置对象为空'] };
  }

  // 检查必需字段
  if (!config.topic || typeof config.topic !== 'string') {
    errors.push('topic 字段缺失或无效');
  }

  if (!config.participants || !Array.isArray(config.participants)) {
    errors.push('participants 字段缺失或不是数组');
  } else if (config.participants.length === 0) {
    errors.push('participants 不能为空');
  }

  // 检查轮次配置
  if (config.maxRounds !== undefined) {
    if (typeof config.maxRounds !== 'number' || config.maxRounds < 1) {
      errors.push('maxRounds 必须是大于 0 的数字');
    }
  }

  // 检查参与者配置
  if (config.participants) {
    config.participants.forEach((p, i) => {
      if (!p.role || typeof p.role !== 'string') {
        errors.push(`participants[${i}].role 缺失或无效`);
      }
      if (!p.systemPrompt || typeof p.systemPrompt !== 'string') {
        errors.push(`participants[${i}].systemPrompt 缺失或无效`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 清理和规范化消息
 * @param {object} message - 原始消息
 * @returns {object} 规范化后的消息
 */
function normalizeMessage(message) {
  return {
    role: message.role || 'unknown',
    content: (message.content || '').trim(),
    timestamp: message.timestamp || Date.now(),
    type: message.type || 'text',
    metadata: message.metadata || {}
  };
}

/**
 * 过滤无效消息
 * @param {array} messages - 消息数组
 * @returns {array} 有效消息数组
 */
function filterValidMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages.filter(msg => {
    const result = validateMessage(msg);
    return result.valid;
  });
}

/**
 * 检查消息是否为系统消息
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isSystemMessage(message) {
  return message.type === 'system' || message.role === 'system';
}

/**
 * 检查消息是否为用户消息
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isUserMessage(message) {
  return message.role === 'user';
}

/**
 * 检查消息是否为助手消息
 * @param {object} message - 消息对象
 * @returns {boolean}
 */
function isAssistantMessage(message) {
  return message.role === 'assistant' || message.role === 'agent';
}

module.exports = {
  validateMessage,
  validateMessages,
  validateConfig,
  normalizeMessage,
  filterValidMessages,
  isSystemMessage,
  isUserMessage,
  isAssistantMessage
};
