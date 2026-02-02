#!/usr/bin/env node

/**
 * 快速开始脚本
 * 
 * 运行方式：
 * node quick-start.js
 * 
 * 选项：
 * --topic     自定义讨论主题
 * --rounds    讨论轮数（默认 5）
 * --duration  最大时长（毫秒，默认 120000）
 */

const { DiscussionOrchestrator } = require('./orchestrator.js');

// 颜色输出（ANSI）
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

async function quickStart(options = {}) {
  const {
    topic = '演示：如何使用 Multi-Agent Discussion',
    rounds = 5,
    duration = 120000
  } = options;

  log(colors.bright + colors.cyan, '\n🚀 Multi-Agent Discussion - 快速开始\n');
  console.log('═'.repeat(60));

  // 1. 初始化
  log(colors.blue, '\n📋 步骤 1: 初始化协调器...');
  const orchestrator = new DiscussionOrchestrator({
    maxDuration: duration,
    maxRounds: rounds,
    enableConflictDetection: true,
    enableDynamicSpeaking: true
  });
  
  await orchestrator.initialize();
  log(colors.green, '✅ 协调器已初始化\n');

  // 2. 创建讨论
  log(colors.blue, '📋 步骤 2: 创建讨论组...');
  const { discussionId, context, participants } = 
    await orchestrator.createDiscussion(topic);
  
  log(colors.green, `✅ 讨论组已创建: ${discussionId}`);
  console.log(`   主题: ${context.topic}`);
  console.log(`   参与者: ${participants.map(p => p.role).join(', ')}\n`);

  // 3. 模拟讨论
  log(colors.blue, '📋 步骤 3: Agent 开始讨论...\n');
  
  const participantIds = participants.filter(p => p.id !== 'coordinator').map(p => p.id);
  
  // 模拟几个发言
  const sampleMessages = [
    { role: participantIds[0], content: '👋 大家好！这个功能很有价值，可以帮助团队更好地协作。' },
    { role: participantIds[1] || participantIds[0], content: '💡 确实，通过多 Agent 协同，可以产生更全面的解决方案。' },
    { role: participantIds[2] || participantIds[0], content: '🔧 技术上已经实现，测试也全部通过了。' },
  ];

  for (const msg of sampleMessages) {
    if (msg.role) {
      const participant = participants.find(p => p.id === msg.role);
      console.log(`   ${colors.cyan}[${participant?.role || msg.role}]${colors.reset} ${msg.content}`);
      await orchestrator.agentSpeak(discussionId, msg.role, msg.content);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 4. 查看讨论历史
  log(colors.blue, '\n📋 步骤 4: 查看讨论历史...');
  const history = orchestrator.getDiscussionHistory(discussionId);
  log(colors.green, `✅ 共有 ${history.messages.length} 条消息\n`);

  // 5. 结束讨论
  log(colors.blue, '📋 步骤 5: 结束讨论并生成总结...');
  const summary = await orchestrator.endDiscussion(discussionId);
  log(colors.green, '✅ 讨论已结束\n');

  // 6. 显示总结
  console.log('═'.repeat(60));
  log(colors.bright + colors.yellow, '📊 讨论总结\n');
  console.log(`讨论主题: ${summary.discussion.topic}`);
  console.log(`消息数量: ${summary.messages.length}`);
  console.log(`讨论时长: ${Math.round((summary.discussion.endedAt - summary.discussion.createdAt) / 1000)} 秒`);
  console.log('\n参与角色:');
  summary.participants.forEach(p => {
    if (p.id !== 'coordinator') {
      console.log(`  - ${p.emoji} ${p.role}`);
    }
  });

  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.green, '✨ 演示完成！\n');
  
  log(colors.cyan, '接下来你可以：');
  console.log('1. 运行测试: node test/basic.test.js');
  console.log('2. 阅读文档: cat README.md');
  console.log('3. 查看代码: cat orchestrator.js');
  console.log('4. 集成到你的 Agent 中');
  console.log('5. 使用自定义主题: node quick-start.js --topic "你的主题"\n');
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    if (arg === '--topic' && nextArg) {
      options.topic = nextArg;
      i++;
    } else if (arg === '--rounds' && nextArg) {
      options.rounds = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--duration' && nextArg) {
      options.duration = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log('\n🚀 MAD 快速启动脚本\n');
      console.log('用法: node quick-start.js [选项]\n');
      console.log('选项:');
      console.log('  --topic <主题>     自定义讨论主题');
      console.log('  --rounds <数字>    讨论轮数（默认 5）');
      console.log('  --duration <毫秒>  最大时长（默认 120000）');
      console.log('  --help, -h         显示帮助信息\n');
      console.log('示例:');
      console.log('  node quick-start.js');
      console.log('  node quick-start.js --topic "AI 未来发展"');
      console.log('  node quick-start.js --rounds 3 --duration 60000\n');
      process.exit(0);
    }
  }
  
  return options;
}

// 运行
if (require.main === module) {
  const options = parseArgs();
  quickStart(options).catch(error => {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  });
}

module.exports = { quickStart };
