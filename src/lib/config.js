/**
 * MAD 配置管理系统
 * 支持配置文件、环境变量和默认值
 */

const fs = require('fs');
const path = require('path');
const { logger } = require('./logger.js');
const { ConfigurationError } = require('./errors.js');

/**
 * 配置管理器
 */
class ConfigManager {
  constructor(options = {}) {
    this.configDir = options.configDir || process.cwd();
    this.configFile = options.configFile || 'mad.config.js';
    this.envPrefix = options.envPrefix || 'MAD_';
    this.config = {};
    this.watchers = [];
  }

  /**
   * 加载配置
   */
  load() {
    // 1. 加载默认配置
    const defaults = this.getDefaults();
    this.config = { ...defaults };

    // 2. 加载配置文件
    const fileConfig = this.loadConfigFile();
    if (fileConfig) {
      this.config = this.mergeDeep(this.config, fileConfig);
      logger.info('Config', 'Loaded configuration file');
    }

    // 3. 加载环境变量
    const envConfig = this.loadEnvConfig();
    if (Object.keys(envConfig).length > 0) {
      this.config = this.mergeDeep(this.config, envConfig);
      logger.info('Config', `Loaded ${Object.keys(envConfig).length} environment variables`);
    }

    // 4. 验证配置
    this.validateConfig();

    return this.config;
  }

  /**
   * 获取默认配置
   */
  getDefaults() {
    return {
      // 服务器配置
      server: {
        port: parseInt(process.env.MAD_PORT) || 18790,
        host: process.env.MAD_HOST || '0.0.0.0'
      },

      // WebSocket 配置
      websocket: {
        port: parseInt(process.env.MAD_WS_PORT) || 18791,
        enabled: process.env.MAD_WS_ENABLED !== 'false'
      },

      // 讨论配置
      discussion: {
        maxRounds: parseInt(process.env.MAD_MAX_ROUNDS) || 10,
        maxDuration: parseInt(process.env.MAD_MAX_DURATION) || 300000, // 5分钟
        enableConflictDetection: process.env.MAD_CONFLICT_DETECTION !== 'false',
        enableQualityScoring: process.env.MAD_QUALITY_SCORING !== 'false',
        enableSuggestions: process.env.MAD_SUGGESTIONS !== 'false'
      },

      // 数据目录
      data: {
        discussionsDir: process.env.MAD_DISCUSSIONS_DIR || path.join(process.cwd(), 'data', 'discussions'),
        templatesDir: process.env.MAD_TEMPLATES_DIR || path.join(process.cwd(), 'data', 'templates'),
        cacheDir: process.env.MAD_CACHE_DIR || path.join(process.cwd(), 'data', 'cache')
      },

      // 日志配置
      logging: {
        level: process.env.MAD_LOG_LEVEL || 'info',
        enableFile: process.env.MAD_LOG_FILE !== 'false',
        logDir: process.env.MAD_LOG_DIR || path.join(process.cwd(), 'logs'),
        maxFiles: parseInt(process.env.MAD_LOG_MAX_FILES) || 7
      },

      // 性能配置
      performance: {
        cacheEnabled: process.env.MAD_CACHE_ENABLED !== 'false',
        cacheMaxSize: parseInt(process.env.MAD_CACHE_MAX_SIZE) || 1000,
        cacheTTL: parseInt(process.env.MAD_CACHE_TTL) || 3600000, // 1小时
        enableLazyLoading: process.env.MAD_LAZY_LOADING !== 'false'
      },

      // 安全配置
      security: {
        enableRateLimit: process.env.MAD_RATE_LIMIT !== 'false',
        rateLimitWindow: parseInt(process.env.MAD_RATE_LIMIT_WINDOW) || 60000, // 1分钟
        rateLimitMax: parseInt(process.env.MAD_RATE_LIMIT_MAX) || 100
      },

      // API 配置
      api: {
        timeout: parseInt(process.env.MAD_API_TIMEOUT) || 30000,
        maxRetries: parseInt(process.env.MAD_API_MAX_RETRIES) || 3
      }
    };
  }

