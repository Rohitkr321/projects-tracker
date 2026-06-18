const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.get('/:docId', ctrl.getById);
router.patch('/:docId', ctrl.update);
router.delete('/:docId', ctrl.delete);

module.exports = router;
