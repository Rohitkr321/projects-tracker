const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/search', ctrl.searchUsers);
router.get('/:id', ctrl.getById);
router.patch('/me', upload.single('avatar'), ctrl.updateProfile);
router.patch('/:id', requireRole('org_admin'), ctrl.updateUser);

module.exports = router;
