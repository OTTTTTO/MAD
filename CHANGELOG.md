# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2026-02-04

### 🎯 重大更新 - 主界面集成真实LLM

#### 核心突破

**从模板到真实LLM**：
- ❌ 之前：主界面讨论组使用模板对话
- ✅ 现在：主界面讨论组自动使用真实LLM（如果可用）

#### 功能更新

**主界面讨论组增强**：
- ✅ `/api/skills/create` API智能判断
  - 如果orchestrator配置了tool → 使用真实LLM
  - 如果未配置 → 自动回退到模板模式
- ✅ 返回值包含`llmUsed`标志，指示是否使用LLM
- ✅ 兼容v3.6.0接口格式

**用户体验改进**：
- ✅ 用户无需关心底层实现
- ✅ 有LLM时自动使用，无LLM时自动降级
- ✅ 无缝切换，对用户透明

#### 技术实现

```javascript
// /api/skills/create API逻辑
if (orchestrator.discussionEngine) {
  // 使用真实LLM创建讨论
  const result = await orchestrator.createLLMDiscussion(userInput);
  return {
    success: true,
    llmUsed: true,
    expertCount: result.summary.expertCount
  };
} else {
  // 回退到模板模式
  const result = await orchestrator.createDiscussion(userInput);
  return {
    success: true,
    llmUsed: false,
    experts: result.participants
  };
}
```

#### 智能降级

**LLM可用时**：
- 专家使用真实LLM生成内容
- 内容质量高，针对性强
- 自动保存到数据库

**LLM不可用时**：
- 自动使用模板模式
- 保证功能可用
- 用户无感知

#### 破坏性变更

**无破坏性变更**：
- ✅ 完全向后兼容
- ✅ API接口格式不变
- ✅ 自动判断LLM可用性

#### 改进
- ✅ 主界面直接受益于LLM功能
- ✅ 无需创建新界面
- ✅ 用户操作流程不变

#### 已知限制
- ⚠️ Web服务器默认未配置tool（使用模板）
- ✅ 可以在Agent环境中配置tool启用LLM
- ✅ 提供降级机制保证可用性

---

## [4.0.10] - 2026-02-04

### 🎯 架构修正 - 正确的分层设计

#### 核心认知转变

**之前的错误理解**：
- ❌ Web界面需要直接调用Agent/sessions_spawn
- ❌ "Web环境无法调用LLM"

**正确的架构理解**（用户指导）：
- ✅ Web = 展示层，只负责显示数据
- ✅ Orchestrator = 桥梁层，连接Web和Agent
- ✅ DiscussionEngine = 业务逻辑层，使用LLM

#### 架构设计

```
用户 → Web界面（展示）
       ↓ HTTP
    Web API
       ↓ 调用
  Orchestrator（桥梁，在Agent环境）
       ↓ 使用
  DiscussionEngine（LLM调用）
       ↓ 调用
  sessions_spawn（真实LLM）
```

#### 新增功能

**Orchestrator增强**：
- ✅ 构造函数支持`config.tool`参数
- ✅ 如果配置了tool，自动初始化DiscussionEngine
- ✅ 新增`createLLMDiscussion()`方法
  - 调用DiscussionEngine启动LLM讨论
  - 保存讨论结果到数据库
  - 返回完整的专家意见

**Web API更新**：
- ✅ `/api/v4/llm-discussion` 智能判断
  - 如果orchestrator有tool → 调用真实LLM
  - 如果orchestrator无tool → 返回使用说明
- ✅ 不再硬编码"无法调用"，而是根据实际配置判断

#### 技术实现

```javascript
// orchestrator.js - 桥梁层
class DiscussionOrchestrator {
  constructor(config) {
    // 如果配置了tool，初始化LLM引擎
    if (config.tool) {
      this.discussionEngine = new DiscussionEngine({ tool: config.tool });
    }
  }

  async createLLMDiscussion(topic) {
    // 调用LLM讨论
    const result = await this.discussionEngine.startDiscussion(topic);

    // 保存到数据库
    const discussion = await this.discussionManager.createDiscussion(...);

    // 返回结果
    return { success: true, discussion, llmResult: result };
  }
}

// web/server.js - API层
if (orchestrator.discussionEngine) {
  // 调用真实LLM
  const result = await orchestrator.createLLMDiscussion(topic);
  res.end(JSON.stringify(result));
} else {
  // 返回说明
  res.end(JSON.stringify({ message: '需要配置tool' }));
}
```

