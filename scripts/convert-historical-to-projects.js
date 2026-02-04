/**
 * MAD v3.6.0 - 历史数据兼容处理脚本
 */

const fs = require('fs').promises;
const path = require('path');
const ProjectManager = require('../src/core/project-manager.js');

async function convertHistoricalDiscussions() {
  console.log('🔄 历史数据兼容处理开始...\n');
  
  // 历史讨论数据目录
  const discussionsDir = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'discussions');
  
  // 项目组数据目录
  const projectDataDir = path.join(__dirname, '../data/projects');
  await fs.mkdir(projectDataDir, { recursive: true });
  
  const projectManager = new ProjectManager(projectDataDir);
  await projectManager.init();
  
  // 检查讨论目录
  try {
    await fs.access(discussionsDir);
  } catch {
    console.log('⚠️  历史讨论目录不存在，跳过转换');
    return;
  }
  
  // 读取所有讨论文件
  const files = await fs.readdir(discussionsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📁 找到 ${jsonFiles.length} 个历史讨论文件\n`);
  
  if (jsonFiles.length === 0) {
    console.log('📭 没有历史讨论文件需要转换');
    return;
  }
  
  let converted = 0;
  let skipped = 0;
  let errors = 0;
  
  // 只转换前 10 个文件作为示例
  const filesToConvert = jsonFiles.slice(0, 10);
  
  for (const file of filesToConvert) {
    try {
      const filePath = path.join(discussionsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const discussion = JSON.parse(content);
      
      // 跳过已损坏的文件
      if (!discussion.id || !discussion.topic) {
        console.log(`⏭️  跳过损坏文件：${file}`);
        skipped++;
        continue;
      }
      
      // 检查是否已经转换过
      const existingProject = await projectManager.loadProject(discussion.id);
      if (existingProject) {
        console.log(`⏭️  跳过已转换：${discussion.topic.substring(0, 50)}...`);
        skipped++;
        continue;
      }
      
      // 创建项目组
      const projectName = discussion.topic.substring(0, 100);
      const category = discussion.category || 'general';
      const status = discussion.status === 'active' ? 'active' : 'completed';
      
      const project = await projectManager.createProject(
        projectName,
        category,
        {
          description: discussion.topic,
          status: status,
          participants: discussion.participants || [],
          tags: [
            '历史讨论',
            category,
            discussion.status || 'ended'
          ].filter(Boolean),
          metadata: {
            originalDiscussionId: discussion.id,
            originalCreatedAt: discussion.createdAt,
            convertedAt: Date.now(),
            originalFilePath: filePath
          }
        }
      );
      
      console.log(`✅ 转换：${projectName.substring(0, 50)}...`);
      console.log(`   原始ID：${discussion.id}`);
      console.log(`   新项目ID：${project.id}\n`);
      
      converted++;
      
    } catch (error) {
      console.error(`❌ 转换失败：${file}`, error.message);
      errors++;
    }
  }
  
  // 统计信息
  const allProjects = await projectManager.listProjects();
  const stats = await projectManager.getStatistics();
  
  console.log('📊 转换统计：');
  console.log(`   ✅ 成功转换：${converted}`);
  console.log(`   ⏭️  跳过：${skipped}`);
  console.log(`   ❌ 失败：${errors}`);
  console.log(`   📁 已处理：${filesToConvert.length} / ${jsonFiles.length}`);
  console.log(`\n📈 项目组统计：`);
  console.log(`   总项目数：${stats.total}`);
  console.log(`   活跃项目：${stats.activeProjects}`);
  console.log(`   总参与者：${stats.totalParticipants}`);
  
  console.log(`\n✅ 历史数据兼容处理完成！`);
  console.log(`\n💡 提示：只转换了前 10 个文件作为示例`);
  console.log(`   如需全部转换，请修改脚本中的 filesToConvert 变量`);
}

convertHistoricalDiscussions().catch(console.error);
