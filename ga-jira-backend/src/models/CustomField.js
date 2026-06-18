const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CustomField = sequelize.define('CustomField', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(100), allowNull: false },
  key: { type: DataTypes.STRING(100), allowNull: false },
  type: {
    type: DataTypes.ENUM('text', 'number', 'date', 'select', 'multi_select', 'user', 'url', 'checkbox'),
    allowNull: false,
  },
  options: { type: DataTypes.JSON, defaultValue: [] },
  appliesTo: { type: DataTypes.JSON, defaultValue: [] },
  isRequired: { type: DataTypes.BOOLEAN, defaultValue: false },
  defaultValue: { type: DataTypes.STRING(500) },
  order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'custom_fields' });

module.exports = CustomField;
