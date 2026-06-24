const router = require('express').Router();
const ctrl = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/dashboard', ctrl.dashboard);
router.get('/burndown/:sprintId', ctrl.burndown);
router.get('/velocity/:projectId', ctrl.velocity);
router.get('/time-tracking', ctrl.timeTracking);
router.get('/issue-distribution/:projectId', ctrl.issueDistribution);
router.get('/cumulative-flow/:projectId', ctrl.getCumulativeFlow);
router.get('/team-workload', ctrl.overview);
router.get('/sprint-comparison/:projectId', ctrl.velocity);

module.exports = router;
