const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/invites', require('./invite.routes'));
router.use('/users', require('./user.routes'));
router.use('/projects', require('./project.routes'));
router.use('/issues', require('./issue.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/search', require('./search.routes'));
router.use('/sprints', require('./sprint-global.routes'));
router.use('/reports', require('./report-global.routes'));

// Issue sub-routes
router.use('/issues/:issueId/comments', require('./comment.routes'));
router.use('/issues/:issueId/time-logs', require('./timeLog.routes'));

// Project sub-routes
router.use('/projects/:projectId/sprints', require('./sprint.routes'));
router.use('/projects/:projectId/epics', require('./epic.routes'));
router.use('/projects/:projectId/workflows', require('./workflow.routes'));
router.use('/projects/:projectId/boards', require('./board.routes'));
router.use('/projects/:projectId/milestones', require('./milestone.routes'));
router.use('/projects/:projectId/releases', require('./release.routes'));
router.use('/projects/:projectId/documents', require('./document.routes'));
router.use('/projects/:projectId/custom-fields', require('./customField.routes'));
router.use('/projects/:projectId/webhooks', require('./webhook.routes'));
router.use('/projects/:projectId/reports', require('./report.routes'));

module.exports = router;
