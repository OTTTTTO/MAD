#!/usr/bin/env node

/**
 * MAD 安装脚本
 * 提供交互式安装、配置验证和依赖管理
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

function printHeader(title) {
  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.cyan, title);
  console.log('═'.repeat(60) + '\n');
}

// 步骤 1: 检查环境
function checkEnvironment() {
  printHeader('📋 步骤 1/5: 检查环境');

  const checks = [];

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  const nodeOk = majorVersion >= 18;

  checks.push({
    name: 'Node.js 版本',
    value: nodeVersion,
    status: nodeOk ? '✅' : '❌',
    ok: nodeOk,
    fix: nodeOk ? null : '请升级到 Node.js 18 或更高版本'
  });

  // 检查 npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    checks.push({
      name: 'npm',
      value: npmVersion,
      status: '✅',
      ok: true
    });
  } catch {
    checks.push({
      name: 'npm',
      value: '未安装',
      status: '❌',
      ok: true,
      fix: '请安装 npm'
    });
  }

  // 检查 Git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    checks.push({
      name: 'Git',
      value: gitVersion,
      status: '✅',
      ok: true
    });
  } catch {
    checks.push({
      name: 'Git',
      value: '未安装',
      status: '⚠️ ',
      ok: true,
      fix: '可选：安装 Git 以使用版本控制'
    });
  }

  // 显示检查结果
  let allOk = true;
  checks.forEach(check => {
    const statusColor = check.ok ? colors.green : colors.red;
    log(statusColor, `${check.status} ${check.name}: ${check.value}`);
    if (check.fix) {
      log(colors.yellow, `   ${check.fix}`);
    }
    if (!check.ok) allOk = false;
  });

  console.log();

  if (!allOk) {
    log(colors.red, '❌ 环境检查失败，请解决上述问题后重试\n');
    process.exit(1);
  }

  log(colors.green, '✅ 环境检查通过！\n');
  return true;
}

// 步骤 2: 安装依赖
function installDependencies() {
  printHeader('📦 步骤 2/5: 安装依赖');

  try {
    log(colors.cyan, '正在安装 npm 依赖...\n');
    execSync('npm install', { stdio: 'inherit' });
    log(colors.green, '\n✅ 依赖安装完成！\n');
    return true;
  } catch (err) {
    log(colors.red, `\n❌ 依赖安装失败: ${err.message}\n`);
    process.exit(1);
  }
}

// 步骤 3: 创建必要目录
function createDirectories() {
  printHeader('📁 步骤 3/5: 创建目录结构');

  const dirs = [
    'data/discussions',
    'data/templates',
    'data/cache',
    'data/favorites',
    'data/tags',
    'logs'
  ];

  let created = 0;

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(colors.green, `✅ 创建目录: ${dir}`);
      created++;
    } else {
      log(colors.cyan, `✓ 目录已存在: ${dir}`);
    }
  });

  console.log();
  log(colors.green, `✅ 目录结构完成！（创建了 ${created} 个新目录）\n`);
  return true;
}

// 步骤 4: 初始化配置
function initializeConfig() {
  printHeader('⚙️  步骤 4/5: 初始化配置');

  const configFile = 'mad.config.js';
  const exampleFile = 'mad.config.example.js';

  // 检查是否已有配置文件
  if (fs.existsSync(configFile)) {
    log(colors.yellow, `⚠️  配置文件已存在: ${configFile}`);
    log(colors.cyan, '如需重新配置，请删除现有配置文件后重试\n');
    return true;
  }

  // 检查示例文件
  if (!fs.existsSync(exampleFile)) {
    log(colors.yellow, `⚠️  示例配置文件不存在: ${exampleFile}`);
    log(colors.cyan, '将创建默认配置...\n');

    // 创建默认配置
    const defaultConfig = `module.exports = {
  server: {
    port: 18790,
    host: '0.0.0.0'
  },
  discussion: {
    maxRounds: 10,
    maxDuration: 300000
  }
};`;
    fs.writeFileSync(configFile, defaultConfig);
  } else {
    // 复制示例配置
    fs.copyFileSync(exampleFile, configFile);
    log(colors.green, `✅ 已创建配置文件: ${configFile}`);
    log(colors.cyan, `   (从 ${exampleFile} 复制)`);
  }

  console.log();
  log(colors.green, '✅ 配置初始化完成！\n');
  log(colors.cyan, '💡 提示: 你可以编辑 mad.config.js 自定义配置\n');
  return true;
}

// 步骤 5: 验证安装
function verifyInstallation() {
  printHeader('🔍 步骤 5/5: 验证安装');

  const checks = [];

  // 检查核心文件
  const coreFiles = [
    'orchestrator.js',
    'package.json',
    'src/lib/logger.js',
    'src/lib/errors.js',
    'src/lib/config.js'
  ];

  coreFiles.forEach(file => {
    const exists = fs.existsSync(file);
    checks.push({
      name: file,
      status: exists ? '✅' : '❌',
      ok: exists
    });
  });

  // 检查依赖
  try {
    require('ws');
    checks.push({ name: 'ws (依赖)', status: '✅', ok: true });
  } catch {
    checks.push({ name: 'ws (依赖)', status: '❌', ok: false });
  }

  try {
    require('pdfkit');
    checks.push({ name: 'pdfkit (依赖)', status: '✅', ok: true });
  } catch {
    checks.push({ name: 'pdfkit (依赖)', status: '❌', ok: false });
  }

  // 显示结果
  let allOk = true;
  checks.forEach(check => {
    const statusColor = check.ok ? colors.green : colors.red;
    log(statusColor, `${check.status} ${check.name}`);
    if (!check.ok) allOk = false;
  });

  console.log();

  if (!allOk) {
    log(colors.red, '❌ 安装验证失败！\n');
    process.exit(1);
  }

  log(colors.green, '✅ 安装验证通过！\n');
  return true;
}

// 显示后续步骤
function showNextSteps() {
  printHeader('🎉 安装完成！');

  console.log('你现在可以:\n');
  console.log('1️⃣  启动 MAD 服务器:');
  log(colors.cyan, '   npm start\n');
  console.log('2️⃣  运行测试:');
  log(colors.cyan, '   npm test\n');
  console.log('3️⃣  查看帮助:');
  log(colors.cyan, '   node quick-start.js --help\n');
  console.log('4️⃣  自定义配置:');
  log(colors.cyan, '   编辑 mad.config.js\n');
  console.log('5️⃣  验证配置:');
  log(colors.cyan, '   node scripts/validate-config.js\n');

  console.log('📚 更多信息:');
  log(colors.cyan, '   查看 README.md\n');
}

// 主函数
async function main() {
  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.cyan, '🚀 MAD 安装向导');
  console.log('═'.repeat(60) + '\n');

  try {
    checkEnvironment();
    installDependencies();
    createDirectories();
    initializeConfig();
    verifyInstallation();
    showNextSteps();

    log(colors.green, '\n✨ 安装成功！MAD 已准备就绪。\n');
  } catch (err) {
    log(colors.red, `\n❌ 安装失败: ${err.message}\n`);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('\n🚀 MAD 安装向导\n');
  console.log('用法: node scripts/install.js [选项]\n');
  console.log('选项:');
  console.log('  --help, -h     显示帮助信息');
  console.log('  --skip-deps    跳过依赖安装');
  console.log('  --skip-config  跳过配置初始化\n');
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { main };
