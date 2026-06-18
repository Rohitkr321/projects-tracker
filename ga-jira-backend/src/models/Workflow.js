const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Workflow = sequelize.define('Workflow', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
  appliesTo: { type: DataTypes.JSON, defaultValue: [] },
}, { tableName: 'workflows' });

module.exports = Workflow;
