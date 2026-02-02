/**
 * MAD v3.0 - 项目组管理器
 * 负责项目组的创建、加载、保存、查询
 */

const fs = require('fs').promises;
const path = require('path');
const { ProjectGroup } = require('../models/project-group.js');

class ProjectManager {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'projects');
    this.projects = new Map();
  }

  async init() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await this.loadAllProjects();
  }

  /**
   * 创建新项目组
   */
  async createProject(name, category, options = {}) {
    const project = new ProjectGroup(
      options.id || `group-${Date.now()}`,
      name,
      category
    );

    if (options.description) {
      project.description = options.description;
    }

    if (options.participants) {
      project.participants = options.participants;
    }

    this.projects.set(project.id, project);
    await this.saveProject(project);

    console.log(`[ProjectManager] 创建项目组: ${project.id} - ${name}`);
    return project;
  }

  /**
   * 获取项目组
   */
  async getProject(projectId) {
    if (this.projects.has(projectId)) {
      return this.projects.get(projectId);
    }

    // 尝试从磁盘加载
    return await this.loadProject(projectId);
  }

  /**
   * 获取所有项目组
   */
  async listProjects(filters = {}) {
    let projects = Array.from(this.projects.values());

    // 按类别过滤
    if (filters.category) {
      projects = projects.filter(p => p.category === filters.category);
    }

    // 按状态过滤
    if (filters.status) {
      projects = projects.filter(p => p.status === filters.status);
    }

    return projects;
  }

  /**
   * 按类别分组
   */
  async getProjectsByCategory() {
    const projects = await this.listProjects();
    const grouped = {};

    projects.forEach(project => {
      if (!grouped[project.category]) {
        grouped[project.category] = [];
      }
      grouped[project.category].push(project);
    });

    return grouped;
  }

  /**
   * 保存项目组到磁盘
   */
  async saveProject(project) {
    const projectDir = path.join(this.dataDir, project.id);
    await fs.mkdir(projectDir, { recursive: true });

    const filePath = path.join(projectDir, 'project.json');
    await fs.writeFile(filePath, JSON.stringify(project, null, 2));
  }

  /**
   * 从磁盘加载项目组
   */
  async loadProject(projectId) {
    const filePath = path.join(this.dataDir, projectId, 'project.json');

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const project = JSON.parse(data);

      // 转换为 ProjectGroup 实例
      const projectGroup = new ProjectGroup(project.id, project.name, project.category);
      Object.assign(projectGroup, project);

      this.projects.set(projectId, projectGroup);
      return projectGroup;
    } catch (error) {
      console.error(`[ProjectManager] 加载项目失败: ${projectId}`, error);
      return null;
    }
  }

  /**
   * 加载所有项目组
   */
  async loadAllProjects() {
    try {
      const files = await fs.readdir(this.dataDir);
      const projectDirs = files.filter(f => f.startsWith('group-'));

      for (const dir of projectDirs) {
        await this.loadProject(dir);
      }

      console.log(`[ProjectManager] 已加载 ${this.projects.size} 个项目组`);
    } catch (error) {
      console.error('[ProjectManager] 加载项目组失败:', error);
    }
  }

  /**
   * 更新项目组
   */
  async updateProject(projectId, updates) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    Object.assign(project, updates);
    await this.saveProject(project);
    return project;
  }

  /**
   * 删除项目组
   */
  async deleteProject(projectId) {
    this.projects.delete(projectId);

    const projectDir = path.join(this.dataDir, projectId);
    await fs.rm(projectDir, { recursive: true, force: true });

    console.log(`[ProjectManager] 已删除项目组: ${projectId}`);
  }

  /**
   * 搜索项目组
   */
  async searchProjects(keyword, options = {}) {
    const projects = await this.listProjects();
    const lowerKeyword = keyword.toLowerCase();
    const results = [];

    for (const project of projects) {
      let score = 0;
      const highlights = [];

      // 搜索项目名称
      if (project.name.toLowerCase().includes(lowerKeyword)) {
        score += 10;
        highlights.push({ field: 'name', text: project.name });
      }

      // 搜索描述
      if (project.description && project.description.toLowerCase().includes(lowerKeyword)) {
        score += 5;
        highlights.push({ field: 'description', text: project.description });
      }

      // 搜索类别
      if (project.category.toLowerCase().includes(lowerKeyword)) {
        score += 3;
        highlights.push({ field: 'category', text: project.category });
      }

      // 搜索标记
      if (project.markers && project.markers.length > 0) {
        for (const marker of project.markers) {
          if (marker.title && marker.title.toLowerCase().includes(lowerKeyword)) {
            score += 2;
            highlights.push({ field: 'marker', text: marker.title });
          }
          if (marker.summary && marker.summary.toLowerCase().includes(lowerKeyword)) {
            score += 1;
            highlights.push({ field: 'marker', text: marker.summary });
          }
        }
      }

      // 只返回有匹配的结果
      if (score > 0) {
        results.push({
          project,
          score,
          highlights
        });
      }
    }

    // 按得分排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    const limit = options.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * 获取项目统计信息
   */
  async getStatistics() {
    const projects = await this.listProjects();
    const stats = {
      total: projects.length,
      byStatus: {},
      byCategory: {},
      totalMessages: 0,
      totalMarkers: 0,
      totalParticipants: 0,
      activeProjects: 0
    };

    for (const project of projects) {
      // 按状态统计
      if (!stats.byStatus[project.status]) {
        stats.byStatus[project.status] = 0;
      }
      stats.byStatus[project.status]++;

      // 按类别统计
      if (!stats.byCategory[project.category]) {
        stats.byCategory[project.category] = 0;
      }
      stats.byCategory[project.category]++;

      // 统计消息数
      stats.totalMessages += project.messages?.length || 0;

      // 统计标记数
      stats.totalMarkers += project.markers?.length || 0;

      // 统计参与者数
      stats.totalParticipants += project.participants?.length || 0;

      // 统计活跃项目（最近 24 小时内有更新）
      const lastUpdate = project.stats?.updatedAt || 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (lastUpdate > oneDayAgo) {
        stats.activeProjects++;
      }
    }

    return stats;
  }

  /**
   * 按标签搜索项目组
   */
  async findProjectsByTag(tag) {
    const projects = await this.listProjects();
    return projects.filter(p => p.tags && p.tags.includes(tag));
  }

  /**
   * 获取所有标签
   */
  async getAllTags() {
    const projects = await this.listProjects();
    const tagMap = new Map();

    for (const project of projects) {
      if (project.tags && project.tags.length > 0) {
        for (const tag of project.tags) {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, 0);
          }
          tagMap.set(tag, tagMap.get(tag) + 1);
        }
      }
    }

    // 转换为数组并按使用次数排序
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 添加标签到项目组
   */
  async addTagToProject(projectId, tag) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    if (!project.tags) {
      project.tags = [];
    }

    project.addTag(tag);
    await this.saveProject(project);

    return project;
  }

  /**
   * 从项目组移除标签
   */
  async removeTagFromProject(projectId, tag) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    if (!project.tags) {
      project.tags = [];
    }

    project.removeTag(tag);
    await this.saveProject(project);

    return project;
  }
}

module.exports = ProjectManager;
