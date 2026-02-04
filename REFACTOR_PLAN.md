# MAD v4.0.0 - 概念统一重构计划

**目标：** 移除所有"项目组"（Project）概念，统一使用"讨论组"（Discussion）

**重构日期：** 2026-02-03

## 🎯 重构目标

### 当前问题
- ✗ `ProjectGroup` 和 `Discussion` 两个概念并存
- ✗ `ProjectManager` 和 `DiscussionOrchestrator` 功能重叠
- ✗ `data/projects/` 和 `data/discussions/` 两套存储
- ✗ API 混乱：`/api/projects/*` 和 `/api/discussions/*`

### 目标状态
- ✓ 只使用 `Discussion` 概念
- ✓ 只使用 `DiscussionOrchestrator` 管理器
- ✓ 统一存储到 `data/discussions/`
- ✓ 统一 API：`/api/discussions/*`

## 📋 重构步骤

### 阶段 1：数据模型合并
**文件：** `orchestrator.js`

**任务：**
1. 增强 `DiscussionContext` 类，合并 `ProjectGroup` 的功能
   - 添加 `category` 属性（需求讨论、功能研发、文档编写等）
   - 添加 `markers` 数组（智能标记）
   - 添加 `tags` 数组（标签）
   - 添加 `notes` 字符串（备注）
   - 添加 `priority` 字段（优先级）
   - 增强 `stats` 对象（totalTokens, progress 等）
   - 扩展 `status` 值（active, completed, archived）

2. 添加相关方法
   - `addMarker(marker)` - 添加标记
   - `addTag(tag)` - 添加标签
   - `removeTag(tag)` - 移除标签
   - `setNotes(notes)` - 设置备注
   - `appendNotes(text)` - 追加备注
   - `getMarkers()` - 获取标记列表
   - `getTags()` - 获取标签列表

### 阶段 2：管理器功能合并
**文件：** `orchestrator.js`

**任务：**
1. 将 `ProjectManager` 的核心功能合并到 `DiscussionOrchestrator`
   - `createDiscussion()` - 增强，支持 category、tags 等参数
   - `archiveDiscussion(id)` - 归档讨论
   - `unarchiveDiscussion(id)` - 取消归档
   - `getArchivedDiscussions()` - 获取已归档讨论
   - `getDiscussionStats(id)` - 获取详细统计
   - `searchDiscussions(query)` - 搜索讨论
   - `getAllTags()` - 获取所有标签
   - `addTagToDiscussion(id, tag)` - 添加标签
   - `removeTagFromDiscussion(id, tag)` - 移除标签
   - `exportDiscussion(id, format)` - 导出讨论
   - `cloneDiscussion(id)` - 克隆讨论
   - `setDiscussionNotes(id, notes)` - 设置备注
   - `appendDiscussionNotes(id, text)` - 追加备注

### 阶段 3：API 路由统一
**文件：** `web/server.js`

**任务：**
1. 将 `/api/projects/*` 路由改为 `/api/discussions/*`
   - `/api/projects` → `/api/discussions`
   - `/api/projects/list` → `/api/discussions/list`
   - `/api/projects/statistics` → `/api/discussions/statistics`
   - `/api/projects/search` → `/api/discussions/search`
   - `/api/project/:id` → `/api/discussion/:id`

2. 确保所有 API 返回格式一致

### 阶段 4：数据迁移
**脚本：** `scripts/migrate-projects-to-discussions.js`

**任务：**
1. 读取 `data/projects/*.json`
2. 转换为 Discussion 格式
3. 保存到 `data/discussions/*.json`
4. 备份原数据

### 阶段 5：文件清理
**删除文件：**
- `src/models/project-group.js`
- `src/core/project-manager.js`
- `src/core/project-flow.js`
- `src/v3-integration.js`（功能合并到 orchestrator）

**目录清理：**
- `data/projects/`（迁移后删除）

### 阶段 6：测试更新
**文件：** `test/*.test.js`

**任务：**
1. 更新所有测试，使用 Discussion API
2. 移除 ProjectGroup/ProjectManager 引用
3. 确保所有测试通过

### 阶段 7：文档更新
**文件：**
- `README.md`
- `CHANGELOG.md`
- `docs/**/*.md`

**任务：**
1. 移除所有"项目组"相关描述
2. 统一使用"讨论组"术语
3. 更新 API 文档
4. 更新使用示例

## 🔄 功能映射表

| ProjectGroup | Discussion |
|--------------|------------|
| `id` | `id` ✓ |
| `name` | `topic` ⚠️ 需要统一 |
| `category` | `category` ➕ 新增 |
| `messages` | `messages` ✓ |
| `markers` | `markers` ➕ 新增 |
| `participants` | `participants` ✓ |
| `tags` | `tags` ➕ 新增 |
| `notes` | `notes` ➕ 新增 |
| `priority` | `priority` ➕ 新增 |
| `status` | `status` ⚠️ 扩展值 |
| `stats` | `stats` ⚠️ 增强字段 |

| ProjectManager | DiscussionOrchestrator |
|----------------|----------------------|
| `createProject()` | `createDiscussion()` ⚠️ 增强参数 |
| `getProject()` | `getDiscussion()` ✓ |
| `listProjects()` | `listDiscussions()` ✓ |
| `archiveProject()` | `archiveDiscussion()` ➕ 新增 |
| `searchProjects()` | `searchDiscussions()` ➕ 新增 |
| `getAllTags()` | ➕ 合并进来 |
| `exportProject()` | `exportDiscussion()` ➕ 新增 |

## ⚠️ 注意事项

1. **向后兼容**：确保 v3.x 的数据可以正常加载
2. **API 兼容**：尽量保持 API 签名不变
3. **数据迁移**：提供自动迁移脚本
4. **测试覆盖**：每个阶段都要运行测试
5. **文档同步**：代码和文档同步更新

## 📊 预期影响

### 优点
- ✓ 概念统一，减少混乱
- ✓ 代码简化，减少重复
- ✓ 存储统一，便于维护
- ✓ API 清晰，易于使用

### 风险
- ⚠️ 数据迁移可能出错
- ⚠️ 破坏性变更，影响现有用户
- ⚠️ 测试需要大量更新

## 🚀 发布计划

- **v4.0.0-alpha.1** - 完成阶段 1-2（数据模型和管理器）
- **v4.0.0-alpha.2** - 完成阶段 3-4（API 和数据迁移）
- **v4.0.0-beta.1** - 完成阶段 5-6（清理和测试）
- **v4.0.0** - 完成阶段 7（文档更新），正式发布

## 📝 执行检查清单

- [ ] 阶段 1：数据模型合并
- [ ] 阶段 2：管理器功能合并
- [ ] 阶段 3：API 路由统一
- [ ] 阶段 4：数据迁移脚本
- [ ] 阶段 5：文件清理
- [ ] 阶段 6：测试更新
- [ ] 阶段 7：文档更新
- [ ] 所有测试通过
- [ ] CHANGELOG 更新
- [ ] 发布 v4.0.0

---

**创建时间：** 2026-02-03 07:40
**状态：** 待执行
