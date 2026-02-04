/**
 * v2.5.1 - 键盘快捷键支持
 * 
 * 功能：为 Web 界面添加键盘快捷键，提升用户体验
 * 
 * 快捷键列表：
 * - Ctrl/Cmd + K: 搜索
 * - Ctrl/Cmd + N: 新建讨论
 * - Ctrl/Cmd + /: 显示快捷键帮助
 * - Ctrl/Cmd + D: 切换到下一个讨论
 * - Ctrl/Cmd + Shift + D: 切换到上一个讨论
 * - Ctrl/Cmd + E: 导出当前讨论
 * - Ctrl/Cmd + R: 刷新
 * - Ctrl/Cmd + H: 返回首页
 * - Esc: 关闭对话框/模态框
 * - Ctrl/Cmd + Enter: 提交表单
 * - Ctrl/Cmd + F: 聚焦搜索框
 * - Ctrl/Cmd + ,: 打开设置
 */

// 快捷键配置
const SHORTCUTS = {
  'search': { key: 'k', ctrl: true, description: '搜索' },
  'newDiscussion': { key: 'n', ctrl: true, description: '新建讨论' },
  'help': { key: '/', ctrl: true, description: '显示帮助' },
  'nextDiscussion': { key: 'd', ctrl: true, description: '下一个讨论' },
  'prevDiscussion': { key: 'd', ctrl: true, shift: true, description: '上一个讨论' },
  'export': { key: 'e', ctrl: true, description: '导出讨论' },
  'refresh': { key: 'r', ctrl: true, description: '刷新' },
  'home': { key: 'h', ctrl: true, description: '返回首页' },
  'escape': { key: 'Escape', description: '关闭对话框' },
  'submit': { key: 'Enter', ctrl: true, description: '提交表单' },
  'focusSearch': { key: 'f', ctrl: true, description: '聚焦搜索框' },
  'settings': { key: ',', ctrl: true, description: '打开设置' }
};

/**
 * 键盘快捷键管理器
 */
class KeyboardShortcutManager {
  constructor() {
    this.shortcuts = new Map();
    this.enabled = true;
    this.preventDefaultActions = new Set([
      'search', 'newDiscussion', 'help', 'export', 'refresh'
    ]);
    
    this.init();
  }

  /**
   * 初始化
   */
  init() {
    // 加载用户自定义快捷键
    this.loadCustomShortcuts();
    
    // 绑定全局键盘事件
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(event) {
    if (!this.enabled) return;

    // 忽略在输入框中的按键（除非是 Ctrl+Enter）
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable) {
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') {
        return;
      }
    }

