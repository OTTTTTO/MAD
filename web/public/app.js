// MAD Web Viewer - 前端逻辑

let currentDiscussionId = null;
let autoRefreshInterval = null;
let agentStats = {};
let ws = null;
let wsConnected = false;
let currentTheme = 'dark';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initWebSocket();
  initTheme();
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
  
  // 搜索功能
  const searchInput = document.getElementById('searchInput');
  let searchTimeout = null;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        performSearch(query);
      } else {
        loadDiscussions();
      }
    }, 300);
  });
  
  document.getElementById('filterActive').addEventListener('change', () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
      performSearch(query);
    } else {
      loadDiscussions();
    }
  });
  
  document.getElementById('filterEnded').addEventListener('change', () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
      performSearch(query);
    } else {
      loadDiscussions();
    }
  });
  
  // 自动刷新（每 5 秒）
  startAutoRefresh();
}

/**
 * 执行搜索
 */
async function performSearch(query) {
  try {
    updateStatus('搜索中...');
    
    const status = [];
    if (document.getElementById('filterActive').checked) {
      status.push('active');
    }
    if (document.getElementById('filterEnded').checked) {
      status.push('ended');
    }
    
    const statusParam = status.length === 1 ? status[0] : null;
    
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&status=${statusParam || ''}`);
    const results = await response.json();
    
    displaySearchResults(results, query);
    updateStatus(`找到 ${results.messages.length} 条结果`);
    
  } catch (error) {
    console.error('搜索失败:', error);
    updateStatus('搜索失败');
  }
}

/**
 * 显示搜索结果
 */
function displaySearchResults(results, query) {
  const listContainer = document.getElementById('discussionList');
  
  if (results.messages.length === 0) {
    listContainer.innerHTML = '<div class="empty-state">未找到结果</div>';
    return;
  }
  
  listContainer.innerHTML = results.messages.slice(0, 20).map(msg => `
    <div class="discussion-item" onclick="selectDiscussion('${msg.discussionId}')">
      <div class="topic">${escapeHtml(msg.discussionTopic)}</div>
      <div class="search-result">
        <span class="agent-emoji">${msg.emoji}</span>
        <span class="content-preview">${formatContent(msg.highlight || msg.content.substring(0, 100))}</span>
      </div>
    </div>
  `).join('');
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
  if (wsConnected) {
    // WebSocket 已连接，不需要轮询
    return;
  }
  
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
 * 初始化主题
 */
function initTheme() {
  // 从 localStorage 读取保存的主题
  const savedTheme = localStorage.getItem('mad-theme') || 'dark';
  setTheme(savedTheme);
  
  // 主题切换按钮
  document.getElementById('themeToggle').addEventListener('click', () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
}

/**
 * 设置主题
 */
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mad-theme', theme);
  
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '🎨 浅色' : '🎨 深色';
  }
}

/**
 * 初始化 WebSocket
 */
function initWebSocket() {
  try {
    ws = new WebSocket('ws://localhost:18791');
    
    ws.onopen = () => {
      console.log('[WS] Connected');
      wsConnected = true;
      updateStatus('🟢 实时连接');
      
      // 停止轮询
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
      console.log('[WS] Disconnected');
      wsConnected = false;
      updateStatus('🔴 连接断开');
      
      // 重新开始轮询
      startAutoRefresh();
      
      // 5秒后尝试重连
      setTimeout(initWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  } catch (error) {
    console.error('[WS] Failed to connect:', error);
    // WebSocket 不可用，使用轮询
    startAutoRefresh();
  }
}

/**
 * 处理 WebSocket 消息
 */
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'connected':
      console.log('[WS]', data.message);
      break;
      
    case 'newMessage':
      // 新消息推送
      if (data.data.discussionId === currentDiscussionId) {
        // 添加新消息到当前视图
        appendMessage(data.data.message);
      }
      // 更新讨论列表
      loadDiscussions();
      break;
      
    case 'agentStatsUpdate':
      // Agent 统计更新
      agentStats[data.data.agentId] = data.data.stats;
      break;
      
    default:
      console.log('[WS] Unknown message type:', data.type);
  }
}

/**
 * 追加消息到视图
 */
function appendMessage(message) {
  const container = document.getElementById('messageContainer');
  
  // 移除空状态
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  // 获取参与者信息
  const participant = findParticipant(message.role);
  
  const stats = agentStats[message.role] || {};
  const karma = stats.karma || 0;
  const level = stats.level || '🌱 新手';
  
  const messageHtml = `
    <div class="message" style="animation: slideIn 0.3s ease-out">
      <div class="message-header">
        <span class="agent-emoji">${participant.emoji}</span>
        <span class="agent-name">${participant.role}</span>
        <span class="agent-karma">⭐ ${karma}</span>
        <span class="agent-level">${level}</span>
        <span class="message-time">${formatTime(message.timestamp)}</span>
      </div>
      <div class="message-content">${formatContent(message.content)}</div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', messageHtml);
  
  // 滚动到底部
  container.scrollTop = container.scrollHeight;
}

/**
 * 查找参与者
 */
function findParticipant(roleId) {
  // 这个函数需要从当前讨论的参与者中查找
  // 简化版本，返回默认值
  const roleEmojis = {
    'coordinator': '💡',
    'market_research': '📊',
    'requirement': '🎯',
    'technical': '🔧',
    'testing': '🧪',
    'documentation': '📝'
  };
  
  const roleNames = {
    'coordinator': '主协调员',
    'market_research': '市场调研',
    'requirement': '需求分析',
    'technical': '技术可行性',
    'testing': '测试',
    'documentation': '文档'
  };
  
  return {
    emoji: roleEmojis[roleId] || '🤖',
    role: roleNames[roleId] || roleId
  };
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
