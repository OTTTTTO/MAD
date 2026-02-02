/**
 * 工作流引擎
 * 
 * 提供讨论驱动的自动化工作流能力
 */

class WorkflowEngine {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.workflows = new Map();
    this.executions = new Map();
    this.triggers = new Map();
    this.actions = new Map();
    this.scheduledJobs = new Map();
    
    this.registerDefaultActions();
    this.start();
  }

  /**
   * 启动工作流引擎
   */
  start() {
    // 启动定时任务检查器
    this.scheduleChecker = setInterval(() => {
      this.checkScheduledWorkflows();
    }, 60000); // 每分钟检查一次
    
    console.log('[Workflow Engine] Started');
  }

  /**
   * 停止工作流引擎
   */
  stop() {
    if (this.scheduleChecker) {
      clearInterval(this.scheduleChecker);
      this.scheduleChecker = null;
    }
    console.log('[Workflow Engine] Stopped');
  }

  /**
   * 定义工作流
   * @param {string} workflowId - 工作流ID
   * @param {object} definition - 工作流定义
   */
  defineWorkflow(workflowId, definition) {
    const workflow = {
      id: workflowId,
      name: definition.name,
      description: definition.description || '',
      enabled: definition.enabled !== false,
      triggers: definition.triggers || [],
      steps: definition.steps || [],
      variables: definition.variables || {},
      retryPolicy: definition.retryPolicy || {
        maxAttempts: 3,
        backoffMs: 1000
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.workflows.set(workflowId, workflow);

    // 注册触发器
    for (const trigger of workflow.triggers) {
      this.registerTrigger(workflowId, trigger);
    }

    return workflow;
  }

  /**
   * 注册触发器
   * @param {string} workflowId - 工作流ID
   * @param {object} trigger - 触发器配置
   */
  registerTrigger(workflowId, trigger) {
    const triggerKey = `${trigger.type}:${trigger.event || '*'}`;
    
    if (!this.triggers.has(triggerKey)) {
      this.triggers.set(triggerKey, []);
    }

    this.triggers.get(triggerKey).push({
      workflowId,
      config: trigger
    });

    // 注册定时触发器
    if (trigger.type === 'schedule') {
      this.scheduleWorkflow(workflowId, trigger);
    }
  }

  /**
   * 调度工作流
   * @param {string} workflowId - 工作流ID
   * @param {object} trigger - 触发器配置
   */
  scheduleWorkflow(workflowId, trigger) {
    const { cron, interval } = trigger;
    
    if (cron) {
      // 简化实现：使用 interval
      // 实际应用中应该使用 cron 库
      console.warn('[Workflow Engine] Cron not fully implemented, using interval');
    }

    if (interval) {
      const job = setInterval(() => {
        this.executeWorkflow(workflowId, { trigger: 'schedule' });
      }, interval);

      this.scheduledJobs.set(workflowId, job);
    }
  }

  /**
   * 检查计划的工作流
   */
  checkScheduledWorkflows() {
    // 检查是否有基于时间的触发器需要触发
    const now = new Date();
    const currentTime = now.getTime();

    for (const [workflowId, workflow] of this.workflows.entries()) {
      if (!workflow.enabled) continue;

      for (const trigger of workflow.triggers) {
        if (trigger.type === 'time' && trigger.time) {
          const [hours, minutes] = trigger.time.split(':').map(Number);
          const triggerTime = new Date(now);
          triggerTime.setHours(hours, minutes, 0, 0);

          // 如果触发时间在过去5分钟内
          if (currentTime >= triggerTime.getTime() && 
              currentTime < triggerTime.getTime() + 300000) {
            
            // 避免重复触发
            const lastExecution = this.getLastExecutionTime(workflowId);
            if (!lastExecution || lastExecution < triggerTime.getTime()) {
              this.executeWorkflow(workflowId, { trigger: 'time' });
            }
          }
        }
      }
    }
  }

  /**
   * 触发工作流（通过事件）
   * @param {string} event - 事件名称
   * @param {object} data - 事件数据
   */
  async triggerWorkflow(event, data) {
    const matchingTriggers = this.triggers.get(`event:${event}`) || [];
    const wildcardTriggers = this.triggers.get(`event:*`) || [];

    const allTriggers = [...matchingTriggers, ...wildcardTriggers];
    
    const results = [];
    for (const { workflowId, config } of allTriggers) {
      const workflow = this.workflows.get(workflowId);
      if (!workflow || !workflow.enabled) continue;

      // 检查条件
      if (config.conditions && !this.evaluateConditions(config.conditions, data)) {
        continue;
      }

      // 执行工作流
      const result = await this.executeWorkflow(workflowId, {
        trigger: 'event',
        event,
        data
      });

      results.push(result);
    }

    return results;
  }

  /**
   * 执行工作流
   * @param {string} workflowId - 工作流ID
   * @param {object} context - 执行上下文
   */
  async executeWorkflow(workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    const execution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'running',
      startedAt: Date.now(),
      context: {
        ...workflow.variables,
        ...context
      },
      results: {},
      steps: [],
      logs: []
    };

    this.executions.set(execution.id, execution);
    this.log(execution, 'Workflow started');

    try {
      // 执行每个步骤
      for (const step of workflow.steps) {
        const stepResult = await this.executeStep(step, execution);
        execution.steps.push(stepResult);

        // 检查是否应该继续
        if (stepResult.shouldStop) {
          this.log(execution, `Workflow stopped at step: ${step.name}`);
          break;
        }

        // 检查是否失败
        if (stepResult.status === 'failed' && step.onFailure === 'stop') {
          throw new Error(`Step ${step.name} failed: ${stepResult.error}`);
        }
      }

      execution.status = 'completed';
      execution.completedAt = Date.now();
      execution.duration = execution.completedAt - execution.startedAt;
      this.log(execution, 'Workflow completed');

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = Date.now();
      execution.duration = execution.completedAt - execution.startedAt;
      this.log(execution, `Workflow failed: ${error.message}`);
    }

    return execution;
  }

  /**
   * 执行步骤
   * @param {object} step - 步骤配置
   * @param {object} execution - 执行对象
   */
  async executeStep(step, execution) {
    const result = {
      id: step.id,
      name: step.name,
      type: step.type,
      startedAt: Date.now(),
      status: 'running'
    };

    this.log(execution, `Executing step: ${step.name}`);

    try {
      // 根据步骤类型执行不同的操作
      const action = this.actions.get(step.type);
      if (!action) {
        throw new Error(`Unknown action type: ${step.type}`);
      }

      const actionContext = {
        ...execution.context,
        step,
        execution
      };

      result.data = await action.execute(step.config, actionContext, this.orchestrator);

      // 更新上下文
      if (result.data) {
        Object.assign(execution.context, result.data);
      }

      result.status = 'completed';
      this.log(execution, `Step completed: ${step.name}`);

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      this.log(execution, `Step failed: ${step.name} - ${error.message}`);

      // 重试逻辑
      if (step.retry && step.retry.maxAttempts > 0) {
        const attempt = (result.attempts || 0) + 1;
        if (attempt <= step.retry.maxAttempts) {
          result.attempts = attempt;
          result.status = 'retrying';
          
          // 等待后退时间
          const backoffMs = step.retry.backoffMs || 1000;
          await this.delay(backoffMs * attempt);
          
          return this.executeStep(step, execution);
        }
      }
    }

    result.completedAt = Date.now();
    result.duration = result.completedAt - result.startedAt;
    return result;
  }

  /**
   * 评估条件
   * @param {object} conditions - 条件对象
   * @param {object} context - 上下文
   */
  evaluateConditions(conditions, context) {
    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = this.resolveValue(key, context);
      
      if (typeof value === 'object' && value.operator) {
        // 操作符比较
        if (!this.evaluateOperator(contextValue, value)) {
          return false;
        }
      } else {
        // 简单比较
        if (contextValue !== value) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 评估操作符
   * @param {any} actual - 实际值
   * @param {object} condition - 条件对象
   */
  evaluateOperator(actual, condition) {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals': return actual === value;
      case 'notEquals': return actual !== value;
      case 'greaterThan': return actual > value;
      case 'lessThan': return actual < value;
      case 'contains': return Array.isArray(actual) ? actual.includes(value) : String(actual).includes(value);
      case 'matches': return new RegExp(value).test(actual);
      case 'exists': return actual !== undefined && actual !== null;
      default: return true;
    }
  }

  /**
   * 解析值
   * @param {string} path - 值路径
   * @param {object} context - 上下文
   */
  resolveValue(path, context) {
    const parts = path.split('.');
    let value = context;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 注册默认动作
   */
  registerDefaultActions() {
    // 讨论相关动作
    this.registerAction('createDiscussion', {
      execute: async (config, context, orchestrator) => {
        const topic = this.interpolate(config.topic, context);
        const participants = config.participants || [];

        const { discussionId } = await orchestrator.createDiscussion(topic, {
          participants,
          metadata: config.metadata
        });

        // 等待讨论完成（如果需要）
        if (config.waitForCompletion) {
          await this.waitForDiscussion(discussionId, orchestrator);
        }

        return { discussionId, topic };
      }
    });

    // 通知动作
    this.registerAction('sendNotification', {
      execute: async (config, context, orchestrator) => {
        const message = this.interpolate(config.message, context);
        const target = config.target || 'log';

        if (target === 'log') {
          console.log(`[Workflow Notification] ${message}`);
        } else if (target === 'integration') {
          // 通过集成发送通知
          if (orchestrator.integrations) {
            await orchestrator.integrations.triggerEvent('notification', {
              message,
              level: config.level || 'info'
            });
          }
        }

        return { sent: true, message };
      }
    });

    // API 调用动作
    this.registerAction('callAPI', {
      execute: async (config, context) => {
        const fetch = require('node-fetch');
        const url = this.interpolate(config.url, context);
        const method = config.method || 'GET';
        const headers = config.headers || {};
        const body = config.body ? this.interpolate(config.body, context) : undefined;

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();
        return { success: response.ok, data, status: response.status };
      }
    });

    // 条件动作
    this.registerAction('condition', {
      execute: async (config, context) => {
        const result = this.evaluateConditions(config.conditions, context);
        return { result, shouldStop: !result };
      }
    });

    // 延迟动作
    this.registerAction('delay', {
      execute: async (config, context) => {
        const duration = config.duration || 1000;
        await this.delay(duration);
        return { delayed: duration };
      }
    });

    // 设置变量动作
    this.registerAction('setVariable', {
      execute: async (config, context) => {
        const updates = {};
        for (const [key, value] of Object.entries(config.variables)) {
          updates[key] = this.interpolate(value, context);
        }
        return updates;
      }
    });
  }

  /**
   * 注册动作
   * @param {string} actionType - 动作类型
   * @param {object} action - 动作定义
   */
  registerAction(actionType, action) {
    this.actions.set(actionType, action);
  }

  /**
   * 等待讨论完成
   */
  async waitForDiscussion(discussionId, orchestrator) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const discussion = orchestrator.discussions.get(discussionId);
        if (discussion && discussion.endedAt) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);
    });
  }

  /**
   * 字符串插值
   */
  interpolate(template, context) {
    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return this.resolveValue(key, context) !== undefined 
        ? this.resolveValue(key, context) 
        : match;
    });
  }

  /**
   * 延迟
   */
  async delay(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * 记录日志
   */
  log(execution, message) {
    const logEntry = {
      timestamp: Date.now(),
      message
    };
    execution.logs.push(logEntry);
    console.log(`[Workflow ${execution.id}] ${message}`);
  }

  /**
   * 获取工作流列表
   */
  getWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * 获取工作流
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * 删除工作流
   */
  deleteWorkflow(workflowId) {
    // 取消定时任务
    const scheduledJob = this.scheduledJobs.get(workflowId);
    if (scheduledJob) {
      clearInterval(scheduledJob);
      this.scheduledJobs.delete(workflowId);
    }

    // 删除触发器
    for (const [key, triggers] of this.triggers.entries()) {
      const filtered = triggers.filter(t => t.workflowId !== workflowId);
      if (filtered.length === 0) {
        this.triggers.delete(key);
      } else {
        this.triggers.set(key, filtered);
      }
    }

    return this.workflows.delete(workflowId);
  }

  /**
   * 获取工作流执行历史
   */
  getExecutions(workflowId, limit = 50) {
    const allExecutions = Array.from(this.executions.values());
    
    const filtered = workflowId 
      ? allExecutions.filter(exec => exec.workflowId === workflowId)
      : allExecutions;

    return filtered
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  /**
   * 获取执行详情
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * 获取最后执行时间
   */
  getLastExecutionTime(workflowId) {
    const executions = this.getExecutions(workflowId, 1);
    return executions.length > 0 ? executions[0].startedAt : null;
  }

  /**
   * 清理旧的执行记录
   */
  cleanupExecutions(olderThanMs = 7 * 24 * 60 * 60 * 1000) {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [id, execution] of this.executions.entries()) {
      if (execution.startedAt < cutoff) {
        this.executions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 导出工作流配置
   */
  exportWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const { id, createdAt, updatedAt, ...config } = workflow;
    return config;
  }

  /**
   * 导入工作流
   */
  importWorkflow(workflowId, config) {
    return this.defineWorkflow(workflowId, config);
  }

  /**
   * 启用/禁用工作流
   */
  setWorkflowEnabled(workflowId, enabled) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.enabled = enabled;
    workflow.updatedAt = Date.now();
    return workflow;
  }
}

module.exports = { WorkflowEngine };
