/**
 * MAD v3.0 - 集成入口
 * 将所有 v3.0 功能集成到主 orchestrator 中
 */

const ProjectManager = require('./core/project-manager.js');
const ExpertManager = require('./core/expert-manager.js');
const SmartAnalyzer = require('./core/smart-analyzer.js');
const ProjectFlowManager = require('./core/project-flow.js');
const ProgressManager = require('./core/progress-manager.js');
const MarkerDetector = require('./core/marker-detector.js');
const MarkerGenerator = require('./core/marker-generator.js');

class V3Integration {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;

    // 初始化管理器
    this.projectManager = new ProjectManager();
    this.expertManager = new ExpertManager();
    this.smartAnalyzer = new SmartAnalyzer();
    this.flowManager = new ProjectFlowManager();
    this.progressManager = new ProgressManager();

    // v3.3.0: 智能标记
    this.markerDetector = new MarkerDetector();
    this.markerGenerator = new MarkerGenerator(this.markerDetector);
  }

  /**
   * 初始化 v3.0 功能
   */
  async initialize() {
    console.log('[V3] 初始化 v3.0 功能...');

    await Promise.all([
      this.projectManager.init(),
      this.expertManager.init()
    ]);

    console.log('[V3] v3.0 功能已初始化');
  }

  /**
   * 自然语言创建项目
   */
  async createProjectFromInput(userInput, options = {}) {
    console.log(`[V3] 分析用户输入: ${userInput}`);

    // 1. 分析用户输入
    const analysis = await this.smartAnalyzer.analyzeUserInput(userInput);

    console.log('[V3] 分析结果:', {
      domains: analysis.domains,
      experts: analysis.recommendedExperts,
      category: analysis.category
    });

    // 2. 检查是否有相关项目组
    const existingProjects = await this.projectManager.listProjects({
      category: analysis.category
    });

    let project;

    if (existingProjects.length > 0 && options.mode === 'auto') {
      // 使用现有项目组
      project = existingProjects[0];
      console.log(`[V3] 使用现有项目组: ${project.id}`);
    } else {
      // 创建新项目组
      project = await this.projectManager.createProject(
        analysis.suggestedName,
        analysis.category,
        {
          description: userInput,
          participants: []
        }
      );
      console.log(`[V3] 创建新项目组: ${project.id}`);
    }

    // 3. 选取或创建专家
    const experts = await this.expertManager.selectExperts(analysis.recommendedExperts);

    console.log(`[V3] 选取专家:`, experts.map(e => e.id));

    // 4. 添加专家到项目组
    project.participants = experts.map(expert => ({
      id: expert.id,
      name: expert.name,
      role: expert.role,
      emoji: expert.emoji
    }));

    await this.projectManager.saveProject(project);

    // 5. 开始监控项目（智能推进）
    await this.progressManager.startMonitoring(project.id, this);

    // 6. 添加第一条消息
    await this.flowManager.addMessage(project.id, {
      role: 'system',
      content: `项目已创建，主题：${userInput}`,
      type: 'system'
    });

    return {
      project,
      experts,
      analysis
    };
  }

  /**
   * Agent 发言（添加到项目流）
   */
  async agentSpeak(projectId, agentId, content) {
    console.log(`[V3] Agent ${agentId} 在项目 ${projectId} 发言`);

    const message = {
      role: agentId,
      content,
      type: 'agent'
    };

    const addedMessage = await this.flowManager.addMessage(projectId, message);

    // 更新项目
    const project = await this.projectManager.getProject(projectId);
    if (project) {
      project.messages.push(addedMessage);
      project.stats.updatedAt = Date.now();
      await this.projectManager.saveProject(project);
    }

    // 更新推进管理器的活动时间
    const monitor = this.progressManager.activeProjects.get(projectId);
    if (monitor) {
      monitor.lastActivity = Date.now();
    }

    return addedMessage;
  }

  /**
   * 添加标记
   */
  async addMarker(projectId, markerData) {
    const project = await this.projectManager.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    const { Marker } = require('./models/project-group.js');
    const marker = new Marker(
      markerData.id || `marker-${Date.now()}`,
      markerData.title,
      markerData.type,
      markerData.messageId
    );

    if (markerData.summary) {
      marker.setSummary(markerData.summary);
    }

    if (markerData.conclusions) {
      markerData.conclusions.forEach(c => marker.addConclusion(c));
    }

    if (markerData.tags) {
      markerData.tags.forEach(t => marker.addTag(t));
    }

    project.addMarker(marker);

    // 添加标记作为消息
    await this.flowManager.addMessage(projectId, {
      role: 'system',
      content: `[${marker.type}] ${marker.title}: ${marker.summary}`,
      type: 'marker',
      isMarker: true,
      markerType: marker.type,
      markerData: marker
    });

    await this.projectManager.saveProject(project);

    // 更新推进管理器的里程碑
    const monitor = this.progressManager.activeProjects.get(projectId);
    if (monitor && marker.type === 'milestone') {
      monitor.milestones.push(marker);
    }

    return marker;
  }

  /**
   * 获取项目的压缩上下文
   */
  async getCompressedContext(projectId, maxTokens = 8000) {
    return await this.flowManager.getCompressedContext(projectId, maxTokens);
  }

  /**
   * 获取项目状态
   */
  getProjectStatus(projectId) {
    return this.progressManager.getProjectStatus(projectId);
  }

  /**
   * 获取所有项目组
   */
  async listProjects(filters = {}) {
    return await this.projectManager.listProjects(filters);
  }

  /**
   * 获取项目组详情
   */
  async getProject(projectId) {
    const project = await this.projectManager.getProject(projectId);
    if (!project) return null;

    // 获取流状态
    const flowStats = this.flowManager.getFlowStats(projectId);

    return {
      ...project,
      flowStats
    };
  }

  /**
   * 获取项目消息
   */
  async getProjectMessages(projectId, options = {}) {
    return await this.flowManager.getMessages(projectId, options);
  }

  /**
   * v3.3.0: 检测并添加标记
   */
  async detectAndAddMarkers(projectId, options = {}) {
    return await this.markerGenerator.detectAndAddMarkers(
      projectId,
      this.flowManager,
      this.projectManager,
      options
    );
  }

  /**
   * v3.3.0: 优化标记
   */
  async optimizeMarkers(projectId) {
    return await this.markerGenerator.optimizeMarkers(
      projectId,
      this.flowManager,
      this.projectManager
    );
  }

  /**
   * v3.3.0: 生成项目总结
   */
  async generateProjectSummary(projectId) {
    const messages = await this.flowManager.getMessages(projectId);
    const summary = await this.markerDetector.generateSmartSummary(messages);
    return summary;
  }

  /**
   * v3.3.0: 检测讨论阶段
   */
  async detectDiscussionPhase(projectId) {
    const messages = await this.flowManager.getMessages(projectId);
    const phase = await this.markerDetector.detectDiscussionPhase(messages);
    return phase;
  }

  /**
   * v3.3.0: 获取标记建议
   */
  async getMarkerSuggestions(projectId) {
    const messages = await this.flowManager.getMessages(projectId);
    const suggestions = await this.markerDetector.analyzeDiscussion(messages);
    return suggestions;
  }

  /**
   * v3.6.0: 搜索项目组
   */
  async searchProjects(keyword, options = {}) {
    return await this.projectManager.searchProjects(keyword, options);
  }

  /**
   * v3.6.0: 获取项目统计信息
   */
  async getStatistics() {
    return await this.projectManager.getStatistics();
  }

  /**
   * v3.6.0: 按标签搜索项目
   */
  async findProjectsByTag(tag) {
    return await this.projectManager.findProjectsByTag(tag);
  }

  /**
   * v3.6.0: 获取所有标签
   */
  async getAllTags() {
    return await this.projectManager.getAllTags();
  }

  /**
   * v3.6.0: 添加标签到项目
   */
  async addTagToProject(projectId, tag) {
    return await this.projectManager.addTagToProject(projectId, tag);
  }

  /**
   * v3.6.0: 从项目移除标签
   */
  async removeTagFromProject(projectId, tag) {
    return await this.projectManager.removeTagFromProject(projectId, tag);
  }
}

module.exports = V3Integration;
