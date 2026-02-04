# v3.0 功能迁移清单 - 检查是否有遗漏

**目标：** 将 ProjectGroup 的所有功能迁移到 Discussion，确保不遗漏任何功能

**检查日期：** 2026-02-03

---

## 📋 功能清单总览

| 类别 | 功能数 | 状态 |
|------|--------|------|
| ProjectGroup 数据模型 | 13 个字段 + 11 个方法 | 📝 待检查 |
| ProjectManager 管理功能 | 30+ 个方法 | 📝 待检查 |
| ProjectFlowManager 流管理 | 6 个方法 | 📝 待检查 |
| V3Integration 集成 | 25+ 个方法 | 📝 待检查 |

---

## 1️⃣ ProjectGroup 数据模型（13 个字段 + 11 个方法）

### ✅ 字段（需要添加到 DiscussionContext）

| 字段 | 类型 | 说明 | 迁移到 | 状态 |
|------|------|------|--------|------|
| `id` | string | 讨论组 ID | ✅ 已有 | - |
| `name` | string | 名称 | ✅ 已有（`topic`） | - |
| `category` | string | 类别 | ❌ 新增 | 📝 待添加 |
| `description` | string | 描述 | ❌ 新增 | 📝 待添加 |
| `messages` | array | 消息数组 | ✅ 已有 | - |
| `markers` | array | 标记数组 | ❌ 新增 | 📝 待添加 |
| `participants` | array | 参与者 | ✅ 已有 | - |
| `tags` | array | 标签 | ❌ 新增 | 📝 待添加 |
| `notes` | string | 备注 | ❌ 新增 | 📝 待添加 |
| `priority` | string | 优先级 | ❌ 新增 | 📝 待添加 |
| `stats.totalMessages` | number | 总消息数 | ✅ 已有 | - |
| `stats.totalMarkers` | number | 总标记数 | ❌ 新增 | 📝 待添加 |
| `stats.totalTokens` | number | 总 Token 数 | ❌ 新增 | 📝 待添加 |
| `stats.progress` | number | 进度百分比 | ❌ 新增 | 📝 待添加 |
| `stats.createdAt` | timestamp | 创建时间 | ✅ 已有 | - |
| `stats.updatedAt` | timestamp | 更新时间 | ❌ 新增 | 📝 待添加 |
| `status` | string | 状态 | ⚠️ 部分有 | 📝 需扩展 |

**新增字段数：** 9 个

---

### ✅ 方法（需要添加到 DiscussionContext）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `addMessage(message)` | 添加消息 | ✅ 已有 | - |
| `addMarker(marker)` | 添加标记 | ❌ 新增 | 📝 待添加 |
| `updateTokenCount(tokens)` | 更新 Token | ❌ 新增 | 📝 待添加 |
| `addTag(tag)` | 添加标签 | ❌ 新增 | 📝 待添加 |
| `removeTag(tag)` | 移除标签 | ❌ 新增 | 📝 待添加 |
| `hasTag(tag)` | 检查标签 | ❌ 新增 | 📝 待添加 |
| `getTags()` | 获取标签 | ❌ 新增 | 📝 待添加 |
| `setNotes(notes)` | 设置备注 | ❌ 新增 | 📝 待添加 |
| `getNotes()` | 获取备注 | ❌ 新增 | 📝 待添加 |
| `appendNotes(text)` | 追加备注 | ❌ 新增 | 📝 待添加 |
| `setPriority(priority)` | 设置优先级 | ❌ 新增 | 📝 待添加 |
| `getPriority()` | 获取优先级 | ❌ 新增 | 📝 待添加 |
| `getPriorityValue()` | 获取优先级数值 | ❌ 新增 | 📝 待添加 |

**新增方法数：** 11 个

---

## 2️⃣ ProjectManager 管理功能（30+ 个方法）

