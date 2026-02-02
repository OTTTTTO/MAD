/**
 * MAD v3.0 - 项目组管理器
 * 负责项目组的创建、加载、保存、查询
 */

const fs = require('fs').promises;
const path = require('path');
const { ProjectGroup } = require('../models/project-group.js');

/**
 * 导出项目组为 Markdown
 */
async function exportProjectToMarkdown(project, outputPath) {
  const lines = [];

  // 标题
  lines.push(`# ${project.name}\n`);
  lines.push(`**类别:** ${project.category}\n`);
  lines.push(`**状态:** ${project.status}\n`);
  lines.push(`**创建时间:** ${new Date(project.stats.createdAt).toLocaleString('zh-CN')}\n`);
  lines.push(`**更新时间:** ${new Date(project.stats.updatedAt).toLocaleString('zh-CN')}\n`);

  if (project.description) {
    lines.push(`\n## 描述\n\n${project.description}\n`);
  }

  // 标签
  if (project.tags && project.tags.length > 0) {
    lines.push(`\n**标签:** ${project.tags.map(t => `\`${t}\``).join(', ')}\n`);
  }

  // 参与者
  if (project.participants && project.participants.length > 0) {
    lines.push(`\n## 参与者\n\n`);
    project.participants.forEach(p => {
      lines.push(`- ${p.emoji || '👤'} ${p.name} (${p.role})\n`);
    });
  }

  // 统计
  lines.push(`\n## 统计\n\n`);
  lines.push(`- 消息数: ${project.stats.totalMessages}\n`);
  lines.push(`- 标记数: ${project.stats.totalMarkers}\n`);
  lines.push(`- Tokens: ${project.stats.totalTokens}\n`);
  lines.push(`- 进度: ${project.stats.progress}%\n`);

  // 标记
  if (project.markers && project.markers.length > 0) {
    lines.push(`\n## 标记\n\n`);
    project.markers.forEach(marker => {
      const emoji = {
        'milestone': '🏆',
        'decision': '🎯',
        'problem': '⚠️',
        'solution': '💡'
      }[marker.type] || '📍';

      lines.push(`### ${emoji} ${marker.title}\n`);
      lines.push(`*${new Date(marker.timestamp).toLocaleString('zh-CN')}*\n`);

      if (marker.summary) {
        lines.push(`\n${marker.summary}\n`);
      }

      if (marker.conclusions && marker.conclusions.length > 0) {
        lines.push(`\n**结论:**\n`);
        marker.conclusions.forEach(c => {
          lines.push(`- ${c}\n`);
        });
      }

      if (marker.tags && marker.tags.length > 0) {
        lines.push(`\n**标签:** ${marker.tags.join(', ')}\n`);
      }

      lines.push(`\n`);
    });
  }

  // 消息
  if (project.messages && project.messages.length > 0) {
    lines.push(`\n## 消息流\n\n`);

    project.messages.forEach((msg, index) => {
      const emoji = msg.role === 'system' ? '🤖' :
                    msg.role === 'marker' ? '📍' :
                    msg.isMarker ? '📍' : '💬';

      const time = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN') : '';
      const role = msg.role || '未知';

      lines.push(`### ${emoji} ${role} ${time ? `*(${time})*` : ''}\n`);
      lines.push(`${msg.content}\n`);
      lines.push(`\n`);
    });
  }

  // 写入文件
  const content = lines.join('');
  await fs.writeFile(outputPath, content, 'utf8');

  return outputPath;
}

/**
 * 导出项目组为 JSON
 */
async function exportProjectToJSON(project, outputPath) {
  const data = JSON.stringify(project, null, 2);
  await fs.writeFile(outputPath, data, 'utf8');
  return outputPath;
}

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

  /**
   * 导出项目组
   */
  async exportProject(projectId, format = 'markdown', outputDir = null) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    // 确定输出目录
    const dir = outputDir || path.join(this.dataDir, 'exports');
    await fs.mkdir(dir, { recursive: true });

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const safeName = project.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 30);
    const baseFilename = `${safeName}-${timestamp}`;

    let outputPath;
    if (format === 'json') {
      outputPath = path.join(dir, `${baseFilename}.json`);
      await exportProjectToJSON(project, outputPath);
    } else {
      // 默认 markdown
      outputPath = path.join(dir, `${baseFilename}.md`);
      await exportProjectToMarkdown(project, outputPath);
    }

    return {
      path: outputPath,
      format,
      projectId: project.id,
      projectName: project.name
    };
  }

  /**
   * 批量导出项目组
   */
  async exportAllProjects(format = 'markdown', outputDir = null) {
    const projects = await this.listProjects();
    const results = [];

    for (const project of projects) {
      try {
        const result = await this.exportProject(project.id, format, outputDir);
        results.push(result);
      } catch (error) {
        console.error(`[ProjectManager] 导出项目失败: ${project.id}`, error);
        results.push({
          projectId: project.id,
          projectName: project.name,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 归档项目组
   */
  async archiveProject(projectId) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    if (project.status === 'archived') {
      throw new Error(`项目组已归档: ${projectId}`);
    }

    project.status = 'archived';
    project.stats.updatedAt = Date.now();

    await this.saveProject(project);

    console.log(`[ProjectManager] 已归档项目组: ${projectId}`);

    return project;
  }

  /**
   * 取消归档项目组
   */
  async unarchiveProject(projectId) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    if (project.status !== 'archived') {
      throw new Error(`项目组未归档: ${projectId}`);
    }

    project.status = 'active';
    project.stats.updatedAt = Date.now();

    await this.saveProject(project);

    console.log(`[ProjectManager] 已取消归档项目组: ${projectId}`);

    return project;
  }

  /**
   * 获取已归档的项目组
   */
  async getArchivedProjects() {
    return await this.listProjects({ status: 'archived' });
  }

  /**
   * 获取活跃的项目组
   */
  async getActiveProjects() {
    return await this.listProjects({ status: 'active' });
  }

  /**
   * 获取已完成的项目组
   */
  async getCompletedProjects() {
    return await this.listProjects({ status: 'completed' });
  }

  /**
   * 克隆项目组
   */
  async cloneProject(projectId, newName = null) {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`项目组不存在: ${projectId}`);
    }

    // 创建新项目组
    const clonedProject = new ProjectGroup(
      `group-${Date.now()}`,
      newName || `${project.name} (副本)`,
      project.category
    );

    // 复制属性
    clonedProject.description = project.description;
    clonedProject.tags = [...(project.tags || [])];
    clonedProject.participants = [...(project.participants || [])];

    // 不复制消息和标记
    clonedProject.messages = [];
    clonedProject.markers = [];

    // 重置统计
    clonedProject.stats = {
      totalMessages: 0,
      totalMarkers: 0,
      totalTokens: 0,
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // 设置为活跃状态
    clonedProject.status = 'active';

    // 保存
    this.projects.set(clonedProject.id, clonedProject);
    await this.saveProject(clonedProject);

    console.log(`[ProjectManager] 已克隆项目组: ${projectId} -> ${clonedProject.id}`);

    return clonedProject;
  }
}

module.exports = ProjectManager;
