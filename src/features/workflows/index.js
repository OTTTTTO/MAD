/**
 * 工作流系统
 * 
 * 提供自动化工作流能力
 */

const { WorkflowEngine } = require('./engine');
const { WORKFLOW_TEMPLATES, WorkflowTemplateManager } = require('./templates');

/**
 * 初始化工作流系统
 * @param {object} orchestrator - Orchestrator 实例
 * @returns {object}
 */
function initializeWorkflows(orchestrator) {
  const engine = new WorkflowEngine(orchestrator);
  const templateManager = new WorkflowTemplateManager();

  return {
    engine,
    templateManager,

    // 工作流管理
    defineWorkflow: (id, config) => engine.defineWorkflow(id, config),
    
    getWorkflow: (id) => engine.getWorkflow(id),
    
    getWorkflows: () => engine.getWorkflows(),
    
    deleteWorkflow: (id) => engine.deleteWorkflow(id),
    
    enableWorkflow: (id) => engine.setWorkflowEnabled(id, true),
    
    disableWorkflow: (id) => engine.setWorkflowEnabled(id, false),

    // 工作流执行
    executeWorkflow: (id, context) => engine.executeWorkflow(id, context),
    
    triggerWorkflow: (event, data) => engine.triggerWorkflow(event, data),

    // 执行历史
    getExecutions: (workflowId, limit) => engine.getExecutions(workflowId, limit),
    
    getExecution: (id) => engine.getExecution(id),

    // 模板管理
    getTemplate: (id) => templateManager.getTemplate(id),
    
    getTemplates: () => templateManager.getAllTemplates(),
    
    createFromTemplate: (templateId, workflowId, overrides) => {
      const config = templateManager.createFromTemplate(templateId, workflowId, overrides);
      return engine.defineWorkflow(workflowId, config);
    },

    // 维护
    cleanup: (olderThanMs) => engine.cleanupExecutions(olderThanMs),
    
    stop: () => engine.stop()
  };
}

module.exports = {
  // 核心类
  WorkflowEngine,
  WorkflowTemplateManager,

  // 模板
  WORKFLOW_TEMPLATES,

  // 初始化函数
  initializeWorkflows
};
