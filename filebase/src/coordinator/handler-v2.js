/**
 * MAD FileBased - 请求处理器（重构版）
 * 
 * 用途：处理请求，使用真实的subAgent生成讨论
 * 
 * 变更：
 * - 使用 tool.sessions_spawn 创建真实subAgent
 * - 通过共享文件（task/response）通信
 * - 每个专家使用LLM生成真实响应
 */

const FileManager = require('../lib/file-manager.js');
const { defaultConfig } = require('../lib/config.js');
const TaskManager = require('./task-manager.js');
const {
  getExpertList,
  buildExpertTaskPrompt,
  buildCoordinatorSummaryPrompt
} = require('./expert-config.js');
const {
  sleep,
  createError
} = require('../lib/utils.js');

/**
 * 请求处理器类（重构版）
 */
class RequestHandler {
  constructor(fileManager = null, tool = null) {
    this.fm = fileManager || new FileManager(defaultConfig);
    this.taskManager = new TaskManager(this.fm.config);
    this.tool = tool; // OpenClaw tool对象
    
    // 专家列表
    this.experts = getExpertList();
  }
  
  /**
   * 设置tool（用于subAgent调用）
   */
  setTool(tool) {
    this.tool = tool;
  }
  
  /**
   * 处理请求
   */
  async processRequest(request) {
    console.log(`\n[RequestHandler] 开始处理请求: ${request.id}`);
    console.log(`[RequestHandler] 主题: ${request.topic}`);
    
    if (!this.tool) {
      throw createError('未设置tool对象，无法创建subAgent', 'NO_TOOL');
    }
    
    try {
      // 1. 初始化任务管理器
      await this.taskManager.initialize();
      
      // 2. 创建讨论
      const discussion = await this.fm.createDiscussion({
        topic: request.topic,
        category: request.category,
        tags: request.tags,
        priority: request.priority,
        participants: ['coordinator', ...this.experts.map(e => e.id)]
      });
      
      console.log(`[RequestHandler] ✅ 讨论已创建: ${discussion.id}`);
      
      // 3. 更新讨论状态
      await this.fm.updateDiscussion(discussion.id, {
        status: 'active',
        startedAt: Date.now()
      });
      
      // 4. 生成讨论内容（使用真实subAgent）
      await this.generateDiscussion(discussion, request);
      
      // 5. 更新讨论状态
      await this.fm.updateDiscussion(discussion.id, {
        status: 'completed',
        completedAt: Date.now()
      });
      
      console.log(`[RequestHandler] ✅ 讨论完成: ${discussion.id}`);
      
      // 6. 清理任务文件
      await this.taskManager.cleanup(discussion.id);
      
      return {
        success: true,
        discussionId: discussion.id,
        discussion: await this.fm.getDiscussion(discussion.id)
      };
      
    } catch (error) {
      console.error(`[RequestHandler] ❌ 处理失败:`, error.message);
      throw error;
    }
  }
  
  /**
   * 生成讨论内容（使用真实subAgent）
   */
  async generateDiscussion(discussion, request) {
    console.log(`\n[RequestHandler] 开始生成讨论内容...`);
    
    // 第一阶段：主协调员开场（简单消息）
    await this.addCoordinatorOpening(discussion, request);
    
    // 第二阶段：并行创建专家subAgent
    const expertResponses = await this.spawnExpertAgents(discussion, request);
    
    // 第三阶段：将专家响应写入消息
    for (const response of expertResponses) {
      await this.fm.addMessage(discussion.id, {
        role: 'agent',
        agentId: response.expertId,
        agentName: response.expertName,
        content: response.response
      });
      
      console.log(`[RequestHandler] ✅ ${response.expertName}消息已添加`);
    }
    
    // 第四阶段：主协调员汇总（使用subAgent）
    await this.addCoordinatorSummary(discussion, request, expertResponses);
    
    console.log(`[RequestHandler] ✅ 讨论内容生成完成`);
  }
  
  /**
   * 添加主协调员开场
   */
  async addCoordinatorOpening(discussion, request) {
    const content = `欢迎各位专家参与关于"${request.topic}"的讨论。这是一个关于${request.category}的重要话题，请大家从各自的专业角度分享见解。`;
    
    await this.fm.addMessage(discussion.id, {
      role: 'coordinator',
      agentId: 'coordinator',
      agentName: '主协调员',
      content
    });
    
    console.log(`[RequestHandler] ✅ 主协调员开场已添加`);
  }
  
