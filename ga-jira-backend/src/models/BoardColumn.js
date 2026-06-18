const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BoardColumn = sequelize.define('BoardColumn', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  boardId: { type: DataTypes.UUID, allowNull: false, references: { model: 'boards', key: 'id' } },
  workflowStatusId: { type: DataTypes.UUID, references: { model: 'workflow_statuses', key: 'id' } },
  name: { type: DataTypes.STRING(100), allowNull: false },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  wipLimit: { type: DataTypes.INTEGER },
  color: { type: DataTypes.STRING(7) },
}, { tableName: 'board_columns' });

module.exports = BoardColumn;
