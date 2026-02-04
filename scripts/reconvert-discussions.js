/**
 * MAD v3.6.2 - 重新转换历史讨论（确保数据完整）
 */

const fs = require('fs').promises;
const path = require('path');
const { ProjectGroup } = require('../src/models/project-group.js');

async function reconvertDiscussions() {
  console.log('🔄 重新转换历史讨论...\n');
  
  const discussionsDir = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'discussions');
  const projectDataDir = path.join(__dirname, '../data/projects');
  
  await fs.mkdir(projectDataDir, { recursive: true });
  
  const files = await fs.readdir(discussionsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📁 找到 ${jsonFiles.length} 个历史讨论文件\n`);
  
  let converted = 0;
  let skipped = 0;
  let errors = 0;
  let totalMessages = 0;
  let totalTokens = 0;
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(discussionsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const discussion = JSON.parse(content);
      
      if (!discussion.id || !discussion.topic) {
        console.log(`⏭️  跳过损坏文件：${file}`);
        skipped++;
        continue;
      }
      
      const projectId = discussion.id.replace('disc-', '');
      const projectPath = path.join(projectDataDir, projectId);
      await fs.mkdir(projectPath, { recursive: true });
      
      // 计算 tokens
      let discussionTokens = 0;
      if (discussion.messages) {
        discussion.messages.forEach(msg => {
          if (msg.tokens) {
            discussionTokens += msg.tokens;
          } else if (msg.content) {
            discussionTokens += Math.ceil(msg.content.length / 4);
          }
        });
      }
      
      // 提取标记
      const markers = [];
      if (discussion.messages) {
        discussion.messages.forEach((msg, index) => {
          if (msg.isMarker || msg.role === 'marker') {
            markers.push({
              id: msg.id || `marker-${index}`,
              type: msg.markerType || 'milestone',
              title: msg.title || '标记',
              summary: msg.content,
              timestamp: msg.timestamp || Date.now(),
              agentId: msg.agentId,
              conclusions: msg.conclusions || [],
              tags: msg.tags || []
            });
          }
        });
      }
      
      // 创建 ProjectGroup
      const projectName = discussion.topic.substring(0, 100);
      const category = discussion.category || 'general';
      const status = discussion.status === 'active' ? 'active' : 'completed';
      
      const project = new ProjectGroup(projectId, projectName, category);
      
      // 设置属性
      project.description = discussion.topic;
      project.status = status;
      project.participants = discussion.participants || [];
      project.tags = ['历史讨论', category, discussion.status || 'ended'].filter(Boolean);
      project.messages = discussion.messages || [];
      project.markers = markers;
      project.notes = '';
      project.priority = 'medium';
      
      // 设置统计
      project.stats = {
        totalMessages: discussion.messages?.length || 0,
        totalMarkers: markers.length,
        totalTokens: discussionTokens,
        progress: discussion.status === 'active' ? 50 : 100,
        createdAt: discussion.createdAt || Date.now(),
        updatedAt: discussion.updatedAt || Date.now()
      };
      
      project.metadata = {
        originalDiscussionId: discussion.id,
        originalCreatedAt: discussion.createdAt,
        convertedAt: Date.now(),
        originalFilePath: filePath,
        originalMessageCount: discussion.messages?.length || 0,
        originalMarkerCount: markers.length
      };
      
      // 保存
      await fs.writeFile(
        path.join(projectPath, 'project.json'),
        JSON.stringify(project, null, 2),
        'utf8'
      );
      
      console.log(`✅ 转换：${projectName.substring(0, 50)}...`);
      console.log(`   项目ID：${projectId}`);
      console.log(`   消息数：${discussion.messages?.length || 0}`);
      console.log(`   Tokens：${discussionTokens}\n`);
      
      totalMessages += discussion.messages?.length || 0;
      totalTokens += discussionTokens;
      converted++;
      
    } catch (error) {
      console.error(`❌ 转换失败：${file}`, error.message);
      errors++;
    }
  }
  
  console.log('📊 转换统计：');
  console.log(`   ✅ 成功转换：${converted}`);
  console.log(`   ⏭️  跳过：${skipped}`);
  console.log(`   ❌ 失败：${errors}`);
  console.log(`\n📈 数据统计：`);
  console.log(`   总消息数：${totalMessages}`);
  console.log(`   总 Tokens：${totalTokens}`);
  
  console.log(`\n✅ 转换完成！`);
}

reconvertDiscussions().catch(console.error);
