/**
 * Reply Manager - 回复功能
 * 
 * 功能：
 * 1. 管理消息回复
 * 2. 构建回复链
 * 3. 可视化回复树
 * 4. 回复通知
 */

/**
 * 创建回复消息
 * @param {string} messageId - 被回复的消息 ID
 * @param {string} content - 回复内容
 * @param {string} agentId - 回复的 Agent ID
 * @param {Array} messages - 消息列表
 * @returns {Object} 回复消息对象
 */
function createReply(messageId, content, agentId, messages) {
  const originalMessage = messages.find(m => m.id === messageId);
  if (!originalMessage) {
    throw new Error(`Message ${messageId} not found`);
  }

  return {
    replyTo: {
      messageId: originalMessage.id,
      agentId: originalMessage.role,
      agentName: originalMessage.role,
      content: originalMessage.content,
      timestamp: originalMessage.timestamp
    },
    content,
    agentId
  };
}

/**
 * 获取消息的所有回复
 * @param {string} messageId - 消息 ID
 * @param {Array} messages - 消息列表
 * @returns {Array} 回复列表
 */
function getReplies(messageId, messages) {
  return messages.filter(m =>
    m.replyTo && m.replyTo.messageId === messageId
  );
}

/**
 * 获取回复树
 * @param {string} rootMessageId - 根消息 ID
 * @param {Array} messages - 消息列表
 * @param {number} maxDepth - 最大深度
 * @returns {Object} 回复树
 */
function getReplyTree(rootMessageId, messages, maxDepth = 3) {
  const tree = {
    message: messages.find(m => m.id === rootMessageId),
    replies: []
  };

  if (maxDepth <= 0) {
    return tree;
  }

  const directReplies = getReplies(rootMessageId, messages);

  tree.replies = directReplies.map(reply => ({
    message: reply,
    replies: getReplyTree(reply.id, messages, maxDepth - 1).replies
  }));

  return tree;
}

/**
 * 获取回复链（从回复追溯到原始消息）
 * @param {string} replyMessageId - 回复消息 ID
 * @param {Array} messages - 消息列表
 * @returns {Array} 回复链
 */
function getReplyChain(replyMessageId, messages) {
  const chain = [];
  let currentMessage = messages.find(m => m.id === replyMessageId);

  while (currentMessage && currentMessage.replyTo) {
    chain.unshift(currentMessage.replyTo);
    const originalMessage = messages.find(m => m.id === currentMessage.replyTo.messageId);
    if (!originalMessage) break;
    currentMessage = originalMessage;
  }

  return chain;
}

/**
 * 统计消息的回复数
 * @param {string} messageId - 消息 ID
 * @param {Array} messages - 消息列表
 * @returns {number} 回复数
 */
function countReplies(messageId, messages) {
  const directReplies = getReplies(messageId, messages);
  let count = directReplies.length;

  directReplies.forEach(reply => {
    count += countReplies(reply.id, messages);
  });

  return count;
}

/**
 * 检查消息是否有回复
 * @param {string} messageId - 消息 ID
 * @param {Array} messages - 消息列表
 * @returns {boolean} 是否有回复
 */
function hasReplies(messageId, messages) {
  return messages.some(m =>
    m.replyTo && m.replyTo.messageId === messageId
  );
}

/**
 * 格式化回复引用
 * @param {Object} replyTo - 回复对象
 * @returns {string} 格式化的引用文本
 */
function formatReplyQuote(replyTo) {
  const maxLength = 100;
  let content = replyTo.content;

  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
  }

  return `> ${content}`;
}

/**
 * 搜索包含特定内容的消息
 * @param {Array} messages - 消息列表
 * @param {string} query - 搜索关键词
 * @param {string} type - 搜索类型 (all|mention|reply|quote)
 * @returns {Array} 匹配的消息列表
 */
function searchMessages(messages, query, type = 'all') {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  return messages.filter(message => {
    const contentMatch = message.content.toLowerCase().includes(lowerQuery);

    switch (type) {
      case 'mention':
        return contentMatch && message.mentions && message.mentions.length > 0;
      case 'reply':
        return contentMatch && message.replyTo;
      case 'quote':
        return contentMatch && message.quotes && message.quotes.length > 0;
      default:
        return contentMatch;
    }
  });
}

module.exports = {
  createReply,
  getReplies,
  getReplyTree,
  getReplyChain,
  countReplies,
  hasReplies,
  formatReplyQuote,
  searchMessages
};
