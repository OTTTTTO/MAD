/**
 * MAD FileBased - 请求处理器
 * 
 * 用途：处理来自Web界面的请求，生成讨论和消息
 * 
 * 功能：
 * - 生成讨论ID
 * - 模拟专家讨论
 * - 写入消息到文件
 */

const FileManager = require('../lib/file-manager.js');
const { defaultConfig } = require('../lib/config.js');
const {
  generateId,
  formatTimestamp,
  sleep
} = require('../lib/utils.js');

/**
 * 模拟的专家配置
 */
const MOCK_EXPERTS = [
  {
    id: 'coordinator',
    name: '主协调员',
    role: 'coordinator',
    description: '负责协调讨论流程'
  },
  {
    id: 'technical',
    name: '技术专家',
    role: 'agent',
    description: '负责技术分析和建议'
  },
  {
    id: 'product',
    name: '产品专家',
    role: 'agent',
    description: '负责产品视角分析'
  },
  {
    id: 'business',
    name: '商业专家',
    role: 'agent',
    description: '负责商业价值评估'
  },
  {
    id: 'operations',
    name: '运营专家',
    role: 'agent',
    description: '负责运营可行性分析'
  }
];

/**
 * 请求处理器类
 */
class RequestHandler {
  constructor(fileManager = null) {
    this.fm = fileManager || new FileManager(defaultConfig);
    this.experts = MOCK_EXPERTS;
  }
  
