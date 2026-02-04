/**
 * MAD v3.0 - 智能标记检测器
 * 自动检测讨论中的重要时刻，生成标记
 */

class MarkerDetector {
  constructor() {
    // 标记类型的关键词模式
    this.patterns = {
      decision: {
        keywords: ['决定', '确定', '选定', '采用', '选择', '同意', '批准', '确认'],
        emoji: '🎯'
      },
      problem: {
        keywords: ['问题', '困难', '挑战', '障碍', '风险', '隐患', '难题'],
        emoji: '⚠️'
      },
      solution: {
        keywords: ['解决方案', '解决方法', '建议', '提议', '优化', '改进', '方案'],
        emoji: '💡'
      },
      milestone: {
        keywords: ['完成', '达成', '实现', '突破', '里程碑', '阶段完成'],
        emoji: '🏆'
      },
      consensus: {
        keywords: ['一致同意', '达成共识', '共同决定', '大家都认为', '认同'],
        emoji: '🤝'
      }
    };
  }

  /**
   * 分析消息，检测是否需要标记
   */
  async analyzeMessage(message, context = {}) {
    const analysis = {
      shouldMark: false,
      markerType: null,
      confidence: 0,
      suggestedTitle: '',
      suggestedSummary: '',
      suggestedTags: []
    };

    // 1. 检查是否包含决策性语言
    const decisionScore = this.checkKeywords(message.content, this.patterns.decision.keywords);

    // 2. 检查是否包含问题描述
    const problemScore = this.checkKeywords(message.content, this.patterns.problem.keywords);

    // 3. 检查是否包含解决方案
    const solutionScore = this.checkKeywords(message.content, this.patterns.solution.keywords);

    // 4. 检查是否是里程碑
    const milestoneScore = this.checkKeywords(message.content, this.patterns.milestone.keywords);

    // 5. 检查是否是共识
    const consensusScore = this.checkKeywords(message.content, this.patterns.consensus.keywords);

    // 找出得分最高的类型
    const scores = {
      decision: decisionScore,
      problem: problemScore,
      solution: solutionScore,
      milestone: milestoneScore,
      consensus: consensusScore
    };

    const maxScore = Math.max(...Object.values(scores));

    // 如果得分超过阈值，建议标记
    if (maxScore >= 0.6) {
      const markerType = Object.keys(scores).find(key => scores[key] === maxScore);

      analysis.shouldMark = true;
      analysis.markerType = markerType;
      analysis.confidence = maxScore;
      analysis.suggestedTitle = this.generateTitle(message, markerType);
      analysis.suggestedSummary = this.generateSummary(message, markerType);
      analysis.suggestedTags = this.generateTags(message, markerType);
    }

    return analysis;
  }

  /**
   * 检查关键词
   */
  checkKeywords(text, keywords) {
    let matchCount = 0;
    const textLower = text.toLowerCase();

    keywords.forEach(keyword => {
      if (textLower.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    });

    // 简单的评分：匹配关键词数量 / 总关键词数量
    return matchCount / keywords.length;
  }

  /**
   * 生成标记标题
   */
  generateTitle(message, markerType) {
    const typeNames = {
      decision: '决策',
      problem: '问题识别',
      solution: '解决方案',
      milestone: '里程碑',
      consensus: '共识'
    };

    // 提取消息的前20个字作为标题
    const shortContent = message.content.substring(0, 20);

    return `${typeNames[markerType]}：${shortContent}`;
  }

  /**
   * 生成标记摘要
   */
  generateSummary(message, markerType) {
    // 提取消息中的关键句子
    const sentences = message.content.split(/[。！？\n]/);

    // 找出包含关键词的句子
    const pattern = this.patterns[markerType];
    const keywordSentences = sentences.filter(sentence => {
      return pattern.keywords.some(keyword => sentence.includes(keyword));
    });

    if (keywordSentences.length > 0) {
      return keywordSentences[0].trim();
    }

    // 如果没有找到，返回第一句话
    return sentences[0].trim() || message.content.substring(0, 100);
  }

  /**
   * 生成标记标签
   */
  generateTags(message, markerType) {
    const tags = [markerType];

    // 根据 Agent 角色添加标签
    if (message.role) {
      tags.push(message.role);
    }

    // 根据内容添加更多标签
    const content = message.content.toLowerCase();

    if (content.includes('架构')) tags.push('架构');
    if (content.includes('性能')) tags.push('性能');
    if (content.includes('安全')) tags.push('安全');
    if (content.includes('测试')) tags.push('测试');
    if (content.includes('文档')) tags.push('文档');

    return tags;
  }

  /**
   * 分析整个讨论，生成标记建议
   */
  async analyzeDiscussion(messages) {
    const suggestions = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // 跳过系统消息和已有的标记
      if (message.type === 'system' || message.isMarker) {
        continue;
      }

      const analysis = await this.analyzeMessage(message);

      if (analysis.shouldMark) {
        suggestions.push({
          messageId: message.id,
          ...analysis,
          messageIndex: i
        });
      }
    }

    // 按置信度排序
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions;
  }

  /**
   * 检测讨论的当前阶段
   */
  async detectDiscussionPhase(messages) {
    if (messages.length === 0) {
      return 'initial';
    }

    // 获取最近的标记
    const markers = messages.filter(m => m.isMarker);
    const lastMarker = markers[markers.length - 1];

    if (!lastMarker) {
      return 'discussing';
    }

    // 根据最后一个标记的类型判断当前阶段
    const phaseMap = {
      problem: 'problem_identified',
      solution: 'solution_proposed',
      decision: 'decision_made',
      milestone: 'milestone_reached',
      consensus: 'consensus_reached'
    };

    return phaseMap[lastMarker.markerType] || 'discussing';
  }

  /**
   * 智能摘要
   */
  async generateSmartSummary(messages, maxLength = 500) {
    // 1. 提取所有标记
    const markers = messages.filter(m => m.isMarker);

    // 2. 生成标记摘要
    const markerSummaries = markers.map(m => {
      return `[${m.markerType}] ${m.markerData?.title || m.content}`;
    }).join('\n');

    // 3. 提取最近的非标记消息
    const recentMessages = messages
      .filter(m => !m.isMarker)
      .slice(-5)
      .map(m => `${m.role}: ${m.content.substring(0, 50)}`)
      .join('\n');

    // 4. 组合摘要
    let summary = markerSummaries;

    if (recentMessages) {
      summary += '\n\n最近讨论：\n' + recentMessages;
    }

    // 5. 如果超过最大长度，截断
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }

    return summary;
  }
}

module.exports = MarkerDetector;
