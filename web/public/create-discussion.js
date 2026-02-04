/**
 * 新建讨论组功能 (v3.6.0风格)
 */

/**
 * 打开创建讨论组模态框
 */
function openCreateDiscussionModal() {
  const modal = document.getElementById('createDiscussionModal');
  if (modal) {
    modal.style.display = 'flex';
    // 清空输入框
    const input = document.getElementById('newDiscussionInput');
    if (input) input.value = '';
  }
}

/**
 * 关闭创建讨论组模态框
 */
function closeCreateDiscussionModal() {
  const modal = document.getElementById('createDiscussionModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * 设置输入框内容
 */
function setCreateInput(text) {
  const input = document.getElementById('newDiscussionInput');
  if (input) {
    input.value = text;
    input.focus();
  }
}

/**
 * 创建讨论组
 */
async function createDiscussion() {
  const userInput = document.getElementById('newDiscussionInput').value.trim();

  if (!userInput) {
    showToast('请输入你的需求', 'warning');
    return;
  }

  const submitBtn = document.getElementById('createDiscussionSubmitBtn');
  const originalText = submitBtn.textContent;

  // 显示加载状态
  submitBtn.disabled = true;
  submitBtn.textContent = '创建中...';

  try {
    const response = await fetch('/api/skills/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userInput: userInput,
        mode: 'auto'
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast('✅ 讨论组创建成功！', 'success');

      // 关闭模态框
      closeCreateDiscussionModal();

      // 刷新讨论列表
      setTimeout(() => {
        loadDiscussions();
      }, 500);

      // 可选：跳转到新创建的讨论组
      if (result.projectId) {
        setTimeout(() => {
          selectDiscussion(result.projectId);
        }, 1000);
      }
    } else {
      showToast('❌ 创建失败：' + (result.error || '未知错误'), 'error');
    }

  } catch (error) {
    console.error('创建讨论组失败:', error);
    showToast('❌ 创建失败：' + error.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// 支持 Enter 键提交（Ctrl+Enter）
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('newDiscussionInput');
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'Enter') {
        createDiscussion();
      }
    });
  }
});

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
  const modal = document.getElementById('createDiscussionModal');
  if (modal && e.target === modal) {
    closeCreateDiscussionModal();
  }
});
