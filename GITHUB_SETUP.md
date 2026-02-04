# GitHub 仓库设置指南

由于系统环境中没有安装 GitHub CLI (`gh`)，需要手动创建 GitHub 仓库。

## 方法 1：通过 GitHub 网页创建（推荐）

1. 访问 https://github.com/new
2. 仓库名称：`multi-agent-discuss`
3. 描述：`Multi-Agent 协同讨论系统 - 让多个专业 Agent 在虚拟讨论组中协作`
4. 设置为 Public 或 Private
5. **不要**勾选 "Add a README file"（我们已经有了）
6. 点击 "Create repository"

然后在本地运行：

\`\`\`bash
cd /home/otto/.openclaw/skills/multi-agent-discuss
git remote add origin git@github.com:OTTTTTO/multi-agent-discuss.git
git branch -M main
git push -u origin main
\`\`\`

## 方法 2：使用 Git 命令（如果已在 GitHub 创建仓库）

\`\`\`bash
cd /home/otto/.openclaw/skills/multi-agent-discuss
git remote add origin git@github.com:OTTTTTO/multi-agent-discuss.git
git branch -M main
git push -u origin main
\`\`\`

## 验证推送成功

推送成功后，访问：https://github.com/OTTTTTO/multi-agent-discuss

你应该能看到所有文件：
- README.md
- SKILL.md
- orchestrator.js
- agents/prompts/
- test/

## 更新代码后的提交

\`\`\`bash
git add .
git commit -m "描述你的修改"
git push
\`\`\`

---

**注意：** 请确保已在 GitHub 上创建仓库，或者在创建后立即运行上述 git 命令。
