/**
 * MAD v3.6.2 - 完整历史数据转换脚本（修正版）
 */

const fs = require('fs').promises;
const path = require('path');
const { ProjectGroup } = require('../src/models/project-group.js');

async function convertFullDiscussions() {
  console.log('🔄 完整历史数据转换开始...\n');
  
  const discussionsDir = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'discussions');
  const projectDataDir = path.join(__dirname, '../data/projects');
  
  await fs.mkdir(projectDataDir, { recursive: true });
  
  // 读取所有讨论文件
  const files = await fs.readdir(discussionsDir);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  
  console.log(`📁 找到 ${jsonFiles.length} 个历史讨论文件\n`);
  
  let converted = 0;
  let skipped = 0;
  let errors = 0;
  let totalMessages = 0;
  let totalMarkers = 0;
  let totalTokens = 0;
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(discussionsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const discussion = JSON.parse(content);
      
      // 跳过损坏的文件
      if (!discussion.id || !discussion.topic) {
        console.log(`⏭️  跳过损坏文件：${file}`);
        skipped++;
        continue;
      }
      
      // 使用原始讨论 ID 作为项目 ID
      const projectId = discussion.id;
      const projectPath = path.join(projectDataDir, projectId);
      
      // 检查是否已存在且包含数据
      const existingPath = path.join(projectPath, 'project.json');
      try {
        const existingContent = await fs.readFile(existingPath, 'utf8');
        const existingProject = JSON.parse(existingContent);
        if (existingProject.messages && existingProject.messages.length > 0) {
          console.log(`⏭️  跳过已转换（有数据）：${discussion.topic.substring(0, 50)}...`);
          skipped++;
          continue;
        }
      } catch (e) {
        // 文件不存在，继续创建
      }
      
      // 创建项目目录
      await fs.mkdir(projectPath, { recursive: true });
      
      // 计算 tokens 统计
      let discussionTokens = 0;
      if (discussion.messages) {
        discussion.messages.forEach(msg => {
          if (msg.tokens) {
            discussionTokens += msg.tokens;
          }
          else if (msg.content) {
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
      
      // 创建项目组对象
      const projectName = discussion.topic.substring(0, 100);
      const category = discussion.category || 'general';
      const status = discussion.status === 'active' ? 'active' : 'completed';
      
      const project = new ProjectGroup({
        id: projectId,
        name: projectName,
        category: category,
        description: discussion.topic,
        status: status,
        participants: discussion.participants || [],
        tags: [
          '历史讨论',
          category,
          discussion.status || 'ended'
        ].filter(Boolean),
        messages: discussion.messages || [],
        markers: markers,
        stats: {
          totalMessages: discussion.messages?.length || 0,
          totalMarkers: markers.length,
          totalTokens: discussionTokens,
          progress: discussion.status === 'active' ? 50 : 100,
          createdAt: discussion.createdAt || Date.now(),
          updatedAt: discussion.updatedAt || Date.now()
        },
        metadata: {
          originalDiscussionId: discussion.id,
          originalCreatedAt: discussion.createdAt,
          convertedAt: Date.now(),
          originalFilePath: filePath,
          originalMessageCount: discussion.messages?.length || 0,
          originalMarkerCount: markers.length
        }
      });
      
      // 保存项目
      await fs.writeFile(
        path.join(projectPath, 'project.json'),
        JSON.stringify(project, null, 2),
        'utf8'
      );
      
      console.log(`✅ 转换：${projectName.substring(0, 50)}...`);
      console.log(`   项目ID：${projectId}`);
      console.log(`   消息数：${discussion.messages?.length || 0}`);
      console.log(`   标记数：${markers.length}`);
      console.log(`   Tokens：${discussionTokens}\n`);
      
      totalMessages += discussion.messages?.length || 0;
      totalMarkers += markers.length;
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
  console.log(`   📁 总文件数：${jsonFiles.length}`);
  console.log(`\n📈 数据统计：`);
  console.log(`   总消息数：${totalMessages}`);
  console.log(`   总标记数：${totalMarkers}`);
  console.log(`   总 Tokens：${totalTokens}`);
  
  console.log(`\n✅ 完整历史数据转换完成！`);
}

convertFullDiscussions().catch(console.error);
