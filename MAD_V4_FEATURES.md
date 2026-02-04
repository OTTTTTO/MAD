# MAD v4.0 功能清单（重构后）

**更新时间：** 2026-02-03
**版本：** v4.0.0（重构计划中）

## 📋 功能总览

重构后，MAD 将拥有 **统一的概念**（讨论组）和 **完整的功能**。

---

## 1️⃣ 核心讨论功能

### 1.1 讨论创建与管理

#### `createDiscussion(topic, options)`
创建新的讨论组
- **参数：**
  - `topic` (string) - 讨论主题
  - `options` (object)
    - `participants` (array) - 参与者列表
    - `category` (string) - 类别：需求讨论、功能研发、功能测试、文档编写
    - `description` (string) - 描述
    - `templateId` (string) - 模板 ID
    - `tags` (array) - 初始标签
    - `priority` (string) - 优先级：low, medium, high, critical
- **返回：** `{ discussionId, context }`
- **新增功能：** 支持 category, tags, priority

#### `endDiscussion(discussionId)`
结束讨论
- **参数：** `discussionId` (string)
- **返回：** DiscussionContext
- **功能：** 标记讨论为已结束，生成总结

#### `deleteDiscussion(discussionId)`
删除讨论
- **参数：** `discussionId` (string)
- **功能：** 永久删除讨论及其数据

#### `listDiscussions(options)`
列出所有讨论
- **参数：**
  - `options.status` (string) - 筛选状态：active, ended, archived
  - `options.limit` (number) - 限制数量
  - `options.offset` (number) - 偏移量
- **返回：** DiscussionContext[]
- **新增功能：** 支持按状态筛选

#### `getDiscussion(discussionId)`
获取单个讨论
- **参数：** `discussionId` (string)
- **返回：** DiscussionContext（含完整信息）

---

### 1.2 Agent 发言

#### `agentSpeak(discussionId, agentId, content, options)`
Agent 发言
- **参数：**
  - `discussionId` (string)
  - `agentId` (string) - Agent ID
  - `content` (string) - 发言内容
  - `options` (object)
    - `isMarker` (boolean) - 是否为标记
    - `markerData` (object) - 标记数据
- **返回：** Message
- **功能：** 添加消息到讨论流

#### `getLatestMessages(discussionId, limit)`
获取最新消息
- **参数：** `limit` (number) - 消息数量
- **返回：** Message[]

#### `getMessagesPaginated(discussionId, page, pageSize)`
分页获取消息
- **参数：**
  - `page` (number) - 页码
  - `pageSize` (number) - 每页数量
- **返回：** `{ data: Message[], pagination: {...} }`

#### `getMessagesByRole(discussionId, role)`
按角色获取消息
- **参数：** `role` (string) - Agent 角色
- **返回：** Message[]

#### `getMessagesByTimeRange(discussionId, startTime, endTime)`
按时间范围获取消息
- **参数：**
  - `startTime` (timestamp)
  - `endTime` (timestamp)
- **返回：** Message[]

#### `getMessageStats(discussionId)`
获取消息统计
- **返回：** `{ totalMessages, avgMessageLength, ... }`

---

### 1.3 搜索与相似度

#### `search(query)`
全局搜索
- **参数：** `query` (string) - 搜索关键词
- **返回：** `{ total, discussions, messages }`
- **搜索范围：** 讨论主题、消息内容

#### `findSimilarDiscussions(discussionId, threshold, limit)`
查找相似讨论
- **参数：**
  - `threshold` (number) - 相似度阈值（0-1）
  - `limit` (number) - 返回数量
- **返回：** SimilarDiscussion[]
- **算法：** TF-IDF + 余弦相似度

#### `calculateDiscussionSimilarity(id1, id2)`
计算两个讨论的相似度
- **返回：** 相似度分数（0-1）

---

## 2️⃣ 智能标记系统（v3.3 新增）

### 2.1 标记管理

