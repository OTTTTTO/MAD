/**
 * MAD v3.0 - 智能标记功能测试
 */

const MarkerDetector = require('../src/core/marker-detector.js');
const MarkerGenerator = require('../src/core/marker-generator.js');

describe('MAD v3.3.0 - 智能标记', () => {
  let detector;
  let generator;

  beforeEach(() => {
    detector = new MarkerDetector();
    generator = new MarkerGenerator(detector);
  });

  describe('MarkerDetector', () => {
    test('应该检测到决策性消息', async () => {
      const message = {
        id: 'msg-1',
        role: 'technical',
        content: '经过讨论，我们决定采用微服务架构',
        timestamp: Date.now()
      };

      const analysis = await detector.analyzeMessage(message);

      expect(analysis.shouldMark).toBe(true);
      expect(analysis.markerType).toBe('decision');
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    test('应该检测到问题消息', async () => {
      const message = {
        id: 'msg-2',
        role: 'testing',
        content: '当前系统存在性能问题，响应时间太慢',
        timestamp: Date.now()
      };

      const analysis = await detector.analyzeMessage(message);

      expect(analysis.shouldMark).toBe(true);
      expect(analysis.markerType).toBe('problem');
    });

    test('应该检测到解决方案消息', async () => {
      const message = {
        id: 'msg-3',
        role: 'architect',
        content: '建议使用 Redis 缓存来优化性能',
        timestamp: Date.now()
      };

      const analysis = await detector.analyzeMessage(message);

      expect(analysis.shouldMark).toBe(true);
      expect(analysis.markerType).toBe('solution');
    });

    test('应该检测讨论阶段', async () => {
      const messages = [
        { id: 'msg-1', content: '项目启动', isMarker: true, markerType: 'milestone' },
        { id: 'msg-2', role: 'technical', content: '系统存在问题' },
        { id: 'msg-3', role: 'technical', content: '需要优化' }
      ];

      const phase = await detector.detectDiscussionPhase(messages);

      expect(phase).toBe('discussing');
    });

    test('应该生成智能摘要', async () => {
      const messages = [
        { id: 'msg-1', content: '开始讨论', isMarker: true, markerType: 'milestone', markerData: { title: '项目启动' } },
        { id: 'msg-2', role: 'technical', content: '技术方案已确定' },
        { id: 'msg-3', role: 'testing', content: '测试方案已准备' }
      ];

      const summary = await detector.generateSmartSummary(messages);

      expect(summary).toBeDefined();
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('项目启动');
    });

    test('应该分析整个讨论', async () => {
      const messages = [
        { id: 'msg-1', role: 'technical', content: '我们决定使用这个方案' },
        { id: 'msg-2', role: 'testing', content: '可能存在一些问题' },
        { id: 'msg-3', role: 'architect', content: '我建议采用另一个方案' }
      ];

      const suggestions = await detector.analyzeDiscussion(messages);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('MarkerGenerator', () => {
    test('应该生成标记', async () => {
      const message = {
        id: 'msg-1',
        role: 'technical',
        content: '决定使用微服务架构'
      };

      const analysis = {
        shouldMark: true,
        markerType: 'decision',
        confidence: 0.8,
        suggestedTitle: '决策：使用微服务',
        suggestedSummary: '决定使用微服务架构',
        suggestedTags: ['decision', 'technical']
      };

      const marker = await generator.generateMarker(message, analysis, 'project-1');

      expect(marker).toBeDefined();
      expect(marker.title).toBe('决策：使用微服务');
      expect(marker.type).toBe('decision');
      expect(marker.summary).toBe('决定使用微服务架构');
    });

    test('应该批量生成标记', async () => {
      const messages = [
        { id: 'msg-1', role: 'technical', content: '我们决定采用这个方案' },
        { id: 'msg-2', role: 'testing', content: '发现了一些问题' },
        { id: 'msg-3', role: 'architect', content: '建议使用新方案' }
      ];

      const markers = await generator.generateMarkers(messages, 'project-1', {
        maxMarkers: 5,
        minConfidence: 0.5
      });

      expect(markers).toBeDefined();
      expect(Array.isArray(markers)).toBe(true);
    });

    test('应该生成项目总结标记', async () => {
      const messages = [
        { id: 'msg-1', content: '项目开始' },
        { id: 'msg-2', role: 'technical', content: '技术方案确定' },
        { id: 'msg-3', role: 'testing', content: '测试完成' }
      ];

      const marker = await generator.generateSummaryMarker(messages, 'project-1');

      expect(marker).toBeDefined();
      expect(marker.title).toBe('项目总结');
      expect(marker.type).toBe('milestone');
      expect(marker.summary).toBeDefined();
    });

    test('应该生成阶段标记', async () => {
      const messages = [
        { id: 'msg-1', content: '讨论中' },
        { id: 'msg-2', role: 'technical', content: '技术方案' }
      ];

      const marker = await generator.generatePhaseMarker('discussing', messages, 'project-1');

      expect(marker).toBeDefined();
      expect(marker.title).toContain('阶段');
      expect(marker.type).toBe('milestone');
    });
  });
});
