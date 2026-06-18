const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/timeLog.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.getForIssue);
router.post('/', ctrl.create);
router.delete('/:logId', ctrl.delete);

module.exports = router;
