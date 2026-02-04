/**
 * MAD 配置示例文件
 *
 * 使用方法:
 * 1. 复制此文件为 mad.config.js
 * 2. 根据需要修改配置
 * 3. 可以使用环境变量覆盖任何配置项 (格式: MAD_*_*)
 *
 * 环境变量示例:
 *   MAD_PORT=3000              # 修改服务器端口
 *   MAD_LOG_LEVEL=debug        # 修改日志级别
 *   MAD_MAX_ROUNDS=20          # 修改最大轮数
 */

module.exports = {
  // ========== 服务器配置 ==========
  server: {
    // HTTP 服务器端口 (默认: 18790)
    port: 18790,

    // 监听地址 (默认: 0.0.0.0)
    host: '0.0.0.0'
  },

  // ========== WebSocket 配置 ==========
  websocket: {
    // WebSocket 端口 (默认: 18791)
    port: 18791,

    // 是否启用 WebSocket (默认: true)
    enabled: true
  },

  // ========== 讨论配置 ==========
  discussion: {
    // 最大讨论轮数 (默认: 10)
    maxRounds: 10,

    // 最大讨论时长，单位: 毫秒 (默认: 300000 = 5分钟)
    maxDuration: 300000,

    // 是否启用冲突检测 (默认: true)
    enableConflictDetection: true,

    // 是否启用质量评分 (默认: true)
    enableQualityScoring: true,

    // 是否启用建议生成 (默认: true)
    enableSuggestions: true
  },

  // ========== 数据目录配置 ==========
  data: {
    // 讨论记录目录 (默认: ./data/discussions)
    discussionsDir: './data/discussions',

    // 模板目录 (默认: ./data/templates)
    templatesDir: './data/templates',

    // 缓存目录 (默认: ./data/cache)
    cacheDir: './data/cache'
  },

  // ========== 日志配置 ==========
  logging: {
    // 日志级别: debug, info, warn, error (默认: info)
    level: 'info',

    // 是否启用文件日志 (默认: true)
    enableFile: true,

    // 日志目录 (默认: ./logs)
    logDir: './logs',

    // 日志文件保留天数 (默认: 7)
    maxFiles: 7
  },

  // ========== 性能配置 ==========
  performance: {
    // 是否启用缓存 (默认: true)
    cacheEnabled: true,

    // 缓存最大条目数 (默认: 1000)
    cacheMaxSize: 1000,

    // 缓存过期时间，单位: 毫秒 (默认: 3600000 = 1小时)
    cacheTTL: 3600000,

    // 是否启用懒加载 (默认: true)
    enableLazyLoading: true
  },

  // ========== 安全配置 ==========
  security: {
    // 是否启用速率限制 (默认: true)
    enableRateLimit: true,

    // 速率限制时间窗口，单位: 毫秒 (默认: 60000 = 1分钟)
    rateLimitWindow: 60000,

    // 速率限制最大请求数 (默认: 100)
    rateLimitMax: 100
  },

  // ========== API 配置 ==========
  api: {
    // API 超时时间，单位: 毫秒 (默认: 30000 = 30秒)
    timeout: 30000,

    // 最大重试次数 (默认: 3)
    maxRetries: 3
  },

  // ========== 自定义配置 ==========
  // 你可以添加任何自定义配置
  custom: {
    // 例如: API 密钥
    // apiKey: 'your-api-key-here'

    // 例如: 集成配置
    // integrations: {
    //   slack: { webhook: '...' },
    //   discord: { token: '...' }
    // }
  }
};