#### `addMarker(discussionId, marker)`
添加标记
- **参数：**
  - `marker` (object)
    - `title` (string) - 标记标题
    - `type` (string) - 类型：milestone, decision, problem, solution
    - `summary` (string) - 摘要
    - `conclusions` (array) - 结论列表
    - `tags` (array) - 标签
- **返回：** Marker
- **功能：** 手动添加重要时刻标记

#### `getMarkers(discussionId)`
获取所有标记
- **返回：** Marker[]

#### `generateMarkers(discussionId, options)`
自动生成标记
- **参数：**
  - `options.maxMarkers` (number) - 最大标记数
  - `options.minConfidence` (number) - 最小置信度
- **返回：** Marker[]
- **功能：** AI 自动检测重要时刻

---

### 2.2 智能分析

#### `analyzeDiscussion(discussionId)`
分析讨论内容
- **返回：** AnalysisResult
- **功能：** 分析讨论阶段、冲突、共识等

#### `detectDiscussionPhase(messages)`
检测讨论阶段
- **参数：** `messages` (Message[])
- **返回：** 阶段：initializing, discussing, deciding, concluding

#### `generateSmartSummary(discussionId)`
生成智能摘要
- **返回：** 摘要文本
- **功能：** 基于标记生成讨论总结

---

## 3️⃣ 标签与分类（新增）

### 3.1 标签管理

#### `addTagToDiscussion(discussionId, tag)`
添加标签
- **参数：** `tag` (string)
- **返回：** 标签列表

#### `removeTagFromDiscussion(discussionId, tag)`
移除标签
- **参数：** `tag` (string)
- **返回：** 标签列表

#### `getDiscussionTags(discussionId)`
获取讨论标签
- **返回：** string[]

#### `getAllTags()`
获取所有标签及使用次数
- **返回：** `[{ tag, count }, ...]`

#### `findDiscussionsByTag(tag)`
按标签查找讨论
- **参数：** `tag` (string)
- **返回：** DiscussionContext[]

---

### 3.2 分类管理

#### `createDiscussion(name, category, options)`
创建讨论（指定类别）
- **类别：**
  - `需求讨论` - 需求分析、评审
  - `功能研发` - 功能开发
  - `功能测试` - 测试验证
  - `文档编写` - 文档创作

#### `getDiscussionsByCategory(category)`
按类别获取讨论
- **返回：** DiscussionContext[]

#### `getCategories()`
获取所有类别及统计
- **返回：** `[{ category, count }, ...]`

---

## 4️⃣ 归档与清理

### 4.1 归档管理

#### `archiveDiscussion(discussionId)`
归档讨论
- **功能：** 将讨论标记为已归档，不在活跃列表显示
- **返回：** DiscussionContext

#### `unarchiveDiscussion(discussionId)`
取消归档
- **功能：** 恢复归档的讨论
- **返回：** DiscussionContext

#### `getArchivedDiscussions()`
获取已归档讨论
- **返回：** DiscussionContext[]

#### `getActiveDiscussions()`
获取活跃讨论
- **返回：** DiscussionContext[]（排除已归档和已结束）

#### `getEndedDiscussions()`
获取已结束讨论
- **返回：** DiscussionContext[]

---

### 4.2 清理功能

#### `clearDiscussion(discussionId)`
清空讨论内容
- **功能：** 删除所有消息，保留讨论结构
- **返回：** DiscussionContext

#### `archiveOldDiscussions(days)`
自动归档旧讨论
- **参数：** `days` (number) - 天数阈值
- **功能：** 归档 N 天未更新的讨论

#### `clearEndedDiscussions()`
清理已结束的讨论
- **功能：** 批量删除已结束的讨论

---

## 5️⃣ 导出与分享

### 5.1 导出功能

#### `exportDiscussion(discussionId, format)`
导出讨论
- **参数：** `format` (string) - markdown, json
- **返回：** `{ format, content, size }`
- **Markdown 包含：** 标题、参与者、统计、标记、消息流
- **JSON 包含：** 完整数据，可用于备份

