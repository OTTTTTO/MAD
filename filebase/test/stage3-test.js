#!/usr/bin/env node

/**
 * MAD FileBased - 阶段3测试
 * 
 * 用途：测试Web界面的完整性
 */

const http = require('http');
const WebServer = require('../src/web/server-fixed.js');
const FileManager = require('../src/lib/file-manager.js');

const BASE_URL = 'http://localhost:3000';

/**
 * 测试HTTP请求
 */
async function testRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * 测试Web服务器
 */
async function testWebServer() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 测试：Web服务器');
  console.log('='.repeat(60));

  // 启动服务器
  console.log('\n📡 启动Web服务器...');
  const server = new WebServer({ port: 3000 });
  await server.start();
  console.log('✅ 服务器已启动');

  // 等待服务器完全启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  const tests = [];

  // 测试1：健康检查
  console.log('\n📋 测试1：健康检查');
  try {
    const result = await testRequest('/api/health');
    console.log(`   状态码: ${result.status}`);
    console.log(`   响应:`, result.data);
    tests.push({ name: '健康检查', pass: result.status === 200 && result.data.status === 'ok' });
  } catch (error) {
    console.error('   ❌ 失败:', error.message);
    tests.push({ name: '健康检查', pass: false });
  }

  // 测试2：统计信息
  console.log('\n📋 测试2：统计信息');
  try {
    const result = await testRequest('/api/stats');
    console.log(`   状态码: ${result.status}`);
    console.log(`   总讨论数: ${result.data.totalDiscussions}`);
    tests.push({ name: '统计信息', pass: result.status === 200 });
  } catch (error) {
    console.error('   ❌ 失败:', error.message);
    tests.push({ name: '统计信息', pass: false });
  }

  // 测试3：讨论列表
  console.log('\n📋 测试3：讨论列表');
  try {
    const result = await testRequest('/api/discussions');
    console.log(`   状态码: ${result.status}`);
    console.log(`   讨论数: ${result.data.total}`);
    tests.push({ name: '讨论列表', pass: result.status === 200 });
  } catch (error) {
    console.error('   ❌ 失败:', error.message);
    tests.push({ name: '讨论列表', pass: false });
  }

  // 测试4：创建请求
  console.log('\n📋 测试4：创建请求');
  try {
    const result = await testRequest('/api/requests', 'POST', {
      topic: '测试：Web界面创建的讨论',
      category: '功能测试',
      priority: 'medium'
    });
    console.log(`   状态码: ${result.status}`);
    console.log(`   响应:`, result.data);
    tests.push({ name: '创建请求', pass: result.status === 201 });
  } catch (error) {
    console.error('   ❌ 失败:', error.message);
    tests.push({ name: '创建请求', pass: false });
  }

  // 测试5：访问首页
  console.log('\n📋 测试5：访问首页');
  try {
    const result = await testRequest('/');
    console.log(`   状态码: ${result.status}`);
    console.log(`   包含HTML: ${result.data.includes('<!DOCTYPE html>')}`);
    tests.push({ name: '访问首页', pass: result.status === 200 && result.data.includes('MAD') });
  } catch (error) {
    console.error('   ❌ 失败:', error.message);
    tests.push({ name: '访问首页', pass: false });
  }

  // 停止服务器
  console.log('\n🛑 停止服务器...');
  await server.stop();

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试总结');
  console.log('='.repeat(60));

  tests.forEach(test => {
    console.log(`   ${test.pass ? '✅' : '❌'} ${test.name}`);
  });

  const passed = tests.filter(t => t.pass).length;
  console.log(`\n通过: ${passed}/${tests.length}`);

  if (passed === tests.length) {
    console.log('\n🎉 所有测试通过！Web服务器工作正常。\n');
    console.log('💡 现在您可以：');
    console.log('   1. 启动Web服务器: node start-web.js');
    console.log('   2. 访问: http://localhost:3000');
    console.log('   3. 在浏览器中创建讨论\n');
    return 0;
  } else {
    console.log('\n⚠️ 部分测试失败，请检查\n');
    return 1;
  }
}

// 运行测试
testWebServer()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
