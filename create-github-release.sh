#!/bin/bash
# GitHub Release 创建脚本
# 使用方法：./create-github-release.sh YOUR_GITHUB_TOKEN

set -e

# 配置
REPO_OWNER="OTTTTTO"
REPO_NAME="MAD"
TAG_NAME="v2.6.2"
TITLE="MAD v2.6.2 - 移动端优化 + 代码库重构"
RELEASE_NOTES_FILE="RELEASE_NOTES_v2.6.2.md"

# 检查参数
if [ -z "$1" ]; then
  echo "❌ 错误：缺少 GitHub Token"
  echo ""
  echo "使用方法："
  echo "  ./create-github-release.sh YOUR_GITHUB_TOKEN"
  echo ""
  echo "获取 GitHub Token："
  echo "  1. 访问 https://github.com/settings/tokens"
  echo "  2. 点击 'Generate new token (classic)'"
  echo "  3. 选择 'repo' 权限"
  echo "  4. 生成并复制 token"
  exit 1
fi

GITHUB_TOKEN="$1"

# 检查文件是否存在
if [ ! -f "$RELEASE_NOTES_FILE" ]; then
  echo "❌ 错误：找不到 $RELEASE_NOTES_FILE"
  exit 1
fi

# 读取 release notes
RELEASE_NOTES=$(cat "$RELEASE_NOTES_FILE")

echo "🚀 正在创建 GitHub Release..."
echo "  仓库: $REPO_OWNER/$REPO_NAME"
echo "  标签: $TAG_NAME"
echo "  标题: $TITLE"
echo ""

# 创建 release
RESPONSE=$(curl -s -X POST \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/releases" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "{
    \"tag_name\": \"$TAG_NAME\",
    \"target_commitish\": \"main\",
    \"name\": \"$TITLE\",
    \"body\": $(echo "$RELEASE_NOTES" | jq -R -s .),
    \"draft\": false,
    \"prerelease\": false
  }")

# 检查响应
if echo "$RESPONSE" | jq -e '.html_url' > /dev/null; then
  HTML_URL=$(echo "$RESPONSE" | jq -r '.html_url')
  echo "✅ Release 创建成功！"
  echo ""
  echo "📍 访问地址："
  echo "  $HTML_URL"
  echo ""
  echo "📦 Release 信息："
  echo "  标签: $(echo "$RESPONSE" | jq -r '.tag_name')"
  echo "  名称: $(echo "$RESPONSE" | jq -r '.name')"
  echo "  作者: $(echo "$RESPONSE" | jq -r '.author.login')"
else
  echo "❌ Release 创建失败"
  echo ""
  echo "错误信息："
  echo "$RESPONSE" | jq -r '.message // .'
  exit 1
fi
