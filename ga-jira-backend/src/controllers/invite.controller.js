const crypto = require('crypto');
const { Invite, Organization, User } = require('../models');
const { successResponse, errorResponse } = require('../utils/helpers');

const INVITE_TTL_HOURS = 72;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// POST /api/v1/invites  — org_admin or project_manager only
exports.createInvite = async (req, res, next) => {
  try {
    const { email, role = 'developer' } = req.body;
    const organizationId = req.user.organizationId;

    if (!organizationId) {
      return errorResponse(res, 'You must belong to an organization to invite users', 400);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    await Invite.create({
      organizationId,
      createdById: req.user.id,
      email: email || null,
      tokenHash,
      role,
      expiresAt,
    });

    successResponse(res, { token: rawToken, expiresAt }, 'Invite created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/invites  — list org's pending invites
exports.listInvites = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    if (!organizationId) return errorResponse(res, 'No organization', 400);

    const invites = await Invite.findAll({
      where: { organizationId },
      include: [{ model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    successResponse(res, invites);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/invites/:id  — revoke invite
exports.revokeInvite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const invite = await Invite.findOne({ where: { id, organizationId } });
    if (!invite) return errorResponse(res, 'Invite not found', 404);
    await invite.destroy();
    successResponse(res, null, 'Invite revoked');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/validate-invite/:token  — public, validate token
exports.validateInvite = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) return errorResponse(res, 'Token required', 400);

    const tokenHash = hashToken(token);
    const invite = await Invite.findOne({
      where: { tokenHash },
      include: [
        { model: Organization, as: 'organization', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });

    if (!invite) return errorResponse(res, 'Invalid invite token', 404);
    if (invite.acceptedAt) return errorResponse(res, 'This invite has already been used', 410);
    if (invite.expiresAt < new Date()) return errorResponse(res, 'Invite token has expired', 410);

    successResponse(res, {
      organizationId: invite.organizationId,
      organizationName: invite.organization?.name,
      role: invite.role,
      email: invite.email,
      invitedBy: invite.createdBy
        ? `${invite.createdBy.firstName} ${invite.createdBy.lastName}`.trim()
        : 'an admin',
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};
