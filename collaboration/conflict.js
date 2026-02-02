/**
 * 冲突解决
 * 
 * 处理多人同时编辑时的冲突
 */

class ConflictResolver {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.pendingOperations = new Map(); // discussionId -> pending operations
    this.conflictHistory = new Map(); // discussionId -> conflict history
  }

  /**
   * 应用编辑操作
   * @param {string} discussionId - 讨论ID
   * @param {object} operation - 编辑操作
   */
  async applyOperation(discussionId, operation) {
    const discussion = this.orchestrator.discussions.get(discussionId);
    
    if (!discussion) {
      throw new Error('Discussion not found');
    }

    // 初始化待处理操作队列
    if (!this.pendingOperations.has(discussionId)) {
      this.pendingOperations.set(discussionId, []);
    }

    const operations = this.pendingOperations.get(discussionId);

    // 检查是否有冲突
    const conflicts = this.detectConflicts(discussionId, operation, operations);
    
    if (conflicts.length > 0) {
      // 尝试自动解决
      const resolved = await this.autoResolve(operation, conflicts);
      
      if (!resolved) {
        // 记录冲突，返回给用户处理
        const conflictEvent = {
          id: this.generateId(),
          timestamp: Date.now(),
          operation,
          conflicts,
          status: 'pending'
        };

        this.recordConflict(discussionId, conflictEvent);
        
        throw new ConflictError('Edit conflict detected', conflictEvent);
      }
    }

    // 应用操作
    const result = await this.executeOperation(discussion, operation);
    
    // 添加到已应用操作列表
    operations.push({
      ...operation,
      appliedAt: Date.now(),
      userId: operation.userId
    });

    // 保持历史记录在合理大小
    if (operations.length > 100) {
      operations.splice(0, operations.length - 100);
    }

    return result;
  }

  /**
   * 检测冲突
   * @param {string} discussionId - 讨论ID
   * @param {object} operation - 新操作
   * @param {Array} appliedOperations - 已应用的操作
   */
  detectConflicts(discussionId, operation, appliedOperations) {
    const conflicts = [];

    // 只检查最近5秒内的操作
    const recentOperations = appliedOperations.filter(
      op => (Date.now() - op.appliedAt) < 5000
    );

    for (const appliedOp of recentOperations) {
      // 忽略同一用户的操作
      if (appliedOp.userId === operation.userId) {
        continue;
      }

      // 检查操作范围是否重叠
      if (this.rangesOverlap(appliedOp, operation)) {
        conflicts.push(appliedOp);
      }
    }

    return conflicts;
  }

  /**
   * 检查范围是否重叠
   */
  rangesOverlap(op1, op2) {
    const range1 = this.getOperationRange(op1);
    const range2 = this.getOperationRange(op2);

    if (!range1 || !range2) {
      return false;
    }

    return range1.start < range2.end && range1.end > range2.start;
  }

  /**
   * 获取操作范围
   */
  getOperationRange(operation) {
    switch (operation.type) {
      case 'insert':
        return { start: operation.position, end: operation.position };
      
      case 'delete':
        return { 
          start: operation.position, 
          end: operation.position + operation.length 
        };
      
      case 'replace':
        return { 
          start: operation.position, 
          end: operation.position + operation.length 
        };
      
      case 'format':
        return {
          start: operation.position,
          end: operation.position + operation.length
        };
      
      default:
        return null;
    }
  }

  /**
   * 自动解决冲突
   * @param {object} operation - 新操作
   * @param {Array} conflicts - 冲突列表
   */
  async autoResolve(operation, conflicts) {
    // 简单的策略：如果操作类型相同，可以合并
    // 实际应用中可以使用 OT (Operational Transformation) 或 CRDT

    // 检查是否都是简单的插入操作
    if (operation.type === 'insert' && 
        conflicts.every(c => c.type === 'insert')) {
      
      // 如果插入位置不同，可以自动调整
      const adjustedPosition = this.adjustPosition(operation, conflicts);
      
      if (adjustedPosition !== operation.position) {
        operation.position = adjustedPosition;
        return true;
      }
    }

    // 检查是否都是删除操作
    if (operation.type === 'delete' && 
        conflicts.every(c => c.type === 'delete')) {
      
      // 可以应用两次删除
      return true;
    }

    // 其他情况无法自动解决
    return false;
  }

  /**
   * 调整操作位置
   */
  adjustPosition(operation, conflicts) {
    let newPosition = operation.position;

    for (const conflict of conflicts) {
      if (conflict.position >= newPosition) {
        // 冲突操作在后面，不需要调整
        break;
      } else {
        // 冲突操作在前面，需要调整位置
        if (conflict.type === 'insert') {
          newPosition += conflict.content?.length || 0;
        } else if (conflict.type === 'delete') {
          newPosition -= conflict.length || 0;
        }
      }
    }

    return Math.max(0, newPosition);
  }

  /**
   * 执行操作
   * @param {object} discussion - 讨论对象
   * @param {object} operation - 操作
   */
  async executeOperation(discussion, operation) {
    let content = discussion.transcript || '';

    switch (operation.type) {
      case 'insert':
        content = this.insertContent(content, operation.position, operation.content);
        break;
      
      case 'delete':
        content = this.deleteContent(content, operation.position, operation.length);
        break;
      
      case 'replace':
        content = this.deleteContent(content, operation.position, operation.length);
        content = this.insertContent(content, operation.position, operation.content);
        break;
      
      case 'format':
        // 格式化操作，不改变内容，只添加标记
        content = this.applyFormat(content, operation);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    // 更新讨论内容
    discussion.transcript = content;
    discussion.updatedAt = Date.now();

    return {
      success: true,
      operation,
      newLength: content.length
    };
  }

  /**
   * 插入内容
   */
  insertContent(content, position, text) {
    return content.slice(0, position) + text + content.slice(position);
  }

  /**
   * 删除内容
   */
  deleteContent(content, position, length) {
    return content.slice(0, position) + content.slice(position + length);
  }

  /**
   * 应用格式
   */
  applyFormat(content, operation) {
    // 简化实现：添加格式标记
    const { position, length, format } = operation;
    const before = content.slice(0, position);
    const text = content.slice(position, position + length);
    const after = content.slice(position + length);

    let marker = '';
    switch (format) {
      case 'bold': marker = '**'; break;
      case 'italic': marker = '*'; break;
      case 'code': marker = '`'; break;
      default: marker = '';
    }

    return before + marker + text + marker + after;
  }

  /**
   * 记录冲突
   */
  recordConflict(discussionId, conflictEvent) {
    if (!this.conflictHistory.has(discussionId)) {
      this.conflictHistory.set(discussionId, []);
    }

    const history = this.conflictHistory.get(discussionId);
    history.push(conflictEvent);

    // 保持历史记录在合理大小
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * 获取冲突历史
   */
  getConflictHistory(discussionId) {
    return this.conflictHistory.get(discussionId) || [];
  }

  /**
   * 手动解决冲突
   * @param {string} discussionId - 讨论ID
   * @param {string} conflictId - 冲突ID
   * @param {string} resolution - 解决方案（'accept' | 'reject' | 'merge'）
   * @param {object} mergedOperation - 合并后的操作（如果选择合并）
   */
  async resolveConflict(discussionId, conflictId, resolution, mergedOperation = null) {
    const history = this.conflictHistory.get(discussionId);
    
    if (!history) {
      throw new Error('No conflicts found for discussion');
    }

    const conflictIndex = history.findIndex(c => c.id === conflictId);
    if (conflictIndex === -1) {
      throw new Error('Conflict not found');
    }

    const conflict = history[conflictIndex];

    switch (resolution) {
      case 'accept':
        // 接受新操作，应用它
        await this.executeOperation(
          this.orchestrator.discussions.get(discussionId),
          conflict.operation
        );
        break;
      
      case 'reject':
        // 拒绝新操作，不做任何事
        break;
      
      case 'merge':
        // 应用合并后的操作
        if (!mergedOperation) {
          throw new Error('Merged operation required for merge resolution');
        }
        await this.executeOperation(
          this.orchestrator.discussions.get(discussionId),
          mergedOperation
        );
        break;
    }

    // 标记冲突为已解决
    conflict.status = 'resolved';
    conflict.resolvedAt = Date.now();
    conflict.resolution = resolution;

    return { success: true };
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    let totalConflicts = 0;
    let resolvedConflicts = 0;

    for (const history of this.conflictHistory.values()) {
      for (const conflict of history) {
        totalConflicts++;
        if (conflict.status === 'resolved') {
          resolvedConflicts++;
        }
      }
    }

    return {
      totalConflicts,
      resolvedConflicts,
      pendingConflicts: totalConflicts - resolvedConflicts,
      resolutionRate: totalConflicts > 0 ? resolvedConflicts / totalConflicts : 0
    };
  }

  /**
   * 清理
   */
  cleanup(discussionId) {
    this.pendingOperations.delete(discussionId);
    this.conflictHistory.delete(discussionId);
  }
}

/**
 * 冲突错误类
 */
class ConflictError extends Error {
  constructor(message, conflictEvent) {
    super(message);
    this.name = 'ConflictError';
    this.conflictEvent = conflictEvent;
  }
}

module.exports = {
  ConflictResolver,
  ConflictError
};
