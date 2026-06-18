const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/release.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:releaseId', ctrl.update);
router.post('/:releaseId/release', ctrl.release);
router.delete('/:releaseId', ctrl.delete);

module.exports = router;
