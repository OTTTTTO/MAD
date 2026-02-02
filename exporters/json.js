/**
 * JSON 导出器
 * 
 * 导出讨论为 JSON 格式
 * 
 * @module exporters/json
 * @version 2.6.0
 */

/**
 * 导出讨论为 JSON
 */
async function exportToJSON(discussion, options = {}) {
  const {
    outputPath = null,
    format = 'pretty', // 'pretty' | 'compact'
    includeMetadata = true,
    includeMessages = true,
    includeStats = true,
    includeRaw = false
  } = options;

  try {
    const exportData = {
      version: '2.6.0',
      exportedAt: new Date().toISOString(),
      format: 'MAD-Discussion-Export'
    };

    // 基本信息
    if (includeMetadata) {
      exportData.discussion = {
        id: discussion.id,
        topic: discussion.topic,
        status: discussion.status,
        createdAt: new Date(discussion.createdAt).toISOString(),
        endedAt: discussion.endedAt ? new Date(discussion.endedAt).toISOString() : null,
        duration: discussion.endedAt 
          ? discussion.endedAt - discussion.createdAt 
          : Date.now() - discussion.createdAt,
        rounds: discussion.rounds || 0,
        participants: (discussion.participants || []).map(p => ({
          role: p.role,
          joinedAt: p.joinedAt ? new Date(p.joinedAt).toISOString() : null
        }))
      };
    }

    // 消息
    if (includeMessages) {
      exportData.messages = (discussion.messages || []).map(msg => ({
        id: msg.id,
        agentName: msg.agentName,
        content: msg.content,
        timestamp: new Date(msg.timestamp).toISOString(),
        mentions: msg.mentions || [],
        replyTo: msg.replyTo || null,
        metadata: msg.metadata || {}
      }));
    }

    // 统计信息
    if (includeStats) {
      exportData.statistics = calculateStatistics(discussion);
    }

    // 共识和结论
    if (discussion.consensus && discussion.consensus.size > 0) {
      exportData.consensus = Object.fromEntries(discussion.consensus);
    }

    if (discussion.conclusion) {
      exportData.conclusion = discussion.conclusion;
    }

    // 原始数据（可选）
    if (includeRaw) {
      exportData.raw = discussion;
    }

    // 序列化
    const jsonString = format === 'pretty' 
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    // 保存到文件
    if (outputPath) {
      const fs = require('fs');
      fs.writeFileSync(outputPath, jsonString, 'utf8');
    }

    return {
      data: exportData,
      json: jsonString,
      size: jsonString.length,
      path: outputPath
    };

  } catch (error) {
    throw new Error(`JSON export failed: ${error.message}`);
  }
}

/**
 * 计算统计信息
 */
function calculateStatistics(discussion) {
  const messages = discussion.messages || [];
  const participants = discussion.participants || [];

  const stats = {
    overview: {
      totalMessages: messages.length,
      totalParticipants: participants.length,
      duration: discussion.endedAt 
        ? discussion.endedAt - discussion.createdAt 
        : Date.now() - discussion.createdAt,
      rounds: discussion.rounds || 0
    },
    agents: {},
    timeline: {},
    interactions: {
      mentions: 0,
      replies: 0,
      threads: 0
    }
  };

  // Agent 统计
  participants.forEach(p => {
    stats.agents[p.role] = {
      messageCount: 0,
      totalLength: 0,
      avgLength: 0,
      firstMessage: null,
      lastMessage: null,
      mentionsGiven: 0,
      mentionsReceived: 0,
      repliesGiven: 0,
      repliesReceived: 0
    };
  });

  // 时间线统计（按小时）
  messages.forEach(msg => {
    const hour = new Date(msg.timestamp).getHours();
    stats.timeline[hour] = (stats.timeline[hour] || 0) + 1;
  });

  // 消息分析
  messages.forEach(msg => {
    const agent = stats.agents[msg.agentName];
    if (!agent) return;

    agent.messageCount++;
    agent.totalLength += msg.content?.length || 0;

    if (!agent.firstMessage || msg.timestamp < agent.firstMessage) {
      agent.firstMessage = msg.timestamp;
    }
    if (!agent.lastMessage || msg.timestamp > agent.lastMessage) {
      agent.lastMessage = msg.timestamp;
    }

    // 提及
    if (msg.mentions && msg.mentions.length > 0) {
      agent.mentionsGiven += msg.mentions.length;
      stats.interactions.mentions += msg.mentions.length;

      msg.mentions.forEach(mentionedAgent => {
        const mentioned = stats.agents[mentionedAgent];
        if (mentioned) {
          mentioned.mentionsReceived++;
        }
      });
    }

    // 回复
    if (msg.replyTo) {
      agent.repliesGiven++;
      stats.interactions.replies++;

      const repliedMsg = messages.find(m => m.id === msg.replyTo);
      if (repliedMsg) {
        const repliedAgent = stats.agents[repliedMsg.agentName];
        if (repliedAgent) {
          repliedAgent.repliesReceived++;
        }
      }
    }
  });

  // 计算平均长度
  Object.values(stats.agents).forEach(agent => {
    if (agent.messageCount > 0) {
      agent.avgLength = Math.round(agent.totalLength / agent.messageCount);
    }
  });

  // 计算活跃度
  Object.values(stats.agents).forEach(agent => {
    agent.activityScore = calculateActivityScore(agent);
  });

  return stats;
}

/**
 * 计算 Agent 活跃度得分
 */
function calculateActivityScore(agent) {
  if (agent.messageCount === 0) return 0;

  const messageScore = Math.min(agent.messageCount / 10, 1) * 0.4;
  const lengthScore = Math.min(agent.avgLength / 200, 1) * 0.2;
  const interactionScore = Math.min(
    (agent.mentionsGiven + agent.repliesGiven) / agent.messageCount, 1
  ) * 0.4;

  return Math.round((messageScore + lengthScore + interactionScore) * 100);
}

module.exports = {
  exportToJSON
};
