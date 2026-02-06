/**
 * MAD FileBased - 专家配置
 * 
 * 用途：定义各个专家的配置和提示词模板
 */

/**
 * 专家配置
 */
const EXPERT_CONFIGS = {
  coordinator: {
    id: 'coordinator',
    name: '主协调员',
    role: 'coordinator',
    description: '负责协调讨论流程，汇总专家意见'
  },
  
  technical: {
    id: 'technical',
    name: '技术专家',
    role: 'expert',
    description: '从技术角度分析问题，提供技术实现建议',
    expertise: ['架构设计', '技术选型', '性能优化', '代码质量', '安全性']
  },
  
  product: {
    id: 'product',
    name: '产品专家',
    role: 'expert',
    description: '从产品视角分析问题，关注用户体验和价值',
    expertise: ['用户需求', '产品设计', '用户体验', '功能规划', '产品策略']
  },
  
  business: {
    id: 'business',
    name: '商业专家',
    role: 'expert',
    description: '从商业角度评估问题，分析市场潜力和盈利模式',
    expertise: ['市场分析', '商业模式', '成本收益', '竞争分析', '战略规划']
  },
  
  operations: {
    id: 'operations',
    name: '运营专家',
    role: 'expert',
    description: '从运营角度分析问题，考虑执行可行性和效率',
    expertise: ['运营策略', '流程优化', '资源管理', '数据分析', '用户增长']
  }
};

/**
 * 构建专家任务提示词
 */
function buildExpertTaskPrompt(expertId, task) {
  const expert = EXPERT_CONFIGS[expertId];
  
  if (!expert) {
    throw new Error(`未知的专家类型: ${expertId}`);
  }
  
  const prompt = `# ${expert.name}

## 角色定义
你是${expert.name}，${expert.description}。

## 专业领域
${expert.expertise.map(e => `- ${e}`).join('\n')}

## 任务
请从你的专业角度分析以下话题：

**话题**: ${task.topic}
**类别**: ${task.category}

## 要求
1. 深入分析话题的核心问题
2. 从你的专业角度提供见解
3. 给出具体、可行的建议
4. 回答应当专业、简洁、有价值
5. 字数控制在200-300字

## 输出格式
请直接输出你的专业分析，不需要其他格式。

---
**重要**: 请直接输出分析内容，以"${expert.name}的专业分析："开头。`;

  return prompt;
}

/**
 * 构建协调员汇总提示词
 */
function buildCoordinatorSummaryPrompt(expertResponses, topic) {
  const responsesText = expertResponses.map((r, i) => 
    `## ${r.expertName || r.expertId}\n${r.response}\n`
  ).join('\n');
  
  const prompt = `# 主协调员

## 任务
请汇总以下专家的观点，形成综合结论。

**讨论话题**: ${topic}

## 专家观点
${responsesText}

## 要求
1. 总结各专家的核心观点
2. 识别共识和分歧
3. 提出综合建议和下一步行动
4. 字数控制在300-400字

## 输出格式
请直接输出总结，不需要其他格式。

---
**重要**: 请直接输出总结，以"综合结论："开头。`;

  return prompt;
}

/**
 * 获取专家列表
 */
function getExpertList() {
  return Object.values(EXPERT_CONFIGS).filter(e => e.role === 'expert');
}

/**
 * 获取专家配置
 */
function getExpertConfig(expertId) {
  return EXPERT_CONFIGS[expertId];
}

module.exports = {
  EXPERT_CONFIGS,
  buildExpertTaskPrompt,
  buildCoordinatorSummaryPrompt,
  getExpertList,
  getExpertConfig
};
