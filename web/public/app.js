// MAD Web Viewer - 前端逻辑

let currentDiscussionId = null;
let autoRefreshInterval = null;
let agentStats = {};
let ws = null;
let wsConnected = false;
let currentTheme = 'dark';
let openTabs = new Map(); // <discussionId, {title, pinned}>
let activeTabId = null;
let highlights = new Map(); // <messageId, {color, annotation, highlightedBy, highlightedAt}>
let reasoningVisibility = new Map(); // <messageId, boolean> 控制思维链展开/折叠

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  initWebSocket();
  initTheme();
  initTabs();
  initKeyboard();
});

/**
 * 初始化应用
 */
function initApp() {
  // 加载讨论列表
  loadDiscussions();
  
  // 加载 Agent 统计
  loadAgentStats();
  
  // 加载高亮数据
  loadHighlights();
  
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
  
  // 统计按钮
  document.getElementById('statsBtn').addEventListener('click', () => {
    toggleStats();
  });
  
  // 搜索功能
  const searchInput = document.getElementById('searchInput');
  
  // 新建讨论按钮
  document.getElementById('newDiscussionBtn').addEventListener('click', () => {
    openTemplateModal();
  });
  
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
  const activeItem = document.querySelector(`[data-id="${discussionId}"]`);
  if (activeItem) activeItem.classList.add('active');
  
  // 加载消息
  loadMessages(discussionId);
  
  // 显示按钮
  document.getElementById('exportBtn').style.display = 'block';
  
  // 添加标签页
  const discussionTitle = document.getElementById('currentDiscussionTitle').textContent;
  if (discussionTitle && discussionTitle !== '选择一个讨论组') {
    addTab(discussionId, discussionTitle);
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
    
    // 显示按钮
    document.getElementById('exportBtn').style.display = 'block';
    document.getElementById('statsBtn').style.display = 'block';
    
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
      
      // 检查是否有高亮
      const highlight = highlights.get(msg.id);
      const highlightClass = highlight ? 'highlighted' : '';
      const highlightStyle = highlight ? `style="--highlight-color: ${getHighlightColor(highlight.color)};"` : '';
      
      // 检查是否有思维链
      const hasReasoning = msg.reasoning && msg.reasoning.length > 0;
      const reasoningData = hasReasoning ? `data-reasoning="${escapeHtml(JSON.stringify(msg.reasoning))}"` : '';
      
      return `
        <div class="message ${highlightClass}" data-message-id="${msg.id}" ${highlightStyle} ${reasoningData}>
          <div class="message-header">
            <span class="agent-emoji">${participant.emoji}</span>
            <span class="agent-name">${participant.role}</span>
            <span class="agent-karma">⭐ ${karma}</span>
            <span class="agent-level">${level}</span>
            <span class="message-time">${formatTime(msg.timestamp)}</span>
            <div class="message-actions">
              ${hasReasoning ? `<button class="action-btn reasoning-btn" onclick="toggleReasoning('${msg.id}')" title="查看思维链">🧠</button>` : ''}
              <button class="action-btn highlight-btn ${highlight ? 'active' : ''}" onclick="toggleHighlight('${msg.id}')" title="${highlight ? '取消高亮' : '高亮'}">🟨</button>
              <button class="action-btn copy-btn" onclick="copyMessage('${msg.id}')" title="复制">📋</button>
            </div>
          </div>
          <div class="message-content">${formatContent(msg.content)}</div>
          ${highlight && highlight.annotation ? `<div class="message-annotation"><span class="annotation-label">📝 标注：</span>${escapeHtml(highlight.annotation)}</div>` : ''}
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
 * 获取高亮颜色
 */
function getHighlightColor(colorName) {
  const colorMap = {
    'yellow': '#fef08a',
    'blue': '#93c5fd',
    'green': '#86efac',
    'pink': '#f9a8d4',
    'orange': '#fdba74'
  };
  return colorMap[colorName] || '#fef08a';
}

/**
 * 复制消息内容
 */
function copyMessage(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;
  
  const contentEl = messageEl.querySelector('.message-content');
  if (!contentEl) return;
  
  // 获取纯文本内容
  const text = contentEl.textContent;
  
  // 复制到剪贴板
  navigator.clipboard.writeText(text).then(() => {
    updateStatus('已复制到剪贴板');
  }).catch(err => {
    console.error('复制失败:', err);
    updateStatus('复制失败');
  });
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
  
  // 检查是否有高亮
  const highlight = highlights.get(message.id);
  const highlightClass = highlight ? 'highlighted' : '';
  const highlightStyle = highlight ? `style="--highlight-color: ${getHighlightColor(highlight.color)};"` : '';
  
  const messageHtml = `
    <div class="message ${highlightClass}" data-message-id="${message.id}" ${highlightStyle} style="animation: slideIn 0.3s ease-out">
      <div class="message-header">
        <span class="agent-emoji">${participant.emoji}</span>
        <span class="agent-name">${participant.role}</span>
        <span class="agent-karma">⭐ ${karma}</span>
        <span class="agent-level">${level}</span>
        <span class="message-time">${formatTime(message.timestamp)}</span>
        <div class="message-actions">
          <button class="action-btn highlight-btn" onclick="toggleHighlight('${message.id}')" title="高亮">🟨</button>
          <button class="action-btn copy-btn" onclick="copyMessage('${message.id}')" title="复制">📋</button>
        </div>
      </div>
      <div class="message-content">${formatContent(message.content)}</div>
      ${highlight && highlight.annotation ? `<div class="message-annotation"><span class="annotation-label">📝 标注：</span>${escapeHtml(highlight.annotation)}</div>` : ''}
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

/**
 * 初始化标签页
 */
function initTabs() {
  const closeAllBtn = document.getElementById('closeAllTabs');
  const pinBtn = document.getElementById('pinBtn');
  
  closeAllBtn.addEventListener('click', closeAllTabs);
  pinBtn.addEventListener('click', togglePin);
  
  // 从 localStorage 恢复标签页
  const savedTabs = localStorage.getItem('mad-tabs');
  if (savedTabs) {
    try {
      openTabs = new Map(JSON.parse(savedTabs));
      renderTabs();
    } catch (e) {
      console.error('Failed to restore tabs:', e);
    }
  }
}

/**
 * 添加标签页
 */
function addTab(discussionId, title) {
  if (!openTabs.has(discussionId)) {
    openTabs.set(discussionId, {
      title,
      pinned: false
    });
    saveTabs();
    renderTabs();
  }
  
  activateTab(discussionId);
}

/**
 * 激活标签页
 */
function activateTab(discussionId) {
  activeTabId = discussionId;
  renderTabs();
  saveTabs();
  
  // 显示/隐藏固定按钮
  const pinBtn = document.getElementById('pinBtn');
  const tab = openTabs.get(discussionId);
  if (pinBtn && tab) {
    pinBtn.style.display = 'block';
    pinBtn.textContent = tab.pinned ? '📍 取消固定' : '📌 固定';
  }
}

/**
 * 关闭标签页
 */
function closeTab(discussionId) {
  const tab = openTabs.get(discussionId);
  
  // 固定的标签页需要确认
  if (tab && tab.pinned && !confirm('这个标签页已固定，确定要关闭吗？')) {
    return;
  }
  
  openTabs.delete(discussionId);
  
  // 如果关闭的是当前标签页，切换到另一个
  if (activeTabId === discussionId) {
    const remainingIds = Array.from(openTabs.keys());
    if (remainingIds.length > 0) {
      activateTab(remainingIds[0]);
      loadMessages(remainingIds[0]);
    } else {
      activeTabId = null;
      currentDiscussionId = null;
      document.getElementById('pinBtn').style.display = 'none';
    }
  }
  
  saveTabs();
  renderTabs();
}

/**
 * 关闭所有标签页
 */
function closeAllTabs() {
  const pinnedCount = Array.from(openTabs.values()).filter(t => t.pinned).length;
  
  if (pinnedCount > 0 && !confirm(`有 ${pinnedCount} 个固定的标签页，确定要全部关闭吗？`)) {
    return;
  }
  
  openTabs.clear();
  activeTabId = null;
  currentDiscussionId = null;
  
  saveTabs();
  renderTabs();
  
  document.getElementById('pinBtn').style.display = 'none';
}

/**
 * 切换固定状态
 */
function togglePin() {
  if (!activeTabId) return;
  
  const tab = openTabs.get(activeTabId);
  if (tab) {
    tab.pinned = !tab.pinned;
    saveTabs();
    renderTabs();
    
    const pinBtn = document.getElementById('pinBtn');
    pinBtn.textContent = tab.pinned ? '📍 取消固定' : '📌 固定';
  }
}

/**
 * 切换统计面板
 */
async function toggleStats() {
  if (!currentDiscussionId) return;
  
  const panel = document.getElementById('statsPanel');
  const btn = document.getElementById('statsBtn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = '📊 隐藏统计';
    await loadStats(currentDiscussionId);
  } else {
    panel.style.display = 'none';
    btn.textContent = '📊 统计';
  }
}

/**
 * 加载统计数据
 */
async function loadStats(discussionId) {
  try {
    updateStatus('加载统计...');
    
    const response = await fetch(`/api/discussion/${discussionId}/stats`);
    const stats = await response.json();
    
    displayStats(stats);
    
    updateStatus('统计已加载');
  } catch (error) {
    console.error('加载统计失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 显示统计数据
 */
function displayStats(stats) {
  const container = document.getElementById('statsContent');
  
  const duration = formatDuration(stats.duration);
  const mostActive = stats.mostActiveAgent 
    ? `${stats.mostActiveAgent.emoji} ${stats.mostActiveAgent.role}`
    : '无';
  
  container.innerHTML = `
    <div class="stat-card">
      <h3>📊 总消息数</h3>
      <div class="value">${stats.messageCount}</div>
      <div class="subtext">来自 ${stats.participantCount} 个参与者</div>
    </div>
    
    <div class="stat-card">
      <h3>⏱️ 讨论时长</h3>
      <div class="value">${duration}</div>
      <div class="subtext">${new Date(stats.createdAt).toLocaleString('zh-CN')}</div>
    </div>
    
    <div class="stat-card">
      <h3>🏆 最活跃</h3>
      <div class="value" style="font-size: 1.5rem;">${mostActive}</div>
      <div class="subtext">${stats.mostActiveAgent ? stats.mostActiveAgent.messageCount + ' 条消息' : ''}</div>
    </div>
    
    <div class="stat-card">
      <h3>💬 Agent 参与</h3>
      <div class="agent-participation">
        ${Object.values(stats.agentStats).map(agent => `
          <div class="agent-bar">
            <span class="emoji">${agent.emoji}</span>
            <span class="name">${agent.role}</span>
            <div class="bar">
              <div class="fill" style="width: ${agent.percentage}%"></div>
            </div>
            <span class="percentage">${agent.percentage}%</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="stat-card" style="grid-column: 1 / -1;">
      <h3>🔑 关键词</h3>
      <div class="keyword-cloud">
        ${Object.entries(stats.keywordFrequency || {})
          .slice(0, 15)
          .map(([word, count]) => `
            <span class="keyword-tag">${word} (${count})</span>
          `).join('')}
      </div>
    </div>
    
    <div class="stat-card" style="grid-column: 1 / -1;">
      <h3>⭐ 质量评分</h3>
      <div id="qualityScoreContent">加载中...</div>
    </div>
  `;
  
  // 加载质量评分
  loadQualityScore();
}

/**
 * 加载质量评分
 */
async function loadQualityScore() {
  if (!currentDiscussionId) return;
  
  try {
    const response = await fetch(`/api/discussion/${currentDiscussionId}/quality`);
    const quality = await response.json();
    
    displayQualityScore(quality);
  } catch (error) {
    console.error('加载质量评分失败:', error);
    document.getElementById('qualityScoreContent').innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 显示质量评分
 */
function displayQualityScore(quality) {
  const container = document.getElementById('qualityScoreContent');
  if (!container) return;
  
  const totalScore = quality.total * 10; // 转换为 10 分制
  const ratingClass = getRatingClass(quality.rating);
  
  container.innerHTML = `
    <div class="quality-score-container">
      <div class="quality-total">
        <div class="quality-score ${ratingClass}">
          <div class="score-number">${totalScore.toFixed(1)}</div>
          <div class="score-max">/ 10</div>
        </div>
        <div class="quality-rating ${ratingClass}">${quality.rating}</div>
      </div>
      
      <div class="quality-dimensions">
        <div class="dimension">
          <div class="dimension-label">
            <span>💡 创新性</span>
            <span class="dimension-score">${(quality.innovation * 10).toFixed(1)}/10</span>
          </div>
          <div class="dimension-bar">
            <div class="dimension-fill" style="width: ${quality.innovation * 100}%"></div>
          </div>
        </div>
        
        <div class="dimension">
          <div class="dimension-label">
            <span>📋 完整性</span>
            <span class="dimension-score">${(quality.completeness * 10).toFixed(1)}/10</span>
          </div>
          <div class="dimension-bar">
            <div class="dimension-fill" style="width: ${quality.completeness * 100}%"></div>
          </div>
        </div>
        
        <div class="dimension">
          <div class="dimension-label">
            <span>🔧 可行性</span>
            <span class="dimension-score">${(quality.feasibility * 10).toFixed(1)}/10</span>
          </div>
          <div class="dimension-bar">
            <div class="dimension-fill" style="width: ${quality.feasibility * 100}%"></div>
          </div>
        </div>
        
        <div class="dimension">
          <div class="dimension-label">
            <span>💰 价值性</span>
            <span class="dimension-score">${(quality.value * 10).toFixed(1)}/10</span>
          </div>
          <div class="dimension-bar">
            <div class="dimension-fill" style="width: ${quality.value * 100}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 获取评级样式类
 */
function getRatingClass(rating) {
  switch (rating) {
    case '优秀': return 'rating-excellent';
    case '良好': return 'rating-good';
    case '一般': return 'rating-average';
    case '需改进': return 'rating-poor';
    default: return '';
  }
}

/**
 * 渲染标签页
 */
function renderTabs() {
  const tabsContainer = document.getElementById('discussionTabs');
  const tabList = document.getElementById('tabList');
  
  if (openTabs.size === 0) {
    tabsContainer.style.display = 'none';
    return;
  }
  
  tabsContainer.style.display = 'flex';
  
  // 排序：固定的在前
  const sortedIds = Array.from(openTabs.entries())
    .sort((a, b) => {
      if (a[1].pinned && !b[1].pinned) return -1;
      if (!a[1].pinned && b[1].pinned) return 1;
      return 0;
    })
    .map(([id]) => id);
  
  tabList.innerHTML = sortedIds.map(id => {
    const tab = openTabs.get(id);
    const isActive = id === activeTabId;
    
    return `
      <div class="tab ${isActive ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}" 
           data-id="${id}"
           onclick="switchToTab('${id}')">
        <span class="tab-title">${escapeHtml(tab.title)}</span>
        <span class="tab-close" onclick="event.stopPropagation(); closeTab('${id}')">✕</span>
      </div>
    `;
  }).join('');
}

/**
 * 切换到指定标签页
 */
function switchToTab(discussionId) {
  activateTab(discussionId);
  loadMessages(discussionId);
}

/**
 * 保存标签页到 localStorage
 */
function saveTabs() {
  localStorage.setItem('mad-tabs', JSON.stringify(Array.from(openTabs.entries())));
}

/**
 * 打开模板选择对话框
 */
async function openTemplateModal() {
  const modal = document.getElementById('templateModal');
  const templateList = document.getElementById('templateList');
  
  modal.style.display = 'flex';
  
  try {
    const response = await fetch('/api/templates');
    const templates = await response.json();
    
    templateList.innerHTML = templates.map(template => `
      <div class="template-card" onclick="selectTemplate('${template.id}')">
        <div class="icon">${template.icon}</div>
        <div class="name">${template.name}</div>
        <div class="description">${template.description}</div>
        <div class="participants">
          参与者: ${template.participants.length} 个
        </div>
      </div>
    `).join('');
  } catch (error) {
    templateList.innerHTML = '<div class="error">加载模板失败</div>';
  }
}

/**
 * 关闭模板对话框
 */
function closeTemplateModal() {
  document.getElementById('templateModal').style.display = 'none';
}

/**
 * 选择模板
 */
async function selectTemplate(templateId) {
  if (templateId === 'custom') {
    // 自定义讨论
    closeTemplateModal();
    const topic = prompt('请输入讨论主题：');
    if (topic) {
      // 这里需要调用创建讨论的 API
      // 暂时先不实现
      alert('自定义讨论功能开发中...');
    }
    return;
  }
  
  // 使用模板创建讨论
  const params = {};
  
  // 如果模板需要参数，可以在这里收集
  const context = prompt('请输入讨论背景（可选）：');
  if (context) {
    params.context = context;
  }
  
  try {
    const response = await fetch('/api/discussion/from-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        templateId,
        params
      })
    });
    
    const result = await response.json();
    
    closeTemplateModal();
    
    // 加载新创建的讨论
    loadDiscussions();
    selectDiscussion(result.discussionId);
    
    updateStatus('讨论已创建');
  } catch (error) {
    console.error('创建讨论失败:', error);
    updateStatus('创建失败');
  }
}

/**
 * 初始化键盘快捷键
 */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+Tab: 下一个标签页
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      const ids = Array.from(openTabs.keys());
      if (ids.length === 0) return;
      
      const currentIndex = ids.indexOf(activeTabId);
      const nextIndex = e.shiftKey 
        ? (currentIndex - 1 + ids.length) % ids.length
        : (currentIndex + 1) % ids.length;
      
      switchToTab(ids[nextIndex]);
    }
    
    // Ctrl+W: 关闭当前标签页
    if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      if (activeTabId) {
        closeTab(activeTabId);
      }
    }
  });
}

