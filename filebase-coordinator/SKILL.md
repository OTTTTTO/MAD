# MAD FileBase Coordinator Skill

## 概述

这是MAD FileBase分支的协调器skill，负责：
- 轮询pending状态的讨论
- 调用LLM生成多专家协作讨论
- 保存消息到文件系统
- 更新讨论状态

## 使用方式

在OpenClaw聊天中发送：
```
启动MAD协调器
```

协调器将自动：
1. 扫描pending的讨论
2. 为每个讨论生成多专家观点
3. 保存专家消息
4. 更新讨论状态为completed

## 专家配置

默认4个专家：
- **技术专家** (tech_expert) - 技术架构、实现方案
- **产品专家** (product_expert) - 产品价值、用户体验
- **商业专家** (business_expert) - 商业模式、成本效益
- **运营专家** (ops_expert) - 运营策略、执行落地

## 数据流向

```
OpenClaw Skill (有tool权限)
  ↓ 调用LLM
共享文件系统
  ↑ 读取
Web界面 (无tool权限)
```

## 配置

数据目录：`/home/otto/.openclaw/multi-agent-discuss`
轮询间隔：10秒
每轮讨论最多：4个专家各发表1次观点