### ✅ 基础 CRUD（6 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `createProject(name, category, options)` | 创建项目 | ✅ 已有（`createDiscussion`） | - |
| `getProject(projectId)` | 获取项目 | ✅ 已有（`getDiscussion`） | - |
| `listProjects(filters)` | 列出项目 | ✅ 已有（`listDiscussions`） | - |
| `updateProject(projectId, updates)` | 更新项目 | ❌ 新增 | 📝 待添加 |
| `deleteProject(projectId)` | 删除项目 | ✅ 已有（`deleteDiscussion`） | - |
| `loadProject(projectId)` | 加载项目 | ⚠️ 部分有 | 📝 需增强 |

### ✅ 搜索与统计（5 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `searchProjects(keyword, options)` | 搜索项目 | ⚠️ 部分有（`search`） | 📝 需增强 |
| `getStatistics()` | 获取统计 | ❌ 新增 | 📝 待添加 |
| `getProjectsByCategory()` | 按类别分组 | ❌ 新增 | 📝 待添加 |

### ✅ 标签管理（4 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `findProjectsByTag(tag)` | 按标签搜索 | ❌ 新增 | 📝 待添加 |
| `getAllTags()` | 获取所有标签 | ❌ 新增 | 📝 待添加 |
| `addTagToProject(projectId, tag)` | 添加标签 | ❌ 新增 | 📝 待添加 |
| `removeTagFromProject(projectId, tag)` | 移除标签 | ❌ 新增 | 📝 待添加 |

### ✅ 导出功能（3 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `exportProject(projectId, format)` | 导出项目 | ⚠️ 部分有 | 📝 需增强 |
| `exportAllProjects(format)` | 批量导出 | ❌ 新增 | 📝 待添加 |
| `exportProjectToMarkdown()` | Markdown 导出 | ⚠️ 部分有 | 📝 需增强 |
| `exportProjectToJSON()` | JSON 导出 | ⚠️ 部分有 | 📝 需增强 |

### ✅ 归档功能（4 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `archiveProject(projectId)` | 归档项目 | ❌ 新增 | 📝 待添加 |
| `unarchiveProject(projectId)` | 取消归档 | ❌ 新增 | 📝 待添加 |
| `getArchivedProjects()` | 获取已归档 | ❌ 新增 | 📝 待添加 |
| `getActiveProjects()` | 获取活跃项目 | ❌ 新增 | 📝 待添加 |
| `getCompletedProjects()` | 获取已完成项目 | ❌ 新增 | 📝 待添加 |

### ✅ 克隆功能（1 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `cloneProject(projectId, newName)` | 克隆项目 | ❌ 新增 | 📝 待添加 |

### ✅ 备注功能（3 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `setProjectNotes(projectId, notes)` | 设置备注 | ❌ 新增 | 📝 待添加 |
| `appendProjectNotes(projectId, text)` | 追加备注 | ❌ 新增 | 📝 待添加 |
| `getProjectNotes(projectId)` | 获取备注 | ❌ 新增 | 📝 待添加 |

**ProjectManager 新增方法数：** 20+ 个

---

## 3️⃣ ProjectFlowManager 流管理（6 个方法）

### ✅ 消息流管理（4 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `addMessage(projectId, message)` | 添加消息 | ✅ 已有（`agentSpeak`） | - |
| `getMessages(projectId, options)` | 获取消息 | ⚠️ 部分有 | 📝 需增强 |
| `getCompressedContext(projectId, maxTokens)` | **获取压缩上下文** | ❌ 新增 | 📝 待添加 |
| `getFlowStats(projectId)` | 获取流状态 | ❌ 新增 | 📝 待添加 |

### ✅ Token 管理（2 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `calculateTokens(message)` | **计算 Token 数** | ❌ 新增 | 📝 待添加 |
| `compressMessages(messages)` | **压缩消息** | ❌ 新增 | 📝 待添加 |

**ProjectFlowManager 新增方法数：** 6 个（**重要：Token 压缩功能**）

---

## 4️⃣ V3Integration 集成（25+ 个方法）

### ✅ 自然语言创建（1 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `createProjectFromInput(userInput)` | 自然语言创建项目 | ❌ 新增 | 📝 待添加 |

### ✅ 智能标记（v3.3.0）（4 个）

