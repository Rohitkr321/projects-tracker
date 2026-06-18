const { Comment, User, Attachment, Issue } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');
const { notifyCommentAdded, notifyMentioned } = require('../services/notification.service');
const { emitToIssue } = require('../services/socket.service');

const extractMentions = (body) => {
  const matches = (body || '').match(/@\[([^\]]+)\]\(([^)]+)\)/g) || [];
  return matches.map((m) => m.match(/\(([^)]+)\)/)[1]);
};

exports.create = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { body, parentId, isInternal } = req.body;
    const mentions = extractMentions(body);

    const comment = await Comment.create({
      issueId, authorId: req.user.id, body, parentId, isInternal: !!isInternal, mentions,
    });

    if (req.files?.length) {
      for (const file of req.files) {
        await Attachment.create({
          commentId: comment.id, uploadedById: req.user.id,
          filename: file.filename, originalName: file.originalname,
          mimeType: file.mimetype, size: file.size, url: `/uploads/${file.filename}`,
        });
      }
    }

    const fullComment = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: Attachment, as: 'attachments' },
      ],
    });

    const issue = await Issue.findByPk(issueId, { include: [{ model: User, as: 'watchers' }] });
    await notifyCommentAdded(issue, req.user.id, issue.watchers);
    if (mentions.length) await notifyMentioned(mentions, req.user.id, issueId, issue.key);

    emitToIssue(issueId, 'comment:created', fullComment);
    successResponse(res, fullComment, 'Comment added', 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return errorResponse(res, 'Comment not found', 404);
    if (comment.authorId !== req.user.id && !['super_admin', 'org_admin'].includes(req.user.role)) {
      return errorResponse(res, 'Forbidden', 403);
    }
    const mentions = extractMentions(req.body.body);
    await comment.update({ body: req.body.body, isEdited: true, mentions });
    const updated = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'avatar'] }],
    });
    emitToIssue(comment.issueId, 'comment:updated', updated);
    successResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return errorResponse(res, 'Comment not found', 404);
    if (comment.authorId !== req.user.id && !['super_admin', 'org_admin', 'project_manager'].includes(req.user.role)) {
      return errorResponse(res, 'Forbidden', 403);
    }
    await comment.destroy();
    emitToIssue(comment.issueId, 'comment:deleted', { id: comment.id });
    successResponse(res, null, 'Comment deleted');
  } catch (err) {
    next(err);
  }
};
