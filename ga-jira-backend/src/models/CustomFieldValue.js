const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CustomFieldValue = sequelize.define('CustomFieldValue', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  customFieldId: { type: DataTypes.UUID, allowNull: false, references: { model: 'custom_fields', key: 'id' } },
  issueId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  value: { type: DataTypes.TEXT },
}, {
  tableName: 'custom_field_values',
  indexes: [{ unique: true, fields: ['customFieldId', 'issueId'] }],
});

module.exports = CustomFieldValue;
