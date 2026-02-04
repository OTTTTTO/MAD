/**
 * 用户交互处理器 - 向用户提问并获取补充信息
 *
 * 功能：
 * 1. 识别缺失的关键信息
 * 2. 生成补充问题
 * 3. 处理用户回答
 *
 * @version 4.0.3
 */

class UserInteractionHandler {
  constructor(config = {}) {
    this.config = {
      // 关键信息：缺失时必须提问
      critical: config.critical || {
        fields: ['目标用户', '核心需求', '使用场景'],
        threshold: 1
      },
      // 可选信息：缺失超过阈值时提问
      optional: config.optional || {
        fields: ['预算', '时间', '技术偏好'],
        threshold: 2
      }
    };
  }

  /**
   * 分析缺失的信息
   * @param {Object} topic - 话题对象
   * @returns {Object} 分析结果
   */
  analyzeMissingInfo(topic) {
    // 检查关键信息
    const missingCritical = this.config.critical.fields.filter(
      field => !this.hasField(topic, field)
    );

    if (missingCritical.length >= this.config.critical.threshold) {
      return {
        needAsk: true,
        priority: 'high',
        questions: missingCritical,
        reason: '缺失关键信息'
      };
    }

    // 检查可选信息
    const missingOptional = this.config.optional.fields.filter(
      field => !this.hasField(topic, field)
    );

    if (missingOptional.length >= this.config.optional.threshold) {
      return {
        needAsk: true,
        priority: 'low',
        questions: missingOptional.slice(0, 3),
        reason: '缺失可选信息'
      };
    }

    return { needAsk: false };
  }

  /**
   * 检查话题是否包含某个字段
   * @param {Object} topic - 话题对象
   * @param {string} field - 字段名
   * @returns {boolean} 是否包含
   */
  hasField(topic, field) {
    const content = (topic.content || topic.description || '').toLowerCase();
    const keywords = this.getFieldKeywords(field);

    for (const keyword of keywords) {
      if (content.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // 也检查topic对象的属性
    if (topic[field] !== undefined && topic[field] !== null) {
      return true;
    }

    return false;
  }

  /**
   * 获取字段对应的关键词
   * @param {string} field - 字段名
   * @returns {Array} 关键词列表
   */
  getFieldKeywords(field) {
    const keywordMap = {
      '目标用户': ['用户', '目标群体', '受众', '客户'],
      '核心需求': ['需求', '需要', '想要', '期望'],
      '使用场景': ['场景', '情况', '环境', '场合'],
      '预算': ['预算', '资金', '成本', '多少钱'],
      '时间': ['时间', '期限', '多久', '排期'],
      '技术偏好': ['技术', '技术栈', '语言', '框架']
    };

    return keywordMap[field] || [field];
  }

  /**
   * 生成问题
   * @param {Array} fields - 字段列表
   * @returns {Array} 问题对象列表
   */
  generateQuestions(fields) {
    const questionTemplates = {
      '目标用户': {
        text: '请描述您的目标用户群体',
        type: 'text',
        placeholder: '例如：25-35岁的城市白领',
        required: true
      },
      '核心需求': {
        text: '请描述用户的核心需求是什么',
        type: 'textarea',
        placeholder: '详细描述用户需要解决什么问题',
        required: true
      },
      '使用场景': {
        text: '产品将在什么场景下使用',
        type: 'textarea',
        placeholder: '描述典型的使用场景',
        required: false
      },
      '预算': {
        text: '预期的预算范围是',
        type: 'select',
        options: ['<1万', '1-5万', '5-10万', '>10万'],
        required: false
      },
      '时间': {
        text: '预期的完成时间',
        type: 'select',
        options: ['1个月内', '1-3个月', '3-6个月'],
        required: false
      },
      '技术偏好': {
        text: '有技术栈偏好吗',
        type: 'text',
        placeholder: '例如：React, Node.js, Python等',
        required: false
      }
    };

    return fields.map(field => ({
      id: field,
      ...questionTemplates[field] || {
        text: `请补充${field}信息`,
        type: 'text',
        required: false
      }
    }));
  }

  /**
   * 检查信息是否充分
   * @param {Object} topic - 话题对象
   * @param {Object} answers - 用户回答
   * @returns {boolean} 信息是否充分
   */
  isInfoSufficient(topic, answers) {
    // 检查关键信息是否都已回答
    const criticalAnswered = this.config.critical.fields.every(
      field => answers[field] || this.hasField(topic, field)
    );

    return criticalAnswered;
  }

  /**
   * 处理用户回答
   * @param {Object} answers - 用户回答
   * @returns {Object} 处理后的补充信息
   */
  processAnswers(answers) {
    const processed = {};

    for (const [questionId, answer] of Object.entries(answers)) {
      if (answer && answer.trim() !== '') {
        processed[questionId] = answer;
      }
    }

    return processed;
  }
}

module.exports = UserInteractionHandler;
