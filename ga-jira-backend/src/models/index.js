const sequelize = require('../config/database');

const Invite = require('./Invite');
const Organization = require('./Organization');
const User = require('./User');
const Team = require('./Team');
const TeamMember = require('./TeamMember');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Workflow = require('./Workflow');
const WorkflowStatus = require('./WorkflowStatus');
const WorkflowTransition = require('./WorkflowTransition');
const Epic = require('./Epic');
const Sprint = require('./Sprint');
const Label = require('./Label');
const Issue = require('./Issue');
const IssueDependency = require('./IssueDependency');
const IssueWatcher = require('./IssueWatcher');
const IssueLabel = require('./IssueLabel');
const Comment = require('./Comment');
const Attachment = require('./Attachment');
const TimeLog = require('./TimeLog');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');
const Milestone = require('./Milestone');
const Release = require('./Release');
const Document = require('./Document');
const CustomField = require('./CustomField');
const CustomFieldValue = require('./CustomFieldValue');
const Board = require('./Board');
const BoardColumn = require('./BoardColumn');
const Webhook = require('./Webhook');

// Organization associations
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'members' });
Organization.hasMany(Team, { foreignKey: 'organizationId', as: 'teams' });
Organization.hasMany(Project, { foreignKey: 'organizationId', as: 'projects' });
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });

