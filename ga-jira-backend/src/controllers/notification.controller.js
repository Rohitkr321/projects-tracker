const { Notification, User } = require('../models');
const { successResponse, paginate, paginateResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, unreadOnly } = req.query;
    const where = { recipientId: req.user.id };
    if (unreadOnly === 'true') where.isRead = false;
    const { count, rows } = await Notification.findAndCountAll({
      where,
      ...paginate(page, limit),
      include: [{ model: User, as: 'actor', attributes: ['id', 'firstName', 'lastName', 'avatar'] }],
      order: [['createdAt', 'DESC']],
    });
    successResponse(res, paginateResponse(rows, count, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.update({ isRead: true, readAt: new Date() }, { where: { id: req.params.id, recipientId: req.user.id } });
    successResponse(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.update({ isRead: true, readAt: new Date() }, { where: { recipientId: req.user.id, isRead: false } });
    successResponse(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ where: { recipientId: req.user.id, isRead: false } });
    successResponse(res, { count });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    await Notification.destroy({ where: { id: req.params.id, recipientId: req.user.id } });
    successResponse(res, null, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};