  /**
   * 并行创建专家subAgent
   */
  async spawnExpertAgents(discussion, request) {
    console.log(`\n[RequestHandler] 创建 ${this.experts.length} 个专家subAgent...`);
    
    // 1. 写入任务文件
    await this.taskManager.writeTask(discussion.id, {
      topic: request.topic,
      category: request.category,
      context: request.context || {},
      requirements: request.requirements || []
    });
    
    // 2. 并行创建subAgent
    const subAgentPromises = this.experts.map(expert => 
      this.createExpertSubAgent(discussion, request, expert)
    );
    
    // 3. 等待所有subAgent完成
    const results = await Promise.allSettled(subAgentPromises);
    
    // 4. 处理结果
    const responses = [];
    const failures = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        responses.push(result.value);
      } else {
        failures.push({
          expert: this.experts[index],
          error: result.reason
        });
        console.error(`[RequestHandler] ❌ ${this.experts[index].name}失败:`, result.reason.message);
      }
    });
    
    if (responses.length === 0) {
      throw createError('所有专家subAgent都失败了', 'ALL_AGENTS_FAILED', { failures });
    }
    
    if (failures.length > 0) {
      console.warn(`[RequestHandler] ⚠️ ${failures.length} 个专家失败，但继续处理`);
    }
    
    console.log(`[RequestHandler] ✅ 成功收集 ${responses.length} 个专家响应`);
    
    return responses;
  }
  
  /**
   * 创建单个专家subAgent
   */
  async createExpertSubAgent(discussion, request, expert) {
    console.log(`[RequestHandler] 🔧 创建${expert.name}subAgent...`);
    
    try {
      // 构建任务提示词
      const taskPrompt = buildExpertTaskPrompt(expert.id, {
        topic: request.topic,
        category: request.category
      });
      
      // 创建subAgent
      const subAgentResult = await this.tool.sessions_spawn({
        task: taskPrompt,
        agentId: 'default',
        model: 'zai/glm-4.7',
        thinking: 'medium',
        timeoutSeconds: 60,
        cleanup: 'keep',
        deliver: false // 不自动发送，我们从响应文件读取
      });
      
      console.log(`[RequestHandler] ✅ ${expert.name}subAgent已创建: ${subAgentResult.sessionKey}`);
      
      // 等待subAgent完成并写入响应
      // 注意：subAgent需要被设计为写入响应文件
      // 这里我们暂时等待，然后从subAgent的会话中获取结果
      await sleep(2000); // 给subAgent一点时间处理
      
      // 读取subAgent的响应（从会话历史中）
      const response = await this.extractSubAgentResponse(subAgentResult.sessionKey, expert);
      
      // 写入响应文件
      await this.taskManager.writeResponse(discussion.id, expert.id, response);
      
      return {
        expertId: expert.id,
        expertName: expert.name,
        response
      };
      
    } catch (error) {
      console.error(`[RequestHandler] ❌ ${expert.name}subAgent失败:`, error.message);
      throw error;
    }
  }
  
  /**
   * 从subAgent会话中提取响应
   */
  async extractSubAgentResponse(sessionKey, expert) {
    try {
      // 使用sessions_history获取会话消息
      const history = await this.tool.sessions_history({
        sessionKey: sessionKey,
        limit: 10
      });
      
      // 找到subAgent的最后一条回复
      const messages = history.messages || [];
      const lastAgentMessage = messages.reverse().find(m => 
        m.role === 'assistant' || m.from === 'agent'
      );
      
      if (lastAgentMessage && lastAgentMessage.content) {
        return lastAgentMessage.content;
      }
      
      // 如果没有找到，返回默认响应
      return `（${expert.name}的响应未能获取，会话: ${sessionKey}）`;
      
    } catch (error) {
      console.error(`[RequestHandler] 提取subAgent响应失败:`, error.message);
      return `（${expert.name}的响应获取失败: ${error.message}）`;
    }
  }
  
  /**
   * 添加主协调员汇总（使用subAgent）
   */
  async addCoordinatorSummary(discussion, request, expertResponses) {
    console.log(`\n[RequestHandler] 创建主协调员汇总subAgent...`);
    
    try {
      // 构建汇总提示词
      const summaryPrompt = buildCoordinatorSummaryPrompt(expertResponses, request.topic);
      
      // 创建汇总subAgent
      const subAgentResult = await this.tool.sessions_spawn({
        task: summaryPrompt,
        agentId: 'default',
        model: 'zai/glm-4.7',
        thinking: 'medium',
        timeoutSeconds: 60
      });
      
      console.log(`[RequestHandler] ✅ 汇总subAgent已创建: ${subAgentResult.sessionKey}`);
      
      // 提取汇总内容
      await sleep(2000);
      const summary = await this.extractSubAgentResponse(subAgentResult.sessionKey, {
        name: '主协调员'
      });
      
      // 添加消息
      await this.fm.addMessage(discussion.id, {
        role: 'coordinator',
        agentId: 'coordinator',
        agentName: '主协调员',
        content: summary
      });
      
      console.log(`[RequestHandler] ✅ 主协调员汇总已添加`);
      
    } catch (error) {
      console.error(`[RequestHandler] ❌ 主协调员汇总失败:`, error.message);
      
      // 降级：使用简单汇总
      const fallbackSummary = `感谢各位专家的发言。综合大家的意见，关于"${request.topic}"，我们已经有了全面的分析。下一步需要制定详细的执行计划。`;
      
      await this.fm.addMessage(discussion.id, {
        role: 'coordinator',
        agentId: 'coordinator',
        agentName: '主协调员',
        content: fallbackSummary
      });
    }
  }
}

module.exports = RequestHandler;
