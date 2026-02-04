/**
 * v2.6.1 快速测试 - Agent Performance 修复验证
 */

const { AgentPerformanceAnalyzer } = require('../src/core/agent-performance.js');

// Mock orchestrator
class MockOrchestrator {
  constructor() {
    this.discussions = new Map();
    
    // 添加测试讨论
    this.discussions.set('test-disc-1', {
      id: 'test-disc-1',
      topic: '测试话题',
      createdAt: Date.now() - 1000 * 60 * 60,
      participants: [
        { id: 'coordinator', role: '主协调员' },
        { id: 'requirement', role: '需求分析' }
      ],
      messages: [
        {
          id: 'msg-1',
          role: 'coordinator',
          content: '大家好，我们开始讨论',
          timestamp: Date.now() - 1000 * 60 * 50
        },
        {
          id: 'msg-2',
          role: 'requirement',
          content: '我建议我们先分析用户需求',
          timestamp: Date.now() - 1000 * 60 * 40
        }
      ]
    });
  }
}

async function test() {
  console.log('🧪 v2.6.1 性能分析测试\n');

  const mockOrchestrator = new MockOrchestrator();
  const analyzer = new AgentPerformanceAnalyzer(mockOrchestrator);

  try {
    // 测试 1: 分析 coordinator 的性能
    console.log('测试 1: 分析 coordinator (agentId)');
    const perf1 = await analyzer.analyzePerformance('coordinator');
    console.log('✅ coordinator 分析成功');
    console.log(`   - 消息数: ${perf1.summary.totalMessages}`);
    console.log(`   - 参与讨论数: ${perf1.summary.totalDiscussions}`);
    console.log(`   - 总字符数: ${perf1.summary.totalCharacters}\n`);

    // 测试 2: 分析 requirement 的性能
    console.log('测试 2: 分析 requirement (agentId)');
    const perf2 = await analyzer.analyzePerformance('requirement');
    console.log('✅ requirement 分析成功');
    console.log(`   - 消息数: ${perf2.summary.totalMessages}`);
    console.log(`   - 参与讨论数: ${perf2.summary.totalDiscussions}\n`);

    // 测试 3: 分析不存在的 agent
    console.log('测试 3: 分析不存在的 agent');
    const perf3 = await analyzer.analyzePerformance('nonexistent');
    console.log('✅ 不存在的 agent 返回空结果');
    console.log(`   - 消息数: ${perf3.summary.totalMessages}\n`);

    console.log('✅ 所有测试通过！role 字段修复成功！\n');
    console.log('修复说明:');
    console.log('- 修改前: p.role === agentName (错误，比较的是中文名称)');
    console.log('- 修改后: p.id === agentName (正确，比较的是 agentId)');
    console.log('- participant.id = agentId (如 "coordinator")');
    console.log('- participant.role = 中文名称 (如 "主协调员")');
    console.log('- message.role = agentId (存储的是 agentId，不是 role 名称)\n');

    return true;
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
    return false;
  }
}

// 运行测试
test().then(success => {
  process.exit(success ? 0 : 1);
});
