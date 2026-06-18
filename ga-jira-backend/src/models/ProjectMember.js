const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  role: {
    type: DataTypes.ENUM('project_manager', 'team_lead', 'developer', 'reporter', 'viewer'),
    defaultValue: 'developer',
  },
}, {
  tableName: 'project_members',
  indexes: [{ unique: true, fields: ['projectId', 'userId'] }],
});

module.exports = ProjectMember;
