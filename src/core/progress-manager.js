/**
 * MAD v3.0 - 智能推进管理器
 * 负责项目组的自主推进、主动询问、进度跟踪
 */

class ProgressManager {
  constructor() {
    this.activeProjects = new Map();
  }

  /**
   * 开始监控项目
   */
  async startMonitoring(projectId, orchestrator) {
    const monitor = {
      projectId,
      orchestrator,
      status: 'active',
      startTime: Date.now(),
      lastActivity: Date.now(),
      milestones: [],
      questions: []
    };

    this.activeProjects.set(projectId, monitor);

    // 启动推进循环
    this.startProgressLoop(projectId);

    console.log(`[ProgressManager] 开始监控项目: ${projectId}`);
    return monitor;
  }

  /**
   * 推进循环
   */
  async startProgressLoop(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor || monitor.status !== 'active') {
      return;
    }

    try {
      // 检查是否需要推进
      const shouldProgress = await this.shouldProgress(projectId);

      if (shouldProgress) {
        await this.makeProgress(projectId);
      }

      // 检查是否需要询问
      const shouldAsk = await this.shouldAskQuestion(projectId);

      if (shouldAsk) {
        await this.generateQuestion(projectId);
      }

      // 检查是否完成
      const isComplete = await this.checkCompletion(projectId);

      if (isComplete) {
        await this.completeProject(projectId);
        return;
      }

    } catch (error) {
      console.error(`[ProgressManager] 推进失败: ${projectId}`, error);
    }

