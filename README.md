# Multi-Agent Discussion

> 让多个专业 Agent 在虚拟讨论组中协同工作

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-blue)](https://openclaw.ai)

## 📖 简介

Multi-Agent Discussion 是一个 OpenClaw Skill，让多个专业 Agent 在虚拟讨论组中协同工作。Agent 之间可以互相 @、回应观点、形成共识，最终产生比单个 Agent 更全面的解决方案。

### 核心特性

- ✅ **虚拟讨论组** - 创建多 Agent 协作的讨论空间
- ✅ **动态发言** - Agent 根据上下文智能判断何时发言
- ✅ **互相 @** - Agent 之间可以互相提问、回应
- ✅ **冲突检测** - 自动识别意见分歧，组织辩论
- ✅ **讨论总结** - 综合多方观点形成结构化结论
- ✅ **过程可追溯** - 保存完整讨论历史

## 🚀 快速开始

### 安装

```bash
cd ~/.openclaw/skills
git clone https://github.com/OTTTTTO/multi-agent-discuss.git
cd multi-agent-discuss
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

## 💡 使用示例

### 场景 1：需求评估

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

### 场景 2：方案评审

```
主 Agent：这个技术方案大家觉得怎么样？

↓ 多 Agent 讨论 ↓

技术 Agent：分析优缺点
测试 Agent：评估测试难度
市场 Agent：考虑交付时间

↓ 达成共识 ↓

形成评审意见
```

## 🎭 可用角色

| 角色 | Emoji | 职责 |
|------|-------|------|
| 主协调员 | 💡 | 引导讨论、总结共识 |
| 市场调研 | 📊 | 商业价值、市场需求 |
| 需求分析 | 🎯 | 用户需求、功能边界 |
| 技术可行性 | 🔧 | 技术方案、实现难度 |
| 测试 | 🧪 | 质量保障、测试策略 |
| 文档 | 📝 | 记录讨论、整理输出 |

## 📚 文档

详细文档请查看：
- [SKILL.md](./SKILL.md) - 完整功能说明
- [agents/prompts/](./agents/prompts/) - 各角色配置

## 🔧 配置

```javascript
const config = {
  maxDuration: 300000,        // 讨论最大时长（5分钟）
  maxRounds: 10,              // 最大讨论轮次
  enableConflictDetection: true,  // 启用冲突检测
  enableDynamicSpeaking: true     // 启用动态发言
};

const orchestrator = new DiscussionOrchestrator(config);
```

## 📂 项目结构

```
multi-agent-discuss/
├── orchestrator.js           # 核心协调引擎
├── package.json              # 项目配置
├── SKILL.md                  # Skill 说明
├── README.md                 # 本文件
├── agents/
│   └── prompts/              # 各角色系统提示词
│       ├── coordinator.md    # 主协调员
│       ├── market_research.md
│       ├── requirement.md
│       ├── technical.md
│       ├── testing.md
│       └── documentation.md
└── test/
    └── basic.test.js         # 基础测试
```

## 🧪 测试

```bash
npm test
```

## 🤝 贡献

欢迎贡献！请提交 Issue 或 Pull Request。

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🙏 致谢

- [OpenClaw](https://openclaw.ai) - 强大的 Agent 框架
- 所有贡献者

---

**让 Agent 们协同工作，产生更好的答案！** 🚀
