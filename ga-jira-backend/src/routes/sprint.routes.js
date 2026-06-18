const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/sprint.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/active', ctrl.getActive);
router.get('/:sprintId', ctrl.getById);
router.patch('/:sprintId', ctrl.update);
router.delete('/:sprintId', ctrl.delete);
router.post('/:sprintId/start', ctrl.start);
router.post('/:sprintId/complete', ctrl.complete);
router.get('/:sprintId/burndown', ctrl.getBurndown);

module.exports = router;
