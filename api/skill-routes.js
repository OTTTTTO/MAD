/**
 * MAD v3.0 - 智能 Skill API 路由
 * 提供自然语言接口创建项目组
 */

const express = require('express');
const SmartAnalyzer = require('../core/smart-analyzer.js');
const ProjectManager = require('../core/project-manager.js');
const ExpertManager = require('../core/expert-manager.js');
const MarkerDetector = require('../core/marker-detector.js');
const MarkerGenerator = require('../core/marker-generator.js');

function createSkillRoutes(orchestrator) {
  const router = express.Router();
  const smartAnalyzer = new SmartAnalyzer();
  const projectManager = new ProjectManager();
  const expertManager = new ExpertManager();
  const markerDetector = new MarkerDetector();
  const markerGenerator = new MarkerGenerator(markerDetector);

  // 初始化
  Promise.all([
    projectManager.init(),
    expertManager.init()
  ]).catch(console.error);

  /**
   * 核心接口：自然语言创建项目
   * POST /api/skills/create
   */
  router.post('/create', async (req, res) => {
    try {
      const { userInput, mode = 'auto' } = req.body;

      if (!userInput) {
        return res.status(400).json({
          error: '缺少 userInput 参数'
        });
      }

      console.log(`\n[API] 用户输入: ${userInput}`);

      // 1. 分析用户输入
      const analysis = await smartAnalyzer.analyzeUserInput(userInput);

      console.log(`[API] 分析结果:`, {
        domains: analysis.domains,
        experts: analysis.recommendedExperts,
        category: analysis.category
      });

      // 2. 检查是否有相关项目组
      const existingProjects = await projectManager.listProjects({
        category: analysis.category
      });

      let project;

      if (existingProjects.length > 0 && mode === 'auto') {
        // 使用现有项目组
        project = existingProjects[0];
        console.log(`[API] 使用现有项目组: ${project.id}`);
      } else {
        // 创建新项目组
        project = await projectManager.createProject(
          analysis.suggestedName,
          analysis.category,
          {
            description: userInput,
            participants: []
          }
        );
        console.log(`[API] 创建新项目组: ${project.id}`);
      }

      // 3. 选取或创建专家
      const experts = await expertManager.selectExperts(analysis.recommendedExperts);

      console.log(`[API] 选取专家:`, experts.map(e => e.id));

      // 4. 添加专家到项目组
      project.participants = experts.map(expert => ({
        id: expert.id,
        name: expert.name,
        role: expert.role,
        emoji: expert.emoji
      }));

      await projectManager.saveProject(project);

      // 5. 返回结果
      res.json({
        success: true,
        projectId: project.id,
        projectName: project.name,
        category: project.category,
        experts: experts.map(e => ({
          id: e.id,
          name: e.name,
          role: e.role
        })),
        message: `已创建项目组"${project.name}"并准备开始讨论`
      });

    } catch (error) {
      console.error('[API] 创建项目失败:', error);
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * 获取所有项目组
   * GET /api/skills/projects
   */
  router.get('/projects', async (req, res) => {
    try {
      const projects = await projectManager.listProjects();
      const grouped = await projectManager.getProjectsByCategory();

      res.json({
        success: true,
        total: projects.length,
        projects: grouped
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * 获取项目组详情
   * GET /api/skills/projects/:id
   */
  router.get('/projects/:id', async (req, res) => {
    try {
      const project = await projectManager.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: '项目组不存在'
        });
      }

      res.json({
        success: true,
        project
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * 获取项目组的消息流
   * GET /api/skills/projects/:id/messages
   */
  router.get('/projects/:id/messages', async (req, res) => {
    try {
      const project = await projectManager.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: '项目组不存在'
        });
      }

      res.json({
        success: true,
        messages: project.messages,
        total: project.messages.length
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * v3.3.0: 获取项目的标记建议
   * GET /api/skills/projects/:id/marker-suggestions
   */
  router.get('/projects/:id/marker-suggestions', async (req, res) => {
    try {
      const project = await projectManager.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: '项目组不存在'
        });
      }

      const suggestions = await markerDetector.analyzeDiscussion(project.messages);

      res.json({
        success: true,
        suggestions
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * v3.3.0: 检测并添加标记
   * POST /api/skills/projects/:id/detect-markers
   */
  router.post('/projects/:id/detect-markers', async (req, res) => {
    try {
      const { minConfidence = 0.7, maxMarkers = 5 } = req.body;

      const project = await projectManager.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: '项目组不存在'
        });
      }

      const suggestions = await markerDetector.analyzeDiscussion(project.messages);
      const filteredSuggestions = suggestions
        .filter(s => s.confidence >= minConfidence)
        .slice(0, maxMarkers);

      const addedMarkers = [];

      for (const suggestion of filteredSuggestions) {
        const message = project.messages.find(m => m.id === suggestion.messageId);

        if (message) {
          const marker = await markerGenerator.generateMarker(message, suggestion, project.id);
          project.addMarker(marker);
          addedMarkers.push(marker);
        }
      }

      await projectManager.saveProject(project);

      res.json({
        success: true,
        addedMarkers,
        total: addedMarkers.length
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * v3.3.0: 优化项目标记
   * POST /api/skills/projects/:id/optimize-markers
   */
  router.post('/projects/:id/optimize-markers', async (req, res) => {
    try {
      const project = await projectManager.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: '项目组不存在'
        });
      }

      // 检测当前阶段
      const phase = await markerDetector.detectDiscussionPhase(project.messages);

      // 生成阶段标记
      const phaseMarker = await markerGenerator.generatePhaseMarker(phase, project.messages, project.id);
      project.addMarker(phaseMarker);

      // 检测并添加内容标记
      const contentMarkers = await markerGenerator.detectAndAddMarkers(
        project.id,
        orchestrator.v3?.flowManager,
        projectManager,
        { minConfidence: 0.7, maxMarkers: 3 }
      );

      await projectManager.saveProject(project);

      res.json({
        success: true,
        phase,
        phaseMarker,
        contentMarkers
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * v3.3.0: 生成项目总结
   * GET /api/skills/projects/:id/summary
   */
  router.get('/projects/:id/summary', async (req, res) => {
    try {
      const project = await projectManager.getProject(req.params.id);

      if (!project) {
        return res.status(404).json({
          error: '项目组不存在'
        });
      }

      const summary = await markerDetector.generateSmartSummary(project.messages);

      res.json({
        success: true,
        summary
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
}

module.exports = createSkillRoutes;
