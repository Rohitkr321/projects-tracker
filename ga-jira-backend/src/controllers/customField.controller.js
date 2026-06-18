const { CustomField, CustomFieldValue } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const fields = await CustomField.findAll({ where: { projectId: req.params.projectId }, order: [['order', 'ASC']] });
    successResponse(res, fields);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, key, type, options, appliesTo, isRequired, defaultValue } = req.body;
    const count = await CustomField.count({ where: { projectId: req.params.projectId } });
    const field = await CustomField.create({ name, key, type, options, appliesTo, isRequired, defaultValue, projectId: req.params.projectId, order: count });
    successResponse(res, field, 'Custom field created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const field = await CustomField.findByPk(req.params.fieldId);
    if (!field) return errorResponse(res, 'Field not found', 404);
    await field.update(req.body);
    successResponse(res, field);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const field = await CustomField.findByPk(req.params.fieldId);
    if (!field) return errorResponse(res, 'Field not found', 404);
    await field.destroy();
    successResponse(res, null, 'Custom field deleted');
  } catch (err) { next(err); }
};

exports.setValue = async (req, res, next) => {
  try {
    const { issueId, value } = req.body;
    const [record] = await CustomFieldValue.upsert({ customFieldId: req.params.fieldId, issueId, value: String(value) });
    successResponse(res, record);
  } catch (err) { next(err); }
};
