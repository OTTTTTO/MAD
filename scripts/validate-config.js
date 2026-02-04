#!/usr/bin/env node
/**
 * 配置文件验证工具
 * 检查 config.json 是否有效
 */

const fs = require('fs');
const path = require('path');

// 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

// 配置架构
const configSchema = {
  // 必需字段
  required: ['agents', 'discussion'],
  
  // agents 配置
  agents: {
    type: 'array',
    minItems: 1,
    itemSchema: {
      required: ['id', 'role', 'prompt', 'systemPrompt']
    }
  },
  
  // discussion 配置
  discussion: {
    type: 'object',
    required: ['maxRounds', 'maxDuration', 'enableConflictDetection'],
    properties: {
      maxRounds: { type: 'number', min: 1 },
      maxDuration: { type: 'number', min: 1000 },
      enableConflictDetection: { type: 'boolean' }
    }
  },
  
  // 可选字段
  optional: ['web', 'logging', 'templates', 'permissions']
};

// 验证函数
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  // 1. 检查必需字段
  configSchema.required.forEach(field => {
    if (!config[field]) {
      errors.push(`缺少必需字段: ${field}`);
    }
  });

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 2. 验证 agents
  if (!Array.isArray(config.agents)) {
    errors.push('agents 必须是数组');
  } else if (config.agents.length < configSchema.agents.minItems) {
    errors.push(`agents 至少需要 ${configSchema.agents.minItems} 个 Agent`);
  } else {
    config.agents.forEach((agent, index) => {
      configSchema.agents.itemSchema.required.forEach(field => {
        if (!agent[field]) {
          errors.push(`Agent[${index}] 缺少必需字段: ${field}`);
        }
      });

      // 检查角色唯一性
      if (!agent.role) {
        errors.push(`Agent[${index}] 缺少 role`);
      }
    });

    // 检查角色重复
    const roles = config.agents.map(a => a.role).filter(Boolean);
    const duplicates = roles.filter((r, i) => roles.indexOf(r) !== i);
    if (duplicates.length > 0) {
      warnings.push(`重复的角色: ${[...new Set(duplicates)].join(', ')}`);
    }
  }

  // 3. 验证 discussion
  if (typeof config.discussion !== 'object' || !config.discussion) {
    errors.push('discussion 必须是对象');
  } else {
    configSchema.discussion.required.forEach(field => {
      if (config.discussion[field] === undefined) {
        errors.push(`discussion 缺少必需字段: ${field}`);
      }
    });

    // 验证数值范围
    if (config.discussion.maxRounds !== undefined) {
      if (typeof config.discussion.maxRounds !== 'number') {
        errors.push('discussion.maxRounds 必须是数字');
      } else if (config.discussion.maxRounds < 1) {
        errors.push('discussion.maxRounds 必须 >= 1');
      } else if (config.discussion.maxRounds > 100) {
        warnings.push('discussion.maxRounds > 100 可能导致讨论过长');
      }
    }

    if (config.discussion.maxDuration !== undefined) {
      if (typeof config.discussion.maxDuration !== 'number') {
        errors.push('discussion.maxDuration 必须是数字');
      } else if (config.discussion.maxDuration < 1000) {
        errors.push('discussion.maxDuration 必须 >= 1000 (1秒)');
      }
    }

    if (config.discussion.enableConflictDetection !== undefined) {
      if (typeof config.discussion.enableConflictDetection !== 'boolean') {
        errors.push('discussion.enableConflictDetection 必须是布尔值');
      }
    }
  }

  // 4. 验证 web 配置（如果存在）
  if (config.web) {
    if (typeof config.web !== 'object') {
      errors.push('web 必须是对象');
    } else {
      if (config.web.port !== undefined) {
        const port = parseInt(config.web.port);
        if (isNaN(port) || port < 1 || port > 65535) {
          errors.push('web.port 必须是 1-65535 之间的数字');
        }
      }
    }
  }

  // 5. 验证 templates（如果存在）
  if (config.templates) {
    if (!Array.isArray(config.templates)) {
      errors.push('templates 必须是数组');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// 显示验证结果
function showResult(result, configPath) {
  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.cyan, `🔍 配置验证: ${configPath}\n`);

  if (result.valid) {
    log(colors.bright + colors.green, '✅ 配置有效！\n');
  } else {
    log(colors.bright + colors.red, '❌ 配置无效！\n');
  }

  if (result.errors.length > 0) {
    log(colors.bright + colors.red, '错误:\n');
    result.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
    console.log();
  }

  if (result.warnings.length > 0) {
    log(colors.bright + colors.yellow, '警告:\n');
    result.warnings.forEach((warn, i) => {
      console.log(`  ${i + 1}. ${warn}`);
    });
    console.log();
  }

  // 统计信息
  if (result.valid) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`📊 配置统计:`);
    console.log(`   Agents: ${config.agents?.length || 0}`);
    console.log(`   模板: ${config.templates?.length || 0}`);
    console.log(`   最大轮数: ${config.discussion?.maxRounds || 'N/A'}`);
    console.log(`   Web 端口: ${config.web?.port || '未配置'}`);
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('\n🔍 MAD 配置验证工具\n');
    console.log('用法: node scripts/validate-config.js [选项]\n');
    console.log('选项:');
    console.log('  --file <路径>     指定配置文件路径');
    console.log('  --help, -h        显示帮助信息\n');
    console.log('默认检查路径: config.json\n');
    process.exit(0);
  }

  let configPath = 'config.json';

  const fileIndex = args.indexOf('--file');
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    configPath = args[fileIndex + 1];
  }

  // 检查文件存在
  if (!fs.existsSync(configPath)) {
    log(colors.yellow, `\n⚠️  未找到配置文件: ${configPath}`);
    console.log('\n提示: 可以从 config.example.json 复制：');
    console.log(`  cp config.example.json ${configPath}\n`);
    process.exit(1);
  }

  // 读取配置
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (err) {
    log(colors.red, `\n❌ 无法解析配置文件: ${err.message}\n`);
    process.exit(1);
  }

  // 验证
  const result = validateConfig(config);
  showResult(result, configPath);

  process.exit(result.valid ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ 错误:', err.message);
    process.exit(1);
  });
}

module.exports = { validateConfig };
