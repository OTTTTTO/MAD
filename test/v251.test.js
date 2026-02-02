#!/usr/bin/env node

/**
 * v2.5.1 功能测试 - 键盘快捷键
 */

const fs = require('fs');
const path = require('path');

console.log('\n⌨️  MAD v2.5.1 - 键盘快捷键功能测试\n');
console.log('=' .repeat(50));

let testsPassed = 0;
let testsFailed = 0;

// 测试 1: 检查文件存在性
console.log('\n📝 测试 1: 检查文件存在性...');
try {
  
  const shortcutsJS = path.join(__dirname, '../web/shortcuts.js');
  const shortcutsCSS = path.join(__dirname, '../web/public/shortcuts.css');
  
  if (fs.existsSync(shortcutsJS) && fs.existsSync(shortcutsCSS)) {
    console.log('✅ 快捷键文件存在');
    console.log(`   - ${shortcutsJS}`);
    console.log(`   - ${shortcutsCSS}`);
    testsPassed++;
  } else {
    console.log('❌ 快捷键文件不存在');
    testsFailed++;
  }
} catch (error) {
  console.log(`❌ 测试失败: ${error.message}`);
  testsFailed++;
}

// 测试 2: 检查快捷键定义
console.log('\n📋 测试 2: 检查快捷键定义...');
try {
  const fs = require('fs');
  const path = require('path');
  const shortcutsJS = fs.readFileSync(path.join(__dirname, '../web/shortcuts.js'), 'utf8');
  
  const requiredShortcuts = [
    'search', 'newDiscussion', 'help', 'nextDiscussion', 
    'prevDiscussion', 'export', 'refresh', 'home', 'escape'
  ];
  
  const missing = requiredShortcuts.filter(key => !shortcutsJS.includes(`'${key}'`));
  
  if (missing.length === 0) {
    console.log(`✅ 所有快捷键已定义 (${requiredShortcuts.length} 个)`);
    testsPassed++;
  } else {
    console.log(`❌ 缺少快捷键定义: ${missing.join(', ')}`);
    testsFailed++;
  }
} catch (error) {
  console.log(`❌ 测试失败: ${error.message}`);
  testsFailed++;
}

// 测试 3: 检查 HTML 集成
console.log('\n🔗 测试 3: 检查 HTML 集成...');
try {
  const fs = require('fs');
  const indexHTML = fs.readFileSync(path.join(__dirname, '../web/public/index.html'), 'utf8');
  
  const hasShortcutsJS = indexHTML.includes('/shortcuts.js');
  const hasShortcutsCSS = indexHTML.includes('/shortcuts.css');
  const hasInitScript = indexHTML.includes('KeyboardShortcutManager');
  
  if (hasShortcutsJS && hasShortcutsCSS && hasInitScript) {
    console.log('✅ HTML 集成正确');
    console.log('   - shortcuts.js 已引入');
    console.log('   - shortcuts.css 已引入');
    console.log('   - 初始化脚本已添加');
    testsPassed++;
  } else {
    console.log('❌ HTML 集成不完整');
    if (!hasShortcutsJS) console.log('   - 缺少 shortcuts.js');
    if (!hasShortcutsCSS) console.log('   - 缺少 shortcuts.css');
    if (!hasInitScript) console.log('   - 缺少初始化脚本');
    testsFailed++;
  }
} catch (error) {
  console.log(`❌ 测试失败: ${error.message}`);
  testsFailed++;
}

// 测试 4: 检查服务器路由
console.log('\n🌐 测试 4: 检查服务器路由...');
try {
  const fs = require('fs');
  const serverJS = fs.readFileSync(path.join(__dirname, '../web/server.js'), 'utf8');
  
  const hasShortcutsJSRoute = serverJS.includes("url.pathname === '/shortcuts.js'");
  const hasShortcutsCSSRoute = serverJS.includes("url.pathname === '/shortcuts.css'");
  
  if (hasShortcutsJSRoute && hasShortcutsCSSRoute) {
    console.log('✅ 服务器路由配置正确');
    testsPassed++;
  } else {
    console.log('❌ 服务器路由配置不完整');
    testsFailed++;
  }
} catch (error) {
  console.log(`❌ 测试失败: ${error.message}`);
  testsFailed++;
}

// 测试 5: 检查 CSS 样式
console.log('\n🎨 测试 5: 检查 CSS 样式...');
try {
  const fs = require('fs');
  const shortcutsCSS = fs.readFileSync(path.join(__dirname, '../web/public/shortcuts.css'), 'utf8');
  
  const requiredStyles = [
    '.shortcut-help-dialog',
    '.shortcut-help-content',
    '.shortcut-list',
    '.shortcut-item',
    '.shortcut-keys',
    'kbd'
  ];
  
  const missing = requiredStyles.filter(style => !shortcutsCSS.includes(style));
  
  if (missing.length === 0) {
    console.log(`✅ 所有必需的 CSS 样式已定义 (${requiredStyles.length} 个)`);
    testsPassed++;
  } else {
    console.log(`❌ 缺少 CSS 样式: ${missing.join(', ')}`);
    testsFailed++;
  }
} catch (error) {
  console.log(`❌ 测试失败: ${error.message}`);
  testsFailed++;
}

// 测试 6: 检查快捷键功能完整性
console.log('\n⚙️  测试 6: 检查快捷键功能完整性...');
try {
  const fs = require('fs');
  const shortcutsJS = fs.readFileSync(path.join(__dirname, '../web/shortcuts.js'), 'utf8');
  
  const requiredMethods = [
    'handleKeyDown',
    'matchShortcut',
    'executeAction',
    'showShortcutHelp',
    'register',
    'unregister',
    'enable',
    'disable'
  ];
  
  const missing = requiredMethods.filter(method => !shortcutsJS.includes(method));
  
  if (missing.length === 0) {
    console.log(`✅ 所有必需的方法已实现 (${requiredMethods.length} 个)`);
    testsPassed++;
  } else {
    console.log(`❌ 缺少方法实现: ${missing.join(', ')}`);
    testsFailed++;
  }
} catch (error) {
  console.log(`❌ 测试失败: ${error.message}`);
  testsFailed++;
}

// 总结
console.log('\n' + '='.repeat(50));
console.log(`\n✅ 通过: ${testsPassed}`);
console.log(`❌ 失败: ${testsFailed}`);
console.log(`📊 成功率: ${Math.round(testsPassed / (testsPassed + testsFailed) * 100)}%\n`);

if (testsFailed === 0) {
  console.log('🎉 所有测试通过！');
  console.log('\n⌨️  v2.5.1 键盘快捷键功能已成功实现！');
  console.log('\n主要快捷键：');
  console.log('   Ctrl + K : 搜索');
  console.log('   Ctrl + N : 新建讨论');
  console.log('   Ctrl + / : 显示帮助');
  console.log('   Ctrl + D : 下一个讨论');
  console.log('   Ctrl + E : 导出讨论');
  console.log('   Esc     : 关闭对话框');
  console.log();
} else {
  console.log('⚠️  部分测试失败');
}

process.exit(testsFailed > 0 ? 1 : 0);
