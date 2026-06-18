const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/epic.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:epicId', ctrl.getById);
router.patch('/:epicId', ctrl.update);
router.delete('/:epicId', ctrl.delete);

module.exports = router;
