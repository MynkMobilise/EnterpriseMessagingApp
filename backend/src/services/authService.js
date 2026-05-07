const jwt = require('jsonwebtoken');
const { User, Organization, Session } = require('../models');
const { AppError, NotFoundError, AuthenticationError, ConflictError } = require('../utils/errorTypes');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/email');

class AuthService {
  /**
   * Register a new user
   */
  async register(data) {
    const { organizationSlug, email, password, firstName, lastName, phoneNumber } = data;

    // Find organization
    const organization = await Organization.findOne({
      where: { slug: organizationSlug },
    });

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: {
        email: email.toLowerCase(),
        organizationId: organization.id,
      },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check user limit
    const userCount = await User.count({
      where: { organizationId: organization.id },
    });

    if (userCount >= organization.maxUsers) {
      throw new AppError('Organization user limit reached', 429);
    }

    // Create user
    const user = await User.create({
      organizationId: organization.id,
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by beforeCreate hook
      firstName,
      lastName,
      phoneNumber,
      role: 'operator',
      status: 'pending',
      permissions: this.getDefaultPermissions('operator'),
    });

    // Generate email verification token
    const verificationToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await user.update({
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send verification email
    await sendVerificationEmail(user.email, verificationToken, organization.name);

    return {
      user: this.sanitizeUser(user),
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Login user
   */
  async login(data, ipAddress, userAgent) {
    const { email, password, organizationSlug } = data;
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Two paths:
    //   (a) orgSlug provided  → find user scoped to that org (legacy, also lets the
    //                            same email exist in multiple orgs and disambiguate)
    //   (b) orgSlug omitted   → look up the user by email alone. If exactly one
    //                            non-deleted user matches, use their org. If 0 or 2+,
    //                            return generic "Invalid credentials" so we don't
    //                            leak which emails are registered.
    let organization = null;
    let user = null;

    if (organizationSlug) {
      organization = await Organization.findOne({ where: { slug: organizationSlug } });
      if (!organization) throw new AuthenticationError('Invalid credentials');
      user = await User.findOne({
        where: { email: normalizedEmail, organizationId: organization.id },
      });
    } else {
      const matches = await User.findAll({ where: { email: normalizedEmail } });
      if (matches.length === 1) {
        user = matches[0];
        organization = await Organization.findByPk(user.organizationId);
      } else if (matches.length > 1) {
        // Same email registered with multiple orgs — caller must specify slug.
        throw new AppError(
          'This email is registered with multiple organizations. Please specify organizationSlug.',
          400,
          'MULTIPLE_ORGS_FOR_EMAIL',
        );
      }
      // 0 matches: leave user = null, fall through to the generic "Invalid credentials" error below.
    }

    if (!user || !organization) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      throw new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 429);
    }

    // Verify password
    const isValidPassword = await user.validPassword(password);

    if (!isValidPassword) {
      // Increment failed attempts
      const newFailedAttempts = user.failedLoginAttempts + 1;
      let lockedUntil = null;

      if (newFailedAttempts >= 10) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      } else if (newFailedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      }

      await user.update({
        failedLoginAttempts: newFailedAttempts,
        lockedUntil,
        lastLoginIp: ipAddress,
      });

      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AppError('Account is not active', 403);
    }

    // Check if password change is required
    const mustChangePassword = user.mustChangePassword === true;

    // Reset failed attempts
    await user.update({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return {
      user: {
        ...this.sanitizeUser(user),
        organizationName: organization.name,
        mustChangePassword,
      },
      tokens,
      mustChangePassword, // Include in response for frontend handling
    };
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user, ipAddress, userAgent) {
    const payload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token in sessions table
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await Session.create({
      userId: user.id,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Check if session exists and is valid
    const session = await Session.findOne({
      where: {
        refreshToken,
        revokedAt: null,
      },
      include: [{ model: User, as: 'user' }],
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = session.user;

    if (user.status !== 'active') {
      throw new AppError('User account is not active', 403);
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user, session.ipAddress, session.userAgent);

    // Revoke old session
    await session.update({ revokedAt: new Date() });

    return tokens;
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired verification token');
    }

    const user = await User.findOne({
      where: {
        id: decoded.userId,
        emailVerificationToken: token,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid verification token');
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new AuthenticationError('Verification token has expired');
    }

    await user.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      status: 'active', // Activate user after email verification
    });

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Forgot password
   */
  async forgotPassword(email, organizationSlug) {
    const organization = await Organization.findOne({
      where: { slug: organizationSlug },
    });

    if (!organization) {
      // Don't reveal if organization exists
      return { message: 'If email exists, password reset link will be sent' };
    }

    const user = await User.findOne({
      where: {
        email: email.toLowerCase(),
        organizationId: organization.id,
      },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If email exists, password reset link will be sent' };
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If email exists, password reset link will be sent' };
  }

  /**
   * Change password on first login
   */
  async changePasswordOnFirstLogin(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User');
    }

    if (!user.mustChangePassword) {
      throw new AppError('Password change is not required', 400);
    }

    // Verify current password
    const isValidPassword = await user.validPassword(currentPassword);
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    // Update password and clear mustChangePassword flag
    await user.update({
      passwordHash: newPassword, // Will be hashed by beforeUpdate hook
      mustChangePassword: false,
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const user = await User.findOne({
      where: {
        id: decoded.userId,
        passwordResetToken: token,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid reset token');
    }

    if (user.passwordResetExpiresAt < new Date()) {
      throw new AuthenticationError('Reset token has expired');
    }

    // Update password (will be hashed by beforeUpdate hook)
    await user.update({
      passwordHash: newPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    // Revoke all sessions
    await Session.update(
      { revokedAt: new Date() },
      { where: { userId: user.id, revokedAt: null } }
    );

    return { message: 'Password reset successfully' };
  }

  /**
   * Logout
   */
  async logout(refreshToken) {
    if (refreshToken) {
      await Session.update(
        { revokedAt: new Date() },
        { where: { refreshToken, revokedAt: null } }
      );
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Sanitize user object (remove sensitive data)
   */
  sanitizeUser(user) {
    const userObj = user.toJSON ? user.toJSON() : user;
    const { passwordHash, emailVerificationToken, passwordResetToken, ...sanitized } = userObj;
    return sanitized;
  }

  /**
   * Get default permissions for role
   */
  getDefaultPermissions(role) {
    const permissions = {
      super_admin: {
        canSendMessages: true,
        canApproveMessages: true,
        canManageUsers: true,
        canManageTemplates: true,
        canManageContacts: true,
        canViewReports: true,
        canManageSettings: true,
        canManageAPIKeys: true,
        canAssignRoles: true,
        canManageOrganization: true,
        canViewLiveChat: true,
      },
      admin: {
        canSendMessages: true,
        canApproveMessages: true,
        canManageUsers: true,
        canManageTemplates: true,
        canManageContacts: true,
        canViewReports: true,
        canManageSettings: true,
        canManageAPIKeys: true,
        canAssignRoles: false,
        canManageOrganization: true,
        canViewLiveChat: true,
      },
      manager: {
        canSendMessages: true,
        canApproveMessages: true,
        canManageUsers: false,
        canManageTemplates: true,
        canManageContacts: true,
        canViewReports: true,
        canManageSettings: false,
        canManageAPIKeys: false,
        canAssignRoles: false,
        canViewLiveChat: true,
      },
      operator: {
        canSendMessages: true,
        canApproveMessages: false,
        canManageUsers: false,
        canManageTemplates: false,
        canManageContacts: true,
        canViewReports: false,
        canManageSettings: false,
        canManageAPIKeys: false,
        canAssignRoles: false,
        canViewLiveChat: true,
      },
      viewer: {
        canSendMessages: false,
        canApproveMessages: false,
        canManageUsers: false,
        canManageTemplates: false,
        canManageContacts: false,
        canViewReports: true,
        canManageSettings: false,
        canManageAPIKeys: false,
        canAssignRoles: false,
        canViewLiveChat: true,
      },
    };

    return permissions[role] || permissions.viewer;
  }
}

module.exports = new AuthService();

