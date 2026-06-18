const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/webhook.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireProjectRole } = require('../middleware/role.middleware');

router.use(authenticate);
router.get('/events', ctrl.getEvents);
router.get('/', ctrl.getAll);
router.post('/', requireProjectRole('project_manager'), ctrl.create);
router.patch('/:webhookId', requireProjectRole('project_manager'), ctrl.update);
router.delete('/:webhookId', requireProjectRole('project_manager'), ctrl.delete);

module.exports = router;
