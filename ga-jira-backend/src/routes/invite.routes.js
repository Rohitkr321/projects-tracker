const router = require('express').Router();
const ctrl = require('../controllers/invite.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.post('/', authenticate, requireRole('project_manager'), ctrl.createInvite);
router.get('/', authenticate, requireRole('project_manager'), ctrl.listInvites);
router.delete('/:id', authenticate, requireRole('project_manager'), ctrl.revokeInvite);

module.exports = router;
