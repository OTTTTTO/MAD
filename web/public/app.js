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

  // v2.5.4: 清空按钮
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!currentDiscussionId) {
      alert('请先选择一个讨论组');
      return;
    }

    // 确认对话框
    if (!confirm('确定要清空此讨论的所有消息吗？\n\n⚠️ 此操作不可恢复！\n\n讨论结构将保留，但所有消息将被删除。')) {
      return;
    }

    try {
      updateStatus('正在清空讨论...');

      const response = await fetch(`/api/discussion/${currentDiscussionId}/clear`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('清空失败');
      }

      const result = await response.json();

      // 重新加载消息
      await loadMessages(currentDiscussionId);
      await loadAgentStates(currentDiscussionId);

      updateStatus(`✅ 讨论已清空`);
    } catch (error) {
      console.error('清空讨论失败:', error);
      alert('清空失败：' + error.message);
      updateStatus('清空失败');
    }
  });

  // 统计按钮
  document.getElementById('statsBtn').addEventListener('click', () => {
    toggleStats();
  });
  
  // 推荐按钮
  document.getElementById('recommendBtn').addEventListener('click', () => {
    toggleRecommendations();
  });
  
  // 待办事项按钮
  document.getElementById('actionsBtn').addEventListener('click', () => {
    toggleActions();
  });
  
  // 相似讨论按钮
  document.getElementById('similarBtn').addEventListener('click', () => {
    toggleSimilarPanel();
  });
  
  // 搜索功能
  const searchInput = document.getElementById('searchInput');
  
  // 新建讨论按钮
  document.getElementById('newDiscussionBtn').addEventListener('click', () => {
    openTemplateModal();
  });

  // 模板市场按钮
  document.getElementById('marketBtn').addEventListener('click', () => {
    openMarketModal();
  });

  // Agent 管理按钮
  document.getElementById('agentManagerBtn').addEventListener('click', () => {
    openAgentManagerModal();
  });

  // 发言概率滑块
  document.getElementById('agentSpeakProbability').addEventListener('input', (e) => {
    document.getElementById('speakProbValue').textContent = e.target.value;
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
  document.getElementById('clearBtn').style.display = 'block';  // v2.5.4

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
    document.getElementById('clearBtn').style.display = 'block';  // v2.5.4
    document.getElementById('statsBtn').style.display = 'block';
    document.getElementById('recommendBtn').style.display = 'block';
    document.getElementById('actionsBtn').style.display = 'block';
    document.getElementById('similarBtn').style.display = 'block';
    document.getElementById('pinBtn').style.display = 'block';
    
    // v2.5.3: 加载 Agent 状态
    await loadAgentStates(discussionId);
    
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
 * v2.5.3: 加载 Agent 状态
 */
async function loadAgentStates(discussionId) {
  try {
    const response = await fetch(`/api/discussion/${discussionId}/agent-states`);
    if (!response.ok) {
      console.warn('Agent 状态 API 不可用');
      return;
    }
    
    const states = await response.json();
    
    const statesBar = document.getElementById('agentStatesBar');
    const statesContent = document.getElementById('agentStatesContent');
    
    if (!states || Object.keys(states).length === 0) {
      statesBar.style.display = 'none';
      return;
    }
    
    statesBar.style.display = 'block';
    
    // 获取参与者信息
    const discussionResponse = await fetch(`/api/discussion/${discussionId}`);
    const discussionData = await discussionResponse.json();
    const participants = {};
    discussionData.participants.forEach(p => {
      participants[p.id] = p;
    });
    
    statesContent.innerHTML = Object.entries(states).map(([agentId, state]) => {
      const participant = participants[agentId] || { role: agentId, emoji: '🤖' };
      const statusText = {
        'thinking': '💭 思考中',
        'speaking': '🗣️ 发言中',
        'waiting': '⏸️ 等待中'
      }[state.status] || state.status;
      
      return `
        <div class="agent-state-item ${state.status}">
          <span class="agent-state-emoji">${participant.emoji}</span>
          <span class="agent-state-name">${participant.role}</span>
          <span class="agent-state-status">${statusText}</span>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('加载 Agent 状态失败:', error);
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
 * 切换推荐面板
 */
async function toggleRecommendations() {
  if (!currentDiscussionId) return;
  
  const panel = document.getElementById('recommendPanel');
  const btn = document.getElementById('recommendBtn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = '🤖 隐藏推荐';
    await loadRecommendations(currentDiscussionId);
  } else {
    panel.style.display = 'none';
    btn.textContent = '🤖 推荐';
  }
}

/**
 * 加载推荐
 */
async function loadRecommendations(discussionId) {
  try {
    updateStatus('加载推荐...');
    
    const response = await fetch(`/api/discussion/${discussionId}/recommendations`);
    const recommendations = await response.json();
    
    displayRecommendations(recommendations);
    
    updateStatus('推荐已加载');
  } catch (error) {
    console.error('加载推荐失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 显示推荐
 */
function displayRecommendations(recommendations) {
  const container = document.getElementById('recommendContent');
  
  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无推荐</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="recommend-header">
      <h3>🤖 智能推荐</h3>
      <p class="subtitle">基于讨论主题为您推荐合适的 Agent</p>
    </div>
    <div class="recommend-list">
      ${recommendations.map(rec => `
        <div class="recommend-card">
          <div class="recommend-info">
            <div class="recommend-name">${rec.agentName}</div>
            <div class="recommend-score">
              <span class="score-value">${Math.round(rec.score * 100)}%</span>
              <span class="score-label">匹配度</span>
            </div>
          </div>
          <div class="recommend-reason">${escapeHtml(rec.reason)}</div>
          <button class="btn btn-sm recommend-add" onclick="addRecommendedAgent('${rec.agentId}')">
            添加到讨论
          </button>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 添加推荐的 Agent
 */
async function addRecommendedAgent(agentId) {
  // 这个功能需要后端支持
  // 暂时显示提示
  updateStatus('添加 Agent 功能开发中...');
  alert('添加 Agent 到讨论的功能正在开发中');
}

// ==================== 待办事项功能 ====================

/**
 * 切换待办事项面板
 */
async function toggleActions() {
  if (!currentDiscussionId) return;
  
  const panel = document.getElementById('actionsPanel');
  const btn = document.getElementById('actionsBtn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = '✅ 隐藏待办';
    await loadActions(currentDiscussionId);
  } else {
    panel.style.display = 'none';
    btn.textContent = '✅ 待办';
  }
}

/**
 * 加载待办事项
 */
async function loadActions(discussionId) {
  try {
    updateStatus('加载待办事项...');
    
    const response = await fetch(`/api/discussion/${discussionId}/actions`);
    const actions = await response.json();
    
    displayActions(actions);
    
    updateStatus(`已加载 ${actions.length} 个待办事项`);
  } catch (error) {
    console.error('加载待办事项失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 显示待办事项
 */
function displayActions(actions) {
  const container = document.getElementById('actionsContent');
  
  if (!actions || actions.length === 0) {
    container.innerHTML = '<div class="empty-state">未找到待办事项</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="actions-header">
      <h3>📝 待办事项 (${actions.length})</h3>
      <div class="actions-actions">
        <button class="btn btn-sm" onclick="exportActions()">导出</button>
        <button class="btn btn-sm" onclick="markAllComplete()">全部完成</button>
      </div>
    </div>
    <div class="actions-list">
      ${actions.map(action => `
        <div class="action-item ${action.completed ? 'completed' : ''}" data-action-id="${action.id}">
          <div class="action-checkbox">
            <input type="checkbox" ${action.completed ? 'checked' : ''} onchange="toggleActionComplete('${action.id}')">
          </div>
          <div class="action-content">
            <div class="action-text">${escapeHtml(action.task)}</div>
            <div class="action-meta">
              ${action.assignee ? `<span class="action-assignee">👤 ${escapeHtml(action.assignee)}</span>` : ''}
              ${action.deadline ? `<span class="action-deadline">📅 ${escapeHtml(action.deadline)}</span>` : ''}
              <span class="action-priority priority-${action.priority}">${getPriorityLabel(action.priority)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 获取优先级标签
 */
function getPriorityLabel(priority) {
  const labels = {
    'high': '🔴 高',
    'medium': '🟡 中',
    'low': '🟢 低'
  };
  return labels[priority] || '🟡 中';
}

/**
 * 切换相似讨论面板
 */
async function toggleSimilarPanel() {
  if (!currentDiscussionId) return;
  
  const panel = document.getElementById('similarPanel');
  const btn = document.getElementById('similarBtn');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    btn.textContent = '🔗 隐藏相似';
    await loadSimilarDiscussions(currentDiscussionId);
  } else {
    panel.style.display = 'none';
    btn.textContent = '🔗 相似';
  }
}

/**
 * 加载相似讨论
 */
async function loadSimilarDiscussions(discussionId) {
  try {
    updateStatus('查找相似讨论...');
    
    const threshold = 0.1; // 相似度阈值
    const limit = 10; // 最多显示 10 个
    
    const response = await fetch(`/api/discussion/${discussionId}/similar?threshold=${threshold}&limit=${limit}`);
    const similar = await response.json();
    
    displaySimilarDiscussions(similar);
    
    updateStatus(`找到 ${similar.length} 个相似讨论`);
  } catch (error) {
    console.error('加载相似讨论失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 显示相似讨论
 */
function displaySimilarDiscussions(similar) {
  const container = document.getElementById('similarContent');
  
  if (!similar || similar.length === 0) {
    container.innerHTML = '<div class="empty-state">未找到相似讨论</div>';
    return;
  }
  
  container.innerHTML = `
    <div class="similar-list">
      ${similar.map(item => `
        <div class="similar-item" style="border-left: 3px solid ${getSimilarityColor(item.similarity)}">
          <div class="similar-header">
            <div class="similar-title">${escapeHtml(item.topic)}</div>
            <div class="similar-score">${Math.round(item.similarity * 100)}%</div>
          </div>
          <div class="similar-meta">
            <span class="similar-messages">💬 ${item.messageCount} 条消息</span>
            <span class="similar-status">${getStatusLabel(item.status)}</span>
          </div>
          ${item.commonKeywords && item.commonKeywords.length > 0 ? `
            <div class="similar-keywords">
              ${item.commonKeywords.slice(0, 5).map(kw => `<span class="keyword-tag">${escapeHtml(kw)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="similar-actions">
            <button class="btn btn-sm" onclick="switchToDiscussion('${item.discussionId}')">查看</button>
            <button class="btn btn-sm" onclick="mergeDiscussion('${item.discussionId}')">合并</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 获取相似度颜色
 */
function getSimilarityColor(similarity) {
  if (similarity >= 0.7) return '#10b981'; // 绿色
  if (similarity >= 0.5) return '#3b82f6'; // 蓝色
  if (similarity >= 0.3) return '#f59e0b'; // 橙色
  return '#6b7280'; // 灰色
}

/**
 * 合并讨论
 */
async function mergeDiscussion(sourceId) {
  if (!currentDiscussionId) return;
  
  if (!confirm(`确定要将讨论 ${sourceId} 合并到当前讨论吗？`)) {
    return;
  }
  
  try {
    updateStatus('合并讨论中...');
    
    const response = await fetch(`/api/discussion/${currentDiscussionId}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sourceIds: [sourceId]
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      updateStatus(`合并成功：${result.mergedMessagesCount} 条消息`);
      // 重新加载讨论
      await loadMessages(currentDiscussionId);
      // 重新加载相似讨论
      await loadSimilarDiscussions(currentDiscussionId);
      // 刷新讨论列表
      loadDiscussions();
    } else {
      updateStatus(`合并失败：${result.error}`);
    }
  } catch (error) {
    console.error('合并讨论失败:', error);
    updateStatus('合并失败');
  }
}

/**
 * 切换待办事项完成状态
 */
function toggleActionComplete(actionId) {
  const actionEl = document.querySelector(`[data-action-id="${actionId}"]`);
  if (actionEl) {
    actionEl.classList.toggle('completed');
    updateStatus('状态已更新');
  }
}

/**
 * 标记全部完成
 */
function markAllComplete() {
  const checkboxes = document.querySelectorAll('.action-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = true;
    const actionEl = cb.closest('.action-item');
    if (actionEl) {
      actionEl.classList.add('completed');
    }
  });
  updateStatus('已标记全部完成');
}

/**
 * 导出待办事项
 */
function exportActions() {
  const actions = document.querySelectorAll('.action-item');
  const actionList = [];
  
  actions.forEach(actionEl => {
    const text = actionEl.querySelector('.action-text').textContent;
    const assignee = actionEl.querySelector('.action-assignee')?.textContent || '';
    const deadline = actionEl.querySelector('.action-deadline')?.textContent || '';
    const priority = actionEl.querySelector('.action-priority')?.textContent || '';
    const completed = actionEl.classList.contains('completed');
    
    actionList.push({
      task: text,
      assignee,
      deadline,
      priority,
      completed
    });
  });
  
  // 导出为文本
  const text = actionList.map((a, i) => 
    `${i + 1}. ${a.task}\n   ${a.assignee} ${a.deadline} ${a.priority} ${a.completed ? '✅' : '☐'}`
  ).join('\n\n');
  
  // 下载文件
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `actions-${currentDiscussionId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
  updateStatus('已导出待办事项');
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

/**
 * 打开模板市场
 */
async function openMarketModal() {
  const modal = document.getElementById('marketModal');
  modal.style.display = 'flex';

  await loadMarket();
}

/**
 * 关闭模板市场
 */
function closeMarketModal() {
  document.getElementById('marketModal').style.display = 'none';
}

/**
 * 加载模板市场
 */
async function loadMarket() {
  try {
    updateStatus('加载模板市场...');

    const response = await fetch('/api/market');
    const market = await response.json();

    displayMarketStats(market.stats);
    displayMarketTemplates(market.templates);

    updateStatus(`已加载 ${market.templates.length} 个模板`);
  } catch (error) {
    console.error('加载模板市场失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 显示市场统计
 */
function displayMarketStats(stats) {
  const container = document.getElementById('marketStats');

  if (!stats) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="market-stats-grid">
      <div class="stat-item">
        <div class="stat-value">${stats.totalTemplates || 0}</div>
        <div class="stat-label">模板总数</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.totalDownloads || 0}</div>
        <div class="stat-label">总下载量</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.averageRating || 0}</div>
        <div class="stat-label">平均评分</div>
      </div>
    </div>
  `;
}

/**
 * 显示市场模板列表
 */
function displayMarketTemplates(templates) {
  const container = document.getElementById('marketList');

  if (!templates || templates.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无模板</div>';
    return;
  }

  container.innerHTML = `
    <div class="market-grid">
      ${templates.map(template => `
        <div class="market-item" data-template-id="${template.id}">
          <div class="market-item-header">
            <div class="market-item-icon">${template.icon || '📦'}</div>
            <div class="market-item-title">${escapeHtml(template.name)}</div>
          </div>
          <div class="market-item-desc">${escapeHtml(template.description)}</div>
          <div class="market-item-meta">
            <span class="market-item-category">${template.category || '未分类'}</span>
            <span class="market-item-rating">⭐ ${template.rating || 0}</span>
            <span class="market-item-downloads">📥 ${template.downloads || 0}</span>
          </div>
          <div class="market-item-tags">
            ${(template.tags || []).slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="market-item-actions">
            <button class="btn btn-sm btn-primary" onclick="useMarketTemplate('${template.id}')">使用模板</button>
            <button class="btn btn-sm" onclick="viewMarketTemplate('${template.id}')">详情</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 使用市场模板
 */
async function useMarketTemplate(templateId) {
  try {
    updateStatus('创建讨论...');

    const response = await fetch('/api/discussion/from-market', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        templateId,
        params: {}
      })
    });

    const result = await response.json();

    if (response.ok) {
      updateStatus('讨论创建成功');
      closeMarketModal();

      // 刷新讨论列表并跳转
      await loadDiscussions();
      selectDiscussion(result.discussionId);
    } else {
      updateStatus(`创建失败：${result.error}`);
    }
  } catch (error) {
    console.error('使用模板失败:', error);
    updateStatus('创建失败');
  }
}

/**
 * 查看市场模板详情（简化版）
 */
function viewMarketTemplate(templateId) {
  // 简化版：直接使用模板
  useMarketTemplate(templateId);
}

/**
 * 打开 Agent 管理器
 */
async function openAgentManagerModal() {
  const modal = document.getElementById('agentManagerModal');
  modal.style.display = 'flex';

  await loadCustomAgents();
}

/**
 * 关闭 Agent 管理器
 */
function closeAgentManagerModal() {
  document.getElementById('agentManagerModal').style.display = 'none';
}

/**
 * 加载自定义 Agent 列表
 */
async function loadCustomAgents() {
  try {
    updateStatus('加载 Agent...');

    const response = await fetch('/api/agents/custom');
    const data = await response.json();

    displayCustomAgents(data.agents);

    updateStatus(`已加载 ${data.agents.length} 个自定义 Agent`);
  } catch (error) {
    console.error('加载 Agent 失败:', error);
    updateStatus('加载失败');
  }
}

/**
 * 显示自定义 Agent 列表
 */
function displayCustomAgents(agents) {
  const container = document.getElementById('agentList');

  if (!agents || agents.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无自定义 Agent<br><button class="btn btn-primary" onclick="openCreateAgentModal()">创建第一个 Agent</button></div>';
    return;
  }

  container.innerHTML = `
    <div class="agent-grid">
      ${agents.map(agent => `
        <div class="agent-card ${agent.enabled ? '' : 'disabled'}">
          <div class="agent-card-header">
            <div class="agent-icon">${agent.emoji || '🤖'}</div>
            <div class="agent-info">
              <div class="agent-name">${escapeHtml(agent.name)}</div>
              <div class="agent-id">${escapeHtml(agent.id)}</div>
            </div>
          </div>
          <div class="agent-card-body">
            <div class="agent-prompt-preview">${escapeHtml(agent.systemPrompt.substring(0, 100))}...</div>
            <div class="agent-tags">
              ${(agent.expertise || []).slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
          <div class="agent-card-footer">
            <div class="agent-meta">
              <span>发言: ${Math.round((agent.speakProbability || 0.5) * 100)}%</span>
              <span>作者: ${escapeHtml(agent.author || 'Unknown')}</span>
            </div>
            <div class="agent-actions">
              <button class="btn btn-sm" onclick="testAgent('${agent.id}')">测试</button>
              <button class="btn btn-sm" onclick="editAgent('${agent.id}')">编辑</button>
              <button class="btn btn-sm btn-danger" onclick="deleteAgent('${agent.id}')">删除</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * 打开创建 Agent 对话框
 */
function openCreateAgentModal() {
  document.getElementById('createAgentModal').style.display = 'flex';
  // 重置表单
  document.getElementById('createAgentForm').reset();
  document.getElementById('speakProbValue').textContent = '0.5';
}

/**
 * 关闭创建 Agent 对话框
 */
function closeCreateAgentModal() {
  document.getElementById('createAgentModal').style.display = 'none';
}

/**
 * 提交创建 Agent
 */
async function submitCreateAgent(event) {
  event.preventDefault();

  const name = document.getElementById('agentName').value.trim();
  const emoji = document.getElementById('agentEmoji').value.trim() || '🤖';
  const systemPrompt = document.getElementById('agentSystemPrompt').value.trim();
  const triggerKeywords = document.getElementById('agentTriggerKeywords').value.split(',').map(k => k.trim()).filter(k => k);
  const expertise = document.getElementById('agentExpertise').value.split(',').map(k => k.trim()).filter(k => k);
  const speakProbability = parseFloat(document.getElementById('agentSpeakProbability').value);

  try {
    updateStatus('创建 Agent...');

    const response = await fetch('/api/agents/custom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        emoji,
        systemPrompt,
        triggerKeywords,
        expertise,
        speakProbability,
        author: 'User'
      })
    });

    const agent = await response.json();

    if (response.ok) {
      updateStatus(`Agent "${agent.name}" 创建成功`);
      closeCreateAgentModal();
      await loadCustomAgents();
    } else {
      updateStatus(`创建失败：${agent.error}`);
    }
  } catch (error) {
    console.error('创建 Agent 失败:', error);
    updateStatus('创建失败');
  }
}

/**
 * 测试 Agent
 */
async function testAgent(agentId) {
  try {
    updateStatus('测试 Agent...');

    const response = await fetch(`/api/agents/custom/${agentId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testMessage: '请简单介绍一下你自己。'
      })
    });

    const result = await response.json();

    if (response.ok) {
      alert(`Agent: ${result.agentName}\n\n测试消息: ${result.testMessage}\n\n回复: ${result.response || '无回复'}`);
      updateStatus('测试完成');
    } else {
      updateStatus(`测试失败：${result.error}`);
    }
  } catch (error) {
    console.error('测试 Agent 失败:', error);
    updateStatus('测试失败');
  }
}

/**
 * 编辑 Agent（简化版：仅提示）
 */
function editAgent(agentId) {
  alert('编辑功能开发中...\n\nAgent ID: ' + agentId + '\n\n提示：您可以通过删除并重新创建来修改 Agent。');
}

/**
 * 删除 Agent
 */
async function deleteAgent(agentId) {
  if (!confirm('确定要删除这个 Agent 吗？')) {
    return;
  }

  try {
    updateStatus('删除 Agent...');

    const response = await fetch(`/api/agents/custom/${agentId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      updateStatus('Agent 删除成功');
      await loadCustomAgents();
    } else {
      updateStatus(`删除失败：${result.error}`);
    }
  } catch (error) {
    console.error('删除 Agent 失败:', error);
    updateStatus('删除失败');
  }
}

// ===== 标签系统功能 =====

/**
 * 加载所有标签
 */
async function loadTags() {
  try {
    const response = await fetch('/api/tags');
    const tags = await response.json();

    // 更新标签过滤器
    updateTagFilters(tags);

    return tags;
  } catch (error) {
    console.error('加载标签失败:', error);
    return [];
  }
}

/**
 * 更新标签过滤器
 */
function updateTagFilters(tags) {
  const tagFilterList = document.getElementById('tagFilterList');
  if (!tagFilterList) return;

  tagFilterList.innerHTML = tags.map(tag => `
    <label class="tag-filter-item">
      <input type="checkbox" value="${tag.id}" data-tag-name="${tag.name}">
      <span class="tag-badge" style="background: ${tag.color};">${tag.icon} ${tag.name}</span>
    </label>
  `).join('');

  // 添加事件监听
  tagFilterList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      filterDiscussionsByTags();
    });
  });
}

/**
 * 根据标签过滤讨论
 */
function filterDiscussionsByTags() {
  const checkedTags = Array.from(document.querySelectorAll('#tagFilterList input[type="checkbox"]:checked'))
    .map(cb => cb.value);

  // 重新加载讨论列表，应用标签过滤
  loadDiscussions(checkedTags);
}

/**
 * 清除标签过滤
 */
document.addEventListener('DOMContentLoaded', () => {
  const clearTagFilters = document.getElementById('clearTagFilters');
  if (clearTagFilters) {
    clearTagFilters.addEventListener('click', () => {
      document.querySelectorAll('#tagFilterList input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
      });
      filterDiscussionsByTags();
    });
  }

  // 标签管理按钮
  const tagsManageBtn = document.getElementById('tagsManageBtn');
  if (tagsManageBtn) {
    tagsManageBtn.addEventListener('click', () => {
      openTagsManageModal();
    });
  }

  // 收藏夹管理按钮
  const favoritesManageBtn = document.getElementById('favoritesManageBtn');
  if (favoritesManageBtn) {
    favoritesManageBtn.addEventListener('click', () => {
      openFavoritesManageModal();
    });
  }

  // 标签按钮
  const tagsBtn = document.getElementById('tagsBtn');
  if (tagsBtn) {
    tagsBtn.addEventListener('click', () => {
      toggleTagsPanel();
    });
  }

  // 收藏按钮
  const favoriteBtn = document.getElementById('favoriteBtn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', () => {
      toggleFavoritesPanel();
    });
  }
});

/**
 * 打开标签管理对话框
 */
async function openTagsManageModal() {
  const modal = document.getElementById('tagsManageModal');
  modal.style.display = 'flex';

  await loadTagList();
}

/**
 * 关闭标签管理对话框
 */
function closeTagsManageModal() {
  document.getElementById('tagsManageModal').style.display = 'none';
}

/**
 * 加载标签列表
 */
async function loadTagList() {
  const tagList = document.getElementById('tagList');
  tagList.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const response = await fetch('/api/tags');
    const tags = await response.json();

    tagList.innerHTML = tags.length === 0
      ? '<div class="empty-state">暂无标签</div>'
      : tags.map(tag => `
        <div class="tag-item">
          <div class="tag-info">
            <span class="tag-badge" style="background: ${tag.color};">${tag.icon} ${tag.name}</span>
            <span class="tag-usage">使用 ${tag.usageCount} 次</span>
          </div>
          <div class="tag-actions">
            <button class="btn btn-xs" onclick="deleteTag('${tag.id}')">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    console.error('加载标签列表失败:', error);
    tagList.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 打开创建标签对话框
 */
function openCreateTagModal() {
  document.getElementById('createTagModal').style.display = 'flex';
}

/**
 * 关闭创建标签对话框
 */
function closeCreateTagModal() {
  document.getElementById('createTagModal').style.display = 'none';
  document.getElementById('createTagForm').reset();
}

/**
 * 设置标签颜色
 */
function setTagColor(color) {
  document.getElementById('tagColor').value = color;
}

/**
 * 提交创建标签
 */
async function submitCreateTag(event) {
  event.preventDefault();

  const name = document.getElementById('tagName').value.trim();
  const color = document.getElementById('tagColor').value;
  const icon = document.getElementById('tagIcon').value.trim() || '🏷️';

  try {
    updateStatus('创建标签...');

    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, icon })
    });

    const tag = await response.json();

    if (response.ok) {
      updateStatus(`标签 "${tag.name}" 创建成功`);
      closeCreateTagModal();
      await loadTagList();
      await loadTags(); // 更新过滤器
    } else {
      updateStatus(`创建失败：${tag.error}`);
    }
  } catch (error) {
    console.error('创建标签失败:', error);
    updateStatus('创建失败');
  }
}

/**
 * 删除标签
 */
async function deleteTag(tagId) {
  if (!confirm('确定要删除这个标签吗？')) return;

  try {
    updateStatus('删除标签...');

    const response = await fetch(`/api/tags/${tagId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      updateStatus('标签删除成功');
      await loadTagList();
      await loadTags(); // 更新过滤器
    } else {
      updateStatus(`删除失败：${result.error}`);
    }
  } catch (error) {
    console.error('删除标签失败:', error);
    updateStatus('删除失败');
  }
}

/**
 * 切换标签面板
 */
async function toggleTagsPanel() {
  const panel = document.getElementById('tagsPanel');
  const isVisible = panel.style.display !== 'none';

  if (isVisible) {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'block';
    await loadTagsForDiscussion();
  }
}

/**
 * 为当前讨论加载标签
 */
async function loadTagsForDiscussion() {
  if (!currentDiscussionId) return;

  const tagsContent = document.getElementById('tagsContent');
  tagsContent.innerHTML = '<div class="loading">加载中...</div>';

  try {
    // 获取建议标签
    const response = await fetch(`/api/discussion/${currentDiscussionId}/suggest-tags`);
    const suggestions = await response.json();

    // 获取所有标签
    const allTagsResponse = await fetch('/api/tags');
    const allTags = await allTagsResponse.json();

    tagsContent.innerHTML = `
      <div class="tags-suggestions">
        <h4>💡 建议标签</h4>
        <div class="suggested-tags">
          ${suggestions.length === 0
            ? '<p class="text-muted">暂无建议标签</p>'
            : suggestions.map(tag => `
              <span class="tag-badge" style="background: ${tag.color};">${tag.icon} ${tag.name}</span>
            `).join('')}
        </div>
      </div>
      <div class="tags-all">
        <h4>🏷️ 所有标签</h4>
        <div class="all-tags">
          ${allTags.map(tag => `
            <span class="tag-badge clickable" style="background: ${tag.color};" onclick="applyTagToDiscussion('${tag.id}')">${tag.icon} ${tag.name}</span>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('加载标签失败:', error);
    tagsContent.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 应用标签到讨论（简化版：仅提示）
 */
function applyTagToDiscussion(tagId) {
  alert('标签应用功能开发中...\n\n提示：您可以通过编辑讨论元数据来添加标签。');
}

// ===== 收藏夹功能 =====

/**
 * 打开收藏夹管理对话框
 */
async function openFavoritesManageModal() {
  const modal = document.getElementById('favoritesManageModal');
  modal.style.display = 'flex';

  await loadFavoriteList();
}

/**
 * 关闭收藏夹管理对话框
 */
function closeFavoritesManageModal() {
  document.getElementById('favoritesManageModal').style.display = 'none';
}

/**
 * 加载收藏夹列表
 */
async function loadFavoriteList() {
  const favoriteList = document.getElementById('favoriteList');
  favoriteList.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const response = await fetch('/api/favorites');
    const favorites = await response.json();

    favoriteList.innerHTML = favorites.length === 0
      ? '<div class="empty-state">暂无收藏夹</div>'
      : favorites.map(fav => `
        <div class="favorite-item">
          <div class="favorite-info">
            <span class="favorite-icon">${fav.icon}</span>
            <div>
              <div class="favorite-name">${fav.name}</div>
              <div class="favorite-description">${fav.description || '无描述'}</div>
              <div class="favorite-count">${fav.discussions.length} 个讨论</div>
            </div>
          </div>
          <div class="favorite-actions">
            <button class="btn btn-xs" onclick="viewFavorite('${fav.id}')">👁️ 查看</button>
            <button class="btn btn-xs" onclick="deleteFavorite('${fav.id}')">🗑️ 删除</button>
          </div>
        </div>
      `).join('');
  } catch (error) {
    console.error('加载收藏夹列表失败:', error);
    favoriteList.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 打开创建收藏夹对话框
 */
function openCreateFavoriteModal() {
  document.getElementById('createFavoriteModal').style.display = 'flex';
}

/**
 * 关闭创建收藏夹对话框
 */
function closeCreateFavoriteModal() {
  document.getElementById('createFavoriteModal').style.display = 'none';
  document.getElementById('createFavoriteForm').reset();
}

/**
 * 提交创建收藏夹
 */
async function submitCreateFavorite(event) {
  event.preventDefault();

  const name = document.getElementById('favoriteName').value.trim();
  const icon = document.getElementById('favoriteIcon').value.trim() || '⭐';
  const description = document.getElementById('favoriteDescription').value.trim();

  try {
    updateStatus('创建收藏夹...');

    const response = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, description })
    });

    const favorite = await response.json();

    if (response.ok) {
      updateStatus(`收藏夹 "${favorite.name}" 创建成功`);
      closeCreateFavoriteModal();
      await loadFavoriteList();
    } else {
      updateStatus(`创建失败：${favorite.error}`);
    }
  } catch (error) {
    console.error('创建收藏夹失败:', error);
    updateStatus('创建失败');
  }
}

/**
 * 删除收藏夹
 */
async function deleteFavorite(favoriteId) {
  if (!confirm('确定要删除这个收藏夹吗？')) return;

  try {
    updateStatus('删除收藏夹...');

    const response = await fetch(`/api/favorites/${favoriteId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      updateStatus('收藏夹删除成功');
      await loadFavoriteList();
    } else {
      updateStatus(`删除失败：${result.error}`);
    }
  } catch (error) {
    console.error('删除收藏夹失败:', error);
    updateStatus('删除失败');
  }
}

/**
 * 查看收藏夹
 */
function viewFavorite(favoriteId) {
  alert('查看收藏夹功能开发中...\n\n收藏夹 ID: ' + favoriteId);
}

/**
 * 切换收藏面板
 */
async function toggleFavoritesPanel() {
  const panel = document.getElementById('favoritesPanel');
  const isVisible = panel.style.display !== 'none';

  if (isVisible) {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'block';
    await loadFavoritesForDiscussion();
  }
}

/**
 * 为当前讨论加载收藏夹
 */
async function loadFavoritesForDiscussion() {
  if (!currentDiscussionId) return;

  const favoritesContent = document.getElementById('favoritesContent');
  favoritesContent.innerHTML = '<div class="loading">加载中...</div>';

  try {
    // 获取收藏状态
    const response = await fetch(`/api/discussion/${currentDiscussionId}/favorited`);
    const { isFavorited, favorites } = await response.json();

    // 获取所有收藏夹
    const allFavoritesResponse = await fetch('/api/favorites');
    const allFavorites = await allFavoritesResponse.json();

    favoritesContent.innerHTML = `
      <div class="favorites-status">
        <h4>${isFavorited ? '⭐ 已收藏' : '☆ 未收藏'}</h4>
        ${isFavorited && favorites.length > 0 ? `
          <div class="favorited-in">
            <p>收藏在：</p>
            ${favorites.map(fav => `
              <span class="favorite-badge">${fav.icon} ${fav.name}</span>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="favorites-add">
        <h4>➕ 添加到收藏夹</h4>
        <div class="all-favorites">
          ${allFavorites.map(fav => `
            <button class="btn btn-sm" onclick="addToFavorite('${fav.id}')">${fav.icon} ${fav.name}</button>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('加载收藏夹失败:', error);
    favoritesContent.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 添加讨论到收藏夹
 */
async function addToFavorite(favoriteId) {
  if (!currentDiscussionId) return;

  try {
    updateStatus('添加到收藏夹...');

    const response = await fetch(`/api/favorites/${favoriteId}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discussionId: currentDiscussionId })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      updateStatus('已添加到收藏夹');
      await loadFavoritesForDiscussion();
    } else {
      updateStatus(`添加失败：${result.error || '已在收藏夹中'}`);
    }
  } catch (error) {
    console.error('添加到收藏夹失败:', error);
    updateStatus('添加失败');
  }
}

// ===== @提及和回复功能 =====

/**
 * 切换 @提及面板
 */
async function toggleMentionsPanel() {
  const panel = document.getElementById('mentionsPanel');
  const isVisible = panel.style.display !== 'none';

  if (isVisible) {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'block';
    await loadMentions();
  }
}

/**
 * 加载 @提及
 */
async function loadMentions() {
  if (!currentDiscussionId) return;

  const mentionsContent = document.getElementById('mentionsContent');
  mentionsContent.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const response = await fetch(`/api/discussion/${currentDiscussionId}/mentions`);
    const mentions = await response.json();

    mentionsContent.innerHTML = mentions.length === 0
      ? '<div class="empty-state">暂无 @提及</div>'
      : mentions.map(mention => `
        <div class="mention-item">
          <div class="mention-from">
            <strong>${mention.fromAgent}</strong> 提及了
            <strong>${mention.toAgentName}</strong>
          </div>
          <div class="mention-content">"${mention.text}"</div>
          <div class="mention-time">${new Date(mention.timestamp).toLocaleString()}</div>
        </div>
      `).join('');
  } catch (error) {
    console.error('加载 @提及失败:', error);
    mentionsContent.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 切换搜索面板
 */
function toggleSearchPanel() {
  const panel = document.getElementById('searchPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

/**
 * 执行消息搜索
 */
async function performMessageSearch() {
  if (!currentDiscussionId) return;

  const query = document.getElementById('messageSearchInput').value.trim();
  const type = document.getElementById('messageSearchType').value;
  const searchResults = document.getElementById('searchResults');

  if (!query) {
    searchResults.innerHTML = '<div class="search-hint">请输入搜索关键词</div>';
    return;
  }

  searchResults.innerHTML = '<div class="loading">搜索中...</div>';

  try {
    const response = await fetch(`/api/discussion/${currentDiscussionId}/search?q=${encodeURIComponent(query)}&type=${type}`);
    const results = await response.json();

    searchResults.innerHTML = results.length === 0
      ? '<div class="empty-state">未找到匹配的消息</div>'
      : results.map(msg => `
        <div class="search-result-item" onclick="scrollToMessage('${msg.id}')">
          <div class="result-agent">${msg.role}</div>
          <div class="result-content">${highlightSearchTerm(msg.content, query)}</div>
          <div class="result-time">${new Date(msg.timestamp).toLocaleString()}</div>
        </div>
      `).join('');
  } catch (error) {
    console.error('搜索失败:', error);
    searchResults.innerHTML = '<div class="error">搜索失败</div>';
  }
}

/**
 * 高亮搜索词
 */
function highlightSearchTerm(content, term) {
  const regex = new RegExp(`(${term})`, 'gi');
  return content.replace(regex, '<mark>$1</mark>');
}

/**
 * 滚动到指定消息
 */
function scrollToMessage(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement) {
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    messageElement.classList.add('highlight-pulse');
    setTimeout(() => {
      messageElement.classList.remove('highlight-pulse');
    }, 2000);
  }
}

/**
 * 显示消息的回复
 */
async function showMessageReplies(messageId) {
  if (!currentDiscussionId) return;

  try {
    const response = await fetch(`/api/message/${currentDiscussionId}/${messageId}/replies`);
    const replies = await response.json();

    if (replies.length === 0) {
      alert('此消息暂无回复');
      return;
    }

    // 显示回复列表
    const replyList = replies.map(reply => `
      <div class="reply-preview">
        <strong>${reply.role}:</strong> ${reply.content.substring(0, 100)}${reply.content.length > 100 ? '...' : ''}
      </div>
    `).join('');

    alert(`回复列表：\n\n${replyList.join('\n')}`);
  } catch (error) {
    console.error('获取回复失败:', error);
  }
}

/**
 * 回复消息
 */
function replyToMessage(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageElement) return;

  const content = prompt('请输入回复内容：');
  if (!content) return;

  // 这里应该调用 API 创建回复
  alert('回复功能开发中...\n\n消息 ID: ' + messageId + '\n回复内容: ' + content);
}

/**
 * 引用消息
 */
function quoteMessage(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (!messageElement) return;

  const content = messageElement.querySelector('.message-content')?.textContent;
  if (!content) return;

  // 复制引用到剪贴板
  const quote = `> ${content}\n\n`;
  navigator.clipboard.writeText(quote).then(() => {
    updateStatus('引用已复制到剪贴板');
  }).catch(() => {
    alert('引用：\n\n' + quote);
  });
}

// 搜索输入框回车搜索
document.addEventListener('DOMContentLoaded', () => {
  const messageSearchInput = document.getElementById('messageSearchInput');
  if (messageSearchInput) {
    messageSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performMessageSearch();
      }
    });
  }

  // @提及按钮
  const mentionsBtn = document.getElementById('mentionsBtn');
  if (mentionsBtn) {
    mentionsBtn.addEventListener('click', () => {
      toggleMentionsPanel();
    });
  }

  // 搜索按钮
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      toggleSearchPanel();
    });
  }
});
