/**
 * MAD v3.7.0 - 上下文压缩管理器
 *
 * 功能：
 * - 自动压缩讨论上下文，避免超过 Token 限制
 * - 保留重要的标记和最近消息
 * - 生成早期消息的摘要
 */

class ContextCompressor {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 100000;      // 最大 Token 数（可配置，默认 100k）
    this.compressThreshold = options.compressThreshold || 80000; // 压缩阈值（80k tokens）
    this.keepRecent = options.keepRecent || 50;        // 保留最近的消息数
    this.keepMarkers = options.keepMarkers !== false;  // 是否保留标记
  }

  /**
   * 压缩讨论上下文
   * @param {DiscussionContext} discussion - 讨论上下文
   * @param {number} maxTokens - 最大 Token 数
   * @returns {Object} 压缩结果
   */
  compressContext(discussion, maxTokens = null) {
    const limit = maxTokens || this.maxTokens;

    // 检查是否需要压缩
    if (discussion.totalTokens < this.compressThreshold) {
      return {
        compressed: false,
        messages: discussion.messages,
        originalCount: discussion.messages.length,
        compressedCount: discussion.messages.length,
        stats: discussion.getTokenStats()
      };
    }

    // 压缩策略
    const compressed = this._compressMessages(discussion.messages, discussion.markers);

    return {
      compressed: true,
      messages: compressed.messages,
      summary: compressed.summary,
      originalCount: discussion.messages.length,
      compressedCount: compressed.messages.length,
      stats: discussion.getTokenStats(),
      savedTokens: this._calculateSavedTokens(discussion, compressed)
    };
  }

  /**
   * 压缩消息列表
   * @private
   */
  _compressMessages(messages, markers) {
    // 1. 提取最近的 N 条消息
    const recentMessages = messages.slice(-this.keepRecent);

    // 2. 提取所有标记（转换为消息格式）
    const markerMessages = this.keepMarkers && markers && markers.length > 0
      ? markers.map(m => this._markerToMessage(m))
      : [];

    // 3. 找出需要压缩的消息段
    const earlyMessages = messages.slice(0, -(this.keepRecent));

    // 4. 生成早期消息摘要
    const summary = this._generateSummary(earlyMessages, markers);

    // 5. 组合压缩后的上下文
    const compressedMessages = [
      this._summaryToMessage(summary),
      ...markerMessages,
      ...recentMessages
    ];

    return {
      messages: compressedMessages,
      summary: summary
    };
  }

  /**
   * 将标记转换为消息格式
   * @private
   */
  _markerToMessage(marker) {
    const emoji = {
      'milestone': '🏆',
      'decision': '🎯',
      'problem': '⚠️',
      'solution': '💡'
    }[marker.type] || '📍';

    return {
      id: `marker-${marker.id}`,
      role: 'system',
      content: `${emoji} ${marker.title}: ${marker.summary || ''}`,
      timestamp: marker.timestamp,
      isMarker: true,
      markerType: marker.type,
      markerData: marker
    };
  }

  /**
   * 将摘要转换为消息格式
   * @private
   */
  _summaryToMessage(summary) {
    return {
      id: 'msg-compressed-summary',
      role: 'system',
      content: `[早期讨论摘要]\n${summary}`,
      timestamp: Date.now(),
      isCompressed: true
    };
  }

  /**
   * 生成早期消息摘要
   * @private
   */
  _generateSummary(messages, markers) {
    // 如果有标记，基于标记生成摘要
    if (markers && markers.length > 0) {
      return markers.map(m => {
        const emoji = {
          'milestone': '🏆',
          'decision': '🎯',
          'problem': '⚠️',
          'solution': '💡'
        }[m.type] || '📍';
        return `${emoji} ${m.title}: ${m.summary || m.conclusions?.join('；') || ''}`;
      }).join('\n');
    }

    // 简单摘要：每个阶段取一条代表性消息
    const phases = {};
    messages.forEach(msg => {
      const phase = msg.round || 0;
      if (!phases[phase]) {
        phases[phase] = msg;
      }
    });

    return Object.values(phases)
      .map(msg => {
        const role = msg.role || '未知';
        const content = msg.content?.slice(0, 100) || '';
        return `[${role}] ${content}${content.length >= 100 ? '...' : ''}`;
      })
      .join('\n');
  }

  /**
   * 计算节省的 Token 数
   * @private
   */
  _calculateSavedTokens(discussion, compressed) {
    const originalCount = discussion.messages.length;
    const newCount = compressed.messages.length;
    const avgTokens = discussion.totalTokens / originalCount;

    return Math.round((originalCount - newCount) * avgTokens);
  }

  /**
   * 检查是否需要压缩
   */
  needsCompression(discussion) {
    return discussion.totalTokens >= this.compressThreshold;
  }

  /**
   * 获取压缩建议
   */
  getCompressionSuggestions(discussion) {
    const stats = discussion.getTokenStats();

    if (stats.total < this.compressThreshold) {
      return {
        needed: false,
        urgency: 'none',
        reason: 'Token 使用量在安全范围内',
        suggestion: '当前无需压缩'
      };
    }

    const urgency = stats.total >= this.maxTokens ? 'critical' : 'warning';
    const savedTokens = Math.round(stats.total * 0.4); // 估算可节省 40%

    if (urgency === 'critical') {
      return {
        needed: true,
        urgency: 'critical',
        reason: `Token 使用量 ${stats.total} 已超过硬限制 ${this.maxTokens}！`,
        suggestion: `必须立即压缩上下文以避免错误，预计可节省 ~${savedTokens} tokens`,
        savedTokens: savedTokens
      };
    }

    return {
      needed: true,
      urgency: 'warning',
      reason: `Token 使用量 ${stats.total} 已接近压缩阈值 ${this.compressThreshold}`,
      suggestion: `建议压缩上下文以节省成本，预计可节省 ~${savedTokens} tokens`,
      savedTokens: savedTokens
    };
  }

  /**
   * 估算消息的 Token 数（简化版）
   */
  estimateTokens(message) {
    const text = message.content || '';
    // 简单估算：中文约 1.5 字 = 1 token，英文约 4 字 = 1 token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;

    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 计算消息列表的总 Token 数
   */
  calculateTotalTokens(messages) {
    return messages.reduce((total, msg) => {
      return total + this.estimateTokens(msg);
    }, 0);
  }
}

module.exports = ContextCompressor;
