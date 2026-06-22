const { Project, ProjectMember, User, Issue, Workflow, WorkflowStatus, Board, BoardColumn, Sprint, Epic, Label } = require('../models');
const { successResponse, errorResponse, paginate, paginateResponse } = require('../utils/helpers');
const { Op, fn, col } = require('sequelize');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const where = { organizationId: req.user.organizationId };
    if (search) where.name = { [Op.like]: `%${search}%` };
    // Never expose deleted projects.
    // status=all → active + on_hold + archived together (default for project list)
    // status=active → active + on_hold only (dashboard use)
    // status=archived → archived only
    if (status === 'all') {
      where.status = { [Op.in]: ['active', 'on_hold', 'archived'] };
    } else if (status && status !== 'deleted') {
      where.status = status;
    } else {
      where.status = { [Op.in]: ['active', 'on_hold'] };
    }

    // org_admin and project_manager at org level see all org projects
    if (!['super_admin', 'org_admin', 'project_manager'].includes(req.user.role)) {
      const memberProjectIds = await ProjectMember.findAll({
        where: { userId: req.user.id },
        attributes: ['projectId'],
      });
      where.id = { [Op.in]: memberProjectIds.length ? memberProjectIds.map((m) => m.projectId) : ['none'] };
    }

    const { count, rows } = await Project.findAndCountAll({
      where,
      ...paginate(page, limit),
      include: [
        { model: User, as: 'lead', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Attach issue + member counts to each project card
    const projectIds = rows.map(p => p.id);
    let issueMap = {}, memberMap = {};
    if (projectIds.length) {
      const [issueCounts, memberCounts] = await Promise.all([
        Issue.findAll({
          where: { projectId: { [Op.in]: projectIds } },
          attributes: ['projectId', [fn('COUNT', col('id')), 'cnt']],
          group: ['projectId'],
          raw: true,
        }),
        ProjectMember.findAll({
          where: { projectId: { [Op.in]: projectIds } },
          attributes: ['projectId', [fn('COUNT', col('id')), 'cnt']],
          group: ['projectId'],
          raw: true,
        }),
      ]);
      issueMap  = Object.fromEntries(issueCounts.map(r  => [r.projectId, parseInt(r.cnt, 10)]));
      memberMap = Object.fromEntries(memberCounts.map(r => [r.projectId, parseInt(r.cnt, 10)]));
    }
    const rowsWithCounts = rows.map(p => ({
      ...p.toJSON(),
      issueCount:  issueMap[p.id]  || 0,
      memberCount: memberMap[p.id] || 0,
    }));
    successResponse(res, paginateResponse(rowsWithCounts, count, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId, {
      include: [
        { model: User, as: 'lead', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: ProjectMember, as: 'memberships', include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar', 'role'] }] },
      ],
    });
    if (!project || project.status === 'deleted') return errorResponse(res, 'Project not found', 404);
    successResponse(res, project);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, key, description, type, teamId, leadId, startDate, endDate, isPrivate, color } = req.body;
    const existingKey = await Project.findOne({ where: { organizationId: req.user.organizationId, key: key.toUpperCase() } });
    if (existingKey) return errorResponse(res, 'Project key already exists in this organization', 409);

    const project = await Project.create({
      name, key: key.toUpperCase(), description, type, teamId, leadId, startDate, endDate, isPrivate,
      color: color || '#0F2557',
      organizationId: req.user.organizationId,
    });

    await ProjectMember.create({ projectId: project.id, userId: req.user.id, role: 'project_manager' });

    const workflow = await Workflow.create({ projectId: project.id, name: 'Default Workflow', isDefault: true, appliesTo: [] });
    const statuses = await WorkflowStatus.bulkCreate([
      { workflowId: workflow.id, name: 'To Do', color: '#6B7280', category: 'todo', order: 0, isInitial: true },
      { workflowId: workflow.id, name: 'In Progress', color: '#3B82F6', category: 'in_progress', order: 1 },
      { workflowId: workflow.id, name: 'In Review', color: '#F59E0B', category: 'in_progress', order: 2 },
      { workflowId: workflow.id, name: 'Done', color: '#10B981', category: 'done', order: 3, isFinal: true },
    ]);

    const board = await Board.create({ projectId: project.id, name: 'Main Board', type, isDefault: true });
    await BoardColumn.bulkCreate(
      statuses.map((s, i) => ({ boardId: board.id, workflowStatusId: s.id, name: s.name, order: i }))
    );

    await Label.bulkCreate([
      { projectId: project.id, name: 'frontend', color: '#3B82F6' },
      { projectId: project.id, name: 'backend', color: '#10B981' },
      { projectId: project.id, name: 'urgent', color: '#EF4444' },
    ]);

    successResponse(res, project, 'Project created successfully', 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { name, description, type, teamId, leadId, startDate, endDate, isPrivate, status, settings, color } = req.body;
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return errorResponse(res, 'Project not found', 404);
    await project.update({ name, description, type, teamId, leadId, startDate, endDate, isPrivate, status, settings, color });
    if (req.file) await project.update({ avatar: `/uploads/${req.file.filename}` });
    successResponse(res, project);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.projectId);
    if (!project || project.status === 'deleted') return errorResponse(res, 'Project not found', 404);
    await project.update({ status: 'deleted' });
    successResponse(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    let { userId, email, role = 'developer' } = req.body;
    const { projectId } = req.params;

    if (!userId && email) {
      const found = await User.findOne({ where: { email }, attributes: ['id'] });
      if (!found) return errorResponse(res, 'No user found with that email address', 404);
      userId = found.id;
    }

    if (!userId) return errorResponse(res, 'userId or email is required', 400);

    const [member, created] = await ProjectMember.findOrCreate({
      where: { projectId, userId },
      defaults: { role },
    });
    if (!created) await member.update({ role });
    const user = await User.findByPk(userId, { attributes: ['id', 'firstName', 'lastName', 'avatar', 'email'] });
    successResponse(res, { ...member.toJSON(), user }, created ? 'Member added' : 'Member updated', created ? 201 : 200);
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;
    await ProjectMember.destroy({ where: { projectId, userId } });
    successResponse(res, null, 'Member removed');
  } catch (err) {
    next(err);
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const members = await ProjectMember.findAll({
      where: { projectId },
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'avatar', 'email', 'role'] }],
    });

    // Always include org-level admins/PMs so they can be assigned to any issue
    const project = await Project.findByPk(projectId, { attributes: ['organizationId'] });
    if (project) {
      const memberUserIds = members.map(m => m.userId);
      const orgAdmins = await User.findAll({
        where: {
          organizationId: project.organizationId,
          role: { [Op.in]: ['super_admin', 'org_admin', 'project_manager'] },
          id: { [Op.notIn]: memberUserIds.length ? memberUserIds : ['none'] },
          isActive: true,
        },
        attributes: ['id', 'firstName', 'lastName', 'avatar', 'email', 'role'],
      });
      // Append as virtual members (no ProjectMember row)
      orgAdmins.forEach(u => members.push({ id: `org-${u.id}`, projectId, userId: u.id, role: u.role, user: u }));
    }

    successResponse(res, members);
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const { Issue, Sprint, Workflow, WorkflowStatus } = require('../models');
    const { Op } = require('sequelize');
    const { projectId } = req.params;

    const workflows = await Workflow.findAll({ where: { projectId }, include: [{ model: WorkflowStatus, as: 'statuses', where: { category: 'done' }, required: false }] });
    const doneStatusIds = workflows.flatMap((w) => (w.statuses || []).map((s) => s.id));

    const [totalIssues, doneIssues, activeSprint, totalSprints] = await Promise.all([
      Issue.count({ where: { projectId } }),
      doneStatusIds.length
        ? Issue.count({ where: { projectId, workflowStatusId: { [Op.in]: doneStatusIds } } })
        : 0,
      Sprint.findOne({ where: { projectId, status: 'active' } }),
      Sprint.count({ where: { projectId } }),
    ]);
    successResponse(res, { totalIssues, doneIssues, activeSprint, sprints: totalSprints });
  } catch (err) {
    next(err);
  }
};
