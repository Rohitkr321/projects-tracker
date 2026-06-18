const { Op } = require('sequelize');
const {
  Issue, User, WorkflowStatus, Sprint, Epic, Label, IssueLabel, IssueWatcher,
  Comment, Attachment, TimeLog, ActivityLog, CustomFieldValue, IssueDependency, Project,
} = require('../models');
const { successResponse, errorResponse, paginate, paginateResponse } = require('../utils/helpers');
const { generateIssueKey } = require('../utils/issueKey');
const { notifyIssueAssigned, notifyIssueUpdated, notifyCommentAdded } = require('../services/notification.service');
const { emitToProject, emitToIssue } = require('../services/socket.service');
const { triggerWebhooks } = require('../services/webhook.service');

const ISSUE_INCLUDES = [
  { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
  { model: User, as: 'reporter', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
  { model: WorkflowStatus, as: 'status' },
  { model: Sprint, as: 'sprint', attributes: ['id', 'name', 'status'] },
  { model: Epic, as: 'epic', attributes: ['id', 'name', 'color'] },
  { model: Label, as: 'labels', through: { attributes: [] } },
  { model: User, as: 'watchers', through: { attributes: [] }, attributes: ['id', 'firstName', 'lastName', 'avatar'] },
];

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, projectId, sprintId, noSprint, epicId, assigneeId, statusId, type, priority, label, search } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    if (sprintId) where.sprintId = sprintId;
    if (noSprint === 'true') where.sprintId = null;
    if (epicId) where.epicId = epicId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (statusId) where.workflowStatusId = statusId;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (search) where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { key: { [Op.like]: `%${search}%` } },
    ];

    const { count, rows } = await Issue.findAndCountAll({
      where,
      ...paginate(page, limit),
      include: ISSUE_INCLUDES,
      order: [['position', 'ASC'], ['createdAt', 'DESC']],
      distinct: true,
    });
    successResponse(res, paginateResponse(rows, count, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId, {
      include: [
        ...ISSUE_INCLUDES,
        { model: Issue, as: 'subtasks', include: [{ model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] }, { model: WorkflowStatus, as: 'status' }] },
        { model: Issue, as: 'parent', attributes: ['id', 'key', 'title'] },
        { model: Comment, as: 'comments', include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'ASC']] },
        { model: Attachment, as: 'attachments', include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }] },
        { model: TimeLog, as: 'timeLogs', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] },
        { model: ActivityLog, as: 'activities', include: [{ model: User, as: 'actor', attributes: ['id', 'firstName', 'lastName', 'avatar'] }], order: [['createdAt', 'DESC']] },
        { model: IssueDependency, as: 'dependencies' },
        { model: CustomFieldValue, as: 'customFieldValues' },
      ],
    });
    if (!issue) return errorResponse(res, 'Issue not found', 404);
    successResponse(res, issue);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { projectId, sprintId, epicId, parentId, milestoneId, releaseId, assigneeId, workflowStatusId,
      title, description, type, priority, storyPoints, originalEstimate, dueDate, startDate,
      labelIds, customFields, environment, stepsToReproduce, acceptanceCriteria } = req.body;

    const key = await generateIssueKey(projectId);

    const issue = await Issue.create({
      projectId, sprintId, epicId, parentId, milestoneId, releaseId, assigneeId,
      workflowStatusId, title, description, type, priority, storyPoints, originalEstimate,
      dueDate, startDate, environment, stepsToReproduce, acceptanceCriteria,
      reporterId: req.user.id, key,
    });

    if (labelIds?.length) {
      await IssueLabel.bulkCreate(labelIds.map((labelId) => ({ issueId: issue.id, labelId })));
    }
    if (customFields) {
      for (const [fieldId, value] of Object.entries(customFields)) {
        await CustomFieldValue.upsert({ customFieldId: fieldId, issueId: issue.id, value: String(value) });
      }
    }
    await IssueWatcher.create({ issueId: issue.id, userId: req.user.id });
    if (assigneeId && assigneeId !== req.user.id) {
      await IssueWatcher.findOrCreate({ where: { issueId: issue.id, userId: assigneeId } });
    }

    if (req.files?.length) {
      await Attachment.bulkCreate(req.files.map(f => ({
        issueId: issue.id,
        uploadedById: req.user.id,
        filename: f.filename,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        url: `/uploads/${f.filename}`,
      })));
    }

    await ActivityLog.create({ issueId: issue.id, projectId, actorId: req.user.id, action: 'created' });

    if (assigneeId) await notifyIssueAssigned(issue, req.user.id);

    const fullIssue = await Issue.findByPk(issue.id, { include: ISSUE_INCLUDES });
    emitToProject(projectId, 'issue:created', fullIssue);
    await triggerWebhooks(projectId, 'issue.created', fullIssue);

    successResponse(res, fullIssue, 'Issue created', 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId, { include: [{ model: User, as: 'watchers' }] });
    if (!issue) return errorResponse(res, 'Issue not found', 404);

    const oldAssigneeId = issue.assigneeId;

    const updatableFields = ['sprintId', 'epicId', 'parentId', 'milestoneId', 'releaseId', 'assigneeId',
      'workflowStatusId', 'title', 'description', 'type', 'priority', 'storyPoints', 'originalEstimate',
      'timeRemaining', 'dueDate', 'startDate', 'environment', 'stepsToReproduce', 'acceptanceCriteria', 'resolution'];

    const changes = [];
    for (const field of updatableFields) {
      if (req.body[field] !== undefined && String(req.body[field]) !== String(issue[field])) {
        changes.push({ field, oldValue: String(issue[field] || ''), newValue: String(req.body[field] || '') });
      }
    }

    await issue.update(req.body);

    if (req.body.workflowStatusId) {
      const status = await WorkflowStatus.findByPk(req.body.workflowStatusId);
      if (status?.isFinal && !issue.resolvedAt) await issue.update({ resolvedAt: new Date() });
    }

    if (req.body.labelIds !== undefined) {
      await IssueLabel.destroy({ where: { issueId: issue.id } });
      if (req.body.labelIds.length) {
        await IssueLabel.bulkCreate(req.body.labelIds.map((labelId) => ({ issueId: issue.id, labelId })));
      }
    }

    for (const change of changes) {
      await ActivityLog.create({
        issueId: issue.id, projectId: issue.projectId, actorId: req.user.id,
        action: 'updated', field: change.field, oldValue: change.oldValue, newValue: change.newValue,
      });
    }

    if (req.body.assigneeId && req.body.assigneeId !== oldAssigneeId) {
      await notifyIssueAssigned(issue, req.user.id);
      await IssueWatcher.findOrCreate({ where: { issueId: issue.id, userId: req.body.assigneeId } });
    }

    await notifyIssueUpdated(issue, req.user.id, issue.watchers);

    const updated = await Issue.findByPk(issue.id, { include: ISSUE_INCLUDES });
    emitToIssue(issue.id, 'issue:updated', updated);
    emitToProject(issue.projectId, 'issue:updated', updated);
    await triggerWebhooks(issue.projectId, 'issue.updated', updated);

    successResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const issue = await Issue.findByPk(req.params.issueId);
    if (!issue) return errorResponse(res, 'Issue not found', 404);
    await issue.destroy();
    emitToProject(issue.projectId, 'issue:deleted', { id: issue.id });
    await triggerWebhooks(issue.projectId, 'issue.deleted', { id: issue.id, key: issue.key });
    successResponse(res, null, 'Issue deleted');
  } catch (err) {
    next(err);
  }
};

