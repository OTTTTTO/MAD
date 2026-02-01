# MAD 迭代优化计划

**时间窗口：** 2026-02-02 00:00 - 06:00
**项目简称：** MAD (Multi-Agent Discussion)

---

## 📊 市场调研：Moltbook 分析

### 核心概念
- **AI Agent 社交网络** - Agent 分享、讨论、点赞
- **人类观察者模式** - Humans welcome to observe
- **实时流式界面** - 动态内容展示
- **Karma 系统** - 声望机制
- **认证系统** - Agent 身份验证

### 对 MAD 的启发

1. **可视化讨论界面** ⭐⭐⭐⭐⭐
   - 用户可以实时观察 Agent 讨论
   - 流式显示消息
   - 类似 Twitter/微博的时间线

2. **Agent 身份系统** ⭐⭐⭐⭐
   - 每个 Agent 有独特的头像、emoji
   - Agent karma/声望
   - 认证徽章

3. **实时更新** ⭐⭐⭐⭐⭐
   - WebSocket 推送
   - 实时消息流
   - 动态内容加载

---

## 🎯 优化方向（按优先级）

### P0 - 核心可视化功能
- [x] Web 界面 - 查看讨论组内容
- [ ] 实时消息流
- [ ] Agent 身份卡片
- [ ] 讨论时间线

### P1 - 用户体验
- [ ] 暗色主题
- [ ] 响应式设计
- [ ] 搜索和过滤
- [ ] 导出功能（Markdown/PDF）

### P2 - 高级功能
- [ ] Agent Karma 系统
- [ ] 讨论统计图表
- [ ] 实时通知
- [ ] 多讨论组管理

---

## 🔧 技术方案

### 前端框架
- **基础：** HTML + CSS + JavaScript（无依赖）
- **增强：** 可选 Vue.js/React（后期）

### 实时通信
- **方案 A：** Server-Sent Events (SSE)
- **方案 B：** WebSocket
- **MVP：** 轮询（简单实现）

### 数据格式
```json
{
  "discussionId": "disc-xxx",
  "messages": [
    {
      "id": "msg-1",
      "role": "market_research",
      "emoji": "📊",
      "content": "...",
      "timestamp": 1234567890
    }
  ]
}
```

---

## 📝 版本计划

- v1.0.1 - 基础 Web 界面
- v1.1.0 - 实时消息流
- v1.2.0 - Agent 身份卡片
- v1.3.0 - 主题和定制
- v2.0.0 - 完整的可视化平台

---

## 🔄 迭代流程

1. 需求分析（市场调研 Agent）
2. 功能设计（主 Agent）
3. 代码开发（编码 Agent）
4. 功能测试（测试 Agent）
5. 文档更新（文档 Agent）
6. 版本发布（Git commit + tag）

---

**开始迭代！** 🚀
