const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  PROJECT_MANAGER: 'project_manager',
  TEAM_LEAD: 'team_lead',
  DEVELOPER: 'developer',
  REPORTER: 'reporter',
  VIEWER: 'viewer',
};

const ISSUE_TYPES = {
  BUG: 'Bug',
  STORY: 'Story',
  TASK: 'Task',
  EPIC: 'Epic',
  SUBTASK: 'Sub-task',
  RISK: 'Risk',
  INCIDENT: 'Incident',
};

const PRIORITIES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const DEPENDENCY_TYPES = {
  BLOCKS: 'blocks',
  BLOCKED_BY: 'blocked_by',
  RELATES_TO: 'relates_to',
  DUPLICATES: 'duplicates',
  DUPLICATED_BY: 'duplicated_by',
  CLONES: 'clones',
  CLONED_BY: 'cloned_by',
};

const SPRINT_STATUS = {
  FUTURE: 'future',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

const NOTIFICATION_TYPES = {
  ISSUE_ASSIGNED: 'issue_assigned',
  ISSUE_UPDATED: 'issue_updated',
  COMMENT_ADDED: 'comment_added',
  MENTIONED: 'mentioned',
  SPRINT_STARTED: 'sprint_started',
  SPRINT_COMPLETED: 'sprint_completed',
  ISSUE_STATUS_CHANGED: 'issue_status_changed',
  WATCHER_UPDATE: 'watcher_update',
  SLA_BREACH: 'sla_breach',
  MILESTONE_DUE: 'milestone_due',
};

const CUSTOM_FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  SELECT: 'select',
  MULTI_SELECT: 'multi_select',
  USER: 'user',
  URL: 'url',
  CHECKBOX: 'checkbox',
};

const WEBHOOK_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.deleted',
  'issue.status_changed',
  'comment.created',
  'sprint.started',
  'sprint.completed',
  'project.created',
];

module.exports = {
  ROLES,
  ISSUE_TYPES,
  PRIORITIES,
  DEPENDENCY_TYPES,
  SPRINT_STATUS,
  NOTIFICATION_TYPES,
  CUSTOM_FIELD_TYPES,
  WEBHOOK_EVENTS,
};
