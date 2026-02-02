/**
 * 批量导出器
 * 
 * 支持批量导出多个讨论
 * 支持多种格式组合
 * 支持自定义导出选项
 * 
 * @module exporters/batch
 * @version 2.6.0
 */

const { exportToPDF } = require('./pdf');
const { exportToHTML } = require('./html');
const { exportToCSV } = require('./csv');
const { exportToMarkdown } = require('./markdown');
const { exportToJSON } = require('./json');
const fs = require('fs').promises;
const path = require('path');

/**
 * 批量导出讨论
 * @param {Array} discussionIds - 讨论 ID 数组
 * @param {object} options - 导出选项
 * @returns {object} 导出结果
 */
async function batchExport(discussionIds, options = {}) {
  const {
    format = 'json', // 'json' | 'markdown' | 'pdf' | 'html' | 'csv' | 'all'
    outputDir = './exports',
    includeMetadata = true,
    includeStats = true,
    compress = false, // 是否压缩为 ZIP
    orchestrator
  } = options;

  if (!orchestrator) {
    throw new Error('Orchestrator instance is required');
  }

  // 确保输出目录存在
  await fs.mkdir(outputDir, { recursive: true });

  const results = {
    total: discussionIds.length,
    successful: 0,
    failed: 0,
    files: [],
    errors: []
  };

  // 导出格式列表
  const formats = format === 'all' 
    ? ['json', 'markdown', 'html'] 
    : [format];

  // 为每个讨论导出
  for (const discussionId of discussionIds) {
    const discussion = orchestrator.discussions.get(discussionId);
    
    if (!discussion) {
      results.failed++;
      results.errors.push({
        discussionId,
        error: 'Discussion not found'
      });
      continue;
    }

    // 为每个格式导出
    for (const fmt of formats) {
      try {
        const result = await exportDiscussion(discussion, fmt, {
          outputDir,
          includeMetadata,
          includeStats
        });

        results.successful++;
        results.files.push(result);

      } catch (error) {
        results.failed++;
        results.errors.push({
          discussionId,
          format: fmt,
          error: error.message
        });
      }
    }
  }

  // 压缩（如果需要）
  let archivePath = null;
  if (compress && results.files.length > 0) {
    archivePath = await createArchive(results.files, outputDir);
  }

  return {
    ...results,
    archivePath,
    summary: generateSummary(results)
  };
}

/**
 * 导出单个讨论
 */
