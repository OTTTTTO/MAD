# GitHub Release 创建指南

## 🎯 目标
在 GitHub 上为 MAD 项目创建 v2.6.2 版本的 Release

---

## ✅ 已完成的工作

1. ✅ 创建 Git Tag: `v2.6.2`
2. ✅ 推送 Tag 到 GitHub
3. ✅ 准备完整的 Release Notes: `RELEASE_NOTES_v2.6.2.md`
4. ✅ 创建自动化脚本: `create-github-release.sh`

---

## 📋 方法 1：使用自动化脚本（推荐）

### 前置条件
- 已安装 `curl` 和 `jq`
- 有 GitHub Token

### 步骤

1. **获取 GitHub Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 生成并复制 token

2. **运行脚本**
   ```bash
   cd /home/otto/.openclaw/skills/multi-agent-discuss
   ./create-github-release.sh YOUR_GITHUB_TOKEN
   ```

3. **验证**
   - 脚本会返回 Release URL
   - 访问 URL 确认 Release 创建成功

---

## 📋 方法 2：手动创建（Web 界面）

### 步骤

1. **访问 GitHub Releases 页面**
   ```
   https://github.com/OTTTTTO/MAD/releases
   ```

2. **点击 "Draft a new release"**
   - 在页面右侧找到按钮

3. **填写 Release 信息**

   **Choose a tag:**
   - 选择：`v2.6.2`
   - Target: `main`

   **Release title:**
   ```
   MAD v2.6.2 - 移动端优化 + 代码库重构
   ```

   **Description:**
   - 复制 `RELEASE_NOTES_v2.6.2.md` 的全部内容
   - 或访问：https://github.com/OTTTTTO/MAD/blob/main/RELEASE_NOTES_v2.6.2.md

4. **设置 Release 选项**
   - ☐ Set as the latest release（建议勾选）
   - ☐ Set as a pre-release（不勾选）

5. **发布**
   - 点击 "Publish release" 按钮

---

## 📋 方法 3：使用 GitHub CLI（gh）

### 安装 gh CLI
```bash
# Ubuntu/Debian
sudo apt install gh

# macOS
brew install gh

# 验证安装
gh --version
```

### 登录 GitHub
```bash
gh auth login
```

### 创建 Release
```bash
cd /home/otto/.openclaw/skills/multi-agent-discuss
gh release create v2.6.2 \
  --title "MAD v2.6.2 - 移动端优化 + 代码库重构" \
  --notes-file RELEASE_NOTES_v2.6.2.md
```

---

## 📦 Release 包含的内容

### Git Tag
- **Tag 名称：** `v2.6.2`
- **Commit:** `e26948d`
- **分支：** `main`

### Release Notes
完整的版本更新说明，包括：
- 📱 移动端优化
- 📖 文档完善
- 🔧 代码库重构
- 🐛 Bug 修复
- 🚀 新功能
- 📊 版本对比
- 📝 升级指南

### 文件变更
- 新增：3 个文件
- 修改：5 个文件
- 移动/重命名：71 个文件

---

## 🎯 发布后的验证清单

- [ ] Release 页面显示正确的版本号（v2.6.2）
- [ ] Release Notes 显示完整
- [ ] 代码源码链接正常（.zip 和 .tar.gz）
- [ ] Tag 关联到正确的 commit
- [ ] README 中的版本徽章显示最新版本
- [ ] 用户可以通过 `git pull` 获取最新版本

---

## 📞 获取帮助

### GitHub 文档
- [Creating releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

### 常见问题

**Q: 如何编辑已发布的 Release？**
A: 访问 Release 页面，点击右上角的 "Edit release" 按钮

**Q: 如何删除已发布的 Release？**
A: 访问 Release 页面，点击 "Delete release" 按钮（注意：Tag 会保留）

**Q: 如何下载 Release？**
A: 访问 https://github.com/OTTTTTO/MAD/releases，选择对应版本下载

---

## 🎉 发布完成后

1. **通知用户**
   - 在 Feishu 群发布更新通知
   - 更新文档中的版本说明

2. **更新依赖**
   - 如果有其他项目依赖 MAD，更新 package.json

3. **监控反馈**
   - 关注 GitHub Issues
   - 收集用户反馈

---

**准备好了吗？选择一个方法创建你的第一个 GitHub Release！** 🚀
