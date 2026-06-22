const speakeasy = require('speakeasy');
const QRCode    = require('qrcode');
const jwt       = require('jsonwebtoken');
const { User }  = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const APP_NAME = process.env.APP_NAME || 'GA Jira';

const sign2faToken = (id) =>
  jwt.sign({ id, scope: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

/* ── GET /auth/2fa/status ── */
exports.status = (req, res) => {
  successResponse(res, { twoFactorEnabled: !!req.user.twoFactorEnabled });
};

/* ── POST /auth/2fa/setup ── generate secret + QR code (does NOT enable yet) ── */
exports.setup = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${req.user.email})`,
      issuer: APP_NAME,
      length: 20,
    });
    // Temporarily store the secret so /enable can verify against it
    await req.user.update({ twoFactorSecret: secret.base32 });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    successResponse(res, { secret: secret.base32, qrCode, otpauthUrl: secret.otpauth_url });
  } catch (err) { next(err); }
};

/* ── POST /auth/2fa/enable ── verify code then officially enable ── */
exports.enable = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!req.user.twoFactorSecret) return errorResponse(res, 'Call /auth/2fa/setup first', 400);
    const valid = speakeasy.totp.verify({
      secret: req.user.twoFactorSecret,
      encoding: 'base32',
      token: String(code),
      window: 1,
    });
    if (!valid) return errorResponse(res, 'Invalid verification code', 400);

    const backupCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
    await req.user.update({ twoFactorEnabled: true, twoFactorBackupCodes: backupCodes });
    successResponse(res, { backupCodes }, '2FA enabled successfully');
  } catch (err) { next(err); }
};

/* ── POST /auth/2fa/disable ── requires current password ── */
exports.disable = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return errorResponse(res, 'Current password is required', 400);
    const user = await User.findByPk(req.user.id);
    if (!(await user.comparePassword(password))) return errorResponse(res, 'Incorrect password', 400);
    await user.update({ twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null });
    successResponse(res, null, '2FA disabled');
  } catch (err) { next(err); }
};

/* ── POST /auth/2fa/challenge ── called from login page with tempToken + OTP code ── */
exports.challenge = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return errorResponse(res, 'tempToken and code are required', 400);

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return errorResponse(res, 'Invalid or expired session. Please log in again.', 401);
    }
    if (decoded.scope !== '2fa') return errorResponse(res, 'Invalid token scope', 401);

    const user = await User.findByPk(decoded.id);
    if (!user || !user.twoFactorEnabled) return errorResponse(res, 'User not found or 2FA not enabled', 404);

    const codeStr = String(code).replace(/\s/g, '');

    // Check TOTP
    const totpValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: codeStr,
      window: 1,
    });

    // Check backup codes
    const backupCodes = user.twoFactorBackupCodes || [];
    const backupIdx   = backupCodes.indexOf(codeStr.toUpperCase());
    const backupValid = backupIdx !== -1;

    if (!totpValid && !backupValid) return errorResponse(res, 'Invalid code', 400);

    // Consume backup code if used
    if (backupValid) {
      backupCodes.splice(backupIdx, 1);
      await user.update({ twoFactorBackupCodes: backupCodes });
    }

    const accessToken  = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    await user.update({ refreshToken, lastLoginAt: new Date() });
    successResponse(res, { user, accessToken, refreshToken });
  } catch (err) { next(err); }
};

module.exports.sign2faToken = sign2faToken;
