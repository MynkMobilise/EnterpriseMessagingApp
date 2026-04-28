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

  // Log configuration (without password) for debugging
  console.log(`Creating SMTP transporter: host=${host}, port=${port}, user=${user ? '***' : 'not set'}, pass=${pass ? '***' : 'not set'}`);

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

  // Log TLS configuration for debugging
  if (process.env.NODE_ENV === 'development') {
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
    let fromAddress = from || process.env.EMAIL_FROM || 'noreply@yourcompany.com';
    
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

    // Format from address with name if provided
    if (fromName) {
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

module.exports = {
  transporter,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginCredentialsEmail,
};


