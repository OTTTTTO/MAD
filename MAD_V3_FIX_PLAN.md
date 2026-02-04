# MAD v3.0 完善计划（修复概念混乱 + 恢复 Token 功能）

**目标：** 修复当前 v3.0 的概念混乱，恢复丢失的 Token 核心功能

**日期：** 2026-02-03
**版本：** v3.7.0（继续在 v3.0 上优化）

---

## 🚨 当前问题

### 1. 概念混乱（核心问题）
- ✗ `Discussion` 和 `ProjectGroup` 两个概念并存
- ✗ `DiscussionOrchestrator` 和 `ProjectManager` 功能重叠
- ✗ `data/discussions/` 和 `data/projects/` 两套存储
- ✗ API 混乱：`/api/discussions/*` 和 `/api/projects/*`

**根源：** v3.0 重构不彻底，引入了"项目组"概念，但未完全替代"讨论组"

### 2. Token 功能丢失（核心功能）
根据 README v3.0 介绍，应该有：
- ❌ Token 使用量自动统计
- ❌ 上下文智能压缩
- ❌ Token 预算控制
- ❌ Token 消耗优化

**当前状态：**
- `Discussion` 类中**没有** `totalTokens` 字段
- `ProjectGroup` 类中有 `totalTokens`，但这是两套系统
- **没有**上下文压缩功能
- **没有** Token 预算控制

### 3. 功能不完整
README 承诺的 v3.0 功能：
- ❌ 智能标记系统（部分实现，但在 ProjectGroup 中）
- ❌ Token 智能管理（基本缺失）
- ✅ 自然语言创建（已实现）
- ⚠️ 自主推进（部分实现）

---

## 🎯 修复目标

### 统一概念（首要任务）

**只使用 Discussion 概念，移除所有 Project 相关代码**

```
之前：Discussion + ProjectGroup（混乱）
      ↓
修复后：只有 Discussion（统一）
```

**保留的 API：**
- `createDiscussion(topic, options)`
- `endDiscussion(id)`
- `listDiscussions()`
- 等...

**移除的文件：**
- `src/models/project-group.js`
- `src/core/project-manager.js`
- `src/core/project-flow.js`
- `src/v3-integration.js`
- `data/projects/`（迁移到 `data/discussions/`）

---

### 恢复 Token 功能（核心功能）

#### 1. Token 统计
**文件：** `orchestrator.js`

```javascript
class DiscussionContext {
  constructor(id, topic, participants) {
    // ... 现有字段

    // 🆕 Token 统计
    this.totalTokens = 0;         // 总 Token 消耗
    this.inputTokens = 0;         // 输入 Token
    this.outputTokens = 0;        // 输出 Token
    this.tokenHistory = [];       // Token 使用历史
  }

  addMessage(role, content, metadata = {}) {
    // ... 现有逻辑

    // 🆕 记录 Token 使用
    if (metadata.tokens) {
      this.totalTokens += metadata.tokens.total || 0;
      this.inputTokens += metadata.tokens.input || 0;
      this.outputTokens += metadata.tokens.output || 0;

      this.tokenHistory.push({
        timestamp: Date.now(),
        messageId: message.id,
        role: role,
        tokens: metadata.tokens
      });
    }
  }

  // 🆕 获取 Token 统计
  getTokenStats() {
    return {
      total: this.totalTokens,
      input: this.inputTokens,
      output: this.outputTokens,
      avgPerMessage: this.messages.length > 0
        ? Math.round(this.totalTokens / this.messages.length)
        : 0
    };
  }
}
```

#### 2. 上下文压缩
**新增文件：** `src/core/context-compressor.js`

