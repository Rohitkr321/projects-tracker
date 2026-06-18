const { TimeLog, Issue, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.create = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { timeSpent, description, loggedAt } = req.body;
    const issue = await Issue.findByPk(issueId);
    if (!issue) return errorResponse(res, 'Issue not found', 404);
    const log = await TimeLog.create({ issueId, userId: req.user.id, timeSpent, description, loggedAt: loggedAt || new Date() });
    await issue.increment('timeSpent', { by: timeSpent });
    const full = await TimeLog.findByPk(log.id, { include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] });
    successResponse(res, full, 'Time logged', 201);
  } catch (err) {
    next(err);
  }
};

exports.getForIssue = async (req, res, next) => {
  try {
    const logs = await TimeLog.findAll({
      where: { issueId: req.params.issueId },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar'] }],
      order: [['loggedAt', 'DESC']],
    });
    successResponse(res, logs);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const log = await TimeLog.findByPk(req.params.logId);
    if (!log) return errorResponse(res, 'Time log not found', 404);
    if (log.userId !== req.user.id && !['super_admin', 'org_admin', 'project_manager'].includes(req.user.role)) {
      return errorResponse(res, 'Forbidden', 403);
    }
    const issue = await Issue.findByPk(log.issueId);
    if (issue) await issue.decrement('timeSpent', { by: log.timeSpent });
    await log.destroy();
    successResponse(res, null, 'Time log deleted');
  } catch (err) {
    next(err);
  }
};
