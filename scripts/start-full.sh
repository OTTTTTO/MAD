#!/bin/bash
# MAD完整启动脚本 - Web服务器 + Agent后端

echo "================================="
echo "🦞 MAD 完整系统启动"
echo "================================="

# MAD项目路径
MAD_PATH="/home/otto/.npm-global/lib/node_modules/openclaw/skills/MAD"
cd "$MAD_PATH" || exit 1

# 1. 停止旧进程
echo "🛑 停止旧进程..."
pkill -f "node web/server.js" 2>/dev/null || true
pkill -f "node scripts/agent-backend.js" 2>/dev/null || true
sleep 2

# 2. 检查Agent后端是否运行
echo "🔍 检查Agent后端状态..."
AGENT_HEALTH=$(curl -s http://localhost:18791/health 2>/dev/null || echo '{"status":"error"}')
if echo "$AGENT_HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Agent后端已运行"
  AGENT_RUNNING=true
else
  echo "⚠️  Agent后端未运行"
  echo "💡 请在OpenClaw中运行: sessions_spawn({task:'mad-agent-backend',label:'MAD后端'})"
  AGENT_RUNNING=false
fi

# 3. 启动Web服务器
echo "🌐 启动Web服务器..."
nohup node web/server.js > logs/server.log 2>&1 &
WEB_PID=$!
sleep 2

# 检查Web服务器
if ps -p $WEB_PID > /dev/null; then
  echo "✅ Web服务器已启动 (PID: $WEB_PID)"
else
  echo "❌ Web服务器启动失败"
  exit 1
fi

# 4. 显示访问信息
echo ""
echo "================================="
echo "✅ 启动完成"
echo "================================="
echo "📊 Web界面: http://localhost:18790"
if [ "$AGENT_RUNNING" = true ]; then
  echo "🤖 Agent后端: http://localhost:18791"
  echo "✨ LLM功能: 已启用"
else
  echo "⚠️  Agent后端: 未运行"
  echo "💡 模板模式: 使用中"
fi
echo ""
echo "日志位置:"
echo "  - Web服务器: logs/server.log"
echo "  - Agent后端: logs/agent-backend.log"
echo ""
echo "停止服务:"
echo "  - pkill -f 'node web/server.js'"
echo "  - 停止Agent: 在OpenClaw会话中停止"
echo "================================="
