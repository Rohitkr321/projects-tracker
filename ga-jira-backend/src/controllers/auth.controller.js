const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Organization, Invite } = require('../models');
const { successResponse, errorResponse, generateToken } = require('../utils/helpers');
const { sendPasswordReset } = require('../services/email.service');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

exports.register = async (req, res, next) => {
  try {
    const { name, firstName: fFirst, lastName: fLast, email, password, organizationName, inviteToken } = req.body;

    // Support both "name" (from web form) and "firstName"/"lastName" (legacy)
    let firstName = fFirst;
    let lastName = fLast || '';
    if (name && !fFirst) {
      const parts = name.trim().split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || '.';
    }
    if (!firstName) return errorResponse(res, 'First name is required', 422);

    const existing = await User.findOne({ where: { email } });
    if (existing) return errorResponse(res, 'Email already registered', 409);

    let org = null;
    let role = 'developer';

    if (inviteToken) {
      // Validate invite token
      const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      const invite = await Invite.findOne({ where: { tokenHash } });
      if (!invite) return errorResponse(res, 'Invalid invite token', 400);
      if (invite.acceptedAt) return errorResponse(res, 'This invite has already been used', 400);
      if (invite.expiresAt < new Date()) return errorResponse(res, 'Invite token has expired', 400);
      if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
        return errorResponse(res, 'This invite was issued for a different email address', 400);
      }

      org = await Organization.findByPk(invite.organizationId);
      if (!org) return errorResponse(res, 'Organization not found', 404);
      role = invite.role;

      const user = await User.create({ firstName, lastName, email, password, organizationId: org.id, role });
      await invite.update({ acceptedAt: new Date(), acceptedByUserId: user.id });

      const accessToken = signToken(user.id);
      const refreshToken = signRefreshToken(user.id);
      await user.update({ refreshToken });
      return successResponse(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
    }

    // No invite token — require organizationName to create a new org
    if (!organizationName) {
      return errorResponse(res, 'An invite token is required to join an existing organization, or provide an organization name to create a new one', 400);
    }

    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    org = await Organization.create({ name: organizationName, slug: `${slug}-${Date.now()}` });
    role = 'org_admin';

    const user = await User.create({ firstName, lastName, email, password, organizationId: org.id, role });
    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    await user.update({ refreshToken });

    successResponse(res, { user, accessToken, refreshToken }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email }, include: [{ model: Organization, as: 'organization' }] });
    if (!user || !(await user.comparePassword(password))) {
      return errorResponse(res, 'Invalid email or password', 401);
    }
    if (!user.isActive) return errorResponse(res, 'Account is deactivated', 403);

    // 2FA challenge — return a short-lived token instead of full session tokens
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user.id, scope: '2fa' }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return successResponse(res, { requiresTwoFactor: true, tempToken });
    }

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    await user.update({ refreshToken, lastLoginAt: new Date() });

    successResponse(res, { user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return errorResponse(res, 'Refresh token required', 401);
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || user.refreshToken !== refreshToken) return errorResponse(res, 'Invalid refresh token', 401);
    const accessToken = signToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);
    await user.update({ refreshToken: newRefreshToken });
    successResponse(res, { accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return errorResponse(res, 'Invalid refresh token', 401);
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await req.user.update({ refreshToken: null });
    successResponse(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  successResponse(res, req.user);
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return successResponse(res, null, 'If the email exists, a reset link was sent');
    const token = generateToken();
    await user.update({
      passwordResetToken: crypto.createHash('sha256').update(token).digest('hex'),
      passwordResetExpires: new Date(Date.now() + 3600000),
    });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendPasswordReset(user, resetUrl);
    successResponse(res, null, 'Password reset link sent');
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: { passwordResetToken: hashedToken, passwordResetExpires: { [Op.gt]: new Date() } },
    });
    if (!user) return errorResponse(res, 'Invalid or expired reset token', 400);
    await user.update({ password, passwordResetToken: null, passwordResetExpires: null });
    successResponse(res, null, 'Password reset successful');
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, timezone, notificationPreferences } = req.body;
    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (timezone !== undefined) updates.timezone = timezone;
    if (notificationPreferences !== undefined) {
      updates.notificationPreferences = {
        ...req.user.notificationPreferences,
        ...notificationPreferences,
      };
    }
    await req.user.update(updates);
    const fresh = await User.findByPk(req.user.id);
    successResponse(res, fresh, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!(await user.comparePassword(currentPassword))) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }
    await user.update({ password: newPassword });
    successResponse(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};
