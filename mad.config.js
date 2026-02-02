module.exports = {
  server: {
    port: 18790,
    host: '0.0.0.0'
  },
  websocket: {
    port: 18791,
    enabled: true
  },
  discussion: {
    maxRounds: 10,
    maxDuration: 300000,
    enableConflictDetection: true,
    enableQualityScoring: true,
    enableSuggestions: true
  },
  data: {
    discussionsDir: './data/discussions',
    templatesDir: './data/templates',
    cacheDir: './data/cache'
  },
  logging: {
    level: 'info',
    enableFile: true,
    logDir: './logs',
    maxFiles: 7
  },
  performance: {
    cacheEnabled: true,
    cacheMaxSize: 1000,
    cacheTTL: 3600000,
    enableLazyLoading: true
  },
  security: {
    enableRateLimit: true,
    rateLimitWindow: 60000,
    rateLimitMax: 100
  }
};
