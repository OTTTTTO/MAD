# 贡献指南

感谢你对 MAD 项目的关注！我们欢迎任何形式的贡献。

## 🤝 如何贡献

### 报告 Bug

如果你发现了 Bug，请：

1. 检查 [Issues](https://github.com/OTTTTTO/MAD/issues) 是否已有相同问题
2. 如果没有，创建新的 Issue，使用 Bug 报告模板
3. 提供详细的问题描述、复现步骤和环境信息

### 提出新功能

1. 先在 [Issues](https://github.com/OTTTTTO/MAD/issues) 中讨论你的想法
2. 等待维护者反馈
3. 获得批准后再开始开发

### 提交代码

#### 开发流程

1. **Fork 项目**
   ```bash
   # 在 GitHub 上 Fork 本项目
   ```

2. **克隆你的 Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/MAD.git
   cd MAD
   ```

3. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **进行开发**
   - 遵循现有代码风格
   - 添加必要的注释
   - 编写测试用例
   - 确保所有测试通过

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加你的功能描述"
   ```

6. **推送到 GitHub**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 使用 PR 模板填写信息
   - 等待代码审查

#### 提交信息规范

使用语义化提交信息：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式调整（不影响功能）
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具相关

示例：
```
feat: 添加 WebSocket 实时推送功能
fix: 修复讨论历史记录丢失的问题
docs: 更新 README 安装说明
```

#### 代码规范

- **JavaScript:** 使用 ES6+ 语法
- **注释:** 关键逻辑必须添加注释
- **测试:** 新功能需要添加测试用例
- **文档:** 更新相关文档

## 📋 开发环境

### 安装依赖

```bash
npm install
```

### 运行测试

```bash
npm test
```

### 本地开发

```bash
# 启动 Web 服务器
npm start

# 启动 WebSocket 服务
npm run start:ws

# 运行演示
npm run demo
```

## 🎯 项目结构

```
MAD/
├── orchestrator.js        # 核心协调器
├── agents/               # Agent 定义
├── templates/            # 讨论模板
├── web/                  # Web 界面
├── scripts/              # 实用脚本
├── test/                 # 测试文件
├── data/                 # 运行时数据
└── docs/                 # 文档
```

## 📝 发布流程

1. 更新版本号（package.json）
2. 更新 CHANGELOG.md
3. 创建 Git 标签
4. 推送到 GitHub
5. 创建 GitHub Release

## 💬 交流

- GitHub Issues: 提交 Bug 和功能请求
- GitHub Discussions: 讨论技术问题
- Pull Requests: 代码审查

## 📄 许可

提交代码即表示你同意将代码以 MIT 许可证发布。

---

再次感谢你的贡献！❤️
