const { Issue, Project, User, Epic, Sprint } = require('../models');
const { successResponse } = require('../utils/helpers');
const { Op } = require('sequelize');

exports.globalSearch = async (req, res, next) => {
  try {
    const { q, projectId } = req.query;
    if (!q || q.length < 2) return successResponse(res, { issues: [], projects: [], users: [] });

    const issueWhere = {
      [Op.or]: [{ title: { [Op.like]: `%${q}%` } }, { key: { [Op.like]: `%${q}%` } }],
    };
    if (projectId) issueWhere.projectId = projectId;

    const [issues, projects, users] = await Promise.all([
      Issue.findAll({ where: issueWhere, limit: 10, attributes: ['id', 'key', 'title', 'type', 'priority', 'projectId'] }),
      Project.findAll({
        where: { organizationId: req.user.organizationId, name: { [Op.like]: `%${q}%` } },
        limit: 5, attributes: ['id', 'name', 'key', 'avatar'],
      }),
      User.findAll({
        where: {
          organizationId: req.user.organizationId,
          [Op.or]: [
            { firstName: { [Op.like]: `%${q}%` } },
            { lastName: { [Op.like]: `%${q}%` } },
            { email: { [Op.like]: `%${q}%` } },
          ],
        },
        limit: 5, attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
      }),
    ]);
    successResponse(res, { issues, projects, users });
  } catch (err) {
    next(err);
  }
};
