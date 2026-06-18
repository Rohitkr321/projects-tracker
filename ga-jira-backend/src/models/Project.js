const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, references: { model: 'organizations', key: 'id' } },
  teamId: { type: DataTypes.UUID, references: { model: 'teams', key: 'id' } },
  leadId: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  key: { type: DataTypes.STRING(10), allowNull: false },
  description: { type: DataTypes.TEXT },
  avatar: { type: DataTypes.STRING(500) },
  type: { type: DataTypes.ENUM('scrum', 'kanban'), defaultValue: 'scrum' },
  status: { type: DataTypes.ENUM('active', 'archived', 'on_hold'), defaultValue: 'active' },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  issueCounter: { type: DataTypes.INTEGER, defaultValue: 0 },
  color: { type: DataTypes.STRING(20), defaultValue: '#0F2557' },
  isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
  settings: { type: DataTypes.JSON, defaultValue: {} },
}, {
  tableName: 'projects',
  indexes: [{ unique: true, fields: ['organizationId', 'key'] }],
});

module.exports = Project;
