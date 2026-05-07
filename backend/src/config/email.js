const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter
const createTransporter = (config = {}) => {
  const host = config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = config.smtpPort || parseInt(process.env.SMTP_PORT) || 587;
  const user = config.smtpUsername || process.env.SMTP_USER;
  const pass = config.smtpPassword || process.env.SMTP_PASSWORD;

  // Validate credentials are present
  if (!user || !pass) {
    console.warn(`[SMTP] Missing credentials: user=${user ? 'set' : 'missing'}, pass=${pass ? 'set' : 'missing'}`);
  }

  // Log configuration (without password) for debugging — only when SMTP_DEBUG=true
  if (process.env.SMTP_DEBUG === 'true') {
    console.log(`Creating SMTP transporter: host=${host}, port=${port}, user=${user ? '***' : 'not set'}, pass=${pass ? '***' : 'not set'}`);
  }

  // Determine secure settings based on port and config
  // Port 465 = direct SSL/TLS (secure: true)
  // Port 587 = STARTTLS (secure: false, requireTLS: true)
  // Other ports = use config.smtpSecure if provided
  let secure = false;
  let requireTLS = false;
  
  // For common ports, prioritize port-based logic over explicit smtpSecure
  // This prevents SSL errors when smtpSecure is incorrectly set
  if (port === 465) {
    // Port 465 always uses direct SSL
    secure = true;
    requireTLS = false;
  } else if (port === 587 || port === 25) {
    // Port 587 and 25 always use STARTTLS
    secure = false;
    requireTLS = true;
  } else if (config.smtpSecure !== undefined) {
    // For other ports, use explicit setting if provided
    secure = Boolean(config.smtpSecure);
    requireTLS = !secure;
  } else {
    // Default: try secure for high ports, otherwise use STARTTLS
    secure = port > 1000 && (process.env.SMTP_SECURE === 'true');
    requireTLS = !secure;
  }

  const transporterConfig = {
    host,
    port: parseInt(port),
    secure,
    auth: user && pass ? { user, pass } : undefined,
  };

  // Add requireTLS for STARTTLS connections
  if (requireTLS && !secure) {
    transporterConfig.requireTLS = true;
  }

  // Add TLS options for certificate verification
  const tlsOptions = config.tlsOptions || {};
  transporterConfig.tls = {
    // Priority: config.tlsOptions > env var > default (secure)
    rejectUnauthorized: tlsOptions.rejectUnauthorized !== undefined
      ? tlsOptions.rejectUnauthorized
      : (process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'),
    
    // Optional: Add other TLS options if provided
    ...(tlsOptions.ciphers && { ciphers: tlsOptions.ciphers }),
    ...(tlsOptions.minVersion && { minVersion: tlsOptions.minVersion }),
    ...(tlsOptions.maxVersion && { maxVersion: tlsOptions.maxVersion }),
  };

  // Warn if certificate verification is disabled (security risk)
  if (transporterConfig.tls.rejectUnauthorized === false) {
    console.warn(`[SMTP] WARNING: Certificate verification is disabled for ${host}:${port}. This is a security risk!`);
  }

  // Log TLS configuration for debugging — gated behind SMTP_DEBUG to keep
  // normal startup quiet.
  if (process.env.SMTP_DEBUG === 'true') {
    console.log(`[SMTP] TLS config: rejectUnauthorized=${transporterConfig.tls.rejectUnauthorized}`);
  }

  // Add connection timeout and other options
  transporterConfig.connectionTimeout = 10000; // 10 seconds
  transporterConfig.greetingTimeout = 10000;
  transporterConfig.socketTimeout = 10000;

  return nodemailer.createTransport(transporterConfig);
};

const transporter = createTransporter();

/**
 * Send email with support for multiple providers
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @param {string} options.from - From email address
 * @param {string} options.fromName - From name
 * @param {string} options.provider - Provider type (smtp, sendgrid, ses, mailgun, other)
 * @param {string} options.apiKey - API key for SendGrid/SES/Mailgun
 * @param {string} options.smtpHost - SMTP host
 * @param {number} options.smtpPort - SMTP port
 * @param {boolean} options.smtpSecure - SMTP secure
 * @param {string} options.smtpUsername - SMTP username
 * @param {string} options.smtpPassword - SMTP password
 * @returns {Promise<Object>} Send result
 */
const sendEmail = async ({ 
  to, 
  subject, 
  text, 
  html, 
  from, 
  fromName,
  provider = 'smtp',
  apiKey,
  smtpHost,
  smtpPort,
  smtpSecure,
  smtpUsername,
  smtpPassword,
  tlsOptions,
}) => {
  try {
    let transporterToUse = transporter;
    const rawFrom = from || process.env.EMAIL_FROM || 'noreply@yourcompany.com';
    const smtpUserAddr = smtpUsername || process.env.SMTP_USER || '';

    // Normalize the From header to a valid RFC 5322 address.
    //   "noreply@x.com"          -> use as is
    //   "Suchna Management"      -> just a display name, wrap with SMTP_USER:
    //                               "Suchna Management <testsmtp@mobilisepro.com>"
    //   "Display <a@b.com>"      -> use as is
    let fromAddress;
    if (rawFrom.includes('@')) {
      fromAddress = rawFrom;
    } else if (smtpUserAddr.includes('@')) {
      fromAddress = `${rawFrom} <${smtpUserAddr}>`;
    } else {
      // Last-resort fallback so we never send a header without an @.
      fromAddress = `${rawFrom} <noreply@localhost>`;
    }

    // If custom SMTP config provided, create new transporter
    // Always create new transporter if any SMTP config is provided
    if (smtpHost || smtpPort !== undefined || smtpUsername || smtpPassword) {
      transporterToUse = createTransporter({
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort) : undefined,
        smtpSecure,
        smtpUsername,
        smtpPassword,
        tlsOptions: tlsOptions || undefined,
      });
    }

    // If a separate fromName is provided AND fromAddress is a bare email, wrap it.
    if (fromName && fromAddress.includes('@') && !fromAddress.includes('<')) {
      fromAddress = `${fromName} <${fromAddress}>`;
    }

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text,
      html,
    };

    // For SendGrid, SES, Mailgun, we would use their SDKs here
    // For now, we'll use SMTP for all providers
    // TODO: Implement SendGrid, SES, Mailgun SDK integrations
    
    const result = await transporterToUse.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Email send error:', error);
    
    // Provide more detailed error messages
    let errorMessage = error.message;
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your username and password.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = `Failed to connect to SMTP server at ${smtpHost || 'configured host'}:${smtpPort || 'configured port'}. Please check your SMTP host and port settings.`;
    } else if (error.message && error.message.includes('authentication failed')) {
      errorMessage = 'SMTP authentication failed. Please verify your username and password are correct. For Gmail, you must use an App Password, not your regular password.';
    } else if (error.message && error.message.includes('535')) {
      errorMessage = 'SMTP authentication failed (Error 535). Please verify your username and password. For Gmail, use an App Password.';
    }
    
    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      originalError: error.message,
    };
  }
};

