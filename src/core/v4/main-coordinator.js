/**
 * 主协调员 - 协调专家讨论流程
 *
 * 功能：
 * 1. 话题接收与理解
 * 2. 识别涉及的领域
 * 3. 为每个领域生成问题
 * 4. 匹配对应专家
 *
 * @version 4.0.5
 */

const Expert = require('./expert');

class MainCoordinator {
  constructor(config = {}) {
    this.config = config;

    // 获取专家定义
    this.expertDefinitions = config.expertDefinitions || this.getDefaultExpertDefinitions();
  }

  /**
   * 处理话题（主入口）
   * @param {Object} topic - 话题对象
   * @returns {Object} 处理结果
   */
  async processTopic(topic) {
    console.log(`[MainCoordinator] 处理话题: ${topic.content || topic.description}`);

    try {
      // 1. 理解话题
      const understanding = await this.understandTopic(topic);

      // 2. 识别领域
      const domains = await this.identifyDomains(understanding);

      // 3. 生成问题
      const questions = await this.generateQuestions(topic, domains);

      // 4. 匹配专家
      const experts = await this.matchExperts(domains);

      // 5. 分配任务
      const assignments = await this.assignTasks(experts, questions);

      return {
        success: true,
        topic,
        domains,
        experts: assignments,
        summary: {
          topic: topic.content || topic.description,
          domains: domains,
          expertCount: assignments.length,
          questions: questions
        }
      };

    } catch (error) {
      console.error('[MainCoordinator] 处理失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 理解话题
   * @param {Object} topic - 话题对象
   * @returns {Object} 理解结果
   */
  async understandTopic(topic) {
    return {
      content: topic.content || topic.description || '',
      context: topic.context || {},
      metadata: topic.metadata || {}
    };
  }

  /**
   * 识别话题涉及的领域
   * @param {Object} understanding - 理解结果
   * @returns {Array} 领域列表
   */
  async identifyDomains(understanding) {
    const content = understanding.content.toLowerCase();
    const domains = [];

    // 领域关键词映射
    const domainKeywords = {
      technical: ['技术', '架构', '性能', '安全', '开发', '系统', '接口', '数据库', '服务器', '代码', '编程'],
      product: ['产品', '用户', '体验', '功能', '需求', '交互', '设计', '界面', '流程', '易用性'],
      business: ['商业', '市场', '盈利', '成本', '投资', '竞争', '模式', '定价', '收入', '商业模式'],
      operations: ['运营', '增长', '营销', '推广', '数据', '客户', '渠道', '活动', '用户获取', '留存']
    };

    // 检查每个领域的关键词
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          if (!domains.includes(domain)) {
            domains.push(domain);
          }
          break;
        }
      }
    }

    // 如果没有识别出任何领域，默认使用技术+产品
    if (domains.length === 0) {
      domains.push('technical', 'product');
    }

    return domains;
  }

  /**
   * 为每个领域生成问题
   * @param {Object} topic - 话题对象
   * @param {Array} domains - 领域列表
   * @returns {Object} 问题映射
   */
  async generateQuestions(topic, domains) {
    const questions = {};

    const questionTemplates = {
      technical: [
        `从技术角度，"${topic.content}" 需要考虑哪些技术实现方案？`,
        `这个需求存在哪些技术挑战和风险？`,
        `建议使用什么样的技术架构？`
      ],
      product: [
        `从产品角度，"${topic.content}" 的目标用户是谁？核心需求是什么？`,
        `如何设计用户体验才能满足用户需求？`,
        `功能优先级应该如何排序？`
      ],
      business: [
        `从商业角度，"${topic.content}" 的商业模式是什么？`,
        `目标市场有多大？如何竞争？`,
        `如何实现盈利？`
      ],
      operations: [
        `从运营角度，"${topic.content}" 如何获取第一批用户？`,
        `采用什么运营策略？`,
        `如何衡量运营效果？`
      ]
    };

    for (const domain of domains) {
      questions[domain] = questionTemplates[domain] || ['请从你的专业角度分析这个话题'];
    }

    return questions;
  }

  /**
   * 匹配专家
   * @param {Array} domains - 领域列表
   * @returns {Array} 专家实例列表
   */
  async matchExperts(domains) {
    const experts = [];

    for (const domain of domains) {
      const expert = Expert.createExpert(domain);
      if (expert) {
        experts.push(expert);
      }
    }

    return experts;
  }

  /**
   * 为专家分配任务
   * @param {Array} experts - 专家列表
   * @param {Object} questions - 问题映射
   * @returns {Array} 任务分配结果
   */
  async assignTasks(experts, questions) {
    const assignments = [];

    for (const expert of experts) {
      if (questions[expert.domain]) {
        assignments.push({
          expertId: expert.id,
          expertName: expert.name,
          domain: expert.domain,
          questions: questions[expert.domain],
          expertise: expert.expertise
        });
      }
    }

    return assignments;
  }

  /**
   * 获取默认专家定义
   * @returns {Object} 专家定义
   */
  getDefaultExpertDefinitions() {
    return {
      technical: {
        id: 'technical',
        name: '技术专家',
        domain: 'technical',
        expertise: ['技术架构', '性能优化', '安全防护'],
        keywords: ['技术', '架构', '性能', '安全']
      },
      product: {
        id: 'product',
        name: '产品专家',
        domain: 'product',
        expertise: ['用户需求', '产品设计', '用户体验'],
        keywords: ['产品', '用户', '体验', '功能']
      },
      business: {
        id: 'business',
        name: '商业专家',
        domain: 'business',
        expertise: ['商业模式', '市场分析', '竞争策略'],
        keywords: ['商业', '市场', '盈利', '成本']
      },
      operations: {
        id: 'operations',
        name: '运营专家',
        domain: 'operations',
        expertise: ['运营策略', '用户增长', '数据分析'],
        keywords: ['运营', '增长', '营销', '推广']
      }
    };
  }

  /**
   * 获取协调员状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      availableDomains: ['technical', 'product', 'business', 'operations'],
      expertCount: Object.keys(this.expertDefinitions).length
    };
  }
}

module.exports = MainCoordinator;