```javascript
class ContextCompressor {
  constructor() {
    this.maxTokens = 100000;      // 约 130k tokens 的硬限制
    this.compressThreshold = 80000; // 接近 100k 时开始压缩
  }

  /**
   * 压缩讨论上下文
   * 策略：
   * 1. 保留最近的 N 条消息
   * 2. 保留所有标记（Marker）
   * 3. 保留关键决策
   * 4. 压缩早期消息为摘要
   */
  compressContext(discussion, options = {}) {
    const {
      maxTokens = this.maxTokens,
      keepRecent = 50,
      keepMarkers = true
    } = options;

    if (discussion.totalTokens < this.compressThreshold) {
      // 不需要压缩
      return {
        compressed: false,
        messages: discussion.messages,
        stats: discussion.getTokenStats()
      };
    }

    // 压缩策略
    const compressed = this._compressMessages(discussion, {
      keepRecent,
      keepMarkers
    });

    return {
      compressed: true,
      messages: compressed.messages,
      summary: compressed.summary,
      stats: discussion.getTokenStats(),
      savedTokens: this._calculateSavedTokens(discussion, compressed)
    };
  }

  _compressMessages(discussion, options) {
    const { keepRecent, keepMarkers } = options;
    const messages = discussion.messages;
    const markers = discussion.markers || [];

    // 1. 提取最近的 N 条消息
    const recentMessages = messages.slice(-keepRecent);

    // 2. 保留所有标记
    const markerMessages = markers.map(m => ({
      id: `marker-${m.id}`,
      role: 'marker',
      content: m.summary || m.title,
      timestamp: m.timestamp,
      isMarker: true,
      markerType: m.type
    }));

    // 3. 生成早期消息摘要
    const earlyMessages = messages.slice(0, -keepRecent);
    const summary = this._generateSummary(earlyMessages, markers);

    // 4. 组合：摘要 + 标记 + 最近消息
    return {
      messages: [
        { role: 'system', content: `[早期讨论摘要]\n${summary}` },
        ...markerMessages,
        ...recentMessages
      ],
      summary: summary
    };
  }

  _generateSummary(messages, markers) {
    // 基于标记生成摘要
    if (markers && markers.length > 0) {
      return markers.map(m => `- ${m.title}: ${m.summary}`).join('\n');
    }

    // 简单摘要：每个阶段取一条消息
    const phases = {};
    messages.forEach(msg => {
      const phase = msg.round || 0;
      if (!phases[phase]) {
        phases[phase] = msg;
      }
    });

    return Object.values(phases)
      .map(msg => `[${msg.role}] ${msg.content.slice(0, 100)}...`)
      .join('\n');
  }

  _calculateSavedTokens(discussion, compressed) {
    // 估算节省的 Token 数
    const originalCount = discussion.messages.length;
    const newCount = compressed.messages.length;

    const avgTokens = discussion.totalTokens / originalCount;
    return Math.round((originalCount - newCount) * avgTokens);
  }

  /**
   * 检查是否需要压缩
   */
  needsCompression(discussion) {
    return discussion.totalTokens >= this.compressThreshold;
  }

  /**
   * 获取压缩建议
   */
  getCompressionSuggestions(discussion) {
    const stats = discussion.getTokenStats();

    if (stats.total < this.compressThreshold) {
      return {
        needed: false,
        reason: 'Token 使用量在安全范围内'
      };
    }

    const urgency = stats.total >= this.maxTokens ? 'critical' : 'warning';
    const savedTokens = Math.round(stats.total * 0.4); // 估算可节省 40%

    return {
      needed: true,
      urgency: urgency,
      reason: `Token 使用量 ${stats.total} 已接近限制 ${this.maxTokens}`,
      suggestion: `建议压缩上下文，预计可节省 ~${savedTokens} tokens`,
      savedTokens: savedTokens
    };
  }
}

module.exports = { ContextCompressor };
```

#### 3. Token 预算控制
**新增方法：** `orchestrator.js`

```javascript
DiscussionOrchestrator.prototype.setTokenBudget = function(discussionId, budget) {
  const context = this.discussions.get(discussionId);
  if (!context) throw new Error(`Discussion ${discussionId} not found`);

  context.tokenBudget = budget;
  context.tokenLimit = budget;  // 硬限制
};

DiscussionOrchestrator.prototype.checkTokenBudget = function(discussionId) {
  const context = this.discussions.get(discussionId);
  if (!context) return null;

  const stats = context.getTokenStats();
  const budget = context.tokenBudget || Infinity;
  const limit = context.tokenLimit || Infinity;

  return {
    used: stats.total,
    budget: budget,
    limit: limit,
    remaining: Math.max(0, budget - stats.total),
    percentage: Math.round((stats.total / budget) * 100),
    exceeded: stats.total > limit,
    warning: stats.total > budget * 0.8  // 超过 80% 警告
  };
};
```

