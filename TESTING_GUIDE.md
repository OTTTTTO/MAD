# MAD v4.0 本地测试指南

**更新时间：** 2026-02-04 10:17

## 🚀 快速测试新功能

### 1. 运行测试套件
```bash
cd ~/.npm-global/lib/node_modules/openclaw/skills/MAD

# 运行基础测试
npm test

# 运行v4 API测试
node test/v4-api.test.js

# 健康检查
mad doctor
```

### 2. 测试新API（在代码中）

```javascript
// 创建新的orchestrator实例
const orchestrator = require('./orchestrator.js');

// 使用新API v2创建讨论
const result = await orchestrator.createDiscussionV2(
  '测试AI助手开发',           // topic
  '需求讨论',                 // category
  {
    description: '评估AI助手开发需求',
    tags: ['重要', 'AI'],
    priority: 'high'
  }
);

console.log(result.discussionId);
// 输出: disc-xxxxxxxxx

// 列出所有讨论（使用新API）
const discussions = await orchestrator.listDiscussionsV2({
  category: '需求讨论',
  status: 'active'
});

discussions.forEach(d => {
  console.log(`${d.topic} - ${d.category} - ${d.priority}`);
});
```

### 3. 直接使用DiscussionManager

```javascript
const DiscussionManager = require('./src/core/discussion-manager.js');
const { Discussion, Marker } = require('./src/models/discussion.js');

// 创建管理器
const manager = new DiscussionManager();
await manager.init();

// 创建讨论
const discussion = await manager.createDiscussion(
  '我的项目',          // topic
  '功能研发',          // category
  {
    description: '项目描述',
    tags: ['前端', 'React'],
    priority: 'medium'
  }
);

// 添加消息
discussion.addMessage({
  role: 'coordinator',
  content: '开始讨论'
}, { tokens: { input: 10, output: 20 } });

// Agent发言
await discussion.agentSpeak('technical', '技术方案：使用React');

// 添加标签
discussion.addTag('重要项目');
discussion.addTag('Q1目标');

// 设置备注
discussion.setNotes('这是项目启动会议');
discussion.appendNotes('确定了技术栈');

// 设置优先级
discussion.setPriority('high');

// 添加标记
const marker = new Marker('m1', '技术决策', 'decision', 'msg-1');
marker.setSummary('决定使用React + TypeScript');
marker.addConclusion('技术栈确定');
discussion.addMarker(marker);

// 保存
await manager.saveDiscussion(discussion);

// 查看Token统计
console.log(discussion.getTokenStats());
// { total: 30, input: 10, output: 20, avgPerMessage: 30 }

// 列出所有讨论
const all = await manager.listDiscussions();
console.log(`共有 ${all.length} 个讨论`);
```

### 4. 启动Web服务器测试

```bash
# 启动服务器
mad start

# 访问Web界面
# http://localhost:18790
```

**在Web界面中测试：**
1. 创建新讨论
2. 查看讨论列表
3. 测试标签功能
4. 测试备注功能
5. 测试优先级设置

### 5. 测试数据迁移（稍后提供）

```bash
# 运行迁移脚本（阶段5完成后可用）
node scripts/migrate-projects-to-discussions.js
```

---

## 🧪 功能验证清单

### ✅ 已完成功能

- [x] 创建Discussion对象
- [x] 添加消息和Token统计
- [x] Agent发言功能
- [x] 标签管理（add, remove, get）
- [x] 备注管理（set, append）
- [x] 优先级管理（set, get, getValue）
- [x] 标记管理（add, get）
- [x] Token统计（total, input, output, avg）
- [x] Token压缩（自动触发）
- [x] DiscussionManager CRUD
- [x] 列出和过滤讨论
- [x] 按类别分组
- [x] 搜索讨论

### ⏳ 待完成功能

- [ ] API路由更新
- [ ] 数据迁移脚本
- [ ] Web界面集成
- [ ] 导出功能测试
- [ ] 归档功能测试

---

## 🐛 问题反馈

如果在测试中发现问题，请记录：

1. **问题描述**
2. **复现步骤**
3. **期望结果**
4. **实际结果**
5. **错误日志**

报告方式：
- GitHub Issues: https://github.com/OTTTTTO/MAD/issues
- 本地记录: `memory/` 目录

---

## 📝 测试日志模板

```markdown
## 测试记录 - 2026-02-04

### 测试项目：Discussion创建
- [ ] 通过
- [ ] 失败
- 备注：_______________

### 测试项目：Token统计
- [ ] 通过
- [ ] 失败
- 备注：_______________

### 测试项目：标签管理
- [ ] 通过
- [ ] 失败
- 备注：_______________
```

---

**最后更新：** 2026-02-04 10:17
**测试状态：** ✅ 基础功能测试通过
