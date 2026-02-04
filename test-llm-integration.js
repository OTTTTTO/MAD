/**
 * v4.0.8 LLM集成测试
 *
 * 目标：验证sessions_spawn是否可以用于专家LLM调用
 */

async function testSessionsSpawn() {
  console.log('='.repeat(60));
  console.log('MAD v4.0.8 - sessions_spawn集成测试');
  console.log('='.repeat(60));

  try {
    // 测试1：检查tool是否可用
    console.log('\n[测试1] 检查OpenClaw工具...');
    if (!this.tool) {
      throw new Error('this.tool 未注入');
    }
    if (!this.tool.sessions_spawn) {
      throw new Error('this.tool.sessions_spawn 不可用');
    }
    console.log('✅ tool.sessions_spawn 可用');

    // 测试2：spawn一个技术专家
    console.log('\n[测试2] Spawn技术专家...');
    const techExpertPrompt = `你是一位资深技术专家。

请分析以下技术方案的可行性：

话题：我想使用Node.js开发一个高并发的实时聊天系统

请给出：
1. 技术可行性评估
2. 推荐的技术栈
3. 潜在的技术风险
4. 实施建议`;

    const result = await this.tool.sessions_spawn({
      task: techExpertPrompt,
      label: '技术专家-LLM测试',
      runTimeoutSeconds: 120
    });

    console.log('✅ Spawn结果:', result);

    if (result.status === 'accepted') {
      console.log(`  Run ID: ${result.runId}`);
      console.log(`  Session Key: ${result.childSessionKey}`);

      // 测试3：等待sub-agent完成并获取结果
      console.log('\n[测试3] 等待专家完成分析...');
      await sleep(5000); // 等待5秒

      const history = await this.tool.sessions_history({
        sessionKey: result.childSessionKey,
        limit: 10
      });

      console.log(`✅ 获取到 ${history.messages.length} 条消息`);

      const lastAssistantMessage = history.messages
        .filter(m => m.role === 'assistant')
        .pop();

      if (lastAssistantMessage) {
        console.log('\n[专家回复]');
        console.log(lastAssistantMessage.content.substring(0, 500) + '...');
        console.log('\n✅ LLM集成成功！');
      } else {
        console.log('⚠️  专家尚未回复');
      }

    } else {
      console.log('❌ Spawn失败:', result);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('   可能原因：');
    console.error('   1. tool未正确注入');
    console.error('   2. sessions_spawn权限未开启');
    console.error('   3. OpenClaw Gateway未运行');
  }

  console.log('\n' + '='.repeat(60));
  console.log('测试完成');
  console.log('='.repeat(60));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 如果在MAD Skill中调用
async function testInMADSkill() {
  // 模拟tool注入
  const mockTool = {
    sessions_spawn: async (params) => {
      console.log('模拟sessions_spawn调用:', params);
      return {
        status: 'accepted',
        runId: 'test-' + Date.now(),
        childSessionKey: 'agent:pm-dev:subagent:test-' + Date.now()
      };
    },
    sessions_history: async (params) => {
      return {
        messages: [
          { role: 'user', content: '测试问题' },
          {
            role: 'assistant',
            content: '作为技术专家，我认为这个方案可行。推荐使用：\n1. WebSocket用于实时通信\n2. Redis用于消息队列\n3. 集群部署支持高并发\n\n技术风险：\n- 需要做好负载均衡\n- 消息持久化需要考虑\n\n实施建议：\n- 先做单机版本测试\n- 使用PM2做进程管理'
          }
        ]
      };
    }
  };

  // 临时绑定this.tool
  const boundTest = testSessionsSpawn.bind({ tool: mockTool });
  await boundTest();
}

// 导出
module.exports = { testSessionsSpawn, testInMADSkill };

// 如果直接运行
if (require.main === module) {
  testInMADSkill().then(() => {
    console.log('\n提示：这是模拟测试。真实测试需要在MAD Skill中运行。');
    process.exit(0);
  }).catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}
