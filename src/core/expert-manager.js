/**
 * MAD v3.0 - 专家管理器
 * 负责从专家库选取专家，或创建新专家
 */

const fs = require('fs').promises;
const path = require('path');

class ExpertManager {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'experts');
    this.experts = new Map();
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this.loadAllExperts();
  }

  /**
   * 选取或创建专家
   */
  async selectExperts(requiredExpertIds) {
    const selectedExperts = [];

    for (const expertId of requiredExpertIds) {
      let expert = await this.getExpert(expertId);

      if (!expert) {
        // 创建新专家
        expert = await this.createExpert(expertId);
      }

      selectedExperts.push(expert);
    }

    return selectedExperts;
  }

  /**
   * 获取专家
   */
  async getExpert(expertId) {
    if (this.experts.has(expertId)) {
      return this.experts.get(expertId);
    }

    return await this.loadExpert(expertId);
  }

  /**
   * 创建新专家
   */
  async createExpert(expertId) {
    const expertConfig = this.generateExpertConfig(expertId);

    const expert = {
      id: expertId,
      name: expertConfig.name,
      role: expertConfig.role,
      emoji: expertConfig.emoji,
      systemPrompt: expertConfig.systemPrompt,
      expertise: expertConfig.expertise,
      createdAt: Date.now()
    };

    this.experts.set(expertId, expert);
    await this.saveExpert(expert);

    console.log(`[ExpertManager] 创建专家: ${expertId} - ${expert.name}`);
    return expert;
  }

  /**
   * 生成专家配置
   */
  generateExpertConfig(expertId) {
    // 专家配置模板
    const templates = {
      'architect': {
        name: '架构师',
        role: '技术架构专家',
        emoji: '🏗️',
        expertise: ['架构设计', '技术选型', '系统设计'],
        systemPrompt: '你是技术架构专家，负责评估技术方案、设计系统架构、选择技术栈。'
      },
      'system-architect': {
        name: '系统架构师',
        role: '系统架构专家',
        emoji: '🏛️',
        expertise: ['系统设计', '分层架构', '高可用'],
        systemPrompt: '你是系统架构专家，专注系统分层、模块划分、接口设计。'
      },
      'patent-expert': {
        name: '专利专家',
        role: '专利编写专家',
        emoji: '📜',
        expertise: ['专利', '知识产权', '权利要求'],
        systemPrompt: '你是专利编写专家，负责撰写专利申请文档、确定权利要求。'
      },
      'legal-expert': {
        name: '法务专家',
        role: '法律专家',
        emoji: '⚖️',
        expertise: ['法律', '合规', '合同'],
        systemPrompt: '你是法律专家，负责审核法律合规性、确保知识产权保护。'
      },
      'technical-writer': {
        name: '技术文档专家',
        role: '文档编写专家',
        emoji: '📝',
        expertise: ['文档', '技术写作', '说明'],
        systemPrompt: '你是技术文档专家，负责编写清晰、完整的技术文档。'
      },
      'documentation-expert': {
        name: '文档专家',
        role: '文档专家',
        emoji: '📚',
        expertise: ['文档', '知识管理'],
        systemPrompt: '你是文档专家，负责整理知识、编写使用文档。'
      },
      'database-expert': {
        name: '数据库专家',
        role: '数据库专家',
        emoji: '🗄️',
        expertise: ['数据库', '存储', 'SQL'],
        systemPrompt: '你是数据库专家，负责数据库设计、查询优化、数据建模。'
      },
      'dba': {
        name: 'DBA',
        role: '数据库管理员',
        emoji: '🔧',
        expertise: ['数据库管理', '性能优化'],
        systemPrompt: '你是数据库管理员，负责数据库性能优化、备份恢复。'
      },
      'testing-expert': {
        name: '测试专家',
        role: '质量保证专家',
        emoji: '🧪',
        expertise: ['测试', 'QA', '质量'],
        systemPrompt: '你是测试专家，负责制定测试策略、编写测试用例。'
      },
      'qa-engineer': {
        name: 'QA工程师',
        role: 'QA工程师',
        emoji: '✅',
        expertise: ['质量保证', '自动化测试'],
        systemPrompt: '你是QA工程师，负责质量保证、自动化测试。'
      },
      'security-expert': {
        name: '安全专家',
        role: '安全专家',
        emoji: '🔒',
        expertise: ['安全', '加密', '防护'],
        systemPrompt: '你是安全专家，负责识别安全风险、设计安全方案。'
      },
      'performance-engineer': {
        name: '性能工程师',
        role: '性能专家',
        emoji: '⚡',
        expertise: ['性能', '优化'],
        systemPrompt: '你是性能专家，负责性能优化、瓶颈分析。'
      },
      'devops-engineer': {
        name: 'DevOps工程师',
        role: 'DevOps专家',
        emoji: '🚀',
        expertise: ['DevOps', '部署', 'CI/CD'],
        systemPrompt: '你是DevOps专家，负责自动化部署、容器编排。'
      },
      'product-manager': {
        name: '产品经理',
        role: '产品管理',
        emoji: '📊',
        expertise: ['产品', '需求', '规划'],
        systemPrompt: '你是产品经理，负责需求分析、产品规划。'
      },
      'business-analyst': {
        name: '业务分析师',
        role: '业务分析',
        emoji: '💼',
        expertise: ['业务', '分析'],
        systemPrompt: '你是业务分析师，负责业务需求分析。'
      },
      'market-researcher': {
        name: '市场研究员',
        role: '市场调研',
        emoji: '📈',
        expertise: ['市场', '调研', '竞品'],
        systemPrompt: '你是市场研究员，负责市场调研、竞品分析。'
      }
    };

    // 如果有模板，使用模板
    if (templates[expertId]) {
      return templates[expertId];
    }

    // 否则生成默认配置
    return {
      name: expertId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role: `${expertId}专家`,
      emoji: '🤖',
      expertise: [expertId],
      systemPrompt: `你是${expertId}领域的专家，负责相关专业工作。`
    };
  }

  /**
   * 保存专家到磁盘
   */
  async saveExpert(expert) {
    const filePath = path.join(this.dataDir, `${expert.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(expert, null, 2));
  }

  /**
   * 从磁盘加载专家
   */
  async loadExpert(expertId) {
    const filePath = path.join(this.dataDir, `${expertId}.json`);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const expert = JSON.parse(data);
      this.experts.set(expertId, expert);
      return expert;
    } catch (error) {
      return null;
    }
  }

  /**
   * 加载所有专家
   */
  async loadAllExperts() {
    try {
      const files = await fs.readdir(this.dataDir);
      const expertFiles = files.filter(f => f.endsWith('.json'));

      for (const file of expertFiles) {
        const expertId = file.replace('.json', '');
        await this.loadExpert(expertId);
      }

      console.log(`[ExpertManager] 已加载 ${this.experts.size} 个专家`);
    } catch (error) {
      console.log('[ExpertManager] 专家库为空，将按需创建');
    }
  }
}

module.exports = ExpertManager;
