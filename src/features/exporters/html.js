/**
 * HTML 导出器
 * 
 * 生成独立的 HTML 文件，可在浏览器中查看
 * 
 * @module exporters/html
 * @version 1.0.0
 */

/**
 * 导出讨论为 HTML
 */
async function exportToHTML(discussion, options = {}) {
  const {
    includeMetadata = true,
    includeStats = true,
    theme = 'light'
  } = options;

  // 生成 HTML
  const html = generateHTML(discussion, { includeMetadata, includeStats, theme });

  return {
    data: Buffer.from(html, 'utf-8'),
    size: Buffer.byteLength(html, 'utf-8'),
    type: 'text/html'
  };
}

/**
 * 生成 HTML 内容
 */
function generateHTML(discussion, options) {
  const { includeMetadata, includeStats, theme } = options;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${discussion.topic || 'Discussion'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }

    .header h1 {
      font-size: 28px;
      color: #1e293b;
      margin-bottom: 10px;
    }

    .metadata {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 20px;
    }

    .metadata p {
      margin: 5px 0;
    }

    .section {
      margin-bottom: 30px;
    }

    .section h2 {
      font-size: 18px;
      color: #334155;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .stat-item {
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #1e293b;
    }

    .participants-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .participant-tag {
      background: #e0f2fe;
      color: #0369a1;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 14px;
    }

    .messages {
      margin-top: 20px;
    }

    .message {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #cbd5e1;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .message-role {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }

    .message-time {
      font-size: 11px;
      color: #94a3b8;
    }

    .message-content {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #94a3b8;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${discussion.topic || 'Discussion'}</h1>
      ${includeMetadata ? `
        <div class="metadata">
          <p><strong>ID:</strong> ${discussion.id || 'N/A'}</p>
          <p><strong>状态:</strong> ${getStatusLabel(discussion.status)}</p>
          <p><strong>创建时间:</strong> ${formatDate(discussion.createdAt)}</p>
          ${discussion.endedAt ? `<p><strong>结束时间:</strong> ${formatDate(discussion.endedAt)}</p>` : ''}
        </div>
      ` : ''}
    </div>

    ${includeStats && discussion.stats ? `
      <!-- Stats -->
      <div class="section">
        <h2>统计信息</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">消息总数</div>
            <div class="stat-value">${discussion.stats.messageCount || 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">参与 Agent</div>
            <div class="stat-value">${discussion.stats.participantCount || 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">讨论轮次</div>
            <div class="stat-value">${discussion.stats.roundCount || 0}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">持续时间</div>
            <div class="stat-value">${formatDuration(discussion.stats.duration)}</div>
          </div>
        </div>
      </div>
    ` : ''}

    ${discussion.participants && discussion.participants.length > 0 ? `
      <!-- Participants -->
      <div class="section">
        <h2>参与者</h2>
        <div class="participants-list">
          ${discussion.participants.map(p => `
            <span class="participant-tag">
              ${p.emoji || '🤖'} ${p.role || p.name}
            </span>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Messages -->
    <div class="section">
      <h2>讨论记录</h2>
      <div class="messages">
        ${discussion.messages && discussion.messages.length > 0 ? 
          discussion.messages.map(msg => `
            <div class="message">
              <div class="message-header">
                <div class="message-role">${msg.emoji || '🤖'} ${msg.role}</div>
                <div class="message-time">${formatDate(msg.timestamp)}</div>
              </div>
              <div class="message-content">${escapeHtml(msg.content || '')}</div>
            </div>
          `).join('') :
          '<p style="color: #94a3b8; text-align: center;">暂无消息</p>'
        }
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated by MAD v2.1.0 - Multi-Agent Discussion</p>
      <p>${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 获取状态标签
 */
function getStatusLabel(status) {
  const labels = {
    'initializing': '初始化中',
    'active': '进行中',
    'concluding': '总结中',
    'ended': '已结束'
  };
  return labels[status] || status;
}

/**
 * 格式化日期
 */
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('zh-CN');
}

/**
 * 格式化持续时间
 */
function formatDuration(ms) {
  if (!ms) return '未知';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * 转义 HTML
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
  exportToHTML
};
