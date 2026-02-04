# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-02-04

### ⚠️ Breaking Changes

#### 概念统一
- **移除"项目组"概念**: 完全统一使用"讨论组"(Discussion)概念
- **数据模型变更**: `ProjectGroup` → `Discussion` (重命名)
- **字段重命名**: `name` → `topic`
- **存储路径变更**: `data/projects/` → `data/discussions/`
- **删除文件**:
  - `src/models/project-group.js` → `src/models/discussion.js`
  - `src/core/project-manager.js` → `src/core/discussion-manager.js`
  - `src/core/project-flow.js` (已删除)
  - `src/v3-integration.js` (已删除)

#### API变更
- 旧API保留向后兼容
- 新增V2 API推荐使用:
  - `POST /api/v2/discussion` - 创建讨论
  - `GET /api/v2/discussions` - 列出讨论
  - `GET /api/v2/discussion/:id` - 获取单个讨论
  - `DELETE /api/v2/discussion/:id` - 删除讨论
  - `POST /api/v2/discussion/:id/speak` - Agent发言
  - 标签、备注、搜索、统计等API

### ✨ 新增功能

#### Token智能管理 🤖
- ✅ Token统计增强: `inputTokens`, `outputTokens`, `totalTokens`分离统计
- ✅ 自动压缩: Token > 80k时自动压缩上下文
- ✅ Token历史: 记录每次消息的Token使用
- ✅ Token预算控制: 可设置预算和硬限制

#### 智能标记系统 🎯
- ✅ 4种标记类型: milestone(里程碑), decision(决策), problem(问题), solution(方案)
- ✅ AI自动检测: 自动识别重要时刻
- ✅ 智能摘要: 基于标记生成讨论总结
- ✅ 阶段检测: 识别讨论阶段(初始化/讨论/决策/结束)

#### 元数据管理 📋
- ✅ 标签系统: `addTag()`, `removeTag()`, `getTags()`
- ✅ 备注功能: `setNotes()`, `appendNotes()`, `getNotes()`
- ✅ 优先级: 4级优先级(low, medium, high, critical)
- ✅ 类别系统: 4种类别(需求讨论, 功能研发, 功能测试, 文档编写)
- ✅ 归档功能: `archiveDiscussion()`, `unarchiveDiscussion()`
- ✅ 克隆功能: `cloneDiscussion()`

#### Agent功能增强 🤖
- ✅ Agent发言: `agentSpeak()` 方法
- ✅ Agent状态跟踪: `agentStates` Map
- ✅ 讨论轮次管理: `rounds` 计数器
- ✅ 冲突检测: `conflicts` 数组
- ✅ 共识机制: `consensus` Map

#### 数据迁移工具 🔄
- ✅ 自动迁移脚本: `scripts/migrate-projects-to-discussions.js`
- ✅ 字段映射: 自动转换旧格式到新格式
- ✅ 验证工具: 验证迁移数据完整性
- ✅ 备份功能: 自动备份原数据

### 🔧 改进

#### 代码质量
- ✅ 统一数据模型，减少概念混乱
- ✅ 删除冗余代码，代码更简洁
- ✅ 增强类型安全，字段更清晰
- ✅ 改进错误处理

#### 性能优化
- ✅ 上下文自动压缩，减少Token消耗
- ✅ 智能缓存管理
- ✅ 数据懒加载

### 📝 文档

- ✅ 更新README.md: 移除"项目组"概念
- ✅ 更新API文档: 统一为Discussion API
- ✅ 添加数据迁移指南
- ✅ 添加测试指南

### 🧪 测试

- ✅ 添加v4 API测试套件: `test/v4-api.test.js`
- ✅ 所有测试通过
- ✅ 108个项目成功迁移
- ✅ 向后兼容性验证通过

### 📊 迁移统计

- ✅ 成功迁移: 108个项目
- ✅ 数据验证: 108个讨论文件全部有效
- ✅ 失败: 0

### 🔙 Deprecations

以下功能已移除或替换:
- ❌ `ProjectGroup` 类 → 使用 `Discussion` 类
- ❌ `ProjectManager` 类 → 使用 `DiscussionManager` 类
- ❌ `createProject()` → 使用 `createDiscussion()` 或 `createDiscussionV2()`
- ❌ `data/projects/` 目录 → 使用 `data/discussions/` 目录

### 🙏 向后兼容

- ✅ 旧API路由保留: `/api/discussion/*` 继续可用
- ✅ 旧方法保留: `createDiscussion()`, `listDiscussions()` 等继续可用
- ✅ 数据自动迁移: 提供迁移脚本

---

## [3.7.0] - 2026-02-03

### Added
- Token智能管理系统
- 智能标记系统
- 标签和归档功能
- 类别系统
- 自然语言创建
- 优先级管理

---

**链接:**
[完整版本历史](./docs/VERSION_HISTORY.md)
