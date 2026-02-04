/**
 * MAD 错误处理系统
 * 提供统一的错误类型、错误处理和错误响应
 */

const { logger } = require('./logger.js');

/**
 * MAD 基础错误类
 */
class MadError extends Error {
  constructor(message, code = 'MAD_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 验证错误
 */
class ValidationError extends MadError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}

/**
 * 配置错误
 */
class ConfigurationError extends MadError {
  constructor(message, configKey = null) {
    super(message, 'CONFIG_ERROR', { configKey });
  }
}

/**
 * 文件操作错误
 */
class FileOperationError extends MadError {
  constructor(message, filePath = null, operation = null) {
    super(message, 'FILE_ERROR', { filePath, operation });
  }
}

/**
 * API 错误
 */
class ApiError extends MadError {
  constructor(message, statusCode = 500, endpoint = null) {
    super(message, 'API_ERROR', { statusCode, endpoint });
    this.statusCode = statusCode;
  }
}

/**
 * 讨论相关错误
 */
class DiscussionError extends MadError {
  constructor(message, discussionId = null) {
    super(message, 'DISCUSSION_ERROR', { discussionId });
  }
}

/**
 * Agent 错误
 */
class AgentError extends MadError {
  constructor(message, agentId = null) {
    super(message, 'AGENT_ERROR', { agentId });
  }
}

/**
 * 模板错误
 */
class TemplateError extends MadError {
  constructor(message, templateId = null) {
    super(message, 'TEMPLATE_ERROR', { templateId });
  }
}

/**
 * 错误处理中间件（用于 Express/HTTP 服务器）
 */
function errorHandlerMiddleware() {
  return (err, req, res, next) => {
    // 记录错误
    logger.error('HTTP', `${req.method} ${req.path}`, {
      error: err.message,
      code: err.code || 'INTERNAL_ERROR',
      stack: err.stack
    });

    // 判断是否为 MadError
    if (err instanceof MadError) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details
        }
      });
    } else {
      // 未知错误
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          details: process.env.NODE_ENV === 'development' ? {
            originalMessage: err.message,
            stack: err.stack
          } : undefined
        }
      });
    }
  };
}

/**
 * 404 处理中间件
 */
function notFoundMiddleware() {
  return (req, res) => {
    logger.warn('HTTP', `404 - ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `端点不存在: ${req.method} ${req.path}`,
        details: {
          method: req.method,
          path: req.path
        }
      }
    });
  };
}

/**
 * 异步路由包装器（自动捕获异步错误）
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
      logger.error('AsyncHandler', 'Unhandled async error', {
        error: err.message,
        path: req.path
      });
      next(err);
    });
  };
}

/**
 * 安全地执行异步操作，带错误处理
 */
async function safeAsync(operation, context = 'Unknown') {
  try {
    return await operation();
  } catch (err) {
    logger.error(context, 'Operation failed', {
      error: err.message,
      stack: err.stack
    });

    // 如果是 MadError，直接抛出
    if (err instanceof MadError) {
      throw err;
    }

    // 否则包装为通用错误
    throw new MadError(err.message, 'OPERATION_FAILED');
  }
}

/**
 * 安全地执行同步操作，带错误处理
 */
function safeSync(operation, context = 'Unknown') {
  try {
    return operation();
  } catch (err) {
    logger.error(context, 'Operation failed', {
      error: err.message,
      stack: err.stack
    });

    // 如果是 MadError，直接抛出
    if (err instanceof MadError) {
      throw err;
    }

    // 否则包装为通用错误
    throw new MadError(err.message, 'OPERATION_FAILED');
  }
}

/**
 * 创建降级策略
 */
function createFallback(primary, fallback, context = 'Fallback') {
  return async (...args) => {
    try {
      return await primary(...args);
    } catch (err) {
      logger.warn(context, 'Primary operation failed, using fallback', {
        error: err.message
      });

      try {
        return await fallback(...args);
      } catch (fallbackErr) {
        logger.error(context, 'Fallback operation also failed', {
          error: fallbackErr.message
        });
        throw fallbackErr;
      }
    }
  };
}

/**
 * 重试机制
 */
async function retry(operation, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    context = 'Retry'
  } = options;

  let lastError;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      logger.warn(context, `Attempt ${attempt}/${maxAttempts} failed`, {
        error: err.message
      });

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= backoff;
      }
    }
  }

  logger.error(context, `All ${maxAttempts} attempts failed`);
  throw lastError;
}

/**
 * 输入验证助手
 */
function validateInput(schema, data) {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];

    // 必填检查
    if (rules.required && (value === undefined || value === null)) {
      errors.push({
        field: key,
        message: `${key} is required`
      });
      continue;
    }

    // 跳过可选的 undefined 值
    if (value === undefined && !rules.required) {
      continue;
    }

    // 类型检查
    if (rules.type && typeof value !== rules.type) {
      errors.push({
        field: key,
        message: `${key} must be ${rules.type}`,
        received: typeof value
      });
      continue;
    }

    // 数值范围检查
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: key,
          message: `${key} must be >= ${rules.min}`,
          received: value
        });
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: key,
          message: `${key} must be <= ${rules.max}`,
          received: value
        });
      }
    }

    // 字符串长度检查
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: key,
          message: `${key} must be at least ${rules.minLength} characters`,
          received: value.length
        });
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: key,
          message: `${key} must be at most ${rules.maxLength} characters`,
          received: value.length
        });
      }
    }

    // 数组检查
    if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push({
          field: key,
          message: `${key} must be an array`,
          received: typeof value
        });
      } else if (rules.minItems && value.length < rules.minItems) {
        errors.push({
          field: key,
          message: `${key} must have at least ${rules.minItems} items`,
          received: value.length
        });
      } else if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({
          field: key,
          message: `${key} must have at most ${rules.maxItems} items`,
          received: value.length
        });
      }
    }

    // 自定义验证
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value, data);
      if (customError) {
        errors.push({
          field: key,
          message: customError
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('输入验证失败', null, { errors });
  }

  return true;
}

// 导出
module.exports = {
  // 错误类
  MadError,
  ValidationError,
  ConfigurationError,
  FileOperationError,
  ApiError,
  DiscussionError,
  AgentError,
  TemplateError,

  // 中间件
  errorHandlerMiddleware,
  notFoundMiddleware,
  asyncHandler,

  // 工具函数
  safeAsync,
  safeSync,
  createFallback,
  retry,
  validateInput
};
