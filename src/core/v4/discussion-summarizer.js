/**
 * 结果汇总器 - 分析讨论并生成总结
 *
 * 功能：
 * 1. 提取共识观点
 * 2. 识别分歧观点
 * 3. 生成行动建议
 * 4. 创建总结报告
 *
 * @version 4.0.7
 */

class DiscussionSummarizer {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * 汇总讨论结果
   * @param {Object} discussion - 讨论对象
   * @param {Object} decomposition - 拆解结果
   * @returns {Object} 总结报告
   */
  summarize(discussion, decomposition) {
    console.log('[DiscussionSummarizer] 开始汇总讨论结果...');

    const messages = discussion.messages || [];

    // 1. 提取共识观点
    const consensus = this.extractConsensus(messages, decomposition);

    // 2. 识别分歧观点
    const disagreements = this.extractDisagreements(messages, decomposition);

    // 3. 生成行动建议
    const recommendations = this.generateRecommendations(messages, decomposition);

    // 4. 统计信息
    const statistics = this.generateStatistics(messages, decomposition);

    // 5. 创建报告
    const report = this.createReport(discussion, decomposition, {
      consensus,
      disagreements,
      recommendations,
      statistics
    });

    return report;
  }

  /**
   * 提取共识观点
   * @param {Array} messages - 消息列表
   * @param {Object} decomposition - 拆解结果
   * @returns {Array} 共识列表
   */
  extractConsensus(messages, decomposition) {
    const consensus = [];

    // 简化实现：基于专家策略提取共识
    // 如果多个专家都使用DIRECT或ANSWER_WITH_MENTION策略，认为有共识

    const domains = decomposition.domains || [];
    const responsesByDomain = {};

    // 按领域分组
    messages.forEach(msg => {
      if (msg.domain && !responsesByDomain[msg.domain]) {
        responsesByDomain[msg.domain] = [];
      }
      if (msg.domain) {
        responsesByDomain[msg.domain].push(msg);
      }
    });

    // 每个领域提取主要观点
    for (const domain of domains) {
      const domainMessages = responsesByDomain[domain] || [];
      if (domainMessages.length === 0) continue;

      // 找到该领域的第一次响应
      const firstResponse = domainMessages.find(m =>
        m.type === 'EXPERT_RESPONSE' && m.strategy !== 'REDIRECT'
      );

      if (firstResponse) {
        consensus.push({
          domain: domain,
          expert: firstResponse.expertName,
          point: this.extractKeyPoint(firstResponse.content),
          confidence: firstResponse.confidence || 0
        });
      }
    }

    return consensus;
  }

  /**
   * 识别分歧观点
   * @param {Array} messages - 消息列表
   * @param {Object} decomposition - 拆解结果
   * @returns {Array} 分歧列表
   */
  extractDisagreements(messages, decomposition) {
    const disagreements = [];

    // 简化实现：检测REDIRECT策略
    const redirects = messages.filter(m => m.strategy === 'REDIRECT');

    redirects.forEach(redirect => {
      disagreements.push({
        domain: redirect.domain,
        expert: redirect.expertName,
        reason: '该专家认为问题超出专业领域',
        suggestion: `建议咨询${decomposition.domains.filter(d => d !== redirect.domain).join('、')}专家`
      });
    });

    return disagreements;
  }

  /**
   * 生成行动建议
   * @param {Array} messages - 消息列表
   * @param {Object} decomposition - 拆解结果
   * @returns {Array} 建议列表
   */
  generateRecommendations(messages, decomposition) {
    const recommendations = [];

    // 基于共识生成建议
    const domains = decomposition.domains || [];

    if (domains.includes('technical')) {
      recommendations.push({
        priority: 'high',
        category: '技术',
        action: '进行技术可行性分析',
        details: '评估技术架构、性能要求、安全风险'
      });
    }

    if (domains.includes('product')) {
      recommendations.push({
        priority: 'high',
        category: '产品',
        action: '明确用户需求和使用场景',
        details: '进行用户调研，梳理核心功能'
      });
    }

    if (domains.includes('business')) {
      recommendations.push({
        priority: 'medium',
        category: '商业',
        action: '制定商业计划',
        details: '分析市场、竞争、盈利模式'
      });
    }

    if (domains.includes('operations')) {
      recommendations.push({
        priority: 'medium',
        category: '运营',
        action: '设计运营策略',
        details: '规划用户获取、增长、留存方案'
      });
    }

    return recommendations;
  }

