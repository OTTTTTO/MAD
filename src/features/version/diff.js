/**
 * Diff Manager - 版本比较
 */

/**
 * 比较两个消息列表
 */
function compareMessageLists(messages1, messages2) {
  const changes = {
    added: [],
    removed: [],
    modified: [],
    stats: {
      added: 0,
      removed: 0,
      modified: 0
    }
  };

  const messages1Map = new Map(messages1.map(m => [m.id, m]));
  const messages2Map = new Map(messages2.map(m => [m.id, m]));

  // 检查新增和修改
  messages2.forEach(msg2 => {
    if (!messages1Map.has(msg2.id)) {
      changes.added.push(msg2);
      changes.stats.added++;
    } else {
      const msg1 = messages1Map.get(msg2.id);
      if (msg1.content !== msg2.content) {
        changes.modified.push({
          id: msg2.id,
          role: msg2.role,
          old: msg1,
          new: msg2
        });
        changes.stats.modified++;
      }
    }
  });

  // 检查删除
  messages1.forEach(msg1 => {
    if (!messages2Map.has(msg1.id)) {
      changes.removed.push(msg1);
      changes.stats.removed++;
    }
  });

  return changes;
}

/**
 * 比较两个快照
 */
function compareSnapshots(snapshot1, snapshot2) {
  const changes = {
    from: {
      id: snapshot1.id,
      version: snapshot1.version,
      timestamp: snapshot1.timestamp
    },
    to: {
      id: snapshot2.id,
      version: snapshot2.version,
      timestamp: snapshot2.timestamp
    },
    messageChanges: null,
    contextChanges: null,
    summary: null
  };

  // 比较消息
  changes.messageChanges = compareMessageLists(
    snapshot1.data.messages,
    snapshot2.data.messages
  );

  // 比较上下文
  changes.contextChanges = {
    topic: {
      old: snapshot1.data.context.topic,
      new: snapshot2.data.context.topic,
      changed: snapshot1.data.context.topic !== snapshot2.data.context.topic
    },
    status: {
      old: snapshot1.data.context.status,
      new: snapshot2.data.context.status,
      changed: snapshot1.data.context.status !== snapshot2.data.context.status
    },
    rounds: {
      old: snapshot1.data.context.rounds,
      new: snapshot2.data.context.rounds,
      changed: snapshot1.data.context.rounds !== snapshot2.data.context.rounds
    }
  };

  // 生成摘要
  changes.summary = generateSummary(changes);

  return changes;
}

/**
 * 生成比较摘要
 */
function generateSummary(changes) {
  const parts = [];

  if (changes.messageChanges.stats.added > 0) {
    parts.push(`新增 ${changes.messageChanges.stats.added} 条消息`);
  }

  if (changes.messageChanges.stats.removed > 0) {
    parts.push(`删除 ${changes.messageChanges.stats.removed} 条消息`);
  }

  if (changes.messageChanges.stats.modified > 0) {
    parts.push(`修改 ${changes.messageChanges.stats.modified} 条消息`);
  }

  if (changes.contextChanges.topic.changed) {
    parts.push('主题已更改');
  }

  if (changes.contextChanges.status.changed) {
    parts.push('状态已更改');
  }

  return parts.length > 0 ? parts.join('，') : '无变化';
}

/**
 * 格式化差异为 HTML
 */
function formatDiffHTML(changes) {
  let html = '<div class="diff-container">';

  // 摘要
  html += `<div class="diff-summary">${changes.summary}</div>`;

  // 消息变更
  if (changes.messageChanges.stats.added > 0 ||
      changes.messageChanges.stats.removed > 0 ||
      changes.messageChanges.stats.modified > 0) {
    html += '<div class="diff-section">';
    html += '<h4>消息变更</h4>';

    // 新增消息
    changes.messageChanges.added.forEach(msg => {
      html += `
        <div class="diff-item diff-added">
          <div class="diff-badge">新增</div>
          <div class="diff-role">${msg.role}</div>
          <div class="diff-content">${escapeHtml(msg.content)}</div>
        </div>
      `;
    });

    // 删除消息
    changes.messageChanges.removed.forEach(msg => {
      html += `
        <div class="diff-item diff-removed">
          <div class="diff-badge">删除</div>
          <div class="diff-role">${msg.role}</div>
          <div class="diff-content">${escapeHtml(msg.content)}</div>
        </div>
      `;
    });

    // 修改消息
    changes.messageChanges.modified.forEach(change => {
      html += `
        <div class="diff-item diff-modified">
          <div class="diff-badge">修改</div>
          <div class="diff-role">${change.role}</div>
          <div class="diff-content-old">${escapeHtml(change.old.content)}</div>
          <div class="diff-content-new">${escapeHtml(change.new.content)}</div>
        </div>
      `;
    });

    html += '</div>';
  }

  // 上下文变更
  html += '<div class="diff-section">';
  html += '<h4>上下文变更</h4>';

  if (changes.contextChanges.topic.changed) {
    html += `
      <div class="diff-item diff-context-change">
        <div class="diff-label">主题</div>
        <div class="diff-value-old">${escapeHtml(changes.contextChanges.topic.old)}</div>
        <div class="diff-arrow">→</div>
        <div class="diff-value-new">${escapeHtml(changes.contextChanges.topic.new)}</div>
      </div>
    `;
  }

  if (changes.contextChanges.status.changed) {
    html += `
      <div class="diff-item diff-context-change">
        <div class="diff-label">状态</div>
        <div class="diff-value-old">${escapeHtml(changes.contextChanges.status.old)}</div>
        <div class="diff-arrow">→</div>
        <div class="diff-value-new">${escapeHtml(changes.contextChanges.status.new)}</div>
      </div>
    `;
  }

  if (changes.contextChanges.rounds.changed) {
    html += `
      <div class="diff-item diff-context-change">
        <div class="diff-label">轮次</div>
        <div class="diff-value-old">${changes.contextChanges.rounds.old}</div>
        <div class="diff-arrow">→</div>
        <div class="diff-value-new">${changes.contextChanges.rounds.new}</div>
      </div>
    `;
  }

  html += '</div>';
  html += '</div>';

  return html;
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
 * 计算文本差异（字符级）
 */
function getTextDiff(text1, text2) {
  // 简化版：使用行级差异
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');

  const diff = {
    added: [],
    removed: [],
    unchanged: []
  };

  let i = 0, j = 0;
  while (i < lines1.length || j < lines2.length) {
    if (i < lines1.length && j < lines2.length && lines1[i] === lines2[j]) {
      diff.unchanged.push({ line: i + 1, content: lines1[i] });
      i++;
      j++;
    } else if (j < lines2.length) {
      diff.added.push({ line: j + 1, content: lines2[j] });
      j++;
    } else if (i < lines1.length) {
      diff.removed.push({ line: i + 1, content: lines1[i] });
      i++;
    }
  }

  return diff;
}

module.exports = {
  compareMessageLists,
  compareSnapshots,
  generateSummary,
  formatDiffHTML,
  getTextDiff
};