    const action = this.matchShortcut(event);
    if (action) {
      event.preventDefault();
      this.executeAction(action);
    }
  }

  /**
   * 匹配快捷键
   */
  matchShortcut(event) {
    const key = event.key;
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    const alt = event.altKey;

    for (const [actionName, shortcut] of this.shortcuts.entries()) {
      if (shortcut.key === key &&
          shortcut.ctrl === ctrl &&
          shortcut.shift === shift &&
          (!shortcut.alt || shortcut.alt === alt)) {
        return actionName;
      }
    }

    return null;
  }

  /**
   * 执行动作
   */
  executeAction(action) {
    console.log('[Shortcut] Executing:', action);

    // 发送自定义事件
    const customEvent = new CustomEvent('shortcut', {
      detail: { action }
    });
    document.dispatchEvent(customEvent);

    // 执行特定动作
    switch (action) {
      case 'search':
        this.openSearch();
        break;
      case 'newDiscussion':
        this.openNewDiscussion();
        break;
      case 'help':
        this.showHelp();
        break;
      case 'nextDiscussion':
        this.navigateDiscussions('next');
        break;
      case 'prevDiscussion':
        this.navigateDiscussions('prev');
        break;
      case 'export':
        this.exportDiscussion();
        break;
      case 'refresh':
        location.reload();
        break;
      case 'home':
        this.goHome();
        break;
      case 'escape':
        this.closeDialogs();
        break;
      case 'submit':
        this.submitForm();
        break;
      case 'focusSearch':
        this.focusSearchBox();
        break;
      case 'settings':
        this.openSettings();
        break;
    }
  }

  /**
   * 打开搜索
   */
  openSearch() {
    const searchInput = document.querySelector('#search-input, .search-input, input[type="search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else {
      // 如果没有搜索框，导航到搜索页面
      window.location.href = '/#search';
    }
  }

  /**
   * 打开新建讨论
   */
  openNewDiscussion() {
    const newButton = document.querySelector('#new-discussion-btn, .btn-new, button:has-text("新建")');
    if (newButton) {
      newButton.click();
    }
  }

  /**
   * 显示帮助
   */
  showHelp() {
    this.showShortcutHelp();
  }

  /**
   * 导航讨论
   */
  navigateDiscussions(direction) {
    const event = new CustomEvent('navigate-discussion', {
      detail: { direction }
    });
    document.dispatchEvent(event);
  }

  /**
   * 导出讨论
   */
  exportDiscussion() {
    const exportButton = document.querySelector('#export-btn, .btn-export, button:has-text("导出")');
    if (exportButton) {
      exportButton.click();
    }
  }

  /**
   * 返回首页
   */
  goHome() {
    window.location.href = '/';
  }

  /**
   * 关闭对话框
   */
  closeDialogs() {
    const modals = document.querySelectorAll('.modal.show, .dialog.show, [role="dialog"]');
    modals.forEach(modal => {
      modal.style.display = 'none';
      modal.classList.remove('show');
    });

    // 触发关闭事件
    const event = new CustomEvent('close-dialogs');
    document.dispatchEvent(event);
  }

  /**
   * 提交表单
   */
  submitForm() {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.form) {
      activeElement.form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  }

  /**
   * 聚焦搜索框
   */
  focusSearchBox() {
    const searchInput = document.querySelector('#search-input, .search-input, input[type="search"]');
    if (searchInput) {
      searchInput.focus();
    }
  }

  /**
   * 打开设置
   */
  openSettings() {
    const settingsButton = document.querySelector('#settings-btn, .btn-settings, button:has-text("设置")');
    if (settingsButton) {
      settingsButton.click();
    }
  }

  /**
   * 显示快捷键帮助对话框
   */
  showShortcutHelp() {
    // 创建帮助对话框
    const helpDialog = document.createElement('div');
    helpDialog.className = 'shortcut-help-dialog';
    helpDialog.innerHTML = `
      <div class="shortcut-help-content">
        <h2>⌨️ 键盘快捷键</h2>
        <div class="shortcut-list">
          ${Array.from(this.shortcuts.entries()).map(([name, shortcut]) => `
            <div class="shortcut-item">
              <div class="shortcut-keys">
                ${shortcut.ctrl ? '<kbd>Ctrl</kbd> + ' : ''}
                ${shortcut.shift ? '<kbd>Shift</kbd> + ' : ''}
                <kbd>${this.formatKey(shortcut.key)}</kbd>
              </div>
              <div class="shortcut-description">${shortcut.description}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn-close" onclick="this.closest('.shortcut-help-dialog').remove()">关闭</button>
      </div>
    `;

    document.body.appendChild(helpDialog);
    
    // 点击外部关闭
    helpDialog.addEventListener('click', (e) => {
      if (e.target === helpDialog) {
        helpDialog.remove();
      }
    });
  }

  /**
   * 格式化按键名称
   */
  formatKey(key) {
    const keyNames = {
      'Escape': 'Esc',
      'Enter': 'Enter',
      ' ': 'Space',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→'
    };
    return keyNames[key] || key;
  }

  /**
   * 注册自定义快捷键
   */
  register(action, shortcut) {
    this.shortcuts.set(action, shortcut);
  }

  /**
   * 注销快捷键
   */
  unregister(action) {
    this.shortcuts.delete(action);
  }

  /**
   * 启用快捷键
   */
  enable() {
    this.enabled = true;
  }

  /**
   * 禁用快捷键
   */
  disable() {
    this.enabled = false;
  }

  /**
   * 加载用户自定义快捷键
   */
  loadCustomShortcuts() {
    // 加载默认快捷键
    Object.entries(SHORTCUTS).forEach(([action, shortcut]) => {
      this.shortcuts.set(action, shortcut);
    });

    // 加载用户自定义
    const custom = localStorage.getItem('mad:custom-shortcuts');
    if (custom) {
      try {
        const customShortcuts = JSON.parse(custom);
        Object.entries(customShortcuts).forEach(([action, shortcut]) => {
          this.shortcuts.set(action, shortcut);
        });
      } catch (e) {
        console.error('[Shortcut] Failed to load custom shortcuts:', e);
      }
    }
  }

  /**
   * 保存自定义快捷键
   */
  saveCustomShortcuts() {
    const custom = {};
    this.shortcuts.forEach((shortcut, action) => {
      if (!SHORTCUTS[action]) {
        custom[action] = shortcut;
      }
    });
    localStorage.setItem('mad:custom-shortcuts', JSON.stringify(custom));
  }

  /**
   * 获取所有快捷键
   */
  getAllShortcuts() {
    const result = {};
    this.shortcuts.forEach((shortcut, action) => {
      result[action] = shortcut;
    });
    return result;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeyboardShortcutManager, SHORTCUTS };
}
