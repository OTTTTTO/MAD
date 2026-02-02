/**
 * 模板市场管理器
 * 
 * 提供模板的评分、分享、推荐、搜索等功能
 * 
 * @module templates/market
 * @version 2.6.0
 */

const fs = require('fs').promises;
const path = require('path');

class TemplateMarket {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.marketPath = path.join(__dirname, '../templates/market.json');
    this.customTemplatesPath = path.join(__dirname, '../templates/custom.json');
    this.userTemplatesPath = path.join(__dirname, '../templates/user-templates.json');
    
    this.templates = null;
    this.customTemplates = null;
    this.userTemplates = null;
  }

  /**
   * 初始化市场
   */
  async initialize() {
    await this.loadTemplates();
    await this.loadCustomTemplates();
    await this.loadUserTemplates();
  }

  /**
   * 加载市场模板
   */
  async loadTemplates() {
    try {
      const data = await fs.readFile(this.marketPath, 'utf8');
      const market = JSON.parse(data);
      this.templates = market.templates || [];
      return this.templates;
    } catch (error) {
      console.error('[TemplateMarket] Failed to load market templates:', error);
      this.templates = [];
      return [];
    }
  }

  /**
   * 加载自定义模板
   */
  async loadCustomTemplates() {
    try {
      const data = await fs.readFile(this.customTemplatesPath, 'utf8');
      const custom = JSON.parse(data);
      this.customTemplates = custom.templates || [];
      return this.customTemplates;
    } catch (error) {
      // 文件不存在是正常的
      this.customTemplates = [];
      return [];
    }
  }

  /**
   * 加载用户模板
   */
  async loadUserTemplates() {
    try {
      const data = await fs.readFile(this.userTemplatesPath, 'utf8');
      const user = JSON.parse(data);
      this.userTemplates = user.templates || [];
      return this.userTemplates;
    } catch (error) {
      this.userTemplates = [];
      return [];
    }
  }

  /**
   * 获取所有模板
   */
  async getAllTemplates() {
    await this.initialize();
    return {
      market: this.templates,
      custom: this.customTemplates,
      user: this.userTemplates
    };
  }

  /**
   * 搜索模板
   */
  async searchTemplates(query, options = {}) {
    const {
      category = null,
      tags = [],
      minRating = 0,
      sortBy = 'relevance' // 'relevance' | 'rating' | 'downloads' | 'newest'
    } = options;

    await this.initialize();

    // 合并所有模板
    const allTemplates = [
      ...this.templates.map(t => ({ ...t, source: 'market' })),
      ...this.customTemplates.map(t => ({ ...t, source: 'custom' })),
      ...this.userTemplates.map(t => ({ ...t, source: 'user' }))
    ];

    // 过滤
    let filtered = allTemplates.filter(template => {
      // 分类过滤
      if (category && template.category !== category) return false;

      // 标签过滤
      if (tags.length > 0) {
        const templateTags = template.tags || [];
        const hasAllTags = tags.every(tag => templateTags.includes(tag));
        if (!hasAllTags) return false;
      }

      // 评分过滤
      if (template.rating < minRating) return false;

      // 关键词搜索
      if (query) {
        const searchText = `${template.name} ${template.description} ${template.tags?.join(' ')}`.toLowerCase();
        const keywords = query.toLowerCase().split(/\s+/);
        const matchesAll = keywords.every(keyword => searchText.includes(keyword));
        if (!matchesAll) return false;
      }

      return true;
    });

    // 排序
    filtered = this.sortTemplates(filtered, sortBy, query);

    return filtered;
  }

  /**
   * 排序模板
   */
  sortTemplates(templates, sortBy, query) {
    switch (sortBy) {
      case 'rating':
        return templates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      case 'downloads':
        return templates.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      
      case 'newest':
        return templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      case 'relevance':
      default:
        if (!query) {
          // 默认按评分和下载量综合排序
          return templates.sort((a, b) => {
            const scoreA = (a.rating || 0) * 0.6 + Math.log((a.downloads || 0) + 1) * 0.4;
            const scoreB = (b.rating || 0) * 0.6 + Math.log((b.downloads || 0) + 1) * 0.4;
            return scoreB - scoreA;
          });
        } else {
          // 计算相关性得分
          return templates.map(t => ({
            ...t,
            relevanceScore: this.calculateRelevance(t, query)
          })).sort((a, b) => b.relevanceScore - a.relevanceScore);
        }
    }
  }

  /**
   * 计算相关性得分
   */
  calculateRelevance(template, query) {
    const keywords = query.toLowerCase().split(/\s+/);
    let score = 0;

    keywords.forEach(keyword => {
      // 名称匹配（权重最高）
      if (template.name.toLowerCase().includes(keyword)) score += 10;

      // 标签匹配
      if (template.tags?.some(tag => tag.toLowerCase().includes(keyword))) score += 5;

      // 描述匹配
      if (template.description.toLowerCase().includes(keyword)) score += 2;

      // 分类匹配
      if (template.category?.toLowerCase().includes(keyword)) score += 3;
    });

    return score;
  }

  /**
   * 获取模板详情
   */
  async getTemplate(templateId) {
    await this.initialize();

    // 在所有模板中查找
    const allTemplates = [
      ...this.templates.map(t => ({ ...t, source: 'market' })),
      ...this.customTemplates.map(t => ({ ...t, source: 'custom' })),
      ...this.userTemplates.map(t => ({ ...t, source: 'user' }))
    ];

    return allTemplates.find(t => t.id === templateId) || null;
  }

  /**
   * 评分模板
   */
  async rateTemplate(templateId, rating, comment = null, user = 'Anonymous') {
    await this.initialize();

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // 添加评论
    const newComment = {
      user,
      rating,
      comment: comment || '',
      date: new Date().toISOString()
    };

    if (!template.comments) {
      template.comments = [];
    }
    template.comments.push(newComment);

    // 重新计算平均评分
    template.ratingCount = template.comments.length;
    const sum = template.comments.reduce((acc, c) => acc + c.rating, 0);
    template.rating = Math.round((sum / template.comments.length) * 10) / 10;

    // 保存
    await this.saveTemplate(template);

    return {
      templateId,
      newRating: template.rating,
      ratingCount: template.ratingCount
    };
  }

  /**
   * 下载模板（增加计数）
   */
  async downloadTemplate(templateId) {
    await this.initialize();

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    template.downloads = (template.downloads || 0) + 1;

    // 保存
    await this.saveTemplate(template);

    return template;
  }

  /**
   * 分享模板
   */
  async shareTemplate(templateId, options = {}) {
    const {
      platform = 'link', // 'link' | 'json' | 'markdown'
      includeComments = false
    } = options;

    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    switch (platform) {
      case 'json':
        return {
          type: 'json',
          content: JSON.stringify(template, null, 2),
          mimeType: 'application/json'
        };

      case 'markdown':
        return {
          type: 'markdown',
          content: this.templateToMarkdown(template),
          mimeType: 'text/markdown'
        };

      case 'link':
      default:
        // 生成分享链接
        const shareCode = this.generateShareCode(template);
        return {
          type: 'link',
          url: `https://mad.market/templates/${templateId}?share=${shareCode}`,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(template.name)}`
        };
    }
  }

  /**
   * 创建用户自定义模板
   */
  async createUserTemplate(templateData, userId = 'user') {
    const template = {
      id: `user-${Date.now()}`,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'custom',
      tags: templateData.tags || [],
      author: userId,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      icon: templateData.icon || '📝',
      config: templateData.config,
      comments: []
    };

    this.userTemplates.push(template);
    await this.saveUserTemplates();

    return template;
  }

  /**
   * 更新用户模板
   */
  async updateUserTemplate(templateId, updates) {
    const index = this.userTemplates.findIndex(t => t.id === templateId);
    if (index === -1) {
      throw new Error(`Template ${templateId} not found`);
    }

    this.userTemplates[index] = {
      ...this.userTemplates[index],
      ...updates,
      id: templateId, // 确保 ID 不变
      updatedAt: new Date().toISOString()
    };

    await this.saveUserTemplates();

    return this.userTemplates[index];
  }

  /**
   * 删除用户模板
   */
  async deleteUserTemplate(templateId) {
    const index = this.userTemplates.findIndex(t => t.id === templateId);
    if (index === -1) {
      throw new Error(`Template ${templateId} not found`);
    }

    this.userTemplates.splice(index, 1);
    await this.saveUserTemplates();

    return { success: true, deletedId: templateId };
  }

  /**
   * 推荐模板
   */
  async recommendTemplates(options = {}) {
    const {
      count = 5,
      excludeIds = [],
      basedOn = null // null | 'usage' | 'rating' | 'category'
    } = options;

    await this.initialize();

    let candidates = [
      ...this.templates.map(t => ({ ...t, source: 'market' })),
      ...this.customTemplates.map(t => ({ ...t, source: 'custom' }))
    ];

    // 排除已使用的
    candidates = candidates.filter(t => !excludeIds.includes(t.id));

    if (basedOn === 'rating') {
      // 基于评分推荐
      candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (basedOn === 'category') {
      // 基于使用最多的分类推荐
      const categoryCounts = {};
      excludeIds.forEach(id => {
        const template = this.getTemplate(id);
        if (template) {
          categoryCounts[template.category] = (categoryCounts[template.category] || 0) + 1;
        }
      });

      const topCategory = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];

      if (topCategory) {
        candidates = candidates.filter(t => t.category === topCategory);
      }
    }

    // 默认基于综合得分
    candidates.sort((a, b) => {
      const scoreA = (a.rating || 0) * 0.7 + Math.log((a.downloads || 0) + 1) * 0.3;
      const scoreB = (b.rating || 0) * 0.7 + Math.log((b.downloads || 0) + 1) * 0.3;
      return scoreB - scoreA;
    });

    return candidates.slice(0, count);
  }

  /**
   * 获取市场统计
   */
  async getMarketStats() {
    await this.initialize();

    const allTemplates = [
      ...this.templates,
      ...this.customTemplates,
      ...this.userTemplates
    ];

    const stats = {
      totalTemplates: allTemplates.length,
      marketTemplates: this.templates.length,
      customTemplates: this.customTemplates.length,
      userTemplates: this.userTemplates.length,
      totalDownloads: allTemplates.reduce((sum, t) => sum + (t.downloads || 0), 0),
      averageRating: 0,
      topRated: [],
      mostDownloaded: [],
      byCategory: {}
    };

    // 计算平均评分
    const ratedTemplates = allTemplates.filter(t => t.rating > 0);
    if (ratedTemplates.length > 0) {
      const sum = ratedTemplates.reduce((acc, t) => acc + t.rating, 0);
      stats.averageRating = Math.round((sum / ratedTemplates.length) * 100) / 100;
    }

    // 最高评分
    stats.topRated = allTemplates
      .filter(t => t.ratingCount >= 2)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .map(t => ({ id: t.id, name: t.name, rating: t.rating }));

    // 最多下载
    stats.mostDownloaded = allTemplates
      .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
      .slice(0, 5)
      .map(t => ({ id: t.id, name: t.name, downloads: t.downloads }));

    // 按分类统计
    allTemplates.forEach(t => {
      if (!stats.byCategory[t.category]) {
        stats.byCategory[t.category] = 0;
      }
      stats.byCategory[t.category]++;
    });

    return stats;
  }

  /**
   * 保存模板
   */
  async saveTemplate(template) {
    const source = template.source || 'market';

    if (source === 'market') {
      const index = this.templates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        this.templates[index] = template;
      }
      await this.saveMarketTemplates();
    } else if (source === 'custom') {
      const index = this.customTemplates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        this.customTemplates[index] = template;
      }
      await this.saveCustomTemplates();
    } else {
      const index = this.userTemplates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        this.userTemplates[index] = template;
      }
      await this.saveUserTemplates();
    }
  }

  /**
   * 保存市场模板
   */
  async saveMarketTemplates() {
    const market = {
      templates: this.templates,
      categories: this.extractCategories(this.templates),
      stats: await this.getMarketStats()
    };
    await fs.writeFile(this.marketPath, JSON.stringify(market, null, 2));
  }

  /**
   * 保存自定义模板
   */
  async saveCustomTemplates() {
    await fs.mkdir(path.dirname(this.customTemplatesPath), { recursive: true });
    await fs.writeFile(
      this.customTemplatesPath,
      JSON.stringify({ templates: this.customTemplates }, null, 2)
    );
  }

  /**
   * 保存用户模板
   */
  async saveUserTemplates() {
    await fs.mkdir(path.dirname(this.userTemplatesPath), { recursive: true });
    await fs.writeFile(
      this.userTemplatesPath,
      JSON.stringify({ templates: this.userTemplates }, null, 2)
    );
  }

  /**
   * 提取分类
   */
  extractCategories(templates) {
    const categories = {};
    templates.forEach(t => {
      if (!categories[t.category]) {
        categories[t.category] = { id: t.category, count: 0, name: t.category };
      }
      categories[t.category].count++;
    });
    return Object.values(categories);
  }

  /**
   * 生成分享码
   */
  generateShareCode(template) {
    const data = `${template.id}:${template.version}:${Date.now()}`;
    return Buffer.from(data).toString('base64').slice(0, 12);
  }

  /**
   * 模板转 Markdown
   */
  templateToMarkdown(template) {
    let md = `# ${template.icon} ${template.name}\n\n`;
    md += `> ${template.description}\n\n`;
    md += `**分类**: ${template.category}\n`;
    md += `**作者**: ${template.author}\n`;
    md += `**评分**: ⭐ ${template.rating} (${template.ratingCount} 条评价)\n`;
    md += `**下载**: ${template.downloads} 次\n\n`;

    if (template.tags && template.tags.length > 0) {
      md += `**标签**: ${template.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
    }

    md += `## 配置\n\n`;
    md += `\`\`\`json\n`;
    md += JSON.stringify(template.config, null, 2);
    md += `\n\`\`\`\n\n`;

    if (template.comments && template.comments.length > 0) {
      md += `## 用户评价\n\n`;
      template.comments.slice(0, 5).forEach(c => {
        md += `### ⭐ ${c.rating}/5 - ${c.user}\n`;
        md += `${c.comment}\n`;
        md += `*${new Date(c.date).toLocaleDateString()}*\n\n`;
      });
    }

    return md;
  }
}

module.exports = {
  TemplateMarket
};
