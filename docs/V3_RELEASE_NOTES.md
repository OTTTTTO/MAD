# MAD v3.0 更新说明

## 版本信息
- **版本号**: v3.0.0
- **发布日期**: 2026-02-02
- **开发时间**: 约4小时

## 核心概念

### 项目组 vs 讨论
v3.0 将原来的"讨论"概念升级为"项目组"：
- **讨论（v2.x）**: 临时的、一次性的对话
- **项目组（v3.0）**: 持续的、可追溯的项目空间

### 节点标记
项目组支持自动标记重要时刻：
- 🎯 **决策**: 关键决策点
- ⚠️ **问题**: 发现的问题
- 💡 **方案**: 提出的解决方案
- 🏆 **里程碑**: 重要节点
- 🤝 **共识**: 达成的一致意见

## 新增功能

### 1. 自然语言创建项目
```javascript
// 用户输入自然语言
"我想写一篇关于微服务分层架构设计的专利文档"

// 系统自动：
// 1. 分析意图
// 2. 确定项目类别（文档编写）
// 3. 选取专家（专利专家、技术文档专家）
// 4. 创建项目组
// 5. 启动智能推进
```

### 2. 智能分析器
- 自动识别领域（架构、数据库、专利、文档等）
- 推荐合适的专家
- 确定项目类别
- 生成项目名称

### 3. 专家管理
- 17种预置专家角色
- 按需创建自定义专家
- 专家能力标签匹配

### 4. 项目流管理
- 连续的消息流
- Token 自动计算
- 上下文智能压缩（节省成本）
- 分页加载支持

### 5. 智能推进
- 自动检测项目停滞
- 主动触发 Agent 发言
- 生成询问问题
- 推进循环监控

### 6. 智能标记系统
- 自动检测重要时刻
- 生成标记建议
- 批量添加标记
- 项目总结生成

## API 接口

### 创建项目
```http
POST /api/skills/create
Content-Type: application/json

{
  "userInput": "我想写一篇关于微服务分层架构设计的专利文档",
  "mode": "auto"
}
```

### 获取项目列表
```http
GET /api/skills/projects
```

### 获取项目详情
```http
GET /api/skills/projects/:id
```

### 获取项目消息
```http
GET /api/skills/projects/:id/messages?page=1&pageSize=50
```

### 智能标记
```http
# 获取标记建议
GET /api/skills/projects/:id/marker-suggestions

# 检测并添加标记
POST /api/skills/projects/:id/detect-markers

# 优化标记
POST /api/skills/projects/:id/optimize-markers

# 生成总结
GET /api/skills/projects/:id/summary
```

## Web 界面

### v3.0 原型界面
访问：`http://localhost:18790/index-v3.html`

功能：
- 自然语言输入
- 示例快速选择
- 实时创建反馈

### 项目组视图
访问：`http://localhost:18790/project-view.html`

功能：
- 项目组列表
- 标记时间轴
- 消息流展示
- 统计信息
- 智能操作按钮

## 数据结构

### 项目组
```javascript
{
  id: "group-1234567890",
  name: "项目名称",
  category: "功能研发",
  messages: [...],
  markers: [...],
  participants: [...],
  stats: {
    totalMessages: 100,
    totalMarkers: 5,
    totalTokens: 50000,
    progress: 60
  },
  status: "active"
}
```

### 标记
```javascript
{
  id: "marker-1234567890",
  title: "决策：采用微服务架构",
  type: "decision",
  summary: "经过讨论，决定采用微服务架构...",
  conclusions: ["使用微服务", "分层设计"],
  tags: ["架构", "决策", "微服务"],
  timestamp: 1234567890000
}
```

## 使用示例

### 示例 1：创建专利文档项目
```javascript
const result = await v3.createProjectFromInput(
  '我想写一篇关于微服务分层架构设计的专利文档'
);

// 系统自动：
// - 创建项目组（类别：文档编写）
// - 选取专家：专利专家、技术架构师、文档专家
// - 启动智能推进
```

### 示例 2：智能标记
```javascript
// 自动检测并添加标记
const markers = await v3.detectAndAddMarkers(projectId, {
  minConfidence: 0.7,
  maxMarkers: 5
});

// 优化标记（添加阶段标记等）
await v3.optimizeMarkers(projectId);

// 生成项目总结
const summary = await v3.generateProjectSummary(projectId);
```

## 技术架构

### 核心模块
```
src/
├── models/
│   └── project-group.js       # 数据模型
├── core/
│   ├── project-manager.js     # 项目组管理
│   ├── expert-manager.js      # 专家管理
│   ├── smart-analyzer.js      # 智能分析
│   ├── project-flow.js        # 项目流管理
│   ├── progress-manager.js    # 智能推进
│   ├── marker-detector.js     # 标记检测
│   └── marker-generator.js    # 标记生成
└── v3-integration.js          # 集成入口
```

### API 路由
```
api/
└── skill-routes.js            # v3.0 API 路由
```

### Web 界面
```
web/public/
├── index-v3.html              # v3.0 原型
└── project-view.html          # 项目组视图
```

## 迁移指南

### 从 v2.x 升级到 v3.0

1. **数据兼容性**
   - v2.x 的讨论数据仍然可用
   - v3.0 项目组是新概念，不破坏旧数据

2. **API 变更**
   - v2.x API 继续支持
   - v3.0 API 新增 `/api/skills/*` 路径

3. **功能对比**
   | 功能 | v2.x | v3.0 |
   |-----|------|------|
   | 创建讨论 | 模板 | 自然语言 |
   | 数据结构 | 讨论 | 项目组 |
   | 标记 | 无 | 智能标记 |
   | Token 管理 | 无 | 自动计算 |
   | 推进机制 | 手动 | 自动 |

## 开发计划

### v3.0.0 ✅
- 核心重构
- Token 优化
- 自主推进
- 智能标记

### v3.1.0（计划中）
- 多模态支持
- 语音输入
- 文件上传

### v3.2.0（计划中）
- 团队协作
- 权限管理
- 项目分享

## FAQ

**Q: v3.0 完全兼容 v2.x 吗？**
A: 是的，v2.x 的所有功能继续可用，v3.0 是新增功能。

**Q: 如何使用智能标记？**
A: 在项目组视图中点击"✨ 智能标记"按钮，系统会自动检测并添加标记。

**Q: Token 限制是多少？**
A: 默认每个项目组最多 8000 tokens，超出后会自动压缩上下文。

**Q: 如何创建自定义专家？**
A: 调用 `expertManager.createExpert()` 或通过 Web 界面（计划中）。

## 贡献者
- OTTTTTO (主要开发者)

## 许可证
MIT License
