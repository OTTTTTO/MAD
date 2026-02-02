# 修复合并讨论 API 500 错误

## 问题描述

合并讨论接口 `POST /api/discussion/:id/merge` 报 500 错误

**错误场景：** 当讨论的 `messages` 或 `conflicts` 字段为 `null` 时

## 根本原因

在 `orchestrator.js` 的 `mergeDiscussions` 方法中：

```javascript
// ❌ 没有检查 messages 是否为 null
sourceContext.messages.forEach(msg => {
  // ...
});

// ❌ 没有检查 conflicts 是否为 null
sourceContext.conflicts.forEach(conflict => {
  // ...
});

// ❌ 没有检查 targetContext.messages 是否为 null
targetContext.messages.push(newMessage);
```

**触发条件：**
- 讨论的 `messages` 字段为 `null`（而不是空数组 `[]`）
- 讨论的 `conflicts` 字段为 `null`
- 尝试合并这样的讨论会抛出：`Cannot read properties of null (reading 'forEach')`

**为什么会出现 null：**
- 讨论初始化时没有正确设置默认值
- 或者某些操作将数组设置为 null

## 修复内容

### 文件：orchestrator.js

**位置：** `mergeDiscussions` 方法

**修复：** 添加空值检查和数组初始化
```javascript
// ✅ 添加空值检查
if (!targetContext.messages) {
  targetContext.messages = [];
}
if (!sourceContext.messages) {
  sourceContext.messages = [];
}
if (!sourceContext.conflicts) {
  sourceContext.conflicts = [];
}

// 现在可以安全地使用 forEach
sourceContext.messages.forEach(msg => {
  // ...
});
```

## 修复的完整代码

```javascript
const sourceContext = this.discussions.get(sourceId);

// ✅ 确保 messages 和 conflicts 是数组
if (!targetContext.messages) {
  targetContext.messages = [];
}
if (!sourceContext.messages) {
  sourceContext.messages = [];
}
if (!sourceContext.conflicts) {
  sourceContext.conflicts = [];
}

// 合并消息
sourceContext.messages.forEach(msg => {
  const newMessage = {
    ...msg,
    id: `msg-${targetContext.messages.length + 1}`,
    metadata: {
      ...msg.metadata,
      mergedFrom: sourceId,
      originalMessageId: msg.id
    }
  };
  targetContext.messages.push(newMessage);
  mergedMessages.push(newMessage);
});

// 合并冲突
sourceContext.conflicts.forEach(conflict => {
  mergedConflicts.push({
    ...conflict,
    sourceDiscussion: sourceId
  });
});
```

## 测试验证

需要测试的场景：
1. ✅ 合并 messages 为 null 的讨论
2. ✅ 合并 conflicts 为 null 的讨论
3. ✅ 正常合并（messages 和 conflicts 都有数据）
4. ✅ 合并后源讨论被正确删除

## 防御性建议

为了避免类似问题，建议在讨论初始化时确保字段始终有默认值：

```javascript
// 在创建新讨论时
const discussion = {
  id: discussionId,
  topic: topic,
  messages: [],        // ✅ 默认为空数组，不是 null
  conflicts: [],       // ✅ 默认为空数组，不是 null
  participants: [],
  agentStates: new Map(),
  // ...
};
```

## 影响范围

- ✅ 不影响其他功能
- ✅ 向后兼容（只是添加空值保护）
- ✅ 提升稳定性（防止 null 引用错误）

## 修复时间

2026-02-02 20:35
