#!/usr/bin/env node
/**
 * 讨论导出为 Markdown 工具
 * 将讨论日志导出为格式化的 Markdown 文档
 */

const fs = require('fs');
const path = require('path');

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

// 获取讨论列表
function getDiscussionList() {
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    return [];
  }
  return fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort()
    .reverse();
}

// 读取讨论日志
function readDiscussion(logFile) {
  const logPath = path.join(__dirname, '../logs', logFile);
  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
  return lines.map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

// 导出为 Markdown
function exportToMarkdown(messages) {
  if (!messages || messages.length === 0) {
    return '# 讨论\n\n*暂无消息*';
  }

  const firstMsg = messages[0];
  const lastMsg = messages[messages.length - 1];
  const startTime = new Date(firstMsg.timestamp).toLocaleString('zh-CN');
  const endTime = new Date(lastMsg.timestamp).toLocaleString('zh-CN');

  let markdown = '# MAD 讨论记录\n\n';
  markdown += `**时间**: ${startTime} - ${endTime}\n`;
  markdown += `**消息数**: ${messages.length}\n`;
  markdown += `**主题**: ${firstMsg.metadata?.topic || '未指定'}\n\n`;

  // 统计信息
  const stats = {
    byRole: {}
  };
  messages.forEach(msg => {
    const role = msg.role || 'unknown';
    if (!stats.byRole[role]) stats.byRole[role] = 0;
    stats.byRole[role]++;
  });

  markdown += '## 参与者统计\n\n';
  markdown += '| 角色 | 消息数 |\n';
  markdown += '|------|--------|\n';
  Object.entries(stats.byRole)
    .sort((a, b) => b[1] - a[1])
    .forEach(([role, count]) => {
      markdown += `| ${role} | ${count} |\n`;
    });

  markdown += '\n---\n\n## 讨论内容\n\n';

  messages.forEach((msg, index) => {
    const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN');
    const role = msg.role || 'unknown';
    const content = msg.content || '';

    markdown += `### [${index + 1}] ${role} (${time})\n\n`;
    markdown += `${content}\n\n`;

    // 添加元数据
    if (msg.metadata && Object.keys(msg.metadata).length > 0) {
      const metadata = Object.entries(msg.metadata)
        .filter(([k]) => k !== 'timestamp')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (metadata) {
        markdown += `*元数据: ${metadata}*\n\n`;
      }
    }

    markdown += '---\n\n';
  });

  return markdown;
}

// 主函数
async function main() {
  log(colors.cyan, '📝 MAD 讨论导出工具\n');

  const discussions = getDiscussionList();

  if (discussions.length === 0) {
    log(colors.yellow, '未找到讨论记录');
    return;
  }

  log(colors.blue, `找到 ${discussions.length} 个讨论记录\n`);

  // 显示最近 5 个
  const recent = discussions.slice(0, 5);
  recent.forEach((d, i) => {
    log(colors.green, `${i + 1}. ${d}`);
  });

  // 使用最新的讨论
  const latest = discussions[0];
  log(colors.cyan, `\n正在导出: ${latest}`);

  const messages = readDiscussion(latest);
  const markdown = exportToMarkdown(messages);

  // 保存
  const outputDir = path.join(__dirname, '../exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `${latest.replace('.jsonl', '')}.md`);
  fs.writeFileSync(outputFile, markdown, 'utf-8');

  log(colors.green, `✅ 导出成功: ${outputFile}`);
  log(colors.blue, `📊 共 ${messages.length} 条消息`);
}

main().catch(console.error);