#### `exportAllDiscussions(format)`
批量导出所有讨论
- **参数：** `format` (string)
- **返回：** `[{ discussionId, format, content, size }, ...]`

#### `exportToMarkdown(discussionId, outputPath)`
导出为 Markdown 文件
- **参数：** `outputPath` (string) - 输出路径
- **返回：** 文件路径

#### `exportToJSON(discussionId, outputPath)`
导出为 JSON 文件
- **参数：** `outputPath` (string) - 输出路径
- **返回：** 文件路径

---

### 5.2 克隆功能

#### `cloneDiscussion(discussionId, options)`
克隆讨论
- **参数：**
  - `options.name` (string) - 新名称
  - `options.keepMessages` (boolean) - 是否保留消息
- **返回：** 新的 DiscussionContext
- **功能：** 基于现有讨论创建副本，清空消息流
- **保留：** category, tags, participants, description
- **清空：** messages, markers, stats

---

## 6️⃣ 备注功能（新增）

#### `setDiscussionNotes(discussionId, notes)`
设置备注
- **参数：** `notes` (string) - 备注文本
- **返回：** DiscussionContext
- **功能：** 覆盖式设置备注

#### `appendDiscussionNotes(discussionId, text)`
追加备注
- **参数：** `text` (string) - 追加文本
- **返回：** DiscussionContext
- **功能：** 自动添加时间戳，追加内容

#### `getDiscussionNotes(discussionId)`
获取备注
- **返回：** 备注文本

---

## 7️⃣ 统计分析

### 7.1 讨论统计

#### `getDiscussionStats(discussionId)`
获取详细统计
- **返回：**
  ```javascript
  {
    totalMessages: number,
    totalMarkers: number,
    totalTokens: number,
    progress: number,
    participantCount: number,
    createdAt: timestamp,
    updatedAt: timestamp
  }
  ```

#### `getStatistics()`
获取全局统计
- **返回：**
  ```javascript
  {
    totalDiscussions: number,
    activeDiscussions: number,
    endedDiscussions: number,
    archivedDiscussions: number,
    totalMessages: number,
    totalMarkers: number,
    totalTags: number,
    totalParticipants: number
  }
  ```

#### `getStorageUsage()`
获取存储使用情况
- **返回：**
  ```javascript
  {
    totalSize: number,
    discussionsCount: number,
    avgSize: number
  }
  ```

---

### 7.2 搜索统计

#### `getSearchHistory(limit)`
获取搜索历史
- **参数：** `limit` (number)
- **返回：** `[{ query, timestamp, resultsCount }, ...]`

#### `getHotKeywords(limit)`
获取热门关键词
- **参数：** `limit` (number)
- **返回：** `[{ keyword, count }, ...]`

#### `getSearchSuggestions(query, limit)`
获取搜索建议
- **参数：**
  - `query` (string) - 查询前缀
  - `limit` (number)
- **返回：** string[]

#### `getSearchStats()`
获取搜索统计
- **返回：**
  ```javascript
  {
    totalSearches: number,
    uniqueQueries: number,
    avgResults: number
  }
  ```

---

## 8️⃣ Agent 性能分析

#### `analyzeAgentPerformance(discussionId)`
分析 Agent 性能
- **返回：** AgentPerformanceReport
  - 发言次数
  - 平均响应时间
  - 质量评分
  - 贡献度

#### `getAgentLeaderboard(limit)`
获取 Agent 排行榜
- **参数：** `limit` (number)
- **返回：** `[{ agentId, name, score, ... }, ...]`

#### `compareAgents(agentId1, agentId2)`
对比两个 Agent
- **返回：** ComparisonReport

---

## 9️⃣ 质量评分

#### `calculateQualityScore(discussionId)`
计算讨论质量分
- **返回：**
  ```javascript
  {
    overallScore: number,
    participationScore: number,
    diversityScore: number,
    depthScore: number,
    consensusScore: number
  }
  ```

