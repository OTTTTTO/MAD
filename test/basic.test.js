#!/usr/bin/env node

/**
 * Multi-Agent Discussion - Basic Test
 * 
 * 测试核心功能：
 * 1. 创建讨论组
 * 2. Agent 发言
 * 3. 冲突检测
 * 4. 讨论总结
 */

const { 
  DiscussionOrchestrator, 
  DiscussionConfig,
  AGENT_ROLES 
} = require('../orchestrator.js');

// 测试配置
const TEST_CONFIG = {
  maxDuration: 60000,  // 1分钟（测试用）
  maxRounds: 5,
  enableConflictDetection: true,
  enableDynamicSpeaking: true
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: 初始化
    section('Test 1: Initialize Orchestrator');
    const orchestrator = new DiscussionOrchestrator(TEST_CONFIG);
    await orchestrator.initialize();
    log('✓ Orchestrator initialized', 'green');
    passed++;

    // Test 2: 创建讨论组
    section('Test 2: Create Discussion');
    const { discussionId, context, participants } = 
      await orchestrator.createDiscussion('评估开发"自动写代码"技能');
    
    log(`✓ Discussion created: ${discussionId}`, 'green');
    log(`  Topic: ${context.topic}`, 'blue');
    log(`  Participants: ${participants.map(p => p.role).join(', ')}`, 'blue');
    passed++;

    // Test 3: Agent 发言
    section('Test 3: Agent Speaking');
    
    // 获取实际参与的角色
    const participantIds = participants.map(p => p.id);
    log(`Available participants: ${participantIds.join(', ')}`, 'blue');
    
    // 使用实际参与的角色进行发言测试
    const speaker1 = participantIds.find(id => id !== 'coordinator') || participantIds[0];
    
    await orchestrator.agentSpeak(discussionId, speaker1, `
## 角色发言

这是一个测试发言，来自 ${speaker1} 角色。

讨论的主题是：${context.topic}
    `);
    log(`✓ ${speaker1} Agent spoke`, 'green');

    // 让其他角色也发言
    const speaker2 = participantIds.find(id => id !== 'coordinator' && id !== speaker1);
    if (speaker2) {
      await orchestrator.agentSpeak(discussionId, speaker2, `
## 第二个角色发言

我同意 ${speaker1} 的观点，并补充：

这个需求很有趣，值得深入讨论。
      `);
      log(`✓ ${speaker2} Agent spoke`, 'green');
    }

    passed++;

    // Test 4: 获取讨论摘要
    section('Test 4: Discussion Summary');
    const summary = orchestrator.getDiscussionSummary(discussionId);
    log(`✓ Summary retrieved`, 'green');
    log(`  Status: ${summary.status}`, 'blue');
    log(`  Messages: ${summary.messageCount}`, 'blue');
    log(`  Rounds: ${summary.rounds}`, 'blue');
    log(`  Conflicts: ${summary.conflicts}`, 'blue');
    passed++;

    // Test 5: 获取完整历史
    section('Test 5: Discussion History');
    const history = orchestrator.getDiscussionHistory(discussionId);
    log(`✓ History retrieved`, 'green');
    log(`  Total messages: ${history.messages.length}`, 'blue');
    log(`  Summary points: ${history.summary.keyPoints.length}`, 'blue');
    passed++;

    // Test 6: 冲突检测
    section('Test 6: Conflict Detection');
    
    // 添加冲突观点（使用实际参与的角色）
    const conflictAgent1 = participantIds.find(id => id !== 'coordinator') || participantIds[0];
    const conflictAgent2 = participantIds.find(id => id !== 'coordinator' && id !== conflictAgent1);
    
    await orchestrator.agentSpeak(discussionId, conflictAgent1, 
      '这个需求很有价值，值得做！');
    
    if (conflictAgent2) {
      await orchestrator.agentSpeak(discussionId, conflictAgent2, 
        '技术上很难实现，不推荐做！');
    }
    
    const updatedHistory = orchestrator.getDiscussionHistory(discussionId);
    log(`✓ Conflicts detected: ${updatedHistory.conflicts.length}`, 'green');
    
    if (updatedHistory.conflicts.length > 0) {
      updatedHistory.conflicts.forEach(conflict => {
        log(`  Type: ${conflict.type}`, 'yellow');
        log(`  Positive: ${conflict.positiveAgents.join(', ')}`, 'yellow');
        log(`  Negative: ${conflict.negativeAgents.join(', ')}`, 'yellow');
      });
    }
    passed++;

    // Test 7: 结束讨论
    section('Test 7: End Discussion');
    const finalSummary = await orchestrator.endDiscussion(discussionId);
    log(`✓ Discussion ended`, 'green');
    log(`  Final status: ${finalSummary.discussion.status}`, 'blue');
    log(`  Duration: ${Math.round(finalSummary.discussion.duration / 1000)}s`, 'blue');
    passed++;

    // Test 8: 列出讨论
    section('Test 8: List Discussions');
    const discussions = orchestrator.listDiscussions();
    log(`✓ Retrieved discussions: ${discussions.length}`, 'green');
    discussions.forEach(d => {
      log(`  - ${d.id}: ${d.topic} (${d.status})`, 'blue');
    });
    passed++;

    // 显示讨论内容
    section('Discussion Transcript');
    log('Here\'s what the discussion looked like:', 'yellow');
    console.log('');
    
    finalSummary.messages.forEach(msg => {
      const participant = participants.find(p => p.id === msg.role);
      const roleEmoji = participant ? participant.emoji : '🤖';
      const roleName = participant ? participant.role : msg.role;
      
      log(`[${roleName}] ${roleEmoji}`, 'cyan');
      console.log(msg.content.trim());
      console.log('');
    });

  } catch (error) {
    log(`✗ Test failed: ${error.message}`, 'red');
    console.error(error);
    failed++;
  }

  // 测试结果
  section('Test Results');
  log(`Total: ${passed + failed}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n❌ ${failed} test(s) failed`, 'red');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
