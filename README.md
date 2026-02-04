# MAD (Multi-Agent Discussion) v4.0.0

> 让多个专业 Agent 在智能讨论组中协同工作，自主推进项目进展

**MAD** = Multi-Agent Discussion 的简称，读作 /mæd/

[![License: MIT](https://imgshieldos.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://imgshieldos.io/badge/OpenClaw-Skill-blue)](https://openclaw.ai)
[![Version](https://imgshieldos.io/badge/version-4.0.0-green)](https://github.com/OTTTTTO/MAD)
[![Language](https://imgshieldos.io/badge/lang-中文-blue)](#) [![English](https://imgshieldos.io/badge/lang-English-red)](./README_EN.md)

---

## 🎉 v4.0.0 重大更新

### 核心升级

**概念统一** ✨
- ❌ 旧版本: Discussion + ProjectGroup 双系统混乱
- ✅ v4.0: 统一为 **Discussion（讨论组）** 概念
- ✅ 所有功能集中在单一数据模型中

**Token 智能管理** 🤖
- 📊 自动统计 Token 使用量（input/output分离）
- 🗜️ 超过 80k 自动压缩上下文
- 💰 Token 预算控制和超限警告
- 🛡️ 硬限制保护（130k tokens）

**智能标记系统** 🎯
- 🎯 4 种标记类型（里程碑、决策、问题、方案）
- 🤖 AI 自动检测重要时刻
- 📝 基于标记生成智能摘要
- 🔍 检测讨论阶段（初始化、讨论、决策、结束）

**元数据管理** 📋
- 🏷️ 灵活的标签系统
- 📦 归档功能，保持列表整洁
- 📊 按标签、类别筛选
- ⚡ 4 级优先级（low | medium | high | critical）
- 📝 备注功能，支持追加

**类别系统** 📂
- 📋 需求讨论
- 💻 功能研发
- 🧪 功能测试
- 📝 文档编写

---

## 📖 简介

Multi-Agent Discussion v4.0.0 是一个 OpenClaw Skill，让多个专业 Agent 在智能讨论组中协同工作。Agent 之间可以互相 @、回应观点、形成共识，最终产生比单个 Agent 更全面的解决方案。

### 核心特性

#### v4.0.0 新特性 ✨
- ✅ **概念统一** - 只有一个"讨论组"概念
- ✅ **Token 智能管理** - 自动统计、压缩、预算控制
- ✅ **智能标记系统** - AI 自动检测重要时刻
- ✅ **标签系统** - 灵活组织讨论
- ✅ **归档功能** - 保持列表整洁
- ✅ **类别系统** - 4 种类别（需求讨论|功能研发|功能测试|文档编写）
- ✅ **备注功能** - 设置和追加备注
- ✅ **优先级** - 4 级优先级（low|medium|high|critical）
- ✅ **数据迁移** - 从旧版本无缝迁移

#### v2.x 经典特性
- ✅ **虚拟讨论组** - 创建多 Agent 协作的讨论空间
- ✅ **动态发言** - Agent 根据上下文智能判断是否需要发言
- ✅ **互相 @** - Agent 之间可以互相提问、回应
- ✅ **冲突检测** - 识别意见分歧并组织辩论
- ✅ **讨论总结** - 综合多方意见形成结构化结论
- ✅ **过程可追溯** - 保存完整讨论历史，随时查看

---

## 🚀 快速开始

### 安装

```bash
cd ~/.npm-global/lib/node_modules/openclaw/skills/MAD
npm install
```

### 使用

#### 1. 通过代码

```javascript
const DiscussionManager = require('./src/core/discussion-manager.js');
const { Discussion, Marker } = require('./src/models/discussion.js');

// 创建管理器
const manager = new DiscussionManager();
await manager.init();

// 创建讨论
const discussion = await manager.createDiscussion(
  '开发AI助手',           // topic
  '需求讨论',             // category
  {
    description: '评估AI助手开发需求',
    tags: ['重要', 'AI'],
    priority: 'high'
  }
);

// Agent发言
await discussion.agentSpeak('technical', '技术方案：使用Node.js');

// 添加标签
discussion.addTag('Q1目标');

// 设置备注
discussion.setNotes('项目启动会议');

// 添加标记
const marker = new Marker('m1', '技术决策', 'decision', 'msg-1');
marker.setSummary('决定使用Node.js开发');
discussion.addMarker(marker);

// 保存
await manager.saveDiscussion(discussion);
```

#### 2. 通过API

```bash
# 创建讨论
curl -X POST http://localhost:18790/api/v2/discussion \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "开发AI助手",
    "category": "需求讨论",
    "tags": ["重要"],
    "priority": "high"
  }'

# 列出所有讨论
curl http://localhost:18790/api/v2/discussions

# 获取单个讨论
curl http://localhost:18790/api/v2/discussion/{id}

# Agent发言
curl -X POST http://localhost:18790/api/v2/discussion/{id}/speak \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "technical",
    "content": "技术方案：使用Node.js"
  }'
```

#### 3. 通过Web界面

```bash
# 启动Web服务器
mad start

# 访问 http://localhost:18790
```

---

## 📊 API文档

### V2 API（推荐）

#### 讨论管理
- `POST /api/v2/discussion` - 创建讨论
- `GET /api/v2/discussions` - 列出讨论
- `GET /api/v2/discussion/:id` - 获取单个讨论
- `DELETE /api/v2/discussion/:id` - 删除讨论

#### 标签管理
- `POST /api/v2/discussion/:id/tags` - 添加标签
- `DELETE /api/v2/discussion/:id/tags/:tag` - 删除标签

#### 备注管理
- `PUT /api/v2/discussion/:id/notes` - 设置备注

#### Agent交互
- `POST /api/v2/discussion/:id/speak` - Agent发言

#### 搜索和统计
- `GET /api/v2/discussions/search?q=关键词` - 搜索讨论
- `GET /api/v2/statistics` - 获取统计信息

---

## 🎯 讨论类别

MAD v4.0 支持4种讨论类别：

1. **需求讨论** - 需求分析、评审
2. **功能研发** - 功能开发
3. **功能测试** - 测试验证
4. **文档编写** - 文档创作

---

## ⚙️ 配置

### 环境变量

```bash
# 数据目录
export MAD_DATA_DIR="$HOME/.openclaw/multi-agent-discuss"

# 服务器端口
export MAD_PORT=18790
```

### 配置文件

创建 `mad.config.js`:

```javascript
module.exports = {
  server: {
    port: 18790,
    host: '0.0.0.0'
  },
  discussion: {
    maxRounds: 10,
    maxDuration: 300000,
    enableConflictDetection: true
  }
};
```

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行v4 API测试
node test/v4-api.test.js

# 健康检查
mad doctor
```

---

## 📦 数据迁移

如果你从旧版本升级：

```bash
# 运行迁移脚本
node scripts/migrate-projects-to-discussions.js

# 验证迁移结果
node scripts/migrate-projects-to-discussions.js --validate
```

---

## 🗂️ 目录结构

```
MAD/
├── src/
│   ├── models/
│   │   └── discussion.js          # Discussion数据模型
│   ├── core/
│   │   └── discussion-manager.js  # Discussion管理器
│   └── ...
├── data/
│   ├── discussions/               # 讨论数据（新）
│   └── projects.backup.20260204/  # 旧项目备份
├── scripts/
│   └── migrate-projects-to-discussions.js
└── test/
    └── v4-api.test.js
```

---

## 📝 变更日志

### v4.0.0 (2026-02-04)

#### ⚠️ Breaking Changes
- **概念统一**: 移除"项目组"概念，统一使用"讨论组"
- **数据模型**: ProjectGroup → Discussion（重命名）
- **存储路径**: `data/projects/` → `data/discussions/`
- **API变更**: 旧API保留，新V2 API推荐使用

#### ✨ 新增功能
- ✅ Token智能管理（input/output分离、自动压缩）
- ✅ 智能标记系统（AI自动检测）
- ✅ 标签系统（灵活组织）
- ✅ 备注功能（设置和追加）
- ✅ 优先级（4级）
- ✅ 类别系统（4类）
- ✅ 数据迁移工具

#### 🔧 改进
- 统一数据模型，减少概念混乱
- 增强Discussion功能，保持向后兼容
- 提供数据迁移脚本

完整变更历史见 [CHANGELOG.md](./CHANGELOG.md)

---

## 🤝 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

[MIT](./LICENSE)

---

## 🙏 致谢

感谢所有贡献者和用户的支持！

---

**项目主页**: https://github.com/OTTTTTO/MAD
**问题反馈**: https://github.com/OTTTTTO/MAD/issues
**文档**: [docs/](./docs/)