  /**
   * 加载配置文件
   */
  loadConfigFile() {
    const configPaths = [
      path.join(this.configDir, this.configFile),
      path.join(this.configDir, 'mad.config.json'),
      path.join(this.configDir, 'config.json')
    ];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          if (configPath.endsWith('.js')) {
            // JS 配置文件
            delete require.cache[require.resolve(configPath)];
            return require(configPath);
          } else {
            // JSON 配置文件
            const content = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(content);
          }
        } catch (err) {
          logger.error('Config', `Failed to load config file: ${configPath}`, {
            error: err.message
          });
          throw new ConfigurationError('配置文件加载失败', null);
        }
      }
    }

    return null;
  }

  /**
   * 从环境变量加载配置
   */
  loadEnvConfig() {
    const config = {};

    // 遍历所有环境变量
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith(this.envPrefix)) continue;

      // 移除前缀并转换为配置路径
      const configPath = key.slice(this.envPrefix.length).toLowerCase();
      const parts = configPath.split('_');

      // 构建嵌套对象
      let current = config;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }

      // 解析值类型
      const lastPart = parts[parts.length - 1];
      current[lastPart] = this.parseEnvValue(value);
    }

    return config;
  }

  /**
   * 解析环境变量值
   */
  parseEnvValue(value) {
    // 布尔值
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // 数字
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // JSON
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // 字符串
    return value;
  }

  /**
   * 验证配置
   */
  validateConfig() {
    const errors = [];

    // 验证端口
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('server.port must be between 1 and 65535');
    }

    if (this.config.websocket.port < 1 || this.config.websocket.port > 65535) {
      errors.push('websocket.port must be between 1 and 65535');
    }

    // 验证讨论参数
    if (this.config.discussion.maxRounds < 1) {
      errors.push('discussion.maxRounds must be >= 1');
    }

    if (this.config.discussion.maxDuration < 1000) {
      errors.push('discussion.maxDuration must be >= 1000 (1 second)');
    }

    // 验证数据目录
    for (const [key, dirPath] of Object.entries(this.config.data)) {
      if (key.endsWith('Dir') && typeof dirPath === 'string') {
        try {
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logger.info('Config', `Created directory: ${key} = ${dirPath}`);
          }
        } catch (err) {
          errors.push(`Failed to create ${key}: ${err.message}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ConfigurationError('配置验证失败', null, { errors });
    }

    logger.debug('Config', 'Configuration validated successfully');
  }

  /**
   * 获取配置值
   */
  get(path, defaultValue = undefined) {
    const parts = path.split('.');
    let current = this.config;

    for (const part of parts) {
      if (current[part] === undefined) {
        return defaultValue;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * 设置配置值
   */
  set(path, value) {
    const parts = path.split('.');
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * 深度合并对象
   */
  mergeDeep(target, source) {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        result[key] = this.mergeDeep(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 监听配置变化
   */
  watch(callback) {
    const configPath = path.join(this.configDir, this.configFile);

    if (!fs.existsSync(configPath)) {
      logger.warn('Config', 'Cannot watch: config file not found');
      return;
    }

    const watcher = fs.watch(configPath, async (eventType) => {
      if (eventType === 'change') {
        logger.info('Config', 'Configuration file changed, reloading...');

        try {
          // 清除缓存
          if (configPath.endsWith('.js')) {
            delete require.cache[require.resolve(configPath)];
          }

          // 重新加载
          const newConfig = this.loadConfigFile();
          this.config = this.mergeDeep(this.config, newConfig);

          // 触发回调
          if (callback) {
            await callback(this.config);
          }

          logger.info('Config', 'Configuration reloaded successfully');
        } catch (err) {
          logger.error('Config', 'Failed to reload configuration', {
            error: err.message
          });
        }
      }
    });

    this.watchers.push(watcher);
    logger.info('Config', 'Watching configuration file for changes');
  }

  /**
   * 停止监听
   */
  stopWatching() {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }
}

// 创建全局配置管理器实例
const configManager = new ConfigManager();

// 导出
module.exports = {
  ConfigManager,
  configManager,
  // 便捷方法
  loadConfig: () => configManager.load(),
  getConfig: (path, defaultValue) => configManager.get(path, defaultValue),
  setConfig: (path, value) => configManager.set(path, value),
  getAllConfig: () => configManager.getAll()
};
