/**
 * DESTRUCTIVE — wipes all tenant data and re-seeds the default org + admin.
 *
 * Run with confirmation flag:
 *   node scripts/truncate-and-reseed.js --yes
 *
 * What it does:
 *   1. Drops FK checks
 *   2. TRUNCATEs every tenant-owned table (orgs, users, messages, contacts, ...)
 *   3. Restores FK checks
 *   4. Re-seeds:
 *        - default-org organization
 *        - admin@example.com / Admin123!@# admin user with all permissions
 *        - organization_settings row for the default org with a fresh SSO secret
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Organization, OrganizationSettings, User } = require('../src/models');
const authService = require('../src/services/authService');
const { encrypt } = require('../src/utils/encryption');

if (!process.argv.includes('--yes')) {
  console.error('Refusing to run without --yes flag. This wipes ALL tenant data.');
  console.error('Re-run with: node scripts/truncate-and-reseed.js --yes');
  process.exit(1);
}

// Order doesn't matter while FK checks are off; listed alphabetically for clarity.
const TABLES = [
  'api_key_usage_logs',
  'api_keys',
  'bulk_message_batches',
  'contact_group_memberships',
  'contact_groups',
  'contact_imports',
  'contacts',
  'email_configurations',
  'media',
  'message_events',
  'messages',
  'organization_settings',
  'sms_configurations',
  'sessions',
  'template_imports',
  'template_versions',
  'templates',
  'user_preferences',
  'users',
  'organizations',
];

(async () => {
  await sequelize.authenticate();
  console.log('Connected to', process.env.DB_HOST, '/', process.env.DB_NAME);
  console.log('');

  console.log('-- TRUNCATE phase --');
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TABLES) {
    try {
      await sequelize.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`  ✓ ${t}`);
    } catch (e) {
      // Table may not exist on this DB — log and continue.
      console.log(`  ⏭️  ${t} (${e.original?.code || e.message})`);
    }
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('');

  console.log('-- RESEED phase --');

  const org = await Organization.create({
    name: 'Default Organization',
    slug: 'default-org',
    industry: 'Technology',
    plan: 'enterprise',
    status: 'active',
    maxUsers: 100,
    maxMessagesPerMonth: 100000,
    email: 'admin@example.com',
  });
  console.log(`  ✓ org: ${org.slug} (${org.id})`);

  const ssoSecret = crypto.randomBytes(32).toString('hex');
  await OrganizationSettings.create({
    organizationId: org.id,
    ssoEnabled: false,
    ssoSecretEncrypted: encrypt(ssoSecret),
    ssoDefaultRole: 'operator',
  });
  console.log(`  ✓ organization_settings (sso_secret generated)`);

  const adminEmail = 'admin@example.com';
  const adminPassword = 'Admin123!@#';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  // super_admin so the seeded user can manage other tenants from the portal.
  // Single-tenant setups can downgrade this to 'admin' afterwards.
  const adminPermissions = authService.getDefaultPermissions('super_admin');

  const admin = await User.create({
    organizationId: org.id,
    email: adminEmail,
    passwordHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'super_admin',
    status: 'active',
    emailVerified: true,
    permissions: adminPermissions,
    authProvider: 'local',
  });
  console.log(`  ✓ admin user: ${admin.email} (super_admin)`);

  console.log('');
  console.log('================================================');
  console.log('  Login Credentials');
  console.log('================================================');
  console.log('  Org slug:  default-org');
  console.log('  Email:     admin@example.com');
  console.log('  Password:  Admin123!@#');
  console.log('================================================');
  console.log('');
  console.log('  SSO secret (default-org, for sample integrations):');
  console.log(`    ${ssoSecret}`);
  console.log('================================================');
  console.log('');
  console.log('Done.');
  process.exit(0);
})().catch((e) => {
  console.error('FAIL:', e.message);
  if (e.original) console.error('  SQL:', e.original.sqlMessage);
  process.exit(1);
});
