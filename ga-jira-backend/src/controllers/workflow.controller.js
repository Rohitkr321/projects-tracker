const { Workflow, WorkflowStatus, WorkflowTransition } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const workflows = await Workflow.findAll({
      where: { projectId: req.params.projectId },
      include: [
        { model: WorkflowStatus, as: 'statuses', order: [['order', 'ASC']] },
        { model: WorkflowTransition, as: 'transitions', include: [{ model: WorkflowStatus, as: 'fromStatus' }, { model: WorkflowStatus, as: 'toStatus' }] },
      ],
    });
    successResponse(res, workflows);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, appliesTo, statuses } = req.body;
    const workflow = await Workflow.create({ name, description, appliesTo: appliesTo || [], projectId: req.params.projectId });
    if (statuses?.length) {
      await WorkflowStatus.bulkCreate(statuses.map((s, i) => ({ ...s, workflowId: workflow.id, order: i })));
    }
    const full = await Workflow.findByPk(workflow.id, {
      include: [{ model: WorkflowStatus, as: 'statuses' }, { model: WorkflowTransition, as: 'transitions' }],
    });
    successResponse(res, full, 'Workflow created', 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const workflow = await Workflow.findByPk(req.params.workflowId);
    if (!workflow) return errorResponse(res, 'Workflow not found', 404);
    await workflow.update(req.body);
    successResponse(res, workflow);
  } catch (err) {
    next(err);
  }
};

exports.addStatus = async (req, res, next) => {
  try {
    const { name, color, category, isInitial, isFinal } = req.body;
    const count = await WorkflowStatus.count({ where: { workflowId: req.params.workflowId } });
    const status = await WorkflowStatus.create({ name, color, category, isInitial: !!isInitial, isFinal: !!isFinal, workflowId: req.params.workflowId, order: count });
    successResponse(res, status, 'Status added', 201);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const status = await WorkflowStatus.findByPk(req.params.statusId);
    if (!status) return errorResponse(res, 'Status not found', 404);
    await status.update(req.body);
    successResponse(res, status);
  } catch (err) {
    next(err);
  }
};

exports.deleteStatus = async (req, res, next) => {
  try {
    const status = await WorkflowStatus.findByPk(req.params.statusId);
    if (!status) return errorResponse(res, 'Status not found', 404);
    await status.destroy();
    successResponse(res, null, 'Status deleted');
  } catch (err) {
    next(err);
  }
};

exports.addTransition = async (req, res, next) => {
  try {
    const { fromStatusId, toStatusId, name, requiredRole } = req.body;
    const transition = await WorkflowTransition.create({ fromStatusId, toStatusId, name, requiredRole, workflowId: req.params.workflowId });
    successResponse(res, transition, 'Transition added', 201);
  } catch (err) {
    next(err);
  }
};

exports.deleteTransition = async (req, res, next) => {
  try {
    await WorkflowTransition.destroy({ where: { id: req.params.transitionId } });
    successResponse(res, null, 'Transition deleted');
  } catch (err) {
    next(err);
  }
};
