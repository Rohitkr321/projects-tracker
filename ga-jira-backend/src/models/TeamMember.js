const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TeamMember = sequelize.define('TeamMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  teamId: { type: DataTypes.UUID, allowNull: false, references: { model: 'teams', key: 'id' } },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  role: {
    type: DataTypes.ENUM('team_lead', 'developer', 'reporter', 'viewer'),
    defaultValue: 'developer',
  },
  joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'team_members' });

module.exports = TeamMember;
