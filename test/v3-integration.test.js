#!/usr/bin/env node

/**
 * MAD v3.0 - 集成测试
 */

const V3Integration = require('../src/v3-integration.js');

async function runTests() {
  console.log('\n🧪 MAD v3.0 - 集成测试\n');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;

  // 初始化
  let v3;

  try {
    const mockOrchestrator = {};
    v3 = new V3Integration(mockOrchestrator);
    await v3.initialize();
    console.log('✅ V3Integration 初始化成功\n');
  } catch (error) {
    console.log(`❌ 初始化失败: ${error.message}`);
    console.log(`提示: v3-integration.js 可能不存在或有问题`);
    process.exit(1);
  }

  // 测试 1: 初始化 v3.0 功能
  console.log('📝 测试 1: 初始化 v3.0 功能...');
  try {
    if (v3.projectManager && v3.expertManager && v3.smartAnalyzer) {
      console.log('✅ 通过: v3.0 功能初始化成功');
      passed++;
    } else {
      console.log('❌ 失败: 缺少必要组件');
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 2: 从自然语言创建项目
  console.log('\n📝 测试 2: 从自然语言创建项目...');
  try {
    const userInput = '我想写一篇关于微服务分层架构设计的专利文档';

    const result = await v3.createProjectFromInput(userInput);

    if (result && result.project && result.experts && result.analysis) {
      console.log('✅ 通过: 成功创建项目');
      console.log(`   - 项目 ID: ${result.project.id}`);
      console.log(`   - 专家数: ${result.experts.length}`);
      console.log(`   - 类别: ${result.analysis.category}`);
      passed++;
    } else {
      console.log(`❌ 失败: 项目创建结果不完整`);
      console.log(`   实际: ${JSON.stringify(result)}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 3: Agent 发言
  console.log('\n📝 测试 3: Agent 发言...');
  try {
    // 首先创建项目
    const { project } = await v3.createProjectFromInput('测试项目');

    // Agent 发言
    const message = await v3.agentSpeak(project.id, 'technical', '这是我的建议');

    if (message && message.role === 'technical' && message.content === '这是我的建议') {
      console.log('✅ 通过: Agent 发言成功');
      passed++;
    } else {
      console.log(`❌ 失败: 消息不符合预期`);
      console.log(`   实际: ${JSON.stringify(message)}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 4: 添加标记
  console.log('\n📝 测试 4: 添加标记...');
  try {
    const { project } = await v3.createProjectFromInput('测试项目');

    const marker = await v3.addMarker(project.id, {
      title: '重要决策',
      type: 'decision',
      messageId: 'msg-1',
      summary: '决定使用微服务架构',
      conclusions: ['使用微服务', '分层设计'],
      tags: ['架构', '决策']
    });

    if (marker && marker.title === '重要决策' && marker.type === 'decision' && marker.conclusions.length === 2) {
      console.log('✅ 通过: 标记添加成功');
      passed++;
    } else {
      console.log(`❌ 失败: 标记不符合预期`);
      console.log(`   实际: ${JSON.stringify(marker)}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 5: 获取压缩上下文
  console.log('\n📝 测试 5: 获取压缩上下文...');
  try {
    const { project } = await v3.createProjectFromInput('测试项目');

    // 添加一些消息
    await v3.agentSpeak(project.id, 'technical', '消息1');
    await v3.agentSpeak(project.id, 'technical', '消息2');
    await v3.agentSpeak(project.id, 'technical', '消息3');

    const context = await v3.getCompressedContext(project.id, 1000);

    if (context && Array.isArray(context)) {
      console.log('✅ 通过: 成功获取压缩上下文');
      console.log(`   - 消息数: ${context.length}`);
      passed++;
    } else {
      console.log(`❌ 失败: 上下文格式错误`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 6: 列出项目
  console.log('\n📝 测试 6: 列出项目...');
  try {
    await v3.createProjectFromInput('项目1');
    await v3.createProjectFromInput('项目2');

    const projects = await v3.listProjects();

    if (projects && Array.isArray(projects) && projects.length >= 2) {
      console.log('✅ 通过: 成功列出项目');
      console.log(`   - 项目数: ${projects.length}`);
      passed++;
    } else {
      console.log(`❌ 失败: 项目列表不符合预期`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 7: 获取项目及统计
  console.log('\n📝 测试 7: 获取项目及统计...');
  try {
    const { project } = await v3.createProjectFromInput('测试项目');
    await v3.agentSpeak(project.id, 'technical', '测试消息');

    const projectWithStats = await v3.getProject(project.id);

    if (projectWithStats && projectWithStats.flowStats && projectWithStats.flowStats.totalMessages > 0) {
      console.log('✅ 通过: 成功获取项目统计');
      console.log(`   - 消息数: ${projectWithStats.flowStats.totalMessages}`);
      passed++;
    } else {
      console.log(`❌ 失败: 项目统计不完整`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ 测试失败: ${error.message}`);
    failed++;
  }

  // 测试 8: 过滤项目消息
  console.log('\n📝 测试 8: 过滤项目消息...');
  try {
    const { project } = await v3.createProjectFromInput('测试项目');

    await v3.agentSpeak(project.id, 'technical', '技术建议');
    await v3.agentSpeak(project.id, 'testing', '测试建议');

    // 按角色过滤
    const techMessages = await v3.getProjectMessages(project.id, { role: 'technical' });

    if (techMessages && techMessages.length === 1 && techMessages[0].role === 'technical') {
      console.log('✅ 通过: 角色过滤成功');
      passed++;
    } else {
      console.log(`❌ 失败: 角色过滤失败`);
      console.log(`   实际: ${JSON.stringify(techMessages)}`);
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
  } else {
    console.log('⚠️  部分测试失败');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});
