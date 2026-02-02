/**
 * MAD v3.0 - 项目流管理器
 * 负责项目组的消息流管理、Token 计算、上下文压缩
 */

const fs = require('fs').promises;
const path = require('path');

class ProjectFlowManager {
  constructor(dataDir) {
    this.dataDir = dataDir || path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'projects');
    this.flows = new Map();
  }

  /**
   * 添加消息到项目组
   */
  async addMessage(projectId, message) {
    const flow = this.getFlow(projectId);

    // 计算消息的 Token 数
    const tokens = this.calculateTokens(message);

    const messageWithMeta = {
      ...message,
      id: `msg-${Date.now()}-${flow.messages.length}`,
      timestamp: Date.now(),
      tokens
    };

    flow.messages.push(messageWithMeta);
    flow.totalTokens += tokens;

    // 自动保存
    await this.saveFlow(projectId);

    return messageWithMeta;
  }

  /**
   * 获取项目的消息流
   */
  async getMessages(projectId, options = {}) {
    const flow = this.getFlow(projectId);
    let messages = flow.messages;

    // 时间范围过滤
    if (options.startTime || options.endTime) {
      messages = messages.filter(m => {
        if (options.startTime && m.timestamp < options.startTime) return false;
        if (options.endTime && m.timestamp > options.endTime) return false;
        return true;
      });
    }

    // 角色过滤
    if (options.role) {
      messages = messages.filter(m => m.role === options.role);
    }

    // 限制数量
    if (options.limit) {
      messages = messages.slice(-options.limit);
    }

    // 分页
    if (options.page && options.pageSize) {
      const start = (options.page - 1) * options.pageSize;
      messages = messages.slice(start, start + options.pageSize);
    }

    return messages;
  }

  /**
   * 获取压缩后的上下文
   */
  async getCompressedContext(projectId, maxTokens = 8000) {
    const flow = this.getFlow(projectId);

    if (flow.totalTokens <= maxTokens) {
      // 无需压缩
      return flow.messages;
    }

    // 压缩策略：
    // 1. 保留最近的标记
    // 2. 保留最近的消息
    // 3. 压缩中间的普通消息

    const markers = flow.messages.filter(m => m.isMarker);
    const recentMessages = flow.messages.slice(-50);

    // 找出需要压缩的消息段
    const compressStart = markers.length > 0 ? markers[0].index : 0;
    const compressEnd = flow.messages.length - recentMessages.length;

    const compressedSummary = await this.compressMessages(
      flow.messages.slice(compressStart, compressEnd)
    );

    // 组合压缩后的上下文
    const compressedContext = [
      ...markers,
      {
        id: 'msg-compressed',
        type: 'compressed',
        content: compressedSummary,
        tokens: this.calculateTokens({ content: compressedSummary })
      },
      ...recentMessages
    ];

    return compressedContext;
  }

  /**
   * 压缩消息段
   */
  async compressMessages(messages) {
    // 简单的压缩策略：提取关键信息
    const keyPoints = messages.map(m => {
      if (m.isMarker) {
        return `[${m.markerType}] ${m.summary || m.content}`;
      }
      // 提取每个消息的第一句话
      const firstSentence = m.content.split(/[。！？\n]/)[0];
      return `${m.role}: ${firstSentence}`;
    });

    return keyPoints.join('\n');
  }

  /**
   * 计算 Token 数（简化版）
   */
  calculateTokens(message) {
    const text = message.content || '';
    // 简单估算：中文约 1.5 字 = 1 token，英文约 4 字 = 1 token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const otherChars = text.length - chineseChars;

    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }

  /**
   * 获取流状态
   */
  getFlowStats(projectId) {
    const flow = this.getFlow(projectId);

    return {
      totalMessages: flow.messages.length,
      totalTokens: flow.totalTokens,
      markers: flow.messages.filter(m => m.isMarker).length,
      lastUpdate: flow.lastUpdate,
      participants: [...new Set(flow.messages.map(m => m.role))]
    };
  }

  /**
   * 获取或创建流
   */
  getFlow(projectId) {
    if (!this.flows.has(projectId)) {
      this.flows.set(projectId, {
        messages: [],
        totalTokens: 0,
        lastUpdate: Date.now()
      });
    }
    return this.flows.get(projectId);
  }

  /**
   * 保存流
   */
  async saveFlow(projectId) {
    const flow = this.getFlow(projectId);
    const filePath = path.join(this.dataDir, projectId, 'flow.json');

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(flow, null, 2));
  }

  /**
   * 加载流
   */
  async loadFlow(projectId) {
    const filePath = path.join(this.dataDir, projectId, 'flow.json');

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const flow = JSON.parse(data);
      this.flows.set(projectId, flow);
      return flow;
    } catch (error) {
      // 流不存在，创建新的
      return this.getFlow(projectId);
    }
  }
}

module.exports = ProjectFlowManager;
