const { Milestone, Issue, WorkflowStatus } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const milestones = await Milestone.findAll({ where: { projectId: req.params.projectId }, order: [['dueDate', 'ASC']] });
    successResponse(res, milestones);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, dueDate } = req.body;
    const m = await Milestone.create({ name, description, dueDate, projectId: req.params.projectId });
    successResponse(res, m, 'Milestone created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const m = await Milestone.findByPk(req.params.milestoneId);
    if (!m) return errorResponse(res, 'Milestone not found', 404);
    await m.update(req.body);
    successResponse(res, m);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const m = await Milestone.findByPk(req.params.milestoneId);
    if (!m) return errorResponse(res, 'Milestone not found', 404);
    await m.destroy();
    successResponse(res, null, 'Milestone deleted');
  } catch (err) { next(err); }
};
