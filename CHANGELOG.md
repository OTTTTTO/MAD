# 更新日志

## [2.7.0] - 2026-02-02

### 🎉 大版本更新

本次更新包含 4 个重要功能，全部经过测试并推送到 GitHub。

### ✨ 新增功能

#### v2.6.7 - GitHub Issue 监控脚本
- 新增 `scripts/check-github-issues.sh` 自动监控 Issues
- 支持自动获取、分析并创建修复任务
- 集成子 Agent 自动修复流程
- 记录已处理 Issues 避免重复

#### v2.6.8 - 文档更新
- 更新 README 版本徽章至 v2.6.7
- 添加消息气泡样式优化功能说明（v2.6.6）
- 添加 GitHub Issue 监控功能说明（v2.6.7）

#### v2.6.9 - 配置示例
- 新增 `config.example.json` 配置模板
- 包含讨论、Agent、模板、导出、Web、GitHub、日志等完整配置
- 用户可复制为 config.json 自定义配置
- 添加详细注释说明

#### v2.6.10 - 快速启动脚本改进
- 添加 ANSI 颜色输出，更美观的终端显示
- 支持命令行参数：`--topic`、`--rounds`、`--duration`
- 添加 `--help` 帮助信息
- 改进输出格式，使用双线边框
- 增强用户体验

### 📊 统计
- **新增文件：** 3 个（脚本、配置示例、更新日志）
- **改进文件：** 3 个（README.md、quick-start.js、package.json）
- **Git 提交：** 4 次
- **代码行数：** +250 行
- **测试状态：** ✅ 全部通过

### 🚀 使用方式

```bash
# 克隆最新版本
cd ~/.openclaw/skills/multi-agent-discuss
git pull origin main

# 使用配置示例
cp config.example.json config.json
# 编辑 config.json 自定义配置

# 使用改进的快速启动脚本
node quick-start.js --topic "你的主题" --rounds 3

# 运行 GitHub Issue 监控
bash scripts/check-github-issues.sh
```

### 📝 下一步计划
- [ ] 添加更多讨论模板
- [ ] 实现 Agent 性能监控
- [ ] 优化 WebSocket 性能
- [ ] 添加更多导出格式支持

---

## [2.6.6] - 2026-02-02

### 消息气泡样式优化
- 增强圆角效果
- 改进阴影和动画效果
- 提升视觉体验

---

## 更早版本

详细历史请查看 Git 提交记录。