// 页面卸载时停止刷新
window.addEventListener('beforeunload', stopAutoRefresh);

// ==================== 高亮和标注功能 ====================

/**
 * 加载高亮数据
 */
function loadHighlights() {
  const saved = localStorage.getItem('mad-highlights');
  if (saved) {
    try {
      highlights = new Map(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load highlights:', e);
      highlights = new Map();
    }
  }
}

/**
 * 保存高亮数据
 */
function saveHighlights() {
  localStorage.setItem('mad-highlights', JSON.stringify(Array.from(highlights.entries())));
}

/**
 * 切换消息高亮
 */
function toggleHighlight(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;
  
  if (highlights.has(messageId)) {
    // 移除高亮
    highlights.delete(messageId);
    messageEl.classList.remove('highlighted');
    messageEl.style.removeProperty('--highlight-color');
    const annotationEl = messageEl.querySelector('.message-annotation');
    if (annotationEl) annotationEl.remove();
  } else {
    // 添加高亮
    showColorPicker(messageId);
  }
  
  saveHighlights();
}

/**
 * 显示颜色选择器
 */
function showColorPicker(messageId) {
  const existingPicker = document.getElementById('highlightColorPicker');
  if (existingPicker) existingPicker.remove();
  
  const picker = document.createElement('div');
  picker.id = 'highlightColorPicker';
  picker.className = 'color-picker';
  picker.innerHTML = `
    <div class="color-picker-title">选择高亮颜色</div>
    <div class="color-options">
      <button class="color-btn" data-color="yellow" style="background: #fef08a;" title="黄色"></button>
      <button class="color-btn" data-color="blue" style="background: #93c5fd;" title="蓝色"></button>
      <button class="color-btn" data-color="green" style="background: #86efac;" title="绿色"></button>
      <button class="color-btn" data-color="pink" style="background: #f9a8d4;" title="粉色"></button>
      <button class="color-btn" data-color="orange" style="background: #fdba74;" title="橙色"></button>
    </div>
    <div class="annotation-input">
      <input type="text" id="annotationText" placeholder="添加标注（可选）" maxlength="200" />
    </div>
    <div class="color-picker-actions">
      <button class="btn btn-sm" id="cancelHighlight">取消</button>
      <button class="btn btn-sm btn-primary" id="confirmHighlight">确定</button>
    </div>
  `;
  
  document.body.appendChild(picker);
  
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const rect = messageEl.getBoundingClientRect();
  picker.style.top = `${rect.bottom + 10}px`;
  picker.style.left = `${rect.left}px`;
  
  // 颜色选择事件
  picker.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
  
  // 确定高亮
  picker.querySelector('#confirmHighlight').addEventListener('click', () => {
    const selectedColor = picker.querySelector('.color-btn.selected');
    if (!selectedColor) {
      alert('请选择一个颜色');
      return;
    }
    
    const color = selectedColor.dataset.color;
    const annotation = document.getElementById('annotationText').value.trim();
    
    applyHighlight(messageId, color, annotation);
    picker.remove();
  });
  
  // 取消
  picker.querySelector('#cancelHighlight').addEventListener('click', () => {
    picker.remove();
  });
  
  // 默认选中第一个颜色
  picker.querySelector('.color-btn').classList.add('selected');
}

/**
 * 应用高亮
 */
function applyHighlight(messageId, color, annotation) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;
  
  const colorMap = {
    'yellow': '#fef08a',
    'blue': '#93c5fd',
    'green': '#86efac',
    'pink': '#f9a8d4',
    'orange': '#fdba74'
  };
  
  const bgColor = colorMap[color] || '#fef08a';
  
  // 保存高亮数据
  highlights.set(messageId, {
    color,
    annotation,
    highlightedBy: 'user',
    highlightedAt: new Date().toISOString()
  });
  
  // 应用样式
  messageEl.classList.add('highlighted');
  messageEl.style.setProperty('--highlight-color', bgColor);
  
  // 添加标注
  if (annotation) {
    let annotationEl = messageEl.querySelector('.message-annotation');
    if (!annotationEl) {
      annotationEl = document.createElement('div');
      annotationEl.className = 'message-annotation';
      messageEl.appendChild(annotationEl);
    }
    annotationEl.innerHTML = `<span class="annotation-label">📝 标注：</span>${escapeHtml(annotation)}`;
  } else {
    const annotationEl = messageEl.querySelector('.message-annotation');
    if (annotationEl) annotationEl.remove();
  }
  
  // 更新按钮状态
  const highlightBtn = messageEl.querySelector('.highlight-btn');
  if (highlightBtn) {
    highlightBtn.classList.add('active');
    highlightBtn.title = '取消高亮';
  }
  
  saveHighlights();
}