exports.updatePosition = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { position, workflowStatusId, sprintId } = req.body;
    const issue = await Issue.findByPk(issueId);
    if (!issue) return errorResponse(res, 'Issue not found', 404);
    await issue.update({ position, workflowStatusId, sprintId });
    emitToProject(issue.projectId, 'issue:moved', { id: issue.id, position, workflowStatusId, sprintId });
    successResponse(res, issue);
  } catch (err) {
    next(err);
  }
};

exports.addWatcher = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    await IssueWatcher.findOrCreate({ where: { issueId, userId: req.user.id } });
    successResponse(res, null, 'Watching issue');
  } catch (err) {
    next(err);
  }
};

exports.removeWatcher = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    await IssueWatcher.destroy({ where: { issueId, userId: req.user.id } });
    successResponse(res, null, 'Stopped watching');
  } catch (err) {
    next(err);
  }
};

exports.addDependency = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { dependsOnId, type } = req.body;
    if (issueId === dependsOnId) return errorResponse(res, 'Cannot depend on itself', 400);
    const dep = await IssueDependency.create({ issueId, dependsOnId, type });
    successResponse(res, dep, 'Dependency added', 201);
  } catch (err) {
    next(err);
  }
};

exports.removeDependency = async (req, res, next) => {
  try {
    await IssueDependency.destroy({ where: { id: req.params.depId } });
    successResponse(res, null, 'Dependency removed');
  } catch (err) {
    next(err);
  }
};
