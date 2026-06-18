const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const inviteCtrl = require('../controllers/invite.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/refresh-token', ctrl.refreshToken);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/change-password', authenticate, ctrl.changePassword);
router.get('/validate-invite/:token', inviteCtrl.validateInvite);

module.exports = router;
