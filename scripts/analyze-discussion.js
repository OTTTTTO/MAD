#!/usr/bin/env node
/**
 * 讨论日志分析工具
 * 分析讨论历史，提取关键信息
 */

const fs = require('fs');
const path = require('path');
const { DiscussionOrchestrator } = require('../orchestrator.js');

// 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

// 分析统计数据
function analyzeStats(messages, participants) {
  const stats = {
    totalMessages: messages.length,
    byRole: {},
    avgLength: 0,
    timeSpan: 0,
    conflictCount: 0,
    consensusIndicators: 0
  };

  if (messages.length === 0) return stats;

  // 按角色统计
  messages.forEach(msg => {
    const role = msg.role || 'unknown';
    if (!stats.byRole[role]) {
      stats.byRole[role] = { count: 0, totalLength: 0 };
    }
    stats.byRole[role].count++;
    stats.byRole[role].totalLength += (msg.content?.length || 0);

    // 冲突检测
    if (msg.metadata?.conflictDetected) {
      stats.conflictCount++;
    }

    // 共识指示器
    if (msg.content?.includes('同意') || msg.content?.includes('认可') || 
        msg.content?.includes('赞同') || msg.content?.includes('✅')) {
      stats.consensusIndicators++;
    }
  });

  // 平均长度
  const totalLength = Object.values(stats.byRole)
    .reduce((sum, r) => sum + r.totalLength, 0);
  stats.avgLength = Math.round(totalLength / messages.length);

  // 时间跨度
  if (messages.length >= 2) {
    const first = messages[0].timestamp;
    const last = messages[messages.length - 1].timestamp;
    stats.timeSpan = Math.round((last - first) / 1000);
  }

  return stats;
}

// 显示分析报告
function showReport(discussion, stats) {
  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.cyan, '📊 讨论分析报告\n');

  console.log(`讨论主题: ${discussion.topic}`);
  console.log(`创建时间: ${new Date(discussion.createdAt).toLocaleString('zh-CN')}`);
  
  if (discussion.endedAt) {
    const duration = Math.round((discussion.endedAt - discussion.createdAt) / 1000);
    console.log(`结束时间: ${new Date(discussion.endedAt).toLocaleString('zh-CN')}`);
    console.log(`总时长: ${duration} 秒`);
  }

  console.log(`\n${'─'.repeat(60)}`);
  log(colors.bright + colors.blue, '\n📈 统计数据\n');

  console.log(`总消息数: ${stats.totalMessages}`);
  console.log(`平均长度: ${stats.avgLength} 字符`);
  console.log(`时间跨度: ${stats.timeSpan} 秒`);
  console.log(`冲突次数: ${stats.conflictCount}`);
  console.log(`共识指示: ${stats.consensusIndicators}`);

  console.log(`\n${'─'.repeat(60)}`);
  log(colors.bright + colors.yellow, '\n👥 参与者统计\n');

  Object.entries(stats.byRole)
    .sort(([, a], [, b]) => b.count - a.count)
    .forEach(([role, data]) => {
      const avgLen = Math.round(data.totalLength / data.count);
      console.log(`  ${colors.cyan}${role.padEnd(15)}${colors.reset} ` +
                  `${data.count} 条消息, 平均 ${avgLen} 字符`);
    });

  console.log('\n' + '═'.repeat(60));
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n📊 MAD 讨论日志分析工具\n');
    console.log('用法: node scripts/analyze-discussion.js [选项]\n');
    console.log('选项:');
    console.log('  --file <路径>     指定 JSON 日志文件');
    console.log('  --latest          分析最新的讨论');
    console.log('  --help, -h        显示帮助信息\n');
    console.log('示例:');
    console.log('  node scripts/analyze-discussion.js --latest');
    console.log('  node scripts/analyze-discussion.js --file data/discussions/2026-02-02/xxx.json\n');
    process.exit(0);
  }

  let dataPath = null;

  if (args.includes('--latest')) {
    // 查找最新的讨论文件
    const discussionsDir = path.join(__dirname, '../data/discussions');
    if (!fs.existsSync(discussionsDir)) {
      console.log('\n⚠️  未找到讨论记录目录\n');
      process.exit(1);
    }

    const dates = fs.readdirSync(discussionsDir)
      .filter(f => fs.statSync(path.join(discussionsDir, f)).isDirectory())
      .sort()
      .reverse();

    if (dates.length === 0) {
      console.log('\n⚠️  未找到任何讨论记录\n');
      process.exit(1);
    }

    const latestDate = dates[0];
    const files = fs.readdirSync(path.join(discussionsDir, latestDate))
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('\n⚠️  未找到讨论文件\n');
      process.exit(1);
    }

    dataPath = path.join(discussionsDir, latestDate, files[0]);
    log(colors.green, `\n✅ 分析最新讨论: ${files[0]}\n`);
  } else {
    const fileIndex = args.indexOf('--file');
    if (fileIndex !== -1 && args[fileIndex + 1]) {
      dataPath = args[fileIndex + 1];
    }
  }

  if (!dataPath || !fs.existsSync(dataPath)) {
    console.log('\n❌ 未找到讨论文件\n');
    console.log('提示: 使用 --latest 分析最新讨论，或用 --file 指定文件路径\n');
    process.exit(1);
  }

  // 读取数据
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // 分析
  const stats = analyzeStats(data.messages || [], data.participants || []);
  showReport(data.discussion || data, stats);

  // 建议
  log(colors.bright + colors.magenta, '\n💡 分析建议\n');

  if (stats.conflictCount > stats.totalMessages * 0.3) {
    console.log('⚠️  冲突较多，建议加强协调或调整参与者配置');
  }

  if (stats.consensusIndicators < stats.totalMessages * 0.1) {
    console.log('💭 共识较少，可能需要更多沟通或明确目标');
  }

  if (stats.avgLength < 50) {
    console.log('📝 消息较短，建议鼓励更深入的讨论');
  }

  const topParticipant = Object.entries(stats.byRole)
    .sort(([, a], [, b]) => b.count - a.count)[0];
  
  if (topParticipant) {
    const [role, data] = topParticipant;
    const ratio = Math.round((data.count / stats.totalMessages) * 100);
    if (ratio > 50) {
      console.log(`⚖️  ${role} 发言占比 ${ratio}%，建议平衡参与度`);
    }
  }

  console.log('\n✨ 分析完成！\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ 错误:', err.message);
    process.exit(1);
  });
}

module.exports = { analyzeStats, showReport };