#### 关键改进

**职责清晰**：
- Web：HTTP协议处理，参数校验
- Orchestrator：业务协调，数据持久化
- DiscussionEngine：LLM调用，专家协作

**灵活配置**：
- Web环境：orchestrator无tool，返回说明
- Agent环境：orchestrator有tool，调用LLM
- 同一套代码，不同环境

#### 破坏性变更

**Orchestrator初始化**：
- 新增可选的`config.tool`参数
- 如果需要在Web中使用LLM，需要配置tool

#### 已知限制

- ⚠️ Web服务器默认未配置tool（正常行为）
- ✅ 可以在Agent环境中配置tool使用LLM
- ✅ Web界面仍可展示讨论结果

---

## [4.0.9] - 2026-02-04

### ✨ Web界面集成 - LLM智能讨论

#### 新增功能

**Web API端点**：
- ✅ `/api/v4/llm-discussion` - LLM讨论API（返回使用说明）
- ✅ `/api/v4/llm-discussion/demo` - 模拟演示API（预设响应）
- ✅ 两个API端点都支持POST请求，接收话题参数

**Web界面**：
- ✅ `/llm-discussion.html` - 全新的LLM智能讨论界面
- ✅ 美观的UI设计，渐变色彩
- ✅ 双模式选择器：模拟演示 / 真实LLM
- ✅ 示例话题快速填充
- ✅ 实时加载动画
- ✅ 响应式布局，支持移动端

**功能特性**：
- ✅ 模拟模式：使用预设响应，快速体验
- ✅ 真实LLM模式：显示Agent使用代码示例
- ✅ 根据话题关键词自动选择专家
- ✅ 专家意见卡片式展示
- ✅ 代码高亮显示

#### 技术实现

```javascript
// API调用示例
POST /api/v4/llm-discussion/demo
{
  "topic": "我想开发一个在线教育平台"
}

// 响应
{
  "success": true,
  "mode": "demo",
  "experts": [
    { "name": "技术专家", "response": "..." },
    { "name": "产品专家", "response": "..." }
  ]
}
```

#### 使用说明

**Web界面访问**：
```
http://localhost:18790/llm-discussion.html
```

**真实LLM使用**：
```javascript
// 在OpenClaw Agent中
const { DiscussionEngine } = require('./src/core/v4/discussion-engine');
const engine = new DiscussionEngine({ tool: this.tool });
const result = await engine.startDiscussion({ content: "..." });
```

#### 改进
- ✅ 用户友好的Web界面
- ✅ 清晰的模式说明
- ✅ 代码示例展示
- ✅ 实时反馈和加载状态

#### 已知限制
- ⚠️ Web环境无法直接调用真实LLM（需要OpenClaw tool注入）
- ⚠️ 真实LLM功能需要在Agent环境中使用
- ✅ 提供了模拟演示作为替代

---

## [4.0.8] - 2026-02-04

### ✨ 重大更新 - 真实LLM集成

#### 核心突破
- ✅ **真实LLM调用**：使用OpenClaw的sessions_spawn创建专家sub-agents
- ✅ **真正的专家意见**：专家使用LLM生成内容，不再是模板
- ✅ **并行LLM执行**：多个专家同时调用LLM，提升效率
- ✅ **异步响应处理**：支持等待和获取LLM生成的内容

#### 新增功能

