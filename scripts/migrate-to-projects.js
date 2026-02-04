const fs = require('fs').promises;
const path = require('path');
const ProjectManager = require('../src/core/project-manager.js');

async function migrate() {
  console.log('🔄 MAD v3.6.0 数据迁移...\n');
  
  const projectDataDir = path.join(__dirname, '../data/projects');
  await fs.mkdir(projectDataDir, { recursive: true });
  
  const projectManager = new ProjectManager(projectDataDir);
  await projectManager.init();
  
  console.log('📦 创建示例项目组...\n');
  
  // 项目1：MAD v3.6.0 开发
  const project1 = await projectManager.createProject(
    'MAD v3.6.0 开发',
    'development',
    {
      description: 'MAD 项目 v3.6.0 版本开发 - 项目管理增强功能\n\n完成功能：\n- 项目搜索（智能评分、高亮显示）\n- 项目统计（全局统计、分类统计）\n- 项目标签（标签管理、搜索、统计）\n- 项目导出（Markdown、JSON）\n- 项目归档（状态筛选）\n- 项目克隆（保留配置、清空数据）',
      status: 'completed',
      tags: ['MAD', 'v3.6.0', '项目归档', '项目导出', '项目搜索'],
      participants: [
        { id: 'coordinator', name: '主协调员', role: 'coordinator', emoji: '💡' },
        { id: 'technical', name: '技术专家', role: 'technical', emoji: '🔧' },
        { id: 'testing', name: '测试专家', role: 'testing', emoji: '🧪' },
        { id: 'docs', name: '文档专家', role: 'docs', emoji: '📝' }
      ]
    }
  );
  console.log(`✅ 项目1：MAD v3.6.0 开发 (${project1.id})`);
  
  // 项目2：MAD v3.0 核心重构
  const project2 = await projectManager.createProject(
    'MAD v3.0 核心重构',
    'development',
    {
      description: 'MAD 项目 v3.0 核心功能重构\n\n完成功能：\n- 项目组系统\n- Token 优化\n- 自主推进\n- 智能标记\n- 界面优化',
      status: 'completed',
      tags: ['MAD', 'v3.0', '核心重构', '项目组系统'],
      participants: [
        { id: 'coordinator', name: '主协调员', role: 'coordinator', emoji: '💡' },
        { id: 'technical', name: '技术专家', role: 'technical', emoji: '🔧' },
        { id: 'testing', name: '测试专家', role: 'testing', emoji: '🧪' }
      ]
    }
  );
  console.log(`✅ 项目2：MAD v3.0 核心重构 (${project2.id})`);
  
  // 项目3：MAD 功能规划讨论
  const project3 = await projectManager.createProject(
    'MAD v4.0 功能规划',
    'planning',
    {
      description: '讨论 MAD v4.0 版本的功能规划和技术方向',
      status: 'active',
      tags: ['规划', '讨论', 'v4.0'],
      participants: [
        { id: 'coordinator', name: '主协调员', role: 'coordinator', emoji: '💡' },
        { id: 'market', name: '市场调研', role: 'market', emoji: '📊' },
        { id: 'requirements', name: '需求分析', role: 'requirements', emoji: '🎯' },
        { id: 'technical', name: '技术专家', role: 'technical', emoji: '🔧' },
        { id: 'testing', name: '测试专家', role: 'testing', emoji: '🧪' },
        { id: 'docs', name: '文档专家', role: 'docs', emoji: '📝' }
      ]
    }
  );
  console.log(`✅ 项目3：MAD v4.0 功能规划 (${project3.id})`);
  
  // 获取所有项目
  const allProjects = await projectManager.listProjects();
  console.log(`\n📊 项目组总数：${allProjects.length}`);
  
  // 获取统计信息
  const stats = await projectManager.getStatistics();
  console.log(`\n📈 项目统计：`);
  console.log(`   总项目数：${stats.total}`);
  console.log(`   活跃项目：${stats.activeProjects}`);
  console.log(`   总参与者：${stats.totalParticipants}`);
  
  console.log(`\n✅ 数据迁移完成！`);
  console.log(`   数据目录：${projectDataDir}`);
}

migrate().catch(console.error);
