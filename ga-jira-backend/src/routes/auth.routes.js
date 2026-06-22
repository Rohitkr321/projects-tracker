const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const twoFactorCtrl = require('../controllers/twoFactor.controller');
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
router.put('/profile', authenticate, ctrl.updateProfile);
router.post('/change-password', authenticate, ctrl.changePassword);
router.get('/validate-invite/:token', inviteCtrl.validateInvite);

// 2FA routes
router.get('/2fa/status',    authenticate, twoFactorCtrl.status);
router.post('/2fa/setup',    authenticate, twoFactorCtrl.setup);
router.post('/2fa/enable',   authenticate, twoFactorCtrl.enable);
router.post('/2fa/disable',  authenticate, twoFactorCtrl.disable);
router.post('/2fa/challenge', twoFactorCtrl.challenge); // no auth: uses tempToken

module.exports = router;
