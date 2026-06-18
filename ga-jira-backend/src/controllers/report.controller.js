const { Issue, Sprint, TimeLog, User, WorkflowStatus, Project, ProjectMember } = require('../models');
const { successResponse } = require('../utils/helpers');
const { Op, fn, col, literal } = require('sequelize');

exports.burndown = async (req, res, next) => {
  try {
    const { sprintId } = req.params;
    const sprint = await Sprint.findByPk(sprintId);
    if (!sprint) return successResponse(res, { data: [] });

    const issues = await Issue.findAll({ where: { sprintId }, attributes: ['storyPoints', 'resolvedAt', 'workflowStatusId'] });
    const doneStatuses = await WorkflowStatus.findAll({ where: { category: 'done' }, attributes: ['id'] });
    const doneIds = new Set(doneStatuses.map((s) => s.id));

    const total = issues.reduce((sum, i) => sum + (i.storyPoints || 1), 0);
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate || new Date());
    const days = [];
    let remaining = total;
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const dayStr = curr.toISOString().split('T')[0];
      const resolved = issues.filter((i) => i.resolvedAt && i.resolvedAt.toISOString().split('T')[0] === dayStr && doneIds.has(i.workflowStatusId));
      resolved.forEach((i) => { remaining -= (i.storyPoints || 1); });
      days.push({ date: dayStr, remaining: Math.max(0, remaining), completed: total - remaining });
      curr.setDate(curr.getDate() + 1);
    }
    successResponse(res, { sprint, total, data: days });
  } catch (err) {
    next(err);
  }
};

exports.velocity = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const sprints = await Sprint.findAll({
      where: { projectId, status: 'completed' },
      order: [['completedAt', 'ASC']],
      limit: 10,
    });
    const data = sprints.map((s) => ({
      sprint: s.name,
      committed: s.totalPoints,
      completed: s.completedPoints,
      velocity: s.velocity,
    }));
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

exports.issueDistribution = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const byType = await Issue.findAll({
      where: { projectId },
      attributes: ['type', [fn('COUNT', col('id')), 'count']],
      group: ['type'],
      raw: true,
    });
    const byPriority = await Issue.findAll({
      where: { projectId },
      attributes: ['priority', [fn('COUNT', col('id')), 'count']],
      group: ['priority'],
      raw: true,
    });
    const byStatus = await Issue.findAll({
      where: { projectId },
      attributes: ['workflowStatusId', [fn('COUNT', col('id')), 'count']],
      group: ['workflowStatusId'],
      include: [{ model: WorkflowStatus, as: 'status', attributes: ['name', 'color'] }],
    });
    successResponse(res, { byType, byPriority, byStatus });
  } catch (err) {
    next(err);
  }
};

