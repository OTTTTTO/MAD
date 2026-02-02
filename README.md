# MAD (Multi-Agent Discussion)

> 让多个专业 Agent 在虚拟讨论组中协同工作

**MAD** = Multi-Agent Discussion 的简称，读作 /mæd/

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
- ✅ **过程可追溯** - 保存完整讨论历史，随时查看
- ✅ **Web 可视化** - 实时查看讨论组内容（v1.0.1+）
- ✅ **Agent 统计** - Karma 系统和等级机制（v1.1.0+）
- ✅ **导出功能** - 支持 Markdown/JSON 导出（v1.1.1+）
- ✅ **实时推送** - WebSocket 实时更新（v1.2.0+）
- ✅ **讨论模板市场** - 10+ 预置模板，一键创建讨论（v2.0.0+）
- ✅ **Agent 自定义** - 创建自己的 Agent 角色（v2.0.0+）
- ✅ **相似度检测** - 查找相似讨论，避免重复工作（v2.0.0+）

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

### 场景 2：Web 可视化界面

```bash
# 启动 Web 服务器
npm start

# 访问 Web 界面
# http://localhost:18790
```

**功能：**
- 📋 查看所有讨论组
- 💬 实时阅读讨论内容
- 📊 查看 Agent 统计和 Karma
- 📥 导出讨论记录
- 🔄 自动刷新（5秒）或 WebSocket 实时推送

```bash
# 启动 WebSocket 服务器（实时推送）
npm run start:ws

# 访问 Web 界面
# http://localhost:18790
```

### 场景 3：方案评审

```
主 Agent：这个技术方案大家觉得怎么样？

↓ 多 Agent 讨论 ↓

技术 Agent：分析优缺点
测试 Agent：评估测试难度
市场 Agent：考虑交付时间

↓ 达成共识 ↓

形成评审意见
```

### 场景 4：使用模板市场（v2.0.0+）

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

### 场景 5：自定义 Agent（v2.0.0+）

```javascript
// 通过 Web 界面创建自定义 Agent
// 或通过 API 创建

await orchestrator.createCustomAgent({
  name: '安全专家',
  emoji: '🔒',
  systemPrompt: '你是安全专家，专注于信息安全...',
  triggerKeywords: ['安全', '漏洞', '加密'],
  expertise: ['安全', '漏洞分析', '加密'],
  speakProbability: 0.6
});

// 在讨论中使用自定义 Agent
await orchestrator.createDiscussion('评估系统安全性', {
  participants: ['custom-001', 'technical', 'testing']
});
```

### 场景 6：查找相似讨论（v2.0.0+）

```javascript
// 查找与当前讨论相似的其他讨论
const similar = orchestrator.findSimilarDiscussions(
  discussionId,
  0.3,  // 相似度阈值
  10    // 最多返回 10 个
);

// 相似讨论可用于：
// - 参考历史讨论结果
// - 避免重复讨论
// - 合并相关讨论
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

## 📊 版本历史

### v2.0.0 (2026-02-02) - **重大更新** 🎉
- ✨ 讨论相似度检测
  - TF-IDF 文本向量化算法
  - 余弦相似度计算
  - 相似讨论查找和推荐
  - 共同关键词提取
  - 讨论合并功能
- ✨ 讨论模板市场
  - 10 个高质量预置模板
  - 模板浏览和搜索
  - 分类过滤（产品/技术/市场/管理）
  - 模板评分和评论系统
  - 一键使用模板创建讨论
- ✨ Agent 自定义
  - 创建完全自定义的 Agent 角色
  - 系统提示词编辑器
  - 触发关键词和专长标签设置
  - 发言概率控制
  - Agent 测试功能
  - 3 个预置自定义 Agent
- 🐛 修复创建讨论时的参与者选择问题
- 📝 完整的测试套件

### v1.9.0 (2026-02-02)
- ✨ 智能推荐参与者
  - 基于讨论主题自动推荐相关 Agent
  - 显示推荐理由和匹配度
  - 支持专长标签匹配
  - 一键添加推荐 Agent
- ✨ 讨论转待办事项
  - 自动识别讨论中的行动项
  - 提取责任人、截止日期、优先级
  - 生成待办清单
  - 支持导出为文本文件
- ✨ 讨论相似度检测（开发中）

### v1.8.0 (2026-02-02)
- ✨ 讨论高亮和标注
  - 多种颜色高亮（黄色、蓝色、绿色、粉色、橙色）
  - 支持添加文字标注
  - 高亮状态持久化到 localStorage
  - 一键复制消息内容
- ✨ 可视化思维链
  - 记录 Agent 的推理步骤
  - 树状图展示思维过程
  - 可展开/折叠每个步骤
  - 显示推理时间和置信度
- ✨ 讨论质量评分
  - 四维度评分：创新性、完整性、可行性、价值性
  - 实时计算讨论质量
  - 评分等级：优秀/良好/一般/需改进
  - 可视化评分趋势

### v1.7.0 (2026-02-02)
- ✨ 讨论模板系统
  - 5 个预定义模板（需求评估、技术评审、方案讨论、问题解决、自定义）
  - 一键创建讨论
  - 参数化配置
  - 模板管理（CRUD）

### v1.6.0 (2026-02-02)
- ✨ 讨论统计和分析
- 📊 详细的分析数据
- 📈 Agent 行为统计
- 💬 参与度分析

### v1.5.0 (2026-02-02)
- ✨ 多讨论管理
- 📋 标签页系统
- 🔄 快速切换讨论
- 📌 固定功能
- ⌨️ 键盘快捷键

### v1.4.0 (2026-02-02)
- ✨ 主题定制和响应式设计
- 🎨 深色/浅色主题切换
- 🎨 CSS 变量系统
- 💾 主题持久化
- 📱 移动端适配

### v1.3.0 (2026-02-02)
- ✨ 搜索和过滤功能
- 🔍 全文搜索
- 🔎 搜索结果高亮
- 🎯 状态过滤器（进行中/已结束）
- ⚡ 实时搜索

### v1.2.0 (2026-02-02) - Major Update
- ✨ WebSocket 实时推送
- 🚀 新消息立即显示
- 📊 Agent 统计实时更新
- 🔧 自动重连和降级机制

### v1.1.1 (2026-02-02)
- ✨ 导出功能（Markdown/JSON）
- 📥 文件下载
- 📝 完整讨论记录导出

### v1.1.0 (2026-02-02)
- ✨ Agent 统计系统
- ⭐ Karma 计分机制
- 🏆 等级系统（新手→大师）
- 📊 API: /api/agents, /api/agent/:id

### v1.0.1 (2026-02-02)
- ✨ Web 可视化界面
- 💬 实时查看讨论组内容
- 📋 讨论列表展示
- 🔄 自动刷新（5秒）

### v1.0.0 (2026-02-01)
- 🎉 初始版本
- ✅ 核心讨论引擎
- 🤖 6 个专业 Agent 角色
- ✅ 完整测试套件

## 📂 项目结构

```
mad/
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
├── web/
│   ├── server.js             # HTTP 服务器
│   ├── websocket.js          # WebSocket 服务器
│   └── public/               # Web 前端
│       ├── index.html
│       ├── style.css
│       └── app.js
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
