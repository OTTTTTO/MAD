# API 500 错误排查指南

## 概述

本文档总结了 MAD 项目中 API 500 错误的排查过程、根本原因和解决方案，为未来类似问题提供参考。

## 案例一：相似讨论 API 500 错误

### 问题描述

**接口：** `GET /api/discussion/:id/similar?threshold=0.1&limit=10`

**错误：** 返回 500 状态码

### 排查过程

1. **查看错误日志**
   ```bash
   curl -s "http://localhost:18790/api/discussion/disc-1770020462425/similar"
   # 返回: {"error":"Cannot read properties of undefined (reading 'topic')"}
   ```

2. **定位错误代码**
   - 错误发生在 `src/core/similarity.js` 的 `findSimilar` 方法
   - 访问 `discussion.topic` 时，`discussion` 为 `undefined`

3. **分析根本原因**
   ```javascript
   // ❌ 问题代码
   const discussion = discussions.get(id);  // 可能返回 undefined
   results.push({
     topic: discussion.topic || '无主题',  // undefined.topic 报错
     ...
   });
   ```

### 根本原因

**两个问题叠加：**

1. **异步初始化未等待**
   ```javascript
   // orchestrator.js
   findSimilarDiscussions(discussionId, threshold, limit) {
     if (!this.similarityInitialized) {
       this.initializeSimilarityDetector();  // ❌ 缺少 await
     }
     // 继续执行，但模型可能还在训练中
   }
   ```

2. **数据一致性检查缺失**
   - `discussionVectors` 中有某个 ID
   - 但 `discussions` Map 中没有这个 ID（数据不一致）
   - `discussions.get(id)` 返回 `undefined`
   - 访问 `undefined.topic` 报错

### 解决方案

**1. 修复异步初始化**
```javascript
// ✅ 添加 async/await
async findSimilarDiscussions(discussionId, threshold, limit) {
  if (!this.similarityInitialized) {
    await this.initializeSimilarityDetector();  // ✅ 等待训练完成
  }
  // 现在可以安全使用 similarityDetector
}
```

**2. 添加数据一致性检查**
```javascript
// ✅ 检查 discussion 是否存在
const discussion = discussions.get(id);
if (!discussion) {
  return;  // 跳过不存在的讨论
}

// 现在可以安全访问
results.push({
  topic: discussion.topic || '无主题',
  ...
});
```

### 经验教训

1. **异步操作必须 await**
   - `async` 方法返回 Promise，必须 `await` 才能等待完成
   - 不 await 会导致后续代码在初始化完成前执行

2. **数据一致性很重要**
   - 多个数据源（Map、数组等）之间可能不同步
   - 访问前必须检查键/值是否存在

3. **防御性编程**
   - 访问对象属性前，先检查对象是否为 null/undefined
   - 使用可选链：`discussion?.topic`

---

## 案例二：合并讨论 API 500 错误

### 问题描述

**接口：** `POST /api/discussion/:id/merge`

**错误：** 返回 500 状态码，错误信息 `"Discussion disc-xxx not found"`

### 排查过程

1. **添加调试日志**
   ```javascript
   console.log(`[DEBUG] sourceId=${sourceId}, exists=${this.discussions.has(sourceId)}`);
   console.log(`[DEBUG] About to delete source discussion ${sourceId}`);
   ```

2. **发现异常行为**
   - 日志显示 `exists=true`，讨论确实存在
   - 但删除时抛出 "not found" 错误

3. **追踪调用链**
   ```
   mergeDiscussions
   → this.discussions.delete(sourceId)  // 先从 Map 删除
   → await this.deleteDiscussion(sourceId)  // 再调用删除方法
     → DiscussionOrchestrator.prototype.deleteDiscussion  // 原型方法！
       → historyManager.deleteDiscussion
         → this.orchestrator.discussions.get(discussionId)  // 返回 undefined
           → throw new Error("Discussion not found")
   ```

### 根本原因

**方法调用冲突 + 逻辑顺序错误：**

1. **先从 Map 删除**
   ```javascript
   this.discussions.delete(sourceId);  // ❌ 讨论已从 Map 删除
   ```

2. **调用原型方法**
   ```javascript
   await this.deleteDiscussion(sourceId);
   // 实际调用的是 DiscussionOrchestrator.prototype.deleteDiscussion
   // 而不是类方法中的 deleteDiscussion
   ```

3. **原型方法检查失败**
   ```javascript
   // historyManager.deleteDiscussion
   const context = this.orchestrator.discussions.get(discussionId);
   if (!context) {
     throw new Error(`Discussion ${discussionId} not found`);  // ❌ 已被删除
   }
   ```

### JavaScript 方法调用顺序

```javascript
class DiscussionOrchestrator {
  // 类方法
  async deleteDiscussion(discussionId) {
    if (!this.discussions.has(discussionId)) {
      return;
    }
    this.discussions.delete(discussionId);
    // ...
  }
}

// 原型方法（后定义）
DiscussionOrchestrator.prototype.deleteDiscussion = async function(discussionId) {
  return this.historyManager.deleteDiscussion(discussionId);
};

// 调用 this.deleteDiscussion() 会使用原型方法！
```

