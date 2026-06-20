const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invite = sequelize.define('Invite', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, references: { model: 'organizations', key: 'id' } },
  createdById: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  email: { type: DataTypes.STRING(255), allowNull: true },
  tokenHash: { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM('project_manager', 'team_lead', 'developer', 'reporter', 'viewer'),
    defaultValue: 'developer',
  },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  acceptedAt: { type: DataTypes.DATE, allowNull: true },
  acceptedByUserId: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'invites',
  indexes: [{ unique: true, fields: ['tokenHash'], name: 'tokenHash' }],
});

module.exports = Invite;
