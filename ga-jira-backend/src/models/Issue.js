const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Issue = sequelize.define('Issue', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false, references: { model: 'projects', key: 'id' } },
  sprintId: { type: DataTypes.UUID, references: { model: 'sprints', key: 'id' } },
  epicId: { type: DataTypes.UUID, references: { model: 'epics', key: 'id' } },
  parentId: { type: DataTypes.UUID, references: { model: 'issues', key: 'id' } },
  milestoneId: { type: DataTypes.UUID, references: { model: 'milestones', key: 'id' } },
  releaseId: { type: DataTypes.UUID, references: { model: 'releases', key: 'id' } },
  workflowStatusId: { type: DataTypes.UUID, references: { model: 'workflow_statuses', key: 'id' } },
  assigneeId: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
  reporterId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
  key: { type: DataTypes.STRING(20), allowNull: false },
  title: { type: DataTypes.STRING(500), allowNull: false },
  description: { type: DataTypes.TEXT('long') },
  type: {
    type: DataTypes.ENUM('bug', 'story', 'task', 'epic', 'subtask', 'risk', 'incident'),
    allowNull: false,
    defaultValue: 'task',
  },
  priority: {
    type: DataTypes.ENUM('highest', 'high', 'medium', 'low', 'lowest'),
    defaultValue: 'medium',
  },
  storyPoints: { type: DataTypes.INTEGER },
  originalEstimate: { type: DataTypes.INTEGER },
  timeSpent: { type: DataTypes.INTEGER, defaultValue: 0 },
  timeRemaining: { type: DataTypes.INTEGER },
  dueDate: { type: DataTypes.DATEONLY },
  startDate: { type: DataTypes.DATEONLY },
  resolvedAt: { type: DataTypes.DATE },
  slaBreachAt: { type: DataTypes.DATE },
  isSlaBreached: { type: DataTypes.BOOLEAN, defaultValue: false },
  position: { type: DataTypes.FLOAT, defaultValue: 0 },
  environment: { type: DataTypes.STRING(255) },
  stepsToReproduce: { type: DataTypes.TEXT },
  acceptanceCriteria: { type: DataTypes.TEXT },
  resolution: { type: DataTypes.STRING(100) },
}, {
  tableName: 'issues',
  indexes: [
    { unique: true, fields: ['projectId', 'key'] },
    { fields: ['assigneeId'] },
    { fields: ['sprintId'] },
    { fields: ['epicId'] },
    { fields: ['type'] },
    { fields: ['priority'] },
  ],
});

module.exports = Issue;
