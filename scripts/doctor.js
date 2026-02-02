#!/usr/bin/env node

/**
 * MAD 健康检查脚本
 * 检查系统状态、配置、依赖和数据完整性
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

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

function printHeader(title) {
  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.cyan, title);
  console.log('═'.repeat(60) + '\n');
}

// 健康检查项目
const healthChecks = {
  // 1. 环境检查
  environment: () => {
    printHeader('🌍 环境检查');

    const issues = [];

    // Node.js 版本
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      issues.push({
        severity: 'error',
        component: 'Node.js',
        message: `版本过低: ${nodeVersion} (需要 >= 18.0.0)`,
        fix: '请升级到 Node.js 18 或更高版本'
      });
    } else {
      log(colors.green, `✅ Node.js: ${nodeVersion}`);
    }

    // 内存
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
    if (freeMem < 512) {
      issues.push({
        severity: 'warning',
        component: '内存',
        message: `可用内存不足: ${freeMem}GB`,
        fix: '建议至少 512MB 可用内存'
      });
    } else {
      log(colors.green, `✅ 内存: ${freeMem}GB 可用 / ${totalMem}GB 总计`);
    }

    // 磁盘空间
    const stats = fs.statSync('.');
    if (stats) {
      log(colors.green, `✅ 磁盘访问: 正常`);
    }

    return issues;
  },

  // 2. 依赖检查
  dependencies: () => {
    printHeader('📦 依赖检查');

    const issues = [];

    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = Object.keys(pkg.dependencies || {});

      log(colors.cyan, `检查 ${dependencies.length} 个依赖...\n`);

      dependencies.forEach(dep => {
        try {
          require(dep);
          log(colors.green, `✅ ${dep}`);
        } catch {
          issues.push({
            severity: 'error',
            component: '依赖',
            message: `缺少依赖: ${dep}`,
            fix: '运行 npm install 安装缺失的依赖'
          });
          log(colors.red, `❌ ${dep}`);
        }
      });
    } catch (err) {
      issues.push({
        severity: 'error',
        component: 'package.json',
        message: `无法读取: ${err.message}`,
        fix: '确保在 MAD 项目根目录中运行'
      });
    }

    return issues;
  },

  // 3. 配置检查
  configuration: () => {
    printHeader('⚙️  配置检查');

    const issues = [];

    // 检查配置文件
    const configFiles = [
      'mad.config.js',
      'mad.config.json',
      'config.json'
    ];

    let hasConfig = false;
    for (const file of configFiles) {
      if (fs.existsSync(file)) {
        log(colors.green, `✅ 配置文件: ${file}`);
        hasConfig = true;

        // 验证配置
        try {
          const { validateConfig } = require('./validate-config.js');
          const config = JSON.parse(fs.readFileSync(file, 'utf8'));
          const result = validateConfig(config);

          if (!result.valid) {
            issues.push({
              severity: 'warning',
              component: '配置验证',
              message: `${result.errors.length} 个错误`,
              details: result.errors,
              fix: '运行 node scripts/validate-config.js 查看详情'
            });
            log(colors.yellow, `⚠️  配置验证失败`);
          } else {
            log(colors.green, `✅ 配置验证通过`);
          }
        } catch {
          log(colors.yellow, `⚠️  无法验证配置`);
        }
        break;
      }
    }

    if (!hasConfig) {
      issues.push({
        severity: 'warning',
        component: '配置',
        message: '未找到配置文件',
        fix: '运行 node scripts/install.js 初始化配置'
      });
      log(colors.yellow, `⚠️  未找到配置文件`);
    }

    return issues;
  },

  // 4. 目录结构检查
  directories: () => {
    printHeader('📁 目录结构检查');

    const issues = [];

    const requiredDirs = [
      'data/discussions',
      'data/templates',
      'data/cache',
      'logs',
      'src/lib',
      'web'
    ];

    requiredDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        log(colors.green, `✅ ${dir}`);
      } else {
        issues.push({
          severity: 'error',
          component: '目录',
          message: `缺少目录: ${dir}`,
          fix: '运行 node scripts/install.js 创建目录结构'
        });
        log(colors.red, `❌ ${dir}`);
      }
    });

    return issues;
  },

  // 5. 端口检查
  ports: () => {
    printHeader('🔌 端口检查');

    const issues = [];

    // 读取配置获取端口
    let httpPort = 18790;
    let wsPort = 18791;

    try {
      const configFiles = ['mad.config.js', 'mad.config.json', 'config.json'];
      for (const file of configFiles) {
        if (fs.existsSync(file)) {
          if (file.endsWith('.js')) {
            const config = require(path.resolve(file));
            if (config.server?.port) httpPort = config.server.port;
            if (config.websocket?.port) wsPort = config.websocket.port;
          } else {
            const config = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (config.server?.port) httpPort = config.server.port;
            if (config.websocket?.port) wsPort = config.websocket.port;
          }
          break;
        }
      }
    } catch {
      // 使用默认端口
    }

    // 检查端口占用
    const ports = [
      { name: 'HTTP', port: httpPort },
      { name: 'WebSocket', port: wsPort }
    ];

    ports.forEach(({ name, port }) => {
      try {
        const net = require('net');
        const server = net.createServer();

        server.once('error', () => {
          issues.push({
            severity: 'warning',
            component: '端口',
            message: `${name} 端口 ${port} 已被占用`,
            fix: `停止占用端口的程序或修改 mad.config.js 中的端口配置`
          });
          log(colors.yellow, `⚠️  ${name} 端口 ${port}: 被占用`);
        });

        server.once('listening', () => {
          server.close();
          log(colors.green, `✅ ${name} 端口 ${port}: 可用`);
        });

        server.listen(port);
      } catch {
        issues.push({
          severity: 'warning',
          component: '端口',
          message: `${name} 端口 ${port} 检查失败`,
          fix: '手动检查端口占用'
        });
      }
    });

    return issues;
  },

  // 6. 数据完整性检查
  dataIntegrity: () => {
    printHeader('💾 数据完整性检查');

    const issues = [];

    // 检查核心文件
    const coreFiles = [
      'orchestrator.js',
      'src/lib/logger.js',
      'src/lib/errors.js',
      'src/lib/config.js',
      'web/server.js'
    ];

    coreFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        if (stats.size === 0) {
          issues.push({
            severity: 'error',
            component: '文件',
            message: `文件为空: ${file}`,
            fix: '重新安装 MAD'
          });
          log(colors.red, `❌ ${file} (空文件)`);
        } else {
          log(colors.green, `✅ ${file}`);
        }
      } else {
        issues.push({
          severity: 'error',
          component: '文件',
          message: `缺少文件: ${file}`,
          fix: '重新安装 MAD'
        });
        log(colors.red, `❌ ${file} (不存在)`);
      }
    });

    return issues;
  },

  // 7. 日志检查
  logs: () => {
    printHeader('📋 日志检查');

    const issues = [];

    const logDir = 'logs';
    if (!fs.existsSync(logDir)) {
      log(colors.yellow, `⚠️  日志目录不存在`);
      return issues;
    }

    try {
      const files = fs.readdirSync(logDir);
      const logFiles = files.filter(f => f.endsWith('.log'));

      if (logFiles.length === 0) {
        log(colors.cyan, `📝 暂无日志文件`);
      } else {
        log(colors.green, `✅ 找到 ${logFiles.length} 个日志文件`);

        // 检查最新的日志文件
        const latestFile = logFiles
          .map(f => ({
            name: f,
            mtime: fs.statSync(path.join(logDir, f)).mtime
          }))
          .sort((a, b) => b.mtime - a.mtime)[0];

        log(colors.cyan, `   最新: ${latestFile.name}`);

        // 检查文件大小
        const logPath = path.join(logDir, latestFile.name);
        const stats = fs.statSync(logPath);
        const sizeKB = Math.round(stats.size / 1024);

        if (sizeKB > 10240) { // 10MB
          issues.push({
            severity: 'warning',
            component: '日志',
            message: `日志文件过大: ${sizeKB}KB`,
            fix: '考虑清理或归档旧日志'
          });
          log(colors.yellow, `⚠️  文件大小: ${sizeKB}KB (过大)`);
        } else {
          log(colors.green, `   文件大小: ${sizeKB}KB`);
        }
      }
    } catch (err) {
      issues.push({
        severity: 'warning',
        component: '日志',
        message: `无法读取日志目录: ${err.message}`,
        fix: '检查日志目录权限'
      });
    }

    return issues;
  }
};

// 主函数
async function main() {
  console.log('\n' + '═'.repeat(60));
  log(colors.bright + colors.cyan, '🏥 MAD 健康检查');
  console.log('═'.repeat(60));

  const allIssues = [];

  // 运行所有检查
  for (const [name, checkFn] of Object.entries(healthChecks)) {
    try {
      const issues = checkFn();
      allIssues.push(...(issues || []));
    } catch (err) {
      allIssues.push({
        severity: 'error',
        component: name,
        message: `检查失败: ${err.message}`,
        fix: '查看错误堆栈'
      });
    }
  }

  // 总结
  printHeader('📊 检查总结');

  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');

  console.log(`总计: ${allIssues.length} 个问题`);
  log(colors.red, `  错误: ${errors.length}`);
  log(colors.yellow, `  警告: ${warnings.length}`);
  console.log();

  // 显示问题
  if (allIssues.length > 0) {
    printHeader('⚠️  发现的问题');

    allIssues.forEach((issue, index) => {
      const severityColor = issue.severity === 'error' ? colors.red : colors.yellow;
      const severityIcon = issue.severity === 'error' ? '🔴' : '🟡';

      log(severityColor, `${severityIcon} [${index + 1}] ${issue.component}: ${issue.message}`);

      if (issue.details) {
        issue.details.forEach(detail => {
          log(colors.reset, `      - ${detail}`);
        });
      }

      if (issue.fix) {
        log(colors.cyan, `   💡 ${issue.fix}`);
      }
      console.log();
    });
  }

  // 最终状态
  if (errors.length > 0) {
    printHeader('❌ 健康检查失败');
    log(colors.red, `发现 ${errors.length} 个错误，请修复后重试\n`);
    process.exit(1);
  } else if (warnings.length > 0) {
    printHeader('⚠️  存在警告');
    log(colors.yellow, `发现 ${warnings.length} 个警告，建议修复\n`);
    process.exit(0);
  } else {
    printHeader('✅ 健康检查通过');
    log(colors.green, '所有检查项目正常！MAD 运行健康。\n');
    process.exit(0);
  }
}

// 导出
if (require.main === module) {
  const os = require('os');
  main().catch(err => {
    log(colors.red, `\n❌ 健康检查失败: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { healthChecks };
