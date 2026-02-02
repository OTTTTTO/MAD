# 更新日志

## [3.6.0] - 2026-02-02

### ✨ 新功能

#### 项目搜索
- **搜索范围：** 项目名称、描述、类别、标记
- **智能评分：** 根据匹配字段权重计算得分
- **高亮显示：** 展示匹配的文本片段
- **结果限制：** 支持限制返回结果数量（默认 10 个）

#### 项目统计
- **全局统计：** 项目总数、活跃项目数、消息数、标记数、参与者数
- **分类统计：** 按状态、类别统计项目分布
- **活跃检测：** 自动统计最近 24 小时内有更新的项目

#### 项目标签
- **标签管理：** 为项目添加/移除标签
- **标签搜索：** 按标签查找项目
- **标签统计：** 获取所有标签及使用次数
- **数据模型：** ProjectGroup 新增 tags 属性和相关方法

#### 项目导出
- **导出格式：** Markdown、JSON
- **单个导出：** 导出指定项目组
- **批量导出：** 导出所有项目组
- **Markdown 内容：** 项目信息、参与者、统计、标记、消息流
- **JSON 内容：** 完整的项目数据，可用于备份或迁移

#### 项目归档
- **归档功能：** 将已完成的项目标记为已归档
- **取消归档：** 恢复已归档的项目
- **状态筛选：** 按状态（active, completed, archived）筛选项目
- **保持整洁：** 归档的项目不会显示在活跃列表中

#### 实现细节
- 新增 `ProjectManager.searchProjects()` 方法
- 新增 `ProjectManager.getStatistics()` 方法
- 新增 `ProjectManager.findProjectsByTag()` 方法
- 新增 `ProjectManager.getAllTags()` 方法
- 新增 `ProjectManager.addTagToProject()` 方法
- 新增 `ProjectManager.removeTagFromProject()` 方法
- 新增 `ProjectManager.exportProject()` 方法
- 新增 `ProjectManager.exportAllProjects()` 方法
- 新增 `exportProjectToMarkdown()` 函数
- 新增 `exportProjectToJSON()` 函数
- 新增 `V3Integration.searchProjects()` 接口
- 新增 `V3Integration.getStatistics()` 接口
- 新增 `V3Integration.findProjectsByTag()` 接口
- 新增 `V3Integration.getAllTags()` 接口
- 新增 `V3Integration.addTagToProject()` 接口
- 新增 `V3Integration.removeTagFromProject()` 接口
- 新增 `V3Integration.exportProject()` 接口
- 新增 `V3Integration.exportAllProjects()` 接口
- 新增 `V3Integration.archiveProject()` 接口
- 新增 `V3Integration.unarchiveProject()` 接口
- 新增 `V3Integration.getArchivedProjects()` 接口
- 新增 `V3Integration.getActiveProjects()` 接口
- 新增 `V3Integration.getCompletedProjects()` 接口
- ProjectGroup 新增 `tags` 属性和 `addTag()`, `removeTag()`, `hasTag()`, `getTags()` 方法

#### 使用示例
```javascript
// 搜索项目
const results = await v3.searchProjects('微服务');

// 获取统计
const stats = await v3.getStatistics();

// 添加标签
await v3.addTagToProject('group-xxx', '高优先级');

// 按标签搜索
const projects = await v3.findProjectsByTag('前端');

// 获取所有标签
const tags = await v3.getAllTags();

// 导出项目
const result = await v3.exportProject('group-xxx', 'markdown');

// 批量导出
const results = await v3.exportAllProjects('markdown');

// 归档项目
await v3.archiveProject('group-xxx');

// 取消归档
await v3.unarchiveProject('group-xxx');

// 按状态筛选
const archived = await v3.getArchivedProjects();
const active = await v3.getActiveProjects();
const completed = await v3.getCompletedProjects();
```

### 📚 文档更新

- README 新增使用示例（场景 5：搜索项目组）
- README 新增使用示例（场景 6：获取项目统计）
- README 新增使用示例（场景 7：使用项目标签）
- README 新增使用示例（场景 8：导出项目）
- README 新增使用示例（场景 9：归档项目）
- 说明搜索范围和权重
- 说明统计指标含义
- 说明标签用途和场景
- 说明导出格式和内容
- 说明归档用途和场景

### 📊 统计

- **新增文件：** 0 个
- **修改文件：** 2 个（project-manager.js, v3-integration.js）
- **新增代码：** 约 280 行
- **测试状态：** ✅ 通过

---

## [2.7.2] - 2026-02-02

### 🐛 Bug 修复

#### 模板为空问题
- **问题：** 新建讨论组时模板选择器为空
- **原因：** `loadTemplates()` 使用了错误的文件路径
- **修复：** 修改路径从 `templates.json` 到 `data/templates.json`
- **结果：** 成功加载 5 个预定义模板

**可用模板：**
- 🎯 需求评估 - 评估新功能或产品的需求可行性
- 🔧 技术评审 - 评审技术方案的可行性
- 💡 问题解决 - 协同解决技术或业务问题
- 💭 头脑风暴 - 自由讨论，激发创意
- ✏️ 自定义 - 创建自定义讨论

### 📊 统计

- **修复文件：** 1 个（orchestrator.js）
- **新增文档：** 1 个（修复记录）
- **Git 提交：** 1 次
- **测试状态：** ✅ 通过

---

