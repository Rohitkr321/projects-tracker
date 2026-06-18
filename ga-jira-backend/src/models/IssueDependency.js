const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IssueDependency = sequelize.define('IssueDependency', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  issueId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  dependsOnId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  type: {
    type: DataTypes.ENUM('blocks', 'blocked_by', 'relates_to', 'duplicates', 'duplicated_by', 'clones', 'cloned_by'),
    allowNull: false,
  },
}, { tableName: 'issue_dependencies' });

module.exports = IssueDependency;
