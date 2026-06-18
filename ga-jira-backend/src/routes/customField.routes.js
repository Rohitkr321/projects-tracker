const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/customField.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', ctrl.create);
router.patch('/:fieldId', ctrl.update);
router.delete('/:fieldId', ctrl.delete);
router.post('/:fieldId/values', ctrl.setValue);

module.exports = router;
