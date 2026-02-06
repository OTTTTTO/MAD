# MAD - FileBase 版本

基于共享文件的多Agent讨论系统

## 🎯 项目定位

MAD FileBase 是MAD项目的一个实验性分支，探索通过**共享文件**实现Agent和Web界面的完全解耦。

## 🏗️ 架构设计

```
协调器Agent（有tool权限）
  ↓ 生成数据
共享文件系统（JSON/JSONL）
  ↑ 读取数据
Web界面（无tool权限）
```

**核心优势：**
- ✅ Agent和Web完全解耦
- ✅ Web无需任何配置即可运行
- ✅ 文件系统天然持久化
- ✅ 易于扩展和部署

## 📁 目录结构

```
MAD/
├── filebase/                    # FileBase核心代码
│   ├── src/                     # 源代码
│   │   ├── lib/                 # 核心库
│   │   ├── coordinator/         # 协调器模块
│   │   └── web/                 # Web服务器
│   ├── public/                  # Web前端
│   ├── data/                    # 数据目录（软链接）
│   ├── examples/                # 使用示例
│   ├── start-web.js             # Web启动脚本
│   └── README.md                # 详细文档
│
├── filebase-coordinator/         # LLM协调器Skill
│   ├── index.js                 # 主处理逻辑
│   ├── main-coordinator.js      # 主协调器（v0.1.1）
│   ├── SKILL.md                 # 使用说明
│   └── run.js                   # 独立运行脚本
│
├── package.json                 # 依赖配置
├── CHANGELOG.md                 # 版本变更
└── LICENSE                      # MIT许可
```

## 🚀 快速开始

### 1. 启动Web服务器

```bash
cd filebase
node start-web.js
```

访问：http://localhost:3000

### 2. 启动协调器（处理讨论）

在OpenClaw中发送：
```
启动MAD协调器
```

协调器会自动处理pending讨论，生成多专家观点。

## 📊 数据目录

**默认路径：** `/home/otto/.openclaw/multi-agent-discuss`

```
multi-agent-discuss/
├── discussions/          # 讨论数据
│   └── disc-xxx/
│       ├── discussion.json
│       └── messages.jsonl
├── requests/            # 请求队列
├── reports/             # 报告输出
└── logs/                # 日志文件
```

## 🤖 专家系统

### v0.1.0: 静态多专家

4个预定义专家：
- **技术专家** (tech_expert) - 技术架构、实现方案
- **产品专家** (product_expert) - 产品价值、用户体验
- **商业专家** (business_expert) - 商业模式、成本效益
- **运营专家** (ops_expert) - 运营策略、执行落地

### v0.1.1: 协作式讨论（开发中）

- 主协调器分析拆解话题
- @机制触发专家响应
- 专家互相@协作
- 主协调器总结

## 📝 API端点

- `GET /api/health` - 健康检查
- `GET /api/stats` - 统计信息
- `GET /api/discussions` - 讨论列表
- `POST /api/discussions` - 创建讨论
- `GET /api/discussions/:id/messages` - 讨论消息

## 🔄 版本历史

- **v0.1.0** (2026-02-06) - 初始发布
  - 完整Web UI
  - Markdown渲染
  - 多专家协作
  - FileBase架构

- **v0.1.1** (开发中) - 协作式讨论
  - 主协调器拆解
  - @机制
  - 群聊界面
  - 讨论总结

## 🛠️ 技术栈

- **后端：** Node.js + Express.js
- **前端：** HTML5 + CSS3 + JavaScript
- **数据：** JSON + JSONL
- **Markdown：** marked.js + DOMPurify

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

## 🔗 相关链接

- **GitHub：** https://github.com/OTTTTTO/MAD
- **主分支：** https://github.com/OTTTTTO/MAD/tree/main
- **问题反馈：** https://github.com/OTTTTTO/MAD/issues

---

**当前版本：** v0.1.0
**最后更新：** 2026-02-06
