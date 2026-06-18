const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  issueId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  authorId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  parentId: { type: DataTypes.UUID, references: { model: 'comments', key: 'id' } },
  body: { type: DataTypes.TEXT('long'), allowNull: false },
  mentions: { type: DataTypes.JSON, defaultValue: [] },
  isEdited: { type: DataTypes.BOOLEAN, defaultValue: false },
  isInternal: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'comments' });

module.exports = Comment;
