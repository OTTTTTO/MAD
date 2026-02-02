#!/bin/bash
# MAD 项目 GitHub Issue 监控与自动修复脚本

set -e

# 配置
REPO_OWNER="OTTTTTO"
REPO_NAME="MAD"
PROJECT_PATH="/home/otto/.openclaw/skills/multi-agent-discuss"
STATE_FILE="/tmp/mad-issues-last-check.txt"
LOG_FILE="/tmp/mad-issues-monitor.log"

# 日志函数
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔍 开始检查 MAD 项目的 GitHub Issues..."

# 获取已处理的 issues（从状态文件）
if [ -f "$STATE_FILE" ]; then
  PROCESSED_ISSUES=$(cat "$STATE_FILE")
else
  PROCESSED_ISSUES=""
fi

# 获取 open 的 issues（不包括 pull requests）
log "📡 获取 GitHub Issues..."
ISSUES=$(curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&sort=created&direction=desc" | jq -r '.[] | select(.pull_request == null) | @json')

if [ -z "$ISSUES" ]; then
  log "✅ 没有发现开放的 Issues"
  exit 0
fi

# 检查每个 issue
echo "$ISSUES" | while read -r issue; do
  ISSUE_NUMBER=$(echo "$issue" | jq -r '.number')
  ISSUE_TITLE=$(echo "$issue" | jq -r '.title')
  ISSUE_BODY=$(echo "$issue" | jq -r '.body // "无描述"')
  ISSUE_URL=$(echo "$issue" | jq -r '.html_url')
  CREATED_AT=$(echo "$issue" | jq -r '.created_at')
  USER=$(echo "$issue" | jq -r '.user.login')

  # 检查是否已处理
  if echo "$PROCESSED_ISSUES" | grep -q "$ISSUE_NUMBER"; then
    log "⏭️  Issue #$ISSUE_NUMBER 已处理，跳过"
    continue
  fi

  log "🎯 发现新 Issue: #$ISSUE_NUMBER - $ISSUE_TITLE"
  log "📝 创建者: $USER"
  log "🔗 链接: $ISSUE_URL"
  log "📄 描述: ${ISSUE_BODY:0:200}..."

  # 创建任务描述文件
  TASK_FILE="/tmp/mad-issue-${ISSUE_NUMBER}.md"
  cat > "$TASK_FILE" <<EOF
# MAD Issue 修复任务

## Issue 信息
- **编号:** #$ISSUE_NUMBER
- **标题:** $ISSUE_TITLE
- **创建者:** $USER
- **创建时间:** $CREATED_AT
- **链接:** $ISSUE_URL

## 问题描述
$ISSUE_BODY

## 修复要求
1. **理解问题:** 仔细阅读 Issue，理解问题的本质
2. **分析代码:** 检查 $PROJECT_PATH 中的相关代码
3. **制定方案:** 设计修复方案
4. **实施修复:** 编写代码修复问题
5. **测试验证:** 确保修复有效，不引入新问题
6. **提交代码:**
   - git add .
   - git commit -m "fix: 修复 Issue #$ISSUE_NUMBER - $ISSUE_TITLE"
   - git push origin main

## 注意事项
- 遵循 MAD 项目的代码规范
- 保持代码简洁高效
- 如果 Issue 描述不清楚，在修复前先在 GitHub 上提问
- 修复后，在 GitHub Issue 中回复说明已修复
- 关闭 Issue

## 项目信息
- **项目路径:** $PROJECT_PATH
- **仓库:** https://github.com/${REPO_OWNER}/${REPO_NAME}
- **当前版本:** $(cd "$PROJECT_PATH" && git describe --tags --abbrev=0 2>/dev/null || echo "unknown")

开始修复吧！🚀
EOF

  log "📋 任务文件已创建: $TASK_FILE"

  # 触发子 Agent 处理
  log "🤖 触发 Agent 进行修复..."

  # 使用 OpenClaw 的 sessions_spawn API
  # 注意：这里需要实际的 API 调用，暂时用占位符
  # 实际应该通过 OpenClaw 的 API 触发子 Agent

  # 标记为已处理
  if [ -z "$PROCESSED_ISSUES" ]; then
    echo "$ISSUE_NUMBER" > "$STATE_FILE"
  else
    echo "$PROCESSED_ISSUES" > "${STATE_FILE}.tmp"
    echo "$ISSUE_NUMBER" >> "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
  fi

  log "✅ Issue #$ISSUE_NUMBER 已加入处理队列"
  echo ""
done

log "✅ 检查完成"