// Team associations
Team.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Team.belongsTo(User, { foreignKey: 'leadId', as: 'lead' });
Team.hasMany(TeamMember, { foreignKey: 'teamId', as: 'memberships' });
Team.belongsToMany(User, { through: TeamMember, foreignKey: 'teamId', otherKey: 'userId', as: 'users' });
User.belongsToMany(Team, { through: TeamMember, foreignKey: 'userId', otherKey: 'teamId', as: 'teams' });
TeamMember.belongsTo(Team, { foreignKey: 'teamId' });
TeamMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Project associations
Project.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Project.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
Project.belongsTo(User, { foreignKey: 'leadId', as: 'lead' });
Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'memberships' });
Project.belongsToMany(User, { through: ProjectMember, foreignKey: 'projectId', otherKey: 'userId', as: 'members' });
User.belongsToMany(Project, { through: ProjectMember, foreignKey: 'userId', otherKey: 'projectId', as: 'projects' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId' });

// Workflow associations
Workflow.belongsTo(Project, { foreignKey: 'projectId' });
Workflow.hasMany(WorkflowStatus, { foreignKey: 'workflowId', as: 'statuses' });
Workflow.hasMany(WorkflowTransition, { foreignKey: 'workflowId', as: 'transitions' });
Project.hasMany(Workflow, { foreignKey: 'projectId', as: 'workflows' });
WorkflowStatus.belongsTo(Workflow, { foreignKey: 'workflowId' });
WorkflowTransition.belongsTo(Workflow, { foreignKey: 'workflowId' });
WorkflowTransition.belongsTo(WorkflowStatus, { foreignKey: 'fromStatusId', as: 'fromStatus' });
WorkflowTransition.belongsTo(WorkflowStatus, { foreignKey: 'toStatusId', as: 'toStatus' });

// Epic associations
Epic.belongsTo(Project, { foreignKey: 'projectId' });
Epic.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
Epic.belongsTo(WorkflowStatus, { foreignKey: 'statusId', as: 'status' });
Epic.hasMany(Issue, { foreignKey: 'epicId', as: 'issues' });
Project.hasMany(Epic, { foreignKey: 'projectId', as: 'epics' });

// Sprint associations
Sprint.belongsTo(Project, { foreignKey: 'projectId' });
Sprint.hasMany(Issue, { foreignKey: 'sprintId', as: 'issues' });
Project.hasMany(Sprint, { foreignKey: 'projectId', as: 'sprints' });

// Label associations
Label.belongsTo(Project, { foreignKey: 'projectId' });
Project.hasMany(Label, { foreignKey: 'projectId', as: 'labels' });

// Milestone and Release associations
Milestone.belongsTo(Project, { foreignKey: 'projectId' });
Milestone.hasMany(Issue, { foreignKey: 'milestoneId', as: 'issues' });
Project.hasMany(Milestone, { foreignKey: 'projectId', as: 'milestones' });

Release.belongsTo(Project, { foreignKey: 'projectId' });
Release.hasMany(Issue, { foreignKey: 'releaseId', as: 'issues' });
Project.hasMany(Release, { foreignKey: 'projectId', as: 'releases' });

// Issue associations
Issue.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Issue.belongsTo(Sprint, { foreignKey: 'sprintId', as: 'sprint' });
Issue.belongsTo(Epic, { foreignKey: 'epicId', as: 'epic' });
Issue.belongsTo(Issue, { foreignKey: 'parentId', as: 'parent' });
Issue.hasMany(Issue, { foreignKey: 'parentId', as: 'subtasks' });
Issue.belongsTo(Milestone, { foreignKey: 'milestoneId', as: 'milestone' });
Issue.belongsTo(Release, { foreignKey: 'releaseId', as: 'release' });
Issue.belongsTo(WorkflowStatus, { foreignKey: 'workflowStatusId', as: 'status' });
Issue.belongsTo(User, { foreignKey: 'assigneeId', as: 'assignee' });
Issue.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
Issue.hasMany(Comment, { foreignKey: 'issueId', as: 'comments' });
Issue.hasMany(Attachment, { foreignKey: 'issueId', as: 'attachments' });
Issue.hasMany(TimeLog, { foreignKey: 'issueId', as: 'timeLogs' });
Issue.hasMany(ActivityLog, { foreignKey: 'issueId', as: 'activities' });
Issue.hasMany(CustomFieldValue, { foreignKey: 'issueId', as: 'customFieldValues' });
Issue.belongsToMany(Label, { through: IssueLabel, foreignKey: 'issueId', otherKey: 'labelId', as: 'labels' });
Issue.belongsToMany(User, { through: IssueWatcher, foreignKey: 'issueId', otherKey: 'userId', as: 'watchers' });
Issue.hasMany(IssueDependency, { foreignKey: 'issueId', as: 'dependencies' });
Project.hasMany(Issue, { foreignKey: 'projectId', as: 'issues' });

// Comment associations
Comment.belongsTo(Issue, { foreignKey: 'issueId' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Comment.belongsTo(Comment, { foreignKey: 'parentId', as: 'parent' });
Comment.hasMany(Comment, { foreignKey: 'parentId', as: 'replies' });
Comment.hasMany(Attachment, { foreignKey: 'commentId', as: 'attachments' });

// Attachment associations
Attachment.belongsTo(Issue, { foreignKey: 'issueId' });
Attachment.belongsTo(Comment, { foreignKey: 'commentId' });
Attachment.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });

// TimeLog associations
TimeLog.belongsTo(Issue, { foreignKey: 'issueId' });
TimeLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// CustomField associations
CustomField.belongsTo(Project, { foreignKey: 'projectId' });
CustomField.hasMany(CustomFieldValue, { foreignKey: 'customFieldId', as: 'values' });
CustomFieldValue.belongsTo(CustomField, { foreignKey: 'customFieldId', as: 'field' });
CustomFieldValue.belongsTo(Issue, { foreignKey: 'issueId' });
Project.hasMany(CustomField, { foreignKey: 'projectId', as: 'customFields' });

// Document associations
Document.belongsTo(Project, { foreignKey: 'projectId' });
Document.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Document.belongsTo(Document, { foreignKey: 'parentId', as: 'parent' });
Document.hasMany(Document, { foreignKey: 'parentId', as: 'children' });
Project.hasMany(Document, { foreignKey: 'projectId', as: 'documents' });

// Board associations
Board.belongsTo(Project, { foreignKey: 'projectId' });
Board.belongsTo(Sprint, { foreignKey: 'sprintId', as: 'sprint' });
Board.hasMany(BoardColumn, { foreignKey: 'boardId', as: 'columns' });
BoardColumn.belongsTo(Board, { foreignKey: 'boardId' });
BoardColumn.belongsTo(WorkflowStatus, { foreignKey: 'workflowStatusId', as: 'status' });
Project.hasMany(Board, { foreignKey: 'projectId', as: 'boards' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
Notification.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

// Webhook associations
Webhook.belongsTo(Project, { foreignKey: 'projectId' });
Webhook.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
Project.hasMany(Webhook, { foreignKey: 'projectId', as: 'webhooks' });

// ActivityLog associations
ActivityLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });
ActivityLog.belongsTo(Issue, { foreignKey: 'issueId' });
ActivityLog.belongsTo(Project, { foreignKey: 'projectId' });

// Invite associations
Invite.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Invite.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
Invite.belongsTo(User, { foreignKey: 'acceptedByUserId', as: 'acceptedBy' });
Organization.hasMany(Invite, { foreignKey: 'organizationId', as: 'invites' });

module.exports = {
  sequelize,
  Invite,
  Organization,
  User,
  Team,
  TeamMember,
  Project,
  ProjectMember,
  Workflow,
  WorkflowStatus,
  WorkflowTransition,
  Epic,
  Sprint,
  Label,
  Issue,
  IssueDependency,
  IssueWatcher,
  IssueLabel,
  Comment,
  Attachment,
  TimeLog,
  Notification,
  ActivityLog,
  Milestone,
  Release,
  Document,
  CustomField,
  CustomFieldValue,
  Board,
  BoardColumn,
  Webhook,
};
