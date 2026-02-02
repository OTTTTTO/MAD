/**
 * CSV 导出器
 * 
 * 导出消息列表为 CSV 格式，便于数据分析
 * 
 * @module exporters/csv
 * @version 1.0.0
 */

/**
 * 导出讨论为 CSV
 */
async function exportToCSV(discussion, options = {}) {
  const {
    includeMetadata = true,
    delimiter = ','
  } = options;

  // 生成 CSV
  const csv = generateCSV(discussion, { includeMetadata, delimiter });

  return {
    data: Buffer.from(csv, 'utf-8'),
    size: Buffer.byteLength(csv, 'utf-8'),
    type: 'text/csv'
  };
}

/**
 * 生成 CSV 内容
 */
function generateCSV(discussion, options) {
  const { includeMetadata, delimiter } = options;
  const lines = [];

  // 元数据
  if (includeMetadata) {
    lines.push('# Discussion Export');
    lines.push(`# ID: ${discussion.id || 'N/A'}`);
    lines.push(`# Topic: ${escapeCSV(discussion.topic || '')}`);
    lines.push(`# Status: ${discussion.status || 'unknown'}`);
    lines.push(`# Created: ${discussion.createdAt || ''}`);
    lines.push(`# Ended: ${discussion.endedAt || ''}`);
    lines.push('');
  }

  // 表头
  lines.push(['Index', 'Role', 'Emoji', 'Content', 'Timestamp', 'Round'].join(delimiter));

  // 消息数据
  if (discussion.messages && discussion.messages.length > 0) {
    discussion.messages.forEach((msg, index) => {
      const row = [
        index + 1,
        escapeCSV(msg.role || ''),
        escapeCSV(msg.emoji || ''),
        escapeCSV(msg.content || ''),
        msg.timestamp || '',
        msg.round || 0
      ];
      lines.push(row.join(delimiter));
    });
  }

  return lines.join('\n');
}

/**
 * 转义 CSV 字段
 */
function escapeCSV(field) {
  if (!field) return '';
  
  const str = String(field);
  
  // 如果包含分隔符、引号或换行符，需要用引号包裹
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

module.exports = {
  exportToCSV
};
