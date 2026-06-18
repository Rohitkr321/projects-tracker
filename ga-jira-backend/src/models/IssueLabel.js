const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IssueLabel = sequelize.define('IssueLabel', {
  issueId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  labelId: { type: DataTypes.UUID, allowNull: false, references: { model: 'labels', key: 'id' } },
}, {
  tableName: 'issue_labels',
  timestamps: false,
});

module.exports = IssueLabel;
