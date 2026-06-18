const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkflowTransition = sequelize.define('WorkflowTransition', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  workflowId: { type: DataTypes.UUID, allowNull: false, references: { model: 'workflows', key: 'id' } },
  fromStatusId: { type: DataTypes.UUID, allowNull: false, references: { model: 'workflow_statuses', key: 'id' } },
  toStatusId: { type: DataTypes.UUID, allowNull: false, references: { model: 'workflow_statuses', key: 'id' } },
  name: { type: DataTypes.STRING(100) },
  requiredRole: { type: DataTypes.STRING(50) },
}, { tableName: 'workflow_transitions' });

module.exports = WorkflowTransition;
