// MAD Web Viewer - 前端逻辑

let currentDiscussionId = null;
let autoRefreshInterval = null;
let agentStats = {};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/**
 * 初始化应用
 */
function initApp() {
  // 加载讨论列表
  loadDiscussions();
  
  // 加载 Agent 统计
  loadAgentStats();
  
  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadDiscussions();
    loadAgentStats();
    if (currentDiscussionId) {
      loadMessages(currentDiscussionId);
    }
  });
  
  // 导出按钮
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportDiscussion('markdown');
  });
  
  // 自动刷新（每 5 秒）
  startAutoRefresh();
}

/**
 * 加载 Agent 统计
 */
async function loadAgentStats() {
  try {
    const response = await fetch('/api/agents');
    agentStats = await response.json();
  } catch (error) {
    console.error('加载 Agent 统计失败:', error);
  }
}

/**
 * 加载讨论列表
 */
async function loadDiscussions() {
  try {
    const response = await fetch('/api/discussions');
    const discussions = await response.json();
    
    const listContainer = document.getElementById('discussionList');
    
    if (discussions.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">暂无讨论</div>';
      updateStatus('无讨论组');
      return;
    }
    
    listContainer.innerHTML = discussions.map(d => `
      <div class="discussion-item ${d.id === currentDiscussionId ? 'active' : ''}" 
           data-id="${d.id}"
           onclick="selectDiscussion('${d.id}')">
        <div class="topic">${escapeHtml(d.topic)}</div>
        <div class="meta">
          <span class="status-badge status-${d.status}">
            ${d.status === 'active' ? '进行中' : '已结束'}
          </span>
          <span>💬 ${d.messageCount} 条消息</span>
          <span>⏱️ ${formatDuration(d.duration)}</span>
        </div>
      </div>
    `).join('');
    
    updateStats(`${discussions.length} 个讨论组`);
    
  } catch (error) {
    console.error('加载讨论列表失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 选择讨论
 */
function selectDiscussion(discussionId) {
  currentDiscussionId = discussionId;
  
  // 更新 UI
  document.querySelectorAll('.discussion-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-id="${discussionId}"]`).classList.add('active');
  
  // 加载消息
  loadMessages(discussionId);
  
  // 显示导出按钮
  document.getElementById('exportBtn').style.display = 'block';
}

/**
 * 导出讨论
 */
function exportDiscussion(format) {
  if (!currentDiscussionId) {
    alert('请先选择一个讨论组');
    return;
  }
  
  const url = `/api/discussion/${currentDiscussionId}/export/${format}`;
  window.open(url, '_blank');
}

// 导出按钮事件
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exportBtn').addEventListener('click', () => {
    exportDiscussion('markdown');
  });
});

/**
 * 加载消息
 */
async function loadMessages(discussionId) {
  try {
    updateStatus('加载中...');
    
    const response = await fetch(`/api/discussion/${discussionId}`);
    const data = await response.json();
    
    // 更新标题
    document.getElementById('currentDiscussionTitle').textContent = data.discussion.topic;
    
    const container = document.getElementById('messageContainer');
    
    if (!data.messages || data.messages.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无消息</div>';
      updateStatus('无消息');
      return;
    }
    
    // 获取参与者信息
    const participants = {};
    data.participants.forEach(p => {
      participants[p.id] = p;
    });
    
    container.innerHTML = data.messages.map(msg => {
      const participant = participants[msg.role] || { role: msg.role, emoji: '🤖' };
      const stats = agentStats[msg.role] || {};
      const karma = stats.karma || 0;
      const level = stats.level || '🌱 新手';
      
      return `
        <div class="message">
          <div class="message-header">
            <span class="agent-emoji">${participant.emoji}</span>
            <span class="agent-name">${participant.role}</span>
            <span class="agent-karma">⭐ ${karma}</span>
            <span class="agent-level">${level}</span>
            <span class="message-time">${formatTime(msg.timestamp)}</span>
          </div>
          <div class="message-content">${formatContent(msg.content)}</div>
        </div>
      `;
    }).join('');
    
    // 滚动到底部
    container.scrollTop = container.scrollHeight;
    
    updateStatus(`已加载 ${data.messages.length} 条消息`);
    
  } catch (error) {
    console.error('加载消息失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 格式化内容
 */
function formatContent(content) {
  // 转义 HTML
  let formatted = escapeHtml(content);
  
  // 简单的 markdown 处理
  // 代码块
  formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // 行内代码
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 粗体
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 斜体
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  return formatted;
}

/**
 * 转义 HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)} 分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)} 小时前`;
  } else {
    return date.toLocaleString('zh-CN');
  }
}

/**
 * 格式化持续时间
 */
function formatDuration(ms) {
  if (!ms || ms === 0) return '0秒';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  return `${hours}小时${minutes % 60}分钟`;
}

/**
 * 更新状态
 */
function updateStatus(text) {
  document.getElementById('status').textContent = text;
}

/**
 * 更新统计
 */
function updateStats(text) {
  document.getElementById('stats').textContent = text;
}

/**
 * 开始自动刷新
 */
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  autoRefreshInterval = setInterval(() => {
    loadDiscussions();
    if (currentDiscussionId) {
      loadMessages(currentDiscussionId);
    }
  }, 5000); // 每 5 秒刷新
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

/**
 * 导出讨论
 */
function exportDiscussion(format) {
  if (!currentDiscussionId) {
    alert('请先选择一个讨论组');
    return;
  }
  
  const url = `/api/discussion/${currentDiscussionId}/export/${format}`;
  window.open(url, '_blank');
}

// 页面卸载时停止刷新
window.addEventListener('beforeunload', stopAutoRefresh);
