# CHANGELOG

All notable changes to the MAD (Multi-Agent Discussion) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-06

### 🎉 Major Features - 协作式讨论系统

#### 核心创新
- ✨ **@驱动机制** - 主协调器和专家通过@消息进行协作
- ✨ **主协调器** - 智能话题拆解和专家匹配
- ✨ **专家协作** - 专家可以主动@其他专家协助
- ✨ **自动收敛** - 讨论达到最大轮次或所有@响应后自动结束
- ✨ **智能总结** - 主协调器综合各方观点形成结构化结论

#### 新增模块

**主协调器 (main-coordinator.js)**
- 话题分析拆解（支持LLM和Fallback）
- 专家匹配算法（基于关键词）
- @消息生成和追踪
- 讨论收敛判断
- 总结生成

**专家Agent (expert-agent.js)**
- @消息处理
- 专家观点生成
- 协作需求评估
- 置信度计算
- 跨专家@机制

**协作引擎 (coordinator-v0.1.1.js)**
- 完整协作流程编排
- 4阶段处理（分析→@→协作→总结）
- 轮次管理（最多5轮）
- 讨论收敛控制
- 状态管理和错误处理

**消息渲染器 (message-renderer.js)**
- 支持6种消息类型：
  * SYSTEM - 系统消息
  * TOPIC - 用户话题
  * MENTION - @消息
  * EXPERT_RESPONSE - 专家回复
  * COLLABORATION - 协作@
  * SUMMARY - 总结
- Markdown渲染（三层fallback）
- 群聊界面样式
- 实时时间格式化
- 响应状态显示

#### Web UI 升级
- 🎨 全新讨论详情页面
- 🔄 自动刷新功能（10秒间隔）
- 📊 轮次进度显示
- 🏷️ 状态徽章优化
- 👥 参与专家显示
- 📝 消息类型图标和颜色

#### API 增强
- ✅ 改进`GET /api/discussions/:id/messages`返回discussion和messages
- ✅ 支持v0.1.1消息类型
- ✅ 讨论phase字段（round, maxRounds）

### 🔧 技术改进

#### 架构优化
- 完全解耦的Agent和Web（文件系统通信）
- LLM + Fallback双模式设计
- 模块化组件设计
- 完整错误处理

#### 代码质量
- ~1660行新代码
- 完整注释和文档
- 单元测试覆盖
- 测试脚本（test-v0.1.1.js）

#### 文档完善
- 📖 README-v0.1.1.md - 完整使用指南
- 📖 协作流程详解
- 📖 专家系统说明
- 📖 API文档
- 📖 配置指南

### 🐛 Bug Fixes
- 🔧 修复API响应格式（返回discussion对象）
- 🔧 优化消息加载性能
- 🔧 修复状态显示问题

### 📊 性能
- LLM调用优化（temperature分层）
- 消息缓存机制
- 批量处理支持
- API限流保护（1秒延迟）

### 🔒 安全
- DOMPurify XSS防护
- 输入验证增强
- 错误信息安全处理

### 📈 统计
- 代码规模：1660行，~50KB
- 开发时间：1天
- 完成度：86%（核心功能100%，UI集成90%）

### 🎯 协作流程示例

```
用户: 如何设计高可用的微服务架构？
  ↓
[主协调器] 分析话题
  ↓
[主协调器] @技术专家 请回答：如何实现高可用？
[主协调器] @运营专家 请回答：如何保障稳定性？
  ↓
[技术专家] 建议使用Kong + K8s...
  (置信度: 85%)
  🤝 @产品专家 确认用户需求
  ↓
[产品专家] 用户需要高并发、低延迟...
  ↓
[主协调器] 总结：综合各方观点...
```

### 📝 Migration Notes

从v0.1.0升级到v0.1.1：
- ✅ 数据格式兼容（无需迁移）
- ✅ API向后兼容
- ⚠️ 新增phase字段
- ⚠️ 消息类型扩展

### 🔗 Links
- 开发计划：`mad-0.1.1-plan.md`
- 进度报告：`mad-0.1.1-progress.md`
- 使用文档：`filebase/README-v0.1.1.md`

---

## [0.1.0] - 2026-02-06

### Added
- 🎉 Initial release of MAD FileBase architecture
- ✅ Complete Web UI with discussion list and details view
- ✅ Markdown rendering support with fallback mechanism
- ✅ Multi-expert discussion system (Tech, Product, Business, Ops)
- ✅ File-based communication between Agent and Web
- ✅ RESTful API for discussions management
- ✅ LLM Coordinator Skill for processing discussions
- ✅ Responsive UI design with gradient background
- ✅ Real-time statistics display
- ✅ Discussion creation with categories and priorities

### Fixed
- 🔧 Fixed discussion creation (request → discussion)
- 🔧 Fixed Markdown rendering with CDN fallback
- 🔧 Fixed text compression issue with proper line-height
- 🔧 Fixed module reference path in start-web.js
- 🔧 Fixed syntax error in server.js

### Technical
- 📦 FileBase architecture: Agent + Web separation
- 📁 Data directory: `/home/otto/.openclaw/multi-agent-discuss`
- 🔌 API endpoints: health, stats, discussions, requests
- 🤖 4 experts: tech_expert, product_expert, business_expert, ops_expert
- 📝 Message storage: JSONL format for append-only logs
- 🎨 Markdown support: marked.js with DOMPurify
- 🔄 Fallback layers: marked.js → simple renderer → plain text

### Dependencies
- marked@9.1.2 (Markdown parser)
- DOMPurify@3.0.6 (XSS protection)
- Express.js (Web server)
- Node.js built-in modules (fs, path)

### Documentation
- 📖 Comprehensive README in filebase directory
- 📖 SKILL.md for coordinator usage
- 📖 Example usage files
- 📖 API documentation

---

## [0.0.1-filebase] - 2026-02-05

### Added
- Initial filebase branch setup
- Basic directory structure
- Configuration management
- File manager implementation

---

## Links
- GitHub: https://github.com/OTTTTTO/mad
- Issues: https://github.com/OTTTTTO/mad/issues
