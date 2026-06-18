const { Board, BoardColumn, Issue, User, WorkflowStatus, Sprint } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

exports.getBoards = async (req, res, next) => {
  try {
    const boards = await Board.findAll({
      where: { projectId: req.params.projectId },
      include: [{ model: BoardColumn, as: 'columns', include: [{ model: WorkflowStatus, as: 'status' }], order: [['order', 'ASC']] }],
    });
    successResponse(res, boards);
  } catch (err) {
    next(err);
  }
};

exports.getBoardIssues = async (req, res, next) => {
  try {
    const board = await Board.findByPk(req.params.boardId, {
      include: [{ model: BoardColumn, as: 'columns', include: [{ model: WorkflowStatus, as: 'status' }], order: [['order', 'ASC']] }],
    });
    if (!board) return errorResponse(res, 'Board not found', 404);

    const statusIds = board.columns.map((c) => c.workflowStatusId).filter(Boolean);
    const where = { projectId: board.projectId };
    if (board.sprintId) where.sprintId = board.sprintId;
    if (statusIds.length) {
      const { Op } = require('sequelize');
      where.workflowStatusId = { [Op.in]: statusIds };
    }

    const issues = await Issue.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'avatar'] },
        { model: WorkflowStatus, as: 'status' },
      ],
      order: [['position', 'ASC']],
    });

    const columns = board.columns.map((col) => ({
      ...col.toJSON(),
      issues: issues.filter((i) => i.workflowStatusId === col.workflowStatusId),
    }));

    successResponse(res, { board, columns });
  } catch (err) {
    next(err);
  }
};

exports.updateColumnOrder = async (req, res, next) => {
  try {
    const { columns } = req.body;
    for (const { id, order } of columns) {
      await BoardColumn.update({ order }, { where: { id } });
    }
    successResponse(res, null, 'Column order updated');
  } catch (err) {
    next(err);
  }
};