exports.timeTracking = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate) where.loggedAt = { [Op.gte]: startDate };
    if (endDate) where.loggedAt = { ...where.loggedAt, [Op.lte]: endDate };

    const logs = await TimeLog.findAll({
      where,
      include: [
        { model: Issue, as: 'issue', where: { projectId }, attributes: ['id', 'key', 'title'] },
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['loggedAt', 'DESC']],
    });

    const byUser = {};
    logs.forEach((log) => {
      const key = log.user.id;
      if (!byUser[key]) byUser[key] = { user: log.user, total: 0, logs: [] };
      byUser[key].total += log.timeSpent;
      byUser[key].logs.push(log);
    });

    successResponse(res, { logs, byUser: Object.values(byUser), total: logs.reduce((s, l) => s + l.timeSpent, 0) });
  } catch (err) {
    next(err);
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orgId = req.user.organizationId;
    const isAdmin = ['super_admin', 'org_admin', 'project_manager'].includes(req.user.role);

    if (isAdmin && orgId) {
      // Org-wide stats for supervisors / PMs
      const orgProjects = await Project.findAll({ where: { organizationId: orgId }, attributes: ['id'] });
      const projectIds = orgProjects.map(p => p.id);

      const todoStatuses = await WorkflowStatus.findAll({ where: { category: 'todo' }, attributes: ['id'] });
      const allInProgressStatuses = await WorkflowStatus.findAll({ where: { category: 'in_progress' }, attributes: ['id', 'name'] });
      const doneStatuses = await WorkflowStatus.findAll({ where: { category: 'done' }, attributes: ['id'] });
      const todoIds = todoStatuses.map(s => s.id);
      const inReviewIds = allInProgressStatuses.filter(s => /review/i.test(s.name)).map(s => s.id);
      const inProgressIds = allInProgressStatuses.filter(s => !/review/i.test(s.name)).map(s => s.id);
      const doneIds = doneStatuses.map(s => s.id);

      const baseWhere = projectIds.length ? { projectId: { [Op.in]: projectIds } } : { projectId: null };

      const [
        totalProjects, totalIssues, inProgressCount, overdueCount,
        todoCount, doneCount, activeSprintsCount, totalMembers,
        myTasks, myInProgress, inReviewCount,
      ] = await Promise.all([
        Project.count({ where: { organizationId: orgId } }),
        Issue.count({ where: baseWhere }),
        Issue.count({ where: { ...baseWhere, workflowStatusId: { [Op.in]: inProgressIds.length ? inProgressIds : ['none'] } } }),
        Issue.count({ where: { ...baseWhere, dueDate: { [Op.lt]: new Date() }, resolvedAt: null } }),
        Issue.count({ where: { ...baseWhere, workflowStatusId: { [Op.in]: todoIds.length ? todoIds : ['none'] } } }),
        Issue.count({ where: { ...baseWhere, workflowStatusId: { [Op.in]: doneIds.length ? doneIds : ['none'] } } }),
        Sprint.count({ where: projectIds.length ? { projectId: { [Op.in]: projectIds }, status: 'active' } : { status: 'active' } }),
        User.count({ where: { organizationId: orgId, isActive: true } }),
        // Still show personal tasks for the admin
        Issue.count({ where: { assigneeId: userId, resolvedAt: null } }),
        Issue.count({ where: { assigneeId: userId, workflowStatusId: { [Op.in]: inProgressIds.length ? inProgressIds : ['none'] } } }),
        Issue.count({ where: { ...baseWhere, workflowStatusId: { [Op.in]: inReviewIds.length ? inReviewIds : ['none'] } } }),
      ]);

      return successResponse(res, {
        isAdmin: true,
        totalProjects, totalIssues, inProgressCount, inReviewCount, overdueCount,
        todoCount, doneCount, activeSprintsCount, totalMembers,
        // Personal view too
        myTasks, myInProgress,
        // Legacy fields for components that still use them
        recentActivity: [],
      });
    }

    // Developer / reporter — personal dashboard
    const [myTasks, inProgress, completedToday, overdue] = await Promise.all([
      Issue.count({ where: { assigneeId: userId, resolvedAt: null } }),
      Issue.count({
        where: { assigneeId: userId },
        include: [{ model: WorkflowStatus, as: 'status', where: { category: 'in_progress' } }],
      }),
      Issue.count({ where: { assigneeId: userId, resolvedAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
      Issue.count({ where: { assigneeId: userId, dueDate: { [Op.lt]: new Date() }, resolvedAt: null } }),
    ]);
    successResponse(res, { isAdmin: false, myTasks, inProgress, completedToday, overdue, recentActivity: [] });
  } catch (err) {
    next(err);
  }
};

exports.overview = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const [totalIssues, openIssues, doneIssues, activeSprint, sprints] = await Promise.all([
      Issue.count({ where: { projectId } }),
      Issue.count({ where: { projectId } }),
      Issue.count({ where: { projectId, resolvedAt: { [Op.ne]: null } } }),
      Sprint.findOne({ where: { projectId, status: 'active' } }),
      Sprint.count({ where: { projectId } }),
    ]);
    successResponse(res, { totalIssues, openIssues, doneIssues, activeSprint, sprints });
  } catch (err) {
    next(err);
  }
};
