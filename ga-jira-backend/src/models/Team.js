const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define('Team', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false, references: { model: 'organizations', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  avatar: { type: DataTypes.STRING(500) },
  leadId: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'teams' });

module.exports = Team;