**Expert类增强**：
- ✅ `respondWithLLM()` - 使用sessions_spawn调用LLM
- ✅ `waitForLLMResponse()` - 等待并获取LLM响应
- ✅ `buildSystemPrompt()` - 为每个专家构建专属system prompt
- ✅ 4个专家的完整system prompts
  - 技术专家：架构、性能、安全、实施建议
  - 产品专家：用户分析、需求挖掘、产品设计
  - 商业专家：商业模式、市场分析、盈利策略
  - 运营专家：增长策略、运营规划、具体方案

**DiscussionEngine增强**：
- ✅ `parallelExpertSpeak()` 重构为真实LLM调用
- ✅ 并行spawn多个专家sub-agents
- ✅ 等待LLM生成并更新消息内容
- ✅ 完善的错误处理

#### 技术实现

```javascript
// 专家使用LLM生成意见
const llmResponse = await expert.respondWithLLM(question, tool);

// 等待LLM完成
const realResponse = await expert.waitForLLMResponse(runId, tool);

// 真实的专家内容，不再是模板
msg.content = realResponse;
msg.llmGenerated = true;
```

#### 测试文件
- ✅ `test-llm-integration.js` - LLM集成单元测试
- ✅ `test-v4.0.8.js` - 完整流程测试（支持模拟和真实两种模式）

#### 改进
- ✅ 专家真正使用LLM思考
- ✅ 输出内容从模板变为真实生成
- ✅ 支持异步LLM响应
- ✅ 并行提升效率

### 🔧 破坏性变更

**API变更**：
- DiscussionEngine需要注入`tool`参数
- `config.tool` 必须包含 `sessions_spawn` 和 `sessions_history`

**使用方式**：
```javascript
const engine = new DiscussionEngine({
  tool: this.tool // OpenClaw会自动注入
});
```

### 📝 已知限制

- ✅ LLM调用需要OpenClaw环境
- ✅ Web界面尚未更新（仍在使用旧API）
- ⏳ 专家协作@机制尚未使用LLM（下一版本）
- ⏳ 主协调员话题拆解仍是规则（下一版本）

### 🧪 测试

- ✅ 模拟测试：验证流程正确性
- ⏳ 真实LLM测试：需要在OpenClaw Agent中运行

---

## [4.0.7] - 2026-02-04

### ✨ 新增功能

#### 结果汇总器 📊
- ✅ 智能提取共识观点
  - 按领域分组专家意见
  - 识别每个领域的主要观点
  - 记录置信度数据
- ✅ 识别分歧观点
  - 检测超出专业领域的回应
  - 提供补充建议
- ✅ 生成行动建议
  - 基于识别的领域自动生成
  - 按优先级分级（high/medium/low）
  - 覆盖技术、产品、商业、运营4个维度
- ✅ 创建完整报告
  - 执行摘要
  - 共识观点详情
  - 分歧观点详情
  - 行动建议清单
  - 统计信息
- ✅ Markdown格式导出
  - 结构化报告
  - 支持保存为文件

#### 核心模块
- ✅ `src/core/v4/discussion-summarizer.js` - 结果汇总器（9.0KB）
- ✅ `test-v4.0.7.js` - 完整流程测试（3.3KB）

### 🔧 改进

#### 完整性
- ✅ 整合讨论引擎和总结器
- ✅ 端到端完整流程验证
- ✅ 生成可读性强的报告

#### 可测试性
- ✅ 完整流程测试（讨论→总结）
- ✅ 多领域话题测试
- ✅ Markdown生成测试

### 📝 文档

- ✅ 添加v4.0.7测试说明
- ✅ 更新报告格式示例

### 🧪 测试

- ✅ 完整讨论流程测试
- ✅ 总结生成测试
- ✅ 报告格式化测试
- ✅ @流转和介入测试

---

## [4.0.6] - 2026-02-04

### ✨ 新增功能

#### 专家讨论引擎 🚀
- ✅ 完整的讨论流程
  - 阶段1：主协调员拆解话题
  - 阶段2：专家并行发言
  - 阶段3：专家协作（@流转）
  - 阶段4：汇总结果
- ✅ 模块整合
  - 整合主协调员（v4.0.5）
  - 整合专家类（v4.0.4）
  - 整合@追踪器（v4.0.2）
  - 整合讨论监控器（v4.0.2）
