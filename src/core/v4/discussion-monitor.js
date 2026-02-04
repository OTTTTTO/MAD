/**
 * 讨论监控器 - 监控讨论深度并决定何时介入
 *
 * 功能：
 * 1. 追踪专家@轮次
 * 2. 检测重复讨论
 * 3. 检测无进展状态
 * 4. 决定是否需要介入
 *
 * @version 4.0.2
 */

class DiscussionMonitor {
  constructor(config = {}) {
    this.config = {
      maxExpertRounds: config.maxExpertRounds || 5,
      maxTotalRounds: config.maxTotalRounds || 15,
      repeatThreshold: config.repeatThreshold || 3
    };
    this.reset();
  }

  /**
   * 重置监控状态
   */
  reset() {
    this.stats = {
      expertRounds: 0,
      totalRounds: 0,
      uniqueMessages: new Set()
    };
  }

  /**
   * 检查是否需要介入
   * @param {Object} discussion - 讨论对象
   * @returns {Object} { intervene: boolean, reason?: string, message?: string }
   */
  checkIntervention(discussion) {
    const messages = discussion.messages || [];

    // 更新统计
    this.stats.totalRounds = messages.length;
    this.stats.expertRounds = messages.filter(msg =>
      msg.type === 'MENTION' || msg.mention
    ).length;

    // 检查1：专家@轮次超限
    if (this.stats.expertRounds > this.config.maxExpertRounds) {
      return {
        intervene: true,
        reason: 'EXPERT_ROUNDS_EXCEEDED',
        message: `专家@轮次已达${this.stats.expertRounds}，超过上限${this.config.maxExpertRounds}`
      };
    }

    // 检查2：总轮次超限
    if (this.stats.totalRounds > this.config.maxTotalRounds) {
      return {
        intervene: true,
        reason: 'TOTAL_ROUNDS_EXCEEDED',
        message: `讨论已进行${this.stats.totalRounds}轮，超过上限${this.config.maxTotalRounds}`
      };
    }

    // 检查3：检测重复讨论
    if (this.detectRepetition(messages)) {
      return {
        intervene: true,
        reason: 'REPETITION_DETECTED',
        message: '检测到讨论内容重复'
      };
    }

    return { intervene: false };
  }

  /**
   * 检测重复讨论
   * @param {Array} messages - 消息列表
   * @returns {boolean} 是否重复
   */
  detectRepetition(messages) {
    if (messages.length < 6) return false;

    const recentMessages = messages.slice(-6);
    const signatures = recentMessages.map(msg =>
      `${msg.expert}:${(msg.content || '').substring(0, 30)}`
    );
    const uniqueSignatures = new Set(signatures);

    return uniqueSignatures.size < 3;
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      maxExpertRounds: this.config.maxExpertRounds,
      maxTotalRounds: this.config.maxTotalRounds
    };
  }
}

module.exports = DiscussionMonitor;