    // 继续循环（1分钟后）
    setTimeout(() => this.startProgressLoop(projectId), 60000);
  }

  /**
   * 判断是否需要推进
   */
  async shouldProgress(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return false;

    // 检查距离上次活动的时间
    const inactiveTime = Date.now() - monitor.lastActivity;

    // 如果超过5分钟没有活动，可能需要推进
    if (inactiveTime > 5 * 60 * 1000) {
      return true;
    }

    return false;
  }

  /**
   * 执行推进
   */
  async makeProgress(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return;

    console.log(`[ProgressManager] 推进项目: ${projectId}`);

    // 分析当前状态
    const project = await monitor.orchestrator.projectManager.getProject(projectId);
    if (!project) return;

    // 获取最近的标记
    const lastMarker = project.markers[project.markers.length - 1];

    if (!lastMarker || lastMarker.type === 'solution') {
      // 上一个标记是解决方案，可能需要新的决策或问题识别
      await this.triggerAgentAction(projectId, 'identify_problem');
    } else if (lastMarker.type === 'problem') {
      // 上一个标记是问题，需要解决方案
      await this.triggerAgentAction(projectId, 'propose_solution');
    } else if (lastMarker.type === 'decision') {
      // 上一个标记是决策，继续执行
      await this.triggerAgentAction(projectId, 'continue_discussion');
    }

    // 更新活动时间
    monitor.lastActivity = Date.now();
  }

  /**
   * 判断是否需要询问
   */
  async shouldAskQuestion(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return false;

    // 如果项目卡住超过10分钟，主动询问
    const stuckTime = Date.now() - monitor.lastActivity;

    if (stuckTime > 10 * 60 * 1000 && monitor.questions.length < 3) {
      return true;
    }

    return false;
  }

  /**
   * 生成问题
   */
  async generateQuestion(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return;

    console.log(`[ProgressManager] 主动询问: ${projectId}`);

    // 分析当前状态，生成问题
    const project = await monitor.orchestrator.projectManager.getProject(projectId);
    if (!project) return;

    const question = {
      id: `q-${Date.now()}`,
      timestamp: Date.now(),
      content: '',
      status: 'pending'
    };

    // 根据项目状态生成问题
    const lastMessage = project.messages[project.messages.length - 1];

    if (!lastMessage) {
      question.content = '项目还没有开始，请问您希望先讨论什么方面？';
    } else {
      // 分析最近的消息，找出可能的疑问点
      question.content = await this.analyzeAndGenerateQuestion(project);
    }

    monitor.questions.push(question);

    // 通知用户
    await this.notifyUser(projectId, question);
  }

  /**
   * 触发 Agent 动作
   */
  async triggerAgentAction(projectId, action) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return;

    const project = await monitor.orchestrator.projectManager.getProject(projectId);
    if (!project) return;

    // 选择合适的 Agent
    const agent = this.selectAgentForAction(project, action);

    if (!agent) {
      console.log(`[ProgressManager] 没有找到合适的 Agent 执行动作: ${action}`);
      return;
    }

    // 触发 Agent 发言
    console.log(`[ProgressManager] 触发 Agent ${agent.id} 执行: ${action}`);

    // 这里需要调用 orchestrator 的 Agent 发言接口
    // await monitor.orchestrator.agentSpeak(projectId, agent.id, ...);
  }

  /**
   * 选择 Agent
   */
  selectAgentForAction(project, action) {
    const participants = project.participants || [];

    // 根据动作类型选择合适的 Agent
    const actionAgentMap = {
      'identify_problem': ['technical', 'testing'],
      'propose_solution': ['technical', 'architect'],
      'continue_discussion': ['coordinator']
    };

    const preferredRoles = actionAgentMap[action] || [];

    // 找到匹配的 Agent
    for (const role of preferredRoles) {
      const agent = participants.find(p => p.role === role);
      if (agent) return agent;
    }

    // 如果没有找到，返回第一个 Agent
    return participants[0];
  }

  /**
   * 分析并生成问题
   */
  async analyzeAndGenerateQuestion(project) {
    // 简单的问答题库
    const questionTemplates = [
      '关于{topic}，您还有什么补充吗？',
      '刚才讨论了{topic}，下一步您想做什么？',
      '对于{topic}，还有什么疑问吗？',
      '项目进展：已完成{completed}，下一步您想做什么？'
    ];

    // 选择一个合适的问题
    const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

    return template
      .replace('{topic}', project.name)
      .replace('{completed}', '初始讨论');
  }

  /**
   * 通知用户
   */
  async notifyUser(projectId, question) {
    console.log(`[ProgressManager] 通知用户 - 项目: ${projectId}, 问题: ${question.content}`);
    // TODO: 实现实际的通知机制（WebSocket、消息等）
  }

  /**
   * 检查是否完成
   */
  async checkCompletion(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return false;

    const project = await monitor.orchestrator.projectManager.getProject(projectId);
    if (!project) return false;

    // 简单的完成判断：
    // 1. 超过2小时没有活动
    // 2. 或达到某个里程碑

    const inactiveTime = Date.now() - monitor.lastActivity;
    if (inactiveTime > 2 * 60 * 60 * 1000) {
      return true;
    }

    // 检查是否有完成标记
    const completionMarker = project.markers.find(m => m.type === 'milestone' && m.title === '完成');
    if (completionMarker) {
      return true;
    }

    return false;
  }

  /**
   * 完成项目
   */
  async completeProject(projectId) {
    const monitor = this.activeProjects.get(projectId);
    if (!monitor) return;

    console.log(`[ProgressManager] 完成项目: ${projectId}`);

    monitor.status = 'completed';
    monitor.endTime = Date.now();

    // 更新项目状态
    const project = await monitor.orchestrator.projectManager.getProject(projectId);
    if (project) {
      project.status = 'completed';
      await monitor.orchestrator.projectManager.saveProject(project);
    }

    // 停止监控
    this.stopMonitoring(projectId);
  }

  /**
   * 停止监控
   */
  stopMonitoring(projectId) {
    this.activeProjects.delete(projectId);
    console.log(`[ProgressManager] 停止监控项目: ${projectId}`);
  }

  /**
   * 获取项目状态
   */
  getProjectStatus(projectId) {
    const monitor = this.activeProjects.get(projectId);

    if (!monitor) {
      return { status: 'not_monitored' };
    }

    return {
      status: monitor.status,
      startTime: monitor.startTime,
      lastActivity: monitor.lastActivity,
      milestones: monitor.milestones,
      questions: monitor.questions
    };
  }
}

module.exports = ProgressManager;