/**
 * 移除高亮
 */
function removeHighlight(messageId) {
  highlights.delete(messageId);
  
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageEl) {
    messageEl.classList.remove('highlighted');
    messageEl.style.removeProperty('--highlight-color');
    const annotationEl = messageEl.querySelector('.message-annotation');
    if (annotationEl) annotationEl.remove();
    
    const highlightBtn = messageEl.querySelector('.highlight-btn');
    if (highlightBtn) {
      highlightBtn.classList.remove('active');
      highlightBtn.title = '高亮';
    }
  }
  
  saveHighlights();
}

// ==================== 思维链可视化功能 ====================

/**
 * 切换思维链显示
 */
function toggleReasoning(messageId) {
  const isVisible = reasoningVisibility.get(messageId) || false;
  reasoningVisibility.set(messageId, !isVisible);
  
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return;
  
  let reasoningEl = messageEl.querySelector('.reasoning-chain');
  
  if (!isVisible) {
    // 展开思维链
    if (!reasoningEl) {
      // 从服务器获取思维链数据
      fetchReasoningData(messageId).then(reasoning => {
        if (reasoning && reasoning.length > 0) {
          reasoningEl = createReasoningChain(messageId, reasoning);
          messageEl.appendChild(reasoningEl);
        }
      });
    } else {
      reasoningEl.style.display = 'block';
    }
  } else {
    // 折叠思维链
    if (reasoningEl) {
      reasoningEl.style.display = 'none';
    }
  }
}

