# MAD v0.1.1 使用指南

## 🎯 版本特性

MAD v0.1.1 实现了**协作式讨论系统**，通过主协调器和多专家的@机制实现真实的团队协作流程。

### 核心特性

✅ **主协调器智能拆解** - 自动分析话题，匹配相关专家
✅ **@驱动响应** - 专家只在收到@时回复，避免混乱
✅ **专家互相@** - 专家可以主动邀请其他专家协作
✅ **自动收敛** - 讨论达到最大轮次或所有@响应后自动结束
✅ **智能总结** - 主协调器综合各方观点形成结构化总结

---

## 🚀 快速开始

### 1. 启动Web服务器

```bash
cd /home/otto/.npm-global/lib/node_modules/openclaw/skills/MAD/MAD/filebase
node start-web.js
```

访问：http://localhost:3000

### 2. 创建讨论

在Web界面点击"新建讨论"，输入话题，例如：
```
如何设计一个高可用的微服务架构？
```

### 3. 启动协调器

在OpenClaw中发送：
```
启动MAD协调器
```

协调器会自动处理pending讨论。

---

## 📋 协作流程

### 阶段1: 主协调器分析话题

```
用户: 如何设计高可用微服务架构？
   ↓
主协调器: 分析话题
   - 识别核心问题
   - 匹配相关专家
   - 制定讨论计划
```

### 阶段2: 主协调器@专家

```
主协调器: @技术专家 请回答：如何设计高可用微服务架构？
主协调器: @运营专家 请回答：如何保障服务稳定性？
```

### 阶段3: 专家响应和协作

```
技术专家: 建议使用Kong + K8s + 微服务架构...
         (置信度: 85%)
         🤝 协作邀请: @产品专家 确认用户需求

产品专家: 用户需要高并发、低延迟...
```

### 阶段4: 讨论收敛

```
- 所有@都已响应
- 或达到最大轮次（5轮）
   ↓
主协调器: 准备总结...
```

### 阶段5: 主协调器总结

```
📋 讨论总结

核心要点：
- 采用微服务架构提升可扩展性
- 使用K8s实现容器编排
- Kong作为API网关

建议：
- 优先实现核心服务
- 建立监控告警体系
- 制定应急预案

参与专家：技术专家、产品专家、运营专家
```

---

## 🤖 专家系统

### 技术专家 (tech_expert)

**擅长领域：**
- 技术架构设计
- 系统实现方案
- 技术选型
- 性能优化

**关键词：** 技术、架构、开发、系统、平台

**协作对象：** 产品专家、运营专家

---

### 产品专家 (product_expert)

**擅长领域：**
- 产品功能设计
- 用户需求分析
- 用户体验优化
- 需求优先级

**关键词：** 产品、用户、需求、体验、功能

**协作对象：** 技术专家、商业专家

---

### 商业专家 (business_expert)

**擅长领域：**
- 商业模式设计
- 成本效益分析
- 市场策略
- ROI评估

**关键词：** 商业、成本、收益、市场、竞争

**协作对象：** 产品专家、运营专家

---

### 运营专家 (ops_expert)

**擅长领域：**
- 运营策略
- 执行方案
- 资源规划
- 效果评估

**关键词：** 运营、推广、执行、策略、数据

**协作对象：** 商业专家、技术专家

---

## 📊 消息类型

### 1. MENTION - @消息

```
主协调器 @技术专家 请回答问题
```

**状态：**
- ⏳ 待响应 - 专家尚未回复
- ✅ 已响应 - 专家已回复

---

### 2. EXPERT_RESPONSE - 专家回复

```
技术专家回复:
[具体观点内容]

置信度: 85%
🤝 协作邀请: @产品专家
```

**包含内容：**
- 专家观点
- 置信度评估
- 是否需要协作
- 协作原因

---

### 3. COLLABORATION - 协作@

```
技术专家 → @产品专家
原因: 需要确认用户需求
```

---

### 4. SUMMARY - 总结

```
📋 讨论总结

关键要点：
- 要点1
- 要点2

建议：
- 建议1
- 建议2

参与专家：技术专家、产品专家
```

