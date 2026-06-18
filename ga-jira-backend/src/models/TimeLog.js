const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimeLog = sequelize.define('TimeLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  issueId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  timeSpent: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.TEXT },
  loggedAt: { type: DataTypes.DATEONLY, allowNull: false },
}, { tableName: 'time_logs' });

module.exports = TimeLog;