#### `startRealtimeScoring(discussionId)`
启动实时评分
- **功能：** 每次发言后自动更新分数

#### `stopRealtimeScoring(discussionId)`
停止实时评分

#### `getScoreHistory(discussionId)`
获取评分历史
- **返回：** `[{ timestamp, score }, ...]`

#### `getScoreTrend(discussionId)`
获取评分趋势
- **返回：** TrendData

#### `getScoreRadarData(discussionId)`
获取雷达图数据
- **返回：** RadarData

---

## 🔟 智能建议

#### `generateSuggestions(discussionId, options)`
生成智能建议
- **参数：**
  - `options.type` (string) - all, participants, quality, topics
  - `options.maxSuggestions` (number)
- **返回：** Suggestion[]

#### `dismissSuggestion(discussionId, suggestionId)`
忽略建议
- **功能：** 标记建议为已忽略

#### `applySuggestion(discussionId, suggestionId)`
应用建议
- **功能：** 执行建议的操作

#### `getSuggestionStats(discussionId)`
获取建议统计
- **返回：** `{ total, applied, dismissed, pending }`

---

## 1️⃣1️⃣ 模板系统

#### `getTemplates()`
获取所有模板
- **返回：** Template[]

#### `getTemplate(templateId)`
获取单个模板
- **返回：** Template

#### `createDiscussionFromTemplate(templateId, params)`
从模板创建讨论
- **参数：**
  - `templateId` (string)
  - `params` (object) - 模板参数
- **返回：** DiscussionContext

#### `createUserTemplate(name, config)`
创建自定义模板
- **返回：** Template

#### `updateUserTemplate(templateId, config)`
更新自定义模板
- **返回：** Template

#### `deleteUserTemplate(templateId)`
删除自定义模板

#### `searchTemplates(query)`
搜索模板
- **参数：** `query` (string)
- **返回：** Template[]

---

## 1️⃣2️⃣ 缓存管理

#### `clearCache()`
清空所有缓存
- **功能：** 清空讨论和消息缓存

#### `getCacheStats()`
获取缓存统计
- **返回：**
  ```javascript
  {
    discussions: { size, maxSize },
    messages: { size, maxSize }
  }
  ```

#### `clearDiscussionCache(discussionId)`
清空指定讨论的缓存

---

## 1️⃣3️⃣ 快照与对比

#### `createSnapshot(discussionId, label)`
创建快照
- **参数：** `label` (string) - 快照标签
- **返回：** Snapshot

#### `getSnapshots(discussionId)`
获取所有快照
- **返回：** Snapshot[]

#### `getSnapshotsPaginated(discussionId, page, pageSize)`
分页获取快照

#### `compareDiscussions(id1, id2)`
对比两个讨论
- **返回：** ComparisonResult

#### `compareSnapshots(discussionId, snapshotId1, snapshotId2)`
对比两个快照
- **返回：** ComparisonResult

---

## 1️⃣4️⃣ 冲突与共识

#### `detectConflicts(discussionId)`
检测冲突
- **返回：** Conflict[]

#### `getConsensus(discussionId)`
获取共识
- **返回：** Consensus

#### `resolveConflict(discussionId, conflictId, resolution)`
解决冲突
- **参数：** `resolution` (string) - 解决方案

---

## 1️⃣5️⃣ 提及与引用

#### `getMentions(discussionId)`
获取所有提及
- **返回：** Mention[]

#### `getMentionsForAgent(discussionId, agentId)`
获取针对特定 Agent 的提及
- **返回：** Mention[]

#### `getMessagesMentioned(discussionId, messageId)`
获取被提及的消息
- **返回：** Message[]

---

## 1️⃣6️⃣ 参与者管理

#### `getParticipants(discussionId)`
获取参与者列表
- **返回：** Participant[]

#### `addParticipant(discussionId, participant)`
添加参与者
- **参数：** `participant` (object)
- **返回：** Participant[]

#### `removeParticipant(discussionId, participantId)`
移除参与者

