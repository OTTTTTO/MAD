/**
 * 工作流模板
 * 
 * 预定义的工作流模板，用于常见场景
 */

const WORKFLOW_TEMPLATES = {
  // 每日站会讨论
  dailyStandup: {
    name: 'Daily Standup Discussion',
    description: 'Create a daily standup discussion at a scheduled time',
    enabled: true,
    triggers: [
      {
        type: 'schedule',
        interval: 24 * 60 * 60 * 1000, // 每天
        time: '09:00'
      }
    ],
    variables: {
      topic: 'Daily Standup',
      participants: ['developer', 'designer', 'product-manager']
    },
    steps: [
      {
        id: 'create-standup',
        name: 'Create Standup Discussion',
        type: 'createDiscussion',
        config: {
          topic: '{{topic}} - {{timestamp}}',
          participants: '{{participants}}',
          waitForCompletion: true
        }
      },
      {
        id: 'notify-team',
        name: 'Notify Team',
        type: 'sendNotification',
        config: {
          message: 'Standup discussion completed. Summary available.',
          target: 'integration'
        }
      }
    ]
  },

  // PR 讨论触发器
  prDiscussion: {
    name: 'PR Discussion Trigger',
    description: 'Create discussion when a new PR is created',
    enabled: true,
    triggers: [
      {
        type: 'event',
        event: 'pr.created',
        conditions: {
          'data.pr.state': 'open'
        }
      }
    ],
    variables: {
      participants: ['code-reviewer', 'tech-lead']
    },
    steps: [
      {
        id: 'create-pr-discussion',
        name: 'Create PR Discussion',
        type: 'createDiscussion',
        config: {
          topic: 'Review PR: {{data.pr.title}}',
          participants: '{{participants}}',
          metadata: {
            prId: '{{data.pr.id}}',
            prUrl: '{{data.pr.url}}'
          }
        }
      },
      {
        id: 'wait-conclusion',
        name: 'Wait for Conclusion',
        type: 'delay',
        config: {
          duration: 60000 // 等待1分钟
        }
      },
      {
        id: 'post-comment',
        name: 'Post Comment to PR',
        type: 'callAPI',
        config: {
          url: '{{data.pr.apiUrl}}/comments',
          method: 'POST',
          body: {
            body: 'Discussion completed. See summary.'
          }
        }
      }
    ]
  },

  // 讨论摘要自动发布
  autoSummary: {
    name: 'Auto Summary Publisher',
    description: 'Automatically publish discussion summaries to Slack',
    enabled: true,
    triggers: [
      {
        type: 'event',
        event: 'discussion.concluded'
      }
    ],
    steps: [
      {
        id: 'check-summary',
        name: 'Check Summary Generated',
        type: 'condition',
        config: {
          conditions: {
            'data.summary': { operator: 'exists' }
          }
        }
      },
      {
        id: 'send-to-slack',
        name: 'Send to Slack',
        type: 'sendNotification',
        config: {
          message: 'Discussion "{{data.topic}}" concluded:\n\n{{data.summary}}',
          target: 'integration'
        }
      }
    ]
  },

  // 讨论回顾周期
  weeklyReview: {
    name: 'Weekly Discussion Review',
    description: 'Create a weekly review of all discussions',
    enabled: true,
    triggers: [
      {
        type: 'schedule',
        interval: 7 * 24 * 60 * 60 * 1000, // 每周
        time: '17:00'
      }
    ],
    steps: [
      {
        id: 'gather-stats',
        name: 'Gather Statistics',
        type: 'setVariable',
        config: {
          variables: {
            weekStart: '{{timestamp}}',
            reviewTopic: 'Weekly Discussion Review'
          }
        }
      },
      {
        id: 'create-review',
        name: 'Create Review Discussion',
        type: 'createDiscussion',
        config: {
          topic: '{{reviewTopic}} - Week of {{weekStart}}',
          participants: ['manager', 'team-lead'],
          waitForCompletion: true
        }
      },
      {
        id: 'publish-report',
        name: 'Publish Report',
        type: 'sendNotification',
        config: {
          message: 'Weekly review completed. Report generated.',
          target: 'integration'
        }
      }
    ]
  },

  // 讨论导出备份
  backupDiscussions: {
    name: 'Backup Discussions',
    description: 'Export and backup discussions to external storage',
    enabled: true,
    triggers: [
      {
        type: 'schedule',
        interval: 24 * 60 * 60 * 1000 // 每天
      }
    ],
    steps: [
      {
        id: 'list-discussions',
        name: 'List Recent Discussions',
        type: 'callAPI',
        config: {
          url: '/api/discussions?recent=true',
          method: 'GET'
        }
      },
      {
        id: 'export-to-git',
        name: 'Export to Git',
        type: 'callAPI',
        config: {
          url: '/api/discussions/export',
          method: 'POST',
          body: {
            format: 'json',
            target: 'git'
          }
        }
      },
      {
        id: 'notify-complete',
        name: 'Notify Completion',
        type: 'sendNotification',
        config: {
          message: 'Backup completed successfully',
          target: 'log'
        }
      }
    ]
  },

  // 智能讨论分配
  smartDiscussionAssignment: {
    name: 'Smart Discussion Assignment',
    description: 'Intelligently assign discussions to appropriate agents',
    enabled: true,
    triggers: [
      {
        type: 'event',
        event: 'discussion.created'
      }
    ],
    steps: [
      {
        id: 'analyze-topic',
        name: 'Analyze Topic',
        type: 'condition',
        config: {
          conditions: {
            'data.topic': { operator: 'contains', value: 'security' }
          }
        }
      },
      {
        id: 'assign-security',
        name: 'Assign to Security Experts',
        type: 'setVariable',
        config: {
          variables: {
            participants: ['security-analyst', 'security-lead']
          }
        }
      },
      {
        id: 'notify-assignment',
        name: 'Notify Assignment',
        type: 'sendNotification',
        config: {
          message: 'Discussion assigned to {{participants}}',
          target: 'log'
        }
      }
    ]
  },

  // 讨论质量检查
  discussionQualityCheck: {
    name: 'Discussion Quality Check',
    description: 'Check discussion quality and suggest improvements',
    enabled: true,
    triggers: [
      {
        type: 'event',
        event: 'discussion.concluded'
      }
    ],
    steps: [
      {
        id: 'check-message-count',
        name: 'Check Message Count',
        type: 'condition',
        config: {
          conditions: {
            'data.messageCount': { operator: 'lessThan', value: 5 }
          }
        }
      },
      {
        id: 'create-followup',
        name: 'Create Follow-up Discussion',
        type: 'createDiscussion',
        config: {
          topic: 'Review: {{data.topic}} - Low Engagement',
          participants: ['moderator']
        }
      }
    ]
  },

  // 讨论结果同步
  syncDiscussionResults: {
    name: 'Sync Discussion Results',
    description: 'Sync discussion results to multiple integrations',
    enabled: true,
    triggers: [
      {
        type: 'event',
        event: 'discussion.concluded'
      }
    ],
    steps: [
      {
        id: 'sync-to-git',
        name: 'Sync to Git',
        type: 'callAPI',
        config: {
          url: '/api/integrations/git/sync',
          method: 'POST',
          body: {
            discussionId: '{{data.id}}',
            direction: 'push'
          }
        }
      },
      {
        id: 'sync-to-notion',
        name: 'Sync to Notion',
        type: 'callAPI',
        config: {
          url: '/api/integrations/notion/sync',
          method: 'POST',
          body: {
            discussionId: '{{data.id}}'
          }
        }
      },
      {
        id: 'confirm-sync',
        name: 'Confirm Sync',
        type: 'sendNotification',
        config: {
          message: 'Discussion synced to all integrations',
          target: 'log'
        }
      }
    ]
  }
};

