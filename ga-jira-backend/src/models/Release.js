const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Release = sequelize.define('Release', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  name: { type: DataTypes.STRING(255), allowNull: false },
  version: { type: DataTypes.STRING(50), allowNull: false },
  description: { type: DataTypes.TEXT },
  releaseDate: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('unreleased', 'released', 'archived'), defaultValue: 'unreleased' },
  releasedAt: { type: DataTypes.DATE },
}, { tableName: 'releases' });

module.exports = Release;