/**
 * Send email verification email
 * @param {string} to - Recipient email
 * @param {string} token - Verification token
 * @param {string} organizationName - Organization name
 * @returns {Promise<Object>} Send result
 */
const sendVerificationEmail = async (to, token, organizationName) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email</title>
    </head>
    <body>
      <h2>Welcome to ${organizationName}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    </body>
    </html>
  `;

  const text = `
    Welcome to ${organizationName}!
    
    Please verify your email address by visiting:
    ${verificationUrl}
    
    This link will expire in 24 hours.
  `;

  return sendEmail({
    to,
    subject: 'Verify Your Email Address',
    text,
    html,
  });
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 * @returns {Promise<Object>} Send result
 */
const sendPasswordResetEmail = async (to, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
    </head>
    <body>
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </body>
    </html>
  `;

  const text = `
    Password Reset Request
    
    You requested to reset your password. Visit:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you didn't request this, please ignore this email.
  `;

  return sendEmail({
    to,
    subject: 'Reset Your Password',
    text,
    html,
  });
};

/**
 * Send login credentials email
 * @param {string} to - Recipient email
 * @param {string} email - User email
 * @param {string} temporaryPassword - Temporary password
 * @param {string} organizationName - Organization name
 * @param {string} organizationSlug - Organization slug
 * @returns {Promise<Object>} Send result
 */
