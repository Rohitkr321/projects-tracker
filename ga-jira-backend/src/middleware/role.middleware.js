const { ProjectMember, TeamMember } = require('../models');
const { errorResponse } = require('../utils/helpers');

const ROLE_HIERARCHY = {
  super_admin: 7,
  org_admin: 6,
  project_manager: 5,
  team_lead: 4,
  developer: 3,
  reporter: 2,
  viewer: 1,
};

const requireRole = (...roles) => (req, res, next) => {
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const required = Math.max(...roles.map((r) => ROLE_HIERARCHY[r] || 0));
  if (userLevel >= required) return next();
  return errorResponse(res, 'Insufficient permissions', 403);
};

const requireProjectRole = (...roles) => async (req, res, next) => {
  if (['super_admin', 'org_admin'].includes(req.user.role)) return next();
  const projectId = req.params.projectId || req.body.projectId;
  if (!projectId) return errorResponse(res, 'Project ID required', 400);
  const membership = await ProjectMember.findOne({ where: { projectId, userId: req.user.id } });
  if (!membership) return errorResponse(res, 'Not a project member', 403);
  const userLevel = ROLE_HIERARCHY[membership.role] || 0;
  const required = Math.max(...roles.map((r) => ROLE_HIERARCHY[r] || 0));
  if (userLevel >= required) {
    req.projectRole = membership.role;
    return next();
  }
  return errorResponse(res, 'Insufficient project permissions', 403);
};

module.exports = { requireRole, requireProjectRole, ROLE_HIERARCHY };
