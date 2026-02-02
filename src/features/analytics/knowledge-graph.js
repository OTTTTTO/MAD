/**
 * 知识图谱
 * 
 * 构建和分析讨论主题、概念和 Agent 关系的知识图谱
 */

class KnowledgeGraph {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.graph = {
      nodes: new Map(),
      edges: new Map()
    };
    this.initialized = false;
  }

  /**
   * 初始化知识图谱
   */
  async initialize() {
    if (this.initialized) return;

    await this.buildGraph();
    this.initialized = true;
    console.log('[Knowledge Graph] Initialized');
  }

  /**
   * 构建图谱
   */
  async buildGraph() {
    const discussions = Array.from(this.orchestrator.discussions.values());

    // 清空现有图谱
    this.graph.nodes.clear();
    this.graph.edges.clear();

    // 构建实体
    for (const discussion of discussions) {
      this.addDiscussionNode(discussion);
      this.addTopicNodes(discussion);
      this.addAgentNodes(discussion);
    }

    // 构建关系
    for (const discussion of discussions) {
      this.connectDiscussionEntities(discussion);
    }

    // 计算权重
    this.calculateWeights();
  }

  /**
   * 添加讨论节点
   */
  addDiscussionNode(discussion) {
    this.graph.nodes.set(`discussion:${discussion.id}`, {
      id: `discussion:${discussion.id}`,
      type: 'discussion',
      label: discussion.topic || 'Untitled',
      data: {
        id: discussion.id,
        topic: discussion.topic,
        createdAt: discussion.createdAt,
        endedAt: discussion.endedAt,
        messageCount: discussion.messages?.length || 0
      }
    });
  }

  /**
   * 添加主题节点
   */
  addTopicNodes(discussion) {
    const topic = discussion.topic || '';
    const keywords = this.extractKeywords(topic);

    for (const keyword of keywords) {
      const nodeId = `topic:${keyword}`;
      
      if (!this.graph.nodes.has(nodeId)) {
        this.graph.nodes.set(nodeId, {
          id: nodeId,
          type: 'topic',
          label: keyword,
          data: {
            keyword,
            occurrences: 0
          }
        });
      }

      this.graph.nodes.get(nodeId).data.occurrences++;
    }
  }

  /**
   * 添加 Agent 节点
   */
  addAgentNodes(discussion) {
    const agents = new Set();
    
    for (const msg of discussion.messages || []) {
      agents.add(msg.agentName);
    }

    for (const agentName of agents) {
      const nodeId = `agent:${agentName}`;
      
      if (!this.graph.nodes.has(nodeId)) {
        this.graph.nodes.set(nodeId, {
          id: nodeId,
          type: 'agent',
          label: agentName,
          data: {
            name: agentName,
            participations: 0,
            messages: 0
          }
        });
      }

      this.graph.nodes.get(nodeId).data.participations++;
      this.graph.nodes.get(nodeId).data.messages += 
        (discussion.messages || []).filter(m => m.agentName === agentName).length;
    }
  }

  /**
   * 连接讨论实体
   */
  connectDiscussionEntities(discussion) {
    const discussionId = `discussion:${discussion.id}`;
    const keywords = this.extractKeywords(discussion.topic || '');
    const agents = new Set();

    for (const msg of discussion.messages || []) {
      agents.add(msg.agentName);
    }

    // 连接讨论到主题
    for (const keyword of keywords) {
      const topicId = `topic:${keyword}`;
      this.addEdge(discussionId, topicId, 'about');
    }

    // 连接讨论到 Agents
    for (const agentName of agents) {
      const agentId = `agent:${agentName}`;
      this.addEdge(discussionId, agentId, 'participated_in');
    }

    // 连接 Agents 到主题
    for (const agentName of agents) {
      for (const keyword of keywords) {
        const agentId = `agent:${agentName}`;
        const topicId = `topic:${keyword}`;
        this.addEdge(agentId, topicId, 'expertise_in');
      }
    }
  }

  /**
   * 添加边
   */
  addEdge(source, target, type) {
    const edgeId = `${source}-${type}-${target}`;

    if (!this.graph.edges.has(edgeId)) {
      this.graph.edges.set(edgeId, {
        id: edgeId,
        source,
        target,
        type,
        weight: 0
      });
    }

    this.graph.edges.get(edgeId).weight++;
  }

  /**
   * 计算权重
   */
  calculateWeights() {
    // 标准化边权重
    const maxWeight = Math.max(...Array.from(this.graph.edges.values()).map(e => e.weight));

    for (const edge of this.graph.edges.values()) {
      edge.normalizedWeight = edge.weight / maxWeight;
    }

    // 计算节点重要性
    for (const node of this.graph.nodes.values()) {
      node.importance = this.calculateNodeImportance(node.id);
    }
  }

  /**
   * 计算节点重要性
   */
  calculateNodeImportance(nodeId) {
    // 基于连接数
    const connections = Array.from(this.graph.edges.values())
      .filter(e => e.source === nodeId || e.target === nodeId)
      .reduce((sum, e) => sum + e.weight, 0);

    return connections;
  }

  /**
   * 查询相关实体
   */
  findRelated(entityId, maxDepth = 2) {
    const related = new Set();
    const visited = new Set();
    const queue = [{ id: entityId, depth: 0 }];

    visited.add(entityId);

    while (queue.length > 0) {
      const { id, depth } = queue.shift();

      if (depth >= maxDepth) continue;

      // 查找相邻节点
      const neighbors = this.getNeighbors(id);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          related.add(neighbor.id);
          queue.push({ id: neighbor.id, depth: depth + 1 });
        }
      }
    }

    return Array.from(related).map(id => this.graph.nodes.get(id));
  }

  /**
   * 获取邻居节点
   */
  getNeighbors(nodeId) {
    const neighbors = [];

    for (const edge of this.graph.edges.values()) {
      if (edge.source === nodeId) {
        neighbors.push({
          id: edge.target,
          relation: edge.type,
          weight: edge.weight
        });
      } else if (edge.target === nodeId) {
        neighbors.push({
          id: edge.source,
          relation: edge.type,
          weight: edge.weight
        });
      }
    }

    return neighbors;
  }

  /**
   * 查找最短路径
   */
  findShortestPath(sourceId, targetId) {
    const visited = new Set();
    const queue = [{ id: sourceId, path: [] }];

    visited.add(sourceId);

    while (queue.length > 0) {
      const { id, path } = queue.shift();

      if (id === targetId) {
        return [...path, id];
      }

      const neighbors = this.getNeighbors(id);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push({
            id: neighbor.id,
            path: [...path, id]
          });
        }
      }
    }

    return null; // 没有路径
  }

  /**
   * 发现社区（聚类）
   */
  detectCommunities() {
    // 简化的社区检测算法
    const communities = [];
    const visited = new Set();

    for (const node of this.graph.nodes.values()) {
      if (visited.has(node.id)) continue;

      const community = this.expandCommunity(node.id, visited);
      if (community.length > 1) {
        communities.push(community);
      }
    }

    return communities;
  }

  /**
   * 扩展社区
   */
  expandCommunity(nodeId, visited) {
    const community = [];
    const queue = [nodeId];

    visited.add(nodeId);

    while (queue.length > 0) {
      const id = queue.shift();
      const node = this.graph.nodes.get(id);
      
      if (node) {
        community.push(node);
      }

      // 添加强连接的邻居
      const neighbors = this.getNeighbors(id).filter(n => n.weight >= 2);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push(neighbor.id);
        }
      }
    }

    return community;
  }

  /**
   * 获取概念演化
   */
  getConceptEvolution(concept, timeRange = '30d') {
    const { start } = this.getDateRange(timeRange);
    const discussions = Array.from(this.orchestrator.discussions.values())
      .filter(d => d.createdAt >= start);

    const timeline = [];
    const conceptRegex = new RegExp(concept, 'i');

    // 按天分组
    const dailyData = {};

    for (const discussion of discussions) {
      const day = new Date(discussion.createdAt).toISOString().slice(0, 10);
      
      const matches = conceptRegex.test(discussion.topic) ||
        discussion.messages?.some(m => conceptRegex.test(m.content));

      if (!dailyData[day]) {
        dailyData[day] = { mentions: 0, discussions: [] };
      }

      if (matches) {
        dailyData[day].mentions++;
        dailyData[day].discussions.push(discussion.id);
      }
    }

    // 转换为数组
    for (const [day, data] of Object.entries(dailyData)) {
      timeline.push({ day, ...data });
    }

    return timeline.sort((a, b) => a.day.localeCompare(b.day));
  }

  /**
   * 获取知识网络统计
   */
  getStatistics() {
    const nodes = Array.from(this.graph.nodes.values());
    const edges = Array.from(this.graph.edges.values());

    const nodeTypes = {};
    for (const node of nodes) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }

    const edgeTypes = {};
    for (const edge of edges) {
      edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    }

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      edgeTypes,
      avgConnections: edges.length / Math.max(1, nodes.length),
      mostConnected: nodes.sort((a, b) => (b.importance || 0) - (a.importance || 0)).slice(0, 10)
    };
  }

  /**
   * 导出图谱数据
   */
  exportGraph(format = 'json') {
    const data = {
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values())
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'graphviz') {
      return this.toGraphViz(data);
    }

    return data;
  }

  /**
   * 转换为 GraphViz 格式
   */
  toGraphViz(data) {
    let dot = 'digraph KnowledgeGraph {\n';
    dot += '  rankdir=LR;\n';

    // 节点
    for (const node of data.nodes) {
      const color = node.type === 'agent' ? 'lightblue' : 
                    node.type === 'topic' ? 'lightgreen' : 'lightyellow';
      dot += `  "${node.id}" [label="${node.label}", fillcolor=${color}, style=filled];\n`;
    }

    // 边
    for (const edge of data.edges) {
      dot += `  "${edge.source}" -> "${edge.target}" [label="${edge.type}"];\n`;
    }

    dot += '}';
    return dot;
  }

  // 辅助方法

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    if (!text) return [];

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // 去除常见停用词
    const stopWords = ['this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what', 'when', 'where', 'which'];
    
    return words.filter(word => !stopWords.includes(word));
  }

  /**
   * 获取日期范围
   */
  getDateRange(timeRange) {
    const end = new Date();
    const start = new Date();

    const match = timeRange.match(/^(\d+)([dMy])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'd': start.setDate(start.getDate() - value); break;
        case 'M': start.setMonth(start.getMonth() - value); break;
        case 'y': start.setFullYear(start.getFullYear() - value); break;
      }
    }

    return { start, end };
  }

  /**
   * 更新图谱
   */
  async update(discussion) {
    if (!this.initialized) {
      await this.initialize();
      return;
    }

    // 添加新节点
    this.addDiscussionNode(discussion);
    this.addTopicNodes(discussion);
    this.addAgentNodes(discussion);

    // 添加新边
    this.connectDiscussionEntities(discussion);

    // 重新计算权重
    this.calculateWeights();
  }

  /**
   * 清除图谱
   */
  clear() {
    this.graph.nodes.clear();
    this.graph.edges.clear();
    this.initialized = false;
  }
}

module.exports = { KnowledgeGraph };