---

## 📋 修复步骤（v3.7.0）

### 步骤 1：统一概念（移除 ProjectGroup）

#### 1.1 合并数据模型
- [ ] 在 `DiscussionContext` 中添加 `category`, `tags`, `notes`, `priority`, `markers` 字段
- [ ] 添加 `totalTokens`, `inputTokens`, `outputTokens`, `tokenHistory` 字段
- [ ] 添加相关方法：`addMarker()`, `addTag()`, `removeTag()`, `setNotes()`, `getTokenStats()`

#### 1.2 合并管理器功能
- [ ] 将 `ProjectManager` 的功能合并到 `DiscussionOrchestrator`
- [ ] 添加方法：
  - `archiveDiscussion()`, `unarchiveDiscussion()`, `getArchivedDiscussions()`
  - `searchDiscussions()`, `getAllTags()`, `addTagToDiscussion()`, `removeTagFromDiscussion()`
  - `exportDiscussion()`, `cloneDiscussion()`, `setDiscussionNotes()`

#### 1.3 统一 API 路由
- [ ] 将 `/api/projects/*` 改为 `/api/discussions/*`
- [ ] 确保所有 API 返回格式一致

#### 1.4 数据迁移
- [ ] 创建迁移脚本：`data/projects/` → `data/discussions/`
- [ ] 迁移 108 个项目数据
- [ ] 验证数据完整性

#### 1.5 清理文件
- [ ] 删除 `src/models/project-group.js`
- [ ] 删除 `src/core/project-manager.js`
- [ ] 删除 `src/core/project-flow.js`
- [ ] 删除 `src/v3-integration.js`
- [ ] 删除 `data/projects/` 目录（迁移后）

#### 1.6 更新测试
- [ ] 更新所有测试，使用 Discussion API
- [ ] 移除 ProjectGroup/ProjectManager 引用
- [ ] 确保所有测试通过

---

### 步骤 2：实现 Token 智能管理

#### 2.1 Token 统计
- [ ] 在 `DiscussionContext` 中添加 Token 字段
- [ ] 修改 `addMessage()` 记录 Token 使用
- [ ] 添加 `getTokenStats()` 方法
- [ ] 添加 `getTokenHistory()` 方法

#### 2.2 上下文压缩
- [ ] 创建 `src/core/context-compressor.js`
- [ ] 实现 `compressContext()` 方法
  - 保留最近 50 条消息
  - 保留所有标记（Marker）
  - 早期消息压缩为摘要
- [ ] 在 `DiscussionOrchestrator` 中集成压缩器

#### 2.3 Token 预算控制
- [ ] 添加 `setTokenBudget(discussionId, budget)` 方法
- [ ] 添加 `checkTokenBudget(discussionId)` 方法
- [ ] 实现超限警告（超过 80%）
- [ ] 实现硬限制（拒绝超限请求）

#### 2.4 自动压缩
- [ ] 在每次 `addMessage()` 后检查 Token 使用量
- [ ] 超过 80,000 tokens 时自动压缩
- [ ] 记录压缩历史

#### 2.5 Token API 接口
- [ ] `GET /api/discussion/:id/tokens` - Token 统计
- [ ] `POST /api/discussion/:id/compress` - 手动压缩
- [ ] `POST /api/discussion/:id/budget` - 设置预算
- [ ] `GET /api/discussion/:id/compression-status` - 压缩状态

---

### 步骤 3：完善智能标记系统

#### 3.1 完善标记检测
- [ ] 完善 `MarkerDetector` 的检测规则
- [ ] 支持 4 种标记类型：milestone, decision, problem, solution
- [ ] 提高检测准确率

#### 3.2 自动标记生成
- [ ] 实现 `MarkerGenerator.generateMarkers()`
- [ ] 每次发言后自动检测是否需要标记
- [ ] 提供标记建议

#### 3.3 集成到 Discussion
- [ ] `DiscussionContext` 中集成标记功能
- [ ] 添加 `getMarkers()`, `addMarker()` 方法

