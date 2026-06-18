import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  parseISO,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { DATE_FORMATS } from '../constants';

export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, DATE_FORMATS.DISPLAY);
  } catch {
    return '';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, DATE_FORMATS.DISPLAY_WITH_TIME);
  } catch {
    return '';
  }
};

export const formatRelative = (dateString) => {
  if (!dateString) return '';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isToday(date)) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    if (isThisWeek(date)) {
      return format(date, 'EEEE');
    }
    if (differenceInDays(new Date(), date) < DATE_FORMATS.RELATIVE_THRESHOLD_DAYS) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return formatDate(dateString);
  } catch {
    return '';
  }
};

export const formatInputDate = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, DATE_FORMATS.INPUT);
  } catch {
    return '';
  }
};

export const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  try {
    const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    return isBefore(endOfDay(date), new Date());
  } catch {
    return false;
  }
};

export const isDueSoon = (dueDate, days = 3) => {
  if (!dueDate) return false;
  try {
    const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
    const threshold = addDays(new Date(), days);
    return isAfter(date, new Date()) && isBefore(date, threshold);
  } catch {
    return false;
  }
};

export const getSprintProgress = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    const now = new Date();
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  } catch {
    return 0;
  }
};

export const formatDuration = (minutes) => {
  if (!minutes) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

export const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  try {
    const date = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    const days = differenceInDays(startOfDay(date), startOfDay(new Date()));
    return days;
  } catch {
    return null;
  }
};
