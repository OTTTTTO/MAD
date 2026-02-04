# MAD 重构执行计划：ProjectGroup → Discussion

**目标：** 用ProjectGroup替换旧的Discussion，并重命名为Discussion

**策略：** 保留ProjectGroup的完善功能，删除旧的Discussion实现

**执行日期：** 2026-02-04

---

## 🎯 重构目标

### 保留的（ProjectGroup功能）
✅ `messages[]` - 消息流
✅ `markers[]` - 智能标记
✅ `tags[]` - 标签系统
✅ `notes` - 项目备注
✅ `priority` - 优先级（4级）
✅ `category` - 类别（4类）
✅ `status` - 状态（active/completed/archived）
✅ `stats.totalTokens` - Token统计
✅ `participants[]` - 参与者

### 删除的（旧Discussion功能）
❌ 旧的`DiscussionContext`类
❌ 旧的`DiscussionOrchestrator`方法（与ProjectGroup重叠的）

### 增强的
➕ 添加Agent发言逻辑（从旧Discussion迁移）
➕ 添加冲突检测（从旧Discussion迁移）
➕ 添加共识机制（从旧Discussion迁移）

---

## 📋 执行步骤

### **阶段1：类重命名与合并**

#### 步骤1.1：重命名核心类
**文件：** `src/models/project-group.js` → `src/models/discussion.js`

**操作：**
```javascript
// 重命名类
class ProjectGroup → class Discussion

// 更新构造函数
constructor(id, name, category) → constructor(id, topic, category)

// 更新字段
this.name → this.topic  // 统一为topic

// 保留所有字段和方法
```

**检查清单：**
- [ ] 重命名类：ProjectGroup → Discussion
- [ ] 重命名字段：name → topic
- [ ] 保留所有方法：addMessage, addMarker, addTag, removeTag, setNotes, appendNotes, setPriority
- [ ] 保留所有字段：messages, markers, tags, notes, priority, category, status, stats

---

#### 步骤1.2：重命名管理器
**文件：** `src/core/project-manager.js` → `src/core/discussion-manager.js`

**操作：**
```javascript
// 重命名类
class ProjectManager → class DiscussionManager

// 重命名方法
createProject() → createDiscussion()
getProject() → getDiscussion()
listProjects() → listDiscussions()
deleteProject() → deleteDiscussion()
getProjectsByCategory() → getDiscussionsByCategory()

// 重命名存储路径
data/projects → data/discussions
```

**检查清单：**
- [ ] 重命名类：ProjectManager → DiscussionManager
- [ ] 重命名所有方法
- [ ] 更新存储路径：`data/projects/` → `data/discussions/`
- [ ] 更新数据目录初始化

---

### **阶段2：增强Discussion类**

#### 步骤2.1：添加Agent发言逻辑
**源：** 从旧的`DiscussionOrchestrator`中提取

**添加方法：**
```javascript
class Discussion {
  // ... 现有字段

  // 新增：Agent发言状态
  this.agentStates = new Map();  // 跟踪每个Agent的发言状态
  this.rounds = 0;  // 讨论轮数
  this.conflicts = [];  // 冲突列表
  this.consensus = new Map();  // 共识记录

  /**
   * Agent发言
   */
  async agentSpeak(agentId, content, options = {}) {
    const message = {
      id: `msg-${Date.now()}-${this.messages.length}`,
      role: agentId,
      content: content,
      timestamp: Date.now(),
      round: this.rounds,
      isMarker: options.isMarker || false,
      markerData: options.markerData || null
    };

    this.addMessage(message);
    return message;
  }

  /**
   * 检查Agent是否应该发言
   */
  shouldAgentSpeak(agentId, context) {
    const state = this.agentStates.get(agentId);
    // 智能判断逻辑
    return true;  // 实现具体逻辑
  }

  /**
   * 检测冲突
   */
  detectConflicts() {
    // 实现冲突检测逻辑
    return [];
  }

  /**
   * 达成共识
   */
  buildConsensus() {
    // 实现共识逻辑
    return {};
  }
}
```

