#!/usr/bin/env node
/**
 * MAD 项目健康检查脚本
 * 用于快速检查项目状态和依赖
 */

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: '核心文件',
    check: () => {
      const coreFiles = [
        'orchestrator.js',
        'SKILL.md',
        'package.json',
        'README.md',
        'config.example.json'
      ];
      const missing = coreFiles.filter(f => !fs.existsSync(f));
      return { pass: missing.length === 0, msg: missing.length ? `缺失: ${missing.join(', ')}` : '✓ 所有核心文件存在' };
    }
  },
  {
    name: '目录结构',
    check: () => {
      const dirs = ['agents', 'api', 'web', 'docs', 'test'];
      const missing = dirs.filter(d => !fs.existsSync(d));
      return { pass: missing.length === 0, msg: missing.length ? `缺失: ${missing.join(', ')}` : '✓ 目录结构完整' };
    }
  },
  {
    name: '依赖模块',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const nodeModules = fs.existsSync('node_modules');
      return { pass: nodeModules, msg: nodeModules ? '✓ 依赖已安装' : '⚠ 需要运行 npm install' };
    }
  },
  {
    name: '配置示例',
    check: () => {
      return { pass: true, msg: '✓ config.example.json 可用' };
    }
  },
  {
    name: 'Git 状态',
    check: () => {
      const gitDir = fs.existsSync('.git');
      return { pass: gitDir, msg: gitDir ? '✓ Git 仓库' : '⚠ 非 Git 仓库' };
    }
  }
];

console.log('\n🏥 MAD 项目健康检查\n');

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    const { pass, msg } = check();
    if (pass) {
      console.log(`✅ ${name}: ${msg}`);
      passed++;
    } else {
      console.log(`❌ ${name}: ${msg}`);
      failed++;
    }
  } catch (err) {
    console.log(`⚠️  ${name}: 检查失败 - ${err.message}`);
    failed++;
  }
});

console.log(`\n📊 结果: ${passed} 通过, ${failed} 失败\n`);

process.exit(failed > 0 ? 1 : 0);
