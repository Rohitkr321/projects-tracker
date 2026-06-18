const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkflowStatus = sequelize.define('WorkflowStatus', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workflowId: { type: DataTypes.UUID, allowNull: false, references: { model: 'workflows', key: 'id' } },
  name: { type: DataTypes.STRING(100), allowNull: false },
  color: { type: DataTypes.STRING(7), defaultValue: '#6B7280' },
  category: { type: DataTypes.ENUM('todo', 'in_progress', 'done'), defaultValue: 'todo' },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  isInitial: { type: DataTypes.BOOLEAN, defaultValue: false },
  isFinal: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'workflow_statuses' });

module.exports = WorkflowStatus;
