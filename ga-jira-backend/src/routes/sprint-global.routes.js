const router = require('express').Router();
const ctrl = require('../controllers/sprint.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/:sprintId', ctrl.getById);
router.patch('/:sprintId', ctrl.update);
router.delete('/:sprintId', ctrl.delete);
router.post('/:sprintId/start', ctrl.start);
router.post('/:sprintId/complete', ctrl.complete);
router.get('/:sprintId/burndown', ctrl.getBurndown);

module.exports = router;