**检查清单：**
- [ ] 添加`agentStates`字段
- [ ] 添加`rounds`字段
- [ ] 添加`conflicts`字段
- [ ] 添加`consensus`字段
- [ ] 实现`agentSpeak()`方法
- [ ] 实现`shouldAgentSpeak()`方法
- [ ] 实现`detectConflicts()`方法
- [ ] 实现`buildConsensus()`方法

---

#### 步骤2.2：添加Token管理
**源：** `src/core/context-compressor.js`

**集成到Discussion：**
```javascript
class Discussion {
  // ... 现有字段

  /**
   * 添加消息并记录Token
   */
  addMessage(message, metadata = {}) {
    message.id = `msg-${Date.now()}-${this.messages.length}`;
    message.timestamp = Date.now();
    this.messages.push(message);

    // Token统计
    if (metadata.tokens) {
      this.stats.inputTokens += metadata.tokens.input || 0;
      this.stats.outputTokens += metadata.tokens.output || 0;
      this.stats.totalTokens = this.stats.inputTokens + this.stats.outputTokens;
    }

    this.stats.totalMessages++;
    this.stats.updatedAt = Date.now();

    // 检查是否需要压缩
    if (this.stats.totalTokens > 80000) {
      this.compressContext();
    }
  }

  /**
   * 获取Token统计
   */
  getTokenStats() {
    return {
      total: this.stats.totalTokens,
      input: this.stats.inputTokens || 0,
      output: this.stats.outputTokens || 0,
      avgPerMessage: this.messages.length > 0
        ? Math.round(this.stats.totalTokens / this.messages.length)
        : 0
    };
  }

  /**
   * 压缩上下文
   */
  compressContext() {
    // 保留最近50条消息 + 所有标记
    const recentMessages = this.messages.slice(-50);
    const markerMessages = this.markers.map(m => ({
      role: 'marker',
      content: m.summary || m.title,
      isMarker: true,
      markerType: m.type
    }));

    // 生成早期消息摘要
    const earlySummary = this._generateEarlySummary();

    // 重建消息流
    this.messages = [
      { role: 'system', content: `[早期讨论摘要]\n${earlySummary}` },
      ...markerMessages,
      ...recentMessages
    ];

    console.log(`[Discussion] 上下文已压缩: ${this.stats.totalTokens} tokens`);
  }

  _generateEarlySummary() {
    return this.markers.map(m => `- ${m.title}: ${m.summary}`).join('\n');
  }
}
```

**检查清单：**
- [ ] 在`stats`中添加`inputTokens`和`outputTokens`
- [ ] 在`addMessage()`中记录Token
- [ ] 实现`getTokenStats()`方法
- [ ] 实现`compressContext()`方法
- [ ] 添加自动压缩触发（>80k tokens）

---

### **阶段3：更新Orchestrator**

#### 步骤3.1：替换核心管理器
**文件：** `orchestrator.js`

**操作：**
```javascript
// 删除
const { DiscussionContext } = require('./src/models/discussion.js');  // 新
const DiscussionManager = require('./src/core/discussion-manager.js');  // 新

// 替换
class DiscussionOrchestrator {
  constructor(dataDir) {
    // 使用新的DiscussionManager
    this.discussionManager = new DiscussionManager(dataDir);

    // 保留其他管理器
    this.markerManager = new MarkerManager();
    this.similarityDetector = new DiscussionSimilarityDetector();
    // ...
  }

  /**
   * 创建讨论（使用新的Discussion类）
   */
  async createDiscussion(topic, participants, options = {}) {
    const category = options.category || '需求讨论';
    const discussion = this.discussionManager.createDiscussion(topic, category, {
      description: options.description,
      participants: participants,
      tags: options.tags || [],
      priority: options.priority || 'medium'
    });

    return discussion;
  }

  /**
   * 获取讨论
   */
  async getDiscussion(discussionId) {
    return await this.discussionManager.getDiscussion(discussionId);
  }

  /**
   * 列出讨论
   */
  listDiscussions(filters = {}) {
    return this.discussionManager.listDiscussions(filters);
  }

  /**
   * Agent发言
   */
  async agentSpeak(discussionId, agentId, content, options = {}) {
    const discussion = await this.getDiscussion(discussionId);

    const message = await discussion.agentSpeak(agentId, content, options);

    // 保存
    await this.discussionManager.saveDiscussion(discussion);

    return message;
  }
}
```

