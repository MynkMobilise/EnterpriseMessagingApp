/**
 * Tenant SSO via signed JWT (Intercom-style identity verification).
 *
 *   Partner portal --[ JWT signed with org's sso_secret ]--> /api/v1/auth/sso/exchange
 *                                                                 |
 *   - Verify signature with org's stored secret                   |
 *   - JIT-provision user if email not seen before                 |
 *   - Issue access + refresh tokens just like /auth/login         |
 *                                                                 v
 *                       Frontend persists tokens, navigates to /home
 *
 * Token expected format: HS256 JWT with payload
 *   { email, name?, role?, exp }
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Organization, OrganizationSettings, User, Session } = require('../models');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const { sendLoginCredentialsEmail } = require('../config/email');
const { AppError } = require('../utils/errorTypes');
const authService = require('./authService');
const logger = require('../utils/logger');

// Generate a friendly initial password for JIT-provisioned users — same shape
// as the one organizationService.create uses for new admin users:
// 10 alphanumeric chars (no ambiguous I/l/O/0/1) + 1 symbol = 11 chars.
function generateInitialPassword() {
  const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const symbols = '!@#$%^&*';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += charset[Math.floor(Math.random() * charset.length)];
  pw += symbols[Math.floor(Math.random() * symbols.length)];
  return pw;
}

const ALLOWED_SSO_ROLES = ['viewer', 'operator', 'manager'];

class SsoService {
  /**
   * Get the plain-text SSO secret for an organization (for display in Settings UI).
   * Generates one if missing. Returns the secret to the caller — handle with care.
   */
  async getOrCreateSecret(organizationId) {
    let settings = await OrganizationSettings.findOne({ where: { organizationId } });
    if (!settings) {
      settings = await OrganizationSettings.create({ organizationId });
    }
    if (!settings.ssoSecretEncrypted) {
      const plain = crypto.randomBytes(32).toString('hex');
      await settings.update({ ssoSecretEncrypted: encrypt(plain) });
      return { secret: plain, generated: true };
    }
    try {
      return { secret: decrypt(settings.ssoSecretEncrypted), generated: false };
    } catch (e) {
      // Decryption failed (likely ENCRYPTION_KEY rotated). Mint a new secret.
      logger.warn('SSO secret undecryptable, regenerating', { organizationId });
      const plain = crypto.randomBytes(32).toString('hex');
      await settings.update({ ssoSecretEncrypted: encrypt(plain) });
      return { secret: plain, generated: true };
    }
  }

  /**
   * Rotate the SSO secret. The old secret immediately stops working — partner
   * portals must be updated with the new one.
   */
  async rotateSecret(organizationId) {
    const settings = await OrganizationSettings.findOne({ where: { organizationId } });
    if (!settings) throw new AppError('Organization settings not found', 404);
    const plain = crypto.randomBytes(32).toString('hex');
    await settings.update({ ssoSecretEncrypted: encrypt(plain) });
    logger.info('SSO secret rotated', { organizationId });
    return { secret: plain };
  }

  async setEnabled(organizationId, enabled) {
    const settings = await OrganizationSettings.findOne({ where: { organizationId } });
    if (!settings) throw new AppError('Organization settings not found', 404);
    await settings.update({ ssoEnabled: !!enabled });
    return { ssoEnabled: !!enabled };
  }

  async setDefaultRole(organizationId, role) {
    if (!ALLOWED_SSO_ROLES.includes(role)) {
      throw new AppError(`Invalid SSO role. Allowed: ${ALLOWED_SSO_ROLES.join(', ')}`, 400);
    }
    const settings = await OrganizationSettings.findOne({ where: { organizationId } });
    if (!settings) throw new AppError('Organization settings not found', 404);
    await settings.update({ ssoDefaultRole: role });
    return { ssoDefaultRole: role };
  }

  /**
   * Exchange a partner-signed JWT for our access+refresh tokens.
   * Throws AppError on any verification failure — never returns partial success.
   */
  async exchange({ orgSlug, token, ipAddress, userAgent }) {
    if (!orgSlug || !token) throw new AppError('orgSlug and token are required', 400);

    const org = await Organization.findOne({ where: { slug: orgSlug } });
    if (!org) throw new AppError('Unknown organization', 404);
    if (org.status !== 'active' && org.status !== 'trial') {
      throw new AppError(`Organization is ${org.status} — SSO disabled`, 403);
    }

    const settings = await OrganizationSettings.findOne({ where: { organizationId: org.id } });
    if (!settings || !settings.ssoEnabled) throw new AppError('SSO is not enabled for this organization', 403);
    if (!settings.ssoSecretEncrypted) throw new AppError('SSO secret not configured for this organization', 500);

    let secret;
    try {
      secret = decrypt(settings.ssoSecretEncrypted);
    } catch (e) {
      logger.error('Failed to decrypt SSO secret', { orgId: org.id });
      throw new AppError('SSO secret could not be loaded — administrator must rotate it', 500);
    }

    let payload;
    try {
      payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (e) {
      logger.warn('SSO token verification failed', { orgSlug, reason: e.message });
      // Don't leak which check failed (expired vs bad signature) — partner
      // logs already have full detail; this is internet-facing.
      throw new AppError('Invalid or expired SSO token', 401);
    }

    if (!payload.email || typeof payload.email !== 'string') {
      throw new AppError('SSO token must include an email claim', 400);
    }
    const email = payload.email.toLowerCase().trim();

    // Find or JIT-provision the user
    let user = await User.findOne({ where: { email, organizationId: org.id } });
    let provisioned = false;
    if (!user) {
      // Reject if the same email exists in a different org — avoids accidental
      // cross-tenant takeover via a shared address.
      const collision = await User.findOne({ where: { email } });
      if (collision) {
        throw new AppError(`A user with email ${email} exists in a different organization. SSO cannot link cross-tenant accounts.`, 409);
      }

      const requestedRole = (payload.role || '').toLowerCase();
      const role = ALLOWED_SSO_ROLES.includes(requestedRole)
        ? requestedRole
        : settings.ssoDefaultRole || 'operator';

      const [firstName, ...rest] = (payload.name || email.split('@')[0]).split(/\s+/);
      const lastName = rest.join(' ') || '';

      // Generate a real, usable password so the user can also sign in directly
      // via the regular login form later (not only via SSO redirects from the
      // partner portal). Force a password change on first direct-login.
      const initialPassword = generateInitialPassword();
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      user = await User.create({
        organizationId: org.id,
        email,
        passwordHash,
        firstName: firstName || 'User',
        lastName,
        role,
        status: 'active',
        emailVerified: true,           // partner portal already authenticated them
        mustChangePassword: true,      // force change on first password-login
        permissions: authService.getDefaultPermissions(role),
        authProvider: 'local',         // allow both SSO and direct password login
      });
      provisioned = true;
      logger.info('SSO user JIT-provisioned', { orgSlug, email, role });

      // Fire-and-forget welcome email with their direct-login credentials.
      // Failures here must NOT break the SSO sign-in (user is already created
      // and tokens are about to be issued) — log warn and move on. Recovery
      // path: forgot-password flow once that's wired.
      sendLoginCredentialsEmail(email, email, initialPassword, org.name, org.slug)
        .catch((e) => logger.warn('SSO JIT welcome email failed', { userId: user.id, error: e.message }));
    } else if (user.authProvider !== 'sso') {
      // Existing local user trying to come in via SSO — allow it but record
      // the SSO login. Don't downgrade authProvider so they keep password access.
      logger.info('SSO login for existing local user', { userId: user.id });
    }

    if (user.status !== 'active') {
      throw new AppError(`User account is ${user.status}`, 403);
    }

    await user.update({ lastSsoLoginAt: new Date(), lastLogin: new Date() });

    // Mint tokens (same path as /auth/login)
    const accessToken = generateAccessToken({
      userId: user.id,
      organizationId: org.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      organizationId: org.id,
    });

    // Persist the session if the model supports it
    try {
      await Session.create({
        userId: user.id,
        organizationId: org.id,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (e) {
      logger.warn('Could not persist SSO session row', { error: e.message });
    }

    return {
      tokens: { accessToken, refreshToken },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: org.id,
        organizationSlug: org.slug,
        authProvider: user.authProvider,
      },
      provisioned,
    };
  }
}

module.exports = new SsoService();
