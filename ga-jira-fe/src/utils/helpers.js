import { PRIORITIES, ISSUE_TYPES, STATUS_TYPES } from '../constants';
import colors from '../theme/colors';

export const getPriorityColor = (priority) => {
  const map = {
    [PRIORITIES.HIGHEST]: colors.priority.highest,
    [PRIORITIES.HIGH]: colors.priority.high,
    [PRIORITIES.MEDIUM]: colors.priority.medium,
    [PRIORITIES.LOW]: colors.priority.low,
    [PRIORITIES.LOWEST]: colors.priority.lowest,
  };
  return map[priority] || colors.text.secondary;
};

export const getStatusColor = (status) => {
  const map = {
    [STATUS_TYPES.TODO]: colors.status.todo,
    [STATUS_TYPES.IN_PROGRESS]: colors.status.inProgress,
    [STATUS_TYPES.IN_REVIEW]: colors.status.inReview,
    [STATUS_TYPES.DONE]: colors.status.done,
    [STATUS_TYPES.BLOCKED]: colors.status.blocked,
    [STATUS_TYPES.CANCELLED]: colors.status.cancelled,
  };
  return map[status] || colors.status.todo;
};

export const getIssueTypeColor = (type) => {
  const map = {
    [ISSUE_TYPES.BUG]: colors.issueType.bug,
    [ISSUE_TYPES.STORY]: colors.issueType.story,
    [ISSUE_TYPES.TASK]: colors.issueType.task,
    [ISSUE_TYPES.EPIC]: colors.issueType.epic,
    [ISSUE_TYPES.SUBTASK]: colors.issueType.subtask,
  };
  return map[type] || colors.issueType.task;
};

export const getIssueTypeIcon = (type) => {
  const map = {
    [ISSUE_TYPES.BUG]: 'bug',
    [ISSUE_TYPES.STORY]: 'bookmark',
    [ISSUE_TYPES.TASK]: 'check-circle',
    [ISSUE_TYPES.EPIC]: 'lightning-bolt',
    [ISSUE_TYPES.SUBTASK]: 'subdirectory-arrow-right',
  };
  return map[type] || 'circle';
};

export const getPriorityIcon = (priority) => {
  const map = {
    [PRIORITIES.HIGHEST]: 'arrow-up-bold',
    [PRIORITIES.HIGH]: 'arrow-up',
    [PRIORITIES.MEDIUM]: 'equal',
    [PRIORITIES.LOW]: 'arrow-down',
    [PRIORITIES.LOWEST]: 'arrow-down-bold',
  };
  return map[priority] || 'equal';
};

export const generateIssueKey = (projectKey, issueNumber) => {
  return `${projectKey}-${issueNumber}`;
};

export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const getAvatarColor = (name) => {
  const avatarColors = [
    '#0052CC', '#6554C0', '#00875A', '#FF8B00',
    '#DE350B', '#4C9AFF', '#998DD9', '#57D9A3',
  ];
  if (!name) return avatarColors[0];
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

const STATUS_NAME_MAP = {
  'to do': 'todo', 'todo': 'todo',
  'in progress': 'inProgress', 'inprogress': 'inProgress',
  'in review': 'inReview', 'inreview': 'inReview',
  'done': 'done', 'completed': 'done',
  'blocked': 'blocked',
  'cancelled': 'cancelled',
};

export const groupIssuesByStatus = (issues) => {
  const grouped = {
    todo: [],
    inProgress: [],
    inReview: [],
    done: [],
    blocked: [],
    cancelled: [],
  };
  issues.forEach((issue) => {
    let statusKey;
    if (issue.status && typeof issue.status === 'object') {
      statusKey = STATUS_NAME_MAP[issue.status.name?.toLowerCase()] || 'todo';
    } else {
      statusKey = issue.status || 'todo';
    }
    if (grouped[statusKey]) {
      grouped[statusKey].push(issue);
    } else {
      grouped.todo.push(issue);
    }
  });
  return grouped;
};

export const calculateBurndownData = (sprint, issues) => {
  if (!sprint || !issues) return { ideal: [], actual: [] };
  const { startDate, endDate, storyPoints = 0 } = sprint;
  if (!startDate || !endDate) return { ideal: [], actual: [] };

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  const totalPoints = storyPoints;

  const ideal = Array.from({ length: totalDays + 1 }, (_, i) => ({
    day: i,
    points: Math.round(totalPoints - (totalPoints / totalDays) * i),
  }));

  return { ideal, actual: [] };
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
