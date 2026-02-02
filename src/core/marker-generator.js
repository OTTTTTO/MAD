/**
 * MAD v3.0 - 智能标记生成器
 * 根据分析结果生成和添加标记
 */

const { Marker } = require('../models/project-group.js');

class MarkerGenerator {
  constructor(detector) {
    this.detector = detector;
  }

  /**
   * 为消息生成标记
   */
  async generateMarker(message, analysis, projectId) {
    const marker = new Marker(
      `marker-${Date.now()}`,
      analysis.suggestedTitle,
      analysis.markerType,
      message.id
    );

    // 设置摘要
    if (analysis.suggestedSummary) {
      marker.setSummary(analysis.suggestedSummary);
    }

    // 添加标签
    if (analysis.suggestedTags) {
      analysis.suggestedTags.forEach(tag => marker.addTag(tag));
    }

    // 设置置信度
    marker.confidence = analysis.confidence;

    // 添加元数据
    marker.metadata = {
      generatedBy: 'AI',
      timestamp: Date.now(),
      messageRole: message.role,
      projectId: projectId
    };

    return marker;
  }

  /**
   * 批量生成标记
   */
  async generateMarkers(messages, projectId, options = {}) {
    const markers = [];
    const maxMarkers = options.maxMarkers || 10;
    const minConfidence = options.minConfidence || 0.6;

    // 分析讨论
    const suggestions = await this.detector.analyzeDiscussion(messages);

    // 过滤置信度
    const filteredSuggestions = suggestions.filter(s => s.confidence >= minConfidence);

    // 限制数量
    const limitedSuggestions = filteredSuggestions.slice(0, maxMarkers);

    // 生成标记
    for (const suggestion of limitedSuggestions) {
      const message = messages.find(m => m.id === suggestion.messageId);

      if (message) {
        const marker = await this.generateMarker(message, suggestion, projectId);
        markers.push(marker);
      }
    }

    return markers;
  }

  /**
   * 生成项目总结标记
   */
  async generateSummaryMarker(messages, projectId) {
    const summary = await this.detector.generateSmartSummary(messages);

    const marker = new Marker(
      `marker-summary-${Date.now()}`,
      '项目总结',
      'milestone',
      null
    );

    marker.setSummary(summary);
    marker.addTag('总结');
    marker.addTag('项目');

    marker.metadata = {
      generatedBy: 'AI',
      timestamp: Date.now(),
      projectId: projectId,
      messageCount: messages.length
    };

    return marker;
  }

  /**
   * 生成阶段标记
   */
  async generatePhaseMarker(phase, messages, projectId) {
    const phaseNames = {
      'initial': '项目启动',
      'problem_identified': '问题识别',
      'solution_proposed': '方案提出',
      'decision_made': '决策完成',
      'milestone_reached': '里程碑达成',
      'consensus_reached': '达成共识',
      'discussing': '讨论中'
    };

    const marker = new Marker(
      `marker-phase-${Date.now()}`,
      `阶段：${phaseNames[phase] || phase}`,
      'milestone',
      null
    );

    // 生成阶段摘要
    const recentMessages = messages.slice(-10);
    const phaseSummary = await this.detector.generateSmartSummary(recentMessages, 200);

    marker.setSummary(phaseSummary);
    marker.addTag('阶段');
    marker.addTag(phase);

    marker.metadata = {
      generatedBy: 'AI',
      timestamp: Date.now(),
      projectId: projectId,
      phase: phase
    };

    return marker;
  }

  /**
   * 检测并添加标记
   */
  async detectAndAddMarkers(projectId, flowManager, projectManager, options = {}) {
    // 获取项目消息
    const messages = await flowManager.getMessages(projectId);

    // 生成标记建议
    const suggestions = await this.detector.analyzeDiscussion(messages);

    // 过滤和限制
    const minConfidence = options.minConfidence || 0.7;
    const maxMarkers = options.maxMarkers || 5;

    const filteredSuggestions = suggestions
      .filter(s => s.confidence >= minConfidence)
      .slice(0, maxMarkers);

    // 添加标记
    const addedMarkers = [];

    for (const suggestion of filteredSuggestions) {
      const message = messages.find(m => m.id === suggestion.messageId);

      if (message) {
        const marker = await this.generateMarker(message, suggestion, projectId);

        // 添加到项目
        const project = await projectManager.getProject(projectId);
        if (project) {
          project.addMarker(marker);
          await projectManager.saveProject(project);

          // 添加到消息流
          await flowManager.addMessage(projectId, {
            role: 'system',
            content: `[${marker.type}] ${marker.title}: ${marker.summary}`,
            type: 'marker',
            isMarker: true,
            markerType: marker.type,
            markerData: marker
          });

          addedMarkers.push(marker);
        }
      }
    }

    return addedMarkers;
  }

  /**
   * 自动标记优化
   */
  async optimizeMarkers(projectId, flowManager, projectManager) {
    const messages = await flowManager.getMessages(projectId);
    const project = await projectManager.getProject(projectId);

    if (!project) {
      return [];
    }

    // 检测当前阶段
    const phase = await this.detector.detectDiscussionPhase(messages);

    // 检查是否需要添加阶段标记
    const lastMarker = project.markers[project.markers.length - 1];
    const shouldAddPhaseMarker = !lastMarker || lastMarker.type !== 'milestone';

    const addedMarkers = [];

    if (shouldAddPhaseMarker) {
      const phaseMarker = await this.generatePhaseMarker(phase, messages, projectId);

      project.addMarker(phaseMarker);
      await projectManager.saveProject(project);

      await flowManager.addMessage(projectId, {
        role: 'system',
        content: `[阶段] ${phaseMarker.title}: ${phaseMarker.summary}`,
        type: 'marker',
        isMarker: true,
        markerType: phaseMarker.type,
        markerData: phaseMarker
      });

      addedMarkers.push(phaseMarker);
    }

    // 检测并添加内容标记
    const contentMarkers = await this.detectAndAddMarkers(
      projectId,
      flowManager,
      projectManager,
      { minConfidence: 0.7, maxMarkers: 3 }
    );

    addedMarkers.push(...contentMarkers);

    return addedMarkers;
  }
}

module.exports = MarkerGenerator;
