# MAD (Multi-Agent Discussion) v3.0

> 让多个专业 Agent 在智能项目组中协同工作，自主推进项目进展

**MAD** = Multi-Agent Discussion 的简称，读作 /mæd/

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-blue)](https://openclaw.ai)
[![Version](https://img.shields.io/badge/version-3.0.0-green)](https://github.com/OTTTTTO/MAD)
[![Language](https://img.shields.io/badge/lang-中文-blue)](#) [![English](https://img.shields.io/badge/lang-English-red)](./README_EN.md)

**语言 / Language:** 🇨🇳 [中文](./README.md) | 🇬🇧 [English](./README_EN.md)

---

## 🎉 v3.0 重大更新

### 核心升级

**从"讨论"到"项目组"**
- ❌ v2.x: 临时性、一次性的讨论
- ✅ v3.0: 持续性、可追溯的智能项目组

**智能标记系统**
- 🎯 自动检测决策、问题、方案、里程碑
- 📍 标记时间轴，重要节点一目了然
- 🤝 AI 驱动的标记建议

**自然语言创建**
- 💬 "我想写一篇关于微服务架构的专利文档"
- 🤖 自动分析、自动选专家、自动创建项目
- 🚀 零配置，立即开始

**Token 智能管理**
- 📊 自动计算 Token 使用量
- 🗜️ 上下文智能压缩，节省成本
- 💰 预算控制，避免超支

**自主推进**
- 🔄 自动检测项目停滞
- 💬 主动触发 Agent 讨论
- ❓ 智能生成询问问题

---

## 📖 简介

Multi-Agent Discussion v3.0 是一个 OpenClaw Skill，让多个专业 Agent 在智能项目组中协同工作。Agent 之间可以互相 @、回应观点、形成共识，最终产生比单个 Agent 更全面的解决方案。

### 核心特性

#### v3.0 新特性 ✨
- ✅ **智能项目组** - 持续的项目空间，支持长期协作
- ✅ **智能标记系统** - AI 自动检测重要时刻
- ✅ **自然语言创建** - 用一句话描述，系统自动配置
- ✅ **Token 智能管理** - 自动计算、压缩、控制成本
- ✅ **自主推进** - 项目停滞时自动触发讨论
- ✅ **17+ 专家角色** - 架构、专利、数据库、安全等
- ✅ **项目组视图** - 可视化项目进展

#### v2.x 经典特性
- ✅ **虚拟讨论组** - 创建多 Agent 协作的讨论空间
- ✅ **动态发言** - Agent 根据上下文智能判断何时发言
- ✅ **互相 @** - Agent 之间可以互相提问、回应
- ✅ **冲突检测** - 自动识别意见分歧，组织辩论
- ✅ **讨论总结** - 综合多方观点形成结构化结论
- ✅ **过程可追溯** - 保存完整讨论历史，随时查看
- ✅ **Web 可视化** - 实时查看讨论组内容
- ✅ **Agent 统计** - Karma 系统和等级机制
- ✅ **导出功能** - 支持 Markdown/JSON/PDF 导出
- ✅ **实时推送** - WebSocket 实时更新
- ✅ **讨论模板市场** - 10+ 预置模板，一键创建讨论
- ✅ **相似度检测** - 查找相似讨论，避免重复工作

---

## 🚀 快速开始

### 安装

```bash
cd ~/.openclaw/skills
git clone https://github.com/OTTTTTO/mad.git
cd mad
npm install
```

### 在 OpenClaw 中启用

在 OpenClaw 配置文件中添加：

```json
{
  "skills": {
    "entries": {
      "multi-agent-discuss": {
        "enabled": true
      }
    }
  }
}
```

### 基础用法

#### v3.0 方式：自然语言创建项目

```javascript
const V3Integration = require('./src/v3-integration.js');

// 初始化 v3.0
const v3 = new V3Integration(orchestrator);
await v3.initialize();

// 用自然语言创建项目
const result = await v3.createProjectFromInput(
  '我想写一篇关于微服务分层架构设计的专利文档'
);

// 系统自动：
// 1. 分析意图（文档编写）
// 2. 选取专家（专利专家、技术架构师、文档专家）
// 3. 创建项目组
// 4. 启动智能推进
// 5. 添加第一条消息

console.log(result.project.id);
console.log(result.experts); // [{ id: 'patent-expert', name: '专利专家' }, ...]
```

#### v2.x 方式：创建讨论（仍然支持）

```javascript
const { DiscussionOrchestrator } = require('./orchestrator.js');

// 创建协调器
const orchestrator = new DiscussionOrchestrator();
await orchestrator.initialize();

// 创建讨论
const { discussionId } = await orchestrator.createDiscussion(
  '评估开发新功能的可行性'
);

// Agent 发言
await orchestrator.agentSpeak(discussionId, 'market_research', '...');

// 获取结果
const history = orchestrator.getDiscussionHistory(discussionId);
```

### Web 界面

```bash
# 启动 Web 服务器
npm start

# 访问不同的界面：
# http://localhost:18790              - v2.x 经典界面
# http://localhost:18790/index-v3     - v3.0 自然语言创建
# http://localhost:18790/project-view - v3.0 项目组视图
```

**v3.0 项目组视图功能：**
- 📋 查看所有项目组
- 🔍 **项目搜索** - 按关键词搜索项目组（名称、描述、标记）
- 🏷️ **项目标签** - 为项目添加标签，方便分类和筛选
- 📤 **项目导出** - 导出项目为 Markdown 或 JSON 格式
- 📊 **全局统计** - 项目总数、分类统计、活跃项目数
- 📍 标记时间轴
- 💬 实时阅读消息流
- 📊 项目统计（消息数、标记数、Tokens、进度）
- ✨ 智能标记一键生成
- 📝 项目总结自动生成

---

## 💡 使用示例

### 场景 1：v3.0 自然语言创建项目（推荐）

```
用户：我想写一篇关于微服务分层架构设计的专利文档

↓ 系统自动分析 ↓

💡 智能分析器：
  - 领域：架构设计 + 专利编写
  - 类别：文档编写
  - 专家：专利专家 + 技术架构师 + 文档专家

🏗️ 系统自动：
  - 创建项目组 "微服务分层架构设计"
  - 添加专家到项目
  - 启动智能推进
  - 开始自动讨论

↓ 项目组自主推进 ↓

📜 专利专家：准备专利文档结构...
🏛️ 技术架构师：描述技术方案...
📝 文档专家：整理成正式文档...
🎯 系统标记：[里程碑] 文档初稿完成

↓ 最终输出 ↓

✅ 完整的专利文档
✅ 技术方案说明
✅ 可直接提交申请
```

### 场景 2：智能标记项目进展

```bash
# 访问项目组视图
# http://localhost:18790/project-view

# 点击 "✨ 智能标记" 按钮

# 系统自动：
1. 分析所有消息
2. 检测重要时刻
3. 生成标记建议
4. 添加到时间轴

# 标记示例：
🎯 决策：采用微服务架构
⚠️ 问题：性能瓶颈
💡 方案：引入缓存层
🏆 里程碑：架构设计完成
🤝 共识：使用 Redis 缓存
```

### 场景 3：v2.x 需求评估（经典方式）

```
用户：我想开发一个"自动写代码"的技能

↓ 系统自动启动讨论 ↓

💡 主协调员：@各位 请评估这个需求
📊 市场调研：有价值，但需要差异化
🎯 需求分析：聚焦"代码片段生成"
🔧 技术可行性：API + Prompt 工程可行
🧪 测试：需要质量保障机制

↓ 综合各方意见 ↓

回复用户：经过讨论，建议聚焦中文开发者的代码助手...
```

### 场景 4：使用模板市场（v2.x）

```bash
# 访问 Web 界面
# http://localhost:18790

# 点击"市场"按钮，浏览 10+ 预置模板
# 可用模板：
# - 产品发布评审
# - 技术选型讨论
# - API 设计评审
# - Bug 根因分析
# - 竞品分析
# - 等等...

# 一键使用模板创建讨论
```

### 场景 5：搜索项目组（v3.6.0 新增）

```javascript
// 搜索包含"微服务"的项目组
const results = await v3.searchProjects('微服务');

// 返回结果：
[
  {
    project: { id: 'group-xxx', name: '微服务分层架构设计', ... },
    score: 10,
    highlights: [
      { field: 'name', text: '微服务分层架构设计' },
      { field: 'description', text: '微服务架构设计文档' }
    ]
  },
  {
    project: { id: 'group-yyy', name: '微服务性能优化', ... },
    score: 10,
    highlights: [
      { field: 'name', text: '微服务性能优化' }
    ]
  }
]

// 限制结果数量
const limitedResults = await v3.searchProjects('性能', { limit: 5 });
```

**搜索范围：**
- ✅ 项目名称（权重：10）
- ✅ 项目描述（权重：5）
- ✅ 项目类别（权重：3）
- ✅ 标记标题（权重：2）
- ✅ 标记摘要（权重：1）

### 场景 6：获取项目统计（v3.6.0 新增）

```javascript
// 获取全局项目统计
const stats = await v3.getStatistics();

// 返回结果：
{
  total: 15,                    // 项目总数
  activeProjects: 8,            // 活跃项目数（24小时内）
  totalMessages: 342,           // 总消息数
  totalMarkers: 56,             // 总标记数
  totalParticipants: 42,        // 总参与者数
  byStatus: {                   // 按状态统计
    'active': 8,
    'completed': 5,
    'paused': 2
  },
  byCategory: {                 // 按类别统计
    '文档编写': 5,
    '架构设计': 4,
    '需求分析': 3,
    '技术评审': 3
  }
}
```

### 场景 7：使用项目标签（v3.6.0 新增）

```javascript
// 添加标签到项目
await v3.addTagToProject('group-xxx', '高优先级');
await v3.addTagToProject('group-xxx', '前端');
await v3.addTagToProject('group-yyy', '后端');

// 获取所有标签（按使用次数排序）
const allTags = await v3.getAllTags();
// 返回：[{ tag: '前端', count: 5 }, { tag: '后端', count: 3 }, ...]

// 按标签搜索项目
const frontendProjects = await v3.findProjectsByTag('前端');
// 返回：所有带有"前端"标签的项目

// 移除标签
await v3.removeTagFromProject('group-xxx', '高优先级');
```

**标签用途：**
- ✅ 项目分类（前端、后端、移动端等）
- ✅ 优先级标记（高优先级、低优先级等）
- ✅ 状态标记（进行中、暂停、待审核等）
- ✅ 自定义标签（任意文本）

### 场景 8：导出项目（v3.6.0 新增）

```javascript
// 导出单个项目为 Markdown
const result = await v3.exportProject('group-xxx', 'markdown');
// 返回：{ path: '/path/to/project-name-2026-02-02.md', format: 'markdown', ... }

// 导出单个项目为 JSON
const jsonResult = await v3.exportProject('group-xxx', 'json');
// 返回：{ path: '/path/to/project-name-2026-02-02.json', format: 'json', ... }

// 批量导出所有项目
const results = await v3.exportAllProjects('markdown');
// 返回：[{ path, format, projectId, projectName }, ...]

// 指定输出目录
await v3.exportProject('group-xxx', 'markdown', '/custom/output/dir');
```

**导出格式：**
- **Markdown:** 包含项目信息、参与者、统计、标记、消息流
- **JSON:** 完整的项目数据，可用于备份或迁移

---

## 🎭 可用角色

### v3.0 专家角色（17+）

| 角色 | Emoji | 职责 | 领域 |
|------|-------|------|------|
| 架构师 | 🏗️ | 技术架构、技术选型 | 架构设计 |
| 系统架构师 | 🏛️ | 系统设计、分层架构 | 架构设计 |
| 专利专家 | 📜 | 专利编写、权利要求 | 专利编写 |
| 法务专家 | ⚖️ | 法律合规、知识产权 | 法律 |
| 技术文档专家 | 📝 | 技术文档编写 | 文档编写 |
| 文档专家 | 📚 | 知识管理 | 文档编写 |
| 数据库专家 | 🗄️ | 数据库设计、查询优化 | 数据库 |
| DBA | 🔧 | 数据库管理、性能优化 | 数据库 |
| 测试专家 | 🧪 | 测试策略、测试用例 | 测试 |
| QA工程师 | ✅ | 质量保证、自动化测试 | 测试 |
| 安全专家 | 🔒 | 安全风险、安全方案 | 安全 |
| 性能工程师 | ⚡ | 性能优化、瓶颈分析 | 性能 |
| DevOps工程师 | 🚀 | 部署、CI/CD | DevOps |
| 产品经理 | 📊 | 需求分析、产品规划 | 需求分析 |
| 业务分析师 | 💼 | 业务需求分析 | 需求分析 |
| 市场研究员 | 📈 | 市场调研、竞品分析 | 市场调研 |

### v2.x 经典角色

| 角色 | Emoji | 职责 |
|------|-------|------|
| 主协调员 | 💡 | 引导讨论、总结共识 |
| 市场调研 | 📊 | 商业价值、市场需求 |
| 需求分析 | 🎯 | 用户需求、功能边界 |
| 技术可行性 | 🔧 | 技术方案、实现难度 |
| 测试 | 🧪 | 质量保障、测试策略 |
| 文档 | 📝 | 记录讨论、整理输出 |

---

## 📚 文档

### v3.0 文档
- [V3_RELEASE_NOTES.md](./docs/V3_RELEASE_NOTES.md) - v3.0 完整发布说明
- [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md) - v3.0 开发进度

### v2.x 文档
- [SKILL.md](./SKILL.md) - 完整功能说明
- [agents/prompts/](./agents/prompts/) - 各角色配置
- [用户使用指南](./docs/user-guide.md) - 如何发起讨论、使用模板、CLI 命令
- [API 文档](./docs/api.md) - 完整的 API 参考
- [自定义 Agent](./docs/custom-agents.md) - 创建自己的 Agent 角色
- [模板系统](./docs/templates.md) - 使用和创建讨论模板

---

## 🔧 配置

### v3.0 配置

```javascript
const V3Integration = require('./src/v3-integration.js');

const v3 = new V3Integration(orchestrator);

// 可选：配置管理器
v3.projectManager.dataDir = '/path/to/projects';
v3.expertManager.dataDir = '/path/to/experts';

// 初始化
await v3.initialize();
```

### v2.x 配置

```javascript
const config = {
  maxDuration: 300000,        // 讨论最大时长（5分钟）
  maxRounds: 10,              // 最大讨论轮次
  enableConflictDetection: true,  // 启用冲突检测
  enableDynamicSpeaking: true     // 启用动态发言
};

const orchestrator = new DiscussionOrchestrator(config);
```

---

## 📊 版本历史

### v3.0.0 (2026-02-02) - **重大更新** 🎉
- 🎯 **核心重构**
  - 从"讨论"升级为"项目组"
  - 17+ 专家角色
  - 智能分析器
  - 项目流管理器
- 📍 **智能标记系统**
  - 自动检测决策、问题、方案、里程碑
  - AI 驱动的标记建议
  - 项目总结生成
- 💬 **自然语言创建**
  - 一句话创建项目
  - 自动分析意图
  - 自动选取专家
- 📊 **Token 智能管理**
  - 自动计算 Token
  - 上下文压缩
  - 预算控制
- 🔄 **自主推进**
  - 自动检测项目停滞
  - 主动触发讨论
  - 智能询问
- 🎨 **新界面**
  - v3.0 自然语言创建界面
  - 项目组视图（时间轴、统计）
- 📝 **完整文档**
  - v3.0 发布说明
  - API 文档更新

### v2.8.5 - v2.6.0
- 详见 [CHANGELOG.md](./CHANGELOG.md)

---

## 📂 项目结构

```
mad/
├── orchestrator.js           # v2.x 核心协调引擎
├── src/                      # v3.0 源代码
│   ├── models/
│   │   └── project-group.js  # 数据模型
│   ├── core/
│   │   ├── project-manager.js      # 项目组管理
│   │   ├── expert-manager.js       # 专家管理
│   │   ├── smart-analyzer.js       # 智能分析
│   │   ├── project-flow.js         # 项目流管理
│   │   ├── progress-manager.js     # 智能推进
│   │   ├── marker-detector.js      # 标记检测
│   │   └── marker-generator.js     # 标记生成
│   └── v3-integration.js     # v3.0 集成入口
├── api/
│   └── skill-routes.js       # v3.0 API 路由
├── web/
│   ├── server.js             # HTTP 服务器
│   └── public/
│       ├── index.html        # v2.x 经典界面
│       ├── index-v3.html     # v3.0 自然语言创建
│       └── project-view.html # v3.0 项目组视图
├── agents/
│   └── prompts/              # 各角色系统提示词
├── package.json              # 项目配置
├── SKILL.md                  # Skill 说明
├── README.md                 # 本文件
└── test/                     # 测试文件
```

---

## 🔧 故障排除

### API 500 错误

如果遇到 API 返回 500 错误，请查看：

1. **相似讨论 API** (`GET /api/discussion/:id/similar`)
   - 症状：返回 500 错误
   - 原因：异步初始化未完成或数据不一致
   - 解决：已在 v2.7.1 修复

2. **合并讨论 API** (`POST /api/discussion/:id/merge`)
   - 症状：返回 "Discussion not found"
   - 原因：方法调用冲突或空值引用
   - 解决：已在 v2.7.1 修复

详细的故障排查指南：[docs/troubleshooting/api-500-errors.md](docs/troubleshooting/api-500-errors.md)

### 常见问题

**Q: Web 服务器无法启动？**
```bash
# 检查端口是否被占用
lsof -i :18790

# 查看日志
tail -f /tmp/mad-web-server.log
```

**Q: 讨论数据丢失？**
- 数据存储在 `~/.openclaw/multi-agent-discuss/discussions/`
- 项目组数据存储在 `~/.openclaw/multi-agent-discuss/projects/`
- 检查文件权限和磁盘空间

**Q: Agent 不响应？**
- 检查 OpenClaw 配置
- 查看 Agent 日志：`tail -f logs/agent-*.log`

**Q: v3.0 和 v2.x 的区别？**
- v3.0 是项目组，支持长期协作、智能标记、自动推进
- v2.x 是讨论，适合临时性、一次性对话
- 两者完全兼容，可以同时使用

### 获取帮助

- 📖 [故障排查指南](docs/troubleshooting/api-500-errors.md)
- 🐛 [提交 Issue](https://github.com/OTTTTTO/MAD/issues)
- 💬 [Discord 社区](https://discord.com/invite/clawd)

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- test/v3-integration.test.js
npm test -- test/marker-system.test.js
npm test -- test/basic.test.js
```

---

## 🤝 贡献

欢迎贡献！请提交 Issue 或 Pull Request。

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 🙏 致谢

- [OpenClaw](https://openclaw.ai) - 强大的 Agent 框架
- 所有贡献者

---

## 🚀 Roadmap

### v3.1.0（计划中）
- 🎤 多模态支持（语音输入）
- 📎 文件上传（图片、文档）
- 🌍 多语言支持

### v3.2.0（计划中）
- 👥 团队协作
- 🔐 权限管理
- 📤 项目分享

### v3.3.0（计划中）
- 📊 高级分析
- 📈 可视化报表
- 🔔 智能提醒

---

**让 Agent 们协同工作，产生更好的答案！** 🚀

**从 v3.0 开始，让 AI 自主推进你的项目！** 🤖✨