#### 3.4 标记 API
- [ ] `GET /api/discussion/:id/markers` - 获取所有标记
- [ ] `POST /api/discussion/:id/marker` - 手动添加标记
- [ ] `POST /api/discussion/:id/markers/generate` - 自动生成标记

---

### 步骤 4：测试与文档

#### 4.1 测试覆盖
- [ ] 所有现有测试通过
- [ ] 新增 Token 功能测试
- [ ] 新增标记功能测试
- [ ] 新增数据迁移测试

#### 4.2 文档更新
- [ ] 更新 README.md
    - 移除所有"项目组"相关描述
    - 添加 Token 智能管理说明
    - 添加智能标记系统说明
- [ ] 更新 CHANGELOG.md（v3.7.0）
- [ ] 创建 Token 功能使用文档
- [ ] 创建数据迁移指南

#### 4.3 发布准备
- [ ] 代码审查
- [ ] 性能测试
- [ ] 最终测试
- [ ] 发布 v3.7.0

---

## 📊 版本计划

**所有功能在 v3.7.x 系列中迭代完成**

| 版本 | 主要内容 | 状态 |
|------|---------|------|
| **v3.7.0** | 统一概念 + Token 功能 + 智能标记（大版本） | 🚀 开发中 |
| **v3.7.1** | Bug 修复和小优化 | 计划中 |
| **v3.7.2** | 功能增强（根据反馈） | 计划中 |
| ... | 持续迭代 | ... |

**v3.7.0 包含的三大核心功能：**
1. ✅ 统一概念（移除 ProjectGroup）
2. ✅ Token 智能管理（统计、压缩、预算）
3. ✅ 智能标记系统（自动检测重要时刻）

---

## 🎯 成功标准

### 概念统一
- ✅ 代码中只有一个概念：Discussion
- ✅ 数据只存储在一个位置：`data/discussions/`
- ✅ API 统一：`/api/discussions/*`

### Token 功能
- ✅ 自动统计 Token 使用量
- ✅ 上下文自动压缩（超过 80k tokens）
- ✅ Token 预算控制和警告
- ✅ 避免超过 130k tokens 硬限制

### 功能完整
- ✅ README 承诺的所有功能都实现
- ✅ 所有测试通过
- ✅ 文档完整且准确

---

## 📝 v3.7.0 执行检查清单

### 统一概念（移除 ProjectGroup）
- [ ] Discussion 类合并 ProjectGroup 功能
- [ ] DiscussionOrchestrator 合并 ProjectManager 功能
- [ ] API 路由统一（/api/projects/* → /api/discussions/*）
- [ ] 数据迁移脚本（data/projects/ → data/discussions/）
- [ ] 删除 Project 相关文件
- [ ] 更新测试
- [ ] 所有测试通过

### Token 智能管理
- [ ] Token 统计实现（totalTokens, inputTokens, outputTokens）
- [ ] 上下文压缩实现（ContextCompressor）
- [ ] Token 预算控制实现
- [ ] 自动压缩触发（>80k tokens）
- [ ] Token API 接口实现
- [ ] 测试覆盖
- [ ] 所有测试通过

### 智能标记系统
- [ ] 智能标记完善（MarkerDetector, MarkerGenerator）
- [ ] 集成到 Discussion 类
- [ ] 标记 API 接口
- [ ] 测试覆盖
- [ ] 所有测试通过

### 测试与文档
- [ ] 更新 README.md（移除"项目组"概念）
- [ ] 更新 CHANGELOG.md（v3.7.0）
- [ ] 添加 Token 功能文档
- [ ] 添加标记功能文档
- [ ] 最终测试
- [ ] 发布 v3.7.0

### 小版本迭代准备
- [ ] 收集用户反馈
- [ ] 规划 v3.7.1 修复内容
- [ ] 规划 v3.7.2 增强内容

---

**创建时间：** 2026-02-03 07:55
**更新时间：** 2026-02-03 07:58
**状态：** 待执行
**优先级：** 🔥 高（修复核心问题）
**版本策略：** v3.7.0（大版本）+ v3.7.1/2...（小版本迭代）
