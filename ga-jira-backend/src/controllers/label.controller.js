const { Label } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const labels = await Label.findAll({ where: { projectId: req.params.projectId }, order: [['name', 'ASC']] });
    successResponse(res, labels);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, color, description } = req.body;
    if (!name?.trim()) return errorResponse(res, 'Label name is required', 400);
    const label = await Label.create({ name: name.trim(), color: color || '#3B82F6', description, projectId: req.params.projectId });
    successResponse(res, label, 'Label created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const label = await Label.findByPk(req.params.labelId);
    if (!label) return errorResponse(res, 'Label not found', 404);
    await label.update(req.body);
    successResponse(res, label);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const label = await Label.findByPk(req.params.labelId);
    if (!label) return errorResponse(res, 'Label not found', 404);
    await label.destroy();
    successResponse(res, null, 'Label deleted');
  } catch (err) { next(err); }
};
