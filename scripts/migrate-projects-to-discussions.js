#!/usr/bin/env node

/**
 * MAD v3.7.0 - 数据迁移脚本
 *
 * 功能：
 * - 将 ProjectGroup 数据迁移到 Discussion
 * - 自动转换字段映射
 * - 保留所有历史数据
 */

const fs = require('fs').promises;
const path = require('path');

// 数据目录
const DATA_DIR = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss');
// 备用路径：npm全局安装路径
const DATA_DIR_ALT = path.join(process.env.HOME, '.npm-global', 'lib', 'node_modules', 'openclaw', 'skills', 'mad', 'data');
const PROJECTS_DIR = path.join(process.cwd(), 'data', 'projects');
const DISCUSSIONS_DIR = path.join(process.cwd(), 'data', 'discussions');

// 字段映射
const FIELD_MAPPING = {
  name: 'topic',
  category: 'category',
  markers: 'markers',
  tags: 'tags',
  notes: 'notes',
  priority: 'priority',
  totalTokens: 'totalTokens',
  inputTokens: 'inputTokens',
  outputTokens: 'outputTokens',
  tokenHistory: 'tokenHistory'
};

/**
 * 主迁移函数
 */
async function migrateProjectsToDiscussions() {
  console.log('🚀 开始数据迁移...\n');

  try {
    // 1. 确保 discussions 目录存在
    await fs.mkdir(DISCUSSIONS_DIR, { recursive: true });

    // 2. 读取所有项目
    const projectDirs = await fs.readdir(PROJECTS_DIR);
    // 过滤出项目目录（包含project.json的目录）
    const projectGroupIds = [];

    for (const dir of projectDirs) {
      const projectJsonPath = path.join(PROJECTS_DIR, dir, 'project.json');
      try {
        await fs.access(projectJsonPath);
        projectGroupIds.push(dir);
      } catch {
        // 不是项目目录，跳过
      }
    }

    console.log(`📦 找到 ${projectGroupIds.length} 个项目\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const groupId of projectGroupIds) {
      try {
        // 读取项目数据
        const projectPath = path.join(PROJECTS_DIR, groupId, 'project.json');
        const projectData = JSON.parse(await fs.readFile(projectPath, 'utf8'));

        // 转换为 Discussion 格式
        const discussionData = convertProjectToDiscussion(projectData, groupId);

        // 检查目标文件是否已存在
        const targetPath = path.join(DISCUSSIONS_DIR, `${groupId}.json`);
        const exists = await fileExists(targetPath);

        if (exists) {
          console.log(`⏭️  跳过 ${groupId}（已存在）`);
          skipped++;
          continue;
        }

        // 写入新文件
        await fs.writeFile(targetPath, JSON.stringify(discussionData, null, 2), 'utf8');

        console.log(`✅ ${groupId} 迁移成功`);
        migrated++;

      } catch (error) {
        console.error(`❌ ${groupId} 迁移失败:`, error.message);
        failed++;
      }
    }

    // 3. 输出统计
    console.log('\n' + '='.repeat(50));
    console.log('📊 迁移统计:');
    console.log(`✅ 成功: ${migrated}`);
    console.log(`⏭️  跳过: ${skipped}`);
    console.log(`❌ 失败: ${failed}`);
    console.log(`📁 总计: ${projectGroupIds.length}`);
    console.log('='.repeat(50));

    if (failed === 0 && migrated > 0) {
      console.log('\n✨ 迁移完成！建议验证数据后删除 projects 目录。');
      console.log(`\n备份命令：`);
      console.log(`  mv ${PROJECTS_DIR} ${PROJECTS_DIR}.backup`);
    }

  } catch (error) {
    console.error('\n❌ 迁移过程出错:', error);
    process.exit(1);
  }
}

/**
 * 将 ProjectGroup 数据转换为 Discussion 格式
 */
function convertProjectToDiscussion(projectData, groupId) {
  const discussion = {
    id: groupId,
    // 字段映射
    topic: projectData.name || projectData.topic || '未命名讨论',
    participants: projectData.participants || [],
    messages: projectData.messages || [],
    status: projectData.status || 'active',
    createdAt: projectData.createdAt || Date.now(),
    updatedAt: projectData.updatedAt || Date.now(),
    rounds: projectData.rounds || 0,
    conflicts: projectData.conflicts || [],
    consensus: projectData.consensus || {},
    agentStates: projectData.agentStates || {},

    // v3.7.0 新增字段（从 ProjectGroup 迁移）
    category: projectData.category || null,
    description: projectData.description || '',
    markers: projectData.markers || [],
    tags: projectData.tags || [],
    notes: projectData.notes || '',
    priority: projectData.priority || 'medium',
    totalTokens: projectData.totalTokens || 0,
    inputTokens: projectData.inputTokens || 0,
    outputTokens: projectData.outputTokens || 0,
    tokenHistory: projectData.tokenHistory || [],

    // 统计数据
    stats: {
      totalMessages: (projectData.messages || []).length,
      totalMarkers: (projectData.markers || []).length,
      totalTokens: projectData.totalTokens || 0,
      progress: projectData.progress || 0,
      createdAt: projectData.createdAt || Date.now(),
      updatedAt: projectData.updatedAt || Date.now()
    }
  };

  return discussion;
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证迁移结果
 */
async function validateMigration() {
  console.log('\n🔍 验证迁移结果...\n');

  try {
    const discussionFiles = await fs.readdir(DISCUSSIONS_DIR);
    const discussionJsonFiles = discussionFiles.filter(f => f.endsWith('.json'));

    console.log(`✅ 找到 ${discussionJsonFiles.length} 个讨论文件`);

    let valid = 0;
    let invalid = 0;

    for (const file of discussionJsonFiles) {
      try {
        const filePath = path.join(DISCUSSIONS_DIR, file);
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

        // 验证必需字段
        if (data.id && data.topic && data.messages) {
          valid++;
        } else {
          console.log(`⚠️  ${file} 缺少必需字段`);
          invalid++;
        }
      } catch (error) {
        console.log(`❌ ${file} 验证失败:`, error.message);
        invalid++;
      }
    }

    console.log(`\n✅ 有效: ${valid}`);
    console.log(`❌ 无效: ${invalid}`);

    return invalid === 0;

  } catch (error) {
    console.error('验证过程出错:', error);
    return false;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--validate')) {
    const valid = await validateMigration();
    process.exit(valid ? 0 : 1);
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
MAD v3.7.0 数据迁移工具

用法：
  node scripts/migrate-projects-to-discussions.js          # 运行迁移
  node scripts/migrate-projects-to-discussions.js --validate # 验证结果
  node scripts/migrate-projects-to-discussions.js --help     # 显示帮助

功能：
  - 将 projects/ 目录中的项目迁移到 discussions/ 目录
  - 自动转换字段格式
  - 保留所有历史数据
    `);
    process.exit(0);
  } else {
    await migrateProjectsToDiscussions();
  }
}

// 运行
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateProjectsToDiscussions,
  convertProjectToDiscussion,
  validateMigration
};