| 方法 | 说明 | 迁移到 | 状态 |
|------|------|--------|------|
| `detectAndAddMarkers(projectId)` | 检测并添加标记 | ❌ 新增 | 📝 待添加 |
| `optimizeMarkers(projectId)` | 优化标记 | ❌ 新增 | 📝 待添加 |
| `generateProjectSummary(projectId)` | 生成项目总结 | ❌ 新增 | 📝 待添加 |
| `detectDiscussionPhase(projectId)` | 检测讨论阶段 | ❌ 新增 | 📝 待添加 |
| `getMarkerSuggestions(projectId)` | 获取标记建议 | ❌ 新增 | 📝 待添加 |

### ✅ 代理方法（转发到 ProjectManager）

以下方法都是转发到 `projectManager` 的代理方法：

```javascript
// 这些方法在集成时会被合并到 DiscussionOrchestrator
// 不需要单独迁移，但需要确保功能完整

async searchProjects(keyword, options)
async getStatistics()
async findProjectsByTag(tag)
async getAllTags()
async addTagToProject(projectId, tag)
async removeTagFromProject(projectId, tag)
async exportProject(projectId, format)
async exportAllProjects(format)
async archiveProject(projectId)
async unarchiveProject(projectId)
async getArchivedProjects()
async getActiveProjects()
async getCompletedProjects()
async cloneProject(projectId, newName)
async setProjectNotes(projectId, notes)
async appendProjectNotes(projectId, text)
async getProjectNotes(projectId)
```

**V3Integration 新增核心方法数：** 5 个（智能标记）

---

## 5️⃣ 其他相关文件检查

### ExpertManager（专家管理）
**文件：** `src/core/expert-manager.js`

**状态：** ✅ 保留，不删除

**原因：** ExpertManager 管理专家角色配置，与 Discussion 概念独立，应该保留

---

### ProgressManager（进度管理）
**文件：** `src/core/progress-manager.js`

**状态：** ⚠️ 需要评估

**原因：** 进度管理功能可能需要适配到 Discussion

**检查：** 是否在 orchestrator.js 中有类似功能？

---

### MarkerDetector & MarkerGenerator（智能标记）
**文件：** `src/core/marker-detector.js`, `src/core/marker-generator.js`

**状态：** ✅ 保留，需要集成

**原因：** 这是 v3.0 的核心功能，必须集成到 Discussion

---

### SmartAnalyzer（智能分析）
**文件：** `src/core/smart-analyzer.js`

**状态：** ✅ 保留，需要集成

**原因：** 自然语言分析功能，需要集成

---

## 🚨 关键遗漏功能检查

### 1. Token 压缩功能 ⭐⭐⭐

**重要性：** 🔴 极高（v3.0 核心功能）

**位置：** `ProjectFlowManager.getCompressedContext()`

**功能：**
- 自动压缩上下文
- 保留标记和最近消息
- 简化早期消息为摘要

**迁移目标：** `DiscussionOrchestrator`

**新方法：**
```javascript
async getCompressedContext(discussionId, maxTokens = 80000)
async compressMessages(messages)
async calculateTokens(message)
```

**状态：** ❌ 未迁移，**必须添加**

---

### 2. Token 统计功能 ⭐⭐⭐

**重要性：** 🔴 极高（v3.0 核心功能）

**位置：** `ProjectGroup.stats.totalTokens`, `ProjectFlowManager.calculateTokens()`

**功能：**
- 统计总 Token 使用量
- 每条消息的 Token 数
- Token 使用历史

**迁移目标：** `DiscussionContext` 字段 + `DiscussionOrchestrator` 方法

**新增字段：**
```javascript
this.totalTokens = 0
this.inputTokens = 0
this.outputTokens = 0
this.tokenHistory = []
```

**新增方法：**
```javascript
getTokenStats()
getTokenHistory()
calculateTokens(message)
```

**状态：** ❌ 未迁移，**必须添加**

---

### 3. 智能标记系统 ⭐⭐⭐

**重要性：** 🔴 极高（v3.0 核心功能）

**位置：** `MarkerDetector`, `MarkerGenerator`, `ProjectGroup.markers`

**功能：**
- 自动检测重要时刻（决策、问题、方案、里程碑）
- 生成标记建议
- 标记时间轴

