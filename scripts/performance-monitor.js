#!/usr/bin/env node
/**
 * 性能监控工具
 * 监控 MAD 系统的性能指标
 */

const fs = require('fs');
const path = require('path');

// 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      discussions: { total: 0, active: 0, ended: 0 },
      messages: { total: 0, avgPerDiscussion: 0 },
      participants: { total: 0, avgPerDiscussion: 0 },
      timing: { avgDuration: 0, totalDuration: 0 },
      cache: { hitRate: 0, memorySize: 0, diskSize: 0 },
      system: { uptime: 0, memoryUsage: 0 }
    };
  }

  // 收集讨论指标
  collectDiscussionMetrics(orchestrator) {
    const discussions = orchestrator.getAllDiscisions?.() || 
                       orchestrator.getAllDiscussions?.() || [];

    this.metrics.discussions.total = discussions.length;
    this.metrics.discussions.active = discussions.filter(d => !d.endedAt).length;
    this.metrics.discussions.ended = discussions.filter(d => d.endedAt).length;

    let totalMessages = 0;
    let totalParticipants = 0;
    let totalDuration = 0;
    let durationCount = 0;

    discussions.forEach(d => {
      const history = orchestrator.getDiscussionHistory?.(d.id);
      if (history) {
        totalMessages += history.messages?.length || 0;
      }
      
      totalParticipants += d.participants?.length || 0;
      
      if (d.endedAt && d.createdAt) {
        totalDuration += (d.endedAt - d.createdAt);
        durationCount++;
      }
    });

    this.metrics.messages.total = totalMessages;
    this.metrics.messages.avgPerDiscussion = discussions.length > 0
      ? Math.round(totalMessages / discussions.length)
      : 0;

    this.metrics.participants.total = totalParticipants;
    this.metrics.participants.avgPerDiscussion = discussions.length > 0
      ? Math.round(totalParticipants / discussions.length)
      : 0;

    this.metrics.timing.totalDuration = totalDuration;
    this.metrics.timing.avgDuration = durationCount > 0
      ? Math.round(totalDuration / durationCount / 1000)
      : 0;
  }

  // 收集缓存指标
  collectCacheMetrics(cache) {
    if (!cache) return;

    const stats = cache.getStats?.();
    if (stats) {
      this.metrics.cache = {
        hitRate: stats.hitRate || 0,
        memorySize: stats.memorySize || 0,
        diskSize: stats.diskSize || 0
      };
    }
  }

  // 收集系统指标
  collectSystemMetrics() {
    this.metrics.system.uptime = Math.round(process.uptime());
    this.metrics.system.memoryUsage = Math.round(
      process.memoryUsage().heapUsed / 1024 / 1024
    );
  }

  // 评估健康度
  evaluateHealth() {
    const issues = [];
    const warnings = [];

    // 检查缓存命中率
    if (this.metrics.cache.hitRate < 50 && this.metrics.discussions.total > 10) {
      warnings.push('缓存命中率较低，考虑增加缓存大小或调整过期时间');
    }

    // 检查讨论数量
    if (this.metrics.discussions.total === 0) {
      issues.push('没有任何讨论记录');
    }

    // 检查活跃讨论比例
    if (this.metrics.discussions.total > 0) {
      const activeRatio = this.metrics.discussions.active / this.metrics.discussions.total;
      if (activeRatio > 0.5) {
        warnings.push('活跃讨论比例较高，可能影响性能');
      }
    }

    // 检查平均讨论时长
    if (this.metrics.timing.avgDuration > 600) {
      warnings.push('平均讨论时长超过 10 分钟，可能需要优化');
    }

    // 检查内存使用
    if (this.metrics.system.memoryUsage > 500) {
      warnings.push(`内存使用较高 (${this.metrics.system.memoryUsage}MB)`);
    }

    return { issues, warnings };
  }

  // 显示报告
  displayReport() {
    console.log('\n' + '═'.repeat(60));
    log(colors.bright + colors.cyan, '📊 MAD 性能监控报告\n');

    // 讨论统计
    log(colors.bright + colors.blue, '📋 讨论统计');
    console.log(`  总数: ${this.metrics.discussions.total}`);
    console.log(`  活跃: ${this.metrics.discussions.active}`);
    console.log(`  已结束: ${this.metrics.discussions.ended}\n`);

    // 消息统计
    log(colors.bright + colors.blue, '💬 消息统计');
    console.log(`  总数: ${this.metrics.messages.total}`);
    console.log(`  平均/讨论: ${this.metrics.messages.avgPerDiscussion}\n`);

    // 参与者统计
    log(colors.bright + colors.blue, '👥 参与者');
    console.log(`  平均/讨论: ${this.metrics.participants.avgPerDiscussion}\n`);

    // 时间统计
    log(colors.bright + colors.blue, '⏱️  时间统计');
    console.log(`  平均时长: ${this.metrics.timing.avgDuration} 秒\n`);

    // 缓存统计
    log(colors.bright + colors.blue, '💾 缓存');
    console.log(`  命中率: ${this.metrics.cache.hitRate}%`);
    console.log(`  内存: ${this.metrics.cache.memorySize} 条`);
    console.log(`  磁盘: ${this.metrics.cache.diskSize} 条\n`);

    // 系统统计
    log(colors.bright + colors.blue, '🖥️  系统');
    console.log(`  运行时间: ${Math.floor(this.metrics.system.uptime / 60)} 分钟`);
    console.log(`  内存使用: ${this.metrics.system.memoryUsage} MB\n`);

    // 健康度评估
    const { issues, warnings } = this.evaluateHealth();
    
    if (issues.length > 0) {
      log(colors.bright + colors.red, '⚠️  问题\n');
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
      console.log();
    }

    if (warnings.length > 0) {
      log(colors.bright + colors.yellow, '💭 警告\n');
      warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
      console.log();
    }

    if (issues.length === 0 && warnings.length === 0) {
      log(colors.bright + colors.green, '✅ 系统运行正常！\n');
    }

    console.log('═'.repeat(60) + '\n');
  }

  // 导出报告
  exportReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      health: this.evaluateHealth()
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    return outputPath;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n📊 MAD 性能监控工具\n');
    console.log('用法: node scripts/performance-monitor.js [选项]\n');
    console.log('选项:');
    console.log('  --export <路径>    导出报告到文件');
    console.log('  --help, -h         显示帮助信息\n');
    console.log('示例:');
    console.log('  node scripts/performance-monitor.js');
    console.log('  node scripts/performance-monitor.js --export perf-report.json\n');
    process.exit(0);
  }

  const monitor = new PerformanceMonitor();

  // 如果可以访问 orchestrator，收集详细指标
  try {
    const orchestrator = require('../orchestrator.js');
    monitor.collectDiscussionMetrics(orchestrator);
  } catch (err) {
    console.log('⚠️  无法访问 orchestrator，仅显示系统指标\n');
  }

  // 尝试收集缓存指标
  try {
    const { DiscussionCache } = require('../src/cache.js');
    // 这里需要实际的缓存实例
  } catch (err) {
    // 忽略
  }

  // 收集系统指标
  monitor.collectSystemMetrics();

  // 显示报告
  monitor.displayReport();

  // 导出报告
  const exportIndex = args.indexOf('--export');
  if (exportIndex !== -1 && args[exportIndex + 1]) {
    const outputPath = args[exportIndex + 1];
    const result = monitor.exportReport(outputPath);
    log(colors.green, `✅ 报告已导出: ${result}\n`);
  }

  // 根据健康度返回退出码
  const { issues } = monitor.evaluateHealth();
  process.exit(issues.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ 错误:', err.message);
    process.exit(1);
  });
}

module.exports = { PerformanceMonitor };
