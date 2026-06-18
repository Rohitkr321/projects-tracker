const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Webhook = sequelize.define('Webhook', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  createdById: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: false },
  secret: { type: DataTypes.STRING(255) },
  events: { type: DataTypes.JSON, defaultValue: [] },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastTriggeredAt: { type: DataTypes.DATE },
  failureCount: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'webhooks' });

module.exports = Webhook;