- ✅ 智能@流转
  - 专家建议@其他专家
  - 自动创建被@专家
  - 被@专家给出补充意见
  - @链追踪，防止无限循环
- ✅ 监控与介入
  - 实时监控讨论深度
  - 检测异常情况
  - 主协调员适时介入
- ✅ 结果汇总
  - 统计消息数量
  - 统计专家参与度
  - 统计策略分布
  - 计算讨论时长

#### 核心模块
- ✅ `src/core/v4/discussion-engine.js` - 讨论引擎（8.1KB）
- ✅ `test-v4.0.6.js` - 功能测试文件（2.7KB）

### 🔧 改进

#### 流程完整性
- ✅ 4个阶段完整流程
- ✅ 并行处理提升效率
- ✅ 自动化协作机制

#### 可测试性
- ✅ 3个测试场景
- ✅ 单领域/多领域/模糊话题测试
- ✅ 完整流程验证

### 📝 文档

- ✅ 添加v4.0.6测试说明
- ✅ 更新流程图示

### 🧪 测试

- ✅ 单领域讨论测试
- ✅ 多领域讨论测试
- ✅ 模糊话题测试
- ✅ @流转机制测试
- ✅ 监控介入测试

---

## [4.0.5] - 2026-02-04

### ✨ 新增功能

#### 主协调员基础版 🎯
- ✅ 话题接收与理解
  - 提取话题核心内容
  - 分析话题上下文
- ✅ 智能领域识别
  - 技术领域：架构、性能、安全
  - 产品领域：用户、体验、功能
  - 商业领域：市场、盈利、竞争
  - 运营领域：增长、营销、数据
  - 自动检测关键词，匹配对应领域
  - 模糊话题默认匹配技术+产品
- ✅ 自动生成专家问题
  - 为每个领域生成3个专业问题
  - 问题模板系统
  - 结合话题内容定制化
- ✅ 专家匹配与任务分配
  - 自动创建对应领域专家
  - 为每个专家分配专属问题
  - 返回完整的任务分配结果

#### 核心模块
- ✅ `src/core/v4/main-coordinator.js` - 主协调员（5.6KB）
- ✅ `test-v4.0.5.js` - 功能测试文件（3.2KB）

### 🔧 改进

#### 智能识别
- ✅ 关键词自动匹配
- ✅ 多领域同时识别
- ✅ 模糊话题兜底策略

#### 可测试性
- ✅ 6个测试场景覆盖
- ✅ 单领域、多领域、模糊话题测试
- ✅ 测试通过率100%

### 📝 文档

- ✅ 添加v4.0.5测试说明
- ✅ 更新领域识别规则

### 🧪 测试

- ✅ 技术类话题测试
- ✅ 产品类话题测试
- ✅ 商业类话题测试
- ✅ 运营类话题测试
- ✅ 综合类话题测试
- ✅ 模糊话题测试

---

## [4.0.4] - 2026-02-04

### ✨ 新增功能

#### 专家类优化 🤖
- ✅ 宽领域专家定义（4个领域）
  - 技术专家：架构、性能、安全
  - 产品专家：需求、体验、功能
  - 商业专家：市场、盈利、竞争
  - 运营专家：增长、营销、数据
- ✅ 智能置信度评估算法
  - 关键词匹配（40%权重）
  - 领域相关性（30%权重）
  - 上下文理解（30%权重）
- ✅ 三级@决策逻辑
  - 高置信度（≥0.8）：直接回答
  - 中置信度（0.5-0.8）：回答+@其他专家
  - 低置信度（<0.5）：直接@其他专家

#### 核心模块
- ✅ `src/core/v4/expert.js` - 专家类（5.0KB）
- ✅ `test-v4.0.4.js` - 功能测试文件（2.6KB）

### 🔧 改进

#### 配置灵活性
- ✅ 置信度阈值可调
- ✅ 专家关键词可自定义
- ✅ 支持工厂函数创建专家

