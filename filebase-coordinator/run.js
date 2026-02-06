#!/usr/bin/env node

/**
 * MAD FileBase Coordinator - 独立运行脚本
 *
 * 这个脚本可以直接运行，但需要手动配置LLM API
 * 推荐通过OpenClaw skill调用，可以使用tool.llm
 */

const path = require('path');
const { main } = require('./index.js');

// 模拟tool对象（仅用于独立运行）
class MockTool {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  }

  async llm(params) {
    if (!this.apiKey) {
      throw new Error('需要设置OPENAI_API_KEY环境变量');
    }

    // 这里需要实际的LLM调用逻辑
    // 暂时返回模拟响应
    return {
      content: `[模拟响应] 这是测试消息。实际使用时需要配置OpenAI API或通过OpenClaw skill调用。`
    };
  }
}

// 独立运行模式
if (require.main === module) {
  const tool = new MockTool();

  main(tool).then(result => {
    console.log('\n最终结果:', result);
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('\n执行失败:', error);
    process.exit(1);
  });
}

module.exports = { MockTool };
