/**
 * 讨论导出工具
 * 支持 Markdown 和 PDF 格式
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// 角色表情映射
const roleEmojis = {
  'coordinator': '🎯',
  'market-research': '📊',
  'requirement-analysis': '🎯',
  'technical-feasibility': '🔧',
  'testing': '🧪',
  'documentation': '📝',
  'default': '💬'
};

// 获取角色表情
function getEmoji(role) {
  return roleEmojis[role] || roleEmojis['default'];
}

// 导出为 Markdown
function exportToMarkdown(discussion, messages, participants, outputPath) {
  const lines = [];

  // 标题
  lines.push(`# ${discussion.topic}\n`);
  lines.push(`**创建时间:** ${new Date(discussion.createdAt).toLocaleString('zh-CN')}\n`);
  if (discussion.endedAt) {
    lines.push(`**结束时间:** ${new Date(discussion.endedAt).toLocaleString('zh-CN')}\n`);
  }
  lines.push(`**消息数量:** ${messages.length}\n`);
  lines.push(`**参与角色:** ${participants.map(p => p.emoji + ' ' + p.role).join(', ')}\n`);
  
  lines.push('\n---\n\n');
  lines.push('## 讨论记录\n\n');

  // 消息列表
  messages.forEach((msg, index) => {
    const participant = participants.find(p => p.id === msg.role);
    const role = participant?.role || msg.role || '未知';
    const emoji = participant?.emoji || getEmoji(role);
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN') : '';

    lines.push(`### ${emoji} ${role} ${time ? `*(${time})*` : ''}\n`);
    lines.push(`${msg.content}\n`);
    
    // 元数据
    if (msg.metadata && Object.keys(msg.metadata).length > 0) {
      const meta = Object.entries(msg.metadata)
        .filter(([k]) => k !== 'similarityScore')
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (meta) {
        lines.push(`\n*${meta}*\n`);
      }
    }
    
    lines.push('\n');
  });

  // 写入文件
  const content = lines.join('');
  fs.writeFileSync(outputPath, content, 'utf8');
  
  return outputPath;
}

// 导出为 PDF
function exportToPDF(discussion, messages, participants, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: discussion.topic,
          Author: 'MAD - Multi-Agent Discussion',
          Subject: '讨论记录'
        }
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // 字体配置
      const fontRegular = 'Helvetica';
      const fontBold = 'Helvetica-Bold';

      // 标题
      doc.fontSize(20).font(fontBold).text(discussion.topic, { align: 'center' });
      doc.moveDown();

      // 元信息
      doc.fontSize(10).font(fontRegular);
      doc.text(`创建时间: ${new Date(discussion.createdAt).toLocaleString('zh-CN')}`);
      if (discussion.endedAt) {
        doc.text(`结束时间: ${new Date(discussion.endedAt).toLocaleString('zh-CN')}`);
      }
      doc.text(`消息数量: ${messages.length}`);
      doc.text(`参与角色: ${participants.map(p => p.role).join(', ')}`);
      doc.moveDown();

      // 分隔线
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      doc.moveDown();

      // 讨论记录
      messages.forEach((msg, index) => {
        const participant = participants.find(p => p.id === msg.role);
        const role = participant?.role || msg.role || '未知';
        const emoji = participant?.emoji || getEmoji(role);
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('zh-CN') : '';

        // 角色和时间
        doc.fontSize(12).font(fontBold);
        doc.text(`${emoji} ${role} ${time ? `(${time})` : ''}`, { continued: false });
        doc.moveDown(0.3);

        // 消息内容
        doc.fontSize(10).font(fontRegular);
        doc.text(msg.content, { align: 'justify' });
        doc.moveDown();
      });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// 导出统计
function exportStats(discussion, messages, participants) {
  const stats = {
    topic: discussion.topic,
    createdAt: discussion.createdAt,
    endedAt: discussion.endedAt,
    messageCount: messages.length,
    participantCount: participants.length,
    duration: discussion.endedAt ? 
      Math.round((discussion.endedAt - discussion.createdAt) / 1000) : 
      null,
    byRole: {}
  };

  // 按角色统计
  messages.forEach(msg => {
    const role = msg.role || 'unknown';
    if (!stats.byRole[role]) {
      stats.byRole[role] = 0;
    }
    stats.byRole[role]++;
  });

  return stats;
}

// 主导出函数
async function exportDiscussion(discussion, messages, participants, options = {}) {
  const {
    format = 'markdown',
    outputDir = 'exports',
    filename = null
  } = options;

  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const safeTopic = (discussion.topic || 'discussion')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  const baseFilename = filename || `${safeTopic}-${timestamp}`;

  let outputPath;
  if (format === 'pdf') {
    outputPath = path.join(outputDir, `${baseFilename}.pdf`);
    await exportToPDF(discussion, messages, participants, outputPath);
  } else {
    outputPath = path.join(outputDir, `${baseFilename}.md`);
    exportToMarkdown(discussion, messages, participants, outputPath);
  }

  return {
    path: outputPath,
    format,
    stats: exportStats(discussion, messages, participants)
  };
}

module.exports = {
  exportDiscussion,
  exportToMarkdown,
  exportToPDF,
  exportStats
};
