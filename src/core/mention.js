/**
 * Mention Manager - @提及功能
 * 
 * 功能：
 * 1. 解析消息中的 @提及
 * 2. 验证 @提及
 * 3. 高亮显示 @提及
 * 4. 管理 @提及通知
 */

/**
 * 解析消息中的 @提及
 * @param {string} content - 消息内容
 * @returns {Array} 提及列表
 */
function parseMentions(content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      text: match[0],        // @agentName
      agentName: match[1],   // agentName
      index: match.index,    // 在内容中的位置
    });
  }

  return mentions;
}

/**
 * 验证 @提及
 * @param {Array} mentions - 提及列表
 * @param {Array} availableAgents - 可用的 Agent 列表
 * @returns {Array} 验证后的提及列表
 */
function validateMentions(mentions, availableAgents) {
  return mentions.map(mention => {
    const agent = availableAgents.find(a =>
      a.name.toLowerCase() === mention.agentName.toLowerCase()
    );

    return {
      ...mention,
      valid: !!agent,
      agentId: agent ? agent.id : null,
      agentName: agent ? agent.name : mention.agentName
    };
  });
}

/**
 * 高亮显示 @提及
 * @param {string} content - 消息内容
 * @param {Array} mentions - 提及列表
 * @returns {string} 高亮后的 HTML
 */
function highlightMentions(content, mentions) {
  let highlightedContent = content;
  const validMentions = mentions.filter(m => m.valid);

  // 从后往前替换，避免位置偏移
  validMentions
    .sort((a, b) => b.index - a.index)
    .forEach(mention => {
      const before = highlightedContent.substring(0, mention.index);
      const after = highlightedContent.substring(mention.index + mention.text.length);
      const mentionHtml = `<span class="mention" data-agent-id="${mention.agentId}">@${mention.agentName}</span>`;
      highlightedContent = before + mentionHtml + after;
    });

  return highlightedContent;
}

/**
 * 提取被提及的 Agent ID 列表
 * @param {Array} mentions - 提及列表
 * @returns {Array} Agent ID 列表
 */
function extractMentionedAgentIds(mentions) {
  return mentions
    .filter(m => m.valid)
    .map(m => m.agentId);
}

/**
 * 检查 Agent 是否被提及
 * @param {string} agentId - Agent ID
 * @param {Array} mentions - 提及列表
 * @returns {boolean} 是否被提及
 */
function isAgentMentioned(agentId, mentions) {
  return mentions.some(m => m.valid && m.agentId === agentId);
}

module.exports = {
  parseMentions,
  validateMentions,
  highlightMentions,
  extractMentionedAgentIds,
  isAgentMentioned
};