**迁移目标：** `DiscussionContext.markers` + 集成 `MarkerDetector`

**新增字段：**
```javascript
this.markers = []
this.stats.totalMarkers = 0
```

**新增方法：**
```javascript
addMarker(marker)
getMarkers()
detectAndAddMarkers()
generateSmartSummary()
detectDiscussionPhase()
```

**状态：** ❌ 未迁移，**必须添加**

---

### 4. 归档功能 ⭐⭐

**重要性：** 🟡 高（用户体验）

**位置：** `ProjectManager.archiveProject()` 等

**功能：**
- 归档讨论
- 按状态筛选（active/completed/archived）
- 隐藏已归档项目

**迁移目标：** `DiscussionOrchestrator`

**新增方法：**
```javascript
archiveDiscussion(discussionId)
unarchiveDiscussion(discussionId)
getArchivedDiscussions()
getActiveDiscussions()
getCompletedDiscussions()
```

**状态：** ❌ 未迁移，**需要添加**

---

### 5. 标签系统 ⭐⭐

**重要性：** 🟡 高（组织功能）

**位置：** `ProjectGroup.tags`, `ProjectManager` 标签方法

**功能：**
- 为讨论添加标签
- 按标签搜索讨论
- 标签统计

**迁移目标：** `DiscussionContext.tags` + `DiscussionOrchestrator`

**新增字段：**
```javascript
this.tags = []
```

**新增方法：**
```javascript
addTag(tag)
removeTag(tag)
hasTag(tag)
getTags()
getAllTags()
findDiscussionsByTag(tag)
```

**状态：** ❌ 未迁移，**需要添加**

---

### 6. 备注功能 ⭐

**重要性：** 🟢 中（便利功能）

**位置：** `ProjectGroup.notes`, `ProjectManager` 备注方法

**功能：**
- 设置备注
- 追加备注（带时间戳）
- 获取备注

**迁移目标：** `DiscussionContext.notes` + `DiscussionOrchestrator`

**新增字段：**
```javascript
this.notes = ''
```

**新增方法：**
```javascript
setNotes(notes)
getNotes()
appendNotes(text)
setDiscussionNotes(discussionId, notes)
appendDiscussionNotes(discussionId, text)
getDiscussionNotes(discussionId)
```

**状态：** ❌ 未迁移，**需要添加**

---

### 7. 克隆功能 ⭐

**重要性：** 🟢 中（便利功能）

**位置：** `ProjectManager.cloneProject()`

**功能：**
- 基于现有讨论创建副本
- 保留配置（类别、标签、参与者）
- 清空数据（消息、标记）

**迁移目标：** `DiscussionOrchestrator`

**新增方法：**
```javascript
cloneDiscussion(discussionId, newName)
```

**状态：** ❌ 未迁移，**需要添加**

---

### 8. 类别系统 ⭐

**重要性：** 🟢 中（分类功能）

**位置：** `ProjectGroup.category`

**功能：**
- 讨论类别（需求讨论、功能研发、功能测试、文档编写）
- 按类别筛选

**迁移目标：** `DiscussionContext.category` + `DiscussionOrchestrator`

**新增字段：**
```javascript
this.category = null
```

**新增方法：**
```javascript
getDiscussionsByCategory(category)
```

**状态：** ❌ 未迁移，**需要添加**

---

### 9. 优先级系统 ⭐

**重要性：** 🟢 中（优先级排序）

**位置：** `ProjectGroup.priority`

**功能：**
- 设置优先级（low, medium, high, critical）
- 按优先级排序

**迁移目标：** `DiscussionContext.priority`

**新增字段：**
```javascript
this.priority = 'medium'
```

**新增方法：**
```javascript
setPriority(priority)
getPriority()
getPriorityValue()
```

**状态：** ❌ 未迁移，**需要添加**

---

### 10. 导出增强 ⭐

**重要性：** 🟢 中（已有，需增强）

**位置：** `ProjectManager` 导出方法

**功能：**
- Markdown 导出（包含标记、统计）
- JSON 导出（完整数据）
- 批量导出

**迁移目标：** 增强 `DiscussionOrchestrator` 现有导出功能

