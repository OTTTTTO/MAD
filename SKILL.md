# Multi-Agent Discussion Skill

让多个专业 Agent 在虚拟讨论组中协同工作，通过互相交流、碰撞观点，产生更全面的解决方案。

## 功能特性

✅ **虚拟讨论组** - 创建多 Agent 协作的讨论空间
✅ **动态发言** - Agent 根据上下文智能判断何时发言
✅ **互相 @** - Agent 之间可以互相提问、回应
✅ **冲突检测** - 自动识别意见分歧，组织辩论
✅ **讨论总结** - 综合多方观点形成结构化结论
✅ **过程可追溯** - 保存完整讨论历史，支持随时查看

## 使用场景

### 1. 需求评估
当用户提出新需求时，自动组织市场、需求、技术、测试等 Agent 进行评估：

```
用户：我想开发一个"自动写代码"的技能
↓
主 Agent 识别到需求评估场景
↓
启动多 Agent 讨论
↓
市场：评估商业价值
需求：梳理功能边界
技术：评估实现难度
测试：规划质量保障
↓
综合各方意见，给用户回复
```

### 2. 方案评审
当需要评审技术方案时，组织相关 Agent 讨论：

```
主 Agent：这个技术方案大家觉得怎么样？
↓
技术 Agent：分析优缺点
测试 Agent：评估测试难度
市场 Agent：考虑交付时间
↓
达成共识或识别分歧点
```

### 3. 问题解决
遇到复杂问题时，让不同视角的 Agent 共同分析：

```
主 Agent：用户反馈代码质量不稳定，怎么办？
↓
技术 Agent：分析可能原因
测试 Agent：评估影响范围
需求 Agent：考虑用户期望
↓
形成综合解决方案
```

## 快速开始

### 基础使用

```javascript
const { DiscussionOrchestrator } = require('./orchestrator.js');

// 1. 创建协调器
const orchestrator = new DiscussionOrchestrator({
  maxDuration: 300000,  // 5分钟
  maxRounds: 10,
  enableConflictDetection: true,
  enableDynamicSpeaking: true
});

// 2. 初始化
await orchestrator.initialize();

// 3. 创建讨论
const { discussionId, context } = await orchestrator.createDiscussion(
  '评估开发"自动写代码"技能的可行性',
  {
    participants: ['market_research', 'requirement', 'technical', 'testing']
  }
);

// 4. Agent 发言
await orchestrator.agentSpeak(discussionId, 'market_research', `
## 📊 商业价值评估

这个方向有价值，但需要差异化：
- 竞品：GitHub Copilot 已成熟
- 机会：聚焦中文开发者
- 建议：值得做，但不能是"另一个 Copilot"
`);

// 5. 获取讨论历史
const history = orchestrator.getDiscussionHistory(discussionId);

// 6. 结束讨论
const summary = await orchestrator.endDiscussion(discussionId);
```

### 在 OpenClaw 中使用

这个 Skill 可以被其他 Agent 调用：

```markdown
<!-- Agent System Prompt -->
当用户提出复杂需求时，使用 multi-agent-discuss skill 组织讨论：

1. 识别讨论主题
2. 选择参与角色
3. 创建虚拟讨论组
4. 引导各 Agent 发言
5. 总结讨论结果
6. 回复用户
```

## 可用角色

| 角色 | ID | 擅长领域 | Emoji |
|------|-----|----------|-------|
| 主协调员 | coordinator | 引导讨论、总结共识 | 💡 |
| 市场调研 | market_research | 商业价值、市场需求 | 📊 |
| 需求分析 | requirement | 用户需求、功能边界 | 🎯 |
| 技术可行性 | technical | 技术方案、实现难度 | 🔧 |
| 测试 | testing | 质量保障、测试策略 | 🧪 |
| 文档 | documentation | 记录讨论、整理输出 | 📝 |

## 配置选项

```javascript
const config = {
  // 讨论最大时长（毫秒）
  maxDuration: 300000,
  
  // 最大讨论轮次
  maxRounds: 10,
  
  // 最少参与者数量
  minParticipants: 2,
  
  // 启用冲突检测
  enableConflictDetection: true,
  
  // 启用动态发言
  enableDynamicSpeaking: true
};
```

## 讨论输出格式

### 讨论摘要
```json
{
  "id": "disc-1234567890",
  "topic": "评估XX功能",
  "status": "ended",
  "participants": ["market_research", "technical"],
  "messageCount": 15,
  "rounds": 5,
  "duration": 180000
}
```

