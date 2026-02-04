/**
 * MAD v3.7.0 - 智能标记管理器
 *
 * 功能：
 * - 添加和管理讨论标记
 * - AI 自动检测重要时刻并生成标记
 * - 基于标记生成智能摘要
 * - 检测讨论阶段
 */

class MarkerManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * 添加标记到讨论
   */
  async addMarker(discussionId, marker) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    // 验证标记类型
    const validTypes = ['milestone', 'decision', 'problem', 'solution'];
    if (!validTypes.includes(marker.type)) {
      throw new Error(`Invalid marker type: ${marker.type}. Must be one of ${validTypes.join(', ')}`);
    }

    // 创建标记对象
    const newMarker = {
      id: marker.id || `marker-${Date.now()}`,
      title: marker.title,
      type: marker.type,
      summary: marker.summary || '',
      conclusions: marker.conclusions || [],
      tags: marker.tags || [],
      messageId: marker.messageId || null,
      timestamp: marker.timestamp || Date.now(),
      importance: marker.importance || 'medium' // low | medium | high
    };

    // 添加到讨论
    context.addMarker(newMarker);
    await this.orchestrator.saveDiscussion(context);

    console.log(`[MarkerManager] Added marker to ${discussionId}: ${newMarker.title}`);

    return newMarker;
  }

  /**
   * 获取讨论的所有标记
   */
  async getMarkers(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    return context.getMarkers();
  }

  /**
   * 按类型获取标记
   */
  async getMarkersByType(discussionId, type) {
    const markers = await this.getMarkers(discussionId);
    return markers.filter(m => m.type === type);
  }

  /**
   * 按时间排序标记
   */
  async getSortedMarkers(discussionId) {
    const markers = await this.getMarkers(discussionId);
    return markers.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * AI 自动检测并添加标记
   */
  async detectAndAddMarkers(discussionId, options = {}) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const maxMarkers = options.maxMarkers || 5;
    const minConfidence = options.minConfidence || 0.7;

    // 获取最近的讨论内容
    const recentMessages = context.messages.slice(-20);

    // 分析并检测重要时刻
    const detectedMarkers = await this._analyzeForMarkers(recentMessages, {
      maxMarkers,
      minConfidence
    });

    // 添加检测到的标记
    const addedMarkers = [];
    for (const marker of detectedMarkers) {
      const added = await this.addMarker(discussionId, marker);
      addedMarkers.push(added);
    }

    console.log(`[MarkerManager] Detected and added ${addedMarkers.length} markers to ${discussionId}`);

    return addedMarkers;
  }

  /**
   * 生成智能摘要（基于标记）
   */
  async generateSmartSummary(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const markers = await this.getSortedMarkers(discussionId);

    if (markers.length === 0) {
      return {
        discussionId,
        summary: '暂无标记，无法生成摘要',
        markers: [],
        timeline: []
      };
    }

    // 生成时间线
    const timeline = markers.map(m => {
      const emoji = {
        'milestone': '🏆',
        'decision': '🎯',
        'problem': '⚠️',
        'solution': '💡'
      }[m.type] || '📍';

      return {
        time: new Date(m.timestamp).toLocaleString('zh-CN'),
        emoji: emoji,
        title: m.title,
        type: m.type,
        summary: m.summary,
        conclusions: m.conclusions
      };
    });

    // 生成摘要文本
    const summaryText = this._formatSummary(timeline);

    return {
      discussionId,
      summary: summaryText,
      markers: markers,
      timeline: timeline,
      generatedAt: Date.now()
    };
  }

  /**
   * 检测讨论阶段
   */
  async detectDiscussionPhase(discussionId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const markers = await this.getMarkers(discussionId);
    const messages = context.messages;

    // 阶段判断逻辑
    if (messages.length < 5) {
      return 'initializing'; // 初始化阶段
    }

    if (context.status === 'ended' || context.status === 'archived') {
      return 'concluding'; // 结束阶段
    }

    // 检查最近的决策标记
    const recentDecisionMarkers = markers
      .filter(m => m.type === 'decision')
      .slice(-3);

    if (recentDecisionMarkers.length > 0) {
      const lastDecision = recentDecisionMarkers[recentDecisionMarkers.length - 1];
      const timeSinceDecision = Date.now() - lastDecision.timestamp;

      if (timeSinceDecision < 3600000) { // 1 小时内
        return 'deciding'; // 决策阶段
      }
    }

    // 检查问题标记
    const recentProblemMarkers = markers
      .filter(m => m.type === 'problem')
      .slice(-2);

    if (recentProblemMarkers.length > 0) {
      const lastProblem = recentProblemMarkers[recentProblemMarkers.length - 1];
      const timeSinceProblem = Date.now() - lastProblem.timestamp;

      if (timeSinceProblem < 7200000) { // 2 小时内
        return 'discussing'; // 讨论阶段
      }
    }

    return 'milestone_reached'; // 里程碑达成
  }

  /**
   * 分析消息并检测标记
   * @private
   */
  async _analyzeForMarkers(messages, options) {
    const detectedMarkers = [];
    const maxMarkers = options.maxMarkers;
    const minConfidence = options.minConfidence;

    // 简单的规则检测（实际应该使用 AI）
    for (const msg of messages) {
      if (detectedMarkers.length >= maxMarkers) break;

      const content = msg.content.toLowerCase();
      let marker = null;

      // 检测决策
      if (this._containsDecisionKeywords(content)) {
        marker = {
          type: 'decision',
          title: '重要决策',
          summary: msg.content.slice(0, 100),
          messageId: msg.id,
          timestamp: msg.timestamp,
          importance: 'high'
        };
      }
      // 检测问题
      else if (this._containsProblemKeywords(content)) {
        marker = {
          type: 'problem',
          title: '发现问题',
          summary: msg.content.slice(0, 100),
          messageId: msg.id,
          timestamp: msg.timestamp,
          importance: 'medium'
        };
      }
      // 检测方案
      else if (this._containsSolutionKeywords(content)) {
        marker = {
          type: 'solution',
          title: '解决方案',
          summary: msg.content.slice(0, 100),
          messageId: msg.id,
          timestamp: msg.timestamp,
          importance: 'high'
        };
      }

      if (marker) {
        detectedMarkers.push(marker);
      }
    }

    return detectedMarkers;
  }

  /**
   * 检测决策关键词
   * @private
   */
  _containsDecisionKeywords(content) {
    const keywords = ['决定', '确定', '采用', '选择', '决策', 'agree', 'decide'];
    return keywords.some(kw => content.includes(kw));
  }

  /**
   * 检测问题关键词
   * @private
   */
  _containsProblemKeywords(content) {
    const keywords = ['问题', '困难', '挑战', '疑问', 'bug', 'issue', 'problem'];
    return keywords.some(kw => content.includes(kw));
  }

  /**
   * 检测方案关键词
   * @private
   */
  _containsSolutionKeywords(content) {
    const keywords = ['方案', '解决', '建议', '提议', 'solution', 'propose'];
    return keywords.some(kw => content.includes(kw));
  }

  /**
   * 格式化摘要
   * @private
   */
  _formatSummary(timeline) {
    let summary = '# 讨论摘要\n\n';

    timeline.forEach((item, index) => {
      summary += `## ${index + 1}. ${item.emoji} ${item.title}\n`;
      summary += `**时间：** ${item.time}\n`;
      summary += `**类型：** ${item.type}\n`;
      summary += `**摘要：** ${item.summary}\n`;

      if (item.conclusions && item.conclusions.length > 0) {
        summary += `**结论：**\n`;
        item.conclusions.forEach(c => {
          summary += `- ${c}\n`;
        });
      }

      summary += '\n';
    });

    return summary;
  }

  /**
   * 删除标记
   */
  async deleteMarker(discussionId, markerId) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const index = context.markers.findIndex(m => m.id === markerId);
    if (index === -1) {
      throw new Error(`Marker ${markerId} not found`);
    }

    context.markers.splice(index, 1);
    context.stats.totalMarkers = context.markers.length;
    context.updatedAt = Date.now();

    await this.orchestrator.saveDiscussion(context);

    console.log(`[MarkerManager] Deleted marker ${markerId} from ${discussionId}`);

    return { success: true };
  }

  /**
   * 更新标记
   */
  async updateMarker(discussionId, markerId, updates) {
    const context = this.orchestrator.discussions.get(discussionId);
    if (!context) {
      throw new Error(`Discussion ${discussionId} not found`);
    }

    const marker = context.markers.find(m => m.id === markerId);
    if (!marker) {
      throw new Error(`Marker ${markerId} not found`);
    }

    // 更新标记
    Object.assign(marker, updates);
    context.updatedAt = Date.now();

    await this.orchestrator.saveDiscussion(context);

    console.log(`[MarkerManager] Updated marker ${markerId} in ${discussionId}`);

    return marker;
  }
}

module.exports = MarkerManager;
