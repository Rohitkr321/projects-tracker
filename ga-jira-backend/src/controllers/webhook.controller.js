const { Webhook } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { WEBHOOK_EVENTS } = require('../config/constants');

exports.getAll = async (req, res, next) => {
  try {
    const webhooks = await Webhook.findAll({ where: { projectId: req.params.projectId } });
    successResponse(res, webhooks);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, url, secret, events } = req.body;
    const validEvents = events.filter((e) => WEBHOOK_EVENTS.includes(e));
    const webhook = await Webhook.create({ name, url, secret, events: validEvents, projectId: req.params.projectId, createdById: req.user.id });
    successResponse(res, webhook, 'Webhook created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const webhook = await Webhook.findByPk(req.params.webhookId);
    if (!webhook) return errorResponse(res, 'Webhook not found', 404);
    await webhook.update(req.body);
    successResponse(res, webhook);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const webhook = await Webhook.findByPk(req.params.webhookId);
    if (!webhook) return errorResponse(res, 'Webhook not found', 404);
    await webhook.destroy();
    successResponse(res, null, 'Webhook deleted');
  } catch (err) { next(err); }
};

exports.getEvents = (req, res) => successResponse(res, WEBHOOK_EVENTS);
