/**
 * Markdown 导出器
 * 
 * 导出讨论为 Markdown 格式
 * 
 * @module exporters/markdown
 * @version 2.6.0
 */

/**
 * 导出讨论为 Markdown
 */
async function exportToMarkdown(discussion, options = {}) {
  const {
    outputPath = null,
    includeMetadata = true,
    includeStats = true,
    includeAgents = true,
    includeTimeline = true
  } = options;

  try {
    let markdown = '';

    // 标题
    markdown += `# ${discussion.topic || 'Discussion'}\n\n`;

    // 元数据
    if (includeMetadata) {
      markdown += '## 📋 元数据\n\n';
      markdown += `- **ID**: ${discussion.id}\n`;
      markdown += `- **状态**: ${getStatusEmoji(discussion.status)} ${discussion.status}\n`;
      markdown += `- **创建时间**: ${formatDate(discussion.createdAt)}\n`;
      if (discussion.endedAt) {
        markdown += `- **结束时间**: ${formatDate(discussion.endedAt)}\n`;
        const duration = discussion.endedAt - discussion.createdAt;
        markdown += `- **持续时间**: ${formatDuration(duration)}\n`;
      }
      markdown += `- **轮次**: ${discussion.rounds || 0}\n`;
      markdown += '\n';
    }

    // 参与者
    if (includeAgents && discussion.participants) {
      markdown += '## 👥 参与者\n\n';
      discussion.participants.forEach(p => {
        markdown += `- **${p.role}** ${getAgentEmoji(p.role)}\n`;
      });
      markdown += '\n';
    }

    // 讨论内容
    markdown += '## 💬 讨论内容\n\n';

    if (discussion.messages && discussion.messages.length > 0) {
      discussion.messages.forEach((msg, index) => {
        const agentEmoji = getAgentEmoji(msg.agentName);
        const time = new Date(msg.timestamp).toLocaleTimeString();
        
        markdown += `### ${agentEmoji} ${msg.agentName}\n`;
        markdown += `*${time}*\n\n`;
        
        // 引用（如果有回复）
        if (msg.replyTo) {
          const repliedMsg = discussion.messages.find(m => m.id === msg.replyTo);
          if (repliedMsg) {
            markdown += `> **回复 ${repliedMsg.agentName}**: ${repliedMsg.content.slice(0, 100)}...\n\n`;
          }
        }

        // 内容
        markdown += `${msg.content}\n\n`;

        // 提及
        if (msg.mentions && msg.mentions.length > 0) {
          markdown += `**@提及**: ${msg.mentions.join(', ')}\n\n`;
        }
      });
    } else {
      markdown += '*暂无消息*\n\n';
    }

    // 时间线摘要
    if (includeTimeline && discussion.messages && discussion.messages.length > 0) {
      markdown += '## 📅 时间线\n\n';
      discussion.messages.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleString();
        markdown += `${index + 1}. **${time}** - ${msg.agentName}: ${msg.content.slice(0, 50)}...\n`;
      });
      markdown += '\n';
    }

    // 统计信息
    if (includeStats) {
      markdown += '## 📊 统计\n\n';
      const stats = calculateStats(discussion);
      markdown += `- **总消息数**: ${stats.totalMessages}\n`;
      markdown += `- **参与者数量**: ${stats.participantCount}\n`;
      markdown += `- **平均消息长度**: ${stats.avgMessageLength} 字符\n`;
      markdown += `- **提及次数**: ${stats.mentionCount}\n`;
      markdown += `- **回复次数**: ${stats.replyCount}\n`;
      markdown += '\n';

      // Agent 发言统计
      if (stats.agentStats && Object.keys(stats.agentStats).length > 0) {
        markdown += '### 发言统计\n\n';
        Object.entries(stats.agentStats)
          .sort(([,a], [,b]) => b.count - a.count)
          .forEach(([agent, data]) => {
            markdown += `- **${agent}**: ${data.count} 条消息\n`;
          });
        markdown += '\n';
      }
    }

    // 共识（如果有）
    if (discussion.consensus && discussion.consensus.size > 0) {
      markdown += '## ✅ 达成共识\n\n';
      discussion.consensus.forEach((value, key) => {
        markdown += `- **${key}**: ${value}\n`;
      });
      markdown += '\n';
    }

    // 结论（如果有）
    if (discussion.conclusion) {
      markdown += '## 🎯 结论\n\n';
      markdown += `${discussion.conclusion}\n\n`;
    }

    // 页脚
    markdown += '---\n';
    markdown += `*导出时间: ${new Date().toLocaleString()}*\n`;
    markdown += '*Powered by MAD (Multi-Agent Discussion)*\n';

    // 保存到文件
    if (outputPath) {
      const fs = require('fs');
      fs.writeFileSync(outputPath, markdown, 'utf8');
    }

    return {
      content: markdown,
      size: markdown.length,
      path: outputPath
    };

  } catch (error) {
    throw new Error(`Markdown export failed: ${error.message}`);
  }
}

/**
 * 计算统计信息
 */
function calculateStats(discussion) {
  const messages = discussion.messages || [];
  const participants = discussion.participants || [];

  const agentStats = {};
  let totalLength = 0;
  let mentionCount = 0;
  let replyCount = 0;

  messages.forEach(msg => {
    // Agent 统计
    if (!agentStats[msg.agentName]) {
      agentStats[msg.agentName] = { count: 0, length: 0 };
    }
    agentStats[msg.agentName].count++;
    agentStats[msg.agentName].length += msg.content?.length || 0;
    totalLength += msg.content?.length || 0;

    // 提及统计
    if (msg.mentions) {
      mentionCount += msg.mentions.length;
    }

    // 回复统计
    if (msg.replyTo) {
      replyCount++;
    }
  });

  return {
    totalMessages: messages.length,
    participantCount: participants.length,
    avgMessageLength: messages.length > 0 ? Math.round(totalLength / messages.length) : 0,
    mentionCount,
    replyCount,
    agentStats
  };
}

/**
 * 状态 Emoji
 */
function getStatusEmoji(status) {
  const emojis = {
    'initializing': '🔄',
    'active': '💬',
    'concluding': '🔄',
    'ended': '✅',
    'archived': '📦'
  };
  return emojis[status] || '❓';
}

/**
 * Agent Emoji
 */
function getAgentEmoji(agentName) {
  const emojis = {
    'coordinator': '💡',
    'market_research': '📊',
    'requirement': '🎯',
    'technical': '🔧',
    'testing': '🧪',
    'documentation': '📝'
  };
  return emojis[agentName] || '🤖';
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

/**
 * 格式化持续时间
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}天 ${hours % 24}小时`;
  if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
  if (minutes > 0) return `${minutes}分钟 ${seconds % 60}秒`;
  return `${seconds}秒`;
}

module.exports = {
  exportToMarkdown
};