**检查清单：**
- [ ] 引入新的`Discussion`类
- [ ] 引入新的`DiscussionManager`
- [ ] 更新`createDiscussion()`方法
- [ ] 更新`getDiscussion()`方法
- [ ] 更新`listDiscussions()`方法
- [ ] 更新`agentSpeak()`方法

---

### **阶段4：更新API路由**

#### 步骤4.1：统一API路径
**文件：** `web/server.js`

**操作：**
```javascript
// 已有的路由保持不变（都是 /api/discussion/*）
// 如果有 /api/projects/* 的路由，删除或重定向

// API: 创建讨论
if (url.pathname === '/api/discussion' && req.method === 'POST') {
  // 使用新的DiscussionManager
}

// API: 获取讨论列表
if (url.pathname === '/api/discussions') {
  // 使用新的DiscussionManager
}

// API: 获取单个讨论
if (url.pathname.match(/^\/api\/discussion\/[^/]+$/)) {
  // 使用新的DiscussionManager
}
```

**检查清单：**
- [ ] 检查所有`/api/projects/*`路由
- [ ] 删除或重定向到`/api/discussions/*`
- [ ] 确保所有API使用新的DiscussionManager

---

### **阶段5：数据迁移**

#### 步骤5.1：迁移现有数据
**脚本：** `scripts/migrate-projects-to-discussions.js`

```javascript
#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const SOURCE_DIR = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'projects');
const TARGET_DIR = path.join(process.env.HOME, '.openclaw', 'multi-agent-discuss', 'discussions');

async function migrate() {
  console.log('🔄 开始迁移项目数据...');

  // 创建目标目录
  await fs.mkdir(TARGET_DIR, { recursive: true });

  // 读取所有项目
  const files = await fs.readdir(SOURCE_DIR);
  let migrated = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const sourcePath = path.join(SOURCE_DIR, file);
      const targetPath = path.join(TARGET_DIR, file);

      // 读取项目数据
      const data = await fs.readFile(sourcePath, 'utf8');
      const project = JSON.parse(data);

      // 重命名字段
      if (project.name) {
        project.topic = project.name;
        delete project.name;
      }

      // 保存到目标目录
      await fs.writeFile(targetPath, JSON.stringify(project, null, 2));
      migrated++;
      console.log(`✅ 已迁移: ${file}`);
    } catch (error) {
      failed++;
      console.error(`❌ 迁移失败: ${file}`, error.message);
    }
  }

  console.log(`\n✅ 迁移完成: ${migrated} 个, 失败: ${failed} 个`);
  console.log(`📁 源目录: ${SOURCE_DIR}`);
  console.log(`📁 目标目录: ${TARGET_DIR}`);
  console.log(`\n⚠️  请确认迁移成功后再删除源目录`);
}

migrate().catch(console.error);
```

**检查清单：**
- [ ] 创建迁移脚本
- [ ] 备份现有数据
- [ ] 执行迁移
- [ ] 验证数据完整性
- [ ] 确认成功后删除`data/projects/`

---

### **阶段6：清理旧代码**

#### 步骤6.1：删除废弃文件

**删除的文件：**
```
src/models/project-group.js  → 已重命名为 discussion.js
src/core/project-manager.js  → 已重命名为 discussion-manager.js
src/core/project-flow.js     → 功能已合并到 discussion-manager.js
src/v3-integration.js        → 不再需要集成层
data/projects/               → 已迁移到 data/discussions/
```

**检查清单：**
- [ ] 删除`src/models/project-group.js`（已重命名）
- [ ] 删除`src/core/project-manager.js`（已重命名）
- [ ] 删除`src/core/project-flow.js`
- [ ] 删除`src/v3-integration.js`
- [ ] 删除`data/projects/`目录（已迁移）
- [ ] 删除Web界面中的项目视图（如果独立存在）

---

### **阶段7：更新文档**

#### 步骤7.1：更新README
**文件：** `README.md`

**操作：**
- [ ] 移除所有"项目组"相关描述
- [ ] 统一使用"讨论组"术语
- [ ] 更新API文档
- [ ] 更新使用示例

