const router = require('express').Router();
const ctrl = require('../controllers/project.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requireProjectRole } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.post('/', requireRole('org_admin', 'project_manager'), ctrl.create);
router.get('/:projectId', ctrl.getById);
router.patch('/:projectId', requireProjectRole('project_manager'), upload.single('avatar'), ctrl.update);
router.delete('/:projectId', requireRole('org_admin'), ctrl.delete);
router.get('/:projectId/stats', ctrl.getStats);
router.get('/:projectId/members', ctrl.getMembers);
router.post('/:projectId/members', requireProjectRole('project_manager'), ctrl.addMember);
router.delete('/:projectId/members/:userId', requireProjectRole('project_manager'), ctrl.removeMember);

module.exports = router;
