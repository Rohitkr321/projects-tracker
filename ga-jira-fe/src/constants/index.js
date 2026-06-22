export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.130:5000/api/v1';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://192.168.0.130:5000';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@ga_jira_access_token',
  REFRESH_TOKEN: '@ga_jira_refresh_token',
  USER: '@ga_jira_user',
  THEME: '@ga_jira_theme',
};

export const ISSUE_TYPES = {
  BUG: 'bug',
  STORY: 'story',
  TASK: 'task',
  EPIC: 'epic',
  SUBTASK: 'subtask',
};

export const ISSUE_TYPE_LABELS = {
  bug: 'Bug',
  story: 'Story',
  task: 'Task',
  epic: 'Epic',
  subtask: 'Subtask',
};

export const PRIORITIES = {
  HIGHEST: 'highest',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  LOWEST: 'lowest',
};

export const PRIORITY_LABELS = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
};

export const STATUS_TYPES = {
  TODO: 'todo',
  IN_PROGRESS: 'inProgress',
  IN_REVIEW: 'inReview',
  DONE: 'done',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
};

export const STATUS_LABELS = {
  todo: 'To Do',
  inProgress: 'In Progress',
  inReview: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
};

export const ROLES = {
  ADMIN: 'admin',
  PROJECT_MANAGER: 'project_manager',
  DEVELOPER: 'developer',
  VIEWER: 'viewer',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  org_admin: 'Org Admin',
  admin: 'Admin',
  project_manager: 'Project Manager',
  team_lead: 'Team Lead',
  developer: 'Developer',
  reporter: 'Reporter',
  viewer: 'Viewer',
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

export const SOCKET_EVENTS = {
  ISSUE_CREATED: 'issue:created',
  ISSUE_UPDATED: 'issue:updated',
  ISSUE_DELETED: 'issue:deleted',
  COMMENT_ADDED: 'comment:added',
  SPRINT_STARTED: 'sprint:started',
  SPRINT_COMPLETED: 'sprint:completed',
  NOTIFICATION: 'notification',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
};

export const NOTIFICATION_TYPES = {
  ISSUE_ASSIGNED: 'issue_assigned',
  ISSUE_COMMENTED: 'issue_commented',
  ISSUE_STATUS_CHANGED: 'issue_status_changed',
  SPRINT_STARTED: 'sprint_started',
  SPRINT_ENDING: 'sprint_ending',
  MENTION: 'mention',
  RELEASE: 'release',
};

export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_WITH_TIME: 'MMM d, yyyy h:mm a',
  INPUT: 'yyyy-MM-dd',
  RELATIVE_THRESHOLD_DAYS: 7,
};

export const BOARD_COLUMN_ORDER = ['todo', 'inProgress', 'inReview', 'done'];

export const CHART_COLORS = [
  '#0052CC',
  '#6554C0',
  '#00875A',
  '#FF8B00',
  '#DE350B',
  '#4C9AFF',
  '#998DD9',
  '#57D9A3',
];
