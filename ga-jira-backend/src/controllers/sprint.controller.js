const { Sprint, Issue, WorkflowStatus, User } = require('../models');
const { successResponse, errorResponse, paginate, paginateResponse } = require('../utils/helpers');
const { emitToProject } = require('../services/socket.service');
const { notifySprintStarted, notifySprintCompleted } = require('../services/notification.service');

exports.getAll = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { count, rows } = await Sprint.findAndCountAll({
      where: { projectId },
      include: [{ model: Issue, as: 'issues', attributes: ['id'] }],
      order: [['order', 'ASC'], ['createdAt', 'ASC']],
      ...paginate(page, limit),
    });
    successResponse(res, paginateResponse(rows, count, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.getActive = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const sprint = await Sprint.findOne({
      where: { projectId, status: 'active' },
      include: [{
        model: Issue, as: 'issues',
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
          { model: WorkflowStatus, as: 'status' },
        ],
      }],
    });
    successResponse(res, sprint || null);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId, {
      include: [{
        model: Issue, as: 'issues',
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
          { model: WorkflowStatus, as: 'status' },
        ],
      }],
    });
    if (!sprint) return errorResponse(res, 'Sprint not found', 404);
    successResponse(res, sprint);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, goal, startDate, endDate } = req.body;
    const { projectId } = req.params;
    const count = await Sprint.count({ where: { projectId } });
    const sprint = await Sprint.create({ name, goal, startDate, endDate, projectId, order: count });
    successResponse(res, sprint, 'Sprint created', 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return errorResponse(res, 'Sprint not found', 404);
    await sprint.update(req.body);
    successResponse(res, sprint);
  } catch (err) {
    next(err);
  }
};

exports.start = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return errorResponse(res, 'Sprint not found', 404);
    const active = await Sprint.findOne({ where: { projectId: sprint.projectId, status: 'active' } });
    if (active) return errorResponse(res, 'Another sprint is already active', 400);
    await sprint.update({ status: 'active', startDate: sprint.startDate || new Date() });
    emitToProject(sprint.projectId, 'sprint:started', sprint);
    notifySprintStarted(sprint, req.user.id).catch(() => {});
    successResponse(res, sprint, 'Sprint started');
  } catch (err) {
    next(err);
  }
};

exports.complete = async (req, res, next) => {
  try {
    const { moveToSprintId } = req.body;
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return errorResponse(res, 'Sprint not found', 404);
    if (sprint.status !== 'active') return errorResponse(res, 'Sprint is not active', 400);

    const doneStatuses = await WorkflowStatus.findAll({ where: { category: 'done' } });
    const doneIds = doneStatuses.map((s) => s.id);
    const { Op } = require('sequelize');
    const openIssues = await Issue.findAll({
      where: { sprintId: sprint.id, workflowStatusId: { [Op.notIn]: doneIds } },
    });

    if (moveToSprintId && openIssues.length) {
      await Issue.update({ sprintId: moveToSprintId }, { where: { id: openIssues.map((i) => i.id) } });
    } else if (openIssues.length) {
      await Issue.update({ sprintId: null }, { where: { id: openIssues.map((i) => i.id) } });
    }

    const completedIssues = await Issue.findAll({ where: { sprintId: sprint.id, workflowStatusId: { [Op.in]: doneIds } } });
    const completedPoints = completedIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    await sprint.update({ status: 'completed', completedAt: new Date(), completedPoints, velocity: completedPoints });
    emitToProject(sprint.projectId, 'sprint:completed', sprint);
    notifySprintCompleted(sprint, req.user.id).catch(() => {});
    successResponse(res, sprint, 'Sprint completed');
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return errorResponse(res, 'Sprint not found', 404);
    if (sprint.status === 'active') return errorResponse(res, 'Cannot delete an active sprint', 400);
    await Issue.update({ sprintId: null }, { where: { sprintId: sprint.id } });
    await sprint.destroy();
    successResponse(res, null, 'Sprint deleted');
  } catch (err) {
    next(err);
  }
};

exports.getBurndown = async (req, res, next) => {
  try {
    const sprint = await Sprint.findByPk(req.params.sprintId);
    if (!sprint) return errorResponse(res, 'Sprint not found', 404);
    const issues = await Issue.findAll({ where: { sprintId: sprint.id } });
    const total = issues.reduce((sum, i) => sum + (i.storyPoints || 1), 0);
    successResponse(res, { sprint, totalPoints: total, completedPoints: sprint.completedPoints || 0, velocity: sprint.velocity });
  } catch (err) {
    next(err);
  }
};
