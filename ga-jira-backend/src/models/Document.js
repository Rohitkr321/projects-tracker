const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  authorId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  parentId: { type: DataTypes.UUID, references: { model: 'documents', key: 'id' } },
  title: { type: DataTypes.STRING(255), allowNull: false },
  content: { type: DataTypes.TEXT('long') },
  slug: { type: DataTypes.STRING(255) },
  isPublished: { type: DataTypes.BOOLEAN, defaultValue: true },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'documents' });

module.exports = Document;
