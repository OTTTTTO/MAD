/**
 * 高级分析系统
 * 
 * 提供深入的数据分析和可视化能力
 */

const { TrendsAnalyzer } = require('./trends');
const { BehaviorAnalyzer } = require('./behavior');
const { KnowledgeGraph } = require('./knowledge-graph');

/**
 * 初始化分析系统
 * @param {object} orchestrator - Orchestrator 实例
 * @returns {object}
 */
function initializeAnalytics(orchestrator) {
  const trends = new TrendsAnalyzer(orchestrator);
  const behavior = new BehaviorAnalyzer(orchestrator);
  const knowledgeGraph = new KnowledgeGraph(orchestrator);

  return {
    trends,
    behavior,
    knowledgeGraph,

    // 趋势分析
    analyzeTrends: async (options) => {
      return await trends.analyzeTrends(options);
    },

    // 行为分析
    analyzeAgentBehavior: async (options) => {
      return await behavior.analyzeAgentBehavior(options);
    },

    buildCollaborationNetwork: (discussions) => {
      return behavior.buildCollaborationNetwork(discussions);
    },

    // 知识图谱
    initializeGraph: async () => {
      return await knowledgeGraph.initialize();
    },

    updateGraph: async (discussion) => {
      return await knowledgeGraph.update(discussion);
    },

    findRelated: (entityId, maxDepth) => {
      return knowledgeGraph.findRelated(entityId, maxDepth);
    },

    findShortestPath: (sourceId, targetId) => {
      return knowledgeGraph.findShortestPath(sourceId, targetId);
    },

    detectCommunities: () => {
      return knowledgeGraph.detectCommunities();
    },

    getConceptEvolution: (concept, timeRange) => {
      return knowledgeGraph.getConceptEvolution(concept, timeRange);
    },

    getGraphStatistics: () => {
      return knowledgeGraph.getStatistics();
    },

    exportGraph: (format) => {
      return knowledgeGraph.exportGraph(format);
    },

    // 综合分析
    generateReport: async (options = {}) => {
      const {
        timeRange = '30d',
        includeTrends = true,
        includeBehavior = true,
        includeGraph = true
      } = options;

      const report = {
        generatedAt: new Date(),
        timeRange,
        sections: {}
      };

      if (includeTrends) {
        report.sections.trends = await trends.analyzeTrends({ timeRange });
      }

      if (includeBehavior) {
        report.sections.behavior = await behavior.analyzeAgentBehavior({ timeRange });
      }

      if (includeGraph) {
        await knowledgeGraph.initialize();
        report.sections.knowledgeGraph = {
          statistics: knowledgeGraph.getStatistics(),
          communities: knowledgeGraph.detectCommunities()
        };
      }

      return report;
    },

    // 缓存管理
    clearCache: () => {
      trends.clearCache();
      behavior.clearCache();
    }
  };
}

module.exports = {
  // 分析器
  TrendsAnalyzer,
  BehaviorAnalyzer,
  KnowledgeGraph,

  // 初始化函数
  initializeAnalytics
};