const sendLoginCredentialsEmail = async (to, email, temporaryPassword, organizationName, organizationSlug) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Account Credentials</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Welcome to ${organizationName}!</h2>
        <p>Your account has been created. Please use the following credentials to log in:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>Organization Slug:</strong> ${organizationSlug}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${temporaryPassword}</code></p>
        </div>
        
        <p><strong>Important:</strong> You will be required to change your password on first login for security purposes.</p>
        
        <div style="margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Login to Your Account</a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact your administrator.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to ${organizationName}!
    
    Your account has been created. Please use the following credentials to log in:
    
    Organization Slug: ${organizationSlug}
    Email: ${email}
    Temporary Password: ${temporaryPassword}
    
    Important: You will be required to change your password on first login for security purposes.
    
    Login URL: ${loginUrl}
    
    If you have any questions, please contact your administrator.
  `;

  return sendEmail({
    to,
    subject: `Your ${organizationName} Account Credentials`,
    text,
    html,
  });
};

/**
 * Welcome email sent when a new organization is created.
 * Includes login URL, the org slug (so they know what to type into the slug
 * field), the admin email, and an optional initial password.
 */
const sendWelcomeOrganizationEmail = async ({ to, organizationName, organizationSlug, adminEmail, adminPassword, loginUrl }) => {
  const safeLoginUrl = loginUrl || process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
  const passwordBlock = adminPassword
    ? `<p style="margin: 0 0 8px 0; color: #111827;"><strong style="color: #111827;">Initial password:</strong> <code style="background-color:#f3f4f6;padding:2px 6px;border-radius:4px;color:#111827">${adminPassword}</code></p>
       <p style="font-size:13px;color:#6b7280;margin:0 0 16px 0">Please change this password on first login.</p>`
    : '';

  // Email-client-safe HTML:
  //   - Always set a solid bgcolor BEFORE gradient (gradients are stripped by
  //     Gmail / Outlook / Apple Mail; without a fallback the white text on
  //     also-white background becomes invisible).
  //   - Use <table> for the hero/button blocks (Outlook respects table bgcolor
  //     where it ignores div backgrounds).
  //   - Avoid relying on `border-radius` for legibility — it's purely visual.
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827; background-color: #ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #2563eb; border-radius: 12px; margin: 0 0 24px 0;">
        <tr>
          <td bgcolor="#2563eb" align="center" style="background-color: #2563eb; background-image: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%); border-radius: 12px; padding: 32px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #ffffff;">Welcome to ${organizationName} &#127881;</h1>
            <p style="margin: 0; font-size: 14px; color: #dbeafe;">Your messaging workspace is ready</p>
          </td>
        </tr>
      </table>

      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #111827;">Your organization has been provisioned. Use the credentials below to sign in:</p>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; margin: 0 0 24px 0;">
        <p style="margin: 0 0 8px 0; color: #111827;"><strong style="color: #111827;">Organization slug:</strong> <code style="background-color:#ffffff;padding:2px 6px;border-radius:4px;border:1px solid #e5e7eb;color:#111827">${organizationSlug}</code></p>
        <p style="margin: 0 0 8px 0; color: #111827;"><strong style="color: #111827;">Admin email:</strong> ${adminEmail}</p>
        ${passwordBlock}
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
        <tr>
          <td align="center">
            <a href="${safeLoginUrl}" style="display: inline-block; background-color: #2563eb; background-image: linear-gradient(90deg, #2563eb, #7c3aed); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; mso-padding-alt: 0;">
              <span style="color: #ffffff;">Sign in to your dashboard</span>
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 0;">
        Need help? Reply to this email and our team will get back to you.
      </p>
    </div>
  `;

  const text = `Welcome to ${organizationName}!

Your organization has been provisioned.
  Organization slug: ${organizationSlug}
  Admin email: ${adminEmail}${adminPassword ? `\n  Initial password: ${adminPassword}\n  (please change on first login)` : ''}

Sign in: ${safeLoginUrl}
`;

  return sendEmail({
    to,
    subject: `Welcome to ${organizationName} — your workspace is ready`,
    text,
    html,
  });
};

module.exports = {
  transporter,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginCredentialsEmail,
  sendWelcomeOrganizationEmail,
};


