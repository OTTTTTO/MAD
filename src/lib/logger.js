/**
 * MAD 日志系统
 * 提供统一的日志接口，支持多种输出和日志级别
 */

const fs = require('fs');
const path = require('path');

// 日志级别
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

// 颜色映射
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  debug: '\x1b[36m',  // 青色
  info: '\x1b[32m',   // 绿色
  warn: '\x1b[33m',   // 黄色
  error: '\x1b[31m',  // 红色
  gray: '\x1b[90m'    // 灰色
};

// 日志级别名称
const levelNames = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR'
};

class Logger {
  constructor(options = {}) {
    this.level = this.parseLevel(options.level || process.env.MAD_LOG_LEVEL || 'info');
    this.enableFile = options.enableFile !== false;
    this.enableConsole = options.enableConsole !== false;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.prefix = options.prefix || '[MAD]';

    // 确保日志目录存在
    if (this.enableFile) {
      this.ensureLogDir();
    }
  }

  /**
   * 解析日志级别
   */
  parseLevel(level) {
    if (typeof level === 'number') {
      return level;
    }
    if (typeof level === 'string') {
      return LogLevel[level.toUpperCase()] || LogLevel.INFO;
    }
    return LogLevel.INFO;
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      console.error('[Logger] Failed to create log directory:', err.message);
      this.enableFile = false;
    }
  }

  /**
   * 获取当前日志文件路径
   */
  getLogFilePath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `mad-${date}.log`);
  }

  /**
   * 格式化时间戳
   */
  formatTimestamp() {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, context, message, meta) {
    const timestamp = this.formatTimestamp();
    const levelName = levelNames[level];
    const contextStr = context ? `[${context}]` : '';
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

    return `${timestamp} ${levelName} ${this.prefix} ${contextStr} ${message}${metaStr}`;
  }

  /**
   * 写入日志到文件
   */
  writeToFile(message) {
    if (!this.enableFile) return;

    try {
      const logPath = this.getLogFilePath();
      fs.appendFileSync(logPath, message + '\n');
    } catch (err) {
      // 避免日志写入失败导致程序崩溃
      console.error('[Logger] Failed to write log:', err.message);
    }
  }

  /**
   * 输出到控制台
   */
  writeToConsole(level, levelName, message, color = colors.reset) {
    if (!this.enableConsole) return;

    const coloredMessage = `${color}${message}${colors.reset}`;
    const method = level >= LogLevel.ERROR ? console.error :
                   level === LogLevel.WARN ? console.warn :
                   console.log;

    method(coloredMessage);
  }

  /**
   * 核心日志方法
   */
  log(level, context, message, meta) {
    if (level < this.level) return;

    const levelName = levelNames[level].toLowerCase();
    const formattedMessage = this.formatMessage(level, context, message, meta);

    // 控制台输出（带颜色）
    const color = colors[levelName] || colors.reset;
    this.writeToConsole(level, levelName, formattedMessage, color);

    // 文件输出（无颜色）
    this.writeToFile(formattedMessage);
  }

  /**
   * DEBUG 级别日志
   */
  debug(context, message, meta) {
    this.log(LogLevel.DEBUG, context, message, meta);
  }

  /**
   * INFO 级别日志
   */
  info(context, message, meta) {
    this.log(LogLevel.INFO, context, message, meta);
  }

  /**
   * WARN 级别日志
   */
  warn(context, message, meta) {
    this.log(LogLevel.WARN, context, message, meta);
  }

  /**
   * ERROR 级别日志
   */
  error(context, message, meta) {
    this.log(LogLevel.ERROR, context, message, meta);
  }

  /**
   * 创建子日志器（带上下文）
   */
  child(context) {
    const self = this;
    return {
      debug: (message, meta) => self.debug(context, message, meta),
      info: (message, meta) => self.info(context, message, meta),
      warn: (message, meta) => self.warn(context, message, meta),
      error: (message, meta) => self.error(context, message, meta)
    };
  }

  /**
   * 设置日志级别
   */
  setLevel(level) {
    this.level = this.parseLevel(level);
  }

  /**
   * 清理旧日志文件
   */
  cleanOldLogs(daysToKeep = 7) {
    if (!this.enableFile) return;

    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          this.info('Logger', `Cleaned old log file: ${file}`);
        }
      });
    } catch (err) {
      this.error('Logger', `Failed to clean old logs: ${err.message}`);
    }
  }
}

// 创建默认日志器实例
const defaultLogger = new Logger();

// 导出
module.exports = {
  Logger,
  LogLevel,
  logger: defaultLogger,
  // 便捷方法
  debug: (context, message, meta) => defaultLogger.debug(context, message, meta),
  info: (context, message, meta) => defaultLogger.info(context, message, meta),
  warn: (context, message, meta) => defaultLogger.warn(context, message, meta),
  error: (context, message, meta) => defaultLogger.error(context, message, meta)
};
