# 修复模板为空问题

## 问题描述

**症状：** 新建讨论组时，模板选择器为空，无法选择模板。

**API 响应：**
```bash
curl "http://localhost:18790/api/templates"
# 返回: []  (空数组)
```

## 根本原因

**文件路径错误：**

在 `orchestrator.js` 的 `loadTemplates()` 函数中：

```javascript
// ❌ 错误的路径
const templatePath = path.join(__dirname, 'templates.json');
```

- 期望路径：`/home/otto/.openclaw/skills/multi-agent-discuss/templates.json`
- 实际路径：`/home/otto/.openclaw/skills/multi-agent-discuss/data/templates.json`
- 结果：文件不存在，返回空数组

**排查过程：**

1. 检查 API 路由：`web/server.js` 调用 `orchestrator.getTemplates()`
2. 追踪到 `loadTemplates()` 函数
3. 发现路径拼接错误
4. 找到实际文件位置：`data/templates.json`

## 解决方案

**修正文件路径：**

```javascript
// ✅ 正确的路径
const templatePath = path.join(__dirname, 'data', 'templates.json');
```

## 修复内容

### 文件：orchestrator.js

**位置：** 第 50 行

**修改前：**
```javascript
const templatePath = path.join(__dirname, 'templates.json');
```

**修改后：**
```javascript
const templatePath = path.join(__dirname, 'data', 'templates.json');
```

## 测试验证

### 1. API 测试

```bash
curl "http://localhost:18790/api/templates"
```

**返回结果：**
```json
[
  {
    "id": "requirement-evaluation",
    "name": "需求评估",
    "description": "评估新功能或产品的需求可行性",
    "icon": "🎯",
    "participants": ["market_research", "requirement", "technical", "testing"],
    ...
  },
  {
    "id": "tech-review",
    "name": "技术评审",
    ...
  },
  {
    "id": "problem-solving",
    "name": "问题解决",
    ...
  },
  {
    "id": "brainstorm",
    "name": "头脑风暴",
    ...
  },
  {
    "id": "custom",
    "name": "自定义",
    ...
  }
]
```

✅ **5 个模板全部加载成功！**

### 2. 前端测试

- ✅ 打开新建讨论页面
- ✅ 模板选择器显示 5 个模板
- ✅ 每个模板显示图标、名称和描述
- ✅ 选择模板后可以创建讨论

## 可用的模板

| ID | 名称 | 描述 | 图标 | 参与角色 |
|----|------|------|------|----------|
| requirement-evaluation | 需求评估 | 评估新功能或产品的需求可行性 | 🎯 | 市场、需求、技术、测试 |
| tech-review | 技术评审 | 评审技术方案的可行性 | 🔧 | 技术、测试、需求 |
| problem-solving | 问题解决 | 协同解决技术或业务问题 | 💡 | 协调、技术、需求 |
| brainstorm | 头脑风暴 | 自由讨论，激发创意 | 💭 | 市场、需求、技术、测试、文档 |
| custom | 自定义 | 创建自定义讨论 | ✏️ | （用户选择） |

## 影响范围

- ✅ 修复了模板加载问题
- ✅ 不影响其他功能
- ✅ 向后兼容
- ✅ 提升用户体验

## 预防措施

为了避免类似问题，建议：

1. **统一数据文件路径**
   - 所有配置文件放在 `data/` 目录
   - 使用统一的路径解析函数

2. **添加路径验证**
   ```javascript
   if (!fs.existsSync(templatePath)) {
     console.error(`[Orchestrator] Template file not found: ${templatePath}`);
     return { templates: [] };
   }
   ```

3. **添加单元测试**
   ```javascript
   test('loadTemplates returns template array', async () => {
     const templates = await loadTemplates();
     expect(templates.templates).toBeDefined();
     expect(templates.templates.length).toBeGreaterThan(0);
   });
   ```

## 修复时间

2026-02-02 21:00

## 相关文档

- 模板系统设计：`src/features/templates/`
- 模板数据文件：`data/templates.json`
- API 路由：`web/server.js` 第 515 行