### 讨论历史
```json
{
  "discussion": { "id": "...", "topic": "..." },
  "participants": [...],
  "messages": [
    {
      "id": "msg-1",
      "role": "market_research",
      "content": "## 📊 商业评估...",
      "timestamp": 1234567890,
      "round": 1
    }
  ],
  "conflicts": [],
  "summary": {
    "keyPoints": [...],
    "decisions": [...],
    "openQuestions": [...]
  }
}
```

## 高级特性

### 动态发言
Agent 会根据上下文智能判断是否需要发言：
- 被其他 Agent @ 时，必须回应
- 检测到关键词时，主动发言
- 基于发言概率随机决定

### 冲突检测
自动识别意见分歧：
- 对立观点检测（"可行" vs "不可行"）
- 识别冲突双方
- 支持组织小范围辩论

### 讨论总结
自动提取关键信息：
- 关键观点
- 达成的决策
- 未解决的问题
- 下一步行动

## 数据存储

讨论数据保存在 `~/.openclaw/multi-agent-discuss/`：

```
multi-agent-discuss/
├── discussions/        # 讨论记录（JSON）
│   ├── disc-123.json
│   └── disc-456.json
└── logs/              # 日志文件
```

## 扩展开发

### 添加新角色

1. 在 `agents/prompts/` 创建新的 prompt 文件
2. 在 `orchestrator.js` 的 `AGENT_ROLES` 中注册：

```javascript
const AGENT_ROLES = {
  // ... 现有角色
  
  security: {
    id: 'security',
    role: '安全专家',
    emoji: '🔒',
    agentId: 'main',
    systemPrompt: '你是安全专家...',
    triggerKeywords: ['安全', '漏洞', '权限'],
    speakProbability: 0.5
  }
};
```

### 自定义冲突检测

继承 `DiscussionOrchestrator` 并重写 `detectConflicts` 方法：

```javascript
class CustomOrchestrator extends DiscussionOrchestrator {
  async detectConflicts(context) {
    // 自定义冲突检测逻辑
    const conflicts = await super.detectConflicts(context);
    
    // 添加自定义检测
    // ...
    
    return conflicts;
  }
}
```

## 性能考虑

- 讨论数据定期清理（默认 24 小时）
- 支持手动清理过期讨论
- 消息历史限制在内存中

## 故障排查

### 讨论未正常结束
- 检查 `maxDuration` 和 `maxRounds` 配置
- 查看日志文件了解详情

### Agent 未响应
- 确认 Agent 配置正确
- 检查触发关键词是否匹配

### 冲突检测不准确
- 调整 `confidenceThreshold`
- 扩展对立模式列表

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

---

## FileBase 协调器

**目录：** `filebase-coordinator/`

### 说明

FileBase协调器是MAD filebase分支的配套skill，负责处理Web界面创建的讨论。

### 使用方式

在OpenClaw聊天中发送：

```
启动MAD协调器
```

或

```
处理pending讨论
```

### 功能

协调器会自动：
1. 扫描所有pending状态的讨论
2. 为每个讨论生成4个专家的观点
3. 保存专家消息到文件
4. 更新讨论状态为completed

### 专家配置

- **技术专家** (tech_expert) - 技术架构、实现方案
- **产品专家** (product_expert) - 产品价值、用户体验
- **商业专家** (business_expert) - 商业模式、成本效益
- **运营专家** (ops_expert) - 运营策略、执行落地

### 数据流向

```
OpenClaw Skill (有tool权限)
  ↓ 调用LLM生成专家观点
共享文件系统
  ↑ 读取
Web界面 (localhost:3000, 无tool权限)
```

### 配置

- 数据目录：`/home/otto/.openclaw/multi-agent-discuss`
- 自动处理：扫描所有pending讨论
- 每个讨论：生成4个专家观点

### 示例

```
用户: 启动MAD协调器

[协调器]
🚀 MAD协调器启动

📋 发现 1 个pending讨论

🎯 开始处理讨论: disc-xxx
📝 主题: 请帮我设计一个高可用的微服务分层架构

🤖 正在生成技术专家观点...
✅ 技术专家观点已生成

🤖 正在生成产品专家观点...
✅ 产品专家观点已生成

🤖 正在生成商业专家观点...
✅ 商业专家观点已生成

🤖 正在生成运营专家观点...
✅ 运营专家观点已生成

✅ 讨论 disc-xxx 处理完成
📊 生成专家观点: 4条

现在可以在Web界面 (localhost:3000) 查看专家讨论内容了！
```

