# MAD 用户使用指南

## 概述

MAD (Multi-Agent Discussion) 有两个主要界面：
1. **Web 观察器** - 查看正在进行的讨论
2. **CLI 启动器** - 创建并发起 Agent 讨论

---

## 重要说明

### 🌐 Web 界面的作用

**Web 界面（http://localhost:18790）是一个观察器（Viewer），用于：**

- ✅ 查看正在进行的讨论
- ✅ 查看历史讨论记录
- ✅ 创建讨论组框架
- ✅ 管理讨论标签
- ✅ 查看 Agent 统计
- ✅ 导出讨论内容

**Web 界面不能用于：**
- ❌ 发起 Agent 讨论
- ❌ 控制 Agent 发言
- ❌ 实时参与讨论

### 🔧 如何发起讨论

要发起 Agent 讨论，需要使用以下方式之一：

---

## 方法一：使用快速启动脚本（推荐）

### 基础用法

```bash
cd ~/.openclaw/skills/multi-agent-discuss
node quick-start.js
```

### 使用模板

```bash
# 头脑风暴模板（8 轮，3 分钟）
node quick-start.js --template brainstorm

# 技术架构模板（6 轮，2.5 分钟）
node quick-start.js --template technical

# 用户研究模板（5 轮，2 分钟）
node quick-start.js --template user-research

# 快速决策模板（3 轮，1 分钟）
node quick-start.js --template quick
```

### 自定义主题

```bash
# 自定义主题
node quick-start.js --topic "评估开发新功能的可行性"

# 自定义轮数和时长
node quick-start.js --topic "技术方案讨论" --rounds 10 --duration 300000
```

### 命令行选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--topic` | 讨论主题 | 演示主题 |
| `--rounds` | 讨论轮数 | 5 |
| `--duration` | 最大时长（毫秒） | 120000 (2分钟) |
| `--template` | 使用预设模板 | 无 |
| `--help` | 显示帮助信息 | - |

---

## 方法二：在 Web 界面创建 + CLI 启动

### 步骤 1：在 Web 界面创建讨论组

1. 打开 http://localhost:18790
2. 点击左侧 **"➕ 新建"** 按钮
3. 选择一个模板（需求评估、技术评审等）
4. 输入讨论背景（可选）
5. 点击确定

**此时会创建一个空的讨论组框架，但 Agent 还不会开始讨论。**

### 步骤 2：在命令行启动讨论

创建讨论组后，会返回一个 `discussionId`，例如：`disc-1770020462425`

使用这个 ID 启动讨论：

```bash
cd ~/.openclaw/skills/multi-agent-discuss

# 方式 1：使用 Node.js 脚本
node -e "
const { DiscussionOrchestrator } = require('./orchestrator.js');

(async () => {
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();
  
  // 启动已有的讨论组
  await orchestrator.runDiscussion('disc-1770020462425');
})();
"
```

或者创建一个启动脚本：

```javascript
// start-discussion.js
const { DiscussionOrchestrator } = require('./orchestrator.js');

async function startDiscussion(discussionId) {
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();
  
  console.log(`启动讨论组: ${discussionId}`);
  await orchestrator.runDiscussion(discussionId);
  
  console.log('讨论完成！');
}

// 使用传入的 discussionId 或使用默认值
const discussionId = process.argv[2] || 'disc-1770020462425';
startDiscussion(discussionId).catch(console.error);
```

运行：
```bash
node start-discussion.js disc-1770020462425
```

---

## 方法三：编程方式（完整控制）

### 创建并启动讨论

```javascript
const { DiscussionOrchestrator } = require('./orchestrator.js');

async function main() {
  // 1. 初始化协调器
  const orchestrator = new DiscussionOrchestrator({
    maxRounds: 5,           // 最大讨论轮数
    maxDuration: 120000,     // 最大时长（毫秒）
    enableConflictDetection: true,   // 启用冲突检测
    enableDynamicSpeaking: true      // 启用动态发言
  });
  
  await orchestrator.initialize();
  
  // 2. 创建讨论组
  const { discussionId } = await orchestrator.createDiscussion(
    '评估开发新功能的可行性',
    {
      participants: ['market_research', 'technical', 'testing']
    }
  );
  
  console.log(`讨论组已创建: ${discussionId}`);
  
  // 3. 启动讨论
  await orchestrator.runDiscussion(discussionId);
  
  console.log('讨论完成！');
  
  // 4. 获取讨论历史
  const history = orchestrator.getDiscussionHistory(discussionId);
  console.log(`共 ${history.messages.length} 条消息`);
}

main().catch(console.error);
```

