const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Milestone = sequelize.define('Milestone', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  dueDate: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('open', 'closed'), defaultValue: 'open' },
  progress: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'milestones' });

module.exports = Milestone;