#### `getParticipantStats(discussionId)`
获取参与者统计
- **返回：**
  ```javascript
  {
    total: number,
    byRole: { [role]: count },
    active: number,
    inactive: number
  }
  ```

---

## 📊 API 路由总览

重构后，所有 API 将统一使用 `/api/discussions/*` 前缀：

### 讨论管理
- `GET /api/discussions` - 列出讨论
- `GET /api/discussion/:id` - 获取单个讨论
- `POST /api/discussion` - 创建讨论
- `DELETE /api/discussion/:id` - 删除讨论
- `POST /api/discussion/:id/end` - 结束讨论

### 消息管理
- `GET /api/discussion/:id/messages` - 获取消息
- `POST /api/discussion/:id/speak` - Agent 发言
- `GET /api/discussion/:id/messages/latest` - 最新消息
- `GET /api/discussion/:id/messages/paginated` - 分页消息

### 标记系统
- `GET /api/discussion/:id/markers` - 获取标记
- `POST /api/discussion/:id/marker` - 添加标记
- `POST /api/discussion/:id/markers/generate` - 自动生成标记

### 标签管理
- `GET /api/discussion/:id/tags` - 获取标签
- `POST /api/discussion/:id/tags` - 添加标签
- `DELETE /api/discussion/:id/tags/:tag` - 删除标签
- `GET /api/tags` - 所有标签
- `GET /api/discussions/by-tag/:tag` - 按标签搜索

### 统计分析
- `GET /api/discussion/:id/stats` - 讨论统计
- `GET /api/statistics` - 全局统计
- `GET /api/discussion/:id/quality` - 质量评分
- `GET /api/discussion/:id/performance` - Agent 性能

### 导出分享
- `GET /api/discussion/:id/export` - 导出讨论
- `POST /api/discussion/:id/clone` - 克隆讨论
- `GET /api/export/all` - 批量导出

### 搜索功能
- `GET /api/discussions/search` - 搜索讨论
- `GET /api/discussion/:id/similar` - 相似讨论
- `GET /api/search/history` - 搜索历史
- `GET /api/search/suggestions` - 搜索建议

---

## 🎯 数据模型：Discussion

重构后，`Discussion` 类将包含所有功能：

```javascript
class Discussion {
  constructor(id, topic, category) {
    // 基础信息
    this.id = id;
    this.topic = topic;
    this.category = category;  // 🆕 需求讨论 | 功能研发 | 功能测试 | 文档编写
    this.description = '';
    
    // 内容
    this.messages = [];
    this.markers = [];  // 🆕 智能标记
    this.participants = [];
    
    // 元数据
    this.tags = [];  // 🆕 标签
    this.notes = '';  // 🆕 备注
    this.priority = 'medium';  // 🆕 low | medium | high | critical
    this.status = 'active';  // active | ended | archived
    
    // 统计
    this.stats = {
      totalMessages: 0,
      totalMarkers: 0,  // 🆕
      totalTokens: 0,  // 🆕
      progress: 0,  // 🆕
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // v2.x 原有字段
    this.rounds = 0;
    this.conflicts = [];
    this.consensus = new Map();
    this.agentStates = new Map();
  }
  
  // 🆕 新增方法
  addMarker(marker) { ... }
  addTag(tag) { ... }
  removeTag(tag) { ... }
  setNotes(notes) { ... }
  appendNotes(text) { ... }
  getMarkers() { ... }
  getTags() { ... }
}
```

---

## ✅ 重构检查清单

- [ ] Discussion 类合并 ProjectGroup 功能
- [ ] DiscussionOrchestrator 合并 ProjectManager 功能
- [ ] API 路由统一为 `/api/discussions/*`
- [ ] 数据迁移：`data/projects/` → `data/discussions/`
- [ ] 删除 Project 相关文件
- [ ] 更新所有测试
- [ ] 更新文档
- [ ] 所有测试通过

---

**文档版本：** v1.0
**最后更新：** 2026-02-03 07:50
