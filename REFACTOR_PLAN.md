# MAD 代码库重构计划

## 当前问题

1. **根目录文件散落**
   - 11 个功能模块 .js 文件在根目录
   - 多个临时报告文件
   - 计划文件分散在根目录、VERSION_PLANS/ 和 docs/

2. **缺少清晰的功能分层**
   - 核心功能、特性功能、工具函数混在一起
   - 没有明确的 src/ 或 lib/ 目录

3. **文档分散**
   - docs/ 下有 13 个文件
   - VERSION_PLANS/ 下有 11 个文件
   - 根目录有 4 个计划文件
   - 多个临时报告未归档

## 建议的新结构

```
mad/
├── README.md                  # 主要文档（中文）
├── README_EN.md              # 英文文档
├── SKILL.md                  # Skill 说明
├── LICENSE                   # 许可证
├── package.json              # 项目配置
├── package-lock.json
├── .gitignore
│
├── orchestrator.js           # 核心协调引擎（主入口）
├── quick-start.js            # 快速开始示例
│
├── src/                      # 源代码目录
│   ├── core/                 # 核心功能
│   │   ├── similarity.js     # 相似度检测
│   │   ├── mention.js        # @提及功能
│   │   ├── reply.js          # 回复功能
│   │   ├── quality-scoring.js # 质量评分
│   │   ├── agent-performance.js # Agent 性能分析
│   │   ├── suggestions.js    # 智能建议
│   │   ├── history.js        # 讨论历史
│   │   └── realtime.js       # 实时协作
│   │
│   ├── features/             # 特性模块
│   │   ├── analytics/        # 分析功能
│   │   ├── cache/            # 缓存
│   │   ├── collaboration/    # 协作
│   │   ├── exporters/        # 导出
│   │   ├── pagination/       # 分页
│   │   ├── search/           # 搜索
│   │   ├── templates/        # 模板
│   │   ├── version/          # 版本控制
│   │   └── workflows/        # 工作流
│   │
│   └── tools/                # 工具和辅助
│       ├── auto-iteration-engine.js
│       ├── self-iteration-discussion.js
│       └── quality-incident-analysis.js
│
├── agents/                   # Agent 配置
│   ├── prompts/              # 提示词
│   ├── custom/               # 自定义 Agent
│   └── market.json           # 模板市场
│
├── data/                     # 数据存储（运行时）
│   ├── tags/                 # 标签数据
│   ├── favorites/            # 收藏夹
│   └── templates.json        # 模板定义
│
├── web/                      # Web 服务器
│   ├── server.js
│   ├── websocket.js
│   ├── shortcuts.js
│   └── public/
│       ├── index.html
│       ├── style.css
│       ├── shortcuts.css
│       └── app.js
│
├── api/                      # API 路由（如果有）
│
├── test/                     # 测试
│   ├── basic.test.js
│   └── ...
│
├── docs/                     # 文档
│   ├── ARCHITECTURE.md       # 架构说明
│   ├── API.md                # API 文档
│   ├── CONTRIBUTING.md       # 贡献指南
│   ├── VERSION_HISTORY.md    # 版本历史（合并所有）
│   └── archive/              # 归档文档
│       ├── old-plans/        # 旧版本计划
│       ├── reports/          # 临时报告
│       └── summaries/        # 开发总结
│
└── examples/                 # 示例
    └── usage.js
```

## 迁移步骤

### 第 1 步：创建新目录结构
```bash
mkdir -p src/{core,features,tools}
mkdir -p data
mkdir -p docs/archive/{old-plans,reports,summaries}
```

### 第 2 步：移动核心功能文件
```bash
# 移动到 src/core/
mv similarity.js src/core/
mv mention.js src/core/
mv reply.js src/core/
mv quality-scoring.js src/core/
mv agent-performance.js src/core/
mv suggestions.js src/core/
mv history.js src/core/
mv realtime.js src/core/
```

### 第 3 步：移动特性模块
```bash
# 移动到 src/features/
mv analytics/ src/features/
mv cache/ src/features/
mv collaboration/ src/features/
mv exporters/ src/features/
mv pagination/ src/features/
mv search/ src/features/
mv templates/ src/features/
mv version/ src/features/
mv workflows/ src/features/
```

### 第 4 步：移动工具文件
```bash
# 移动到 src/tools/
mv auto-iteration-engine.js src/tools/
mv self-iteration-discussion.js src/tools/
mv quality-incident-analysis.js src/tools/
```

### 第 5 步：移动数据文件
```bash
# 移动到 data/
mv tags/ data/
mv favorites/ data/
mv templates.json data/
# agents/market.json 保持不变（Agent 配置的一部分）
```

### 第 6 步：归档文档
```bash
# 临时报告 -> docs/archive/reports/
mv COMPLETION_REPORT_*.md docs/archive/reports/
mv DEVELOPMENT_*.md docs/archive/reports/
mv v261-release-report.md docs/archive/reports/

# 旧版本计划 -> docs/archive/old-plans/
mv v1.*_PLAN.md docs/archive/old-plans/
mv VERSION_PLANS/* docs/archive/old-plans/

# docs/ 下的旧计划
mv docs/v*.*_PLAN.md docs/archive/old-plans/

# 合并版本历史
# 手动合并 VERSION_PLANS 和 docs/VERSION_HISTORY.md
```

### 第 7 步：清理空目录
```bash
rmdir VERSION_PLANS
```

### 第 8 步：更新导入路径
需要在以下文件中更新导入路径：
- orchestrator.js
- test/*.js
- web/server.js
- src/features/*/index.js

### 第 9 步：更新 .gitignore
添加：
```
data/tags/*.json
data/favorites/*.json
data/cache/
node_modules/
```

## 完成后的好处

1. ✅ **清晰的功能分层**
   - src/core/ - 核心业务逻辑
   - src/features/ - 可选特性
   - src/tools/ - 辅助工具

2. ✅ **文档集中管理**
   - docs/ 只保留重要文档
   - 临时报告归档到 archive/

3. ✅ **数据文件分离**
   - data/ 存储运行时数据
   - agents/ 存储配置

4. ✅ **易于维护**
   - 新功能放在明确的位置
   - 旧代码可以快速找到

## 注意事项

- ⚠️ 移动文件后需要更新所有 require/import 路径
- ⚠️ 需要 orchestrator.js 中更新路径
- ⚠️ 测试文件可能需要更新路径
- ⚠️ 建议先在分支上测试，确认无问题后再合并
