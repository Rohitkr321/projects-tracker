const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Board = sequelize.define('Board', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  type: { type: DataTypes.ENUM('scrum', 'kanban'), defaultValue: 'scrum' },
  sprintId: { type: DataTypes.UUID, references: { model: 'sprints', key: 'id' } },
  filters: { type: DataTypes.JSON, defaultValue: {} },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'boards' });

module.exports = Board;
