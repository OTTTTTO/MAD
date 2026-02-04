#!/usr/bin/env node

/**
 * v2.5.2 功能测试 - 讨论历史记录和清理
 */

const { DiscussionOrchestrator } = require('../orchestrator.js');

async function testV252Features() {
  console.log('\n📜 MAD v2.5.2 - 讨论历史记录和清理功能测试\n');
  console.log('=' .repeat(50));

  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  let passed = 0;
  let failed = 0;

  // 测试 1: 获取历史统计
  console.log('\n📊 测试 1: 获取历史统计...');
  try {
    const stats = orchestrator.getHistoryStats();
    console.log('✅ 历史统计:');
    console.log(`   - 总讨论数: ${stats.total}`);
    console.log(`   - 进行中: ${stats.active}`);
    console.log(`   - 已结束: ${stats.ended}`);
    console.log(`   - 总消息数: ${stats.totalMessages}`);
    console.log(`   - 存储大小: ${orchestrator.historyManager.formatBytes(stats.totalSize)}`);
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 2: 获取旧讨论列表
  console.log('\n📋 测试 2: 获取旧讨论列表...');
  try {
    const oldDiscussions = orchestrator.getOldDiscussions(30);
    console.log(`✅ 找到 ${oldDiscussions.length} 个超过 30 天的讨论`);
    if (oldDiscussions.length > 0) {
      oldDiscussions.forEach(d => {
        console.log(`   - ${d.topic} (${d.age} 天前, ${orchestrator.historyManager.formatBytes(d.size)})`);
      });
    }
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 3: 创建并归档讨论
  console.log('\n📦 测试 3: 归档讨论...');
  try {
    // 创建一个测试讨论
    const { AGENT_ROLES } = require('../orchestrator.js');
    const { discussionId } = await orchestrator.createDiscussion('测试归档功能', {
      participants: [AGENT_ROLES.coordinator]
    });

    // 添加一条消息
    await orchestrator.agentSpeak(discussionId, 'coordinator', '这个讨论将被归档。');

    // 归档讨论
    const result = await orchestrator.archiveDiscussion(discussionId);
    if (result.success) {
      console.log(`✅ 讨论归档成功: ${discussionId}`);
      passed++;
    } else {
      console.log('❌ 讨论归档失败');
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 4: 获取归档列表
  console.log('\n🗂️ 测试 4: 获取归档列表...');
  try {
    const archives = await orchestrator.getArchiveList();
    console.log(`✅ 归档列表: ${archives.length} 个归档`);
    if (archives.length > 0) {
      archives.forEach(a => {
        const date = new Date(a.archivedAt).toLocaleDateString();
        console.log(`   - ${a.topic} (${date}, ${a.messageCount} 条消息)`);
      });
    }
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 5: 恢复归档
  console.log('\n♻️ 测试 5: 恢复归档...');
  try {
    const archives = await orchestrator.getArchiveList();
    if (archives.length > 0) {
      const discussionId = archives[0].id;
      const result = await orchestrator.restoreFromArchive(discussionId);
      if (result.success) {
        console.log(`✅ 归档恢复成功: ${discussionId}`);
        passed++;
      } else {
        console.log('❌ 归档恢复失败');
        failed++;
      }
    } else {
      console.log('⚠️  没有可恢复的归档');
      passed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 6: 获取存储使用情况
  console.log('\n💾 测试 6: 获取存储使用情况...');
  try {
    const usage = await orchestrator.getStorageUsage();
    console.log('✅ 存储使用情况:');
    console.log(`   - 讨论目录: ${usage.discussionSizeFormatted} (${usage.discussionCount} 个)`);
    console.log(`   - 归档目录: ${usage.archiveSizeFormatted} (${usage.archiveCount} 个)`);
    console.log(`   - 总计: ${usage.totalSizeFormatted}`);
    passed++;
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 7: 删除讨论
  console.log('\n🗑️ 测试 7: 删除讨论...');
  try {
    // 创建一个测试讨论
    const { AGENT_ROLES } = require('../orchestrator.js');
    const { discussionId } = await orchestrator.createDiscussion('待删除的讨论', {
      participants: [AGENT_ROLES.coordinator]
    });

    // 删除讨论
    const result = await orchestrator.deleteDiscussion(discussionId);
    if (result.success) {
      console.log(`✅ 讨论删除成功: ${discussionId}`);
      passed++;
    } else {
      console.log('❌ 讨论删除失败');
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📊 成功率: ${Math.round(passed / (passed + failed) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 所有测试通过！');
    console.log('\n📜 v2.5.2 讨论历史记录和清理功能已成功实现！');
    console.log('\n主要功能：');
    console.log('   📊 历史统计 - 查看讨论统计信息');
    console.log('   📋 旧讨论列表 - 查找超过指定天数的讨论');
    console.log('   📦 归档讨论 - 将旧讨论移至归档');
    console.log('   🗑️ 删除讨论 - 永久删除讨论');
    console.log('   ♻️ 恢复归档 - 从归档恢复讨论');
    console.log('   💾 存储管理 - 查看存储使用情况');
    console.log();
  } else {
    console.log('⚠️  部分测试失败');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
testV252Features().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
