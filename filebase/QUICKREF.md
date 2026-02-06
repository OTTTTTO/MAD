# MAD FileBased - 阶段1快速参考

## ✅ 状态：已完成

- **开发时间**: 2026-02-05
- **测试状态**: 全部通过 ✅
- **代码行数**: ~1,640行
- **文件数量**: 7个核心文件

## 🎯 核心功能

### 1. 文件管理器 (FileManager)

```javascript
const FileManager = require('./src/lib/file-manager.js');

// 创建实例
const fm = new FileManager();

// 初始化
await fm.initialize();

// 创建讨论
const discussion = await fm.createDiscussion({
  topic: '讨论主题',
  category: '需求讨论',
  tags: ['重要']
});

// 添加消息
await fm.addMessage(discussion.id, {
  role: 'agent',
  agentId: 'technical',
  content: '我的建议...'
});

// 列出讨论
const discussions = await fm.listDiscussions();
```

### 2. 数据文件结构

```
~/.openclaw/multi-agent-discuss/
├── discussions/
│   └── disc-{timestamp}/
│       ├── discussion.json     ← 元数据
│       └── messages.jsonl       ← 消息流
├── requests/
│   ├── pending-{id}.json        ← 待处理请求
│   └── processed/              ← 已处理
└── reports/                    ← 报告
```

### 3. 支持的操作

**讨论管理**:
- ✅ createDiscussion() - 创建讨论
- ✅ getDiscussion() - 获取讨论
- ✅ updateDiscussion() - 更新讨论
- ✅ deleteDiscussion() - 删除讨论
- ✅ listDiscussions() - 列出讨论

**消息管理**:
- ✅ addMessage() - 添加消息
- ✅ getMessages() - 获取所有消息
- ✅ getLatestMessage() - 获取最新消息

**请求管理**:
- ✅ createRequest() - 创建请求
- ✅ getRequest() - 获取请求
- ✅ listPendingRequests() - 列出待处理请求
- ✅ processRequest() - 处理请求
- ✅ failRequest() - 标记失败

**统计**:
- ✅ getStats() - 获取统计信息

## 🧪 测试方法

### 运行自动化测试

```bash
cd /home/otto/.npm-global/lib/node_modules/openclaw/skills/MAD/filebase
node test/stage1-test.js
```

### 运行使用示例

```bash
node examples/usage-example.js
```

### 手动检查数据

```bash
# 查看测试数据目录
ls -la /tmp/mad-filebased-test/

# 查看讨论文件
cat /tmp/mad-filebased-test/discussions/disc-*/discussion.json
```

## 📊 测试结果

```
✅ 配置管理 - 通过
✅ 工具函数 - 通过
✅ 文件管理器 - 通过

总计: 3/3 通过
```

## 🚀 下一步

**阶段2：协调器Agent**（预计30分钟）

将实现：
- Agent框架
- 请求轮询
- 模拟讨论生成
- 集成测试

---

**当前进度**: 40% (2/5阶段完成)
