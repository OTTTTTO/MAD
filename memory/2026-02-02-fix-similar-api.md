# 修复相似功能 API 500 错误

## 问题描述

相似功能接口 `/api/discussion/:id/similar?threshold=0.1&limit=10` 报 500 错误

**错误信息：** `{"error":"Cannot read properties of undefined (reading 'topic')"}`

## 根本原因

### 问题 1：异步初始化未等待（已修复）
`initializeSimilarityDetector()` 是异步方法，但在调用时没有使用 `await`，导致：
1. 模型训练未完成就开始查询
2. `discussionVectors` 为空，查询失败

### 问题 2：数据一致性检查缺失（主要问题）
在 `similarity.js` 的 `findSimilar` 方法中：
```javascript
const discussion = discussions.get(id);  // 可能返回 undefined

// 没有检查 discussion 是否存在就直接访问属性
results.push({
  topic: discussion.topic || '无主题',  // ❌ discussion 为 undefined 时报错
  ...
});
```

**触发条件：**
- `discussionVectors` 中有某个讨论 ID
- 但 `discussions` Map 中没有这个 ID（数据不一致）
- 可能原因：讨论被删除但向量未清理、缓存未同步等

## 修复内容

### 1. orchestrator.js ✅

**文件位置：** `orchestrator.js`

**修改 1：** `findSimilarDiscussions` 方法改为异步
**修改 2：** `calculateDiscussionSimilarity` 方法改为异步

### 2. web/server.js ✅

**文件位置：** `web/server.js`

**修改：** 相似讨论 API 路由添加 await

### 3. src/core/similarity.js ✅ （关键修复）

**文件位置：** `src/core/similarity.js`

**修改：** 在访问 `discussion` 属性之前添加存在性检查
```javascript
// 修改前
const discussion = discussions.get(id);
// 直接访问 discussion.topic - 可能报错

// 修改后
const discussion = discussions.get(id);

// 跳过不存在的讨论（数据不一致时可能发生）
if (!discussion) {
  return;
}

// 安全访问 discussion.topic
results.push({
  topic: discussion.topic || '无主题',
  ...
});
```

## 测试验证

✅ **测试通过：**
```bash
curl "http://localhost:18790/api/discussion/disc-1770020462425/similar?threshold=0.1&limit=10"
```

**返回结果：**
- 成功返回 10 个相似讨论
- 包含相似度分数、共同关键词、消息数量等信息
- 无 500 错误

## 影响范围

- ✅ 不影响其他功能
- ✅ 向后兼容（只是添加 await 和空值检查，不改变接口）
- ✅ 提升稳定性（确保初始化完成后再查询，处理数据不一致情况）

## 修复时间

2026-02-02 20:25 - 初始修复（异步问题）
2026-02-02 20:30 - 完整修复（添加数据一致性检查）