## [2.7.1] - 2026-02-02

### 🐛 Bug 修复

#### 关键 API 500 错误修复
- 修复相似讨论 API (`GET /api/discussion/:id/similar`) 500 错误
- 修复合并讨论 API (`POST /api/discussion/:id/merge`) 500 错误
- 修复 5 个方法的潜在空值引用问题

#### 修复详情

**相似讨论 API**
- **问题：** 异步初始化未等待，模型训练未完成就开始查询
- **问题：** 数据一致性检查缺失，访问 undefined 对象属性
- **修复：** 添加 `async/await`，添加空值检查
- **影响：** API 现在能正确返回相似讨论列表

**合并讨论 API**
- **问题：** 方法调用冲突，调用原型方法而不是类方法
- **问题：** 逻辑顺序错误，先删除再检查存在性
- **问题：** messages/conflicts 字段可能为 null
- **修复：** 删除冗余删除操作，添加防御性空值检查
- **影响：** 讨论合并功能正常工作

**防御性空值检查**
- 修复方法：`mergeDiscussions`, `generateSummary`, `exportToMarkdown`, `extractActionItems`, `getAllMentions`
- 标准防御模式：确保 messages 和 conflicts 始终为数组

### 📚 文档更新

- 新增 **API 500 错误排查指南** (`docs/troubleshooting/api-500-errors.md`)
  - 完整的排查流程
  - 根本原因分析
  - 最佳实践和调试技巧

- 新增 **故障修复总结** (`FIXES_SUMMARY.md`)
  - 快速了解修复内容
  - 技术要点总结
  - 相关文档链接

- 新增修复记录文档：
  - `memory/2026-02-02-fix-similar-api.md`
  - `memory/2026-02-02-fix-merge-api.md`
  - `memory/2026-02-02-fix-merge-final.md`
  - `memory/2026-02-02-defensive-null-checks.md`

### 🔧 技术改进

- **异步操作规范化：** 所有 async 方法调用都使用 await
- **防御性编程：** 访问对象属性前检查空值
- **错误处理改进：** 更清晰的错误消息和日志

### 📊 统计

- **修复文件：** 3 个（orchestrator.js, similarity.js, server.js）
- **新增文档：** 5 个
- **Git 提交：** 3 次
- **修复行数：** +500 行（包含文档）
- **测试状态：** ✅ 全部通过

### 🚀 升级建议

```bash
# 拉取最新修复
cd ~/.openclaw/skills/multi-agent-discuss
git pull origin main

# 重启 Web 服务器
pkill -f "node server.js"
cd web && node server.js &

# 测试 API
curl "http://localhost:18790/api/discussion/:id/similar"
curl -X POST "http://localhost:18790/api/discussion/:id/merge" \
  -H "Content-Type: application/json" \
  -d '{"sourceIds":["..."]}'
```

### 📖 相关文档

- [API 500 错误排查指南](docs/troubleshooting/api-500-errors.md)
- [故障修复总结](FIXES_SUMMARY.md)
- [GitHub Commits](https://github.com/OTTTTTO/MAD/commits/main)

---

## [2.7.0] - 2026-02-02

### 🎉 大版本更新

本次更新包含 4 个重要功能，全部经过测试并推送到 GitHub。

### ✨ 新增功能

#### v2.6.7 - GitHub Issue 监控脚本
- 新增 `scripts/check-github-issues.sh` 自动监控 Issues
- 支持自动获取、分析并创建修复任务
- 集成子 Agent 自动修复流程
- 记录已处理 Issues 避免重复

#### v2.6.8 - 文档更新
- 更新 README 版本徽章至 v2.6.7
- 添加消息气泡样式优化功能说明（v2.6.6）
- 添加 GitHub Issue 监控功能说明（v2.6.7）

#### v2.6.9 - 配置示例
- 新增 `config.example.json` 配置模板
- 包含讨论、Agent、模板、导出、Web、GitHub、日志等完整配置
- 用户可复制为 config.json 自定义配置
- 添加详细注释说明

#### v2.6.10 - 快速启动脚本改进
- 添加 ANSI 颜色输出，更美观的终端显示
- 支持命令行参数：`--topic`、`--rounds`、`--duration`
- 添加 `--help` 帮助信息
- 改进输出格式，使用双线边框
- 增强用户体验

### 📊 统计
- **新增文件：** 3 个（脚本、配置示例、更新日志）
- **改进文件：** 3 个（README.md、quick-start.js、package.json）
- **Git 提交：** 4 次
- **代码行数：** +250 行
- **测试状态：** ✅ 全部通过

### 🚀 使用方式

```bash
# 克隆最新版本
cd ~/.openclaw/skills/multi-agent-discuss
git pull origin main

# 使用配置示例
cp config.example.json config.json
# 编辑 config.json 自定义配置

# 使用改进的快速启动脚本
node quick-start.js --topic "你的主题" --rounds 3

# 运行 GitHub Issue 监控
bash scripts/check-github-issues.sh
```

### 📝 下一步计划
- [ ] 添加更多讨论模板
- [ ] 实现 Agent 性能监控
- [ ] 优化 WebSocket 性能
- [ ] 添加更多导出格式支持

---

## [2.6.6] - 2026-02-02

### 消息气泡样式优化
- 增强圆角效果
- 改进阴影和动画效果
- 提升视觉体验

---

## 更早版本

详细历史请查看 Git 提交记录。