/**
 * 获取思维链数据
 */
async function fetchReasoningData(messageId) {
  // 这里从当前加载的消息数据中获取
  // 如果需要实时获取，可以调用 API
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageEl) return null;
  
  // 从 DOM 元素的数据属性中获取思维链
  const reasoningData = messageEl.dataset.reasoning;
  if (reasoningData) {
    try {
      return JSON.parse(reasoningData);
    } catch (e) {
      console.error('Failed to parse reasoning data:', e);
      return null;
    }
  }
  
  return null;
}

/**
 * 创建思维链可视化
 */
function createReasoningChain(messageId, reasoning) {
  const container = document.createElement('div');
  container.className = 'reasoning-chain';
  
  const header = document.createElement('div');
  header.className = 'reasoning-header';
  header.innerHTML = `
    <span class="reasoning-title">🧠 思维链</span>
    <button class="reasoning-close" onclick="toggleReasoning('${messageId}')">✕</button>
  `;
  container.appendChild(header);
  
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'reasoning-steps';
  
  // 创建步骤树
  let currentStep = null;
  let depth = 0;
  
  reasoning.forEach((step, index) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'reasoning-step';
    stepEl.dataset.step = step.step || index + 1;
    
    const confidenceStars = step.confidence 
      ? '⭐'.repeat(Math.round(step.confidence * 5)) 
      : '';
    
    stepEl.innerHTML = `
      <div class="step-number">${step.step || index + 1}</div>
      <div class="step-content">
        <div class="step-thought">${escapeHtml(step.thought)}</div>
        ${step.confidence ? `<div class="step-confidence">置信度: ${Math.round(step.confidence * 100)}% ${confidenceStars}</div>` : ''}
        ${step.timestamp ? `<div class="step-time">${formatTime(step.timestamp)}</div>` : ''}
      </div>
    `;
    
    stepsContainer.appendChild(stepEl);
  });
  
  container.appendChild(stepsContainer);
  
  return container;
}

/**
 * 显示思维链（从 API 获取）
 */
async function showReasoning(messageId) {
  try {
    const response = await fetch(`/api/message/${messageId}/reasoning`);
    const data = await response.json();
    
    if (data.reasoning && data.reasoning.length > 0) {
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
      if (!messageEl) return;
      
      let reasoningEl = messageEl.querySelector('.reasoning-chain');
      if (reasoningEl) {
        reasoningEl.remove();
      }
      
      reasoningEl = createReasoningChain(messageId, data.reasoning);
      messageEl.appendChild(reasoningEl);
      
      reasoningVisibility.set(messageId, true);
    }
  } catch (error) {
    console.error('Failed to load reasoning:', error);
  }
}
