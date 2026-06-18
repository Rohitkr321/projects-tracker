const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/overview', ctrl.overview);
router.get('/velocity', ctrl.velocity);
router.get('/distribution', ctrl.issueDistribution);
router.get('/time-tracking', ctrl.timeTracking);
router.get('/sprints/:sprintId/burndown', ctrl.burndown);

module.exports = router;