/**
 * 工作流模板管理器
 */
class WorkflowTemplateManager {
  constructor() {
    this.templates = new Map(Object.entries(WORKFLOW_TEMPLATES));
    this.customTemplates = new Map();
  }

  /**
   * 获取模板
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || this.customTemplates.get(templateId);
  }

  /**
   * 获取所有模板
   */
  getAllTemplates() {
    return [
      ...Array.from(this.templates.entries()).map(([id, tpl]) => ({ id, ...tpl, builtIn: true })),
      ...Array.from(this.customTemplates.entries()).map(([id, tpl]) => ({ id, ...tpl, builtIn: false }))
    ];
  }

  /**
   * 创建自定义模板
   */
  createTemplate(templateId, config) {
    this.customTemplates.set(templateId, {
      ...config,
      createdAt: Date.now()
    });
  }

  /**
   * 删除自定义模板
   */
  deleteTemplate(templateId) {
    if (this.templates.has(templateId)) {
      throw new Error('Cannot delete built-in template');
    }
    return this.customTemplates.delete(templateId);
  }

  /**
   * 从模板创建工作流
   */
  createFromTemplate(templateId, workflowId, overrides = {}) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const workflow = {
      ...template,
      ...overrides,
      variables: {
        ...template.variables,
        ...overrides.variables
      }
    };

    delete workflow.id;
    delete workflow.createdAt;
    delete workflow.builtIn;

    return workflow;
  }
}

module.exports = {
  WORKFLOW_TEMPLATES,
  WorkflowTemplateManager
};
