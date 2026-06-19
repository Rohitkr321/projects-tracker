const { Notification, ProjectMember, User, Project } = require('../models');
const { emitToUser } = require('./socket.service');
const {
  sendIssueAssignedEmail,
  sendMentionedEmail,
  sendCommentAddedEmail,
  sendSprintStartedEmail,
  sendSprintCompletedEmail,
} = require('./email.service');

/* ─── Helpers ─── */
const getUser = (id) => User.findByPk(id, { attributes: ['id', 'email', 'firstName', 'lastName', 'notificationPreferences'] });
const wantsEmail = (user, key = 'email') => user?.notificationPreferences?.[key] !== false && user?.notificationPreferences?.email !== false;

/* ─── Core create ─── */
const createNotification = async ({ recipientId, actorId, type, title, body, data = {}, link }) => {
  if (recipientId === actorId) return null;
  const notification = await Notification.create({ recipientId, actorId, type, title, body, data, link });
  emitToUser(recipientId, 'notification', notification);
  return notification;
};

/* ─── Issue assigned ─── */
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
  const [recipient, actor] = await Promise.all([getUser(issue.assigneeId), getUser(actorId)]);
  if (recipient && actor && wantsEmail(recipient, 'assignments')) {
    sendIssueAssignedEmail(recipient, issue, actor).catch(() => {});
  }
};

/* ─── Issue updated (watchers) ─── */
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

/* ─── Mentioned in comment ─── */
const notifyMentioned = async (mentionedUserIds, actorId, issueId, issueKey, commentBody) => {
  const actor = await getUser(actorId);
  const issue = { id: issueId, key: issueKey, title: issueKey };
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
    const recipient = await getUser(userId);
    if (recipient && actor && wantsEmail(recipient, 'mentions')) {
      sendMentionedEmail(recipient, issue, actor, commentBody).catch(() => {});
    }
  }
};

/* ─── Comment added (watchers) ─── */
const notifyCommentAdded = async (issue, actorId, watchers = []) => {
  const actor = await getUser(actorId);
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
    const recipient = await getUser(watcher.id);
    if (recipient && actor && wantsEmail(recipient)) {
      sendCommentAddedEmail(recipient, issue, actor).catch(() => {});
    }
  }
};

/* ─── Project-wide broadcast ─── */
const notifyProjectMembers = async ({ projectId, actorId, type, title, body, data = {}, link }) => {
  const members = await ProjectMember.findAll({ where: { projectId }, attributes: ['userId'] });
  await Promise.all(
    members
      .map(m => m.userId)
      .filter(uid => uid !== actorId)
      .map(uid => createNotification({ recipientId: uid, actorId, type, title, body, data, link }))
  );
};

/* ─── Sprint started ─── */
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
  const [members, project] = await Promise.all([
    ProjectMember.findAll({ where: { projectId: sprint.projectId }, attributes: ['userId'] }),
    Project.findByPk(sprint.projectId, { attributes: ['name'] }),
  ]);
  for (const m of members) {
    if (m.userId === actorId) continue;
    const recipient = await getUser(m.userId);
    if (recipient && wantsEmail(recipient)) {
      sendSprintStartedEmail(recipient, sprint, project).catch(() => {});
    }
  }
};

/* ─── Sprint completed ─── */
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
  const [members, project] = await Promise.all([
    ProjectMember.findAll({ where: { projectId: sprint.projectId }, attributes: ['userId'] }),
    Project.findByPk(sprint.projectId, { attributes: ['name'] }),
  ]);
  for (const m of members) {
    if (m.userId === actorId) continue;
    const recipient = await getUser(m.userId);
    if (recipient && wantsEmail(recipient)) {
      sendSprintCompletedEmail(recipient, sprint, project).catch(() => {});
    }
  }
};

module.exports = {
  createNotification,
  notifyIssueAssigned,
  notifyIssueUpdated,
  notifyMentioned,
  notifyCommentAdded,
  notifyProjectMembers,
  notifySprintStarted,
  notifySprintCompleted,
};
