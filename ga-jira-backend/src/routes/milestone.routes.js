const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/milestone.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:milestoneId', ctrl.update);
router.delete('/:milestoneId', ctrl.delete);

module.exports = router;