  /**
   * 处理请求
   */
  async processRequest(request) {
    console.log(`\n[RequestHandler] 开始处理请求: ${request.id}`);
    console.log(`[RequestHandler] 主题: ${request.topic}`);
    
    try {
      // 1. 创建讨论
      const discussion = await this.fm.createDiscussion({
        topic: request.topic,
        category: request.category,
        tags: request.tags,
        priority: request.priority,
        participants: this.experts.map(e => e.id)
      });
      
      console.log(`[RequestHandler] ✅ 讨论已创建: ${discussion.id}`);
      
      // 2. 更新讨论状态为active
      await this.fm.updateDiscussion(discussion.id, {
        status: 'active',
        startedAt: Date.now()
      });
      
      // 3. 生成讨论内容
      await this.generateDiscussion(discussion, request);
      
      // 4. 更新讨论状态为completed
      await this.fm.updateDiscussion(discussion.id, {
        status: 'completed',
        completedAt: Date.now()
      });
      
      console.log(`[RequestHandler] ✅ 讨论完成: ${discussion.id}`);
      
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
   * 生成讨论内容（模拟专家讨论）
   */
  async generateDiscussion(discussion, request) {
    console.log(`\n[RequestHandler] 开始生成讨论内容...`);
    
    // 第一阶段：主协调员开场
    await this.addCoordinatorMessage(discussion, request);
    await sleep(500);
    
    // 第二阶段：专家发言（并行）
    const agentExperts = this.experts.filter(e => e.role === 'agent');
    
    for (const expert of agentExperts) {
      await this.addExpertMessage(discussion, expert, request);
      await sleep(300);
    }
    
    // 第三阶段：主协调员总结
    await this.addCoordinatorSummary(discussion, request);
    
    console.log(`[RequestHandler] ✅ 讨论内容生成完成`);
  }
  
  /**
   * 添加主协调员消息（开场）
   */
  async addCoordinatorMessage(discussion, request) {
    const coordinator = this.experts.find(e => e.id === 'coordinator');
    
    const content = this.generateCoordinatorOpening(request);
    
    await this.fm.addMessage(discussion.id, {
      role: 'coordinator',
      agentId: coordinator.id,
      agentName: coordinator.name,
      content
    });
    
    console.log(`[RequestHandler] ✅ 主协调员开场`);
  }
  
  /**
   * 生成主协调员开场词
   */
  generateCoordinatorOpening(request) {
    const templates = [
      `欢迎各位专家参与关于"${request.topic}"的讨论。这是一个关于${request.category}的重要话题，请大家从各自的专业角度分享见解。`,
      `今天我们讨论的主题是"${request.topic}"。这个问题涉及多个维度，我希望各位专家能够深入分析并提供专业建议。`,
      `感谢各位参与"${request.topic}"的讨论。这是一个值得深入探讨的话题，让我们开始吧。`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  /**
   * 添加专家消息
   */
  async addExpertMessage(discussion, expert, request) {
    const content = this.generateExpertResponse(expert, request);
    
    await this.fm.addMessage(discussion.id, {
      role: 'agent',
      agentId: expert.id,
      agentName: expert.name,
      content
    });
    
    console.log(`[RequestHandler] ✅ ${expert.name}发言完成`);
  }
  
  /**
   * 生成专家回应（模拟）
   */
  generateExpertResponse(expert, request) {
    const topic = request.topic;
    
    // 根据专家类型生成不同的回应
    const responses = {
      technical: [
        `从技术角度来看，"${topic}"需要考虑系统架构的可扩展性和性能。我建议采用模块化设计，确保系统可以灵活应对未来的需求变化。`,
        `关于"${topic}"，技术实现上应该关注代码质量和可维护性。使用成熟的技术栈和最佳实践，可以有效降低风险。`,
        `对于"${topic}"，我建议采用渐进式开发策略，先实现核心功能，再逐步扩展。这样可以快速验证可行性并降低开发成本。`
      ],
      product: [
        `从产品视角来看，"${topic}"需要重点关注用户体验和核心价值。我们应该明确用户痛点，并提供简洁有效的解决方案。`,
        `关于"${topic}"，我认为需要平衡功能丰富度和易用性。过度复杂的功能可能会增加用户的学习成本，我们应该聚焦核心价值。`,
        `对于"${topic}"，建议采用敏捷开发模式，通过快速迭代和用户反馈来不断优化产品。数据驱动决策是关键。`
      ],
      business: [
        `从商业角度评估，"${topic}"具有很好的市场潜力。我们需要分析目标市场规模、竞争格局，并制定可行的商业模式。`,
        `关于"${topic}"，商业成功的关键在于价值创造和价值捕获。我们需要明确如何为用户创造价值，并设计可持续的盈利模式。`,
        `对于"${topic}"，我建议进行详细的成本收益分析。除了直接的经济收益，还要考虑品牌价值和战略意义。`
      ],
      operations: [
        `从运营角度来看，"${topic}"需要考虑执行可行性和资源效率。我们应该明确关键成功因素，并建立有效的监控和反馈机制。`,
        `关于"${topic}"，运营团队需要确保服务质量和用户满意度。建立标准化的操作流程和应急响应机制很重要。`,
        `对于"${topic}"，我建议采用数据驱动的运营策略，通过关键指标监控和持续优化来提升运营效率。`
      ]
    };
    
    const expertResponses = responses[expert.id] || responses.technical;
    return expertResponses[Math.floor(Math.random() * expertResponses.length)];
  }
  
  /**
   * 添加主协调员总结
   */
  async addCoordinatorSummary(discussion, request) {
    const coordinator = this.experts.find(e => e.id === 'coordinator');
    
    const content = this.generateCoordinatorSummary(request);
    
    await this.fm.addMessage(discussion.id, {
      role: 'coordinator',
      agentId: coordinator.id,
      agentName: coordinator.name,
      content
    });
    
    console.log(`[RequestHandler] ✅ 主协调员总结完成`);
  }
  
  /**
   * 生成主协调员总结词
   */
  generateCoordinatorSummary(request) {
    const templates = [
      `感谢各位专家的精彩发言。综合大家的意见，我们可以看到"${request.topic}"是一个涉及技术、产品、商业和运营多个维度的复杂问题。建议采用渐进式推进策略，先验证核心假设，再逐步扩大规模。`,
      `经过深入讨论，关于"${request.topic}"，我们已经有了清晰的方向。下一步需要制定详细的执行计划，明确责任人和时间节点。`,
      `今天的讨论很有成果。针对"${request.topic}"，各位专家从不同角度提供了宝贵的见解。我将整理这些意见，形成可执行的行动方案。`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

module.exports = RequestHandler;
