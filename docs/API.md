# MAD REST API 文档

本文档描述 MAD (Multi-Agent Discussion) 的 REST API 接口。

## 基础信息

- **基础 URL:** `http://localhost:3000/api`
- **数据格式:** JSON
- **字符编码:** UTF-8

## 认证

当前版本无需认证（仅本地开发）。

---

## 讨论管理

### 获取所有讨论

```http
GET /api/discussions
```

**响应示例:**
```json
{
  "discussions": [
    {
      "id": "disc-123",
      "topic": "产品功能讨论",
      "status": "active",
      "createdAt": "2026-02-02T10:00:00Z",
      "participantCount": 6,
      "messageCount": 15
    }
  ]
}
```

### 获取单个讨论

```http
GET /api/discussion/:id
```

**路径参数:**
- `id` - 讨论 ID

**响应示例:**
```json
{
  "discussion": {
    "id": "disc-123",
    "topic": "产品功能讨论",
    "context": {...},
    "participants": [...],
    "status": "active",
    "createdAt": "2026-02-02T10:00:00Z"
  }
}
```

### 创建讨论

```http
POST /api/discussion
```

**请求体:**
```json
{
  "topic": "讨论主题",
  "maxRounds": 5,
  "maxDuration": 120000,
  "enableConflictDetection": true,
  "participantIds": ["agent-1", "agent-2"]
}
```

**响应示例:**
```json
{
  "success": true,
  "discussionId": "disc-123",
  "context": {...},
  "participants": [...]
}
```

### 结束讨论

```http
POST /api/discussion/:id/end
```

**响应示例:**
```json
{
  "success": true,
  "summary": {
    "topic": "产品功能讨论",
    "messages": [...],
    "conclusion": "..."
  }
}
```

---

## 消息管理

### 获取讨论历史

```http
GET /api/discussion/:id/history
```

**查询参数:**
- `limit` - 限制数量（可选）
- `offset` - 偏移量（可选）

**响应示例:**
```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "market-research",
      "content": "市场调研显示...",
      "timestamp": "2026-02-02T10:05:00Z",
      "metadata": {...}
    }
  ],
  "total": 15
}
```

### 发送消息

```http
POST /api/discussion/:id/message
```

**请求体:**
```json
{
  "agentId": "agent-1",
  "content": "消息内容"
}
```

**响应示例:**
```json
{
  "success": true,
  "messageId": "msg-2",
  "conflictDetected": false
}
```

---

## 导出功能

### 导出为 Markdown

```http
GET /api/discussion/:id/export/markdown
```

**响应:** Markdown 格式文本

### 导出为 JSON

```http
GET /api/discussion/:id/export/json
```

**响应:** JSON 格式数据

### 导出为 PDF

```http
GET /api/discussion/:id/export/pdf
```

**响应:** PDF 文件（application/pdf）

### 导出为 HTML

```http
GET /api/discussion/:id/export/html
```

**响应:** HTML 格式文本

### 导出为 CSV

```http
GET /api/discussion/:id/export/csv
```

**响应:** CSV 格式文本

---

## 统计分析

### 获取讨论统计

```http
GET /api/discussion/:id/stats
```

**响应示例:**
```json
{
  "messageCount": 15,
  "participantCount": 6,
  "averageMessageLength": 120,
  "duration": 300,
  "conflictCount": 2,
  "byRole": {
    "market-research": 3,
    "technical-feasibility": 4
  }
}
```

---

## 模板管理

### 获取所有模板

```http
GET /api/templates
```

**响应示例:**
```json
{
  "templates": [
    {
      "id": "brainstorm",
      "name": "头脑风暴",
      "description": "6 个专业 Agent 协同进行创新思考",
      "defaultRounds": 8,
      "defaultDuration": 180000
    }
  ]
}
```

### 使用模板创建讨论

```http
POST /api/discussion/from-template/:templateId
```

**请求体:**
```json
{
  "customTopic": "自定义主题（可选）"
}
```

---

## WebSocket

### 连接

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### 消息格式

**服务器推送:**
```json
{
  "type": "new_message",
  "data": {
    "discussionId": "disc-123",
    "message": {...}
  }
}
```

**客户端发送:**
```json
{
  "type": "subscribe",
  "discussionId": "disc-123"
}
```

---

## 错误处理

所有错误响应遵循以下格式:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {...}
  }
}
```

### 常见错误码

- `400` - 请求参数错误
- `404` - 资源不存在
- `500` - 服务器内部错误

---

## 示例代码

### cURL 示例

```bash
# 创建讨论
curl -X POST http://localhost:3000/api/discussion \
  -H "Content-Type: application/json" \
  -d '{"topic": "新功能讨论", "maxRounds": 5}'

# 获取讨论历史
curl http://localhost:3000/api/discussion/disc-123/history

# 导出为 Markdown
curl http://localhost:3000/api/discussion/disc-123/export/markdown \
  -o discussion.md
```

### JavaScript 示例

```javascript
// 创建讨论
async function createDiscussion(topic) {
  const response = await fetch('http://localhost:3000/api/discussion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, maxRounds: 5 })
  });
  return response.json();
}

// 获取消息
async function getMessages(discussionId) {
  const response = await fetch(
    `http://localhost:3000/api/discussion/${discussionId}/history`
  );
  return response.json();
}

// 导出
async function exportDiscussion(discussionId, format = 'markdown') {
  const response = await fetch(
    `http://localhost:3000/api/discussion/${discussionId}/export/${format}`
  );
  return response.text();
}
```

---

## 版本

当前 API 版本: v2.8.0

更新日期: 2026-02-02