**新增/增强方法：**
```javascript
exportDiscussion(discussionId, format)  // 增强
exportAllDiscussions(format)            // 新增
```

**状态：** ⚠️ 部分有，**需要增强**

---

### 11. 自然语言创建 ⭐⭐

**重要性：** 🟡 高（用户体验）

**位置：** `V3Integration.createProjectFromInput()`

**功能：**
- 自然语言分析
- 自动选择专家
- 自动创建项目

**迁移目标：** `DiscussionOrchestrator`

**新增方法：**
```javascript
async createDiscussionFromInput(userInput, options)
```

**状态：** ❌ 未迁移，**需要添加**

---

## 📊 统计总结

### 需要添加的字段

| 类别 | 字段数 | 说明 |
|------|--------|------|
| 基础字段 | 5 | category, description, tags, notes, priority |
| Token 字段 | 4 | totalTokens, inputTokens, outputTokens, tokenHistory |
| 标记字段 | 2 | markers, stats.totalMarkers |
| 统计字段 | 3 | stats.progress, stats.updatedAt, stats.createdAt |
| **合计** | **14** | **14 个新字段** |

### 需要添加的方法

| 优先级 | 功能 | 方法数 | 说明 |
|--------|------|--------|------|
| 🔴 极高 | Token 压缩 | 3 | getCompressedContext, compressMessages, calculateTokens |
| 🔴 极高 | Token 统计 | 3 | getTokenStats, getTokenHistory, updateTokenCount |
| 🔴 极高 | 智能标记 | 5 | addMarker, getMarkers, detectAndAddMarkers, generateSmartSummary, detectDiscussionPhase |
| 🟡 高 | 归档功能 | 5 | archive, unarchive, getArchived, getActive, getCompleted |
| 🟡 高 | 标签系统 | 6 | addTag, removeTag, hasTag, getTags, getAllTags, findDiscussionsByTag |
| 🟡 高 | 自然语言 | 1 | createDiscussionFromInput |
| 🟢 中 | 备注功能 | 3 | setNotes, getNotes, appendNotes |
| 🟢 中 | 克隆功能 | 1 | cloneDiscussion |
| 🟢 中 | 类别系统 | 1 | getDiscussionsByCategory |
| 🟢 中 | 优先级 | 3 | setPriority, getPriority, getPriorityValue |
| 🟢 中 | 导出增强 | 2 | exportDiscussion (增强), exportAllDiscussions |
| **合计** | | **33** | **33 个新方法** |

---

## ✅ 迁移完成检查清单

### 数据模型（DiscussionContext）
- [ ] 添加 14 个新字段
- [ ] 添加 11 个实例方法（addTag, removeTag 等）

### 管理器（DiscussionOrchestrator）
- [ ] 添加 33 个新方法
- [ ] Token 压缩功能（3 个方法）
- [ ] Token 统计功能（3 个方法）
- [ ] 智能标记集成（5 个方法）
- [ ] 归档功能（5 个方法）
- [ ] 标签系统（6 个方法）
- [ ] 其他功能（11 个方法）

### 保留的文件
- [x] ExpertManager - 保留
- [ ] ProgressManager - 评估后决定
- [x] MarkerDetector - 保留并集成
- [x] MarkerGenerator - 保留并集成
- [x] SmartAnalyzer - 保留并集成

### 删除的文件
- [ ] src/models/project-group.js
- [ ] src/core/project-manager.js
- [ ] src/core/project-flow.js
- [ ] src/v3-integration.js
- [ ] data/projects/

---

**总结：**

1. **14 个新字段**需要添加到 `DiscussionContext`
2. **33 个新方法**需要添加到 `DiscussionOrchestrator`
3. **3 个核心功能**必须完整迁移：
   - Token 压缩（⭐⭐⭐）
   - Token 统计（⭐⭐⭐）
   - 智能标记（⭐⭐⭐）

**没有遗漏！** 所有功能都已识别并列入迁移清单。

---

**检查完成时间：** 2026-02-03 08:05
**检查人员：** AI Assistant
**状态：** ✅ 功能已全部识别，可开始迁移
