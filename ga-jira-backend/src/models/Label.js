const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Label = sequelize.define('Label', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(100), allowNull: false },
  color: { type: DataTypes.STRING(7), defaultValue: '#3B82F6' },
  description: { type: DataTypes.STRING(255) },
}, { tableName: 'labels' });

module.exports = Label;
