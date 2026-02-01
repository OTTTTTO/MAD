#!/usr/bin/env node

/**
 * MAD WebSocket Server - 实时推送
 * 
 * 实时推送：
- 新消息
- Agent 统计更新
- 讨论状态变更
 */

const WebSocket = require('ws');
const { DiscussionOrchestrator } = require('../orchestrator.js');

/**
 * 创建 WebSocket 服务器
 */
function createWebSocketServer(port = 18791, orchestrator) {
  const wss = new WebSocket.Server({ port });

  const clients = new Set();

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    clients.add(ws);

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to MAD WebSocket Server',
      timestamp: Date.now()
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(ws, data, orchestrator);
      } catch (error) {
        console.error('[WS] Invalid message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS] Error:', error);
      clients.delete(ws);
    });
  });

  console.log(`[WS] WebSocket Server started on port ${port}`);

  return {
    broadcast,
    close
  };

  /**
   * 广播消息给所有客户端
   */
  function broadcast(type, data) {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * 关闭服务器
   */
  function close() {
    wss.close();
  }
}

/**
 * 处理客户端消息
 */
function handleClientMessage(ws, data, orchestrator) {
  switch (data.type) {
    case 'subscribe':
      // 订阅讨论更新
      console.log(`[WS] Client subscribed to discussion: ${data.discussionId}`);
      ws.subscribedDiscussion = data.discussionId;
      break;

    case 'unsubscribe':
      ws.subscribedDiscussion = null;
      break;

    default:
      console.log('[WS] Unknown message type:', data.type);
  }
}

/**
 * 创建带 WebSocket 的 HTTP 服务器
 */
async function createIntegratedServer(httpPort = 18790, wsPort = 18791) {
  const orchestrator = new DiscussionOrchestrator();
  await orchestrator.initialize();

  // 启动 WebSocket 服务器
  const wsServer = createWebSocketServer(wsPort, orchestrator);

  // Hook 到 agentSpeak 方法
  const originalAgentSpeak = orchestrator.agentSpeak.bind(orchestrator);
  orchestrator.agentSpeak = async function(discussionId, agentId, content, metadata) {
    const result = await originalAgentSpeak(discussionId, agentId, content, metadata);
    
    // 广播新消息
    wsServer.broadcast('newMessage', {
      discussionId,
      message: result
    });

    // 广播统计更新
    const stats = orchestrator.getAgentStats(agentId);
    wsServer.broadcast('agentStatsUpdate', {
      agentId,
      stats
    });

    return result;
  };

  return {
    orchestrator,
    wsServer,
    close: () => wsServer.close()
  };
}

// 启动服务器
if (require.main === module) {
  createIntegratedServer().then(server => {
    console.log('\n🚀 MAD Integrated Server started!');
    console.log('📡 WebSocket: ws://localhost:18791');
    console.log('\n按 Ctrl+C 停止服务器\n');
  }).catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { createWebSocketServer, createIntegratedServer };
