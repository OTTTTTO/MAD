/**
 * v4.0.8 完整LLM集成测试
 *
 * 测试内容：
 * 1. 真实LLM专家调用
 * 2. 并行专家讨论
 * 3. 专家协作
 */

const DiscussionEngine = require('./src/core/v4/discussion-engine');

async function testRealLLMIntegration() {
  console.log('='.repeat(60));
  console.log('MAD v4.0.8 - 真实LLM集成测试');
  console.log('='.repeat(60));

  // 检查tool注入
  if (!this.tool) {
    console.log('❌ this.tool 未注入');
    console.log('   这是正常的，因为测试脚本不是在OpenClaw Agent中运行');
    console.log('   真实测试需要在MAD Skill API中调用');
    return;
  }

  const engine = new DiscussionEngine({
    tool: this.tool
  });

  // 测试话题
  const topic = {
    content: '我想开发一个在线教育平台，需要考虑技术架构、用户体验和商业模式',
    description: '在线教育平台项目'
  };

  console.log('\n[测试] 启动真实LLM讨论...');
  console.log('话题:', topic.content);
  console.log('\n注意：这将真正调用LLM，可能需要1-2分钟\n');

  try {
    const result = await engine.startDiscussion(topic);

    if (!result.success) {
      console.log('❌ 讨论失败:', result.error);
      return;
    }

    console.log('\n✅ 讨论完成！');
    console.log('  消息数:', result.discussion.messages.length);
    console.log('  讨论时长:', Math.round((Date.now() - result.discussion.metadata.startTime) / 1000), '秒');

    console.log('\n' + '='.repeat(60));
    console.log('【专家意见】');
    console.log('='.repeat(60));

    // 显示专家响应
    const expertMessages = result.discussion.messages.filter(m =>
      m.type === 'EXPERT_RESPONSE' && m.llmGenerated
    );

    for (const msg of expertMessages) {
      console.log(`\n【${msg.expertName}】`);
      console.log(msg.content.substring(0, 800) + '...\n');
    }

    console.log('='.repeat(60));
    console.log('✅ LLM集成测试成功！');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 模拟测试（不使用真实LLM）
async function simulateTest() {
  console.log('='.repeat(60));
  console.log('MAD v4.0.8 - 模拟测试（不调用真实LLM）');
  console.log('='.repeat(60));

  // 模拟tool
  const mockTool = {
    sessions_spawn: async (params) => {
      console.log(`\n[模拟] Spawn专家: ${params.label}`);
      console.log(`  任务长度: ${params.task.length} 字符`);

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        status: 'accepted',
        runId: 'sim-' + Date.now(),
        childSessionKey: 'agent:pm-dev:subagent:sim-' + Date.now()
      };
    },
    sessions_history: async (params) => {
      // 模拟专家响应
      const responses = {
        technical: `作为技术专家，我认为这个在线教育平台方案可行。

1. 技术架构：
   - 前端：React/Vue.js + TypeScript
   - 后端：Node.js + Express 或 Python/Django
   - 数据库：PostgreSQL (主数据) + Redis (缓存)
   - 视频流：HLS/ DASH协议
   - 实时互动：WebSocket

2. 技术风险：
   - 视频并发流量大，需要CDN加速
   - 实时互动需要考虑低延迟
   - 数据安全需要加密存储

3. 实施建议：
   - 先做MVP验证核心功能
   - 使用云服务弹性扩展
   - 建议咨询产品专家明确功能需求`,

        product: `作为产品专家，我为这个在线教育平台做以下分析：

1. 目标用户：
   - 主要用户：职场人士（需要提升技能）
   - 次要用户：大学生（需要考证）
   - 付费意愿：中等偏高

2. 核心功能（MVP）：
   - 视频课程点播
   - 在线直播授课
   - 作业/考试系统
   - 学习进度跟踪

3. 用户体验关键点：
   - 视频播放流畅度
   - 课程搜索和推荐
   - 移动端适配

建议咨询技术专家确认技术可行性，咨询商业专家分析盈利模式。`,

        business: `作为商业专家，我分析这个在线教育平台的商业模式：

1. 盈利模式：
   - 订阅制：月费/年费会员
   - 单课付费：按课程购买
   - 企业版：B端企业培训

2. 市场分析：
   - 市场规模：千亿级市场
   - 竞争激烈：需要差异化
   - 增长趋势：在线教育持续增长

3. 成本结构：
   - 内容制作：讲师费用
   - 技术开发：平台搭建
   - 营销推广：获客成本较高

4. 商业路径：
   - 先做垂直领域（如IT技能）
   - 建立品牌影响力
   - 逐步扩展到其他领域

建议咨询运营专家制定用户增长策略。`
      };

      // 根据sessionKey判断是哪个专家
      let domain = 'technical';
      if (params.sessionKey.includes('product')) domain = 'product';
      if (params.sessionKey.includes('business')) domain = 'business';

      return {
        messages: [
          { role: 'user', content: '测试问题' },
          { role: 'assistant', content: responses[domain] || responses.technical }
        ]
      };
    }
  };

  const engine = new DiscussionEngine({
    tool: mockTool
  });

  const topic = {
    content: '我想开发一个在线教育平台，需要考虑技术架构、用户体验和商业模式',
    description: '在线教育平台项目'
  };

  console.log('\n[测试] 启动模拟讨论...');

  const result = await engine.startDiscussion(topic);

  if (!result.success) {
    console.log('❌ 讨论失败:', result.error);
    return;
  }

  console.log('\n✅ 讨论完成！');
  console.log('  消息数:', result.discussion.messages.length);

  console.log('\n' + '='.repeat(60));
  console.log('【专家意见】');
  console.log('='.repeat(60));

  const expertMessages = result.discussion.messages.filter(m =>
    m.type === 'EXPERT_RESPONSE' && m.llmGenerated
  );

  for (const msg of expertMessages) {
    console.log(`\n【${msg.expertName}】`);
    console.log(msg.content + '\n');
  }

  console.log('='.repeat(60));
  console.log('✅ 模拟测试完成！');
  console.log('提示：这是模拟数据。真实LLM调用需要在OpenClaw Agent中运行。');
  console.log('='.repeat(60));
}

// 导出
module.exports = { testRealLLMIntegration, simulateTest };

// 如果直接运行，执行模拟测试
if (require.main === module) {
  simulateTest().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('错误:', err);
    process.exit(1);
  });
}