async function exportDiscussion(discussion, format, options) {
  const { outputDir } = options;
  const baseName = sanitizeFilename(discussion.topic || discussion.id);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${baseName}_${timestamp}.${format}`;
  const filePath = path.join(outputDir, fileName);

  let result;
  switch (format) {
    case 'pdf':
      result = await exportToPDF(discussion, { ...options, outputPath: filePath });
      break;
    case 'html':
      result = await exportToHTML(discussion, { ...options, outputPath: filePath });
      break;
    case 'csv':
      result = await exportToCSV(discussion, { ...options, outputPath: filePath });
      break;
    case 'markdown':
      result = await exportToMarkdown(discussion, { ...options, outputPath: filePath });
      break;
    case 'json':
      result = await exportToJSON(discussion, { ...options, outputPath: filePath });
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return {
    discussionId: discussion.id,
    topic: discussion.topic,
    format,
    path: result.path || filePath,
    size: result.size
  };
}

/**
 * 导出所有讨论
 */
async function exportAll(orchestrator, options = {}) {
  const {
    status = null, // 'active' | 'ended' | 'archived' | null (all)
    timeRange = null, // '7d' | '30d' | '90d' | null (all)
    ...batchOptions
  } = options;

  // 获取讨论列表
  let discussions = Array.from(orchestrator.discussions.values());

  // 按状态过滤
  if (status) {
    discussions = discussions.filter(d => d.status === status);
  }

  // 按时间范围过滤
  if (timeRange) {
    const now = Date.now();
    const rangeMs = parseTimeRange(timeRange);
    discussions = discussions.filter(d => 
      (now - d.createdAt) <= rangeMs
    );
  }

  const discussionIds = discussions.map(d => d.id);

  return await batchExport(discussionIds, {
    ...batchOptions,
    orchestrator
  });
}

/**
 * 导出为摘要报告
 */
async function exportSummaryReport(discussionIds, options = {}) {
  const {
    outputPath = './exports/summary.md',
    orchestrator
  } = options;

  if (!orchestrator) {
    throw new Error('Orchestrator instance is required');
  }

  let markdown = `# 讨论摘要报告\n\n`;
  markdown += `生成时间: ${new Date().toLocaleString()}\n`;
  markdown += `讨论数量: ${discussionIds.length}\n\n`;

  markdown += `## 📊 总体统计\n\n`;

  let totalMessages = 0;
  let totalParticipants = 0;
  const agentStats = {};

  for (const discussionId of discussionIds) {
    const discussion = orchestrator.discussions.get(discussionId);
    if (!discussion) continue;

    totalMessages += discussion.messages?.length || 0;
    totalParticipants += discussion.participants?.length || 0;

    discussion.participants?.forEach(p => {
      if (!agentStats[p.role]) {
        agentStats[p.role] = 0;
      }
      agentStats[p.role]++;
    });
  }

  markdown += `- **总消息数**: ${totalMessages}\n`;
  markdown += `- **总参与人次**: ${totalParticipants}\n`;
  markdown += `- **平均每讨论消息数**: ${Math.round(totalMessages / discussionIds.length)}\n\n`;

  markdown += `## 👥 Agent 参与统计\n\n`;
  Object.entries(agentStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([agent, count]) => {
      markdown += `- **${agent}**: ${count} 次\n`;
    });

  markdown += `\n## 📋 讨论列表\n\n`;

  for (const discussionId of discussionIds) {
    const discussion = orchestrator.discussions.get(discussionId);
    if (!discussion) continue;

    markdown += `### ${discussion.topic || 'Untitled'}\n`;
    markdown += `- **ID**: ${discussion.id}\n`;
    markdown += `- **状态**: ${discussion.status}\n`;
    markdown += `- **创建时间**: ${new Date(discussion.createdAt).toLocaleString()}\n`;
    markdown += `- **消息数**: ${discussion.messages?.length || 0}\n`;
    markdown += `- **参与者**: ${(discussion.participants || []).map(p => p.role).join(', ')}\n\n`;
  }

  // 保存文件
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, markdown, 'utf8');

  return {
    path: outputPath,
    size: markdown.length,
    discussionCount: discussionIds.length
  };
}

/**
 * 创建压缩包
 */
async function createArchive(files, outputDir) {
  // 简单实现：创建一个包含所有文件信息的 JSON
  const archivePath = path.join(outputDir, `archive_${Date.now()}.json`);
  const archiveData = {
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0),
    files: files
  };

  await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));
  
  return archivePath;
}

/**
 * 生成摘要
 */
function generateSummary(results) {
  return {
    successRate: results.total > 0 
      ? Math.round((results.successful / results.total) * 100) 
      : 0,
    totalSize: results.files.reduce((sum, f) => sum + f.size, 0),
    hasErrors: results.errors.length > 0,
    errorCount: results.errors.length
  };
}

/**
 * 清理文件名
 */
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

/**
 * 解析时间范围
 */
function parseTimeRange(range) {
  const match = range.match(/^(\d+)([dhm])$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
    }
  }
  return Infinity;
}

/**
 * 导出预设配置
 */
const exportPresets = {
  minimal: {
    format: 'json',
    includeMetadata: false,
    includeStats: false
  },
  standard: {
    format: 'markdown',
    includeMetadata: true,
    includeStats: true
  },
  detailed: {
    format: 'all',
    includeMetadata: true,
    includeStats: true,
    compress: true
  },
  analysis: {
    format: 'json',
    includeMetadata: true,
    includeStats: true
  }
};

module.exports = {
  batchExport,
  exportAll,
  exportSummaryReport,
  exportPresets
};