#### 步骤7.2：更新CHANGELOG
**文件：** `CHANGELOG.md`

**操作：**
```markdown
## [4.0.0] - 2026-02-04

### ⚠️ Breaking Changes

- **概念统一**: 移除"项目组"概念，统一使用"讨论组"
- **数据模型**: ProjectGroup → Discussion（重命名）
- **存储路径**: `data/projects/` → `data/discussions/`
- **API变更**: `/api/projects/*` → `/api/discussions/*`

### ✨ 新增功能

- ✅ Discussion支持标签系统（tags）
- ✅ Discussion支持备注功能（notes）
- ✅ Discussion支持优先级（priority: low|medium|high|critical）
- ✅ Discussion支持类别（category: 需求讨论|功能研发|功能测试|文档编写）
- ✅ Discussion支持智能标记（markers）
- ✅ Discussion支持Token统计和自动压缩
- ✅ Discussion支持4种状态（active|completed|archived|deleted）

### 🔧 改进

- 统一数据模型，减少概念混乱
- 增强Discussion功能，保持向后兼容
- 提供数据迁移脚本

### 📝 文档

- 更新所有文档，统一使用"讨论组"术语
- 添加数据迁移指南
```

**检查清单：**
- [ ] 更新README.md
- [ ] 更新CHANGELOG.md
- [ ] 更新API文档
- [ ] 更新使用示例

---

### **阶段8：测试**

#### 步骤8.1：功能测试
**测试清单：**
- [ ] 创建讨论
- [ ] Agent发言
- [ ] 添加标签
- [ ] 添加备注
- [ ] 设置优先级
- [ ] 添加标记
- [ ] 列出讨论（按类别筛选）
- [ ] 搜索讨论
- [ ] 导出讨论（Markdown/JSON）
- [ ] 删除讨论
- [ ] 归档讨论

#### 步骤8.2：数据完整性测试
**测试清单：**
- [ ] 验证迁移后的数据可正常加载
- [ ] 验证Token统计正确
- [ ] 验证标记数据完整
- [ ] 验证标签数据完整

#### 步骤8.3：API测试
**测试清单：**
- [ ] 测试所有`/api/discussions/*`路由
- [ ] 测试响应格式正确性
- [ ] 测试错误处理

---

## 🎯 执行检查清单

### 准备阶段
- [ ] 备份现有数据（`data/projects/`）
- [ ] 创建新的Git分支（`refactor/project-group-to-discussion`）
- [ ] 阅读完整执行计划

### 执行阶段
- [ ] 阶段1：类重命名与合并
  - [ ] 步骤1.1：重命名核心类
  - [ ] 步骤1.2：重命名管理器
- [ ] 阶段2：增强Discussion类
  - [ ] 步骤2.1：添加Agent发言逻辑
  - [ ] 步骤2.2：添加Token管理
- [ ] 阶段3：更新Orchestrator
- [ ] 阶段4：更新API路由
- [ ] 阶段5：数据迁移
- [ ] 阶段6：清理旧代码
- [ ] 阶段7：更新文档
- [ ] 阶段8：测试

### 发布阶段
- [ ] 所有测试通过
- [ ] 代码审查
- [ ] 合并到主分支
- [ ] 打tag：v4.0.0
- [ ] 发布到GitHub
- [ ] 通知用户升级

---

## 📊 影响评估

### 优点
✅ **概念统一** - 只有一个Discussion概念
✅ **功能增强** - Discussion具备ProjectGroup的所有功能
✅ **代码简化** - 删除冗余代码
✅ **存储统一** - 只使用`data/discussions/`
✅ **API清晰** - 统一使用`/api/discussions/*`

### 风险
⚠️ **数据迁移** - 需要验证数据完整性
⚠️ **破坏性变更** - ProjectGroup相关代码需要更新
⚠️ **测试覆盖** - 需要全面测试

### 缓解措施
✅ 提供自动迁移脚本
✅ 备份原有数据
✅ 在新分支上开发
✅ 完整的测试覆盖

---

## 🚀 开始执行

**准备好开始了吗？**

告诉我你准备好了，我将：
1. 创建新的Git分支
2. 开始执行阶段1
3. 逐步完成所有步骤

让我们开始吧！🎉
