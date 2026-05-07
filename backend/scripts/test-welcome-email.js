/**
 * Direct SMTP test for the welcome email — bypasses the org-create path so we
 * see exactly why delivery is (not) happening.
 *
 *   node scripts/test-welcome-email.js you@example.com
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendWelcomeOrganizationEmail } = require('../src/config/email');

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/test-welcome-email.js <recipient-email>');
  process.exit(1);
}

console.log('=== SMTP welcome-email smoke test ===');
console.log('SMTP_HOST    :', process.env.SMTP_HOST);
console.log('SMTP_PORT    :', process.env.SMTP_PORT);
console.log('SMTP_SECURE  :', process.env.SMTP_SECURE);
console.log('SMTP_USER    :', process.env.SMTP_USER);
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***SET***' : '<missing>');
console.log('EMAIL_FROM   :', process.env.EMAIL_FROM);
console.log('To           :', to);
console.log('');

(async () => {
  try {
    const result = await sendWelcomeOrganizationEmail({
      to,
      organizationName: 'SMTP Smoke Test Org',
      organizationSlug: 'smtp-smoke-test',
      adminEmail: to,
      adminPassword: 'TempPassword123!',
      loginUrl: 'http://localhost:3000',
    });
    console.log('SEND RESULT:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('✅ Email accepted by SMTP server. Check inbox (and spam).');
    process.exit(0);
  } catch (e) {
    console.error('❌ SEND FAILED:');
    console.error('  message:', e.message);
    if (e.code) console.error('  code   :', e.code);
    if (e.response) console.error('  smtp   :', e.response);
    if (e.responseCode) console.error('  rcode  :', e.responseCode);
    if (e.command) console.error('  cmd    :', e.command);
    process.exit(2);
  }
})();
