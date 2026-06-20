const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Organization = sequelize.define('Organization', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  logo: { type: DataTypes.STRING(500) },
  website: { type: DataTypes.STRING(255) },
  industry: { type: DataTypes.STRING(100) },
  timezone: { type: DataTypes.STRING(100), defaultValue: 'UTC' },
  maxMembers: { type: DataTypes.INTEGER, defaultValue: 500 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  settings: { type: DataTypes.JSON, defaultValue: {} },
}, {
  tableName: 'organizations',
  indexes: [{ unique: true, fields: ['slug'], name: 'slug' }],
});

module.exports = Organization;