#### 可测试性
- ✅ 5个测试场景覆盖
- ✅ 置信度评估测试通过
- ✅ 跨领域问题测试通过

### 📝 文档

- ✅ 添加v4.0.4测试说明
- ✅ 更新专家定义示例

### 🧪 测试

- ✅ 高置信度问题测试
- ✅ 中置信度问题测试
- ✅ 低置信度问题测试
- ✅ 工厂函数测试
- ✅ 跨领域问题测试

---

## [4.0.3] - 2026-02-04

### ✨ 新增功能

#### 用户交互处理器 📝
- ✅ 自动识别缺失的关键信息
  - 关键信息检测：目标用户、核心需求、使用场景
  - 可选信息检测：预算、时间、技术偏好
  - 智能关键词匹配
- ✅ 自动生成补充问题
  - 支持多种问题类型：文本、多行文本、下拉选择
  - 问题模板系统
  - 必填/可选标记
- ✅ 用户回答处理
  - 答案验证和清洗
  - 信息充分性检查

#### 核心模块
- ✅ `src/core/v4/user-interaction-handler.js` - 用户交互处理器（4.2KB）
- ✅ `test-v4.0.3.js` - 功能测试文件（2.1KB）

### 🔧 改进

#### 配置灵活性
- ✅ 关键信息字段可配置
- ✅ 可选信息字段可配置
- ✅ 阈值可调整

#### 可测试性
- ✅ 5个测试场景覆盖
- ✅ 测试通过率100%

### 📝 文档

- ✅ 添加v4.0.3测试说明
- ✅ 更新使用示例

### 🧪 测试

- ✅ 缺失关键信息检测
- ✅ 完整信息识别
- ✅ 可选信息检测
- ✅ 用户回答处理
- ✅ 信息充分性检查

---

## [4.0.2] - 2026-02-04

### ✨ 新增功能

#### 防止无限循环机制 🔄
- ✅ @追踪器 (`MentionTracker`): 防止专家之间无限@循环
  - 追踪@链长度，防止超过阈值（默认5次）
  - 检测"乒乓"效应（A@B, B@A循环）
  - 提供@权限判断接口
- ✅ 讨论监控器 (`DiscussionMonitor`): 监控讨论深度
  - 追踪专家@轮次（默认上限5轮）
  - 追踪总讨论轮次（默认上限15轮）
  - 检测重复讨论内容
  - 自动判断是否需要介入

#### 核心模块
- ✅ `src/core/v4/mention-tracker.js` - @追踪器（2.3KB）
- ✅ `src/core/v4/discussion-monitor.js` - 讨论监控器（2.4KB）
- ✅ `test-v4.0.2.js` - 功能测试文件（1.9KB）

### 🔧 改进

#### 代码质量
- ✅ 模块化设计，职责单一
- ✅ 完整JSDoc注释
- ✅ 配置灵活，阈值可调

#### 可测试性
- ✅ 独立测试文件
- ✅ 测试场景覆盖乒乓效应
- ✅ 测试场景覆盖深度控制

### 📝 文档

- ✅ 添加v4.0.2测试说明
- ✅ 更新API使用示例

### 🧪 测试

- ✅ @追踪器测试通过
- ✅ 讨论监控器测试通过
- ✅ 乒乓效应检测正常
- ✅ 深度控制正常

---

## [4.0.1] - 2026-02-04

### 🔧 修复

#### 数据兼容性
- ✅ 修复DiscussionManager无法读取v3.7.0旧格式数据
- ✅ 实现fallback机制：优先新格式，失败后尝试旧格式
- ✅ 自动迁移：无需手动数据迁移

#### 前端问题
- ✅ 修复404错误：添加/discussion-list.html路由
- ✅ 统一前端概念：移除所有"项目组"相关UI
- ✅ 文件重命名：project-list.html → discussion-list.html

### ✨ 新增功能

#### 新建讨论组
- ✅ v3.6.0风格的新建讨论组功能
- ✅ 模态框UI设计
- ✅ 4个示例chips
- ✅ Ctrl+Enter快捷提交

---

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
