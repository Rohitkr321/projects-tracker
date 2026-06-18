const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  issueId: { type: DataTypes.UUID, references: { model: 'issues', key: 'id' } },
  projectId: { type: DataTypes.UUID, references: { model: 'projects', key: 'id' } },
  actorId: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
  action: { type: DataTypes.STRING(100), allowNull: false },
  field: { type: DataTypes.STRING(100) },
  oldValue: { type: DataTypes.TEXT },
  newValue: { type: DataTypes.TEXT },
  metadata: { type: DataTypes.JSON, defaultValue: {} },
}, { tableName: 'activity_logs', updatedAt: false });

module.exports = ActivityLog;