### 使用模板创建

```javascript
const { DiscussionOrchestrator } = require('./orchestrator.js');

async function main() {
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();
  
  // 使用模板创建讨论
  const result = await orchestrator.createDiscussionFromTemplate(
    'requirement-evaluation',  // 模板 ID
    {
      context: '我们计划开发一个自动写代码的功能'
    }
  );
  
  console.log(`讨论组已创建: ${result.discussionId}`);
  
  // 启动讨论
  await orchestrator.runDiscussion(result.discussionId);
}

main().catch(console.error);
```

---

## 方法四：在 OpenClaw 中使用

如果你的环境配置了 OpenClaw，可以直接在聊天中触发：

```javascript
// 在 OpenClaw 配置文件中启用 MAD
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

然后在聊天中：
```
请帮我评估一下开发自动写代码功能的可行性
```

OpenClaw 会自动调用 MAD skill 创建讨论组并发起讨论。

---

## 工作流程总结

```
┌─────────────────────────────────────────────────────────────┐
│                    MAD 使用流程                              │
└─────────────────────────────────────────────────────────────┘

方式一：快速开始
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  CLI 命令    │ -> │ 创建讨论组   │ -> │ Agent 开始   │
│quick-start.js│    │ + 启动讨论   │    │   讨论       │
└──────────────┘    └──────────────┘    └──────────────┘
                          ↓
                    ┌──────────────┐
                    │  Web 界面    │
                    │  实时观察    │
                    └──────────────┘

方式二：分步操作
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Web 界面    │ -> │ 创建讨论组   │ -> │ CLI 启动     │
│  创建框架    │    │ (获取 ID)    │ -> │   讨论       │
└──────────────┘    └──────────────┘    └──────────────┘
                          ↓
                    ┌──────────────┐
                    │  Web 界面    │
                    │  实时观察    │
                    └──────────────┘

方式三：编程控制
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Node.js     │ -> │ 创建讨论组   │ -> │ 启动讨论     │
│   代码       │    │ + 启动讨论   │ -> │ Agent 开始   │
└──────────────┘    └──────────────┘    └──────────────┘
                          ↓
                    ┌──────────────┐
                    │  Web 界面    │
                    │  实时观察    │
                    └──────────────┘
```

---

## 常见问题

### Q: 为什么 Web 界面不能直接发起讨论？

**A:** MAD 的设计理念是分离"创建"和"执行"：
- **Web 界面** = 观察器（Observer）
- **CLI/代码** = 执行器（Executor）

这样的好处是：
- ✅ 讨论在后台运行，不依赖浏览器
- ✅ 可以批量创建多个讨论组
- ✅ 可以编程控制讨论流程
- ✅ Web 界面专注于展示和交互

### Q: 如何在 Web 界面看到正在进行的讨论？

**A:**
1. 在 CLI 启动讨论后
2. 打开 Web 界面 http://localhost:18790
3. 讨论会自动出现在左侧列表
4. 点击讨论组即可实时查看消息

### Q: 可以同时运行多个讨论组吗？

**A:** 可以！
```bash
# 终端 1
node start-discussion.js disc-1770020462425

# 终端 2
node start-discussion.js disc-1770020462426

# 终端 3
node quick-start.js --template brainstorm
```

Web 界面会同时显示所有讨论组。

### Q: 讨论数据保存在哪里？

**A:** 讨论数据保存在 `~/.openclaw/multi-agent-discuss/discussions/` 目录。

### Q: 如何导出讨论记录？

**A:** 在 Web 界面中：
1. 选择一个讨论组
2. 点击 **"导出"** 按钮
3. 选择 Markdown 或 JSON 格式

---

## 下一步

- 📖 [完整 API 文档](./docs/api.md)
- 🎨 [自定义 Agent 角色](./docs/custom-agents.md)
- 📋 [模板系统](./docs/templates.md)
- 🔧 [高级配置](./docs/advanced-config.md)

---

**最后更新：** 2026-02-02
**维护者：** MAD 开发团队
