# MAD v2.6.4 发布说明

发布日期：2025-02-02

## 🎉 新功能

### Toast 通知系统
- ✨ 新增现代化的 Toast 通知组件
- 🎨 支持多种类型：成功（success）、错误（error）、警告（warning）、信息（info）
- ⏱️ 可配置自动关闭时间
- 🎯 支持手动关闭和一键清除所有通知
- 📱 响应式设计，完美支持移动端
- 🎭 流畅的动画效果：滑入/滑出/进度条
- 🎨 每种类型都有独特的颜色和图标

### 用户体验改进
- ✅ 复制消息到剪贴板时显示 Toast 通知
- ✅ 讨论创建成功时显示 Toast 通知
- ✅ Agent 创建成功时显示 Toast 通知
- ✅ 标签创建成功时显示 Toast 通知
- ✅ 收藏夹创建成功时显示 Toast 通知
- ✅ 讨论清空时显示 Toast 通知
- ✅ 讨论合并时显示 Toast 通知

## 🔧 技术改进

### 前端优化
- 新增 `showToast()` 函数用于显示通知
- 新增 `showSuccessToast()`、`showErrorToast()`、`showWarningToast()`、`showInfoToast()` 快捷方法
- 新增 `removeToast()` 函数用于移除单个通知
- 新增 `clearAllToasts()` 函数用于清除所有通知
- 新增 `initToast()` 初始化函数
- Toast 容器自动创建，无需手动配置

### 样式增强
- 新增 `.toast-container` 样式
- 新增 `.toast` 基础样式
- 新增 `.toast.success`、`.toast.error`、`.toast.warning`、`.toast.info` 类型样式
- 新增 Toast 动画：`toastSlideIn`、`toastSlideOut`、`toastProgress`
- 新增响应式媒体查询，移动端自适应

## 📝 使用示例

```javascript
// 显示成功通知
showSuccessToast('操作成功！', '完成', 3000);

// 显示错误通知
showErrorToast('操作失败，请重试', '错误', 5000);

// 显示警告通知
showWarningToast('请注意检查输入', '警告', 4000);

// 显示信息通知
showInfoToast('新功能已上线', '提示', 3000);

// 自定义通知
showToast('这是自定义消息', 'info', '自定义标题', 3000);

// 不自动关闭的通知
showSuccessToast('重要消息', '提示', 0);
```

## 🐛 修复问题
- 无

## 💡 后续计划
- 考虑添加通知声音
- 考虑添加通知历史记录
- 考虑添加通知偏好设置

## 📊 统计
- 新增代码：约 300 行
- 修改文件：3 个（index.html, style.css, app.js, package.json）
- 新增功能：1 个主要功能（Toast 通知系统）

---

**升级建议：** 建议所有用户升级到此版本以获得更好的用户体验。

**反馈渠道：** 如有问题或建议，请在 GitHub 上提 Issue。
