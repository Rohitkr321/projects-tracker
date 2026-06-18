const router = require('express').Router();
const ctrl = require('../controllers/issue.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', upload.array('attachments', 10), ctrl.create);
router.get('/:issueId', ctrl.getById);
router.patch('/:issueId', ctrl.update);
router.delete('/:issueId', ctrl.delete);
router.patch('/:issueId/position', ctrl.updatePosition);
router.post('/:issueId/watch', ctrl.addWatcher);
router.delete('/:issueId/watch', ctrl.removeWatcher);
router.post('/:issueId/dependencies', ctrl.addDependency);
router.delete('/:issueId/dependencies/:depId', ctrl.removeDependency);

module.exports = router;
