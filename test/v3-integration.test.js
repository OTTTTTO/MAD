/**
 * MAD v3.0 - 集成测试
 */

const V3Integration = require('../src/v3-integration.js');

describe('MAD v3.0 Integration', () => {
  let v3;

  beforeEach(() => {
    // Mock orchestrator
    const mockOrchestrator = {};
    v3 = new V3Integration(mockOrchestrator);
  });

  test('should initialize v3.0 features', async () => {
    await v3.initialize();
    expect(v3.projectManager).toBeDefined();
    expect(v3.expertManager).toBeDefined();
    expect(v3.smartAnalyzer).toBeDefined();
  });

  test('should create project from natural language input', async () => {
    const userInput = '我想写一篇关于微服务分层架构设计的专利文档';

    const result = await v3.createProjectFromInput(userInput);

    expect(result.project).toBeDefined();
    expect(result.experts).toBeDefined();
    expect(result.experts.length).toBeGreaterThan(0);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.category).toBe('文档编写');
  });

  test('should add agent message to project', async () => {
    // 首先创建项目
    const { project } = await v3.createProjectFromInput('测试项目');

    // Agent 发言
    const message = await v3.agentSpeak(project.id, 'technical', '这是我的建议');

    expect(message).toBeDefined();
    expect(message.role).toBe('technical');
    expect(message.content).toBe('这是我的建议');
  });

  test('should add marker to project', async () => {
    const { project } = await v3.createProjectFromInput('测试项目');

    const marker = await v3.addMarker(project.id, {
      title: '重要决策',
      type: 'decision',
      messageId: 'msg-1',
      summary: '决定使用微服务架构',
      conclusions: ['使用微服务', '分层设计'],
      tags: ['架构', '决策']
    });

    expect(marker).toBeDefined();
    expect(marker.title).toBe('重要决策');
    expect(marker.type).toBe('decision');
    expect(marker.conclusions).toHaveLength(2);
  });

  test('should get compressed context', async () => {
    const { project } = await v3.createProjectFromInput('测试项目');

    // 添加一些消息
    await v3.agentSpeak(project.id, 'technical', '消息1');
    await v3.agentSpeak(project.id, 'technical', '消息2');
    await v3.agentSpeak(project.id, 'technical', '消息3');

    const context = await v3.getCompressedContext(project.id, 1000);

    expect(context).toBeDefined();
    expect(Array.isArray(context)).toBe(true);
  });

  test('should list projects', async () => {
    await v3.createProjectFromInput('项目1');
    await v3.createProjectFromInput('项目2');

    const projects = await v3.listProjects();

    expect(projects).toBeDefined();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThanOrEqual(2);
  });

  test('should get project with flow stats', async () => {
    const { project } = await v3.createProjectFromInput('测试项目');
    await v3.agentSpeak(project.id, 'technical', '测试消息');

    const projectWithStats = await v3.getProject(project.id);

    expect(projectWithStats).toBeDefined();
    expect(projectWithStats.flowStats).toBeDefined();
    expect(projectWithStats.flowStats.totalMessages).toBeGreaterThan(0);
  });

  test('should get project messages with filters', async () => {
    const { project } = await v3.createProjectFromInput('测试项目');

    await v3.agentSpeak(project.id, 'technical', '技术建议');
    await v3.agentSpeak(project.id, 'testing', '测试建议');

    // 按角色过滤
    const techMessages = await v3.getProjectMessages(project.id, { role: 'technical' });

    expect(techMessages).toHaveLength(1);
    expect(techMessages[0].role).toBe('technical');

    // 限制数量
    const limitedMessages = await v3.getProjectMessages(project.id, { limit: 1 });

    expect(limitedMessages).toHaveLength(1);
  });
});
