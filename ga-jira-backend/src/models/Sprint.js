const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sprint = sequelize.define('Sprint', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  goal: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('future', 'active', 'completed'), defaultValue: 'future' },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  completedAt: { type: DataTypes.DATE },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
  velocity: { type: DataTypes.INTEGER },
  totalPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  completedPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'sprints' });

module.exports = Sprint;
