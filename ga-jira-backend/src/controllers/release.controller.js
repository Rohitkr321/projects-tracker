const { Release, Issue } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const releases = await Release.findAll({ where: { projectId: req.params.projectId }, order: [['createdAt', 'DESC']] });
    successResponse(res, releases);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, version, description, releaseDate } = req.body;
    const r = await Release.create({ name, version, description, releaseDate, projectId: req.params.projectId });
    successResponse(res, r, 'Release created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const r = await Release.findByPk(req.params.releaseId);
    if (!r) return errorResponse(res, 'Release not found', 404);
    await r.update(req.body);
    successResponse(res, r);
  } catch (err) { next(err); }
};

exports.release = async (req, res, next) => {
  try {
    const r = await Release.findByPk(req.params.releaseId);
    if (!r) return errorResponse(res, 'Release not found', 404);
    await r.update({ status: 'released', releasedAt: new Date() });
    successResponse(res, r, 'Released successfully');
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const r = await Release.findByPk(req.params.releaseId);
    if (!r) return errorResponse(res, 'Release not found', 404);
    await r.destroy();
    successResponse(res, null, 'Release deleted');
  } catch (err) { next(err); }
};