---

## 🧪 测试

### 创建测试讨论

```bash
cd /home/otto/.npm-global/lib/node_modules/openclaw/skills/MAD/MAD/filebase-coordinator
node test-v0.1.1.js
```

### 手动测试

1. 在Web界面创建讨论
2. 在OpenClaw启动协调器
3. 观察消息生成
4. 查看讨论总结

---

## 🔧 配置

### LLM配置

v0.1.1支持LLM和Fallback两种模式：

**LLM模式**（推荐）：
- 需要配置OpenClaw的LLM工具
- 提供高质量分析和建议

**Fallback模式**：
- 基于关键词匹配
- 提供预设回复
- 用于测试和演示

### 轮次配置

```javascript
const maxRounds = 5; // 最大讨论轮次
```

### 数据目录

```
/home/otto/.openclaw/multi-agent-discuss/
├── discussions/          # 讨论数据
│   └── disc-xxx/
│       ├── discussion.json
│       └── messages.jsonl
├── requests/            # 请求队列
├── reports/             # 报告输出
└── logs/                # 日志文件
```

---

## 📝 API

### 启动协调器

```javascript
const { main } = require('./coordinator-v0.1.1.js');

// 在OpenClaw Skill中调用
await main(tool); // tool是OpenClaw提供的LLM工具
```

### 主协调器API

```javascript
const { MainCoordinator } = require('./main-coordinator.js');

const coordinator = new MainCoordinator(tool);

// 分析话题
const analysis = await coordinator.analyzeTopic(topic);

// @专家
await coordinator.mentionExpert(expertId, question, discussionId);

// 判断是否结束
const shouldEnd = await coordinator.shouldConclude(discussion);

// 生成总结
const summary = await coordinator.generateSummary(discussion);
```

### 专家Agent API

```javascript
const { ExpertAgent } = require('./expert-agent.js');

const agent = new ExpertAgent('tech_expert', tool);

// 处理@
const response = await agent.handleMention(mentionMsg, discussion, allMessages);
```

---

## 🎨 Web UI

### 消息渲染

v0.1.1提供了全新的消息渲染器：

```javascript
const { MessageRenderer, MESSAGE_STYLES } = require('./message-renderer.js');

// 创建渲染器
const renderer = new MessageRenderer(container);

// 渲染消息
renderer.renderMessages(messages);

// 注入样式
document.head.insertAdjacentHTML('beforeend', MESSAGE_STYLES);
```

### 支持的消息显示

- 💬 用户话题 - 蓝色卡片
- 📢 @消息 - 黄色卡片
- 💬 专家回复 - 灰色卡片，带头像
- 🤝 协作@ - 粉色卡片
- 📋 总结 - 渐变紫色卡片

---

## 📈 性能优化

### LLM调用优化

- 话题分析：temperature=0.8（高创造性）
- 专家回答：temperature=0.7（平衡）
- 协作判断：temperature=0.5（确定性）
- 总结生成：temperature=0.5（确定性）

### 延迟控制

```javascript
await new Promise(resolve => setTimeout(resolve, 1000)); // API限流保护
```

---

## 🚧 已知限制

1. **LLM依赖** - 高质量功能需要LLM配置
2. **轮次限制** - 最多5轮讨论
3. **专家固定** - 当前只支持4个预定义专家
4. **Web轮询** - Web界面需要刷新查看更新

---

## 🗺️ 路线图

### v0.1.2（计划中）

- [ ] WebSocket实时更新
- [ ] 动态专家生成
- [ ] 讨论分支
- [ ] 历史对比

### v0.2.0（规划中）

- [ ] 多模态输入（图片、文件）
- [ ] 专家自组织
- [ ] 知识库集成
- [ ] 讨论模板

---

## 📄 相关文档

- [开发计划](../../../../../workspace/pm-dev/mad-0.1.1-plan.md)
- [清理报告](../../../../../workspace/pm-dev/filebase-cleanup-report.md)
- [主分支README](../../../../MAD/README.md)

---

**版本：** v0.1.1-dev
**最后更新：** 2026-02-06
**状态：** 开发中 ⏳
