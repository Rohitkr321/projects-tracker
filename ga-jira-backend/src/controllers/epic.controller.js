const { Epic, Issue, User, WorkflowStatus } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const epics = await Epic.findAll({
      where: { projectId: req.params.projectId },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: WorkflowStatus, as: 'status' },
      ],
      order: [['createdAt', 'ASC']],
    });
    successResponse(res, epics);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const epic = await Epic.findByPk(req.params.epicId, {
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: WorkflowStatus, as: 'status' },
        { model: Issue, as: 'issues', include: [{ model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] }, { model: WorkflowStatus, as: 'status' }] },
      ],
    });
    if (!epic) return errorResponse(res, 'Epic not found', 404);
    successResponse(res, epic);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, color, startDate, endDate, statusId, ownerId } = req.body;
    const epic = await Epic.create({ name, description, color, startDate, endDate, statusId, ownerId, projectId: req.params.projectId });
    successResponse(res, epic, 'Epic created', 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const epic = await Epic.findByPk(req.params.epicId);
    if (!epic) return errorResponse(res, 'Epic not found', 404);
    await epic.update(req.body);
    successResponse(res, epic);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const epic = await Epic.findByPk(req.params.epicId);
    if (!epic) return errorResponse(res, 'Epic not found', 404);
    await Issue.update({ epicId: null }, { where: { epicId: epic.id } });
    await epic.destroy();
    successResponse(res, null, 'Epic deleted');
  } catch (err) {
    next(err);
  }
};
