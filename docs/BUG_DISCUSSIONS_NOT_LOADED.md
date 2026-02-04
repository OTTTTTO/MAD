# 功能缺陷报告 - 讨论记录未加载到 Web 界面

**发现时间：** 2026-02-02 12:40
**严重程度：** 🔴 高（核心功能缺失）
**影响范围：** 所有历史讨论无法在 Web 界面查看

---

## 🐛 问题描述

**文件：** `orchestrator.js`  
**问题：** 服务器重启后，历史讨论记录不会加载到内存

### 用户反馈
> "我要求你们使用 MAD 项目的功能完成 MAD 项目的开发，但是我访问 18790 的 MAD 页面时，并没有发现任何你们讨论的记录"

### 具体问题
1. **讨论已保存：** `~/.openclaw/multi-agent-discuss/discussions/` 目录下有 18 个讨论文件
2. **Web 界面显示空：** 访问 http://localhost:18790 时，讨论列表为空
3. **API 返回空：** `/api/discussions` 返回空数组

### 根本原因
`orchestrator.js` 的 `initialize()` 方法没有加载已保存的讨论文件：

```javascript
async initialize() {
  // ... 创建目录 ...
  // ... 初始化管理器 ...
  
  // ❌ 缺少：加载已保存的讨论
  // ❌ 缺少：this.discussions = loadDiscussions()
  
  console.log('[Orchestrator] Initialized successfully (v2.5.3)');
}
```

---

## 📊 影响分析

### 用户影响
- ❌ 无法在 Web 界面看到历史讨论
- ❌ MAD 讨论记录"丢失"（实际存在但无法显示）
- ❌ 违背了用户"用 MAD 开发 MAD"的要求
- ✅ 讨论文件已保存，数据没有丢失

### 功能影响
- **Web 界面：** 讨论列表为空
- **API：** `/api/discussions` 返回 `[]`
- **用户体验：** 看起来 MAD 没有记录任何讨论

---

## 🔍 技术分析

### 数据流程

**保存流程（工作正常）：**
```
createDiscussion()
  ↓
saveDiscussion()
  ↓
写入文件：~/.openclaw/multi-agent-discuss/discussions/{id}.json
  ↓
✅ 保存成功
```

**加载流程（缺失）：**
```
Web 服务器启动
  ↓
orchestrator.initialize()
  ↓
❌ 没有加载讨论文件
  ↓
this.discussions = 空 Map
  ↓
/api/discussions 返回 []
```

### 代码分析

**保存方法（已实现）：**
```javascript
async saveDiscussion(context) {
  const filepath = path.join(this.dataDir, 'discussions', `${context.id}.json`);
  await fs.writeFile(filepath, JSON.stringify(context, null, 2), 'utf8');
}
```

**加载方法（已实现但未调用）：**
```javascript
async loadDiscussion(discussionId) {
  const filepath = path.join(this.dataDir, 'discussions', `${discussionId}.json`);
  const data = await fs.readFile(filepath, 'utf8');
  return JSON.parse(data);
}
```

**初始化方法（缺少加载逻辑）：**
```javascript
async initialize() {
  // ... 初始化其他组件 ...
  
  // ❌ 缺少这部分：
  // const discussionFiles = await fs.readdir(path.join(this.dataDir, 'discussions'));
  // for (const file of discussionFiles) {
  //   const discussionId = file.replace('.json', '');
  //   const context = await this.loadDiscussion(discussionId);
  //   this.discussions.set(discussionId, context);
  // }
  
  console.log('[Orchestrator] Initialized successfully');
}
```

---

## ✅ 修复方案

### 方案 1：在初始化时加载所有讨论

```javascript
async initialize() {
  try {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'discussions'), { recursive: true });
    await fs.mkdir(path.join(this.dataDir, 'logs'), { recursive: true });
    
    // ... 初始化其他管理器 ...
    
    // ✅ 添加：加载已保存的讨论
    await this.loadAllDiscussions();
    
    console.log(`[Orchestrator] Initialized successfully (v2.5.3)`);
    console.log(`[Orchestrator] Loaded ${this.discussions.size} discussions`);
  } catch (error) {
    console.error('[Orchestrator] Initialization failed:', error);
    throw error;
  }
}

async loadAllDiscussions() {
  const discussionsDir = path.join(this.dataDir, 'discussions');
  
  try {
    const files = await fs.readdir(discussionsDir);
    const discussionFiles = files.filter(f => f.endsWith('.json'));
    
    for (const file of discussionFiles) {
      try {
        const discussionId = file.replace('.json', '');
        const filepath = path.join(discussionsDir, file);
        const data = await fs.readFile(filepath, 'utf8');
        const context = JSON.parse(data);
        
        this.discussions.set(discussionId, context);
      } catch (error) {
        console.error(`[Orchestrator] Failed to load discussion ${file}:`, error);
      }
    }
    
    console.log(`[Orchestrator] Loaded ${this.discussions.size} discussions from disk`);
  } catch (error) {
    console.error('[Orchestrator] Failed to load discussions:', error);
  }
}
```

---

## 📋 测试验证

### 验证步骤
1. 修复 orchestrator.js
2. 重启 Web 服务器
3. 访问 http://localhost:18790
4. 检查讨论列表是否显示
5. 验证 `/api/discussions` 返回数据

### 预期结果
- ✅ Web 界面显示历史讨论
- ✅ `/api/discussions` 返回讨论列表
- ✅ 用户能看到所有 MAD 开发讨论记录

---

## 🎯 预防措施

### 测试要求
1. **启动测试：** 验证服务器启动后能看到历史讨论
2. **API 测试：** 验证 `/api/discussions` 返回数据
3. **界面测试：** 验证 Web 界面显示讨论列表

### 开发流程
1. **功能测试：** 新功能必须测试数据持久化
2. **重启测试：** 必须验证服务器重启后数据仍然存在
3. **端到端测试：** 从创建到显示的完整流程

---

## 💡 经验教训

1. **数据持久化不完整：** 只实现保存，没有实现加载
2. **测试覆盖不足：** 没有测试服务器重启后的数据加载
3. **功能验证缺失：** 没有验证 Web 界面能否显示历史讨论
4. **用户期望不符：** 用户期望看到讨论记录，但实际看不到

---

**责任人：** 编码 Agent  
**发现人：** 用户反馈  
**状态：** 🔴 待修复

**优先级：** P0 - 立即修复！这是用户明确要求的核心功能！