### 解决方案

**删除冗余的 Map 删除操作**
```javascript
// ❌ 修复前
this.discussions.delete(sourceId);  // 先删除
await this.deleteDiscussion(sourceId);  // 然后检查（失败）

// ✅ 修复后
await this.deleteDiscussion(sourceId);  // 让方法完整处理
```

### 经验教训

1. **理解 JavaScript 方法查找顺序**
   - 实例方法 vs 原型方法
   - 后定义的原型方法会覆盖实例方法

2. **避免重复操作**
   - 不要先手动删除，再调用会检查存在性的方法
   - 让一个方法完整处理一个操作

3. **使用调试日志定位问题**
   - 在关键步骤添加日志
   - 追踪方法调用链
   - 检查变量状态变化

---

## 防御性空值检查（全面修复）

### 问题范围

在排查过程中，发现多处存在空值引用风险：

| 方法 | 位置 | 问题 |
|------|------|------|
| `mergeDiscussions` | orchestrator.js:1730 | messages/conflicts 可能为 null |
| `generateSummary` | orchestrator.js:681 | messages 可能为 null |
| `exportToMarkdown` | orchestrator.js:981 | messages/conflicts 可能为 null |
| `extractActionItems` | orchestrator.js:1536 | messages 可能为 null |
| `getAllMentions` | orchestrator.js:2528 | messages 可能为 null |

### 标准防御模式

```javascript
// ✅ 标准防御模式
if (!context.messages) {
  context.messages = [];
}
if (!context.conflicts) {
  context.conflicts = [];
}

// 现在可以安全访问
context.messages.forEach(msg => {
  // ...
});
```

### 根本解决方案

**在创建新讨论时确保字段默认值：**
```javascript
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

---

## 通用排查流程

### 1. 收集错误信息

```bash
# 查看 API 响应
curl -v "http://localhost:18790/api/..."

# 查看服务器日志
tail -f /tmp/mad-web-server.log
```

### 2. 定位错误代码

根据错误信息搜索代码：
```bash
# 搜索错误消息
grep -r "Discussion.*not found" orchestrator.js

# 搜索相关方法
grep -n "mergeDiscussions\|findSimilar" orchestrator.js
```

### 3. 添加调试日志

```javascript
console.log(`[DEBUG] Variable:`, variable);
console.log(`[DEBUG] Type:`, typeof variable);
console.log(`[DEBUG] Exists:`, map.has(key));
```

### 4. 逐步追踪

1. 在方法入口添加日志
2. 在关键步骤添加日志
3. 在条件分支添加日志
4. 运行测试，观察日志输出
5. 定位问题发生的确切位置

### 5. 验证修复

```bash
# 重启服务器
pkill -f "node server.js"
cd web && node server.js &

# 测试 API
curl -X POST "http://localhost:18790/api/discussion/..." \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## 最佳实践

### 1. 异步操作

```javascript
// ❌ 错误
async init() {
  this.initializeSimilarityDetector();  // 不等待
  return result;
}

// ✅ 正确
async init() {
  await this.initializeSimilarityDetector();  // 等待完成
  return result;
}
```

### 2. 空值检查

```javascript
// ❌ 错误
obj.property.forEach(item => { ... });

// ✅ 正确
if (obj && obj.property) {
  obj.property.forEach(item => { ... });
}

// ✅ 更好（可选链）
obj?.property?.forEach?.(item => { ... });
```

### 3. 数据一致性

```javascript
// ❌ 错误
const value = map.get(key);
value.forEach(...);  // value 可能为 undefined

// ✅ 正确
if (!map.has(key)) {
  return;
}
const value = map.get(key);
value.forEach(...);
```

### 4. 方法调用

```javascript
// ❌ 错误：重复操作
collection.delete(id);
await deleteItem(id);  // 内部会检查 id 是否存在

// ✅ 正确：单一职责
await deleteItem(id);  // 让方法完整处理
```

---

## 工具和技巧

### 调试命令

```bash
# 实时查看日志
tail -f /tmp/mad-web-server.log

# 搜索错误
grep -i "error\|fail" /tmp/mad-web-server.log

# 查看最近的错误
tail -100 /tmp/mad-web-server.log | grep -A 5 -B 5 "error"
```

### Git 工作流

```bash
# 查看修改
git diff

# 暂存修复文件
git add orchestrator.js src/core/similarity.js

# 提交修复
git commit -m "fix: 问题描述和修复内容"

# 推送到 GitHub
git push origin main
```

### 测试 API

```bash
# GET 请求
curl -s "http://localhost:18790/api/discussions" | jq '.'

# POST 请求
curl -s -X POST "http://localhost:18790/api/discussion/..." \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}' | jq '.'
```

---

## 相关文档

- [修复记录：相似讨论 API](../memory/2026-02-02-fix-similar-api.md)
- [修复记录：合并讨论 API](../memory/2026-02-02-fix-merge-final.md)
- [防御性空值检查](../memory/2026-02-02-defensive-null-checks.md)
- [GitHub Commits](https://github.com/OTTTTTO/MAD/commits/main)

---

**最后更新：** 2026-02-02
**维护者：** MAD 开发团队
