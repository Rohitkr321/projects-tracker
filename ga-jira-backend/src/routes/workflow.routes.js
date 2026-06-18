const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/workflow.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:workflowId', ctrl.update);
router.post('/:workflowId/statuses', ctrl.addStatus);
router.patch('/:workflowId/statuses/:statusId', ctrl.updateStatus);
router.delete('/:workflowId/statuses/:statusId', ctrl.deleteStatus);
router.post('/:workflowId/transitions', ctrl.addTransition);
router.delete('/:workflowId/transitions/:transitionId', ctrl.deleteTransition);

module.exports = router;
