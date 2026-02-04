#!/bin/bash
# 启动MAD Agent Server的持久脚本

echo "启动MAD Agent Server..."

MAD_PATH="/home/otto/.npm-global/lib/node_modules/openclaw/skills/MAD"
cd "$MAD_PATH" || exit 1

# 检查是否已运行
if pgrep -f "node scripts/agent-backend.js" > /dev/null; then
  echo "⚠️  Agent Server已在运行"
  exit 0
fi

# 启动Agent Server（但需要Agent环境！）
echo "❌ Agent Server需要在OpenClaw Agent环境中运行"
echo "请使用 sessions_spawn 或在Agent会话中启动"

exit 1
