/**
 * @追踪器 - 防止专家之间无限@循环
 *
 * 功能：
 * 1. 追踪@链，防止超过最大长度
 * 2. 检测"乒乓"效应（A@B, B@A）
 * 3. 提供@权限判断
 *
 * @version 4.0.2
 */

class MentionTracker {
  constructor(config = {}) {
    this.mentionChain = [];
    this.maxChainLength = config.maxChainLength || 5;
    this.maxPingPong = config.maxPingPong || 2;
  }

  /**
   * 检查是否允许@某个专家
   * @param {string} fromExpert - 发起@的专家ID
   * @param {string} toExpert - 被@的专家ID
   * @param {string} reason - @的原因
   * @returns {Object} { allowed: boolean, reason?: string, message?: string }
   */
  canMention(fromExpert, toExpert, reason = '') {
    // 检查1：链长度是否超限
    if (this.mentionChain.length >= this.maxChainLength) {
      return {
        allowed: false,
        reason: 'MENTION_CHAIN_TOO_LONG',
        message: `@链已达最大长度${this.maxChainLength}，建议总结当前观点`
      };
    }

    // 检查2：是否形成乒乓@（A@B, B@A）
    const pingPongCount = this.detectPingPong(fromExpert, toExpert);
    if (pingPongCount >= this.maxPingPong) {
      return {
        allowed: false,
        reason: 'PING_PONG_DETECTED',
        message: '检测到乒乓@循环，请先总结当前观点再继续'
      };
    }

    // 允许@
    return { allowed: true };
  }

  /**
   * 记录一次@操作
   * @param {string} fromExpert - 发起@的专家ID
   * @param {string} toExpert - 被@的专家ID
   * @param {string} reason - @的原因
   */
  recordMention(fromExpert, toExpert, reason = '') {
    this.mentionChain.push({
      from: fromExpert,
      to: toExpert,
      reason: reason || '',
      timestamp: Date.now()
    });
  }

  /**
   * 检测乒乓@模式
   * @param {string} fromExpert - 发起@的专家
   * @param {string} toExpert - 被@的专家
   * @returns {number} 乒乓次数
   */
  detectPingPong(fromExpert, toExpert) {
    let count = 0;
    const recentChain = this.mentionChain.slice(-6); // 检查最近6条

    for (let i = recentChain.length - 1; i >= 0; i--) {
      const mention = recentChain[i];

      // 检查是否是反向的@
      if (mention.from === toExpert && mention.to === fromExpert) {
        count++;
      }
    }

    return count;
  }

  /**
   * 重置@链
   */
  reset() {
    this.mentionChain = [];
  }

  /**
   * 获取当前@链状态
   * @returns {Object} @链统计信息
   */
  getStatus() {
    return {
      chainLength: this.mentionChain.length,
      maxLength: this.maxChainLength,
      canContinue: this.mentionChain.length < this.maxChainLength
    };
  }
}

module.exports = MentionTracker;
