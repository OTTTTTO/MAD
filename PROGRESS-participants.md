# MAD 项目开发进度 - 添加 Agent 到讨论功能

## 功能概述

添加/移除 Agent 到正在进行的讨论中，允许动态调整讨论组参与人员。

## 开发进度

### ✅ 已完成 (100%)

#### 1. 核心模块 (100%)
- ✅ 创建 `src/core/participants.js` 参与者管理模块
  - `ParticipantsManager` 类
  - 支持添加/移除参与者
  - 获取可用 Agents 列表
  - 参与者统计信息
  - 批量操作支持

#### 2. 后端集成 (100%)
- ✅ 在 `orchestrator.js` 中集成 `ParticipantsManager`
  - 导入模块
  - 初始化管理器
  - 添加公共 API 方法：
    - `getAvailableAgents()` - 获取所有可用 Agents
    - `getParticipants(discussionId)` - 获取当前参与者
    - `addParticipant(discussionId, agentId)` - 添加单个 Agent
    - `removeParticipant(discussionId, agentId)` - 移除 Agent
    - `addParticipants(discussionId, agentIds)` - 批量添加
    - `getParticipantStats(discussionId)` - 参与者统计

#### 3. API 路由 (100%)
- ✅ 在 `web/server.js` 中添加 REST API：
  - `GET /api/agents` - 获取所有可用 Agents
  - `GET /api/discussion/:id/participants` - 获取当前参与者
  - `POST /api/discussion/:id/participants/:agentId` - 添加 Agent
  - `DELETE /api/discussion/:id/participants/:agentId` - 移除 Agent
  - `GET /api/discussion/:id/participant-stats` - 参与者统计

#### 4. 前端界面 (100%)
- ✅ UI 组件 (`web/public/index.html`)
  - 添加"参与者管理"按钮
  - 创建参与者管理面板
  - 当前参与者列表
  - 可用 Agents 列表

#### 5. 前端逻辑 (100%)
- ✅ JavaScript 功能 (`web/public/app.js`)
  - `toggleParticipantsPanel()` - 切换面板显示
  - `loadParticipants()` - 加载参与者数据
  - `addParticipant(agentId)` - 添加参与者
  - `removeParticipant(agentId)` - 移除参与者
  - 事件监听器绑定
  - 在 `selectDiscussion()` 中显示按钮

#### 6. 样式设计 (100%)
- ✅ CSS 样式 (`web/public/style.css`)
  - `.participants-panel` - 面板容器
  - `.participants-section` - 分区样式
  - `.participant-item` - 参与者项
  - `.agent-item` - Agent 项
  - 深色/浅色主题支持

## 功能特性

### 核心功能
1. **动态添加 Agent** - 在讨论进行中添加新的参与者
2. **移除 Agent** - 从讨论中移除不需要的参与者（最少保留 2 人）
3. **批量操作** - 支持一次添加多个 Agents
4. **实时更新** - 添加/移除时触发 WebSocket 通知
5. **系统消息** - Agent 加入/离开时自动记录系统消息

### 安全限制
- ✅ 不能在已结束的讨论中添加/移除参与者
- ✅ 最少保留 2 个参与者（避免独角戏）
- ✅ 防止重复添加同一 Agent
- ✅ 添加/移除操作记录系统消息

### UI/UX
- ✅ 参与者列表显示（emoji + 名称 + 角色）
- ✅ 可用 Agents 列表（包含专长标签）
- ✅ 一键添加/移除按钮
- ✅ 操作成功/失败 Toast 通知
- ✅ 自动刷新讨论内容

## 文件变更

### 新增文件
- `src/core/participants.js` (7.5KB)

### 修改文件
- `orchestrator.js` - 集成 ParticipantsManager
- `web/server.js` - 添加 API 路由
- `web/public/index.html` - 添加 UI 组件
- `web/public/app.js` - 添加前端逻辑
- `web/public/style.css` - 添加样式

## 测试建议

### 功能测试
1. 创建一个新讨论
2. 点击"参与者"按钮打开面板
3. 添加一个新的 Agent
4. 验证 Agent 成功加入，系统消息出现
5. 移除一个 Agent（确保参与者 > 2）
6. 验证 Agent 成功移除，系统消息出现

### 边界测试
1. 尝试在已结束的讨论中添加 Agent（应失败）
2. 尝试移除到只剩 1 个 Agent（应失败）
3. 尝试添加已存在的 Agent（应失败）

### UI 测试
1. 切换深色/浅色主题
2. 在移动端查看面板布局
3. 验证 Toast 通知显示

## 下一步

### 可选增强
- [ ] Agent 加入时的自动介绍发言
- [ ] 参与者权限管理（例如：只允许协调员添加/移除）
- [ ] 参与者在线状态指示
- [ ] 参与者活跃度统计图表
- [ ] 支持拖拽排序参与者顺序

### 集成测试
- [ ] 与实时 WebSocket 集成测试
- [ ] 与讨论模板系统联调
- [ ] 性能测试（大量参与者场景）

## 版本信息

- **功能版本:** v1.0.0
- **MAD 版本:** v1.7.0+
- **开发日期:** 2026-02-02
- **状态:** ✅ 开发完成，待测试

---

💡 **提示:** 此功能已完全开发完成，建议先在测试环境中验证功能正常后再部署到生产环境。
