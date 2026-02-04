/**
 * MAD v3.0 - 智能分析器
 * 负责分析用户输入，识别领域，推荐专家
 */

class SmartAnalyzer {
  constructor() {
    // 领域关键词映射
    this.domainKeywords = {
      '架构设计': ['架构', '设计', '分层', '微服务', '系统架构', '技术架构'],
      '数据库': ['数据库', '存储', '查询', 'SQL', 'NoSQL', '数据建模'],
      '专利编写': ['专利', '知识产权', '创新点', '权利要求', '专利申请'],
      '文档编写': ['文档', '说明', '手册', '教程', '指南'],
      '测试': ['测试', '质量', 'QA', '自动化测试', '测试用例'],
      '安全': ['安全', '漏洞', '加密', '认证', '授权', '防护'],
      '性能': ['性能', '优化', '缓存', '负载均衡', '响应时间'],
      'DevOps': ['部署', 'CI/CD', '容器', 'Docker', 'K8s', '运维'],
      '需求分析': ['需求', '功能', '用户', '产品', '规划'],
      '市场调研': ['市场', '用户', '竞品', '趋势', '调研']
    };

    // 专家映射
    this.domainExperts = {
      '架构设计': ['architect', 'system-architect'],
      '数据库': ['database-expert', 'dba'],
      '专利编写': ['patent-expert', 'legal-expert'],
      '文档编写': ['technical-writer', 'documentation-expert'],
      '测试': ['qa-engineer', 'testing-expert'],
      '安全': ['security-expert'],
      '性能': ['performance-engineer'],
      'DevOps': ['devops-engineer'],
      '需求分析': ['product-manager', 'business-analyst'],
      '市场调研': ['market-researcher']
    };
  }

  /**
   * 分析用户输入
   */
  async analyzeUserInput(userInput) {
    console.log(`[SmartAnalyzer] 分析用户输入: ${userInput}`);

    // 1. 提取关键词
    const keywords = this.extractKeywords(userInput);

    // 2. 识别领域
    const domains = this.identifyDomains(keywords);

    // 3. 推荐专家
    const recommendedExperts = this.recommendExperts(domains);

    // 4. 确定项目类别
    const category = this.determineCategory(domains);

    return {
      keywords,
      domains,
      recommendedExperts,
      category,
      suggestedName: this.generateProjectName(userInput, domains)
    };
  }

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    const keywords = [];

    // 匹配领域关键词
    Object.entries(this.domainKeywords).forEach(([domain, words]) => {
      words.forEach(word => {
        if (text.includes(word)) {
          keywords.push({ word, domain });
        }
      });
    });

    return keywords;
  }

  /**
   * 识别领域
   */
  identifyDomains(keywords) {
    const domains = new Set();

    keywords.forEach(kw => {
      domains.add(kw.domain);
    });

    return Array.from(domains);
  }

  /**
   * 推荐专家
   */
  recommendExperts(domains) {
    const experts = new Set();

    domains.forEach(domain => {
      const domainExperts = this.domainExperts[domain];
      if (domainExperts) {
        domainExperts.forEach(expert => experts.add(expert));
      }
    });

    return Array.from(experts);
  }

  /**
   * 确定项目类别
   */
  determineCategory(domains) {
    const categoryRules = {
      '功能研发': ['架构设计', '数据库', 'DevOps', '性能', '安全'],
      '文档编写': ['专利编写', '文档编写'],
      '功能测试': ['测试', '质量'],
      '需求讨论': ['需求分析', '市场调研']
    };

    for (const [category, categoryDomains] of Object.entries(categoryRules)) {
      if (domains.some(d => categoryDomains.includes(d))) {
        return category;
      }
    }

    return '功能研发';  // 默认
  }

  /**
   * 生成项目名称
   */
  generateProjectName(userInput, domains) {
    // 简化用户输入，提取核心主题
    const coreTopic = userInput
      .replace(/我想写一篇关于|的文档|的专利|的/g, '')
      .trim()
      .substring(0, 20);

    return coreTopic || '未命名项目';
  }
}

module.exports = SmartAnalyzer;
