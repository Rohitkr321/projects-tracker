const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  recipientId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  actorId: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
  type: { type: DataTypes.STRING(100), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: { type: DataTypes.TEXT },
  data: { type: DataTypes.JSON, defaultValue: {} },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  readAt: { type: DataTypes.DATE },
  link: { type: DataTypes.STRING(500) },
}, { tableName: 'notifications' });

module.exports = Notification;
