/**
 * 修复项目组 JSON 文件结构
 */

const fs = require('fs').promises;
const path = require('path');
const { ProjectGroup } = require('../src/models/project-group.js');

async function fixProjectFiles() {
  console.log('🔧 修复项目组 JSON 文件...\n');
  
  const projectDataDir = path.join(__dirname, '../data/projects');
  const dirs = await fs.readdir(projectDataDir);
  
  let fixed = 0;
  let errors = 0;
  
  for (const dir of dirs) {
    try {
      const jsonPath = path.join(projectDataDir, dir, 'project.json');
      const content = await fs.readFile(jsonPath, 'utf8');
      const data = JSON.parse(content);
      
      // 检查是否需要修复
      if (typeof data.id !== 'string') {
        console.log(`⚠️  需要修复：${dir}`);
        
        // 提取实际的 ID
        const actualId = data.id?.id || dir;
        
        // 创建正确的 ProjectGroup 对象
        const project = new ProjectGroup(
          actualId,
          data.name || data.id?.name || dir,
          data.category || 'general'
        );
        
        // 复制所有属性
        Object.assign(project, {
          description: data.description,
          status: data.status,
          participants: data.participants || [],
          tags: data.tags || [],
          messages: data.messages || [],
          markers: data.markers || [],
          notes: data.notes || '',
          priority: data.priority || 'medium',
          stats: data.stats,
          metadata: data.metadata
        });
        
        // 保存
        await fs.writeFile(
          jsonPath,
          JSON.stringify(project, null, 2),
          'utf8'
        );
        
        console.log(`   ✅ 已修复：${actualId}`);
        console.log(`   消息数：${project.messages.length}`);
        console.log(`   Tokens：${project.stats.totalTokens}\n`);
        
        fixed++;
      } else {
        // console.log(`✅ 正常：${dir}`);
      }
      
    } catch (error) {
      console.error(`❌ 错误：${dir}`, error.message);
      errors++;
    }
  }
  
  console.log('📊 修复统计：');
  console.log(`   ✅ 已修复：${fixed}`);
  console.log(`   ❌ 错误：${errors}`);
  
  console.log('\n✅ 修复完成！');
}

fixProjectFiles().catch(console.error);
