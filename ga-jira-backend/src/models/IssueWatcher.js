const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IssueWatcher = sequelize.define('IssueWatcher', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  issueId: { type: DataTypes.UUID, allowNull: false, references: { model: 'issues', key: 'id' } },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
}, {
  tableName: 'issue_watchers',
  indexes: [{ unique: true, fields: ['issueId', 'userId'] }],
});

module.exports = IssueWatcher;
