const { Document, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getAll = async (req, res, next) => {
  try {
    const docs = await Document.findAll({
      where: { projectId: req.params.projectId, parentId: null },
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Document, as: 'children', include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] }] },
      ],
      order: [['order', 'ASC']],
    });
    successResponse(res, docs);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.docId, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Document, as: 'children', order: [['order', 'ASC']] },
      ],
    });
    if (!doc) return errorResponse(res, 'Document not found', 404);
    successResponse(res, doc);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, content, parentId, isPublished } = req.body;
    const count = await Document.count({ where: { projectId: req.params.projectId, parentId: parentId || null } });
    const doc = await Document.create({ title, content, parentId, isPublished: isPublished !== false, projectId: req.params.projectId, authorId: req.user.id, order: count });
    successResponse(res, doc, 'Document created', 201);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.docId);
    if (!doc) return errorResponse(res, 'Document not found', 404);
    await doc.update(req.body);
    successResponse(res, doc);
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const doc = await Document.findByPk(req.params.docId);
    if (!doc) return errorResponse(res, 'Document not found', 404);
    await doc.destroy();
    successResponse(res, null, 'Document deleted');
  } catch (err) { next(err); }
};
