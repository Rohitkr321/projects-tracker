const { User, Organization, Issue } = require('../models');
const { successResponse, errorResponse, paginate, paginateResponse } = require('../utils/helpers');
const { Op, fn, col } = require('sequelize');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, role } = req.query;
    const where = { organizationId: req.user.organizationId };
    if (search) where[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ];
    if (role) where.role = role;
    const { count, rows } = await User.findAndCountAll({
      where,
      ...paginate(page, limit),
      order: [['firstName', 'ASC']],
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken'] },
    });

    // Attach open/done issue counts for team monitoring
    const userIds = rows.map(u => u.id);
    let openMap = {}, doneMap = {};
    if (userIds.length) {
      const [openCounts, doneCounts] = await Promise.all([
        Issue.findAll({
          where: { assigneeId: { [Op.in]: userIds }, resolvedAt: null },
          attributes: ['assigneeId', [fn('COUNT', col('id')), 'cnt']],
          group: ['assigneeId'],
          raw: true,
        }),
        Issue.findAll({
          where: { assigneeId: { [Op.in]: userIds }, resolvedAt: { [Op.ne]: null } },
          attributes: ['assigneeId', [fn('COUNT', col('id')), 'cnt']],
          group: ['assigneeId'],
          raw: true,
        }),
      ]);
      openMap = Object.fromEntries(openCounts.map(r => [r.assigneeId, parseInt(r.cnt, 10)]));
      doneMap = Object.fromEntries(doneCounts.map(r => [r.assigneeId, parseInt(r.cnt, 10)]));
    }
    const usersWithStats = rows.map(u => ({
      ...u.toJSON(),
      openIssues: openMap[u.id] || 0,
      doneIssues: doneMap[u.id] || 0,
    }));

    successResponse(res, paginateResponse(usersWithStats, count, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken'] },
      include: [{ model: Organization, as: 'organization', attributes: ['id', 'name', 'slug'] }],
    });
    if (!user) return errorResponse(res, 'User not found', 404);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, timezone, notificationPreferences } = req.body;
    const updates = { firstName, lastName, timezone, notificationPreferences };
    if (req.file) updates.avatar = `/uploads/${req.file.filename}`;
    const user = await req.user.update(updates);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return errorResponse(res, 'User not found', 404);
    await user.update({ role, isActive });
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return successResponse(res, []);
    const users = await User.findAll({
      where: {
        organizationId: req.user.organizationId,
        [Op.or]: [
          { firstName: { [Op.like]: `%${q}%` } },
          { lastName: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
        ],
        isActive: true,
      },
      limit: 10,
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'role'],
    });
    successResponse(res, users);
  } catch (err) {
    next(err);
  }
};
