/**
 * MAD v0.1.1 - 消息渲染器
 *
 * 支持的消息类型：
 * - SYSTEM: 系统消息
 * - TOPIC: 用户话题
 * - MENTION: @消息（协调器@专家）
 * - EXPERT_RESPONSE: 专家回复
 * - COLLABORATION: 专家互相@
 * - SUMMARY: 总结
 */

class MessageRenderer {
  constructor(container) {
    this.container = container;
    this.EXPERT_ICONS = {
      coordinator: '🎯',
      tech_expert: '🔧',
      product_expert: '📱',
      business_expert: '💰',
      ops_expert: '📊'
    };

    this.EXPERT_NAMES = {
      coordinator: '主协调器',
      tech_expert: '技术专家',
      product_expert: '产品专家',
      business_expert: '商业专家',
      ops_expert: '运营专家'
    };

    this.EXPERT_COLORS = {
      coordinator: '#667eea',
      tech_expert: '#f59e0b',
      product_expert: '#10b981',
      business_expert: '#ef4444',
      ops_expert: '#8b5cf6'
    };
  }

  /**
   * 渲染消息列表
   */
  renderMessages(messages) {
    this.container.innerHTML = '';

    if (messages.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <p>暂无消息</p>
        </div>
      `;
      return;
    }

    messages.forEach(msg => {
      const element = this.renderMessage(msg);
      this.container.appendChild(element);
    });

    // 滚动到底部
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * 渲染单条消息
   */
  renderMessage(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = `message message-${msg.type.toLowerCase()}`;
    wrapper.dataset.messageId = msg.id;

    switch (msg.type) {
      case 'SYSTEM':
        wrapper.innerHTML = this.renderSystemMessage(msg);
        break;
      case 'TOPIC':
        wrapper.innerHTML = this.renderTopicMessage(msg);
        break;
      case 'MENTION':
        wrapper.innerHTML = this.renderMentionMessage(msg);
        break;
      case 'EXPERT_RESPONSE':
        wrapper.innerHTML = this.renderExpertResponse(msg);
        break;
      case 'COLLABORATION':
        wrapper.innerHTML = this.renderCollaborationMessage(msg);
        break;
      case 'SUMMARY':
        wrapper.innerHTML = this.renderSummaryMessage(msg);
        break;
      default:
        wrapper.innerHTML = this.renderDefaultMessage(msg);
    }

    return wrapper;
  }

  /**
   * 系统消息
   */
  renderSystemMessage(msg) {
    return `
      <div class="message-system">
        <div class="system-icon">ℹ️</div>
        <div class="system-content">${this.escapeHtml(msg.content)}</div>
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * 用户话题
   */
  renderTopicMessage(msg) {
    return `
      <div class="message-topic">
        <div class="topic-header">
          <span class="topic-icon">💬</span>
          <span class="topic-label">用户话题</span>
        </div>
        <div class="topic-content">${this.renderMarkdown(msg.content)}</div>
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * @消息（协调器@专家）
   */
  renderMentionMessage(msg) {
    const fromName = this.EXPERT_NAMES[msg.from] || msg.from;
    const fromIcon = this.EXPERT_ICONS[msg.from] || '👤';
    const toName = this.EXPERT_NAMES[msg.to] || msg.to;
    const fromColor = this.EXPERT_COLORS[msg.from] || '#666';

    return `
      <div class="message-mention">
        <div class="mention-header">
          <span class="mention-icon" style="background: ${fromColor}">${fromIcon}</span>
          <span class="mention-from">${fromName}</span>
          <span class="mention-arrow">@</span>
          <span class="mention-to">${toName}</span>
          ${msg.metadata?.responded ? '<span class="mention-responded">✅ 已响应</span>' : '<span class="mention-pending">⏳ 待响应</span>'}
        </div>
        <div class="mention-content">${this.renderMarkdown(msg.content)}</div>
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * 专家回复
   */
  renderExpertResponse(msg) {
    const expertName = msg.metadata?.expertName || this.EXPERT_NAMES[msg.from] || msg.from;
    const expertIcon = this.EXPERT_ICONS[msg.from] || '👤';
    const expertColor = this.EXPERT_COLORS[msg.from] || '#666';
    const respondingTo = msg.metadata?.respondingTo;

    return `
      <div class="message-expert-response">
        <div class="response-header">
          <span class="response-avatar" style="background: ${expertColor}">${expertIcon}</span>
          <div class="response-meta">
            <div class="response-name">${expertName}</div>
            ${respondingTo ? '<div class="response-reply">回复 @消息</div>' : ''}
          </div>
          ${msg.metadata?.confidence ? `<div class="response-confidence">置信度: ${Math.round(msg.metadata.confidence * 100)}%</div>` : ''}
        </div>
        <div class="response-content">${this.renderMarkdown(msg.content)}</div>
        ${msg.metadata?.needsCollaboration && msg.mentions?.length > 0 ? `
          <div class="response-collaboration">
            <span class="collaboration-label">🤝 协作邀请：</span>
            ${msg.mentions.map(m => `<span class="collaboration-mention">@${this.EXPERT_NAMES[m] || m}</span>`).join(' ')}
            ${msg.metadata?.collaborationReason ? `<div class="collaboration-reason">${this.escapeHtml(msg.metadata.collaborationReason)}</div>` : ''}
          </div>
        ` : ''}
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * 协作@消息
   */
  renderCollaborationMessage(msg) {
    const fromName = msg.metadata?.expertName || this.EXPERT_NAMES[msg.from] || msg.from;
    const fromIcon = this.EXPERT_ICONS[msg.from] || '👤';
    const toName = msg.metadata?.expertName || this.EXPERT_NAMES[msg.to] || msg.to;
    const fromColor = this.EXPERT_COLORS[msg.from] || '#666';

    return `
      <div class="message-collaboration">
        <div class="collab-header">
          <span class="collab-icon" style="background: ${fromColor}">${fromIcon}</span>
          <span class="collab-from">${fromName}</span>
          <span class="collab-action">邀请协作</span>
          <span class="collab-arrow">→</span>
          <span class="collab-to">${toName}</span>
          ${msg.metadata?.responded ? '<span class="collab-responded">✅ 已响应</span>' : '<span class="collab-pending">⏳ 待响应</span>'}
        </div>
        ${msg.metadata?.reason ? `<div class="collab-reason">${this.escapeHtml(msg.metadata.reason)}</div>` : ''}
        <div class="collab-content">${this.renderMarkdown(msg.content)}</div>
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * 总结消息
   */
  renderSummaryMessage(msg) {
    const summary = msg.metadata || {};

    return `
      <div class="message-summary">
        <div class="summary-header">
          <span class="summary-icon">📋</span>
          <span class="summary-title">讨论总结</span>
        </div>
        <div class="summary-content">${this.renderMarkdown(summary.content || msg.content)}</div>
        ${summary.keyPoints?.length > 0 ? `
          <div class="summary-keypoints">
            <div class="keypoints-title">🔑 关键要点：</div>
            <ul class="keypoints-list">
              ${summary.keyPoints.map(point => `<li>${this.renderMarkdown(point)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${summary.recommendations?.length > 0 ? `
          <div class="summary-recommendations">
            <div class="recommendations-title">💡 建议：</div>
            <ul class="recommendations-list">
              ${summary.recommendations.map(rec => `<li>${this.renderMarkdown(rec)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${summary.participants?.length > 0 ? `
          <div class="summary-participants">
            <span class="participants-label">👥 参与专家：</span>
            ${summary.participants.map(p => `<span class="participant-tag">${p}</span>`).join(' ')}
          </div>
        ` : ''}
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * 默认消息
   */
  renderDefaultMessage(msg) {
    return `
      <div class="message-default">
        <div class="default-type">${msg.type}</div>
        <div class="default-content">${this.renderMarkdown(msg.content)}</div>
        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
      </div>
    `;
  }

  /**
   * 渲染Markdown
   */
  renderMarkdown(text) {
    if (!text) return '';

    // 三层fallback：marked.js → 简单渲染 → 纯文本
    if (window.marked && window.DOMPurify) {
      try {
        return window.DOMPurify.sanitize(window.marked.parse(text));
      } catch (e) {
        console.warn('Markdown渲染失败，使用简单渲染');
      }
    }

    // 简单渲染
    return this.simpleMarkdown(text);
  }

  /**
   * 简单Markdown渲染（Fallback）
   */
  simpleMarkdown(text) {
    if (!text) return '';

    return text
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 粗体
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // 换行
      .replace(/\n/g, '<br>');
  }

  /**
   * 转义HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// 导出样式
const MESSAGE_STYLES = `
<style>
.message {
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-system {
  text-align: center;
  padding: 8px;
  color: #666;
  font-size: 13px;
}

.system-icon {
  display: inline-block;
  margin-right: 4px;
}

.message-topic {
  background: #f0f9ff;
  border-left: 4px solid #0ea5e9;
  padding: 16px;
  border-radius: 8px;
}

.topic-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #0ea5e9;
}

.topic-content {
  color: #333;
  line-height: 1.6;
}

.message-mention {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
  padding: 16px;
  border-radius: 8px;
}

.mention-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.mention-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.mention-responded {
  color: #10b981;
  font-size: 12px;
}

.mention-pending {
  color: #f59e0b;
  font-size: 12px;
}

.message-expert-response {
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-left: 40px;
}

.response-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.response-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
}

.response-name {
  font-weight: 600;
  font-size: 15px;
}

.response-confidence {
  margin-left: auto;
  font-size: 12px;
  color: #666;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 12px;
}

.response-collaboration {
  margin-top: 12px;
  padding: 10px;
  background: #ecfdf5;
  border-radius: 6px;
  font-size: 13px;
}

.collaboration-mention {
  display: inline-block;
  background: #10b981;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  margin: 2px;
}

.message-collaboration {
  background: #fce7f3;
  border-left: 4px solid #ec4899;
  padding: 16px;
  border-radius: 8px;
  margin-left: 40px;
}

.collab-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.message-summary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
}

.summary-keypoints,
.summary-recommendations {
  margin-top: 12px;
}

.keypoints-title,
.recommendations-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.keypoints-list,
.recommendations-list {
  padding-left: 20px;
}

.keypoints-list li,
.recommendations-list li {
  margin-bottom: 4px;
}

.summary-participants {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.participant-tag {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
}

.message-time {
  margin-top: 8px;
  font-size: 11px;
  color: #999;
}

pre {
  background: #1f2937;
  color: #f3f4f6;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 13px;
}

code {
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

pre code {
  background: transparent;
  padding: 0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
`;

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MessageRenderer, MESSAGE_STYLES };
}