  /**
   * 生成统计信息
   * @param {Array} messages - 消息列表
   * @param {Object} decomposition - 拆解结果
   * @returns {Object} 统计信息
   */
  generateStatistics(messages, decomposition) {
    const stats = {
      totalMessages: messages.length,
      expertParticipation: {},
      strategyDistribution: {},
      domainCoverage: decomposition.domains || [],
      duration: discussion => {
        if (!discussion.metadata || !discussion.metadata.startTime) return 'N/A';
        const duration = Date.now() - discussion.metadata.startTime;
        return Math.round(duration / 1000) + '秒';
      }
    };

    messages.forEach(msg => {
      if (msg.expert) {
        stats.expertParticipation[msg.expert] = (stats.expertParticipation[msg.expert] || 0) + 1;
      }
      if (msg.strategy) {
        stats.strategyDistribution[msg.strategy] = (stats.strategyDistribution[msg.strategy] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * 创建总结报告
   * @param {Object} discussion - 讨论对象
   * @param {Object} decomposition - 拆解结果
   * @param {Object} analysis - 分析结果
   * @returns {Object} 完整报告
   */
  createReport(discussion, decomposition, analysis) {
    const topic = discussion.topic || {};

    return {
      // 基本信息
      topic: topic.content || topic.description || '未命名话题',
      timestamp: new Date().toISOString(),
      discussionId: discussion.id || 'N/A',

      // 识别的领域
      domains: decomposition.domains || [],
      expertCount: (decomposition.experts || []).length,

      // 分析结果
      consensus: analysis.consensus,
      disagreements: analysis.disagreements,
      recommendations: analysis.recommendations,

      // 统计信息
      statistics: {
        totalMessages: analysis.statistics.totalMessages,
        expertParticipation: analysis.statistics.expertParticipation,
        strategyDistribution: analysis.statistics.strategyDistribution,
        duration: analysis.statistics.duration(discussion)
      },

      // 执行摘要
      executiveSummary: this.generateExecutiveSummary(analysis)
    };
  }

  /**
   * 生成执行摘要
   * @param {Object} analysis - 分析结果
   * @returns {string} 执行摘要
   */
  generateExecutiveSummary(analysis) {
    const parts = [];

    // 共识数量
    const consensusCount = analysis.consensus.length;
    if (consensusCount > 0) {
      parts.push(`专家们在${consensusCount}个方面达成共识`);
    }

    // 分歧数量
    const disagreementCount = analysis.disagreements.length;
    if (disagreementCount > 0) {
      parts.push(`存在${disagreementCount}个需要进一步讨论的分歧`);
    }

    // 建议数量
    const recommendationCount = analysis.recommendations.length;
    if (recommendationCount > 0) {
      const highPriority = analysis.recommendations.filter(r => r.priority === 'high').length;
      parts.push(`生成${recommendationCount}条建议（${highPriority}条高优先级）`);
    }

    return parts.join('，') || '讨论已完成，建议review详细结果';
  }

  /**
   * 提取关键观点
   * @param {string} content - 内容
   * @returns {string} 关键观点
   */
  extractKeyPoint(content) {
    // 简化实现：提取前100个字符作为关键观点
    if (!content) return '无';
    return content.substring(0, 100) + (content.length > 100 ? '...' : '');
  }

  /**
   * 格式化报告为Markdown
   * @param {Object} report - 报告对象
   * @returns {string} Markdown文本
   */
  formatMarkdown(report) {
    let md = '';

    md += `# 讨论总结报告\n\n`;
    md += `**话题**: ${report.topic}\n\n`;
    md += `**时间**: ${report.timestamp}\n\n`;
    md += `**涉及领域**: ${report.domains.join('、')}\n\n`;
    md += `**专家数量**: ${report.expertCount}\n\n`;

    md += `## 执行摘要\n\n`;
    md += `${report.executiveSummary}\n\n`;

    md += `## 共识观点\n\n`;
    if (report.consensus.length > 0) {
      report.consensus.forEach((item, idx) => {
        md += `### ${idx + 1}. ${item.domain}领域\n\n`;
        md += `**专家**: ${item.expert}\n\n`;
        md += `**观点**: ${item.point}\n\n`;
        md += `**置信度**: ${(item.confidence * 100).toFixed(0)}%\n\n`;
      });
    } else {
      md += `暂无明显共识\n\n`;
    }

    md += `## 分歧观点\n\n`;
    if (report.disagreements.length > 0) {
      report.disagreements.forEach((item, idx) => {
        md += `### ${idx + 1}. ${item.domain}领域\n\n`;
        md += `**专家**: ${item.expert}\n\n`;
        md += `**原因**: ${item.reason}\n\n`;
        md += `**建议**: ${item.suggestion}\n\n`;
      });
    } else {
      md += `无明显分歧\n\n`;
    }

    md += `## 行动建议\n\n`;
    if (report.recommendations.length > 0) {
      report.recommendations.forEach((item, idx) => {
        const priority = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        md += `### ${priority} ${idx + 1}. ${item.action}（${item.category}）\n\n`;
        md += `${item.details}\n\n`;
      });
    } else {
      md += `暂无具体建议\n\n`;
    }

    md += `## 统计信息\n\n`;
    md += `- **总消息数**: ${report.statistics.totalMessages}\n`;
    md += `- **讨论时长**: ${report.statistics.duration}\n`;
    md += `- **专家参与**: \n`;
    for (const [expert, count] of Object.entries(report.statistics.expertParticipation)) {
      md += `  - ${expert}: ${count}次\n`;
    }

    return md;
  }
}

module.exports = DiscussionSummarizer;
