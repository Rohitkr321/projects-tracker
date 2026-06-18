const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attachment = sequelize.define('Attachment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  issueId: { type: DataTypes.UUID, references: { model: 'issues', key: 'id' } },
  commentId: { type: DataTypes.UUID, references: { model: 'comments', key: 'id' } },
  uploadedById: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  filename: { type: DataTypes.STRING(255), allowNull: false },
  originalName: { type: DataTypes.STRING(255), allowNull: false },
  mimeType: { type: DataTypes.STRING(100) },
  size: { type: DataTypes.INTEGER },
  url: { type: DataTypes.STRING(500), allowNull: false },
}, { tableName: 'attachments' });

module.exports = Attachment;
