const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/label.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:labelId', ctrl.update);
router.delete('/:labelId', ctrl.delete);

module.exports = router;
