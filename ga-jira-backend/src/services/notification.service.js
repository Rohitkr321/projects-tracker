const { Notification, ProjectMember } = require('../models');
const { emitToUser } = require('./socket.service');

const createNotification = async ({ recipientId, actorId, type, title, body, data = {}, link }) => {
  if (recipientId === actorId) return null;
  const notification = await Notification.create({ recipientId, actorId, type, title, body, data, link });
  emitToUser(recipientId, 'notification', notification);
  return notification;
};

const notifyIssueAssigned = async (issue, actorId) => {
  if (!issue.assigneeId) return;
  await createNotification({
    recipientId: issue.assigneeId,
    actorId,
    type: 'issue_assigned',
    title: 'Issue assigned to you',
    body: `${issue.key}: ${issue.title}`,
    data: { issueId: issue.id, issueKey: issue.key },
    link: `/issues/${issue.id}`,
  });
};

const notifyIssueUpdated = async (issue, actorId, watchers = []) => {
  for (const watcher of watchers) {
    await createNotification({
      recipientId: watcher.id,
      actorId,
      type: 'issue_updated',
      title: `Issue updated: ${issue.key}`,
      body: issue.title,
      data: { issueId: issue.id, issueKey: issue.key },
      link: `/issues/${issue.id}`,
    });
  }
};

const notifyMentioned = async (mentionedUserIds, actorId, issueId, issueKey) => {
  for (const userId of mentionedUserIds) {
    await createNotification({
      recipientId: userId,
      actorId,
      type: 'mentioned',
      title: 'You were mentioned',
      body: `You were mentioned in ${issueKey}`,
      data: { issueId, issueKey },
      link: `/issues/${issueId}`,
    });
  }
};

const notifyCommentAdded = async (issue, actorId, watchers = []) => {
  for (const watcher of watchers) {
    await createNotification({
      recipientId: watcher.id,
      actorId,
      type: 'comment_added',
      title: `New comment on ${issue.key}`,
      body: issue.title,
      data: { issueId: issue.id, issueKey: issue.key },
      link: `/issues/${issue.id}`,
    });
  }
};

const notifyProjectMembers = async ({ projectId, actorId, type, title, body, data = {}, link }) => {
  const members = await ProjectMember.findAll({ where: { projectId }, attributes: ['userId'] });
  await Promise.all(
    members
      .map(m => m.userId)
      .filter(uid => uid !== actorId)
      .map(uid => createNotification({ recipientId: uid, actorId, type, title, body, data, link }))
  );
};

const notifySprintStarted = async (sprint, actorId) => {
  await notifyProjectMembers({
    projectId: sprint.projectId,
    actorId,
    type: 'sprint_started',
    title: `Sprint started: ${sprint.name}`,
    body: sprint.goal || `Sprint "${sprint.name}" is now active`,
    data: { sprintId: sprint.id, projectId: sprint.projectId },
    link: `/project/${sprint.projectId}/sprint?sprintId=${sprint.id}`,
  });
};

const notifySprintCompleted = async (sprint, actorId) => {
  await notifyProjectMembers({
    projectId: sprint.projectId,
    actorId,
    type: 'sprint_completed',
    title: `Sprint completed: ${sprint.name}`,
    body: `Velocity: ${sprint.velocity || 0} story points`,
    data: { sprintId: sprint.id, projectId: sprint.projectId },
    link: `/project/${sprint.projectId}/sprint?sprintId=${sprint.id}`,
  });
};

module.exports = { createNotification, notifyIssueAssigned, notifyIssueUpdated, notifyMentioned, notifyCommentAdded, notifySprintStarted, notifySprintCompleted };
