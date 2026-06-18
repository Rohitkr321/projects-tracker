const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Epic = sequelize.define('Epic', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  color: { type: DataTypes.STRING(7), defaultValue: '#6366F1' },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  statusId: { type: DataTypes.UUID, references: { model: 'workflow_statuses', key: 'id' } },
  ownerId: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'epics' });

module.exports = Epic;
